'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile, AuthPayload } from '@/types';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('sb-session');
  if (session) {
    try {
      return JSON.parse(session).access_token;
    } catch {
      return null;
    }
  }
  return null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useUser() {
  return useQuery<Profile | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;
      const res = await fetch('/api/user', { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AuthPayload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.session) {
        localStorage.setItem('sb-session', JSON.stringify(data.session));
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AuthPayload) => {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Signup failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.session) {
        localStorage.setItem('sb-session', JSON.stringify(data.session));
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      localStorage.removeItem('sb-session');
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useAnonymousLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Anonymous login failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.session) {
        localStorage.setItem('sb-session', JSON.stringify(data.session));
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export { getToken, authHeaders };
