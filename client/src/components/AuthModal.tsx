import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { signInWithGoogle } from '@/lib/firebase';
import { identifyUser } from '@/lib/analytics';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USE_CASES = [
  'Airbnb / Vacation rental turnovers',
  'Property management',
  'Cleaning service / Janitorial',
  'Construction / Contracting',
  'Restaurant / Food service inspection',
  'Hotel / Hospitality',
  'Healthcare / Medical facility',
  'Retail / Store operations',
  'Warehouse / Logistics',
  'Home inspection',
  'Maintenance / Facilities management',
  'Education / School',
  'Government / Municipal',
  'Other',
];

const TEAM_SIZES = [
  'Just me',
  '2-5 people',
  '6-20 people',
  '21-50 people',
  '50+ people',
];

async function registerUser(uid: string, email: string, payload: Record<string, any>) {
  const auth = getAuth();
  const idToken = await auth.currentUser?.getIdToken();
  await fetch('/api/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ userId: uid, email, ...payload }),
  });
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Sign-up fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useCase, setUseCase] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [phone, setPhone] = useState('');

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErrors = () => { setError(null); setFieldErrors({}); };

  const handleEmailBlur = async () => {
    if (!email || !email.includes('@')) return;
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'landing_page', timestamp: new Date().toISOString() }),
    }).catch(() => {});
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      await registerUser(user.uid, user.email!, {
        displayName: user.displayName,
        profileImageUrl: user.photoURL,
        signupMethod: 'google',
        signupSource: 'google_oauth',
        trialStartedAt: new Date().toISOString(),
        marketingOptIn: false,
      });
      identifyUser(user.uid, { signup_method: 'google' });
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateSignUp = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    if (!email.trim() || !email.includes('@')) errors.email = 'Please enter a valid email address.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!useCase) errors.useCase = 'Please select a use case.';
    if (!teamSize) errors.teamSize = 'Please select a team size.';
    return errors;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const errors = validateSignUp();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setLoading(true);
    try {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      await registerUser(cred.user.uid, email, {
        displayName: fullName,
        useCase,
        teamSize,
        phone: phone || null,
        signupMethod: 'email',
        signupSource: 'landing_cta',
        trialStartedAt: new Date().toISOString(),
        marketingOptIn: true,
      });
      identifyUser(cred.user.uid, { signup_method: 'email', use_case: useCase, team_size: teamSize });
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      switch (err?.code) {
        case 'auth/email-already-in-use':
          setFieldErrors({ email: 'Account exists — sign in instead?' });
          break;
        case 'auth/weak-password':
          setFieldErrors({ password: 'Password must be at least 8 characters.' });
          break;
        case 'auth/invalid-email':
          setFieldErrors({ email: 'Please enter a valid email address.' });
          break;
        default:
          setError('Something went wrong — please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      switch (err?.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later or reset your password.');
          break;
        default:
          setError('Something went wrong — please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!signInEmail) { setError('Enter your email above first.'); return; }
    try {
      await sendPasswordResetEmail(getAuth(), signInEmail);
      setResetSent(true);
      setError(null);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    }
  };

  const switchMode = (next: 'signup' | 'signin') => {
    clearErrors();
    setResetSent(false);
    setMode(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signup' ? 'Start your free 14-day trial' : 'Sign in to ListsSync'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Google button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 uppercase">
              <span className="bg-white px-2">or continue with email</span>
            </div>
          </div>

          {mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-3">
              {/* Full name */}
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name" className="mt-1" />
                {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com" className="mt-1" />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.email}
                    {fieldErrors.email.includes('sign in') && (
                      <button type="button" onClick={() => switchMode('signin')}
                        className="ml-1 underline font-medium">Sign in →</button>
                    )}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input id="password" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Use case */}
              <div>
                <Label>What do you use checklists for?</Label>
                <Select value={useCase} onValueChange={setUseCase}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your industry / use case" />
                  </SelectTrigger>
                  <SelectContent>
                    {USE_CASES.map(uc => <SelectItem key={uc} value={uc}>{uc}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldErrors.useCase && <p className="text-xs text-red-500 mt-1">{fieldErrors.useCase}</p>}
              </div>

              {/* Team size */}
              <div>
                <Label>How many people receive your checklists?</Label>
                <Select value={teamSize} onValueChange={setTeamSize}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldErrors.teamSize && <p className="text-xs text-red-500 mt-1">{fieldErrors.teamSize}</p>}
              </div>

              {/* Phone (optional) */}
              <div>
                <Label htmlFor="phone">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Phone (optional — for account recovery)" className="mt-1" />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Start My 14-Day Free Trial →
              </Button>
              <p className="text-xs text-center text-gray-400">$0 today · No credit card required to start</p>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <Label htmlFor="signInEmail">Email address</Label>
                <Input id="signInEmail" type="email" value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  placeholder="you@example.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="signInPassword">Password</Label>
                <div className="relative mt-1">
                  <Input id="signInPassword" type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword} onChange={e => setSignInPassword(e.target.value)}
                    placeholder="Your password" className="pr-10" />
                  <button type="button" onClick={() => setShowSignInPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
              {resetSent && <p className="text-sm text-green-600 bg-green-50 rounded p-2">Password reset email sent.</p>}

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Sign In
              </Button>

              <button type="button" onClick={handleForgotPassword}
                className="w-full text-sm text-center text-blue-600 hover:underline">
                Forgot password?
              </button>
            </form>
          )}

          <p className="text-sm text-center text-gray-500">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')}
                  className="text-blue-600 hover:underline font-medium">Sign in →</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:underline font-medium">Back to sign up</button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
