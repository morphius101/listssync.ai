// Translation types and constants - client-side translation is disabled
// Translation is controlled by the sender and happens server-side only

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
  flag?: string;
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

// Helper function to get language display name
export function getLanguageName(code: LanguageCode): string {
  const language = LANGUAGES.find(lang => lang.code === code);
  return language?.name || 'Unknown';
}