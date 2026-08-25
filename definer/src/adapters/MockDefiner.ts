import { IDefiner } from '../core/IDefiner';

export class MockDefiner implements IDefiner {
  async define(text: string, language: string): Promise<string[]> {
    let delay = Math.floor(Math.random() * 1300) + 200; // Random delay between 200ms and 1500ms
    if (process.env.MOCK_TIMEOUT !== undefined) {
      delay = parseInt(process.env.MOCK_TIMEOUT, 10);
      if (isNaN(delay)) delay = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return [
      `[Mock] Definition 1 for ${text} in ${language}`,
      `[Mock] Definition 2 for ${text} in ${language}`,
    ];
  }
}
