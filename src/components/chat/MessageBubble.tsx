'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
}

export default function MessageBubble({ message, isStreaming, streamContent }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const content = isStreaming ? (streamContent || '') : message.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group flex gap-3 px-4 py-5 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-muted/30'
      }`}
    >
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5
          ${isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Images */}
        {message.image_urls && message.image_urls.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {message.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Image ${i + 1}`}
                className="max-w-[300px] max-h-[300px] rounded-lg border border-border/50 object-contain"
              />
            ))}
          </div>
        )}

        {/* Text content */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
          {isUser ? (
            <p className="whitespace-pre-wrap m-0">{content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children }) => (
                  <pre className="bg-background/80 border border-border/50 rounded-lg p-4 overflow-x-auto my-3">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted/50 text-pink-400 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={`text-sm font-mono ${className}`} {...props}>
                      {children}
                    </code>
                  );
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="border-collapse border border-border/50 w-full">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border/50 px-3 py-2 text-sm">
                    {children}
                  </td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm ml-0.5" />
          )}
        </div>

        {/* Copy button for assistant messages */}
        {!isUser && !isStreaming && content && (
          <button
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
