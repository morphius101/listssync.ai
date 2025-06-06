import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Zap, Building, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  tier: 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
  status: string;
  endsAt?: string;
  usage: {
    listSyncCount: number;
    languageUseCount: number;
    lastSyncAt?: string;
  };
  limits: {
    maxLists: number;
    maxUsers: number;
    maxLanguages: number;
    storageGB: number;
    features: string[];
  };
  allowedLanguages: string[];
}

interface SubscriptionStatusProps {
  userId: string;
  onUpgrade: () => void;
}

const tierConfig = {
  free: {
    name: 'Free',
    icon: Zap,
    color: 'bg-gray-100 text-gray-800',
    description: 'Basic features'
  },
  starter: {
    name: 'Starter',
    icon: Zap,
    color: 'bg-green-100 text-green-800',
    description: 'Team collaboration'
  },
  professional: {
    name: 'Professional',
    icon: Crown,
    color: 'bg-blue-100 text-blue-800',
    description: 'Advanced features'
  },
  business: {
    name: 'Business',
    icon: Building,
    color: 'bg-purple-100 text-purple-800',
    description: 'Enterprise ready'
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building,
    color: 'bg-purple-100 text-purple-800',
    description: 'Custom solutions'
  }
};

export default function SubscriptionStatus({ userId, onUpgrade }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionData();
  }, [userId]);

  const fetchSubscriptionData = async () => {
    try {
      const data = await fetch(`/api/user/${userId}/subscription`).then(res => res.json());
      setSubscription(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Unable to load subscription information</p>
        </CardContent>
      </Card>
    );
  }

  const config = tierConfig[subscription.tier];
  const Icon = config.icon;
  const listUsagePercent = subscription.limits.maxLists === Infinity ? 0 : 
    (subscription.usage.listSyncCount / subscription.limits.maxLists) * 100;
  const isNearLimit = listUsagePercent > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="w-5 h-5" />
            <span>Subscription Status</span>
          </div>
          <Badge className={config.color}>
            {config.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Usage Stats */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Checklists Used</span>
              <span>
                {subscription.usage.listSyncCount} / {
                  subscription.limits.maxLists === Infinity ? '∞' : subscription.limits.maxLists
                }
              </span>
            </div>
            {subscription.limits.maxLists !== Infinity && (
              <div>
                <Progress value={listUsagePercent} className="h-2" />
                {isNearLimit && (
                  <div className="flex items-center mt-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Approaching limit</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Languages Available</span>
              <span>
                {subscription.allowedLanguages.length} / {
                  subscription.limits.maxLanguages === Infinity ? '∞' : subscription.limits.maxLanguages
                }
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {subscription.allowedLanguages.slice(0, 5).map((lang) => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang.toUpperCase()}
                </Badge>
              ))}
              {subscription.allowedLanguages.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{subscription.allowedLanguages.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div>
          <h4 className="font-medium mb-2">Plan Features</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {subscription.limits.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                {feature.replace('_', ' ')}
              </li>
            ))}
            {subscription.limits.features.length > 3 && (
              <li className="text-xs text-gray-500">
                +{subscription.limits.features.length - 3} more features
              </li>
            )}
          </ul>
        </div>

        {/* Upgrade Prompt */}
        {subscription.tier === 'free' && (isNearLimit || subscription.usage.listSyncCount >= 1) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Crown className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Unlock More Features</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Upgrade to Pro for 10 checklists, real-time sync, and 5 languages.
                </p>
                <Button 
                  size="sm" 
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                  onClick={onUpgrade}
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Info */}
        {subscription.tier !== 'free' && (
          <div className="text-xs text-gray-500 border-t pt-4">
            <p>Status: {subscription.status}</p>
            {subscription.endsAt && (
              <p>Next billing: {new Date(subscription.endsAt).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}