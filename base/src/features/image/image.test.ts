import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../prisma';
import {
  attachImagesToDefinition,
  extractKeywordsFromDefinition,
  fetchImagesFromGenerator,
  processDefinitionImage,
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

  describe('attachImagesToDefinition', () => {
    it('creates and attaches image to definition in prisma', async () => {
      const mockImage = {
        id: 1,
        url: 'https://images.site.com/photo-1.jpg',
        source: 'mock',
        text: 'car auto',
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
          text: 'car auto',
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
        text: 'car auto',
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
});
