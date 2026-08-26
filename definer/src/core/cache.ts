import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});
