'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin, useSignup } from '@/hooks/useAuth';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestAccess: () => void;
}

export default function AuthModal({ open, onOpenChange, onGuestAccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const login = useLogin();
  const signup = useSignup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (tab === 'login') {
        await login.mutateAsync({ email, password });
      } else {
        await signup.mutateAsync({ email, password });
      }
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const isLoading = login.isPending || signup.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Welcome to ChatBot
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Sign in to save your chats and unlock unlimited access
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'register'); setError(''); }}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="login" className="data-[state=active]:bg-background">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-background">
              <UserPlus className="w-4 h-4 mr-2" />
              Register
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <TabsContent value="login" className="space-y-4 mt-0">
              <Input
                id="login-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-border/50"
              />
              <Input
                id="login-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background/50 border-border/50"
              />
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-0">
              <Input
                id="register-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-border/50"
              />
              <Input
                id="register-password"
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background/50 border-border/50"
              />
            </TabsContent>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg animate-in fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                tab === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
        </Tabs>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-border/50 hover:bg-muted/50 transition-all duration-300"
          onClick={() => {
            onGuestAccess();
            onOpenChange(false);
          }}
        >
          Continue as Guest
          <span className="ml-2 text-xs text-muted-foreground">(3 free questions)</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
