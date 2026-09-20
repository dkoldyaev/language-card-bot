import { env } from '../core/env';
import type { ITranslator } from '../core/ITranslator';
import type { LanguageCode } from '../types/language';

export class MockTranslator implements ITranslator {
  async translate(texts: string[], sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string[]> {
    let delay = Math.floor(Math.random() * 1300) + 200; // Random delay between 200ms and 1500ms
    if (env.MOCK_TIMEOUT !== undefined) {
      delay = parseInt(env.MOCK_TIMEOUT, 10);
      if (Number.isNaN(delay)) delay = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));

    return texts.map((text) => `[MOCK: ${sourceLang} -> ${targetLang}] ${text}`);
  }
}
