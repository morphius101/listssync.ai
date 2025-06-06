import { AlertTriangle, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UpgradePromptProps {
  type: 'list_limit' | 'language_limit';
  currentTier: string;
  limit?: number;
  current?: number;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

const promptConfig = {
  list_limit: {
    title: 'Checklist Limit Reached',
    description: 'You\'ve reached your checklist limit. Upgrade to Pro for 10 checklists or Enterprise for unlimited.',
    icon: AlertTriangle,
    color: 'border-amber-200 bg-amber-50'
  },
  language_limit: {
    title: 'Language Not Available',
    description: 'This language isn\'t available in your current plan. Upgrade to access more languages.',
    icon: Crown,
    color: 'border-blue-200 bg-blue-50'
  }
};

export default function UpgradePrompt({ 
  type, 
  currentTier, 
  limit, 
  current, 
  onUpgrade, 
  onDismiss 
}: UpgradePromptProps) {
  const config = promptConfig[type];
  const Icon = config.icon;

  return (
    <Card className={`${config.color} border`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Icon className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                {config.title}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {config.description}
              </p>
              
              {limit && current !== undefined && (
                <p className="text-xs text-gray-500 mb-3">
                  Current usage: {current} / {limit}
                </p>
              )}

              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={onUpgrade}>
                  Upgrade Now
                </Button>
                <Button size="sm" variant="outline" onClick={() => {}}>
                  Learn More
                </Button>
              </div>
            </div>
          </div>
          
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}