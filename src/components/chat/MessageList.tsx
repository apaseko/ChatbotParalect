'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import MessageBubble from './MessageBubble';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, MessageSquare, Sparkles, Zap, Image as ImageIcon } from 'lucide-react';
import type { Message } from '@/types';

interface MessageListProps {
  chatId: string | null;
  streamingMessage: Message | null;
  streamContent: string;
}

export default function MessageList({ chatId, streamingMessage, streamContent }: MessageListProps) {
  const { data: messages, isLoading } = useMessages(chatId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamContent]);

  // No chat selected — show welcome screen
  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-8">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              How can I help you today?
            </h2>
            <p className="text-muted-foreground">
              Start a new conversation or select an existing chat from the sidebar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: MessageSquare, title: 'Ask anything', desc: 'Chat naturally with AI' },
              { icon: Zap, title: 'Lightning fast', desc: 'Powered by Groq LPU' },
              { icon: ImageIcon, title: 'Vision enabled', desc: 'Upload images for analysis' },
              { icon: Sparkles, title: 'Smart models', desc: 'Llama 3.2 & Llama 3.3' },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all duration-300 group"
              >
                <item.icon className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const allMessages = messages || [];
  const hasMessages = allMessages.length > 0 || streamingMessage;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      {!hasMessages ? (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-blue-400/50" />
            </div>
            <div>
              <p className="font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70">Send a message to start the conversation</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          {allMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {streamingMessage && (
            <MessageBubble
              message={streamingMessage}
              isStreaming
              streamContent={streamContent}
            />
          )}
        </div>
      )}
    </div>
  );
}
