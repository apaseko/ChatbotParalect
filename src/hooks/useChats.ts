'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authHeaders } from './useAuth';
import type { Chat, CreateChatPayload } from '@/types';

export function useChats() {
  return useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const res = await fetch('/api/chats', { headers: authHeaders() });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error('Failed to fetch chats');
      }
      const data = await res.json();
      return data.chats;
    },
    staleTime: 30 * 1000,
  });
}

export function useChat(chatId: string | null) {
  return useQuery<Chat | null>({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const res = await fetch(`/api/chats/${chatId}`, { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.chat;
    },
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: CreateChatPayload) => {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload || {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create chat');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, ...payload }: { chatId: string; title?: string; model?: string }) => {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update chat');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete chat');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}
