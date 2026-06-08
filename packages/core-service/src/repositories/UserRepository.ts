import {
  User,
  UserSettings,
  Language,
  CefrLevel,
  DialogState,
} from '@ecb/shared';
import { v4 as uuid } from 'uuid';

const DEFAULT_SETTINGS: UserSettings = {
  baseLanguage: Language.Russian,
  learnedLanguage: Language.English,
  level: CefrLevel.A1,
};

/**
 * UserRepository — in-memory хранилище пользователей.
 *
 * TODO: Заменить на реальную БД (PostgreSQL / MongoDB).
 */
export class UserRepository {
  private readonly store = new Map<string, User>();
  /** Маппинг telegramId → userId */
  private readonly telegramIndex = new Map<string, string>();
  /** Состояние FSM диалога для каждого пользователя */
  private readonly dialogStates = new Map<string, DialogState>();
  /** Произвольный контекст FSM (например, какое слово редактируем) */
  private readonly dialogContext = new Map<string, Record<string, unknown>>();

  findById(id: string): User | undefined {
    return this.store.get(id);
  }

  findByTelegramId(telegramId: string): User | undefined {
    const userId = this.telegramIndex.get(telegramId);
    return userId ? this.store.get(userId) : undefined;
  }

  /**
   * Найти пользователя по telegramId или создать нового.
   * Используется при первом контакте от Telegram Bot.
   */
  findOrCreateByTelegramId(telegramId: string): User {
    let user = this.findByTelegramId(telegramId);
    if (!user) {
      user = this.create({ telegramId });
    }
    return user;
  }

  create(partial: Partial<Pick<User, 'telegramId'>> = {}): User {
    const user: User = {
      id: uuid(),
      telegramId: partial.telegramId,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: new Date(),
    };
    this.store.set(user.id, user);
    if (user.telegramId) {
      this.telegramIndex.set(user.telegramId, user.id);
    }
    console.log(`[UserRepo] Created user ${user.id} (tg: ${user.telegramId ?? 'none'})`);
    return user;
  }

  updateSettings(userId: string, patch: Partial<UserSettings>): User {
    const user = this.store.get(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    Object.assign(user.settings, patch);
    return user;
  }

  getDialogState(userId: string): DialogState {
    return this.dialogStates.get(userId) ?? DialogState.WELCOME;
  }

  setDialogState(userId: string, state: DialogState): void {
    this.dialogStates.set(userId, state);
    console.log(`[UserRepo] DialogState for ${userId}: ${state}`);
  }

  getDialogContext(userId: string): Record<string, unknown> {
    return this.dialogContext.get(userId) ?? {};
  }

  setDialogContext(userId: string, ctx: Record<string, unknown>): void {
    this.dialogContext.set(userId, ctx);
  }

  list(): User[] {
    return Array.from(this.store.values());
  }
}
