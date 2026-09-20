import type { Definition, Dictionary, Preset, PrismaClient, User, UserState, Word } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { appEvents, Events } from '../../core/events';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { env } from '../../core/env';

const { mockRedisClient, mockInvalidateKeysByPattern } = vi.hoisted(() => ({
  mockRedisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
  mockInvalidateKeysByPattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../core/cache', () => ({
  redisClient: mockRedisClient,
  invalidateKeysByPattern: mockInvalidateKeysByPattern,
}));

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Preset Feature API', () => {
  const JWT_SECRET = env.JWT_SECRET;
  const regularUserId = 1;
  const adminUserId = 2;
  const regularToken = jwt.sign({ id: regularUserId, username: 'regular_user' }, JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: adminUserId, username: 'admin_user' }, JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    mockReset(prismaMock);
    vi.mocked(publishEvent).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/preset', () => {
    it('should return presets for unauthenticated guest user', async () => {
      prismaMock.preset.findMany.mockResolvedValue([
        {
          id: 1,
          title: 'Top 100 Spanish Words',
          forLanguage: 'es',
          type: 'word-definition',
          body: [{ word: 'hola', definitions: ['hello'] }],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        } as unknown,
      ]);

      const res = await request(app).get('/api/v1/preset');
      expect(res.status).toBe(200);
      expect(res.body.presets).toHaveLength(1);
    });

    it('should return presets for authenticated regular user', async () => {
      prismaMock.preset.findMany.mockResolvedValue([
        {
          id: 1,
          title: 'Top 100 Spanish Words',
          forLanguage: 'es',
          type: 'word-definition',
          body: [{ word: 'hola', definitions: ['hello'] }],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        } as unknown,
      ]);

      const res = await request(app)
        .get('/api/v1/preset')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.presets).toHaveLength(1);
      expect(res.body.presets[0].title).toBe('Top 100 Spanish Words');
      expect(res.body.presets[0].for_language).toBe('es');
      expect(res.body.presets[0].forLanguage).toBe('es');
    });

    it('should filter presets by for_language query param', async () => {
      prismaMock.preset.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/preset?for_language=de')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.preset.findMany).toHaveBeenCalledWith({
        where: { forLanguage: 'de' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return presets from cache when cache is warm', async () => {
      const cachedPresets = [
        {
          id: 99,
          title: 'Cached Preset',
          forLanguage: 'en',
          for_language: 'en',
          type: 'word-definition',
          body: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedPresets));

      const res = await request(app)
        .get('/api/v1/preset')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual(cachedPresets);
      expect(mockRedisClient.get).toHaveBeenCalledWith('presets:list:all');
      expect(prismaMock.preset.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/preset/:id', () => {
    it('should return 404 if preset not found', async () => {
      prismaMock.preset.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/preset/999')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Preset not found');
    });

    it('should return preset if found', async () => {
      prismaMock.preset.findUnique.mockResolvedValue({
        id: 1,
        title: 'Spanish Basics',
        forLanguage: 'es',
        type: 'word-definition',
        body: [{ word: 'hola', definitions: ['hello'] }],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      } as Preset);

      const res = await request(app)
        .get('/api/v1/preset/1')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.preset.id).toBe(1);
      expect(res.body.preset.title).toBe('Spanish Basics');
    });
  });

  describe('POST /api/v1/preset (Admin Only)', () => {
    it('should return 403 Forbidden if user is not admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: regularUserId,
        isAdmin: false,
      } as User);

      const res = await request(app)
        .post('/api/v1/preset')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Spanish 101',
          for_language: 'es',
          type: 'word-definition',
          body: [{ word: 'casa', definitions: ['house'] }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden: Admin access required');
    });

    it('should allow admin to create preset', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: adminUserId,
        isAdmin: true,
      } as User);

      prismaMock.preset.create.mockResolvedValue({
        id: 10,
        title: 'Spanish 101',
        forLanguage: 'es',
        type: 'word-definition',
        body: [{ word: 'casa', definitions: ['house'] }],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      } as Preset);

      const res = await request(app)
        .post('/api/v1/preset')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Spanish 101',
          for_language: 'es',
          type: 'word-definition',
          body: [{ word: 'casa', definitions: ['house'] }],
        });

      expect(res.status).toBe(201);
      expect(res.body.preset.id).toBe(10);
      expect(res.body.preset.title).toBe('Spanish 101');
      expect(prismaMock.preset.create).toHaveBeenCalledWith({
        data: {
          title: 'Spanish 101',
          description: null,
          forLanguage: 'es',
          type: 'word-definition',
          body: [{ word: 'casa', definitions: ['house'] }],
        },
      });
      expect(mockInvalidateKeysByPattern).toHaveBeenCalledWith('presets:*');
    });
  });

  describe('PUT /api/v1/preset/:id (Admin Only)', () => {
    it('should return 403 if user is not admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: regularUserId,
        isAdmin: false,
      } as User);

      const res = await request(app)
        .put('/api/v1/preset/1')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(403);
    });

    it('should update preset for admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: adminUserId,
        isAdmin: true,
      } as User);

      prismaMock.preset.findUnique.mockResolvedValue({
        id: 1,
        title: 'Old Title',
        forLanguage: 'es',
        type: 'word-definition',
        body: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Preset);

      prismaMock.preset.update.mockResolvedValue({
        id: 1,
        title: 'New Title',
        forLanguage: 'es',
        type: 'word-definition',
        body: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Preset);

      const res = await request(app)
        .put('/api/v1/preset/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.preset.title).toBe('New Title');
    });
  });

  describe('DELETE /api/v1/preset/:id (Admin Only)', () => {
    it('should return 403 if user is not admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: regularUserId,
        isAdmin: false,
      } as User);

      const res = await request(app)
        .delete('/api/v1/preset/1')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('should delete preset for admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: adminUserId,
        isAdmin: true,
      } as User);

      prismaMock.preset.findUnique.mockResolvedValue({
        id: 1,
        title: 'To Delete',
        forLanguage: 'es',
        type: 'word-definition',
        body: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Preset);

      prismaMock.preset.delete.mockResolvedValue({ id: 1 } as Preset);

      const res = await request(app)
        .delete('/api/v1/preset/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Preset deleted successfully');
    });
  });

  describe('POST /api/v1/preset/apply_preset', () => {
    it('should return 404 if dictionary does not exist or does not belong to user', async () => {
      prismaMock.dictionary.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/preset/apply_preset')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dictionaryId: 99, presetId: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Dictionary not found');
    });

    it('should return 404 if preset does not exist', async () => {
      prismaMock.dictionary.findFirst.mockResolvedValue({
        id: 10,
        userId: regularUserId,
        name: 'ES (EN)',
        targetLanguage: 'es',
        baseLanguage: 'en',
      } as Dictionary);

      prismaMock.preset.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/preset/apply_preset')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dictionaryId: 10, presetId: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Preset not found');
    });

    it('should return 400 if preset language does not match dictionary target language', async () => {
      prismaMock.dictionary.findFirst.mockResolvedValue({
        id: 10,
        userId: regularUserId,
        name: 'FR (EN)',
        targetLanguage: 'fr',
        baseLanguage: 'en',
      } as Dictionary);

      prismaMock.preset.findUnique.mockResolvedValue({
        id: 1,
        title: 'Spanish Words',
        forLanguage: 'es',
        type: 'word-definition',
        body: [{ word: 'hola', definitions: ['hello'] }],
      } as Preset);

      const res = await request(app)
        .post('/api/v1/preset/apply_preset')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dictionaryId: 10, presetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('does not match dictionary target language');
    });

    it('should successfully apply word-definition preset, save to DB, and emit events', async () => {
      const emitSpy = vi.spyOn(appEvents, 'emit');

      prismaMock.dictionary.findFirst.mockResolvedValue({
        id: 10,
        userId: regularUserId,
        name: 'ES (EN)',
        targetLanguage: 'es',
        baseLanguage: 'en',
      } as Dictionary);

      prismaMock.preset.findUnique.mockResolvedValue({
        id: 1,
        title: 'Spanish Basics',
        forLanguage: 'es',
        type: 'word-definition',
        body: [
          {
            word: 'hola',
            definitions: ['An informal greeting', 'Used when meeting someone'],
          },
          {
            word: 'gracias',
            definitions: [{ text: 'Used to express gratitude' }],
          },
        ],
      } as unknown);

      // Mock userState for getUserDictionaries
      prismaMock.userState.findUnique.mockResolvedValue({
        userId: regularUserId,
        activeDictionaryId: 10,
      } as UserState);

      prismaMock.dictionary.findMany.mockResolvedValue([
        {
          id: 10,
          name: 'ES (EN)',
          targetLanguage: 'es',
          baseLanguage: 'en',
          userId: regularUserId,
          createdAt: new Date(),
          _count: { words: 2 },
        } as unknown,
      ]);

      // Batch word prefetch: neither 'hola' nor 'gracias' exists yet
      prismaMock.word.findMany.mockResolvedValue([]);

      // Word 1: 'hola' does not exist yet
      prismaMock.word.findUnique
        .mockResolvedValueOnce(null) // 'hola' not found
        .mockResolvedValueOnce(null); // 'gracias' not found

      prismaMock.word.createManyAndReturn.mockResolvedValue([
        { id: 101, text: 'hola' },
        { id: 102, text: 'gracias' },
      ] as Word);

      prismaMock.preset.update.mockResolvedValue({} as Word);

      prismaMock.definition.createManyAndReturn.mockResolvedValue([
        { id: 201, wordId: 101, text: 'An informal greeting' },
        { id: 202, wordId: 101, text: 'Used when meeting someone' },
        { id: 203, wordId: 102, text: 'Used to express gratitude' },
      ] as Definition);

      const res = await request(app)
        .post('/api/v1/preset/apply_preset')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dictionaryId: 10, presetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wordsCount).toBe(2);
      expect(res.body.definitionsCount).toBe(3);

      // Verify Mercure processing event sent for words
      expect(publishEvent).toHaveBeenCalledWith(
        'regular_user',
        expect.objectContaining({
          type: 'dictionary_add_processing',
          words: expect.arrayContaining([
            expect.objectContaining({
              wordId: 101,
              word: 'hola',
            }),
          ]),
        })
      );

      // Verify appEvents emitted for each definition added
      expect(emitSpy).toHaveBeenCalledWith(
        Events.DEFINITION_ADDED,
        expect.objectContaining({
          definitionId: 201,
          wordId: 101,
          wordText: 'hola',
        })
      );

      // Verify dictionaries_sync was published
      expect(publishEvent).toHaveBeenCalledWith(
        'regular_user',
        expect.objectContaining({
          type: 'dictionaries_sync',
        })
      );
    });
  });
});
