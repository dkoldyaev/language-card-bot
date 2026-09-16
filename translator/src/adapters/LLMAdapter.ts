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
    this.provider = options.provider || env.LLM_PROVIDER;
    this.model = options.model || env.LLM_MODEL;
    const url = options.llmServiceUrl || env.LLM_SERVICE_URL;
    if (!url) {
      throw new Error('LLM_SERVICE_URL is required for LLMAdapter');
    }
    this.llmServiceUrl = url;
  }

  async translate(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    const prompt = `Please translate the following array of texts from "${sourceLang}" into "${targetLang}". Return only the translations in the exact same order as the input array, without explanations.\n\nTexts:\n${JSON.stringify(texts, null, 2)}`;

    const jsonFormat = {
      type: 'object',
      properties: {
        translations: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'The translated texts in the target language in the exact same order',
        },
      },
      required: ['translations'],
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
        translations?: string[];
        translatedTexts?: string[];
      };
    };

    const result = data?.data?.translations ?? data?.data?.translatedTexts;

    if (!Array.isArray(result)) {
      throw new Error('Unexpected response format from LLM service: missing translations array');
    }

    return result.map((t) => String(t).trim());
  }
}

export { LLMAdapter as LLMTranslator };
