import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupAdminUser, setupMercureListener, teardownMercureListener } from './helpers';

describe('Presets E2E', () => {
  const regularUsername = 'e2e_regular_user';
  const adminUsername = 'e2e_admin_user';

  let regularUserToken: string;
  let adminUserToken: string;
  let regularSetup: { token: string; user: any; dictionary: any };
  let adminSetup: { token: string; user: any; dictionary: any };

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: any[] = [];
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();

    regularSetup = await setupTestUser(regularUsername);
    regularUserToken = regularSetup.token;

    adminSetup = await setupAdminUser(adminUsername);
    adminUserToken = adminSetup.token;

    const sse = await setupMercureListener(regularUsername);
    reader = sse.reader;
    messages = sse.messages;
    streamPromise = sse.streamPromise;
  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should enforce admin guard on preset creation and allow admin to create preset', async () => {
    // 1. Regular user tries to create a preset -> 403 Forbidden
    const forbiddenRes = await request(app)
      .post('/api/v1/preset')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        title: 'Forbidden Preset',
        for_language: 'en',
        type: 'word-definition',
        body: [{ word: 'test', definitions: ['a procedure'] }],
      });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toBe('Forbidden: Admin access required');

    // 2. Admin creates a preset -> 201 Created
    const createRes = await request(app)
      .post('/api/v1/preset')
      .set('Authorization', `Bearer ${adminUserToken}`)
      .send({
        title: 'English Starter Pack',
        for_language: 'en',
        type: 'word-definition',
        body: [
          { word: 'apple', definitions: ['A round fruit with red or green skin'] },
          { word: 'book', definitions: ['A set of written sheets of paper bound together'] },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.preset.id).toBeDefined();
    expect(createRes.body.preset.title).toBe('English Starter Pack');
    expect(createRes.body.preset.for_language).toBe('en');

    // Verify preset exists in Postgres DB
    const presetInDb = await prisma.preset.findUnique({
      where: { id: createRes.body.preset.id },
    });
    expect(presetInDb).not.toBeNull();
    expect(presetInDb!.title).toBe('English Starter Pack');
  });

  it('should allow regular users to list and view presets', async () => {
    // Admin creates two presets
    await prisma.preset.createMany({
      data: [
        {
          title: 'English Verbs',
          forLanguage: 'en',
          type: 'word-definition',
          body: [{ word: 'run', definitions: ['move swiftly'] }],
        },
        {
          title: 'Spanish Basics',
          forLanguage: 'es',
          type: 'word-definition',
          body: [{ word: 'hola', definitions: ['hello'] }],
        },
      ],
    });

    // Regular user lists all presets
    const listRes = await request(app)
      .get('/api/v1/preset')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.presets).toHaveLength(2);

    // Regular user filters by language
    const filterRes = await request(app)
      .get('/api/v1/preset?for_language=es')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.presets).toHaveLength(1);
    expect(filterRes.body.presets[0].title).toBe('Spanish Basics');
  });

  it('should apply preset to user dictionary, save words to DB, and send Mercure events', async () => {
    // Ensure regular user has an English dictionary (active dictionary defaults to targetLanguage 'en')
    const userDict = regularSetup.dictionary;
    expect(userDict.targetLanguage).toBe('en');

    // Admin creates English preset
    const preset = await prisma.preset.create({
      data: {
        title: 'Essential Vocabulary',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'sunshine',
            definitions: ['Direct sunlight unbroken by cloud', 'Cheerfulness or happiness'],
          },
          {
            word: 'water',
            definitions: ['A colorless, transparent, odorless liquid'],
          },
        ],
      },
    });

    // Regular user applies the preset
    const applyRes = await request(app)
      .post('/api/v1/preset/apply_preset')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        dictionaryId: userDict.id,
        presetId: preset.id,
      });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.success).toBe(true);
    expect(applyRes.body.wordsCount).toBe(2);
    expect(applyRes.body.definitionsCount).toBe(3);

    // Verify words, definitions and m2m relations in database
    const wordsInDb = await prisma.word.findMany({
      where: { dictionaryId: userDict.id },
      include: {
        definitions: {
          include: { presets: true },
        },
        presets: true,
      },
      orderBy: { text: 'asc' },
    });

    expect(wordsInDb).toHaveLength(2);
    expect(wordsInDb[0].text).toBe('sunshine');
    expect(wordsInDb[0].presets).toHaveLength(1);
    expect(wordsInDb[0].presets[0].id).toBe(preset.id);
    expect(wordsInDb[0].definitions).toHaveLength(2);
    expect(wordsInDb[0].definitions[0].presets).toHaveLength(1);
    expect(wordsInDb[0].definitions[0].presets[0].id).toBe(preset.id);

    expect(wordsInDb[1].text).toBe('water');
    expect(wordsInDb[1].presets).toHaveLength(1);
    expect(wordsInDb[1].presets[0].id).toBe(preset.id);
    expect(wordsInDb[1].definitions).toHaveLength(1);
    expect(wordsInDb[1].definitions[0].presets).toHaveLength(1);
    expect(wordsInDb[1].definitions[0].presets[0].id).toBe(preset.id);

    // Wait a brief moment for Mercure events to arrive
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify Mercure events received on SSE topic
    const processingEvents = messages.filter((m) => m.type === 'dictionary_add_processing');
    expect(processingEvents.length).toBe(1);
    expect(processingEvents[0].words.length).toBeGreaterThanOrEqual(2);

    const definitionsEvents = messages.filter((m) => m.type === 'dictionary_add_definitions_received');
    expect(definitionsEvents.length).toBeGreaterThanOrEqual(3);

    const dictSyncEvents = messages.filter((m) => m.type === 'dictionaries_sync');
    expect(dictSyncEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should link existing words and definitions to preset when preset is applied', async () => {
    const userDict = regularSetup.dictionary;

    // 1. Pre-create word and definition in user's dictionary WITHOUT preset relation
    const existingWord = await prisma.word.create({
      data: {
        dictionaryId: userDict.id,
        text: 'apple',
        definitions: {
          create: {
            text: 'A round edible fruit',
          },
        },
      },
      include: {
        definitions: true,
        presets: true,
      },
    });

    expect(existingWord.presets).toHaveLength(0);

    // 2. Create preset that includes 'apple' with the existing definition and a new definition
    const preset = await prisma.preset.create({
      data: {
        title: 'Fruits Pack',
        forLanguage: 'en',
        type: 'word-definition',
        body: [
          {
            word: 'apple',
            definitions: [
              'A round edible fruit', // already exists
              'A tech company', // new definition
            ],
          },
        ],
      },
    });

    // 3. Apply preset
    const applyRes = await request(app)
      .post('/api/v1/preset/apply_preset')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        dictionaryId: userDict.id,
        presetId: preset.id,
      });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.success).toBe(true);

    // 4. Verify existing word and existing definition now have m2m relation to preset
    const updatedWord = await prisma.word.findUnique({
      where: { id: existingWord.id },
      include: {
        presets: true,
        definitions: {
          include: { presets: true },
          orderBy: { text: 'asc' },
        },
      },
    });

    expect(updatedWord).not.toBeNull();
    // Word is linked to preset
    expect(updatedWord!.presets).toHaveLength(1);
    expect(updatedWord!.presets[0].id).toBe(preset.id);

    // Both existing and new definitions are linked to preset
    expect(updatedWord!.definitions).toHaveLength(2);
    for (const def of updatedWord!.definitions) {
      expect(def.presets.some((p) => p.id === preset.id)).toBe(true);
    }
  });
});
