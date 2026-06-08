import { getBroker } from '@ecb/broker-mock';
import { UserRepository, WordRepository, WordEnrichmentOrchestrator } from '@ecb/core-service';
// Регистрируем mock-сервисы в том же процессе (monolith-режим)
import { bootstrap as startTranslationService } from '@ecb/translation-service';
import { bootstrap as startDefinitionsService } from '@ecb/definitions-service';
import { MockTelegramClient } from './MockTelegramClient';
import { CoreServiceAdapter } from './CoreServiceAdapter';
import { BotFSM } from './BotFSM';

/**
 * Telegram Bot — точка входа.
 *
 * В dev-режиме:
 *  - Использует shared-репозитории из core-service (monolith)
 *  - MockTelegramClient логирует сообщения в консоль
 *  - Запускает demo-сценарий чтобы показать работу FSM
 *
 * TODO: Подключить реальный Telegram polling/webhook (grammy / telegraf).
 */

async function bootstrap(): Promise<void> {
  // ── Shared infrastructure (monolith-режим) ────────────────────────────────
  const broker = getBroker();
  const users = new UserRepository();
  const words = new WordRepository();
  const orchestrator = new WordEnrichmentOrchestrator(broker, users, words);

  // Регистрируем подписчиков mock-сервисов
  startTranslationService();
  startDefinitionsService();

  // ── Bot layers ─────────────────────────────────────────────────────────────
  const tg = new MockTelegramClient('EnglishCardBot');
  const adapter = new CoreServiceAdapter(users, words, orchestrator);
  const fsm = new BotFSM(tg, adapter);

  console.log('[TelegramBot] 🤖 Bot started in MOCK mode');
  console.log('[TelegramBot] Running demo scenario...\n');

  // ── Demo scenario (имитирует пользовательский сеанс) ─────────────────────
  const CHAT_ID = 'demo-chat-123';

  // 1. /start
  await fsm.handleMessage(CHAT_ID, '/start');

  // 2. Открываем настройки
  await fsm.handleCallback(CHAT_ID, 'nav_settings', 'q1');

  // 3. Меняем изучаемый язык на English
  await fsm.handleCallback(CHAT_ID, 'set_learned_lang', 'q2');
  await fsm.handleCallback(CHAT_ID, `pick_learned_lang:en`, 'q3');

  // 4. Переходим в словарь
  await fsm.handleCallback(CHAT_ID, 'nav_dictionary', 'q4');

  // 5. Добавляем слова
  await fsm.handleCallback(CHAT_ID, 'dict_add_words', 'q5');
  await fsm.handleMessage(CHAT_ID, 'apple\nbanana\ncherry');

  // 6. Ждём пока обогащение отработает (broker async via setImmediate)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Смотрим словарь
  await fsm.handleCallback(CHAT_ID, 'dict_edit', 'q6');

  console.log('\n[TelegramBot] ✅ Demo scenario completed');
  console.log('[TelegramBot] In production, replace MockTelegramClient with real Telegram polling.');
}

bootstrap().catch((err) => {
  console.error('[TelegramBot] Fatal error:', err);
  process.exit(1);
});
