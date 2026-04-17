import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Check, Wifi, WifiOff, Smartphone, XCircle,
  Languages, Share2, Globe, MessageSquare, Menu, X
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase';

const LandingPage = () => {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const oneTapInitialized = useRef(false);
  const [gsiReady, setGsiReady] = useState(!!(window as any).google?.accounts?.id);

  useEffect(() => {
    document.title = 'ListsSync.ai — Smart Checklists with Photo Verification';
  }, []);

  // Poll until GSI script is ready, then set flag so One Tap effect can re-run
  useEffect(() => {
    if (gsiReady) return;
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        setGsiReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gsiReady]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && location === '/') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  // Google One Tap — auto-prompts returning Google users on the landing page
  useEffect(() => {
    console.log('OneTap effect:', { isAuthenticated, isLoading, googleLoaded: !!(window as any).google?.accounts?.id });

    // Don't run while Firebase is still resolving auth state
    if (isLoading) return;
    // Only show One Tap if definitely not signed in
    if (isAuthenticated) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('OneTap: VITE_GOOGLE_CLIENT_ID not set');
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.id) {
      console.warn('OneTap: GSI not loaded yet');
      return;
    }

    if (oneTapInitialized.current) return;
    oneTapInitialized.current = true;

    const handleOneTapResponse = async (response: { credential: string }) => {
      try {
        const { GoogleAuthProvider, signInWithCredential, getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const firebaseCredential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(auth, firebaseCredential);
        navigate('/dashboard');
      } catch (error) {
        console.error('One Tap sign-in failed:', error);
      }
    };

    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleOneTapResponse,
      auto_select: true,
      cancel_on_tap_outside: false,
    });
    google.accounts.id.prompt((notification: any) => {
      console.log('One Tap prompt:', notification.getMomentType(), notification.getNotDisplayedReason?.());
    });
  }, [isAuthenticated, isLoading, gsiReady]);

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    setIsLoggingIn(true);
    setAuthError(null);

    // 6-second safety net — if auth hasn't resolved, unblock the button
    const timeoutId = setTimeout(() => {
      setIsLoggingIn(false);
      setAuthError('Sign-in failed — try again');
    }, 6000);

    try {
      const result = await signInWithGoogle();
      clearTimeout(timeoutId);
      if (result) {
        navigate('/dashboard');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Login failed:', error);
      setIsLoggingIn(false);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setAuthError('Sign-in failed — try again');
      }
    }
  };

  const features = [
    { 
      icon: <XCircle className="h-5 w-5 text-primary" />, 
      title: 'No apps to download', 
      description: 'Works on any device with a web browser. No app installation required for your team or clients.' 
    },
    { 
      icon: <WifiOff className="h-5 w-5 text-primary" />, 
      title: 'Works offline', 
      description: "Perfect for remote locations, construction sites, or anywhere with spotty connectivity. Data syncs automatically." 
    },
    { 
      icon: <Wifi className="h-5 w-5 text-primary" />, 
      title: 'Real-time collaboration', 
      description: 'Coordinate between field workers, clients, and office staff with instant updates across all devices.' 
    },
    { 
      icon: <Smartphone className="h-5 w-5 text-primary" />, 
      title: 'Photo verification', 
      description: 'Document work completion with visual evidence. Perfect for quality control and dispute prevention.' 
    },
    { 
      icon: <Languages className="h-5 w-5 text-primary" />, 
      title: 'Multilingual support', 
      description: 'Bridge language gaps with automatic translation. Create in English, share in Spanish, French, Chinese, and more.' 
    },
    { 
      icon: <Share2 className="h-5 w-5 text-primary" />, 
      title: 'Secure verification', 
      description: 'Confirm recipient identity with phone or email verification. Know exactly who completed each task.' 
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-primary" />,
      title: 'Detailed remarks',
      description: 'Add notes and comments to document specific issues or special instructions for any task.'
    },
    {
      icon: <Globe className="h-5 w-5 text-primary" />,
      title: 'Industry versatile',
      description: 'Adaptable templates for hospitality, construction, cleaning, inspections, maintenance, and more.'
    }
  ];

  const testimonials = [
    {
      quote: "ListsSync has transformed how I manage my Airbnb properties. Guests can verify check-in and check-out tasks with photos, eliminating disputes.",
      author: "Sarah J., Airbnb Host"
    },
    {
      quote: "Our construction team uses ListsSync for quality control. The offline mode is crucial on remote job sites where cell service is unreliable.",
      author: "Michael R., Construction Manager"
    },
    {
      quote: "My cleaning staff can now document their work with photos. The verification system ensures accountability and has improved our service quality.",
      author: "Elena K., Cleaning Service Owner"
    },
    {
      quote: "As an inspector, the multilingual feature lets me create reports in English that are automatically shared with international clients in their language.",
      author: "David T., Home Inspector"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Logo size="sm" />
            <span className="font-bold text-lg text-primary">ListsSync.ai</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">How It Works</a>
            <a href="/pricing" className="text-gray-600 hover:text-primary transition-colors">Pricing</a>
            {isAuthenticated ? (
              <Button onClick={handleGetStarted} disabled={isLoggingIn || isLoading} size="sm" variant="outline">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={handleGetStarted} disabled={isLoggingIn || isLoading} size="sm" variant="outline">
                  Sign In
                </Button>
                <Button onClick={handleGetStarted} disabled={isLoggingIn || isLoading} size="sm">
                  Sign Up Free
                </Button>
              </>
            )}
          </nav>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 flex flex-col space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary py-2 transition-colors">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary py-2 transition-colors">How It Works</a>
            <a href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-700 hover:text-primary py-2 transition-colors">Pricing</a>
            <div className="pt-2 flex flex-col space-y-2">
              <Button onClick={handleGetStarted} disabled={isLoggingIn || isLoading} variant="outline" className="w-full">
                {isAuthenticated ? 'Dashboard' : 'Sign In'}
              </Button>
              {!isAuthenticated && (
                <Button onClick={handleGetStarted} disabled={isLoggingIn || isLoading} className="w-full">
                  Sign Up Free
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="container mx-auto px-4 pt-16 pb-24 flex flex-col items-center text-center">
          <div className="mb-6">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Your cleaner doesn't need an app. Just send a link.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl">
            Build a checklist, send it to any phone via text or email, and get photo proof back the moment the job is done. No app download, no account, no tech support calls for your cleaners. Just works.
          </p>
          
          <Button
            onClick={handleGetStarted}
            disabled={isLoggingIn || isLoading}
            size="lg"
            className="rounded-full px-8 py-6 text-lg"
          >
            {isLoggingIn ? 'Signing in...' : (isAuthenticated ? 'Go to Dashboard' : 'Get Started')}
            {!isLoggingIn && !isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
          {!isAuthenticated && !authError && (
            <p className="mt-3 text-sm text-gray-500">14-day free trial · Works on any phone · No app for your cleaners</p>
          )}
          {authError && (
            <p className="mt-3 text-sm text-red-500">{authError}</p>
          )}
        </div>
      </div>
      
      {/* Features Section */}
      <div id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Designed for professionals who need accountability
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { number: '1', title: 'Create checklists', desc: 'Build customized templates for your specific industry needs and requirements' },
              { number: '2', title: 'Assign & collaborate', desc: 'Share with your team, clients, or contractors for real-time updates and tracking' },
              { number: '3', title: 'Verify & complete', desc: 'Add photo proof and comments to ensure accountability and quality' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Testimonials */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            What Our Users Say
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                <p className="text-gray-900 font-medium">{testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to bring accountability to your business?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">From Airbnb hosts to construction crews — ListsSync.ai keeps every job documented, verified, and on track.</p>
          
          <div className="mb-8 flex flex-wrap justify-center gap-4 text-sm">
            <span className="bg-white/20 rounded-full px-4 py-1">Airbnb Hosts</span>
            <span className="bg-white/20 rounded-full px-4 py-1">Contractors</span>
            <span className="bg-white/20 rounded-full px-4 py-1">Property Managers</span>
            <span className="bg-white/20 rounded-full px-4 py-1">Inspectors</span>
            <span className="bg-white/20 rounded-full px-4 py-1">Cleaning Services</span>
            <span className="bg-white/20 rounded-full px-4 py-1">Maintenance Teams</span>
          </div>
          
          <Button 
            onClick={handleGetStarted}
            disabled={isLoggingIn || isLoading}
            variant="secondary" 
            size="lg" 
            className="rounded-full px-8 py-6 text-lg"
          >
            {isLoggingIn ? 'Signing in...' : (isAuthenticated ? 'Go to Dashboard' : 'Get Started Now')}
            {!isLoggingIn && !isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center mb-3">
                <Logo size="sm" />
                <span className="ml-2 text-white font-semibold">ListsSync.ai</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Create, share, and verify task completion with photo proof — for any team, any industry.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">Legal & Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@listssync.ai" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>&copy; {new Date().getFullYear()} ListsSync.ai · A product of Impact Development Consulting</p>
            <p className="mt-2 md:mt-0 text-gray-600">Built for teams who value accountability</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;