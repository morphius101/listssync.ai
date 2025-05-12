import { useState } from 'react';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  checklist: Checklist;
  onTranslated: (translatedChecklist: Checklist) => void;
}

export function LanguageSelector({ checklist, onTranslated }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const { languages, isTranslating, translateChecklist } = useTranslation();
  const [translatedLanguage, setTranslatedLanguage] = useState<LanguageCode | null>(
    (checklist as any).translatedTo as LanguageCode || null
  );

  const handleTranslate = async () => {
    if (!selectedLanguage || isTranslating) return;

    try {
      const sourceLanguage = (checklist as any).translatedFrom as LanguageCode || 'en';
      const translated = await translateChecklist(
        checklist.id,
        selectedLanguage,
        sourceLanguage
      );

      if (translated) {
        onTranslated(translated);
        setTranslatedLanguage(selectedLanguage);
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  // When the checklist changes, reset the state based on its translation metadata
  if (translatedLanguage !== ((checklist as any).translatedTo as LanguageCode || null)) {
    setTranslatedLanguage((checklist as any).translatedTo as LanguageCode || null);
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Globe className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium">Language</span>
          
          {translatedLanguage && (
            <Badge variant="outline" className="ml-2">
              {languages.find(l => l.code === translatedLanguage)?.name || translatedLanguage}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            value={selectedLanguage || ''}
            onValueChange={(value) => setSelectedLanguage(value as LanguageCode)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedLanguage || isTranslating}
            onClick={handleTranslate}
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}