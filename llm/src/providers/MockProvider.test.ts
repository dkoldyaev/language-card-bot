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
