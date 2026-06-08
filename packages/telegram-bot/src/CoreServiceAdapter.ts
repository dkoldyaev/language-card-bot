import {
  User,
  Word,
  DialogState,
  UpdateSettingsRequest,
  UpdateDefinitionRequest,
} from '@ecb/shared';
import { UserRepository } from '@ecb/core-service';
import { WordRepository } from '@ecb/core-service';
import { WordEnrichmentOrchestrator } from '@ecb/core-service';

/**
 * CoreServiceAdapter — интерфейс взаимодействия telegram-bot с core-service.
 *
 * В текущей реализации используется прямой вызов репозиториев (monolith-режим).
 *
 * TODO: Заменить на HTTP-клиент (axios / fetch) когда сервисы разделятся на процессы.
 *       Интерфейс ICoreServiceAdapter останется неизменным.
 */

export interface ICoreServiceAdapter {
  findOrCreateUser(telegramId: string): Promise<User>;
  getDialogState(userId: string): Promise<DialogState>;
  setDialogState(userId: string, state: DialogState): Promise<void>;
  getDialogContext(userId: string): Promise<Record<string, unknown>>;
  setDialogContext(userId: string, ctx: Record<string, unknown>): Promise<void>;
  updateSettings(userId: string, patch: UpdateSettingsRequest): Promise<void>;
  getWords(userId: string): Promise<Word[]>;
  addWord(userId: string, text: string): Promise<Word>;
  deleteWord(userId: string, wordId: string): Promise<void>;
  updateDefinition(
    userId: string,
    wordId: string,
    defId: string,
    patch: UpdateDefinitionRequest
  ): Promise<Word>;
}

/**
 * DirectCoreServiceAdapter — реализация ICoreServiceAdapter через прямые вызовы.
 * Используется в dev-режиме когда всё работает в одном процессе.
 */
export class CoreServiceAdapter implements ICoreServiceAdapter {
  constructor(
    private readonly users: UserRepository,
    private readonly words: WordRepository,
    private readonly orchestrator: WordEnrichmentOrchestrator
  ) {}

  async findOrCreateUser(telegramId: string): Promise<User> {
    return this.users.findOrCreateByTelegramId(telegramId);
  }

  async getDialogState(userId: string): Promise<DialogState> {
    return this.users.getDialogState(userId);
  }

  async setDialogState(userId: string, state: DialogState): Promise<void> {
    this.users.setDialogState(userId, state);
  }

  async getDialogContext(userId: string): Promise<Record<string, unknown>> {
    return this.users.getDialogContext(userId);
  }

  async setDialogContext(userId: string, ctx: Record<string, unknown>): Promise<void> {
    this.users.setDialogContext(userId, ctx);
  }

  async updateSettings(userId: string, patch: UpdateSettingsRequest): Promise<void> {
    this.users.updateSettings(userId, patch);
  }

  async getWords(userId: string): Promise<Word[]> {
    return this.words.findByUserId(userId);
  }

  async addWord(userId: string, text: string): Promise<Word> {
    const existing = this.words.findByUserIdAndText(userId, text);
    if (existing) {
      const err = new Error(`409: Word already exists`);
      throw err;
    }
    const word = this.words.create(userId, text);
    this.orchestrator.enrich(word);
    return word;
  }

  async deleteWord(userId: string, wordId: string): Promise<void> {
    const word = this.words.findById(wordId);
    if (!word || word.userId !== userId) throw new Error('Word not found');
    this.words.delete(wordId);
  }

  async updateDefinition(
    userId: string,
    wordId: string,
    defId: string,
    patch: UpdateDefinitionRequest
  ): Promise<Word> {
    let word = this.words.findById(wordId);
    if (!word || word.userId !== userId) throw new Error('Word not found');
    if (patch.text !== undefined) {
      word = this.words.updateDefinitionText(wordId, defId, patch.text);
    }
    if (patch.translation !== undefined) {
      word = this.words.updateDefinitionTranslation(wordId, defId, patch.translation);
    }
    return word;
  }
}
