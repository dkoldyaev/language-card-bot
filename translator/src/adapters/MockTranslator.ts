import { ITranslator } from '../core/ITranslator';

export class MockTranslator implements ITranslator {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    let delay = Math.floor(Math.random() * 1300) + 200; // Random delay between 200ms and 1500ms
    if (process.env.MOCK_TIMEOUT !== undefined) {
      delay = parseInt(process.env.MOCK_TIMEOUT, 10);
      if (isNaN(delay)) delay = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Simply return a mock string that shows it was "translated"
    return `[MOCK: ${sourceLang} -> ${targetLang}] ${text}`;
  }
}
