import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackStripeEvent, trackUserAction } from '@/lib/analytics';
import { getAuth } from 'firebase/auth';

interface PricingTier {
  id: 'pro';
  apiTier: 'professional';
  name: string;
  subtitle: string;
  yearlyPrice: number;
  monthlyEquiv: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
  underButton: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'pro',
    apiTier: 'professional',
    name: 'Pro',
    subtitle: 'For hosts, property managers & cleaning teams',
    yearlyPrice: 99,
    monthlyEquiv: '$8.25/month, billed annually',
    popular: true,
    buttonText: 'Start 14-Day Free Trial',
    underButton: '$0 today · $99 charged after 14 days · Cancel anytime',
    features: [
      'Unlimited checklists & properties',
      'Photo proof on every task',
      'Auto-translation (12 languages)',
      'Native SMS & WhatsApp share',
      'No app download for cleaners',
      'Contractor → subcontractor chain',
      'Bulk assign to multiple cleaners',
      'Push notifications',
      'Full audit trail',
      'Priority support',
    ],
  },
];

interface PricingProps {
  userId?: string;
  userEmail?: string;
  currentTier?: string;
}

export default function Pricing({ userId, userEmail, currentTier }: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Pricing — ListsSync.ai';
  }, []);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!userId || !userEmail) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to start your free trial.',
        variant: 'destructive',
      });
      return;
    }

    trackUserAction('subscription_attempt', tier.id);
    setLoading(tier.id);

    try {
      const auth = getAuth();
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await firebaseUser.getIdToken() : null;

      if (!idToken) {
        toast({
          title: 'Authentication Required',
          description: 'Could not verify your session. Please sign in again.',
          variant: 'destructive',
        });
        setLoading(null);
        return;
      }

      const httpResponse = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId, tier: tier.apiTier, email: userEmail }),
      });
      const response = await httpResponse.json().catch(() => ({}));

      if (httpResponse.ok && response.url) {
        trackStripeEvent('checkout_redirect', undefined, tier.apiTier);
        trackUserAction('stripe_checkout_redirect', tier.apiTier);
        window.location.href = response.url;
        return;
      }

      // Server reachable but checkout could not be created — surface so the user isn't silently blocked.
      console.error('Subscription create failed:', { status: httpResponse.status, body: response });
      trackUserAction('subscription_error', tier.id);
      toast({
        title: 'Could Not Start Trial',
        description:
          response?.error ||
          response?.message ||
          `We couldn't start your trial (status ${httpResponse.status}). Please refresh and try again, or email support@listssync.ai if it keeps happening.`,
        variant: 'destructive',
      });
    } catch (error: any) {
      console.error('Subscription error:', error);
      trackUserAction('subscription_error', tier.id);
      toast({
        title: 'Subscription Error',
        description: error.message || 'Failed to start trial. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple pricing. No surprises.
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            14 days free, then $99 per year.{' '}
            <span className="font-semibold text-blue-700">Your cleaners always use it free.</span>
          </p>
        </div>

        {/* Cards */}
        <div className="flex justify-center">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular
                  ? 'border-2 border-blue-500 shadow-xl'
                  : 'border border-gray-200'
              } bg-white`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 px-4">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                <CardDescription className="text-gray-500">{tier.subtitle}</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gray-900">${tier.yearlyPrice}</span>
                  <span className="text-gray-500 ml-1">/year</span>
                  <p className="text-sm text-gray-500 mt-1">{tier.monthlyEquiv}</p>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-4">
                <Button
                  className={`w-full ${tier.popular ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(tier)}
                  disabled={loading === tier.id || !userId}
                >
                  {loading === tier.id ? 'Processing…' : tier.buttonText}
                </Button>
                {userId ? (
                  <p className="text-xs text-gray-400 text-center">{tier.underButton}</p>
                ) : (
                  <a
                    href="/"
                    className="text-sm text-blue-600 hover:text-blue-700 text-center font-medium"
                  >
                    Sign in to start your trial →
                  </a>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do my cleaners pay anything?</h3>
              <p className="text-gray-600">
                Never. Only the host or manager pays. Your cleaners, subcontractors, and field
                workers use ListsSync completely free, forever, with no limits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens after the trial?</h3>
              <p className="text-gray-600">
                After 14 days your card is charged $99 for the year. You can cancel before then
                and you won't be charged anything.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is my payment information secure?</h3>
              <p className="text-gray-600">
                Yes, all payments are processed securely through Stripe. We never store your
                payment details.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-16 border-t border-gray-200 pt-8 pb-4 text-center text-sm text-gray-500">
        <div className="flex justify-center space-x-6">
          <a href="/privacy-policy" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</a>
        </div>
        <p className="mt-3 text-gray-400">&copy; {new Date().getFullYear()} ListsSync.ai</p>
      </footer>
    </div>
  );
}
