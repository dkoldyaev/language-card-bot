import { env } from '../core/env';
import type { DefinitionItem, IDefiner } from '../core/IDefiner';
import type { LanguageCode } from '../types/language';

export class MockDefiner implements IDefiner {
  async define(text: string, language: LanguageCode): Promise<DefinitionItem[]> {
    let delay = Math.floor(Math.random() * 1300) + 200; // Random delay between 200ms and 1500ms
    if (env.MOCK_TIMEOUT !== undefined) {
      delay = parseInt(env.MOCK_TIMEOUT, 10);
      if (Number.isNaN(delay)) delay = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return [
      {
        text: `[Mock] Definition 1 for ${text} in ${language}`,
        tags: ['general', 'common'],
        partOfSpeech: 'noun',
        levels: ['A1', 'A2'],
      },
      {
        text: `[Mock] Definition 2 for ${text} in ${language}`,
        tags: ['informal'],
        partOfSpeech: 'verb',
        levels: ['B1'],
      },
    ];
  }
}
