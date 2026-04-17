import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Crown, Building } from 'lucide-react';
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

  const isTrial = subscription.tier === 'free';
  const isPro = subscription.tier === 'professional';

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isTrial ? (
              <Zap className="h-5 w-5 text-blue-500" />
            ) : isPro ? (
              <Crown className="h-5 w-5 text-blue-500" />
            ) : (
              <Building className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                {isTrial ? (
                  <>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Trial
                    </Badge>
                    <span className="text-sm text-gray-600">14 days remaining</span>
                  </>
                ) : isPro ? (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Host</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">Manager</Badge>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isTrial
                  ? 'Full access · All features unlocked'
                  : isPro ? 'Host plan · Up to 5 properties' : 'Manager plan · Unlimited properties'}
              </div>
            </div>
          </div>

          {isTrial && (
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MinimalistSubscriptionStatus;