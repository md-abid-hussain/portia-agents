import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Map, BookOpen, FileText } from "lucide-react";
import MessageBubble from '../components/MessageBubble';
import { useSession } from '@/hooks/useSession';
import { sessionApiService } from '../services/sessionApi';
import { parseResponseContent } from '../utils/responseParser';
import type { Message, StepData } from '../types/chat';
import { saveSession } from '@/utils/sessionStorage';

// Fixed tools for Research Agent
const RESEARCH_TOOLS = [
    {
        id: "llm_tool",
        name: "LLM Tool",
        icon: BookOpen,
    },
    {
        id: "search_tool",
        name: "Search Tool",
        icon: Search,
    },
    {
        id: "map_tool",
        name: "Map Tool",
        icon: Map,
    },
    {
        id: "extract_tool",
        name: "Extract Tool",
        icon: FileText,
    },
];

const ResearchAgent: React.FC = () => {
    const { sessionId } = useParams<{ sessionId?: string }>();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [conversationMessages, setConversationMessages] = useState<Message[]>([]);

    const { session, events, createSession } = useSession(sessionId);
    const isProcessing = session?.status === 'running';

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

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const currentQuery = query.trim();
        setQuery('');
        try {
            if (!sessionId) {
                const newSession = await createSession(currentQuery, "research");
                saveSession(newSession.session_id, query, "research");
                navigate(`/research/${newSession.session_id}`, { replace: true });
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
                const response = await sessionApiService.addMessageToSession(sessionId, currentQuery, "research");
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


    // Auto-scroll only when not manually scrolled and processing
    useEffect(() => {
        if (isProcessing) {
            setUserScrolled(false);
        }
    }, [isProcessing]);

    // Reset scroll state when starting new conversation
    useEffect(() => {
        if (isProcessing) {
            setUserScrolled(false);
        }
    }, [isProcessing]);

    return (
        <div className="flex flex-col h-full ghibli-theme" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
            {/* Header */}
            <div
                className="px-6 py-4 ghibli-card"
                style={{
                    backgroundColor: 'var(--ghibli-warm-white)',
                    borderBottom: '1px solid var(--ghibli-sage)'
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="ghibli-float">
                            <Search className="w-6 h-6" style={{ color: 'var(--ghibli-sage)' }} />
                        </div>
                        <h1 className="text-xl font-semibold ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                            Research Agent
                        </h1>
                    </div>
                    {sessionId && (
                        <button
                            onClick={() => navigate('/research')}
                            className="px-4 py-2 rounded-xl ghibli-button text-sm font-medium"
                        >
                            New Research
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                {derivedMessages.length === 0 ? (
                    <div className="h-full overflow-y-auto px-6 py-8 ghibli-scrollbar">
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="ghibli-pulse mb-6">
                                <Search className="w-16 h-16" style={{ color: 'var(--ghibli-muted-green)' }} />
                            </div>
                            <h2 className="text-2xl font-medium ghibli-heading mb-3" style={{ color: 'var(--ghibli-forest)' }}>
                                Ask me anything
                            </h2>
                            <p className="text-base mb-6" style={{ color: 'var(--ghibli-warm-brown)' }}>
                                I'll research and provide comprehensive answers using multiple tools
                            </p>

                            <div className="space-y-4 mb-8 max-w-2xl">
                                <div
                                    className="p-4 rounded-2xl ghibli-card"
                                    style={{ backgroundColor: 'var(--ghibli-warm-white)' }}
                                >
                                    <p className="text-sm font-medium mb-2 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                                        💡 Try asking:
                                    </p>
                                    <div className="space-y-2 text-sm" style={{ color: 'var(--ghibli-warm-brown)' }}>
                                        <p>"What are the latest developments in AI?"</p>
                                        <p>"Compare renewable energy sources"</p>
                                        <p>"Explain quantum computing in simple terms"</p>
                                        <p>"What's happening in the stock market today?"</p>
                                    </div>
                                </div>

                                <div
                                    className="p-4 rounded-2xl ghibli-card"
                                    style={{ backgroundColor: 'var(--ghibli-warm-white)' }}
                                >
                                    <p className="text-sm font-medium mb-3 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                                        🔧 Research Tools:
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {RESEARCH_TOOLS.map(({ id, name, icon: Icon }) => (
                                            <span
                                                key={id}
                                                className="flex items-center px-3 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: "var(--ghibli-sage)",
                                                    color: "white",
                                                }}
                                            >
                                                <Icon className="w-4 h-4 mr-1" />
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="h-full overflow-y-auto px-6 py-6 ghibli-scrollbar"
                    >
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {derivedMessages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}

                            {/* Show processing state with live steps */}
                            {isProcessing && (
                                <div className="flex items-start gap-4 p-4">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ghibli-pulse"
                                        style={{ backgroundColor: 'var(--ghibli-sage)' }}
                                    >
                                        <Search className="w-5 h-5 text-white" />
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
                                                Researching...
                                            </span>
                                        </div>

                                        {/* Live step updates */}
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
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div
                className="px-6 py-6 ghibli-card"
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
                            placeholder="Ask me anything... I'll research it for you"
                            className="flex-1 ghibli-input"
                            disabled={isProcessing}
                            style={{ color: 'var(--ghibli-forest)' }}
                        />
                        <button
                            type="submit"
                            disabled={!query.trim() || isProcessing}
                            className="px-8 py-3 ghibli-button font-medium"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResearchAgent;