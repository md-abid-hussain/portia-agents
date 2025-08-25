import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/markdown.css';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  // Ensure content is always a string
  const safeContent = typeof content === 'string' ? content : String(content || '');

  return (
    <div className={`prose prose-sm max-w-none markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for markdown elements
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0 ghibli-heading" style={{ color: 'var(--ghibli-forest)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium mb-2 mt-2 first:mt-0 ghibli-heading" style={{ color: 'var(--ghibli-deep-green)' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--ghibli-forest)' }}>
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline transition-all"
              style={{ color: 'var(--ghibli-sage)' }}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: 'var(--ghibli-deep-green)' }}>
              {children}
            </strong>
          ),
          code: ({ children, className }) => {
            const isInlineCode = !className;
            if (isInlineCode) {
              return (
                <code 
                  className="px-2 py-1 rounded text-xs font-mono"
                  style={{ 
                    backgroundColor: 'var(--ghibli-soft-gray)',
                    color: 'var(--ghibli-forest)'
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="text-xs font-mono" style={{ color: 'var(--ghibli-forest)' }}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre 
              className="p-4 rounded-2xl text-sm font-mono overflow-x-auto mb-3 ghibli-card"
              style={{ 
                backgroundColor: 'var(--ghibli-soft-gray)',
                color: 'var(--ghibli-forest)',
                border: '1px solid var(--ghibli-sage)'
              }}
            >
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm" style={{ color: 'var(--ghibli-forest)' }}>
              {children}
            </li>
          ),
          hr: () => (
            <hr className="my-4" style={{ borderColor: 'var(--ghibli-sage)' }} />
          ),
          blockquote: ({ children }) => (
            <blockquote 
              className="pl-4 italic mb-3 rounded-r-lg"
              style={{ 
                borderLeft: '4px solid var(--ghibli-sage)',
                backgroundColor: 'var(--ghibli-soft-gray)',
                color: 'var(--ghibli-warm-brown)'
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;