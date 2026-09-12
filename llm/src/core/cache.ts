import IORedis from 'ioredis';
import { env } from './env';

const redisUrl = env.CACHE_URL;
export const redisClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });

redisClient.on('error', (err) => {
  console.error('Redis error in LLM service:', err);
});
