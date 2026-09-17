import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  generatePreset,
  fetchWordsFromLLM,
  fetchDefinitionsFromDefiner,
  fetchTranslationsFromTranslator,
  filterDefinitionsWithLLM,
  filterDefinitionsBatchWithLLM,
} from './preset_generator.service';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Mock global fetch
const originalFetch = global.fetch;

describe('Preset Generator Service', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetchWordsFromLLM', () => {
    it('should call LLM endpoint and return lowercase words', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            words: ['Apple', ' Banana ', 'ORANGE'],
          },
        }),
      } as any);

      const words = await fetchWordsFromLLM({
        language: 'en',
        level: 'A1',
        count: 3,
      });

      expect(words).toEqual(['apple', 'banana', 'orange']);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('A1'),
        })
      );
    });

    it('should handle LLM API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as any);

      await expect(
        fetchWordsFromLLM({
          language: 'en',
          count: 5,
        })
      ).rejects.toThrow('LLM API error (500)');
    });
  });

  describe('fetchDefinitionsFromDefiner', () => {
    it('should call definer endpoint and return definitions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          definitions: ['A sweet red or green fruit', 'A technology company'],
        }),
      } as any);

      const defs = await fetchDefinitionsFromDefiner('apple', 'en');
      expect(defs).toEqual(['A sweet red or green fruit', 'A technology company']);
    });
  });

  describe('fetchTranslationsFromTranslator', () => {
    it('should call translator endpoint and return translations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: ['Красное яблоко', 'Зеленое яблоко'],
        }),
      } as any);

      const translations = await fetchTranslationsFromTranslator({
        texts: ['Red apple', 'Green apple'],
        sourceLanguage: 'en',
        targetLanguage: 'ru',
      });

      expect(translations).toEqual(['Красное яблоко', 'Зеленое яблоко']);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceLanguage: 'en',
            targetLanguage: 'ru',
            texts: ['Red apple', 'Green apple'],
            translatorApp: 'mock',
          }),
        })
      );
    });

    it('should return empty array when texts is empty without calling fetch', async () => {
      global.fetch = vi.fn();
      const translations = await fetchTranslationsFromTranslator({
        texts: [],
        sourceLanguage: 'en',
        targetLanguage: 'ru',
      });
      expect(translations).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle translator API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Translator failed',
      } as any);

      await expect(
        fetchTranslationsFromTranslator({
          texts: ['Hello'],
          sourceLanguage: 'en',
          targetLanguage: 'ru',
        })
      ).rejects.toThrow('Translator API error (500): Translator failed');
    });

    it('should throw if translations count does not match texts count', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          translations: ['Only one'],
        }),
      } as any);

      await expect(
        fetchTranslationsFromTranslator({
          texts: ['One', 'Two'],
          sourceLanguage: 'en',
          targetLanguage: 'ru',
        })
      ).rejects.toThrow('Translator API returned mismatched translations count: expected 2, got 1');
    });
  });

  describe('filterDefinitionsWithLLM', () => {
    it('should call LLM to filter definitions strictly by CEFR level and mask target word', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            filteredDefinitions: ['A hot *** is a sausage in a bun'],
          },
        }),
      } as any);

      const filtered = await filterDefinitionsWithLLM({
        language: 'en',
        word: 'dog',
        definitions: ['A hot dog is a sausage in a bun', 'A highly sophisticated canine mammal of high complexity'],
        level: 'B2',
      });

      expect(filtered).toEqual(['A hot *** is a sausage in a bun']);
      const calledBody = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as any).body);
      expect(calledBody.prompt).toContain('strictly "B2"');
      expect(calledBody.prompt).toContain('Mask the target word');
    });


    it('should return empty array if no definitions provided', async () => {
      const filtered = await filterDefinitionsWithLLM({
        language: 'en',
        word: 'apple',
        definitions: [],
        level: 'A1',
      });

      expect(filtered).toEqual([]);
    });
  });

  describe('filterDefinitionsBatchWithLLM', () => {
    it('should call LLM to batch filter definitions for multiple words and mask target words', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            results: [
              { word: 'dog', filteredDefinitions: ['A hot *** is a sausage in a bun'] },
              { word: 'apple', filteredDefinitions: ['A red edible fruit'] },
            ],
          },
        }),
      } as any);

      const results = await filterDefinitionsBatchWithLLM({
        language: 'en',
        level: 'B2',
        items: [
          { word: 'dog', definitions: ['A hot dog is a sausage in a bun'] },
          { word: 'apple', definitions: ['A red edible fruit', 'A tech company'] },
        ],
      });

      expect(results).toEqual([
        { word: 'dog', filteredDefinitions: ['A hot *** is a sausage in a bun'] },
        { word: 'apple', filteredDefinitions: ['A red edible fruit'] },
      ]);
      const calledBody = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as any).body);
      expect(calledBody.prompt).toContain('strictly "B2"');
      expect(calledBody.prompt).toContain('Mask the target word');
      expect(calledBody.prompt).toContain('Fix tautological or word-as-definition entries');
    });

    it('should filter out definitions that consist solely of asterisks or trivial placeholders', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            results: [
              { word: 'cat', filteredDefinitions: ['***', 'A ***', 'A small furry animal that meows'] },
            ],
          },
        }),
      } as any);

      const results = await filterDefinitionsBatchWithLLM({
        language: 'en',
        level: 'A0',
        items: [{ word: 'cat', definitions: ['cat'] }],
      });

      expect(results).toEqual([
        { word: 'cat', filteredDefinitions: ['A small furry animal that meows'] },
      ]);
    });

    it('should return empty array if no valid items provided', async () => {
      const results = await filterDefinitionsBatchWithLLM({
        language: 'en',
        items: [{ word: 'apple', definitions: [] }],
      });

      expect(results).toEqual([]);
    });
  });

  describe('fetchWordsFromLLM with theme', () => {
    it('should include theme in prompt when theme is provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            words: ['hotel', 'flight'],
          },
        }),
      } as any);

      const words = await fetchWordsFromLLM({
        language: 'en',
        level: 'B2',
        theme: 'travel',
        count: 2,
      });

      expect(words).toEqual(['hotel', 'flight']);
      const calledBody = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as any).body);
      expect(calledBody.prompt).toContain('related to the theme/topic "travel"');
      expect(calledBody.prompt).toContain('strictly for CEFR proficiency level "B2"');
    });
  });

  describe('generatePreset', () => {
    it('should generate a new preset with wordsCount words and save it in DB', async () => {
      // Step 1: LLM returns 2 words ('water', 'apple')
      // Step 2 & 3: Definer & LLM filter definitions
      // Step 4: Translator translates definitions
      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        // Translator call
        if (body.texts && Array.isArray(body.texts)) {
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        // LLM words generation
        if (body.prompt && body.prompt.includes('unique words')) {
          return {
            ok: true,
            json: async () => ({
              data: { words: ['water', 'apple'] },
            }),
          };
        }

        // Definer
        if (body.definerApp) {
          if (body.text === 'water') {
            return {
              ok: true,
              json: async () => ({ definitions: ['A clear liquid essential for life'] }),
            };
          }
          if (body.text === 'apple') {
            return {
              ok: true,
              json: async () => ({ definitions: ['A round edible fruit'] }),
            };
          }
        }

        // LLM filter
        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [
                  { word: 'water', filteredDefinitions: ['Filtered definition'] },
                  { word: 'apple', filteredDefinitions: ['Filtered definition'] },
                ],
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({ data: {} }),
        };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 10,
        title: 'Preset EN (A1) - 2 words',
        description: 'Test Description',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'water',
            definitions: [{ text: 'Filtered definition', translations: { ru: '[ru] Filtered definition' } }],
          },
          {
            word: 'apple',
            definitions: [{ text: 'Filtered definition', translations: { ru: '[ru] Filtered definition' } }],
          },
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      } as any);

      const result = await generatePreset({
        language: 'en',
        level: 'A1' as any,
        levels: ['A1'],
        wordsCount: 2,
        description: 'Test Description',
      });

      expect(result.id).toBe(10);
      expect(result.forLanguage).toBe('en');
      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          forLanguage: 'en',
          type: 'word-definition',
          description: 'Test Description',
          body: [
            {
              word: 'water',
              definitions: [
                {
                  text: 'Filtered definition',
                  translations: expect.objectContaining({
                    ru: '[ru] Filtered definition',
                    es: '[es] Filtered definition',
                  }),
                },
              ],
            },
            {
              word: 'apple',
              definitions: [
                {
                  text: 'Filtered definition',
                  translations: expect.objectContaining({
                    ru: '[ru] Filtered definition',
                    es: '[es] Filtered definition',
                  }),
                },
              ],
            },
          ],
        }),
      });
    });

    it('should discard word if no definitions remain after filtering and repeat loop until wordsCount reached', async () => {
      let batchCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        // Translator
        if (body.texts && Array.isArray(body.texts)) {
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        // LLM words: first batch returns 'difficult_word', second batch returns 'simple_word'
        if (body.prompt && body.prompt.includes('unique words')) {
          batchCount++;
          if (batchCount === 1) {
            return {
              ok: true,
              json: async () => ({ data: { words: ['difficult_word'] } }),
            };
          }
          return {
            ok: true,
            json: async () => ({ data: { words: ['simple_word'] } }),
          };
        }

        // Definer
        if (body.definerApp) {
          return {
            ok: true,
            json: async () => ({ definitions: ['Some definition'] }),
          };
        }

        // LLM filter: difficult_word has no definitions <= A1, simple_word has 1
        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          if (body.prompt.includes('difficult_word')) {
            return {
              ok: true,
              json: async () => ({
                data: {
                  results: [{ word: 'difficult_word', filteredDefinitions: [] }],
                },
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [{ word: 'simple_word', filteredDefinitions: ['Simple definition'] }],
              },
            }),
          };
        }

        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 11,
        title: 'Preset EN',
        description: null,
        forLanguage: 'en',
        type: 'word-definition',
        body: [{ word: 'simple_word', definitions: [{ text: 'Simple definition', translations: {} }] }],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await generatePreset({
        language: 'en',
        levels: ['A1'],
        wordsCount: 1,
      });

      expect(batchCount).toBe(2);
      expect(result.id).toBe(11);
      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: [
            {
              word: 'simple_word',
              definitions: [
                {
                  text: 'Simple definition',
                  translations: expect.any(Object),
                },
              ],
            },
          ],
        }),
      });
    });

    it('should update existing preset when preset-id is provided, discarding words with no new definitions', async () => {
      // Existing preset has 'apple' with ['definition 1']
      prismaMock.preset.findUnique.mockResolvedValue({
        id: 5,
        title: 'Existing Preset',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          { word: 'apple', definitions: ['definition 1'] },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      let llmCall = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        // Translator
        if (body.texts && Array.isArray(body.texts)) {
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        if (body.prompt && body.prompt.includes('unique words')) {
          llmCall++;
          if (llmCall === 1) {
            return { ok: true, json: async () => ({ data: { words: ['apple', 'banana'] } }) };
          }
          return { ok: true, json: async () => ({ data: { words: ['orange'] } }) };
        }

        if (body.definerApp) {
          if (body.text === 'apple') {
            return { ok: true, json: async () => ({ definitions: ['definition 1'] }) };
          }
          if (body.text === 'banana') {
            return { ok: true, json: async () => ({ definitions: ['yellow fruit'] }) };
          }
          if (body.text === 'orange') {
            return { ok: true, json: async () => ({ definitions: ['orange fruit'] }) };
          }
        }

        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          const results: any[] = [];
          if (body.prompt.includes('banana')) {
            results.push({ word: 'banana', filteredDefinitions: ['yellow fruit'] });
          }
          if (body.prompt.includes('orange')) {
            results.push({ word: 'orange', filteredDefinitions: ['orange fruit'] });
          }
          if (body.prompt.includes('apple')) {
            results.push({ word: 'apple', filteredDefinitions: ['definition 1'] });
          }
          return {
            ok: true,
            json: async () => ({
              data: { results },
            }),
          };
        }

        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.update.mockResolvedValue({
        id: 5,
        title: 'Existing Preset',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'apple',
            definitions: [{ text: 'definition 1', translations: { ru: '[ru] definition 1' } }],
          },
          {
            word: 'banana',
            definitions: [{ text: 'yellow fruit', translations: { ru: '[ru] yellow fruit' } }],
          },
          {
            word: 'orange',
            definitions: [{ text: 'orange fruit', translations: { ru: '[ru] orange fruit' } }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await generatePreset({
        language: 'en',
        presetId: 5,
        wordsCount: 2,
        levels: ['A1'],
      });

      expect(prismaMock.preset.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          body: [
            {
              word: 'apple',
              definitions: [
                {
                  text: 'definition 1',
                  translations: expect.objectContaining({
                    ru: '[ru] definition 1',
                  }),
                },
              ],
            },
            {
              word: 'banana',
              definitions: [
                {
                  text: 'yellow fruit',
                  translations: expect.objectContaining({
                    ru: '[ru] yellow fruit',
                  }),
                },
              ],
            },
            {
              word: 'orange',
              definitions: [
                {
                  text: 'orange fruit',
                  translations: expect.objectContaining({
                    ru: '[ru] orange fruit',
                  }),
                },
              ],
            },
          ],
        },
      });
      expect(result.id).toBe(5);
    });

    it('should throw error if presetId does not exist', async () => {
      prismaMock.preset.findUnique.mockResolvedValue(null);

      await expect(
        generatePreset({
          language: 'en',
          presetId: 999,
        })
      ).rejects.toThrow('Preset with ID 999 not found');
    });

    it('should generate a preset with theme in title and description', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        // Translator
        if (body.texts && Array.isArray(body.texts)) {
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        if (body.prompt && body.prompt.includes('unique words')) {
          return { ok: true, json: async () => ({ data: { words: ['pizza'] } }) };
        }
        if (body.definerApp) {
          return { ok: true, json: async () => ({ definitions: ['A pizza is delicious Italian dish'] }) };
        }
        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [{ word: 'pizza', filteredDefinitions: ['A *** is delicious Italian dish'] }],
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 20,
        title: 'Preset EN - food (B2) - 1 words',
        description: 'Theme: food',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'pizza',
            definitions: [{ text: 'A *** is delicious Italian dish', translations: {} }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await generatePreset({
        language: 'en',
        level: 'B2' as any,
        levels: ['B2'],
        theme: 'food',
        wordsCount: 1,
      });

      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Preset EN - food (B2) - 1 words',
          description: 'Theme: food',
          forLanguage: 'en',
          body: [
            {
              word: 'pizza',
              definitions: [
                {
                  text: 'A *** is delicious Italian dish',
                  translations: expect.any(Object),
                },
              ],
            },
          ],
        }),
      });
      expect(result.id).toBe(20);
    });

    it('should exclude words provided in options.excludedWords and not include them in the preset', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        // Translator
        if (body.texts && Array.isArray(body.texts)) {
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        if (body.prompt && body.prompt.includes('unique words')) {
          expect(body.prompt).toContain('water');
          return {
            ok: true,
            json: async () => ({
              data: { words: ['water', 'bread'] },
            }),
          };
        }

        if (body.definerApp) {
          if (body.text === 'bread') {
            return {
              ok: true,
              json: async () => ({ definitions: ['A food made of flour and water baked'] }),
            };
          }
          if (body.text === 'water') {
            return {
              ok: true,
              json: async () => ({ definitions: ['Clear liquid'] }),
            };
          }
        }

        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [
                  { word: 'bread', filteredDefinitions: ['A food made of flour and *** baked'] },
                ],
              },
            }),
          };
        }

        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 25,
        title: 'Preset EN (A1) - 1 words',
        description: null,
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'bread',
            definitions: [{ text: 'A food made of flour and *** baked', translations: {} }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await generatePreset({
        language: 'en',
        levels: ['A1'],
        wordsCount: 1,
        excludedWords: ['water'],
      });

      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: [
            {
              word: 'bread',
              definitions: [
                {
                  text: 'A food made of flour and *** baked',
                  translations: expect.any(Object),
                },
              ],
            },
          ],
        }),
      });
      expect(result.body).toEqual([
        {
          word: 'bread',
          definitions: [{ text: 'A food made of flour and *** baked', translations: {} }],
        },
      ]);
    });

    it('should translate definitions into only specified translationLanguages when provided', async () => {
      const translatedTargetLangs: string[] = [];

      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        if (body.texts && Array.isArray(body.texts)) {
          translatedTargetLangs.push(body.targetLanguage);
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        if (body.prompt && body.prompt.includes('unique words')) {
          return { ok: true, json: async () => ({ data: { words: ['cat'] } }) };
        }
        if (body.definerApp) {
          return { ok: true, json: async () => ({ definitions: ['A small domesticated carnivorous mammal'] }) };
        }
        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [{ word: 'cat', filteredDefinitions: ['A small domesticated carnivorous mammal'] }],
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 30,
        title: 'Preset EN (A1) - 1 words',
        forLanguage: 'en',
        type: 'word-definition',
        body: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await generatePreset({
        language: 'en',
        levels: ['A1'],
        wordsCount: 1,
        translationLanguages: ['ru', 'es'],
      });

      // Target languages translated should be exactly 'ru' and 'es'
      expect(translatedTargetLangs.sort()).toEqual(['es', 'ru']);

      // Check create call
      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          body: [
            {
              word: 'cat',
              definitions: [
                {
                  text: 'A small domesticated carnivorous mammal',
                  translations: {
                    es: '[es] A small domesticated carnivorous mammal',
                    ru: '[ru] A small domesticated carnivorous mammal',
                  },
                },
              ],
            },
          ],
        }),
      });
    });

    it('should translate definitions into all available languages except source language when translationLanguages is omitted', async () => {
      const translatedTargetLangs: string[] = [];

      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        const body = JSON.parse(init.body);

        if (body.texts && Array.isArray(body.texts)) {
          translatedTargetLangs.push(body.targetLanguage);
          return {
            ok: true,
            json: async () => ({
              translations: body.texts.map((t: string) => `[${body.targetLanguage}] ${t}`),
            }),
          };
        }

        if (body.prompt && body.prompt.includes('unique words')) {
          return { ok: true, json: async () => ({ data: { words: ['cat'] } }) };
        }
        if (body.definerApp) {
          return { ok: true, json: async () => ({ definitions: ['A small domesticated mammal'] }) };
        }
        if (body.prompt && body.prompt.includes('evaluate the following definitions')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                results: [{ word: 'cat', filteredDefinitions: ['A small domesticated mammal'] }],
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ data: {} }) };
      });

      prismaMock.preset.create.mockResolvedValue({
        id: 31,
        title: 'Preset EN (A1) - 1 words',
        forLanguage: 'en',
        type: 'word-definition',
        body: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await generatePreset({
        language: 'en',
        levels: ['A1'],
        wordsCount: 1,
      });

      // All AVAILABLE_LANGUAGES except 'en': es, fr, de, ru, it, pt, zh, ja, tr
      expect(translatedTargetLangs.sort()).toEqual(
        ['de', 'es', 'fr', 'it', 'ja', 'pt', 'ru', 'tr', 'zh'].sort()
      );
      expect(translatedTargetLangs).not.toContain('en');
    });
  });
});
