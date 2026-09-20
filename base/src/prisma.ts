import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { env } from './core/env';

const connectionString = env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const isLoggingEnabled = env.ENABLE_DB_LOGGING === 'true';

export const prisma = new PrismaClient({
  adapter,
  log: isLoggingEnabled
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
});

if (isLoggingEnabled) {
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    console.log(`[DB QUERY] [${e.duration}ms] ${e.query} -- params: ${e.params}`);
  });
}

