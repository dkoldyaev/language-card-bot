import { EventEmitter } from 'events';
import { IBroker, EventHandler } from '@ecb/shared';

/**
 * MockBroker — in-process EventEmitter реализующий IBroker.
 *
 * Используется вместо RabbitMQ/Kafka в dev-режиме.
 * Все события логируются в консоль с префиксом [BROKER].
 *
 * TODO: Заменить на реальный транспорт (RabbitMQ / NATS) при переходе к prod.
 */
class MockBroker implements IBroker {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Увеличиваем лимит слушателей, т.к. сервисов может быть много
    this.emitter.setMaxListeners(50);
  }

  publish<T>(topic: string, payload: T): void {
    console.log(`[BROKER] ▶ publish  [${topic}]`, JSON.stringify(payload));
    // setImmediate делает доставку асинхронной (эмулирует сетевой транспорт)
    setImmediate(() => {
      this.emitter.emit(topic, payload);
    });
  }

  subscribe<T>(topic: string, handler: EventHandler<T>): void {
    console.log(`[BROKER] 🔔 subscribe [${topic}]`);
    this.emitter.on(topic, async (payload: T) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[BROKER] ❌ error in handler for [${topic}]:`, err);
      }
    });
  }
}

// Singleton — все пакеты используют один экземпляр брокера
let _instance: MockBroker | null = null;

export function getBroker(): IBroker {
  if (!_instance) {
    _instance = new MockBroker();
    console.log('[BROKER] 🚀 MockBroker initialized (in-process EventEmitter)');
  }
  return _instance;
}

export type { IBroker } from '@ecb/shared';
