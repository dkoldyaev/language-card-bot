import { describe, expect, it } from 'vitest';
import { MockImageAdapter } from './MockImageAdapter';

describe('MockImageAdapter', () => {
  it('generates mock URLs with encoded keywords', async () => {
    const adapter = new MockImageAdapter();
    const result = await adapter.generate([
      ['car part', 'air', 'filter'],
      ['cat', 'pet'],
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe('https://mockimage.tw/photo/640x480/282c34/61dafb/car%20part%20air%20filter');
    expect(result[1]).toBe('https://mockimage.tw/photo/640x480/282c34/61dafb/cat%20pet');
  });

  it('returns empty string for empty keywords group without fallback', async () => {
    const adapter = new MockImageAdapter();
    const result = await adapter.generate([[]]);

    expect(result).toEqual(['']);
  });
});
