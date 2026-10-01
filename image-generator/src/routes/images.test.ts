import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redisClient } from '../core/cache';
import { imagesRouter } from './images';

describe('POST /api/v1/images', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/images', imagesRouter);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates request and returns 400 for empty keywords array', async () => {
    const res = await request(app)
      .post('/api/v1/images')
      .send({ keywords: [], provider: 'mock' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('returns array of image URLs using mock provider and caches to redis', async () => {
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
    expect(res.body[0]).toContain('https://mockimage.tw/photo/');
    expect(mockPipeline.set).toHaveBeenCalledTimes(2);
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });

  it('uses cached images from redis when available', async () => {
    const cachedUrl = 'https://cached.site/image-1.jpg';
    vi.spyOn(redisClient, 'mget').mockResolvedValue([cachedUrl] as unknown as string[]);

    const res = await request(app)
      .post('/api/v1/images')
      .send({
        keywords: [['cat', 'pet']],
        provider: 'mock',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([cachedUrl]);
  });
});
