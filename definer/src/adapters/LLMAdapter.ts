import { IDefiner } from '../core/IDefiner';
import { env } from '../core/env';

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
    this.provider = options.provider || 'mistral';
    this.model = options.model || (this.provider === 'mistral' ? 'mistral-large-latest' : 'gemini-1.5-flash');
    this.llmServiceUrl = options.llmServiceUrl || env.LLM_SERVICE_URL;
  }

  async define(text: string, language: string): Promise<string[]> {
    const prompt = `Please provide a comprehensive and extensive list with the maximum possible number of distinct definitions and senses for the word or phrase "${text}" in the language "${language}".
Cover all CEFR proficiency levels from beginner (A0, A1, A2) to intermediate (B1, B2) and advanced/mastery (C1, C2 and above), ranging from simple, accessible explanations to nuanced, figurative, formal, and specialized meanings.
CRITICAL REQUIREMENT: Under NO circumstances should the target word or phrase "${text}" (including its inflections, plurals, or variations, case-insensitive) appear anywhere in the text of the definitions. Never provide circular definitions or the word itself; explain the meaning purely through description, context, and function. Only provide the definitions.`;

    const jsonFormat = {
      type: 'object',
      properties: {
        definitions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Comprehensive list of definitions across all levels from A0 to C2+ without containing the target word itself',
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

    const data = (await response.json()) as { data?: { definitions?: string[] } };

    if (!data?.data || !Array.isArray(data.data.definitions)) {
      throw new Error('Unexpected response format from LLM service');
    }

    return data.data.definitions
      .map((line: any) => String(line).trim())
      .filter((line: string) => line.length > 0);
  }
}
