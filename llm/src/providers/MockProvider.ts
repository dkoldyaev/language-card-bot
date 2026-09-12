import { ILLMProvider, GenerateOptions } from '../core/ILLMProvider';
import { env } from '../core/env';

export class MockProvider implements ILLMProvider {
  private timeout: number;

  constructor() {
    this.timeout = parseInt(env.MOCK_TIMEOUT || '0', 10);
  }

  async generate(options: GenerateOptions): Promise<any> {
    if (this.timeout > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.timeout));
    }

    const formatStr = typeof options.jsonFormat === 'string' 
      ? options.jsonFormat 
      : JSON.stringify(options.jsonFormat);

    // If schema specifies definitions, return definitions
    if (formatStr.includes('definitions')) {
      return {
        definitions: [
          `[Mock LLM: ${options.model}] Definition 1 for prompt`,
          `[Mock LLM: ${options.model}] Definition 2 for prompt`,
        ],
      };
    }

    // Generic mock response
    return {
      mock: true,
      model: options.model,
      prompt: options.prompt,
      message: 'Mock response matching format',
    };
  }
}
