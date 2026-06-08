import express from 'express';
import { getBroker } from '@ecb/broker-mock';
import { UserRepository } from './repositories/UserRepository';
import { WordRepository } from './repositories/WordRepository';
import { WordEnrichmentOrchestrator } from './services/WordEnrichmentOrchestrator';
import { createRouter } from './api/router';

// ── Экспорт строительных блоков для monolith-режима ─────────────────────────
// telegram-bot и другие пакеты импортируют классы напрямую,
// не запуская HTTP сервер.
export { UserRepository } from './repositories/UserRepository';
export { WordRepository } from './repositories/WordRepository';
export { WordEnrichmentOrchestrator } from './services/WordEnrichmentOrchestrator';
export { QuizService } from './services/QuizService';
export { createRouter } from './api/router';


// ── Standalone HTTP сервер (запускается только через `npm run dev`) ──────────
const PORT = process.env.CORE_PORT ? parseInt(process.env.CORE_PORT, 10) : 3001;

async function bootstrap(): Promise<void> {
  const broker = getBroker();
  const users = new UserRepository();
  const words = new WordRepository();
  const orchestrator = new WordEnrichmentOrchestrator(broker, users, words);

  const app = express();
  app.use(express.json());
  app.use('/', createRouter(users, words, orchestrator));

  app.listen(PORT, () => {
    console.log(`[CoreService] 🚀 Listening on http://localhost:${PORT}`);
    console.log(`[CoreService]    Health: http://localhost:${PORT}/health`);
  });
}

// Запускаем HTTP сервер только если этот файл вызван напрямую
if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[CoreService] Fatal startup error:', err);
    process.exit(1);
  });
}
