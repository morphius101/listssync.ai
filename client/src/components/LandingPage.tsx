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
            <Button 
              onClick={handleGetStarted}
              disabled={isLoggingIn || isLoading}
              size="sm"
              variant="outline"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Button>
          </nav>
          
          <div className="md:hidden">
            <Button 
              onClick={handleGetStarted}
              disabled={isLoggingIn || isLoading}
              size="sm"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Button>
          </div>
        </div>
      </header>

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
            Create, share, and verify task completion with photo proof — across any industry, any team, anywhere in the world. No downloads needed.
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
          <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of professionals across industries saving time with ListsSync.ai</p>
          
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