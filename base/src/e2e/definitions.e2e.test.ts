import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';

describe('Definitions E2E', () => {
  const testUsername = 'def_user';
  let userToken: string;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: any[] = [];
  let streamPromise: Promise<void>;
  let wordId: number;

  beforeEach(async () => {
    await clearDatabase();
    
    const setup = await setupTestUser(testUsername);
    userToken = setup.token;
    
    const sse = await setupMercureListener(testUsername);
    reader = sse.reader;
    messages = sse.messages;
    streamPromise = sse.streamPromise;

    // Create a base word manually in DB for definition tests
    const word = await prisma.word.create({
      data: {
        text: 'apple',
        userId: setup.user.id
      }
    });
    wordId = word.id;

    // Initialize user settings to prevent background worker failures
    await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`);
  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should add, edit, translate, and delete a definition', async () => {
    // Mock fetch for translation which might be triggered by background worker
    const originalFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const urlStr = url.toString();
      if (urlStr.includes('translate')) {
        return new Response(JSON.stringify({ translatedText: 'mocked_translation' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    });

    // 1. Add Definition
    const addRes = await request(app)
      .post('/api/v1/definition_add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ wordId, text: 'A fruit' });

    expect(addRes).toMatchObject({
      status: 200,
      body: {
        message: 'Definition added successfully',
        definitionId: expect.any(Number)
      }
    });

    const defId = addRes.body.definitionId;

    // Verify DB
    let definition = await prisma.definition.findUnique({ where: { id: defId } });
    expect(definition?.text).toBe('A fruit');

    // 2. Edit Definition
    const editRes = await request(app)
      .put(`/api/v1/definition_edit/${defId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ text: 'A round fruit' });

    expect(editRes).toMatchObject({
      status: 200,
      body: { message: 'Definition edited successfully' }
    });

    definition = await prisma.definition.findUnique({ where: { id: defId } });
    expect(definition?.text).toBe('A round fruit');

    // 3. Edit Translation
    const transEditRes = await request(app)
      .put(`/api/v1/definition_translate_edit/${defId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ text: 'Круглый фрукт' });

    expect(transEditRes).toMatchObject({
      status: 200,
      body: { message: 'Definition translation edited successfully' }
    });

    const translation = await prisma.definitionTranslation.findFirst({ where: { definitionId: defId } });
    expect(translation?.text).toBe('Круглый фрукт');

    // 4. Delete Definition
    const deleteRes = await request(app)
      .delete(`/api/v1/definition_delete/${defId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(deleteRes).toMatchObject({
      status: 200,
      body: { message: 'Definition deleted successfully' }
    });

    const deletedDef = await prisma.definition.findUnique({ where: { id: defId } });
    expect(deletedDef).toBeNull();

    fetchSpy.mockRestore();
  });
});
