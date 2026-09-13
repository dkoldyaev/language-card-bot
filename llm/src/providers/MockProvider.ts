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

    // If schema specifies filteredDefinitions, return filtered definitions
    if (formatStr.includes('filteredDefinitions')) {
      const match = options.prompt.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              filteredDefinitions: parsed,
            };
          }
        } catch {
          // fallback
        }
      }
      return {
        filteredDefinitions: [
          `[Mock LLM: ${options.model}] Definition 1`,
        ],
      };
    }

    // If schema specifies words, return words array
    if (formatStr.includes('words')) {
      const countMatch = options.prompt.match(/(\d+)\s+(?:unique\s+)?words/i);
      const count = countMatch ? Math.min(parseInt(countMatch[1], 10), 100) : 5;

      const excludedMatch = options.prompt.match(/exclude:[^.\n]+/i) || options.prompt.match(/not include any of the following words:\s*([^.\n]+)/i);
      const excluded = new Set<string>();
      if (excludedMatch) {
        excludedMatch[1].split(',').map(w => w.trim().toLowerCase()).forEach(w => excluded.add(w));
      }

      const defaultWords = [
        'apple', 'banana', 'orange', 'water', 'bread', 'house', 'tree', 'cat', 'dog', 'sun',
        'book', 'car', 'city', 'friend', 'school', 'table', 'chair', 'time', 'door', 'road',
        'light', 'music', 'family', 'child', 'hand', 'eye', 'world', 'room', 'mother', 'father'
      ];

      const words: string[] = [];
      let idx = 0;
      while (words.length < count && idx < 200) {
        const candidate = idx < defaultWords.length ? defaultWords[idx] : `word${idx + 1}`;
        if (!excluded.has(candidate)) {
          words.push(candidate);
        }
        idx++;
      }

      return { words };
    }

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
