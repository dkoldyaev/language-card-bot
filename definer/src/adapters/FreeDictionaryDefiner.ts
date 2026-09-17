import { IDefiner } from '../core/IDefiner';
import { env } from '../core/env';

export interface FreeDictionaryDefinerOptions {
  translatorApiUrl?: string;
  translatorAppType?: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';
}

export class FreeDictionaryDefiner implements IDefiner {
  private translatorApiUrl: string;
  private translatorAppType: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';

  constructor(options?: FreeDictionaryDefinerOptions) {
    this.translatorApiUrl = options?.translatorApiUrl !== undefined ? options.translatorApiUrl : env.TRANSLATOR_API_URL;
    this.translatorAppType = options?.translatorAppType !== undefined ? options.translatorAppType : env.TRANSLATOR_APP_TYPE;
  }

  async define(text: string, language: string): Promise<string[]> {
    const entry = encodeURIComponent(text.trim().toLowerCase());
    const url = `https://freedictionaryapi.com/api/v1/entries/${language}/${entry}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch from FreeDictionary API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const definitions: string[] = [];

      if (data.entries && Array.isArray(data.entries)) {
        for (const dictEntry of data.entries) {
          if (dictEntry.senses && Array.isArray(dictEntry.senses)) {
            for (const sense of dictEntry.senses) {
              if (sense.definition) {
                definitions.push(sense.definition);
              }
            }
          }
        }
      }

      if (definitions.length === 0) {
        return [];
      }

      // FreeDictionary API definitions are provided in English.
      // If the requested language is not English, translate them in a batch using the Translator service.
      const normalizedLang = language.trim().toLowerCase();
      if (normalizedLang !== 'en' && !normalizedLang.startsWith('en-')) {
        const transResponse = await fetch(this.translatorApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceLanguage: 'en',
            targetLanguage: language,
            texts: definitions,
            translatorApp: this.translatorAppType,
          }),
        });

        if (!transResponse.ok) {
          const errorText = await transResponse.text();
          throw new Error(`Failed to translate definitions via Translator service: ${transResponse.status} ${errorText}`);
        }

        const transData = (await transResponse.json()) as { translations?: string[] };
        if (transData?.translations && Array.isArray(transData.translations)) {
          return transData.translations;
        }
      }

      return definitions;
    } catch (error) {
      console.error('FreeDictionary API error:', error);
      return [];
    }
  }
}

