import { env } from '../core/env';
import type { GenerateOptions, ILLMProvider } from '../core/ILLMProvider';

export class MockProvider implements ILLMProvider {
  private timeout: number;

  constructor() {
    this.timeout = parseInt(env.MOCK_TIMEOUT || '0', 10);
  }

  async generate(options: GenerateOptions): Promise<unknown> {
    if (this.timeout > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.timeout));
    }

    const formatStr = typeof options.jsonFormat === 'string' 
      ? options.jsonFormat 
      : JSON.stringify(options.jsonFormat);

    // If schema specifies keywords, return extracted keywords (MUST be English)
    if (formatStr.includes('keywords')) {
      const match = options.prompt.match(/"([^"]+)"/);
      const text = match ? match[1] : options.prompt;
      // Filter strictly English ASCII words
      const englishTokens = text
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 3 && /^[a-zA-Z0-9\s-]+$/.test(w))
        .slice(0, 3);
      return {
        keywords: englishTokens.length > 0 ? englishTokens : ['image', 'card'],
      };
    }

    // If schema specifies filteredDefinitions, return filtered definitions
    if (formatStr.includes('filteredDefinitions')) {
      const wordMatch = options.prompt.match(/Target word:\s*"([^"]+)"/i) || options.prompt.match(/word\s+"([^"]+)"/i);
      const targetWord = wordMatch ? wordMatch[1].trim() : '';

      const maskFn = (str: string) => {
        if (!targetWord) return str;
        const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'gui');
        return str.replace(regex, '***');
      };

      const match = options.prompt.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              filteredDefinitions: parsed.map((d: unknown) => maskFn(String(d))),
            };
          }
        } catch {
          // fallback
        }
      }
      return {
        filteredDefinitions: [
          maskFn(`[Mock LLM: ${options.model}] Definition 1`),
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
        excludedMatch[1].split(',').map(w => w.trim().toLowerCase()).forEach(w => {excluded.add(w)});
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

    // If schema specifies translations array, return translations array
    if (formatStr.includes('translations')) {
      const match = options.prompt.match(/Texts:\s*\n(\[[\s\S]*?\])/i) || options.prompt.match(/(\[[\s\S]*?\])/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            return {
              translations: parsed.map((t: unknown) => `[Mock LLM: ${options.model}] ${String(t)}`),
            };
          }
        } catch {
          // fallback
        }
      }
      return {
        translations: [`[Mock LLM: ${options.model}] Translation`],
      };
    }

    // If schema specifies translatedText or translation, return translated text
    if (formatStr.includes('translatedText') || formatStr.includes('translation')) {
      const match = options.prompt.match(/Text:\s*\n"([^"]+)"/) || options.prompt.match(/"([^"]+)"/);
      const text = match ? match[1] : 'text';
      return {
        translatedText: `[Mock LLM: ${options.model}] ${text}`,
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
