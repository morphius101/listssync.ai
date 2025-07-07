import { GoogleGenAI } from "@google/genai";

// Create Gemini client
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

// Available languages for translation
export const AVAILABLE_LANGUAGES = {
  en: "English",
  es: "Spanish", 
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Chinese",
  ru: "Russian",
  ja: "Japanese",
  ar: "Arabic",
  hi: "Hindi"
};

export type LanguageCode = keyof typeof AVAILABLE_LANGUAGES;

/**
 * Translate text from one language to another using Gemini
 * 
 * @param text Text to translate
 * @param targetLanguage Target language code
 * @param sourceLanguage Source language code (optional, will be auto-detected)
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLanguage: LanguageCode,
  sourceLanguage?: LanguageCode
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found, returning original text");
      return text;
    }

    // If target language is English and no source specified, return original
    if (targetLanguage === 'en' && !sourceLanguage) {
      return text;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const targetLangName = AVAILABLE_LANGUAGES[targetLanguage];
    const sourceLangName = sourceLanguage ? AVAILABLE_LANGUAGES[sourceLanguage] : "the source language";
    
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
    Only return the translated text, no additional commentary or explanation.
    
    Text to translate: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();

    console.log(`🌍 Gemini Translation: ${sourceLanguage || 'auto'} → ${targetLanguage}`);
    console.log(`📝 Original: ${text.substring(0, 50)}...`);
    console.log(`📝 Translated: ${translatedText.substring(0, 50)}...`);

    return translatedText || text;
  } catch (error) {
    console.error("❌ Gemini translation error:", error);
    return text; // Return original text if translation fails
  }
}

/**
 * Translate an entire checklist to a target language
 * 
 * @param checklist Checklist object to translate
 * @param targetLanguage Target language code
 * @returns Translated checklist
 */
export async function translateChecklist(
  checklist: any,
  targetLanguage: LanguageCode
): Promise<any> {
  try {
    console.log(`🔄 Starting checklist translation to ${targetLanguage}`);
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found, returning original checklist");
      return checklist;
    }

    // Don't translate if target is English
    if (targetLanguage === 'en') {
      return checklist;
    }

    const translatedChecklist = { ...checklist };
    
    // Translate title
    if (checklist.title) {
      translatedChecklist.title = await translateText(checklist.title, targetLanguage);
    }
    
    // Translate description
    if (checklist.description) {
      translatedChecklist.description = await translateText(checklist.description, targetLanguage);
    }
    
    // Translate tasks
    if (checklist.tasks && Array.isArray(checklist.tasks)) {
      translatedChecklist.tasks = await Promise.all(
        checklist.tasks.map(async (task: any) => {
          const translatedTask = { ...task };
          
          if (task.title) {
            translatedTask.title = await translateText(task.title, targetLanguage);
          }
          
          if (task.description) {
            translatedTask.description = await translateText(task.description, targetLanguage);
          }
          
          return translatedTask;
        })
      );
    }
    
    // Add translation metadata
    translatedChecklist.translatedTo = targetLanguage;
    translatedChecklist.translatedAt = new Date().toISOString();
    
    console.log(`✅ Checklist translation to ${targetLanguage} completed`);
    return translatedChecklist;
    
  } catch (error) {
    console.error("❌ Checklist translation error:", error);
    return checklist; // Return original on error
  }
}

/**
 * Get the name of a language from its code
 */
export function getLanguageName(code: LanguageCode): string {
  return AVAILABLE_LANGUAGES[code] || code;
}