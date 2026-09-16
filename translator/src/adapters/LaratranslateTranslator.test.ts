import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LaratranslateTranslator } from './LaratranslateTranslator';

const mockTranslate = vi.fn();

vi.mock('@translated/lara', () => {
  return {
    Credentials: vi.fn(),
    Translator: class {
      translate = mockTranslate;
    },
  };
});

vi.mock('../core/env', () => ({
  env: {
    LARA_ACCESS_KEY_ID: 'test-id',
    LARA_ACCESS_KEY_SECRET: 'test-secret',
  },
}));

describe('LaratranslateTranslator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should translate array of texts via lara translate', async () => {
    mockTranslate.mockResolvedValue({
      translation: ['Привет', 'Мир'],
    });

    const translator = new LaratranslateTranslator();
    const result = await translator.translate(['Hello', 'World'], 'en', 'ru');

    expect(result).toEqual(['Привет', 'Мир']);
    expect(mockTranslate).toHaveBeenCalledWith(['Hello', 'World'], 'en', 'ru');
  });

  it('should return empty array without calling lara when given empty array', async () => {
    const translator = new LaratranslateTranslator();
    const result = await translator.translate([], 'en', 'ru');

    expect(result).toEqual([]);
    expect(mockTranslate).not.toHaveBeenCalled();
  });
});
