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
    const prompt = `Please provide a comprehensive and extensive list with the maximum possible number of distinct definitions and senses for the word or phrase "${text}" in the language "${language}".
For each definition sense, you must provide:
1. "text": The explanation of the meaning purely through description, context, and function.
2. "partOfSpeech": The part of speech for this sense (e.g. noun, verb, adjective, adverb, preposition, conjunction, idiom, etc.).
3. "tags": An array of relevant usage, domain, or stylistic tags (e.g. "formal", "informal", "slang", "technical", "archaic", "literary", "idiomatic", etc.). If no special tags apply, return an empty array.
4. "levels": An array of applicable CEFR proficiency levels (A1, A2, B1, B2, C1, C2) where this definition sense is typically learned or used. A definition may span multiple levels (e.g. ["A1", "A2"] or ["B1"]).
Cover all proficiency levels from beginner (A1, A2) to intermediate (B1, B2) and advanced/mastery (C1, C2), ranging from simple, accessible explanations to nuanced, figurative, formal, and specialized meanings.
CRITICAL REQUIREMENT: Under NO circumstances should the target word or phrase "${text}" (including its inflections, plurals, or variations, case-insensitive) appear anywhere in the text of the definitions. Never provide circular definitions or the word itself; explain the meaning purely through description, context, and function.`;

    const jsonFormat = {
      type: 'object',
      properties: {
        definitions: {
          type: 'array',
          items: {
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
          },
          description: 'Comprehensive list of definitions across all levels with tags, part of speech, and CEFR levels',
        },
      },
      required: ['definitions'],
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

    const data = (await response.json()) as { data?: { definitions?: unknown[] } };

    if (!data?.data || !Array.isArray(data.data.definitions)) {
      throw new Error('Unexpected response format from LLM service');
    }

    return data.data.definitions
      .map((item: unknown): DefinitionItem => {
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

        return {
          text: String(textVal).trim(),
          partOfSpeech: posVal,
          tags: tagsVal,
          levels: levelsVal,
        };
      })
      .filter((item) => item.text.length > 0);
  }
}

