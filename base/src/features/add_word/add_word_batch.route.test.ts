import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { appEvents, Events } from '../../core/events';
import * as eventBusService from '../event_bus/event_bus.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('POST /api/v1/add_word/batch', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const userId = 10;
  const username = 'testuser';
  const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    mockReset(prismaMock);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .send({ words: ['apple'] });

    expect(res.status).toBe(401);
  });

  it('should return 400 if words is missing or not an array', async () => {
    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ words: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Words list is required and cannot be empty');
  });

  it('should return 400 if words array contains only blank strings', async () => {
    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ words: ['   ', ''] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('At least one valid word is required');
  });

  it('should return 404 if dictionary is not found for user', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ words: ['hello'], dictionaryId: 999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Dictionary not found');
  });

  it('should successfully add new words and emit WORD_ADDED events', async () => {
    const emitSpy = vi.spyOn(appEvents, 'emit');

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 5,
      userId,
      name: 'English',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      createdAt: new Date(),
    } as any);

    prismaMock.word.findMany.mockResolvedValue([]);
    prismaMock.word.createManyAndReturn.mockResolvedValue([
      { id: 101, dictionaryId: 5, text: 'cat' } as any,
      { id: 102, dictionaryId: 5, text: 'dog' } as any,
    ]);

    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ words: ['Cat', ' Dog '], dictionaryId: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Words processed successfully',
      addedCount: 2,
      duplicateCount: 0,
    });

    expect(prismaMock.word.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { dictionaryId: 5, text: 'cat' },
        { dictionaryId: 5, text: 'dog' },
      ],
      select: {
        id: true,
        text: true,
        dictionaryId: true,
      },
      skipDuplicates: true,
    });

    expect(emitSpy).toHaveBeenCalledTimes(2);
    expect(emitSpy).toHaveBeenNthCalledWith(1, Events.WORD_ADDED, {
      userId,
      username,
      wordId: 101,
      wordText: 'cat',
      dictionaryId: 5,
    });
    expect(emitSpy).toHaveBeenNthCalledWith(2, Events.WORD_ADDED, {
      userId,
      username,
      wordId: 102,
      wordText: 'dog',
      dictionaryId: 5,
    });
  });

  it('should handle duplicate words in DB and within the same batch by publishing Mercure duplicate event', async () => {
    const emitSpy = vi.spyOn(appEvents, 'emit');

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 5,
      userId,
      name: 'English',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      createdAt: new Date(),
    } as any);

    // 'cat' exists in DB
    prismaMock.word.findMany.mockResolvedValue([
      { id: 101, text: 'cat' } as any,
    ]);

    prismaMock.word.createManyAndReturn.mockResolvedValue([
      { id: 102, dictionaryId: 5, text: 'dog' } as any,
    ]);

    // Batch contains 'cat' (in DB), 'dog' (new), and 'dog' again (duplicate within input batch)
    const res = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ words: ['cat', 'dog', 'Dog'], dictionaryId: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Words processed successfully',
      addedCount: 1,
      duplicateCount: 2,
    });

    expect(prismaMock.word.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ dictionaryId: 5, text: 'dog' }],
      select: {
        id: true,
        text: true,
        dictionaryId: true,
      },
      skipDuplicates: true,
    });

    expect(eventBusService.publishEvent).toHaveBeenCalledWith(username, {
      version: 'v1',
      type: 'dictionary_add_duplicate',
      word: 'cat',
    });
    expect(eventBusService.publishEvent).toHaveBeenCalledWith(username, {
      version: 'v1',
      type: 'dictionary_add_duplicate',
      word: 'dog',
    });

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(Events.WORD_ADDED, {
      userId,
      username,
      wordId: 102,
      wordText: 'dog',
      dictionaryId: 5,
    });
  });
});
