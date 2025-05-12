import OpenAI from "openai";

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Translate text from one language to another using OpenAI
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
    // Prepare instruction based on source language
    const sourceInstruction = sourceLanguage 
      ? `Translate the following ${AVAILABLE_LANGUAGES[sourceLanguage]} text` 
      : `Translate the following text`;
    
    const targetInstruction = `into ${AVAILABLE_LANGUAGES[targetLanguage]}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a professional translator. ${sourceInstruction} ${targetInstruction}. Provide only the translated text without any explanations or additional information.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    return response.choices[0].message.content?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text on error
    return text;
  }
}

/**
 * Translate an entire checklist object from one language to another
 * 
 * @param checklist Checklist to translate
 * @param targetLanguage Target language code
 * @param sourceLanguage Source language code (optional)
 * @returns Translated checklist
 */
export async function translateChecklist(
  checklist: any,
  targetLanguage: LanguageCode,
  sourceLanguage?: LanguageCode
): Promise<any> {
  try {
    // Deep clone the checklist to avoid modifying the original
    const translatedChecklist = JSON.parse(JSON.stringify(checklist));
    
    // Translate the checklist name
    translatedChecklist.name = await translateText(
      checklist.name, 
      targetLanguage, 
      sourceLanguage
    );
    
    // Translate remarks if available
    if (checklist.remarks) {
      translatedChecklist.remarks = await translateText(
        checklist.remarks, 
        targetLanguage, 
        sourceLanguage
      );
    }
    
    // Translate each task
    if (checklist.tasks && Array.isArray(checklist.tasks)) {
      for (let i = 0; i < checklist.tasks.length; i++) {
        const task = checklist.tasks[i];
        
        // Translate task description
        translatedChecklist.tasks[i].description = await translateText(
          task.description, 
          targetLanguage, 
          sourceLanguage
        );
        
        // Translate task details if available
        if (task.details) {
          translatedChecklist.tasks[i].details = await translateText(
            task.details, 
            targetLanguage, 
            sourceLanguage
          );
        }
      }
    }
    
    // Add metadata to indicate the checklist has been translated
    translatedChecklist.translatedFrom = sourceLanguage || "auto";
    translatedChecklist.translatedTo = targetLanguage;
    translatedChecklist.isTranslation = true;
    
    return translatedChecklist;
  } catch (error) {
    console.error("Checklist translation error:", error);
    // Return the original checklist on error
    return checklist;
  }
}