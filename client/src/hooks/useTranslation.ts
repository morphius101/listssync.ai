import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export type LanguageCode = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'pt' // Portuguese
  | 'zh' // Chinese
  | 'ru' // Russian
  | 'ja' // Japanese
  | 'ar' // Arabic
  | 'hi'; // Hindi

interface LanguageOption {
  code: LanguageCode;
  name: string;
  flag?: string; // Optional flag emoji
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', flag: '🇦🇪' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

export interface TranslationHook {
  isTranslating: boolean;
  error: string | null;
  translateText: (
    text: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ) => Promise<string>;
  translateChecklist: (
    checklistId: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ) => Promise<any>;
  languages: LanguageOption[];
}

export function useTranslation(): TranslationHook {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const translateText = useCallback(async (
    text: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ): Promise<string> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/translate/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage,
        }),
      });
      
      return response.translated;
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      return text; // Return original text on error
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  const translateChecklist = useCallback(async (
    checklistId: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ): Promise<any> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/translate/checklist/${checklistId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetLanguage,
          sourceLanguage,
        }),
      });
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  return {
    isTranslating,
    error,
    translateText,
    translateChecklist,
    languages: LANGUAGES,
  };
}