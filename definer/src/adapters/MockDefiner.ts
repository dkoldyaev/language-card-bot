import { IDefiner } from '../core/IDefiner';

export class MockDefiner implements IDefiner {
  async define(text: string, language: string): Promise<string[]> {
    return [
      `[Mock] Definition 1 for ${text} in ${language}`,
      `[Mock] Definition 2 for ${text} in ${language}`,
    ];
  }
}
