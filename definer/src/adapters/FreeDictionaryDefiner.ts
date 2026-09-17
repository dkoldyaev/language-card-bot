import { IDefiner, DefinitionItem } from '../core/IDefiner';
import { env } from '../core/env';

export interface FreeDictionaryDefinerOptions {
  translatorApiUrl?: string;
  translatorAppType?: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';
  llmServiceUrl?: string;
  llmProvider?: 'mistral' | 'gemini' | 'mock';
  llmModel?: string;
}

interface RawDefinition {
  text: string;
  partOfSpeech: string | null;
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

  async define(text: string, language: string): Promise<DefinitionItem[]> {
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
      const rawDefinitions: RawDefinition[] = [];

      if (data.entries && Array.isArray(data.entries)) {
        for (const dictEntry of data.entries) {
          const entryPartOfSpeech = typeof dictEntry.partOfSpeech === 'string' && dictEntry.partOfSpeech.trim().length > 0
            ? dictEntry.partOfSpeech.trim()
            : null;

          if (dictEntry.senses && Array.isArray(dictEntry.senses)) {
            for (const sense of dictEntry.senses) {
              const parseSense = (s: any) => {
                if (s?.definition && typeof s.definition === 'string' && s.definition.trim().length > 0) {
                  const tags = Array.isArray(s.tags)
                    ? s.tags.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0)
                    : [];
                  rawDefinitions.push({
                    text: s.definition.trim(),
                    partOfSpeech: entryPartOfSpeech,
                    tags,
                  });
                }
                if (s?.subsenses && Array.isArray(s.subsenses)) {
                  for (const subsense of s.subsenses) {
                    parseSense(subsense);
                  }
                }
              };
              parseSense(sense);
            }
          }
        }
      }

      if (rawDefinitions.length === 0) {
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
            texts: rawDefinitions.map((d) => d.text),
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
            if (rawDefinitions[idx] && typeof translatedText === 'string') {
              rawDefinitions[idx].text = translatedText;
            }
          });
        }
      }

      // Determine CEFR levels for the definitions by querying the LLM service
      const prompt = `Given the word or phrase "${text}" in language "${language}" and its definitions below, determine the applicable CEFR proficiency level(s) (A1, A2, B1, B2, C1, C2) for each definition.
A single definition can belong to one or more CEFR levels.

Definitions:
${rawDefinitions.map((d, index) => `${index + 1}. [${d.partOfSpeech || 'unknown'}] ${d.text}`).join('\n')}

For each definition, provide an array of CEFR levels by 1-based index.`;

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
          levelsByIndex?: Array<{ index?: number; levels?: string[] }>;
        };
      };

      const levelsMap = new Map<number, string[]>();
      if (Array.isArray(llmData?.data?.levelsByIndex)) {
        for (const item of llmData.data.levelsByIndex) {
          if (typeof item?.index === 'number' && Array.isArray(item?.levels)) {
            levelsMap.set(
              item.index,
              item.levels.map((l: any) => String(l).trim().toUpperCase()).filter(Boolean)
            );
          }
        }
      }

      return rawDefinitions.map((d, index): DefinitionItem => ({
        text: d.text,
        partOfSpeech: d.partOfSpeech,
        tags: d.tags,
        levels: levelsMap.get(index + 1) || [],
      }));
    } catch (error) {
      console.error('FreeDictionary API error:', error);
      return [];
    }
  }
}


