import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, Check, Wifi, WifiOff, Smartphone, XCircle,
  Languages, Share2, Globe, MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase';

const LandingPage = () => {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setIsLoggingIn(true);
      try {
        await signInWithGoogle();
        navigate('/dashboard');
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const features = [
    { 
      icon: <XCircle className="h-5 w-5 text-primary" />, 
      title: 'No apps to download', 
      description: 'Works on any device with a web browser. No app installation required.' 
    },
    { 
      icon: <WifiOff className="h-5 w-5 text-primary" />, 
      title: 'Works offline', 
      description: "Continue working even when you lose connection. Your data will sync when you're back online." 
    },
    { 
      icon: <Wifi className="h-5 w-5 text-primary" />, 
      title: 'Real-time collaboration', 
      description: 'See checklist updates instantly across all devices in your team.' 
    },
    { 
      icon: <Smartphone className="h-5 w-5 text-primary" />, 
      title: 'Photo verification', 
      description: 'Capture photo proof directly in checklists to verify task completion.' 
    },
    { 
      icon: <Languages className="h-5 w-5 text-primary" />, 
      title: 'Multilingual support', 
      description: 'Create checklists in one language and share them in another. Automatic translation between languages.' 
    },
    { 
      icon: <Share2 className="h-5 w-5 text-primary" />, 
      title: 'Secure sharing', 
      description: 'Send checklists securely with phone or email verification to confirm recipient identity.' 
    },
  ];

  const testimonials = [
    {
      quote: "ListsSync has streamlined our property inspections. The photo verification feature gives us peace of mind that everything has been properly checked.",
      author: "Sarah J., Property Manager"
    },
    {
      quote: "Our maintenance team can now complete checklists even in areas with no cell service. When they get back in range, everything syncs automatically.",
      author: "Michael R., Maintenance Supervisor"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="container mx-auto px-4 pt-16 pb-24 flex flex-col items-center text-center">
          <div className="mb-6">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            ListsSync<span className="text-primary">.ai</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl">
            Sync real-time checklists with instant photo proof — no app downloads, no confusion. Just clarity across teams.
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
        </div>
      </div>
      
      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Designed for property management teams
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
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { number: '1', title: 'Create checklists', desc: 'Build customized templates for different property types and tasks' },
              { number: '2', title: 'Assign & collaborate', desc: 'Share with your team for real-time updates and progress tracking' },
              { number: '3', title: 'Verify & complete', desc: 'Add photo proof and comments to document completed work' }
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
              <div key={i} className="bg-gray-50 p-6 rounded-lg">
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
          <h2 className="text-3xl font-bold mb-6">Ready to streamline your property inspections?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of property managers saving time with ListsSync.ai</p>
          
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
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <Logo size="sm" />
              <span className="ml-2 text-white font-semibold">ListsSync.ai</span>
            </div>
            
            <div className="text-sm">
              &copy; {new Date().getFullYear()} ListsSync.ai — All rights reserved
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;