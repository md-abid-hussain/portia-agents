import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, BookOpen, ChevronDown } from "lucide-react";
import MessageBubble from '../components/MessageBubble';
import { useSession } from '@/hooks/useSession';
import { sessionApiService } from '../services/sessionApi';
import { parseResponseContent } from '../utils/responseParser';
import type { Message, StepData } from '../types/chat';

// Available documentation repositories
const DOC_REPOSITORIES = [
    {
        id: "daytonaio",
        name: "Daytonaio",
        fullName: "daytonaio/docs",
    },
    {
        id: "kestra",
        name: "Kestra",
        fullName: "kestra-io/docs",
    },
    {
        id: "portiaai",
        name: "PortiaAI",
        fullName: "portiaAI/docs",
    },
    {
        id: "portiaai-python",
        name: "PortiaAI-SDK(Code)",
        fullName: "portiaAI/docs",
    },
    {
        id: "quirash",
        name: "Quira-sh",
        fullName: "quira-org/quests",
    }
];

const DocsAgent: React.FC = () => {
    const [query, setQuery] = useState('');
    const [selectedRepo, setSelectedRepo] = useState(DOC_REPOSITORIES[0]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const { session, events, createSession } = useSession(currentSessionId);
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [userScrolled, setUserScrolled] = useState(false);

    const handleSubmit = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const currentQuery = query.trim();
        setQuery('');

        try {
            if (!currentSessionId) {
                const newSession = await createSession(currentQuery, "docs", selectedRepo.fullName);
                setCurrentSessionId(newSession.session_id);
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
                const response = await sessionApiService.addMessageToSession(currentSessionId, currentQuery, "docs", selectedRepo.fullName);
                console.log('Add message response:', response);

                // Remove optimistic message as real events will come through SSE
                setTimeout(() => {
                    setConversationMessages(prev =>
                        prev.filter(msg => msg.id !== optimisticMessage.id)
                    );
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to handle message:', error);
            setQuery(currentQuery);
            setConversationMessages([]);
        }
    }, [query, selectedRepo, createSession, currentSessionId]);

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

    const startNewSession = () => {
        setCurrentSessionId(null);
        setConversationMessages([]);
        setUserScrolled(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <div className="flex flex-col h-full ghibli-theme" style={{ backgroundColor: 'var(--ghibli-cream)' }}>
            {/* Header */}
            <div className="px-4 py-2 ghibli-card" style={{ backgroundColor: 'var(--ghibli-warm-white)', borderBottom: '1px solid var(--ghibli-sage)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="ghibli-float">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--ghibli-sage)' }} />
                        </div>
                        <h1 className="text-xl font-semibold ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
                            Documentation Chat
                        </h1>
                    </div>
                    {currentSessionId && (
                        <button onClick={startNewSession} className="px-4 py-2 rounded-xl ghibli-button text-sm font-medium">
                            New Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Repository Selection */}
            <div className="px-4 py-2 ghibli-card" style={{ backgroundColor: 'var(--ghibli-warm-white)', borderBottom: '1px solid var(--ghibli-sage)' }}>
                <div className="max-w-4xl mx-auto">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center justify-between w-full px-4 py-2 rounded-xl border text-left ghibli-input"
                            style={{ borderColor: 'var(--ghibli-sage)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="font-medium" style={{ color: 'var(--ghibli-forest)' }}>
                                        {selectedRepo.name}
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--ghibli-warm-brown)' }}>
                                        {selectedRepo.fullName}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown
                                className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--ghibli-sage)' }}
                            />
                        </button>

                        {showDropdown && (
                            <div
                                className="absolute top-full left-0 right-0  mt-1 rounded-xl shadow-lg z-10 ghibli-card"
                                style={{ backgroundColor: 'var(--ghibli-warm-white)', border: '1px solid var(--ghibli-sage)' }}
                            >
                                {DOC_REPOSITORIES.map((repo) => (
                                    <button
                                        key={repo.id}
                                        onClick={() => {
                                            setSelectedRepo(repo);
                                            setShowDropdown(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${selectedRepo.id === repo.id ? 'ghibli-button-hover' : ''
                                            }`}
                                        style={{
                                            backgroundColor: selectedRepo.id === repo.id ? 'var(--ghibli-sage-light)' : 'transparent'
                                        }}
                                    >
                                        <div>
                                            <div className="font-medium" style={{ color: 'var(--ghibli-forest)' }}>
                                                {repo.name}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--ghibli-warm-brown)' }}>
                                                {repo.fullName}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                {derivedMessages.length === 0 ? (
                    <div className="h-full overflow-y-auto px-4 py-4 ghibli-scrollbar">
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <h2 className="text-2xl font-medium ghibli-heading mb-3" style={{ color: 'var(--ghibli-forest)' }}>
                                Ask about {selectedRepo.name}
                            </h2>
                            <p className="text-base mb-6" style={{ color: 'var(--ghibli-warm-brown)' }}>
                                Get instant answers from the {selectedRepo.fullName} documentation
                            </p>
                            <div className="space-y-4 mb-8 max-w-2xl">
                            </div>
                        </div>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 py-6 ghibli-scrollbar">
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {derivedMessages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}

                            {/* Processing state */}
                            {isProcessing && (
                                <div className="flex items-start gap-4 p-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-2 h-2 rounded-full ghibli-spin" style={{ backgroundColor: 'var(--ghibli-muted-green)', animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 rounded-full ghibli-spin" style={{ backgroundColor: 'var(--ghibli-forest)', animationDelay: '0.4s' }}></div>
                                            <span className="text-sm font-medium ml-2" style={{ color: 'var(--ghibli-forest)' }}>
                                                Searching {selectedRepo.name} docs...
                                            </span>
                                        </div>

                                        {currentProcessingSteps.length > 0 && (
                                            <div className="space-y-2">
                                                {currentProcessingSteps.map((step, index) => (
                                                    <div
                                                        key={step.id}
                                                        className="p-3 rounded-xl text-sm"
                                                        style={{
                                                            backgroundColor: 'var(--ghibli-warm-white)',
                                                            color: 'var(--ghibli-forest)'
                                                        }}
                                                    >
                                                        <span className="font-medium">Step {index + 1}:</span> {step.step}
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
            <div className="px-4 py-4 ghibli-card" style={{ backgroundColor: 'var(--ghibli-warm-white)', borderTop: '1px solid var(--ghibli-sage)' }}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-4">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Ask about ${selectedRepo.name} documentation...`}
                            className="flex-1 ghibli-input"
                            disabled={isProcessing}
                            style={{ color: 'var(--ghibli-forest)' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!query.trim() || isProcessing}
                            className="px-4 py-3 ghibli-button font-medium"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocsAgent;