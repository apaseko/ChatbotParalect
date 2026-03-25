'use client';

import { useQuery } from '@tanstack/react-query';
import { authHeaders } from './useAuth';
import type { Message } from '@/types';

export function useMessages(chatId: string | null) {
  return useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const res = await fetch(`/api/chats/${chatId}/messages`, { headers: authHeaders() });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error('Failed to fetch messages');
      }
      const data = await res.json();
      return data.messages;
    },
    enabled: !!chatId,
    staleTime: 10 * 1000,
  });
}
