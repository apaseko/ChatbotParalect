'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ChatArea from '@/components/chat/ChatArea';
import AuthModal from '@/components/auth/AuthModal';
import { useUser } from '@/hooks/useAuth';
import { useCreateChat } from '@/hooks/useChats';

export default function ChatApp() {
  const { data: user, isLoading: userLoading } = useUser();
  const createChat = useCreateChat();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show auth modal if no user
  useEffect(() => {
    if (!userLoading && !user) {
      setAuthOpen(true);
    }
  }, [userLoading, user]);

  const handleNewChat = useCallback(async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const result = await createChat.mutateAsync({});
      setActiveChatId(result.chat.id);
    } catch {}
  }, [user, createChat]);

  const handleGuestAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          localStorage.setItem('sb-session', JSON.stringify(data.session));
          window.location.reload();
        }
      }
    } catch {}
  }, []);

  // Check if anonymous user has used up questions
  const isAnonymousLimitReached =
    user?.is_anonymous && (user?.anonymous_questions_used || 0) >= 3;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={() => setActiveChatId(null)}
        onOpenAuth={() => setAuthOpen(true)}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <ChatArea
        chatId={activeChatId}
        onToggleSidebar={() => setMobileMenuOpen(true)}
        disabled={isAnonymousLimitReached || false}
        disabledMessage={
          isAnonymousLimitReached
            ? 'You\'ve used all 3 free questions. Sign up to continue chatting!'
            : undefined
        }
      />

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onGuestAccess={handleGuestAccess}
      />
    </div>
  );
}
