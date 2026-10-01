import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../prisma';
import {
  attachExistingImagesToDefinition,
  attachImagesToDefinition,
  extractKeywordsFromDefinition,
  fetchImagesFromGenerator,
  normalizeKeywordsText,
  processDefinitionImage,
  getImagesForDefinitionText,
  composeImageSearchKeywords,
  isEnglishWord,
  ensureEnglishKeywords,
  sanitizeKeywords,
} from './image.service';

describe('Image Feature Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('sanitizeKeywords', () => {
    it('cleans and limits keywords to 2-3 tokens', () => {
      const result = sanitizeKeywords(['Car', 'Air ', 'Filter', 'Part'], 'some text');
      expect(result).toEqual(['car', 'air', 'filter']);
    });

    it('falls back to long words from definition text if keywords are empty', () => {
      const result = sanitizeKeywords([], 'electronic computer processor');
      expect(result).toEqual(['electronic', 'computer', 'processor']);
    });

    it('returns empty array when sanitization yields no valid English tokens', () => {
      const result = sanitizeKeywords([], 'съедобный плод яблони');
      expect(result).toEqual([]);
    });
  });

  describe('ensureEnglishKeywords', () => {
    it('returns empty array when no valid English tokens exist without fallback to object', async () => {
      const result = await ensureEnglishKeywords(['яблоко'], 'съедобный плод');
      expect(result).toEqual([]);
    });

    it('preserves valid English keywords', async () => {
      const result = await ensureEnglishKeywords(['apple', 'tree'], 'some text');
      expect(result).toEqual(['apple', 'tree']);
    });
  });

  describe('normalizeKeywordsText', () => {
    it('creates deterministic, sorted, lowercase keyword text', () => {
      const text1 = normalizeKeywordsText(['Pet', 'Cat']);
      const text2 = normalizeKeywordsText(['cat', 'pet']);
      expect(text1).toBe('cat pet');
      expect(text1).toBe(text2);
    });
  });

  describe('extractKeywordsFromDefinition', () => {
    it('calls LLM API and parses returned keywords', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            keywords: ['car part', 'air', 'filter'],
          },
        }),
      } as unknown as Response);

      const keywords = await extractKeywordsFromDefinition('a device for filtering air entering an engine');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(keywords).toEqual(['car part', 'air', 'filter']);
    });

    it('handles LLM error response by throwing an exception', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as unknown as Response);

      await expect(
        extractKeywordsFromDefinition('any definition')
      ).rejects.toThrow('LLM API error (500)');
    });
  });

  describe('fetchImagesFromGenerator', () => {
    it('calls image-generator service and returns URLs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ['https://images.site.com/photo-1.jpg'],
      } as unknown as Response);

      const urls = await fetchImagesFromGenerator(['car', 'filter']);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(urls).toEqual(['https://images.site.com/photo-1.jpg']);
    });

    it('filters out empty or non-string URLs from generator response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ['', 'https://images.site.com/photo-1.jpg', '   '],
      } as unknown as Response);

      const urls = await fetchImagesFromGenerator(['car']);
      expect(urls).toEqual(['https://images.site.com/photo-1.jpg']);
    });

    it('throws error when image-generator returns non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as unknown as Response);

      await expect(
        fetchImagesFromGenerator(['car'])
      ).rejects.toThrow('Image Generator API error (503)');
    });
  });

  describe('attachExistingImagesToDefinition', () => {
    it('connects all existing images to the definition if not already connected', async () => {
      const existingImages = [
        {
          id: 1,
          url: 'https://images.site.com/car-1.jpg',
          source: 'mock',
          text: 'auto car',
          definitions: [{ id: 10 }],
        },
        {
          id: 2,
          url: 'https://images.site.com/car-2.jpg',
          source: 'mock',
          text: 'auto car',
          definitions: [{ id: 10 }],
        },
      ];

      const updateSpy = vi.spyOn(prisma.image, 'update').mockImplementation(async (args: any) => ({
        id: args.where.id,
        url: 'url',
        source: 'mock',
        text: 'auto car',
      }) as any);

      const attached = await attachExistingImagesToDefinition(20, existingImages);

      expect(attached).toHaveLength(2);
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          definitions: {
            connect: { id: 20 },
          },
        },
      });
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          definitions: {
            connect: { id: 20 },
          },
        },
      });
    });

    it('skips connection if already connected to this definition', async () => {
      const existingImages = [
        {
          id: 1,
          url: 'https://images.site.com/car-1.jpg',
          source: 'mock',
          text: 'auto car',
          definitions: [{ id: 20 }],
        },
      ];

      const updateSpy = vi.spyOn(prisma.image, 'update');
      const attached = await attachExistingImagesToDefinition(20, existingImages);

      expect(attached).toHaveLength(1);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('attachImagesToDefinition', () => {
    it('atomically upserts and attaches image to definition in prisma', async () => {
      const mockImage = {
        id: 1,
        url: 'https://images.site.com/photo-1.jpg',
        source: 'mock',
        text: 'auto car',
        createdAt: new Date(),
      };

      const upsertSpy = vi.spyOn(prisma.image, 'upsert').mockResolvedValue(mockImage as any);

      const result = await attachImagesToDefinition(10, ['https://images.site.com/photo-1.jpg'], ['car', 'auto']);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://images.site.com/photo-1.jpg');
      expect(upsertSpy).toHaveBeenCalledWith({
        where: { url: 'https://images.site.com/photo-1.jpg' },
        update: {
          definitions: {
            connect: { id: 10 },
          },
        },
        create: {
          url: 'https://images.site.com/photo-1.jpg',
          source: expect.any(String),
          text: 'auto car',
          definitions: {
            connect: { id: 10 },
          },
        },
      });
    });

    it('connects existing image without duplicating via atomic upsert', async () => {
      const existingImage = {
        id: 5,
        url: 'https://images.site.com/photo-1.jpg',
        source: 'mock',
        text: 'auto car',
        definitions: [],
        createdAt: new Date(),
      };

      const upsertSpy = vi.spyOn(prisma.image, 'upsert').mockResolvedValue(existingImage as any);

      const result = await attachImagesToDefinition(12, ['https://images.site.com/photo-1.jpg'], ['car', 'auto']);

      expect(result).toHaveLength(1);
      expect(upsertSpy).toHaveBeenCalledWith({
        where: { url: 'https://images.site.com/photo-1.jpg' },
        update: {
          definitions: {
            connect: { id: 12 },
          },
        },
        create: {
          url: 'https://images.site.com/photo-1.jpg',
          source: expect.any(String),
          text: 'auto car',
          definitions: {
            connect: { id: 12 },
          },
        },
      });
    });

    it('ignores invalid or empty URLs without calling upsert', async () => {
      const upsertSpy = vi.spyOn(prisma.image, 'upsert');
      const attached = await attachImagesToDefinition(10, ['', 'invalid-url', '   '], ['car', 'auto']);
      expect(attached).toHaveLength(0);
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  describe('processDefinitionImage', () => {
    it('does NOT make any external image generator requests if matching images exist in DB, and attaches all of them to second definition m2m', async () => {
      // LLM extracts keywords
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            keywords: ['car', 'auto'],
          },
        }),
      } as unknown as Response);

      const existingImages = [
        {
          id: 101,
          url: 'https://existing.site/car1.jpg',
          source: 'mock',
          text: 'auto car',
          definitions: [{ id: 1 }],
        },
        {
          id: 102,
          url: 'https://existing.site/car2.jpg',
          source: 'mock',
          text: 'auto car',
          definitions: [{ id: 1 }],
        },
      ];

      vi.spyOn(prisma.definition, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.image, 'findMany').mockResolvedValue(existingImages as any);
      const updateSpy = vi.spyOn(prisma.image, 'update').mockImplementation(async (args: any) => ({
        id: args.where.id,
        url: 'url',
        source: 'mock',
        text: 'auto car',
      }) as any);

      const results = await processDefinitionImage(2, 'a road vehicle with four wheels');

      // 1. LLM was called once for keyword extraction
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 2. Database was checked for matching keywords
      expect(prisma.image.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { text: 'auto car' },
            { text: 'car auto' },
          ],
        },
        include: {
          definitions: true,
        },
      });

      // 3. Both images attached to definition 2 m2m
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 101 },
        data: {
          definitions: {
            connect: { id: 2 },
          },
        },
      });
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 102 },
        data: {
          definitions: {
            connect: { id: 2 },
          },
        },
      });

      // 4. Returned results contain both images
      expect(results).toHaveLength(2);
    });

    it('fetches from image-generator and creates new images when no matching keywords exist in DB', async () => {
      // First fetch call is LLM, second fetch call is image-generator
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              keywords: ['airplane', 'flight'],
            },
          }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ['https://images.site.com/plane.jpg'],
        } as unknown as Response);

      vi.spyOn(prisma.definition, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.image, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.image, 'upsert').mockResolvedValue({
        id: 201,
        url: 'https://images.site.com/plane.jpg',
        source: 'mock',
        text: 'airplane flight',
      } as any);

      const results = await processDefinitionImage(5, 'a powered flying vehicle with fixed wings');

      // Both LLM and image-generator called
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.image.upsert).toHaveBeenCalledWith({
        where: { url: 'https://images.site.com/plane.jpg' },
        update: {
          definitions: {
            connect: { id: 5 },
          },
        },
        create: {
          url: 'https://images.site.com/plane.jpg',
          source: expect.any(String),
          text: 'airplane flight',
          definitions: {
            connect: { id: 5 },
          },
        },
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('composeImageSearchKeywords - target word first requirement', () => {
    it('places the target word as the first keyword', () => {
      const result = composeImageSearchKeywords('apple', ['fruit', 'eatable']);
      expect(result).toEqual(['apple', 'fruit', 'eatable']);
      expect(result[0]).toBe('apple');
    });

    it('removes duplicates of target word from definition keywords and keeps it first', () => {
      const result = composeImageSearchKeywords('apple', ['fruit', 'apple', 'sweet']);
      expect(result).toEqual(['apple', 'fruit', 'sweet']);
      expect(result[0]).toBe('apple');
    });

    it('returns definition keywords unchanged if word is undefined or empty', () => {
      expect(composeImageSearchKeywords(undefined, ['fruit', 'eatable'])).toEqual(['fruit', 'eatable']);
      expect(composeImageSearchKeywords('', ['fruit', 'eatable'])).toEqual(['fruit', 'eatable']);
    });

    it('extractKeywordsFromDefinition places wordText as the first keyword', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
        ok: true,
        json: async () => ({ data: { keywords: ['fruit', 'eatable'] } }),
      } as any));

      const keywords = await extractKeywordsFromDefinition('a round edible fruit', 'apple');
      expect(keywords[0]).toBe('apple');
      expect(keywords).toEqual(['apple', 'fruit', 'eatable']);
    });
  });

  describe('English keywords enforcement', () => {
    it('isEnglishWord validates English words and rejects non-English characters', () => {
      expect(isEnglishWord('apple')).toBe(true);
      expect(isEnglishWord('car-part')).toBe(true);
      expect(isEnglishWord('air filter')).toBe(true);
      expect(isEnglishWord('яблоко')).toBe(false);
      expect(isEnglishWord('café')).toBe(false);
      expect(isEnglishWord('苹果')).toBe(false);
    });

    it('sanitizeKeywords filters out non-English keywords and returns empty array without fallback to object', () => {
      const result = sanitizeKeywords(['яблоко', 'фрукт'], 'съедобный плод яблони');
      expect(result).toEqual([]);
    });

    it('sanitizeKeywords keeps English keywords when mixed with foreign words', () => {
      const result = sanitizeKeywords(['яблоко', 'apple', 'fruit'], 'съедобный плод');
      expect(result).toEqual(['apple', 'fruit']);
    });

    it('extractKeywordsFromDefinition includes strict instruction that keywords must be in English regardless of definition language', async () => {
      let capturedBody: any;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ data: { keywords: ['apple', 'fruit'] } }),
        } as any;
      });

      const russianDefinition = 'Съедобный плод домашней яблони';
      const keywords = await extractKeywordsFromDefinition(russianDefinition);

      expect(capturedBody.prompt).toContain('Regardless of what language the definition is in, all extracted keywords MUST be in English');
      expect(capturedBody.jsonFormat).toEqual({
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of keywords in English for image search',
          },
        },
        required: ['keywords'],
      });
      expect(capturedBody.prompt).toContain(russianDefinition);
      expect(keywords.every((k) => isEnglishWord(k))).toBe(true);
      expect(keywords).toEqual(['apple', 'fruit']);
    });
  });

  describe('getImagesForDefinitionText', () => {
    it('returns existing images from DB if matching keywords found without calling generator', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('generate')) {
          return {
            ok: true,
            json: async () => ({ data: { keywords: ['apple', 'fruit'] } }),
          } as any;
        }
        throw new Error('Image generator should not be called');
      });

      vi.spyOn(prisma.image, 'findMany').mockResolvedValue([
        { url: 'https://images.site.com/apple.jpg', source: 'unsplash', text: 'apple fruit' },
      ] as any);

      const result = await getImagesForDefinitionText('an edible round fruit');
      expect(result.fromDb).toBe(true);
      expect(result.keywords).toEqual(['apple', 'fruit']);
      expect(result.images[0].url).toBe('https://images.site.com/apple.jpg');
    });

    it('fetches from generator when no matching images exist in DB', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('generate')) {
          return {
            ok: true,
            json: async () => ({ data: { keywords: ['banana', 'fruit'] } }),
          } as any;
        }
        return {
          ok: true,
          json: async () => ['https://images.site.com/banana.jpg'],
        } as any;
      });

      vi.spyOn(prisma.image, 'findMany').mockResolvedValue([]);

      const result = await getImagesForDefinitionText('a long yellow fruit');
      expect(result.fromDb).toBe(false);
      expect(result.keywords).toEqual(['banana', 'fruit']);
      expect(result.images[0].url).toBe('https://images.site.com/banana.jpg');
    });
  });

  describe('empty results and fallback handling', () => {
    it('returns empty array and does not query DB or generator if keywords are empty', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
        ok: true,
        json: async () => ({ data: { keywords: [] } }),
      } as any));

      vi.spyOn(prisma.definition, 'findUnique').mockResolvedValue(null);
      const findManySpy = vi.spyOn(prisma.image, 'findMany');
      const results = await processDefinitionImage(1, '');
      expect(results).toEqual([]);
      expect(findManySpy).not.toHaveBeenCalled();
    });

    it('getImagesForDefinitionText returns empty array when keywords are empty', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
        ok: true,
        json: async () => ({ data: { keywords: [] } }),
      } as any));

      const result = await getImagesForDefinitionText('');
      expect(result.keywords).toEqual([]);
      expect(result.images).toEqual([]);
      expect(result.fromDb).toBe(false);
    });
  });
});
