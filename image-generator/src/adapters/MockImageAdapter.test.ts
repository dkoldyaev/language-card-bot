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
    expect(result[0]).toContain('https://mockimage.tw/photo/640x480/282c34/61dafb/');
    expect(result[0]).toContain(encodeURIComponent('car part air filter'));
    expect(result[1]).toContain(encodeURIComponent('cat pet'));
  });

  it('handles empty keywords group by using fallback label', async () => {
    const adapter = new MockImageAdapter();
    const result = await adapter.generate([[]]);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('image');
  });
});
