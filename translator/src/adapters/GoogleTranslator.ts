import { ITranslator } from '../core/ITranslator';

import { env } from '../core/env';

export class GoogleTranslator implements ITranslator {
  private apiKey: string;

  constructor() {
    this.apiKey = env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Translate API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Error translating with Google API:', error);
      throw error;
    }
  }
}
