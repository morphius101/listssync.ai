import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Building, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: 'lists' | 'languages' | 'general';
  currentTier?: string;
}

const plans = [
  {
    id: 'professional',
    name: 'Professional',
    price: '$49',
    period: '/mo',
    icon: Crown,
    color: 'border-blue-500',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-500',
    features: [
      'Up to 100 checklists',
      'Real-time sync',
      '15 languages',
      'Advanced analytics',
      'API access',
      'Team collaboration (10 users)',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299',
    period: '/mo',
    icon: Building,
    color: 'border-purple-500',
    badge: 'Unlimited',
    badgeColor: 'bg-purple-500',
    features: [
      'Unlimited checklists',
      'Unlimited users',
      'All languages',
      'Custom deployment',
      'Enterprise SLA',
      'Custom integrations',
      'Dedicated onboarding',
    ],
  },
];

const reasonMessages = {
  lists: "You've reached your plan's checklist limit.",
  languages: "That language isn't available on your current plan.",
  general: 'Unlock the full power of ListsSync.ai.',
};

export function UpgradeModal({ open, onClose, reason = 'general', currentTier }: UpgradeModalProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = (planId: string) => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            <span className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Upgrade Your Plan
            </span>
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm mt-1">
            {reasonMessages[reason]}
          </p>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative border-2 ${plan.color} rounded-xl p-5 flex flex-col`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{plan.name}</span>
                  </div>
                  <Badge className={`${plan.badgeColor} text-white text-xs`}>
                    {plan.badge}
                  </Badge>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.id === 'professional' ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  Get {plan.name}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}
