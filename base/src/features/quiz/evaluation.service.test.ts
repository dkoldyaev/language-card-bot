import { describe, expect, it } from 'vitest';
import { evaluateSuggestion, levenshteinDistance } from './evaluation.service';

describe('Evaluation Service', () => {
  describe('levenshteinDistance', () => {
    it('should calculate distance correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
      expect(levenshteinDistance('apple', 'apple')).toBe(0);
      expect(levenshteinDistance('', 'apple')).toBe(5);
      expect(levenshteinDistance('banana', '')).toBe(6);
    });
  });

  describe('evaluateSuggestion', () => {
    it('should return SUCCESS for exact matches', () => {
      expect(evaluateSuggestion('Apple', 'apple')).toBe('SUCCESS');
      expect(evaluateSuggestion('  banana  ', 'banana')).toBe('SUCCESS');
    });

    it('should return CLOSE_MATCH for 1 typo in short words', () => {
      expect(evaluateSuggestion('aple', 'apple')).toBe('CLOSE_MATCH');
      expect(evaluateSuggestion('applz', 'apple')).toBe('CLOSE_MATCH');
    });

    it('should return INCORRECT for 2 typos in short words', () => {
      expect(evaluateSuggestion('apl', 'apple')).toBe('INCORRECT');
    });

    it('should return CLOSE_MATCH for up to 2 typos in long words', () => {
      expect(evaluateSuggestion('strawbery', 'strawberry')).toBe('CLOSE_MATCH'); // 1 typo
      expect(evaluateSuggestion('strawbary', 'strawberry')).toBe('CLOSE_MATCH'); // 2 typos
    });

    it('should return INCORRECT for 3 typos in long words', () => {
      expect(evaluateSuggestion('strabary', 'strawberry')).toBe('INCORRECT'); // 3 typos
    });
  });
});
