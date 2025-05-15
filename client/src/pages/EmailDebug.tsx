import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { apiRequest } from '@/lib/queryClient';
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Check } from 'lucide-react';

export default function EmailDebug() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSendTest = async () => {
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSending(true);
    setResult(null);
    
    try {
      const response = await apiRequest('/api/debug/test-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });
      
      const data = await response.json();
      setResult(data);
      
      toast({
        title: data.success ? 'Success' : 'Error',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error testing email:', error);
      toast({
        title: 'Error',
        description: 'Failed to test email sending. Check console for details.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2 text-primary" />
            SendGrid Email Debug
          </CardTitle>
          <CardDescription>
            Test email delivery with SendGrid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          {result && (
            <div className={`p-3 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Email Test Result' : 'Email Test Failed'}
              </h3>
              <p className={`text-xs mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.message}
              </p>
              {result.code && (
                <p className="text-xs mt-2 font-mono bg-slate-100 p-1 rounded">
                  Verification code: {result.code}
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSendTest} 
            disabled={isSending || !email.trim()}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}