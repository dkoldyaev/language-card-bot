import type { Dictionary, User, UserState } from '@prisma/client';
import request from 'supertest';
import app from '../app';
import { env } from '../core/env';
import { dictionaryQueue } from '../features/add_word/add_word.queue';
import { ensureActiveDictionary } from '../features/dictionaries/dictionaries.service';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';

export type TestUserWithRelations = User & {
  state: UserState | null;
  dictionaries: Dictionary[];
};

export interface TestSetup {
  token: string;
  user: TestUserWithRelations;
  dictionary: Dictionary;
}

export async function clearDatabase() {
  const deletePresets = prisma.preset.deleteMany();
  const deleteUsers = prisma.user.deleteMany();
  await prisma.$transaction([deletePresets, deleteUsers]);
  await dictionaryQueue.obliterate({ force: true });
}

export async function setupAdminUser(username: string): Promise<TestSetup> {
  const data = await setupTestUser(username);
  await prisma.user.update({
    where: { id: data.user!.id },
    data: { isAdmin: true },
  });
  const loginRes = await request(app).post('/api/v1/auth/login').send({ username });
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: { state: true, dictionaries: true },
  });
  if (!user) {
    throw new Error(`Failed to find test admin user ${username} after registration`);
  }
  return { token: loginRes.body.token, user, dictionary: data.dictionary };
}

export async function setupTestUser(username: string): Promise<TestSetup> {
  await request(app).post('/api/v1/auth/register').send({ username });
  const loginRes = await request(app).post('/api/v1/auth/login').send({ username });
  if (!loginRes.body?.token) {
    throw new Error(`Failed to login test user ${username}: status=${loginRes.status}, body=${JSON.stringify(loginRes.body)}`);
  }
  
  const email = username.includes('@') ? username : `${username}@test.local`;
  const userInDb = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { accounts: { some: { provider: 'test-username', providerAccountId: username } } }
      ]
    },
    include: { state: true, dictionaries: true }
  });
  
  if (!userInDb) {
    throw new Error(`Failed to find test user ${username} after registration`);
  }

  const dictionary = await ensureActiveDictionary(userInDb.id);
  const refreshedUser = await prisma.user.findUnique({
    where: { id: userInDb.id },
    include: { state: true, dictionaries: true }
  });
  if (!refreshedUser) {
    throw new Error(`Failed to find test user ${username} after registration`);
  }
  
  return { token: loginRes.body.token, user: refreshedUser, dictionary };
}

export async function setupMercureListener(username: string): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array>, messages: TMessage[], streamPromise: Promise<void> }> {
  const messages: TMessage[] = [];
  const subscriberToken = env.MERCURE_JWT;
  const mercureUrl = env.MERCURE_URL;
  const topic = `${env.BASE_DOMAIN}/v1/users/${username}`;
  const url = new URL(mercureUrl);
  url.searchParams.append('topic', topic);

  const originalFetchForE2E = global.fetch;
  const esRes = await originalFetchForE2E(url.toString(), {
    headers: {
      'Authorization': `Bearer ${subscriberToken}`,
      'Accept': 'text/event-stream'
    }
  });

  if (!esRes.ok) {
    throw new Error(`SSE fetch failed: ${esRes.status}`);
  }
  
  const reader = esRes.body?.getReader();
  if (!reader) {
    throw new Error('SSE response body is not readable');
  }
  const decoder = new TextDecoder();

  const readStream = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            messages.push(JSON.parse(line.substring(6)) as TMessage);
          }
        }
      }
    } catch (_e) {
      // Ignore read errors from cancellation
    }
  };
  const streamPromise = readStream();

  // Give some time for the connection to be established
  await new Promise(resolve => setTimeout(resolve, 100));

  return { reader, messages, streamPromise };
}

export async function teardownMercureListener(reader?: ReadableStreamDefaultReader<Uint8Array>, streamPromise?: Promise<void>) {
  if (reader) {
    await reader.cancel().catch(() => {});
  }
  if (streamPromise) {
    await streamPromise;
  }
}
