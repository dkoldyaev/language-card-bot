import { describe, it, expect } from 'vitest';
import { MockDefiner } from './MockDefiner';

describe('MockDefiner', () => {
  it('should return mocked definitions with tags, part of speech, and levels', async () => {
    const definer = new MockDefiner();
    const result = await definer.define('hello', 'en');
    
    expect(result).toHaveLength(2);
    expect(result[0].text).toContain('[Mock]');
    expect(result[0].text).toContain('hello');
    expect(result[0].text).toContain('en');
    expect(result[0].partOfSpeech).toBe('noun');
    expect(result[0].tags).toEqual(['general', 'common']);
    expect(result[0].levels).toEqual(['A1', 'A2']);

    expect(result[1].text).toContain('[Mock]');
    expect(result[1].partOfSpeech).toBe('verb');
    expect(result[1].tags).toEqual(['informal']);
    expect(result[1].levels).toEqual(['B1']);
  });
});
