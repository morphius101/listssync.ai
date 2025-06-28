import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Shield, MessageCircle } from 'lucide-react';

export default function SmsConsent() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!hasConsented) {
      toast({
        title: "Consent Required",
        description: "Please check the consent box to proceed.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/sms-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          firstName,
          lastName,
          consentedAt: new Date().toISOString(),
          ipAddress: 'user-provided',
          userAgent: navigator.userAgent
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Consent Recorded",
          description: "You have successfully opted in to receive SMS notifications from ListsSync.ai.",
        });
      } else {
        throw new Error('Failed to record consent');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record your consent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Consent Recorded</CardTitle>
            <CardDescription>
              Thank you for opting in to SMS notifications from ListsSync.ai
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              You will now receive SMS notifications for shared checklists and important updates.
            </p>
            <p className="text-xs text-gray-500">
              You can opt out at any time by replying STOP to any message.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Continue to ListsSync.ai
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="bg-green-100 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                OPT IN
              </div>
              <span className="text-green-800 text-sm font-medium">
                SMS Messaging Consent Required
              </span>
            </div>
            <p className="text-green-700 text-xs mt-1">
              By providing your information below, you explicitly consent to receive SMS messages from ListsSync.ai
            </p>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Smartphone className="w-8 h-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">SMS Consent</CardTitle>
              <CardDescription>
                Opt in to receive SMS notifications from ListsSync.ai
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">What you're consenting to:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Receive SMS notifications when checklists are shared with you</li>
                    <li>• Get verification codes for accessing shared content</li>
                    <li>• Receive important updates about your shared checklists</li>
                    <li>• Message and data rates may apply</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={hasConsented}
                onCheckedChange={(checked) => setHasConsented(checked as boolean)}
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed">
                I consent to receive SMS messages from ListsSync.ai at the phone number provided above. 
                I understand that I can opt out at any time by replying STOP to any message.
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !hasConsented}
            >
              {isSubmitting ? 'Recording Consent...' : 'Give SMS Consent'}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By providing consent, you agree to our SMS terms and conditions. 
                Standard message and data rates apply.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}