import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { getLanguageName, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';

interface LanguageSelectorProps {
  checklist: Checklist;
  onTranslated: (translatedChecklist: Checklist) => void;
}

// Language selector is disabled - translation is controlled by sender only
// This component now only displays the current language if translated
export function LanguageSelector({ checklist }: LanguageSelectorProps) {
  const translatedLanguage = (checklist as any).translatedTo as LanguageCode || null;

  if (!translatedLanguage || translatedLanguage === 'en') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Globe className="w-4 h-4" />
      <Badge variant="secondary" className="text-xs">
        Translated to {getLanguageName(translatedLanguage)}
      </Badge>
    </div>
  );
}