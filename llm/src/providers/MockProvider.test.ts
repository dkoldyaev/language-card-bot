import { describe, it, expect } from 'vitest';
import { MockProvider } from './MockProvider';

describe('MockProvider', () => {
  it('should return mock definitions when jsonFormat mentions definitions', async () => {
    const provider = new MockProvider();
    const result = await provider.generate({
      prompt: 'hello',
      model: 'test-model',
      jsonFormat: 'definitions format',
    });

    expect(result).toHaveProperty('definitions');
    expect(Array.isArray(result.definitions)).toBe(true);
    expect(result.definitions.length).toBeGreaterThan(0);
  });

  it('should return mock words when jsonFormat mentions words', async () => {
    const provider = new MockProvider();
    const result = await provider.generate({
      prompt: 'give me 3 words in en',
      model: 'test-model',
      jsonFormat: 'words format',
    });

    expect(result).toHaveProperty('words');
    expect(Array.isArray(result.words)).toBe(true);
    expect(result.words.length).toBe(3);
  });

  it('should return filteredDefinitions when jsonFormat mentions filteredDefinitions', async () => {
    const provider = new MockProvider();
    const result = await provider.generate({
      prompt: 'filter definitions: ["def 1", "def 2"]',
      model: 'test-model',
      jsonFormat: 'filteredDefinitions format',
    });

    expect(result).toHaveProperty('filteredDefinitions');
    expect(Array.isArray(result.filteredDefinitions)).toBe(true);
    expect(result.filteredDefinitions).toEqual(['def 1', 'def 2']);
  });

  it('should mask target word with *** in filteredDefinitions', async () => {
    const provider = new MockProvider();
    const result = await provider.generate({
      prompt: 'Target word: "dog"\nDefinitions: ["hot dog is delicious", "A dog barking"]',
      model: 'test-model',
      jsonFormat: 'filteredDefinitions format',
    });

    expect(result).toHaveProperty('filteredDefinitions');
    expect(result.filteredDefinitions).toEqual(['hot *** is delicious', 'A *** barking']);
  });

  it('should return generic mock response when format does not mention definitions', async () => {
    const provider = new MockProvider();
    const result = await provider.generate({
      prompt: 'give me an answer',
      model: 'test-model',
      jsonFormat: 'generic format',
    });

    expect(result).toHaveProperty('mock', true);
    expect(result).toHaveProperty('model', 'test-model');
  });
});
