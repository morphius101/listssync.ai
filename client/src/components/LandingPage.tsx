import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, Check, Wifi, WifiOff, Smartphone, XCircle,
  Languages, Share2, Globe, MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './AuthModal';

const LandingPage = () => {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setShowAuthModal(true);
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
      title: 'Secure sharing', 
      description: 'Share checklists with clients via email or SMS with verification codes. No account needed for recipients.' 
    },
    { 
      icon: <Globe className="h-5 w-5 text-primary" />, 
      title: 'Any industry', 
      description: 'From Airbnb hosts to construction crews — adaptable to any workflow that needs accountability.' 
    },
    { 
      icon: <MessageSquare className="h-5 w-5 text-primary" />, 
      title: 'Remarks & notes', 
      description: 'Add contextual notes and remarks to tasks and checklists for clear communication.' 
    },
  ];

  const testimonials = [
    { quote: "Finally, a tool that lets me share inspection checklists with contractors who don't need to create accounts.", author: "Property Manager, Dallas TX" },
    { quote: "The photo verification feature has completely eliminated disputes with clients about what was completed.", author: "Cleaning Service Owner, Miami FL" },
    { quote: "We use it to coordinate our multilingual crew — the translation feature is a game changer.", author: "Construction Foreman, Los Angeles CA" },
    { quote: "Simple enough for my cleaners to use, powerful enough for my entire portfolio.", author: "Airbnb Superhost, Nashville TN" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => { setShowAuthModal(false); navigate('/dashboard'); }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
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
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Button>
          </nav>
          
          <div className="md:hidden">
            <Button 
              onClick={handleGetStarted}
              disabled={isLoading}
              size="sm"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
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
            disabled={isLoading}
            size="lg" 
            className="rounded-full px-8 py-6 text-lg"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started — Free'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-3 text-sm text-gray-500">No credit card required</p>
        </div>
      </div>
      
      {/* Features */}
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
      
      {/* How It Works */}
      <div id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
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
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <p className="text-gray-700 italic mb-4">"{t.quote}"</p>
                <p className="text-gray-900 font-medium">{t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA */}
      <div className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to bring accountability to your business?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of professionals across industries saving time with ListsSync.ai</p>
          <div className="mb-8 flex flex-wrap justify-center gap-4 text-sm">
            {['Airbnb Hosts','Contractors','Property Managers','Inspectors','Cleaning Services','Maintenance Teams'].map(tag => (
              <span key={tag} className="bg-white/20 rounded-full px-4 py-1">{tag}</span>
            ))}
          </div>
          <Button 
            onClick={handleGetStarted}
            disabled={isLoading}
            variant="secondary" 
            size="lg" 
            className="rounded-full px-8 py-6 text-lg"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Now — Free'}
            <ArrowRight className="ml-2 h-5 w-5" />
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
            <div className="flex gap-6 text-sm mb-6 md:mb-0">
              <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="/sms-consent" className="hover:text-white transition-colors">SMS Consent</a>
            </div>
            <div className="text-sm">&copy; {new Date().getFullYear()} ListsSync.ai — All rights reserved</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
