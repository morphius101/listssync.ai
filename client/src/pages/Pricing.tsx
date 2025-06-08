import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PricingTier {
  id: 'free' | 'professional' | 'enterprise';
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ComponentType<any>;
  buttonText: string;
  yearlyDiscount?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for individuals',
    icon: Check,
    buttonText: 'Get Started',
    features: [
      'Up to 5 checklists',
      '1 user',
      'Manual sync every 6 hours',
      'English and Spanish translation',
      '1GB storage',
      'Community support',
      'Mobile and web access'
    ]
  },

  {
    id: 'professional',
    name: 'Professional',
    price: '$49',
    description: 'For growing businesses',
    icon: Crown,
    popular: true,
    buttonText: 'Start Free Trial',
    yearlyDiscount: 'Save 20% yearly',
    features: [
      'Up to 100 checklists',
      '10 team members',
      'Real-time sync',
      '15 language translations',
      '50GB storage',
      'Advanced analytics',
      'API access',
      'Workflow automation',
      'Integrations (Slack, Teams, etc)',
      '14-day free trial'
    ]
  },

  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299',
    description: 'For enterprise needs',
    icon: Building,
    buttonText: 'Start Free Trial',
    yearlyDiscount: 'Save 20% yearly',
    features: [
      'Unlimited checklists',
      'Unlimited users',
      'Real-time sync',
      'All languages supported',
      'Unlimited storage',
      'Custom deployment',
      'Enterprise SLA',
      'Custom integrations',
      'Dedicated onboarding',
      '30-day free trial'
    ]
  }
];

interface PricingProps {
  userId?: string;
  userEmail?: string;
  currentTier?: string;
}

export default function Pricing({ userId, userEmail, currentTier = 'free' }: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (tier: PricingTier) => {
    if (!userId || !userEmail) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to subscribe to a plan.',
        variant: 'destructive'
      });
      return;
    }

    if (tier.id === 'free') {
      toast({
        title: 'Already on Free Plan',
        description: 'You are already using the free plan.',
      });
      return;
    }

    if (tier.id === 'enterprise') {
      toast({
        title: 'Contact Sales',
        description: 'Please contact our sales team for enterprise pricing.',
      });
      return;
    }

    setLoading(tier.id);

    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tier: tier.id,
          email: userEmail
        })
      }).then(res => res.json());

      if (response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription Error',
        description: error.message || 'Failed to create subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scale your checklist management with listssync.ai's flexible pricing plans.
            Start free and upgrade as you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.id;
            
            return (
              <Card 
                key={tier.id} 
                className={`relative ${tier.popular ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'} ${isCurrentTier ? 'bg-blue-50' : 'bg-white'}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${tier.popular ? 'bg-blue-500' : 'bg-gray-100'}`}>
                      <Icon className={`w-6 h-6 ${tier.popular ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                  <CardDescription className="text-gray-600">{tier.description}</CardDescription>
                  
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    {tier.id === 'professional' && <span className="text-gray-600">/month</span>}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${tier.popular ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(tier)}
                    disabled={loading === tier.id || isCurrentTier}
                  >
                    {loading === tier.id ? 'Processing...' : 
                     isCurrentTier ? 'Current Plan' : tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens to my data if I downgrade?</h3>
              <p className="text-gray-600">Your data is always safe. If you exceed plan limits, you'll need to upgrade or remove some checklists.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600">We offer a 7-day free trial for Pro plans. For other refund requests, please contact support.</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is my payment information secure?</h3>
              <p className="text-gray-600">Yes, all payments are processed securely through Stripe. We never store your payment information.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}