import { useState } from 'react';
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
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
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
    checklist: any, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ) => Promise<any>;
  languages: LanguageOption[];
}

export function useTranslation(): TranslationHook {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateText = async (
    text: string, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ): Promise<string> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/translate/text', {
        method: 'POST',
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage: sourceLanguage || 'en'
        }),
      });
      
      const data = await response.json();
      return data.translated || '';
    } catch (err) {
      console.error('Translation error:', err);
      setError('Failed to translate text');
      return '';
    } finally {
      setIsTranslating(false);
    }
  };
  
  const translateChecklist = async (
    checklist: any, 
    targetLanguage: LanguageCode, 
    sourceLanguage?: LanguageCode
  ): Promise<any> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      // Clone the checklist to avoid modifying the original
      const translatedChecklist = JSON.parse(JSON.stringify(checklist));
      
      // Translate checklist name
      const translatedName = await translateText(
        checklist.name, 
        targetLanguage, 
        sourceLanguage
      );
      translatedChecklist.name = translatedName;
      
      // Translate remarks if available
      if (checklist.remarks) {
        const translatedRemarks = await translateText(
          checklist.remarks, 
          targetLanguage, 
          sourceLanguage
        );
        translatedChecklist.remarks = translatedRemarks;
      }
      
      // Translate each task
      if (checklist.tasks && Array.isArray(checklist.tasks)) {
        for (let i = 0; i < checklist.tasks.length; i++) {
          const task = checklist.tasks[i];
          
          // Translate task description
          const translatedDescription = await translateText(
            task.description, 
            targetLanguage, 
            sourceLanguage
          );
          translatedChecklist.tasks[i].description = translatedDescription;
          
          // Translate task details if available
          if (task.details) {
            const translatedDetails = await translateText(
              task.details, 
              targetLanguage, 
              sourceLanguage
            );
            translatedChecklist.tasks[i].details = translatedDetails;
          }
        }
      }
      
      // Add translation metadata
      translatedChecklist.translatedFrom = sourceLanguage || "auto";
      translatedChecklist.translatedTo = targetLanguage;
      translatedChecklist.isTranslation = true;
      
      return translatedChecklist;
    } catch (err) {
      console.error('Checklist translation error:', err);
      setError('Failed to translate checklist');
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    isTranslating,
    error,
    translateText,
    translateChecklist,
    languages: LANGUAGES
  };
}