import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInWithGoogle } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface BetaGateProps {
  notOnList?: boolean;
}

export default function BetaGate({ notOnList = false }: BetaGateProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'beta_gate' }),
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // App.tsx beta wrapper will re-evaluate auth state automatically
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('Sign-in failed — please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-10">
          <Logo size="md" />
          <span className="font-bold text-2xl text-blue-700">ListsSync.ai</span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Private Beta
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              ListsSync is in private beta
            </h1>
            {notOnList ? (
              <p className="text-gray-500 text-sm">
                This account isn't on the beta list yet. Join the waitlist below and we'll be in touch.
              </p>
            ) : (
              <p className="text-gray-500 text-sm">
                We're polishing things up. Join the waitlist and we'll let you know the moment we open up.
              </p>
            )}
          </div>

          {submitted ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-semibold text-gray-900">You're on the list. Thanks!</p>
              <p className="text-sm text-gray-500 mt-1">We'll email you when we're ready.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Join the Waitlist
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {signingIn && <Loader2 className="w-3 h-3 animate-spin" />}
              Beta tester? Sign in →
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions?{' '}
          <a href="mailto:support@listssync.ai" className="hover:text-gray-600 underline">
            support@listssync.ai
          </a>
        </p>
      </div>
    </div>
  );
}
