import { ITranslator } from '../core/ITranslator';

export class MockTranslator implements ITranslator {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const delay = Math.floor(Math.random() * 1000) + 500; // Random delay between 500ms and 1500ms
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simply return a mock string that shows it was "translated"
    return `[MOCK: ${sourceLang} -> ${targetLang}] ${text}`;
  }
}
