import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Crown } from 'lucide-react';
import { trackUserAction } from '@/lib/analytics';
import { getAuthHeaders } from '@/hooks/useAuth';

interface SubscriptionData {
  tier: 'free' | 'professional' | 'enterprise';
  usage: {
    listSyncCount: number;
    languageUseCount: number;
  };
  limits: {
    maxLists: number;
    maxLanguages: number;
    features: string[];
  };
  allowedLanguages: string[];
}

interface MinimalistSubscriptionStatusProps {
  userId: string;
  onUpgrade: () => void;
}

const MinimalistSubscriptionStatus = ({ userId, onUpgrade }: MinimalistSubscriptionStatusProps) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch(`/api/user/${userId}/subscription`, {
          headers: await getAuthHeaders(),
        });
        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSubscription();
    }
  }, [userId]);

  const handleUpgrade = () => {
    trackUserAction('upgrade_clicked', subscription?.tier);
    onUpgrade();
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const isFree = subscription.tier === 'free';
  const isPaid = subscription.tier === 'professional' || subscription.tier === 'enterprise';

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isFree ? (
              <Zap className="h-5 w-5 text-blue-500" />
            ) : (
              <Crown className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                {isFree ? (
                  <>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Trial
                    </Badge>
                    <span className="text-sm text-gray-600">14-day free trial</span>
                  </>
                ) : (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Pro</Badge>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isFree
                  ? 'Start your 14-day free trial — $99/year after'
                  : 'Pro plan · Unlimited checklists & properties'}
              </div>
            </div>
          </div>

          {isFree && (
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Trial
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MinimalistSubscriptionStatus;