import { z } from 'zod';
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
    const [result] = await this.defineBatch([text], language);
    return result || [];
  }

  async defineBatch(texts: string[], language: LanguageCode): Promise<DefinitionItem[][]> {
    if (texts.length === 0) return [];

    try {
      // 1. Fetch raw FreeDictionary definitions in parallel for all texts
      const rawDefinitionsByWord = await Promise.all(
        texts.map(async (text) => {
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
            const defs: DefinitionItem[] = data.entries.flatMap(({ partOfSpeech, senses }) =>
              senses.map(({ definition: defText, tags }) => ({
                text: defText,
                partOfSpeech,
                tags,
                levels: [],
              }))
            );
            return defs;
          } catch (error) {
            console.error(`FreeDictionary API error for "${text}":`, error);
            return [];
          }
        })
      );

      // Collect all definitions that need translation (if non-English) and level tagging
      interface FlatDefRef {
        wordIdx: number;
        defIdx: number;
        text: string;
      }
      const flatDefs: FlatDefRef[] = [];
      rawDefinitionsByWord.forEach((defs, wordIdx) => {
        defs.forEach((d, defIdx) => {
          flatDefs.push({ wordIdx, defIdx, text: d.text });
        });
      });

      if (flatDefs.length === 0) {
        return texts.map(() => []);
      }

      // 2. FreeDictionary definitions are in English.
      // If language is not English, translate them in a single batch via Translator
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
            texts: flatDefs.map((d) => d.text),
            translatorApp: this.translatorAppType,
          }),
        });

        if (!transResponse.ok) {
          const errorText = await transResponse.text();
          throw new Error(`Failed to translate definitions via Translator service: ${transResponse.status} ${errorText}`);
        }

        const transResponseSchema = z.object({
          translations: z.array(z.string()).optional(),
        });
        const transData = transResponseSchema.parse(await transResponse.json());
        if (transData?.translations && Array.isArray(transData.translations)) {
          transData.translations.forEach((translatedText, i) => {
            const ref = flatDefs[i];
            if (ref && typeof translatedText === 'string') {
              rawDefinitionsByWord[ref.wordIdx][ref.defIdx].text = translatedText;
            }
          });
        }
      }

      // 3. Batch LLM call to determine CEFR levels and tags across all words
      const wordsPromptBlocks = texts
        .map((text, wordIdx) => {
          const defs = rawDefinitionsByWord[wordIdx];
          if (!defs || defs.length === 0) return null;
          const defLines = defs
            .map((d, dIdx) => `  ${dIdx + 1}. [${d.partOfSpeech || 'unknown'}] ${d.text}`)
            .join('\n');
          return `Word [${wordIdx + 1}] "${text}":\n${defLines}`;
        })
        .filter(Boolean)
        .join('\n\n');

      const prompt = `Given the words/phrases in language "${language}" and their respective definitions below, determine the applicable CEFR proficiency level(s) (A1, A2, B1, B2, C1, C2) and relevant tags for each definition.
A single definition can belong to one or more CEFR levels.

${wordsPromptBlocks}

For each word by 1-based index (wordIndex), provide definitionsByIndex array with 1-based index (definitionIndex), tags, and CEFR levels.`;

      const jsonFormat = {
        type: 'object',
        properties: {
          words: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                wordIndex: {
                  type: 'number',
                  description: '1-based index corresponding to the word',
                },
                definitionsByIndex: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      definitionIndex: {
                        type: 'number',
                        description: '1-based index corresponding to the definition of this word',
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
                    required: ['definitionIndex', 'levels'],
                  },
                },
              },
              required: ['wordIndex', 'definitionsByIndex'],
            },
          },
        },
        required: ['words'],
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

      const llmResponseSchema = z.object({
        data: z.object({
          words: z.array(
            z.object({
              wordIndex: z.number().optional(),
              definitionsByIndex: z.array(
                z.object({
                  definitionIndex: z.number().optional(),
                  levels: z.array(z.string()).optional(),
                  tags: z.array(z.string()).optional(),
                })
              ).optional(),
            })
          ).optional(),
          // Backwards compatibility for single-word response schema
          levelsByIndex: z.array(
            z.object({
              index: z.number().optional(),
              levels: z.array(z.string()).optional(),
              tags: z.array(z.string()).optional(),
            })
          ).optional(),
        }).optional(),
      });

      const llmData = llmResponseSchema.parse(await llmResponse.json());

      // Map levels & tags by `${wordIdx}:${defIdx}`
      const levelsMap = new Map<string, { levels: string[]; tags: string[] }>();

      if (Array.isArray(llmData?.data?.words)) {
        for (const wItem of llmData.data.words) {
          if (typeof wItem.wordIndex === 'number' && Array.isArray(wItem.definitionsByIndex)) {
            const wIdx = wItem.wordIndex - 1;
            for (const dItem of wItem.definitionsByIndex) {
              if (typeof dItem.definitionIndex === 'number') {
                const dIdx = dItem.definitionIndex - 1;
                levelsMap.set(`${wIdx}:${dIdx}`, {
                  levels: (dItem.levels || []).map((l: string) => String(l).trim().toUpperCase()).filter(Boolean),
                  tags: (dItem.tags || []).map((t: string) => String(t).trim().toLowerCase()).filter(Boolean),
                });
              }
            }
          }
        }
      } else if (Array.isArray(llmData?.data?.levelsByIndex) && texts.length === 1) {
        for (const item of llmData.data.levelsByIndex) {
          if (typeof item.index === 'number') {
            const dIdx = item.index - 1;
            levelsMap.set(`0:${dIdx}`, {
              levels: (item.levels || []).map((l: string) => String(l).trim().toUpperCase()).filter(Boolean),
              tags: (item.tags || []).map((t: string) => String(t).trim().toLowerCase()).filter(Boolean),
            });
          }
        }
      }

      return rawDefinitionsByWord.map((defs, wIdx) =>
        defs.map((d, dIdx): DefinitionItem => {
          const meta = levelsMap.get(`${wIdx}:${dIdx}`);
          return {
            text: d.text,
            partOfSpeech: d.partOfSpeech,
            tags: Array.from(new Set([...d.tags, ...(meta?.tags || [])])),
            levels: meta?.levels || [],
          };
        })
      );
    } catch (error) {
      console.error('FreeDictionary API error:', error);
      return texts.map(() => []);
    }
  }
}


