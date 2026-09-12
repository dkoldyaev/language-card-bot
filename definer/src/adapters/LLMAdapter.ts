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
    const prompt = `Please provide a list of definitions for the word or phrase "${text}" in the language "${language}". Only provide the definitions.`;

    const jsonFormat = {
      type: 'object',
      properties: {
        definitions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of definitions for the word or phrase',
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
