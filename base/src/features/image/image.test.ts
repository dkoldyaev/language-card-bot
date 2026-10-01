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
            keywords: ['engine', 'vehicle', 'wheel'],
          },
        }),
      } as unknown as Response);

      const keywords = await extractKeywordsFromDefinition('a wheeled motor vehicle used for transportation');
      expect(keywords).toEqual(['engine', 'vehicle', 'wheel']);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws error if LLM API fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Error',
      } as unknown as Response);

      await expect(extractKeywordsFromDefinition('a test')).rejects.toThrow('LLM API error (500)');
    });
  });

  describe('fetchImagesFromGenerator', () => {
    it('calls image-generator service with keywords array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ['https://images.site.com/photo-1.jpg'],
      } as unknown as Response);

      const urls = await fetchImagesFromGenerator(['car', 'auto']);
      expect(urls).toEqual(['https://images.site.com/photo-1.jpg']);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('attachExistingImagesToDefinition', () => {
    it('connects all existing images to the definition m2m', async () => {
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

      vi.spyOn(prisma.image, 'update').mockImplementation(async ({ where, data }: any) => ({
        id: where.id,
        url: where.id === 1 ? 'https://images.site.com/car-1.jpg' : 'https://images.site.com/car-2.jpg',
        source: 'mock',
        text: 'auto car',
      }));

      const attached = await attachExistingImagesToDefinition(20, existingImages);

      expect(attached).toHaveLength(2);
      expect(prisma.image.update).toHaveBeenCalledTimes(2);
      expect(prisma.image.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          definitions: {
            connect: { id: 20 },
          },
        },
      });
      expect(prisma.image.update).toHaveBeenCalledWith({
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
    it('creates and attaches image to definition in prisma', async () => {
      const mockImage = {
        id: 1,
        url: 'https://images.site.com/photo-1.jpg',
        source: 'mock',
        text: 'auto car',
        createdAt: new Date(),
      };

      vi.spyOn(prisma.image, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.image, 'create').mockResolvedValue(mockImage as any);

      const result = await attachImagesToDefinition(10, ['https://images.site.com/photo-1.jpg'], ['car', 'auto']);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://images.site.com/photo-1.jpg');
      expect(prisma.image.create).toHaveBeenCalledWith({
        data: {
          url: 'https://images.site.com/photo-1.jpg',
          source: expect.any(String),
          text: 'auto car',
          definitions: {
            connect: { id: 10 },
          },
        },
      });
    });

    it('connects existing image without duplicating', async () => {
      const existingImage = {
        id: 5,
        url: 'https://images.site.com/photo-1.jpg',
        source: 'mock',
        text: 'auto car',
        definitions: [],
        createdAt: new Date(),
      };

      vi.spyOn(prisma.image, 'findFirst').mockResolvedValue(existingImage as any);
      vi.spyOn(prisma.image, 'update').mockResolvedValue(existingImage as any);

      const result = await attachImagesToDefinition(12, ['https://images.site.com/photo-1.jpg'], ['car', 'auto']);

      expect(result).toHaveLength(1);
      expect(prisma.image.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          definitions: {
            connect: { id: 12 },
          },
        },
      });
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

      vi.spyOn(prisma.image, 'findMany').mockResolvedValue(existingImages as any);
      const updateSpy = vi.spyOn(prisma.image, 'update').mockImplementation(async ({ where }: any) => ({
        id: where.id,
        url: `https://existing.site/car${where.id}.jpg`,
        source: 'mock',
        text: 'auto car',
      }));

      // Call for second definition (definitionId = 2)
      const results = await processDefinitionImage(2, 'a motor vehicle with four wheels');

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

      vi.spyOn(prisma.image, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.image, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.image, 'create').mockResolvedValue({
        id: 201,
        url: 'https://images.site.com/plane.jpg',
        source: 'mock',
        text: 'airplane flight',
      } as any);

      const results = await processDefinitionImage(5, 'a powered flying vehicle with fixed wings');

      // Both LLM and image-generator called
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.image.create).toHaveBeenCalledWith({
        data: {
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
});
