import React from 'react';
import { Bot, User } from 'lucide-react';
import type { Message } from '../types/chat';
import MarkdownMessage from './MarkdownMessage';
import InlineSteps from './InlineSteps';

interface MessageBubbleProps {
    message: Message;
}

/**
 * Individual message bubble component
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    /**
     * Returns the appropriate styling for different message types
     */
    const getMessageStyle = (type: Message['type']) => {
        switch (type) {
            case 'user': 
                return {
                    backgroundColor: 'var(--ghibli-sage)',
                    color: 'white',
                    borderRadius: '20px 20px 5px 20px'
                };
            case 'assistant': 
                return {
                    backgroundColor: 'var(--ghibli-warm-white)',
                    color: 'var(--ghibli-forest)',
                    border: '1px solid var(--ghibli-sage)',
                    borderRadius: '20px 20px 20px 5px'
                };
            case 'system': 
                return {
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fbbf24',
                    borderRadius: '15px'
                };
            case 'error': 
                return {
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '15px'
                };
            default: 
                return {
                    backgroundColor: 'var(--ghibli-warm-white)',
                    color: 'var(--ghibli-forest)',
                    borderRadius: '15px'
                };
        }
    };

    const messageStyle = getMessageStyle(message.type);

    return (
        <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} ghibli-theme`}>
            <div 
                className="max-w-[90%] px-5 py-4 ghibli-card-hover"
                style={messageStyle}
            >
                {/* Message Header - Show label for assistant and other non-user messages */}
                {message.type === 'assistant' && (
                    <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--ghibli-sage)' }}>
                        <Bot className="w-4 h-4" />
                        <span className="font-medium ghibli-heading">Assistant</span>
                    </div>
                )}
                {message.type !== 'user' && message.type !== 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 text-xs opacity-75">
                        <User className="w-4 h-4" />
                        <span className="font-medium capitalize ghibli-heading">{message.type}</span>
                    </div>
                )}

                {/* Message Content */}
                <div className="text-sm break-words leading-relaxed">
                    {message.isMarkdown ? (
                        <MarkdownMessage content={message.content} />
                    ) : (
                        <div className="whitespace-pre-wrap font-medium">{message.content}</div>
                    )}
                </div>

                {/* Execution Steps - Only shown for assistant messages with steps */}
                {message.type === 'assistant' && message.relatedSteps && message.relatedSteps.length > 0 && (
                    <InlineSteps steps={message.relatedSteps} />
                )}
            </div>
        </div>
    );
};

export default MessageBubble;