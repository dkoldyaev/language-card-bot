import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redisClient } from '../core/cache';
import { ImageGeneratorFactory } from '../core/ImageGeneratorFactory';
import { buildCacheKey, imagesRouter } from './images';

vi.mock('../core/cache', () => ({
  redisClient: {
    mget: vi.fn(),
    pipeline: vi.fn(),
    on: vi.fn(),
  },
}));

describe('POST /api/v1/images', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/images', imagesRouter);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not cache empty or failed image URLs in redis', async () => {
    vi.spyOn(redisClient, 'mget').mockResolvedValue([null] as unknown as string[]);
    const mockPipeline = {
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(redisClient, 'pipeline').mockReturnValue(mockPipeline as unknown as ReturnType<typeof redisClient.pipeline>);

    const mockGenerator = {
      generate: vi.fn().mockResolvedValue([[]]),
    };
    vi.spyOn(ImageGeneratorFactory, 'getGenerator').mockReturnValue(mockGenerator as never);

    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [['nonexistentword']],
        provider: 'mock',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([[]]);
    expect(mockPipeline.set).not.toHaveBeenCalled();
  });

  describe('buildCacheKey', () => {
    it('creates canonical, sorted, lowercase cache keys', () => {
      const key1 = buildCacheKey('mock', ['Pet', 'Cat']);
      const key2 = buildCacheKey('mock', ['cat', 'pet']);
      expect(key1).toBe('image-generator:mock:cat+pet');
      expect(key1).toBe(key2);
    });
  });

  it('validates request and returns 400 for empty keywords array', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .send({ keywords: [], provider: 'mock' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('validates request and returns 400 for empty keyword group', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .send({ keywords: [[]], provider: 'mock' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });


  it('validates request and returns 400 for non-English keywords', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [['яблоко', 'фрукт']],
        provider: 'mock',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
    expect(JSON.stringify(res.body.details)).toContain('must be in English');
  });

  it('validates request and returns 400 for missing provider', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .send({ keywords: [['cat']] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('generates images and caches them in redis on cache miss', async () => {
    vi.spyOn(redisClient, 'mget').mockResolvedValue([null, null] as unknown as string[]);
    const mockPipeline = {
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(redisClient, 'pipeline').mockReturnValue(mockPipeline as unknown as ReturnType<typeof redisClient.pipeline>);

    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [
          ['car part', 'air', 'filter'],
          ['cat', 'pet'],
        ],
        provider: 'mock',
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0][0]).toContain('https://mockimage.tw/photo/');
    expect(res.body[1][0]).toContain('https://mockimage.tw/photo/');
    expect(mockPipeline.set).toHaveBeenCalledTimes(2);
    expect(mockPipeline.set).toHaveBeenCalledWith(
      'image-generator:mock:air+car part+filter',
      expect.stringContaining('https://mockimage.tw/photo/'),
      'EX',
      365 * 24 * 60 * 60
    );
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });

  it('uses cached images from redis when available (full cache hit)', async () => {
    const cachedUrls = ['https://cached.site/image-1.jpg'];
    vi.spyOn(redisClient, 'mget').mockResolvedValue([JSON.stringify(cachedUrls)] as unknown as string[]);
    const getGeneratorSpy = vi.spyOn(ImageGeneratorFactory, 'getGenerator');

    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [['cat', 'pet']],
        provider: 'mock',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([cachedUrls]);
    expect(getGeneratorSpy).not.toHaveBeenCalled();
  });

  it('handles partial cache hits: only generates uncached images and preserves order', async () => {
    const cachedUrls = ['https://cached.site/cat.jpg'];
    vi.spyOn(redisClient, 'mget').mockResolvedValue([JSON.stringify(cachedUrls), null] as unknown as string[]);
    const mockPipeline = {
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(redisClient, 'pipeline').mockReturnValue(mockPipeline as unknown as ReturnType<typeof redisClient.pipeline>);

    const mockGenerator = {
      generate: vi.fn().mockResolvedValue([['https://generated.site/dog.jpg']]),
    };
    vi.spyOn(ImageGeneratorFactory, 'getGenerator').mockReturnValue(mockGenerator as never);

    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [
          ['cat'],
          ['dog'],
        ],
        provider: 'mock',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([cachedUrls, ['https://generated.site/dog.jpg']]);
    expect(mockGenerator.generate).toHaveBeenCalledTimes(1);
    expect(mockGenerator.generate).toHaveBeenCalledWith([['dog']]);
    expect(mockPipeline.set).toHaveBeenCalledTimes(1);
    expect(mockPipeline.set).toHaveBeenCalledWith(
      'image-generator:mock:dog',
      JSON.stringify(['https://generated.site/dog.jpg']),
      'EX',
      365 * 24 * 60 * 60
    );
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });
});
