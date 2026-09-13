import { ITranslator } from '../core/ITranslator';
import { env } from '../core/env';

export interface LLMAdapterOptions {
  provider?: 'mistral' | 'gemini' | 'mock';
  model?: string;
  llmServiceUrl?: string;
}

export class LLMAdapter implements ITranslator {
  private provider: 'mistral' | 'gemini' | 'mock';
  private model: string;
  private llmServiceUrl: string;

  constructor(options: LLMAdapterOptions = {}) {
    this.provider = options.provider || (process.env.TRANSLATOR_LLM_PROVIDER as any) || 'mistral';
    this.model = options.model || process.env.TRANSLATOR_LLM_MODEL || (this.provider === 'mistral' ? 'mistral-large-latest' : 'gemini-1.5-flash');
    this.llmServiceUrl = options.llmServiceUrl || env.LLM_SERVICE_URL || 'http://llm:3003/api/v1/generate';
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const prompt = `Please translate the following text from "${sourceLang}" into "${targetLang}". Return only the translation without explanations.\n\nText:\n"${text}"`;

    const jsonFormat = {
      type: 'object',
      properties: {
        translatedText: {
          type: 'string',
          description: 'The translated text in the target language',
        },
      },
      required: ['translatedText'],
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

    const data = (await response.json()) as {
      data?: {
        translatedText?: string;
        translation?: string;
      };
    };

    const result = data?.data?.translatedText ?? data?.data?.translation;

    if (typeof result !== 'string') {
      throw new Error('Unexpected response format from LLM service');
    }

    return result.trim();
  }
}

export { LLMAdapter as LLMTranslator };
