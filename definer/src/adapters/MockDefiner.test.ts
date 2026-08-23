import { describe, it, expect } from 'vitest';
import { MockDefiner } from './MockDefiner';

describe('MockDefiner', () => {
  it('should return mocked definitions', async () => {
    const definer = new MockDefiner();
    const result = await definer.define('hello', 'en');
    
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('[Mock]');
    expect(result[0]).toContain('hello');
    expect(result[0]).toContain('en');
  });
});
