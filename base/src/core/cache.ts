import IORedis from 'ioredis';
import { env } from './env';

const redisUrl = env.REDIS_URL;
export const redisClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });

redisClient.on('error', (err) => {
  console.error('Redis error in Base service:', err);
});

export async function invalidateKeysByPattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } while (cursor !== '0');
}
