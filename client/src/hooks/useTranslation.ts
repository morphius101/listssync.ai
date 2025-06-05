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
    if (!checklist || targetLanguage === 'en') {
      return checklist;
    }

    setIsTranslating(true);
    setError(null);
    
    try {
      // Clone the checklist to avoid modifying the original
      const translatedChecklist = JSON.parse(JSON.stringify(checklist));
      
      // Translate checklist name using direct API call to avoid recursion
      if (checklist.name) {
        const nameResponse = await apiRequest('/api/translate/text', {
          method: 'POST',
          body: JSON.stringify({
            text: checklist.name,
            targetLanguage,
            sourceLanguage: sourceLanguage || 'en'
          }),
        });
        const nameData = await nameResponse.json();
        translatedChecklist.name = nameData.translated || checklist.name;
      }
      
      // Translate remarks if available
      if (checklist.remarks) {
        const remarksResponse = await apiRequest('/api/translate/text', {
          method: 'POST',
          body: JSON.stringify({
            text: checklist.remarks,
            targetLanguage,
            sourceLanguage: sourceLanguage || 'en'
          }),
        });
        const remarksData = await remarksResponse.json();
        translatedChecklist.remarks = remarksData.translated || checklist.remarks;
      }
      
      // Translate each task
      if (checklist.tasks && Array.isArray(checklist.tasks)) {
        for (let i = 0; i < checklist.tasks.length; i++) {
          const task = checklist.tasks[i];
          
          // Translate task description
          if (task.description) {
            const descResponse = await apiRequest('/api/translate/text', {
              method: 'POST',
              body: JSON.stringify({
                text: task.description,
                targetLanguage,
                sourceLanguage: sourceLanguage || 'en'
              }),
            });
            const descData = await descResponse.json();
            translatedChecklist.tasks[i].description = descData.translated || task.description;
          }
          
          // Translate task details if available
          if (task.details) {
            const detailsResponse = await apiRequest('/api/translate/text', {
              method: 'POST',
              body: JSON.stringify({
                text: task.details,
                targetLanguage,
                sourceLanguage: sourceLanguage || 'en'
              }),
            });
            const detailsData = await detailsResponse.json();
            translatedChecklist.tasks[i].details = detailsData.translated || task.details;
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
      return checklist; // Return original checklist on error instead of null
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