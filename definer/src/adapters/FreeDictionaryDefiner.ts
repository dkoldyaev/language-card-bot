import { env } from '../core/env';
import type { DefinitionItem, IDefiner } from '../core/IDefiner';
import type { LanguageCode } from '../types/language';

export interface FreeDictionaryDefinerOptions {
  translatorApiUrl?: string;
  translatorAppType?: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';
  llmServiceUrl?: string;
  llmProvider?: 'mistral' | 'gemini' | 'mock';
  llmModel?: string;
}

// interface RawDefinition {
//   text: string;
//   partOfSpeech: string | null;
//   tags: string[];
// }

export type FreeDictionaryResponse = {
  word: string;
  entries: FreeDictionaryEntry[];
}

export type FreeDictionaryEntry = {
  partOfSpeech: string;
  senses: FreeDictionarySense[];
}

export type FreeDictionarySense = {
  definition: string;
  subsenses: FreeDictionarySense[];
  tags: string[];
}

export class FreeDictionaryDefiner implements IDefiner {
  private translatorApiUrl: string;
  private translatorAppType: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';
  private llmServiceUrl: string;
  private llmProvider: 'mistral' | 'gemini' | 'mock';
  private llmModel: string;

  constructor(options?: FreeDictionaryDefinerOptions) {
    this.translatorApiUrl = options?.translatorApiUrl !== undefined ? options.translatorApiUrl : env.TRANSLATOR_API_URL;
    this.translatorAppType = options?.translatorAppType !== undefined ? options.translatorAppType : env.TRANSLATOR_APP_TYPE;
    this.llmServiceUrl = options?.llmServiceUrl !== undefined ? options.llmServiceUrl : env.LLM_SERVICE_URL;
    this.llmProvider = options?.llmProvider !== undefined ? options.llmProvider : env.LLM_PROVIDER;
    this.llmModel = options?.llmModel !== undefined ? options.llmModel : env.LLM_MODEL;
  }

  async define(text: string, language: LanguageCode): Promise<DefinitionItem[]> {
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

      const data: FreeDictionaryResponse = await response.json();
      const definitions: DefinitionItem[] = data.entries.flatMap(({partOfSpeech, senses}) => senses.map(({definition: text, tags}) => ({
        text,
        partOfSpeech,
        tags,
        levels: [],
      })));

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
            texts: definitions.map((d) => d.text),
            translatorApp: this.translatorAppType,
          }),
        });

        if (!transResponse.ok) {
          const errorText = await transResponse.text();
          throw new Error(`Failed to translate definitions via Translator service: ${transResponse.status} ${errorText}`);
        }

        const transData = (await transResponse.json()) as { translations?: string[] };
        if (transData?.translations && Array.isArray(transData.translations)) {
          transData.translations.forEach((translatedText, idx) => {
            if (definitions[idx] && typeof translatedText === 'string') {
              definitions[idx].text = translatedText;
            }
          });
        }
      }

      // Determine CEFR levels for the definitions by querying the LLM service
      const prompt = `Given the word or phrase "${text}" in language "${language}" and its definitions below, determine the applicable CEFR proficiency level(s) (A1, A2, B1, B2, C1, C2) for each definition.
A single definition can belong to one or more CEFR levels.

Definitions:
${definitions.map((d, index) => `${index + 1}. [${d.partOfSpeech || 'unknown'}] ${d.text}`).join('\n')}

For each definition, provide an array of CEFR levels by 1-based index.
For each definition, provide a list of tags for this definition.`;

      const jsonFormat = {
        type: 'object',
        properties: {
          levelsByIndex: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: {
                  type: 'number',
                  description: '1-based index corresponding to the definition in the list',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for this definition',
                },
                levels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Applicable CEFR proficiency levels, e.g. ["A1", "A2"] or ["B1"]',
                },
              },
              required: ['index', 'levels'],
            },
            description: 'CEFR levels for each definition by 1-based index',
          },
        },
        required: ['levelsByIndex'],
      };

      const llmResponse = await fetch(this.llmServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          provider: this.llmProvider,
          model: this.llmModel,
          jsonFormat,
        }),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        throw new Error(`Failed to determine definition levels via LLM service: ${llmResponse.status} ${errorText}`);
      }

      const llmData = (await llmResponse.json()) as {
        data?: {
          levelsByIndex?: Array<{ index?: number; levels?: string[], tags?: string[] }>;
        };
      };

      const levelsMap = new Map<number, {levels:string[], tags: string[]}>();
      if (Array.isArray(llmData?.data?.levelsByIndex)) {
        for (const item of llmData.data.levelsByIndex) {
          if (typeof item?.index === 'number' && Array.isArray(item?.levels)) {
            levelsMap.set(
              item.index,
              {
                levels: item.levels.map((l: string) => String(l).trim().toUpperCase()).filter(Boolean),
                tags: item.tags?.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) || [],
              }
            );
          }
        }
      }

      return definitions.map((d, index): DefinitionItem => ({
        text: d.text,
        partOfSpeech: d.partOfSpeech,
        tags: Array.from(new Set([...d.tags, ...(levelsMap.get(index + 1)?.tags || [])])),
        levels: levelsMap.get(index + 1)?.levels || [],
      }));
    } catch (error) {
      console.error('FreeDictionary API error:', error);
      return [];
    }
  }
}


