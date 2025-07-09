import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Shield, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function SmsConsent() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    consent: false,
    marketingConsent: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sms-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          consentedAt: new Date(),
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
          isActive: true
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        throw new Error('Failed to submit consent');
      }
    } catch (error) {
      console.error('Error submitting consent:', error);
      alert('Error submitting consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.firstName && formData.lastName && formData.phoneNumber && formData.consent;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Consent Recorded</CardTitle>
            <CardDescription>
              Thank you for providing your consent. You can now receive SMS messages from ListsSync.ai.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>What happens next:</strong><br />
                You'll receive SMS verification codes and checklist updates from ListsSync.ai when checklists are shared with you.
              </p>
            </div>
            <Link href="/">
              <Button className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Communication Consent</h1>
          <p className="text-gray-600">
            Grant permission to receive text messages from ListsSync.ai
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              How SMS Consent Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll receive:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Verification codes to access shared checklists</li>
                <li>• Checklist completion notifications</li>
                <li>• Important updates about your shared tasks</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Your rights:</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Reply <strong>STOP</strong> to any message to opt out immediately</li>
                <li>• Reply <strong>HELP</strong> for support information</li>
                <li>• Message and data rates may apply</li>
                <li>• You can revoke consent at any time</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Technical details:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Messages sent from: <strong>+1 (866) 350-3513</strong></li>
                <li>• Frequency: Only when checklists are shared with you</li>
                <li>• Supported carriers: All major US carriers</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provide Your Consent</CardTitle>
            <CardDescription>
              Please fill out the form below to consent to receiving SMS messages from ListsSync.ai
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
                <p className="text-xs text-gray-500">
                  Include country code (e.g., +1 for US numbers)
                </p>
              </div>

              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={formData.consent}
                    onCheckedChange={(checked) => setFormData({ ...formData, consent: checked as boolean })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="consent" className="text-sm font-medium text-blue-900">
                      Required SMS Consent *
                    </Label>
                    <p className="text-xs text-blue-800 mt-1">
                      I consent to receive SMS messages from ListsSync.ai at the phone number provided above. 
                      I understand that message and data rates may apply, and I can opt out at any time by 
                      replying STOP to any message.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="marketingConsent"
                    checked={formData.marketingConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, marketingConsent: checked as boolean })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="marketingConsent" className="text-sm font-medium text-blue-900">
                      Marketing Communications (Optional)
                    </Label>
                    <p className="text-xs text-blue-800 mt-1">
                      I would also like to receive promotional messages about new features, tips, and updates from ListsSync.ai.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  By submitting this form, you're providing explicit consent to receive SMS messages from ListsSync.ai. 
                  This consent is required for SMS-based checklist sharing features.
                </p>
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Grant SMS Consent'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@listssync.ai" className="text-blue-600 hover:underline">
              support@listssync.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}