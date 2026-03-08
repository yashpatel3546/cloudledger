import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Lock, Unlock, Mail, Key } from 'lucide-react';
import { motion } from 'framer-motion';

export function Auth({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, login, fetchFromServer } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchFromServer();
    }
  }, [token, isAuthenticated, fetchFromServer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Fetch initial data after successful auth
      const syncRes = await fetch('/api/sync', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      const syncData = await syncRes.json();
      login(data.token, syncData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-zinc-200/80 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-8 pt-10">
            <div className="mx-auto bg-zinc-900 w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-900/5">
              {isLogin ? <Lock className="w-7 h-7" /> : <Unlock className="w-7 h-7" />}
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-3xl font-bold font-display tracking-tight text-zinc-900">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <p className="text-sm text-zinc-500 font-medium px-6">
                {isLogin 
                  ? 'Sign in to access your secure accounting data.' 
                  : 'Register to start managing your accounts securely.'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className="pl-10 h-12 bg-zinc-50/50 border-zinc-200 focus:bg-white transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="pl-10 h-12 bg-zinc-50/50 border-zinc-200 focus:bg-white transition-colors"
                    required
                  />
                </div>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-sm text-red-500 text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
              <div className="space-y-4">
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md" disabled={loading}>
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
