import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Shield, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SmsConsent() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasConsented) {
      toast({
        title: "Consent Required",
        description: "Please check the consent box to receive SMS messages.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Store the consent in your database
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
          ipAddress: 'user-provided', // Would normally capture actual IP
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
            <CardTitle className="text-green-700">Consent Recorded</CardTitle>
            <CardDescription>
              Thank you for opting in to receive SMS notifications from ListsSync.ai.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You will now receive important updates about your shared checklists via SMS.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Return to ListsSync.ai
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>SMS Notifications Consent</CardTitle>
          <CardDescription>
            Opt in to receive important checklist notifications via SMS
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Alert className="mb-6">
            <Phone className="h-4 w-4" />
            <AlertDescription>
              <strong>What you're consenting to:</strong> By providing your phone number and checking the consent box below, 
              you agree to receive SMS text messages from ListsSync.ai about your shared checklists, verification codes, 
              and important updates. Message and data rates may apply.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent"
                  checked={hasConsented}
                  onCheckedChange={(checked) => setHasConsented(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I consent to receive SMS messages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    I agree to receive SMS text messages from ListsSync.ai at the phone number provided above. 
                    I understand that I can opt out at any time by replying STOP. Message frequency varies. 
                    Message and data rates may apply.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 space-y-2">
              <p><strong>Frequency:</strong> You may receive up to 5 messages per month, depending on your checklist activity.</p>
              <p><strong>Opt-out:</strong> Reply STOP to any message to unsubscribe immediately.</p>
              <p><strong>Help:</strong> Reply HELP for assistance or contact support@listssync.ai</p>
              <p><strong>Carriers:</strong> Message and data rates may apply. Supported carriers include major US networks.</p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!hasConsented || isSubmitting}
            >
              {isSubmitting ? 'Recording Consent...' : 'Opt In to SMS Notifications'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By submitting this form, you provide explicit consent to receive SMS messages from ListsSync.ai. 
              Your phone number will be used only for the purposes described and will not be shared with third parties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}