import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, Send } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import { useSession } from '@/hooks/useSession';
import { sessionApiService } from '../services/sessionApi';
import { parseResponseContent } from '../utils/responseParser';
import type { Message, StepData } from '../types/chat';
import { saveSession } from '@/utils/sessionStorage';

const Chat: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  // const [availableTools, setAvailableTools] = useState<string[]>([]);
  // const [selectedTools, setSelectedTools] = useState<string[]>([]);
  // const [toolsLoading, setToolsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

  const { session, events, createSession } = useSession(sessionId);
  const isProcessing = session?.status === 'running';

  // SIMPLIFIED MESSAGE DERIVATION LOGIC
  const derivedMessages: Message[] = React.useMemo(() => {
    const messages: Message[] = [];

    // Get all user messages chronologically
    const userMessageEvents = events.filter(e => e.event_type === 'user_message');

    // For each user message, create a conversation pair
    userMessageEvents.forEach((userEvent, index) => {
      const userTimestamp = new Date(userEvent.timestamp).getTime();

      // Add user message
      messages.push({
        id: `user-${userEvent.session_id}-${index}`,
        type: "user" as const,
        content: userEvent.output || '',
        timestamp: new Date(userEvent.timestamp),
      });

      // Find the next user message to determine the boundary
      const nextUserEvent = userMessageEvents[index + 1];
      const nextUserTimestamp = nextUserEvent ? new Date(nextUserEvent.timestamp).getTime() : Date.now();

      // Find completion event for this conversation
      const completionEvent = events.find(e =>
        e.event_type === 'session_completed' &&
        new Date(e.timestamp).getTime() > userTimestamp &&
        new Date(e.timestamp).getTime() < nextUserTimestamp
      );

      // Find all steps between this user message and next user message (or now)
      const conversationSteps = events
        .filter(e => e.event_type === 'step_update')
        .filter(e => {
          const stepTime = new Date(e.timestamp).getTime();
          return stepTime > userTimestamp && stepTime < nextUserTimestamp;
        })
        .map((e, stepIndex) => ({
          id: `step-${e.session_id}-${e.timestamp}`,
          step: e.step_name || `Step ${stepIndex + 1}`,
        }));

      // Add assistant message if we have a completion
      if (completionEvent) {
        messages.push({
          id: `assistant-${completionEvent.session_id}-${index}`,
          type: "assistant" as const,
          content: parseResponseContent(completionEvent.output),
          timestamp: new Date(completionEvent.timestamp),
          executionTime: session?.execution_time,
          relatedSteps: conversationSteps as StepData[],
          isMarkdown: true,
        });
      }
    });

    // Handle initial session query if no user_message events
    if (userMessageEvents.length === 0 && session?.query) {
      messages.push({
        id: `session-input-${session.session_id}`,
        type: "user" as const,
        content: session.query,
        timestamp: new Date(session.created_at),
      });

      if (session?.status === "completed" && session.result) {
        const allSteps = events
          .filter(e => e.event_type === 'step_update')
          .map((e, i) => ({
            id: `step-${e.session_id}-${e.timestamp}`,
            step: e.step_name || `Step ${i + 1}`,
          }));

        messages.push({
          id: `session-result-${session.session_id}`,
          type: "assistant" as const,
          content: parseResponseContent(session.result),
          timestamp: new Date(session.completed_at || session.created_at),
          executionTime: session.execution_time,
          relatedSteps: allSteps as StepData[],
          isMarkdown: true,
        });
      }
    }

    // Add optimistic messages
    messages.push(...conversationMessages);

    // Sort by timestamp
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [session, events, conversationMessages]);

  // Get ONLY current processing steps (for the active conversation)
  const currentProcessingSteps = React.useMemo(() => {
    if (!isProcessing) return [];

    // Get the last user message timestamp
    const userMessages = events.filter(e => e.event_type === 'user_message');
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (!lastUserMessage) return [];

    const lastUserTime = new Date(lastUserMessage.timestamp).getTime();

    // Get steps that came after the last user message
    return events
      .filter(e => e.event_type === 'step_update')
      .filter(e => new Date(e.timestamp).getTime() > lastUserTime)
      .map((e, i) => ({
        id: `current-step-${e.timestamp}`,
        step: e.step_name || `Step ${i + 1}`,
      }));
  }, [events, isProcessing]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Fetch available tools on component mount
  // useEffect(() => {
  //   const fetchTools = async () => {
  //     try {
  //       setToolsLoading(true);
  //       const tools = await sessionApiService.getTools();
  //       setAvailableTools(tools);
  //       setSelectedTools(tools);
  //     } catch (error) {
  //       console.error('Failed to fetch tools:', error);
  //       const fallbackTools = ['llm_tool', 'search_tool', 'map_tool', 'extract_tool'];
  //       setAvailableTools(fallbackTools);
  //       setSelectedTools(fallbackTools);
  //     } finally {
  //       setToolsLoading(false);
  //     }
  //   };

  //   fetchTools();
  // }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query.trim();
    setQuery('');

    try {
      if (!sessionId) {
        const newSession = await createSession(currentQuery, "chat");
        saveSession(newSession.session_id, query, "chat");
        navigate(`/chat/${newSession.session_id}`, { replace: true });
      } else {

        // Add optimistic user message
        const optimisticMessage: Message = {
          id: `user-optimistic-${Date.now()}`,
          type: "user" as const,
          content: currentQuery,
          timestamp: new Date(),
        };
        setConversationMessages(prev => [...prev, optimisticMessage]);

        // Call the API to add message to session
        const response = await sessionApiService.addMessageToSession(sessionId, currentQuery, "chat");
        console.log('Add message response:', response);

        // Remove optimistic message as real events will come through SSE
        setTimeout(() => {
          setConversationMessages(prev =>
            prev.filter(msg => msg.id !== optimisticMessage.id)
          );
        }, 1000); // Give SSE events time to come through
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
      setQuery(currentQuery);
      setConversationMessages([]);
    }
  }, [query, createSession, sessionId, navigate]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (!isAtBottom) {
      setUserScrolled(true);
    } else {
      setUserScrolled(false);
    }
  }, []);

  useEffect(() => {
    if (!userScrolled && (isProcessing || derivedMessages.length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [derivedMessages.length, isProcessing, userScrolled]);

  useEffect(() => {
    if (isProcessing) {
      setUserScrolled(false);
    }
  }, [isProcessing]);


  return (
    <div className="flex h-full ghibli-theme" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 ghibli-scrollbar"
        >
          {derivedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="ghibli-pulse mb-6">
                <Bot className="w-16 h-16" style={{ color: 'var(--ghibli-muted-green)' }} />
              </div>
              <h2 className="text-2xl font-medium ghibli-heading mb-3" style={{ color: 'var(--ghibli-forest)' }}>
                Start a conversation
              </h2>
              <p className="text-base mb-6" style={{ color: 'var(--ghibli-warm-brown)' }}>
                Choose your tools and ask me anything
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Render completed messages */}
              {derivedMessages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Show processing indicator with CURRENT steps only */}
              {isProcessing && (
                <div className="flex items-start gap-4 p-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ghibli-pulse"
                    style={{ backgroundColor: 'var(--ghibli-sage)' }}
                  >
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-2 h-2 rounded-full ghibli-spin"
                        style={{ backgroundColor: 'var(--ghibli-sage)' }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full ghibli-spin"
                        style={{
                          backgroundColor: 'var(--ghibli-muted-green)',
                          animationDelay: '0.2s'
                        }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full ghibli-spin"
                        style={{
                          backgroundColor: 'var(--ghibli-forest)',
                          animationDelay: '0.4s'
                        }}
                      ></div>
                      <span className="text-sm font-medium ml-2" style={{ color: 'var(--ghibli-forest)' }}>
                        Processing...
                      </span>
                    </div>

                    {/* Show ONLY current processing steps */}
                    {currentProcessingSteps.length > 0 && (
                      <div className="space-y-2">
                        {currentProcessingSteps.map((step, index) => (
                          <div
                            key={step.id}
                            className="p-3 rounded-xl text-sm"
                            style={{
                              backgroundColor: 'var(--ghibli-warm-white)',
                              border: '1px solid var(--ghibli-sage)',
                              color: 'var(--ghibli-forest)'
                            }}
                          >
                            <span className="font-medium">✓ Step {index + 1}:</span> {step.step}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className="p-6 ghibli-card"
          style={{
            backgroundColor: 'var(--ghibli-warm-white)',
            borderTop: '1px solid var(--ghibli-sage)'
          }}
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={sessionId ? "Continue the conversation..." : "Ask me anything..."}
                className="flex-1 ghibli-input"
                disabled={isProcessing}
                style={{ color: 'var(--ghibli-forest)' }}
              />
              <button
                type="submit"
                disabled={!query.trim() || isProcessing}
                className="px-8 py-3 ghibli-button font-medium"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {/* {selectedTools.length === 0 && !toolsLoading && (
              <p className="text-sm mt-3 text-center" style={{ color: '#dc2626' }}>
                Please select at least one tool
              </p>
            )} */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;