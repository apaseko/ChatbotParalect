'use client';

import { useState } from 'react';
import { useChats, useCreateChat, useDeleteChat, useUpdateChat } from '@/hooks/useChats';
import { useUser, useLogout } from '@/hooks/useAuth';
import { useRealtimeChats, useRealtimeProfile } from '@/hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  LogOut,
  Menu,
  X,
  Bot,
  Check,
  X as XIcon,
  User,
  Crown,
} from 'lucide-react';
import type { Chat } from '@/types';

interface SidebarProps {
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onOpenAuth: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  activeChatId,
  onSelectChat,
  onNewChat,
  onOpenAuth,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { data: user } = useUser();
  const { data: chats, isLoading } = useChats();
  const createChat = useCreateChat();
  const deleteChat = useDeleteChat();
  const updateChat = useUpdateChat();
  const logout = useLogout();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');


  // Subscribe to realtime chat and profile changes
  useRealtimeChats(user?.id);
  useRealtimeProfile(user?.id);

  const handleNewChat = async () => {
    try {
      const result = await createChat.mutateAsync({});
      onSelectChat(result.chat.id);
      onMobileClose();
    } catch {}
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChat.mutateAsync(chatId);
      if (activeChatId === chatId) {
        onNewChat();
      }
    } catch {}
  };

  const handleStartEdit = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = async (chatId: string) => {
    if (editTitle.trim()) {
      await updateChat.mutateAsync({ chatId, title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    onNewChat();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-72 flex flex-col
          bg-card/80 backdrop-blur-xl border-r border-border/50
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ChatBot
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-muted/50"
              onClick={onMobileClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-foreground transition-all duration-300"
            variant="outline"
            disabled={createChat.isPending}
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 px-2 py-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onMobileClose();
                  }}
                  className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
                    transition-all duration-200 text-sm
                    ${activeChatId === chat.id
                      ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/20 text-foreground'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {editingId === chat.id ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 text-sm bg-background/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(chat.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleSaveEdit(chat.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingId(null)}
                      >
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{chat.title}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 shrink-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/50">
                          <DropdownMenuItem onClick={(e) => handleStartEdit(chat, e)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={(e) => handleDelete(chat.id, e)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <Bot className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          )}
        </ScrollArea>

        {/* User section */}
        <div className="p-3 border-t border-border/50">
          {user ? (
            <div className="flex items-center gap-3">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center shrink-0
                ${user.is_anonymous
                  ? 'bg-muted/50 border border-border/50'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }
              `}>
                {user.is_anonymous ? (
                  <User className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <span className="text-sm font-medium text-white">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {user.is_anonymous ? (
                  <div>
                    <p className="text-sm text-muted-foreground truncate">Guest</p>
                    <p className="text-xs text-muted-foreground/70">
                      {3 - (user.anonymous_questions_used || 0)} questions left
                    </p>
                  </div>
                ) : (
                  <p className="text-sm truncate">{user.email}</p>
                )}
              </div>
              {user.is_anonymous ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={onOpenAuth}
                >
                  <Crown className="w-3 h-3 mr-1" />
                  Sign Up
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 hover:bg-muted/50"
                  onClick={handleLogout}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              onClick={onOpenAuth}
            >
              Sign In
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
