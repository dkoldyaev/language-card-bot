import 'dotenv/config';
import { prisma } from '../src/prisma';
import { redisClient, invalidateKeysByPattern } from '../src/core/cache';

async function clearStats() {
  try {
    const attemptsResult = await prisma.quizAttempt.deleteMany({});
    console.log(`Successfully deleted ${attemptsResult.count} quiz attempt(s).`);

    try {
      await invalidateKeysByPattern('dashboard:stats:*');
      console.log('Successfully invalidated Redis dashboard cache.');
    } catch (redisErr) {
      console.warn('Redis cache invalidation warning:', redisErr);
    }
  } catch (error) {
    console.error('Failed to clear statistics:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await redisClient.quit().catch(() => {});
  }
}

clearStats();
