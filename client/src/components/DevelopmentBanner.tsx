import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Mail, Wrench } from 'lucide-react';

interface DevelopmentBannerProps {
  onDismiss?: () => void;
}

export function DevelopmentBanner({ onDismiss }: DevelopmentBannerProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Submit email to mailing list
      const response = await fetch('/api/mailing-list/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Failed to subscribe to mailing list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Wrench className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-blue-800 text-sm">
              <div className="font-medium mb-2">
                🚧 Development in Progress
              </div>
              <p className="mb-3">
                We're actively rolling out new features including translation services and SMS notifications. 
                Join our mailing list to be notified when these features are fully available.
              </p>
              
              {!isSubmitted ? (
                <form onSubmit={handleEmailSubmit} className="flex items-center space-x-2 max-w-md">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 text-sm"
                    required
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'Joining...' : 'Join'}
                  </Button>
                </form>
              ) : (
                <div className="text-green-700 font-medium">
                  ✓ Thanks! You'll be notified when new features are available.
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}