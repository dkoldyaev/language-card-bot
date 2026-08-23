import { describe, it, expect } from 'vitest';
import { MockTranslator } from './MockTranslator';

describe('MockTranslator', () => {
  it('should return a mocked translation string', async () => {
    const translator = new MockTranslator();
    const result = await translator.translate('Hello', 'en', 'ru');
    expect(result).toBe('[MOCK: en -> ru] Hello');
  });
});
