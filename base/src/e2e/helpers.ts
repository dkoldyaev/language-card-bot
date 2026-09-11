import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';

import { dictionaryQueue } from '../features/add_word/add_word.queue';

import { ensureActiveDictionary } from '../features/dictionaries/dictionaries.service';

export async function clearDatabase() {
  const deleteUsers = prisma.user.deleteMany();
  await prisma.$transaction([deleteUsers]);
  await dictionaryQueue.obliterate({ force: true });
}

export async function setupTestUser(username: string): Promise<{ token: string, user: any, dictionary: any }> {
  await request(app).post('/api/v1/auth/register').send({ username });
  const loginRes = await request(app).post('/api/v1/auth/login').send({ username });
  
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
  
  const dictionary = await ensureActiveDictionary(userInDb!.id);
  const refreshedUser = await prisma.user.findUnique({
    where: { id: userInDb!.id },
    include: { state: true, dictionaries: true }
  });
  
  return { token: loginRes.body.token, user: refreshedUser, dictionary };
}

export async function setupMercureListener(username: string): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array>, messages: any[], streamPromise: Promise<void> }> {
  const messages: any[] = [];
  const subscriberToken = process.env.MERCURE_JWT;
  const mercureUrl = process.env.MERCURE_URL!;
  const topic = `${process.env.BASE_DOMAIN}/v1/users/${username}`;
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
  
  const reader = esRes.body!.getReader();
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
            messages.push(JSON.parse(line.substring(6)));
          }
        }
      }
    } catch (e) {
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
