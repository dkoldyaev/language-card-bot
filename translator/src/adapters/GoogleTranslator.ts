import { z } from 'zod';
import { env } from '../core/env';
import type { ITranslator } from '../core/ITranslator';
import type { LanguageCode } from '../types/language';

export class GoogleTranslator implements ITranslator {
  private apiKey: string;

  constructor() {
    this.apiKey = env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  async translate(texts: string[], sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Translate API error: ${response.status} ${errorData}`);
      }

      const responseSchema = z.object({
        data: z.object({
          translations: z.array(z.object({
            translatedText: z.string()
          }))
        })
      });
      const data = responseSchema.parse(await response.json());
      return data.data.translations.map((item) => item.translatedText);
    } catch (error) {
      console.error('Error translating with Google API:', error);
      throw error;
    }
  }
}
