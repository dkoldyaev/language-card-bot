import { describe, it, expect } from 'vitest';
import { MockTranslator } from './MockTranslator';

describe('MockTranslator', () => {
  it('should return an array of mocked translation strings', async () => {
    const translator = new MockTranslator();
    const result = await translator.translate(['Hello', 'World'], 'en', 'ru');
    expect(result).toEqual([
      '[MOCK: en -> ru] Hello',
      '[MOCK: en -> ru] World',
    ]);
  });
});
