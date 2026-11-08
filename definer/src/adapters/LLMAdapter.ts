import { z } from 'zod';
import { env } from '../core/env';
import type { DefinitionItem, IDefiner } from '../core/IDefiner';
import type { LanguageCode } from '../types/language';

export interface LLMAdapterOptions {
  provider?: 'mistral' | 'gemini' | 'mock';
  model?: string;
  llmServiceUrl?: string;
}

export class LLMAdapter implements IDefiner {
  private provider: 'mistral' | 'gemini' | 'mock';
  private model: string;
  private llmServiceUrl: string;

  constructor(options: LLMAdapterOptions = {}) {
    this.provider = options.provider !== undefined ? options.provider : env.LLM_PROVIDER;
    this.model = options.model !== undefined ? options.model : env.LLM_MODEL;
    this.llmServiceUrl = options.llmServiceUrl !== undefined ? options.llmServiceUrl : env.LLM_SERVICE_URL;
  }

  async define(text: string, language: LanguageCode): Promise<DefinitionItem[]> {
    const [result] = await this.defineBatch([text], language);
    return result || [];
  }

  async defineBatch(texts: string[], language: LanguageCode): Promise<DefinitionItem[][]> {
    if (texts.length === 0) {
      return [];
    }

    const itemsFormat = texts.map((t, idx) => `[${idx + 1}] "${t}"`).join('\n');
    const prompt = `Please provide a comprehensive and extensive list with the maximum possible number of distinct definitions and senses for each of the following words/phrases in the language "${language}".
Cover all proficiency levels from beginner (A1, A2) to intermediate (B1, B2) and advanced/mastery (C1, C2), ranging from simple, accessible explanations to nuanced, figurative, formal, and specialized meanings.

CRITICAL REQUIREMENTS:
1. For each word/phrase, return its definitions under its corresponding 1-based index or word text.
2. Under NO circumstances should the target word or phrase (including its inflections, plurals, or variations, case-insensitive) appear anywhere in the text of its definitions. Never provide circular definitions or the word itself; explain the meaning purely through description, context, and function.
3. For each definition sense, you must provide:
   - "text": The explanation of the meaning purely through description, context, and function.
   - "partOfSpeech": The part of speech for this sense (e.g. noun, verb, adjective, adverb, preposition, conjunction, idiom, etc.).
   - "tags": An array of relevant usage, domain, or stylistic tags (e.g. "formal", "informal", "slang", "technical", "archaic", "literary", "idiomatic", etc.). If no special tags apply, return an empty array.
   - "levels": An array of applicable CEFR proficiency levels (A1, A2, B1, B2, C1, C2) where this definition sense is typically learned or used. A definition may span multiple levels (e.g. ["A1", "A2"] or ["B1"]).

Words/phrases:
${itemsFormat}`;

    const definitionProperties = {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Definition text without containing the target word itself',
        },
        partOfSpeech: {
          type: 'string',
          description: 'Part of speech for this sense (e.g. noun, verb, adjective)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Usage or domain tags (e.g. formal, slang, technical)',
        },
        levels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Applicable CEFR proficiency levels (e.g. A1, A2, B1, B2, C1, C2)',
        },
      },
      required: ['text', 'partOfSpeech', 'tags', 'levels'],
    };

    const jsonFormat = {
      type: 'object',
      properties: {
        words: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: '1-based index corresponding to the input word/phrase',
              },
              word: {
                type: 'string',
                description: 'The target word/phrase',
              },
              definitions: {
                type: 'array',
                items: definitionProperties,
                description: 'Definitions for this word/phrase',
              },
            },
            required: ['index', 'definitions'],
          },
          description: 'List of words with their definitions in the exact order requested',
        },
      },
      required: ['words'],
    };

    const response = await fetch(this.llmServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider: this.provider,
        model: this.model,
        jsonFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM service error (${response.status}): ${errorText}`);
    }

    const responseSchema = z.object({
      data: z.object({
        words: z.array(
          z.object({
            index: z.number().optional(),
            word: z.string().optional(),
            definitions: z.array(z.unknown()).optional(),
          })
        ).optional(),
        definitions: z.array(z.unknown()).optional(),
      }).optional(),
    });

    const parsed = responseSchema.parse(await response.json());

    const mapDefinitionItem = (item: unknown): DefinitionItem | null => {
      const record = typeof item === 'object' && item !== null
        ? (item as Record<string, unknown>)
        : null;
      const textVal = typeof item === 'string'
        ? item
        : (record?.text ?? record?.definition ?? '');
      const partOfSpeechRaw = record?.partOfSpeech;
      const posVal = typeof partOfSpeechRaw === 'string' && partOfSpeechRaw.trim().length > 0
        ? partOfSpeechRaw.trim()
        : null;
      const tagsVal = Array.isArray(record?.tags)
        ? record.tags.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0)
        : [];
      const levelsVal = Array.isArray(record?.levels)
        ? record.levels.map((l: unknown) => String(l).trim().toUpperCase()).filter((l: string) => l.length > 0)
        : [];

      const cleanText = String(textVal).trim();
      if (!cleanText) return null;

      return {
        text: cleanText,
        partOfSpeech: posVal,
        tags: tagsVal,
        levels: levelsVal,
      };
    };

    // If single text fallback or schema matched definitions directly
    if (texts.length === 1 && parsed?.data?.definitions && !parsed?.data?.words) {
      const singleDefs = parsed.data.definitions
        .map(mapDefinitionItem)
        .filter((d): d is DefinitionItem => d !== null);
      return [singleDefs];
    }

    const wordsData = parsed?.data?.words;
    if (!Array.isArray(wordsData)) {
      throw new Error('Unexpected response format from LLM service: missing words array');
    }

    const results: DefinitionItem[][] = texts.map(() => []);

    for (const entry of wordsData) {
      const defs = Array.isArray(entry.definitions)
        ? entry.definitions.map(mapDefinitionItem).filter((d): d is DefinitionItem => d !== null)
        : [];

      let targetIdx = -1;
      if (typeof entry.index === 'number' && entry.index >= 1 && entry.index <= texts.length) {
        targetIdx = entry.index - 1;
      } else if (typeof entry.word === 'string') {
        const entryWord = entry.word.trim().toLowerCase();
        targetIdx = texts.findIndex((t) => t.trim().toLowerCase() === entryWord);
      }

      if (targetIdx >= 0 && targetIdx < results.length) {
        results[targetIdx] = defs;
      }
    }

    return results;
  }
}

