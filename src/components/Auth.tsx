import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';

async function hashPasscode(passcode: string) {
  const msgBuffer = new TextEncoder().encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function Auth({ children }: { children: React.ReactNode }) {
  const { passcodeHash, isAuthenticated, setPasscode, login } = useStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const isSetup = !passcodeHash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    const hash = await hashPasscode(input);

    if (isSetup) {
      setPasscode(hash);
    } else {
      if (hash === passcodeHash) {
        login();
      } else {
        setError('Incorrect passcode. Please try again.');
        setInput('');
      }
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
              {isSetup ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-3xl font-bold font-display tracking-tight text-zinc-900">
                {isSetup ? 'Setup Security' : 'Enter Passcode'}
              </CardTitle>
              <p className="text-sm text-zinc-500 font-medium px-6">
                {isSetup 
                  ? 'Create a secure passcode to encrypt and protect your accounting data.' 
                  : 'Your accounting data is securely locked.'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter passcode"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError('');
                  }}
                  className="text-center text-xl tracking-[0.2em] h-14 font-mono font-bold shadow-sm bg-zinc-50/50 border-zinc-200 focus:bg-white transition-colors"
                  autoFocus
                />
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
              <Button type="submit" className="w-full h-14 text-lg font-semibold shadow-md">
                {isSetup ? 'Set Passcode & Enter' : 'Unlock'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
