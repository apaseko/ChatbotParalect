'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { authHeaders } from '@/hooks/useAuth';
import type { Message, LLMModel } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ChatAreaProps {
  chatId: string | null;
  onToggleSidebar: () => void;
  onCreateChat: () => Promise<string | null>;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function ChatArea({
  chatId,
  onToggleSidebar,
  onCreateChat,
  disabled,
  disabledMessage,
}: ChatAreaProps) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [streamContent, setStreamContent] = useState('');
  const [selectedModel, setSelectedModel] = useState<LLMModel>('gpt-4o');

  const handleSend = useCallback(
    async (content: string, imageUrls: string[], model: LLMModel) => {
      let currentChatId = chatId;

      // Auto-create a chat if none exists
      if (!currentChatId) {
        currentChatId = await onCreateChat();
        if (!currentChatId) return;
      }

      // Optimistically add user message to the list
      const userMessage: Message = {
        id: uuidv4(),
        chat_id: currentChatId,
        role: 'user',
        content,
        image_urls: imageUrls,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(['messages', currentChatId], (old) => [
        ...(old || []),
        userMessage,
      ]);

      // Set up streaming state
      const assistantMessage: Message = {
        id: uuidv4(),
        chat_id: currentChatId,
        role: 'assistant',
        content: '',
        image_urls: [],
        created_at: new Date().toISOString(),
      };

      setStreamingMessage(assistantMessage);
      setStreamContent('');
      setIsStreaming(true);

      try {
        const response = await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({ content, image_urls: imageUrls, model }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to send message');
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamContent(fullContent);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Send message error:', error);
        toast.error(error.message || 'Failed to send message');
      } finally {
        setIsStreaming(false);
        setStreamingMessage(null);
        setStreamContent('');
        // Refresh messages from server
        queryClient.invalidateQueries({ queryKey: ['messages', currentChatId] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
    },
    [chatId, queryClient, onCreateChat]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-2 hover:bg-muted/50"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">
            {selectedModel === 'gpt-4o' ? (process.env.NEXT_PUBLIC_OPENAI_MODEL || 'GPT-4o') : 'Gemini 2.0 Flash'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        chatId={chatId}
        streamingMessage={streamingMessage}
        streamContent={streamContent}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isStreaming={isStreaming}
        disabled={disabled}
        disabledMessage={disabledMessage}
        chatId={chatId}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
