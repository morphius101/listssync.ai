import { GoogleGenAI } from "@google/genai";

// Create Gemini client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

    const targetLangName = AVAILABLE_LANGUAGES[targetLanguage];
    const sourceLangName = sourceLanguage ? AVAILABLE_LANGUAGES[sourceLanguage] : "the source language";
    
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
    Only return the translated text, no additional commentary or explanation.
    
    Text to translate: "${text}"`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const translatedText = result.text || text;

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
 * Translate an entire checklist in one model call so translation is atomic.
 * Either the full checklist comes back translated, or we return the original.
 */
export async function translateChecklist(
  checklist: any,
  targetLanguage: LanguageCode,
  _sourceLanguage?: LanguageCode
): Promise<any> {
  try {
    console.log(`🔄 Starting checklist translation to ${targetLanguage}`);

    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found, returning original checklist");
      return checklist;
    }

    if (targetLanguage === 'en') {
      return checklist;
    }

    const targetLangName = AVAILABLE_LANGUAGES[targetLanguage];
    const prompt = `Translate this checklist JSON into ${targetLangName}.

Rules:
- Preserve the exact JSON structure and all keys.
- Translate only human-readable text fields such as name, remarks, task descriptions, and task details.
- Do not translate IDs, status enums, booleans, URLs, timestamps, or numeric fields.
- Return valid JSON only. No markdown, no explanation.

Checklist JSON:
${JSON.stringify(checklist)}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const translatedText = result.text?.trim();
    if (!translatedText) {
      console.warn("⚠️ Gemini returned empty checklist translation; using original checklist");
      return checklist;
    }

    const parsed = JSON.parse(translatedText);
    parsed.translatedTo = targetLanguage;
    parsed.translatedAt = checklist?.updatedAt || checklist?.translatedAt || new Date().toISOString();

    console.log(`✅ Checklist translation to ${targetLanguage} completed`);
    return parsed;
  } catch (error) {
    console.error("❌ Checklist translation error:", error);
    return checklist;
  }
}

/**
 * Get the name of a language from its code
 */
export function getLanguageName(code: LanguageCode): string {
  return AVAILABLE_LANGUAGES[code] || code;
}
