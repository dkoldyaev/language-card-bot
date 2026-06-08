import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from '../repositories/UserRepository';
import { Language, CefrLevel, DialogState } from '@ecb/shared';

/**
 * Тесты UserRepository
 *
 * Проверяют in-memory хранилище пользователей:
 * - создание и поиск пользователей
 * - индекс по telegramId
 * - идемпотентный findOrCreate
 * - обновление настроек (partial patch)
 * - FSM-состояния диалога и контекст
 */
describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('создаёт пользователя с дефолтными настройками', () => {
      const user = repo.create();
      expect(user.id).toBeTruthy();
      expect(user.settings.baseLanguage).toBe(Language.Russian);
      expect(user.settings.learnedLanguage).toBe(Language.English);
      expect(user.settings.level).toBe(CefrLevel.A1);
    });

    it('сохраняет telegramId и строит индекс', () => {
      const user = repo.create({ telegramId: '123456' });
      expect(user.telegramId).toBe('123456');
      expect(repo.findByTelegramId('123456')).toEqual(user);
    });

    it('создаёт пользователя без telegramId', () => {
      const user = repo.create({});
      expect(user.telegramId).toBeUndefined();
    });

    it('каждый пользователь получает уникальный UUID', () => {
      const a = repo.create();
      const b = repo.create();
      expect(a.id).not.toBe(b.id);
    });

    it('настройки разных пользователей не ссылаются на один объект', () => {
      const a = repo.create();
      const b = repo.create();
      a.settings.level = CefrLevel.C1;
      expect(b.settings.level).toBe(CefrLevel.A1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('находит пользователя по ID', () => {
      const user = repo.create();
      expect(repo.findById(user.id)).toEqual(user);
    });

    it('возвращает undefined для несуществующего ID', () => {
      expect(repo.findById('bad-id')).toBeUndefined();
    });
  });

  // ── findByTelegramId ──────────────────────────────────────────────────────

  describe('findByTelegramId()', () => {
    it('находит пользователя по telegramId', () => {
      const user = repo.create({ telegramId: 'tg-99' });
      expect(repo.findByTelegramId('tg-99')).toEqual(user);
    });

    it('возвращает undefined для неизвестного telegramId', () => {
      expect(repo.findByTelegramId('unknown')).toBeUndefined();
    });
  });

  // ── findOrCreateByTelegramId ──────────────────────────────────────────────

  describe('findOrCreateByTelegramId()', () => {
    it('создаёт нового пользователя при первом вызове', () => {
      const user = repo.findOrCreateByTelegramId('new-tg');
      expect(user).toBeDefined();
      expect(user.telegramId).toBe('new-tg');
    });

    it('возвращает того же пользователя при повторном вызове (идемпотентность)', () => {
      const first = repo.findOrCreateByTelegramId('same-tg');
      const second = repo.findOrCreateByTelegramId('same-tg');
      expect(first.id).toBe(second.id);
    });

    it('не создаёт дублей — list() содержит одного пользователя', () => {
      repo.findOrCreateByTelegramId('dup-tg');
      repo.findOrCreateByTelegramId('dup-tg');
      const all = repo.list();
      expect(all.filter((u) => u.telegramId === 'dup-tg')).toHaveLength(1);
    });
  });

  // ── updateSettings ────────────────────────────────────────────────────────

  describe('updateSettings()', () => {
    it('применяет частичное обновление (partial patch)', () => {
      const user = repo.create();
      repo.updateSettings(user.id, { level: CefrLevel.B2 });
      const updated = repo.findById(user.id)!;
      expect(updated.settings.level).toBe(CefrLevel.B2);
      expect(updated.settings.baseLanguage).toBe(Language.Russian); // не изменился
    });

    it('можно обновить все три поля сразу', () => {
      const user = repo.create();
      repo.updateSettings(user.id, {
        baseLanguage: Language.German,
        learnedLanguage: Language.Spanish,
        level: CefrLevel.C2,
      });
      const updated = repo.findById(user.id)!.settings;
      expect(updated.baseLanguage).toBe(Language.German);
      expect(updated.learnedLanguage).toBe(Language.Spanish);
      expect(updated.level).toBe(CefrLevel.C2);
    });

    it('бросает ошибку для несуществующего userId', () => {
      expect(() => repo.updateSettings('bad-id', { level: CefrLevel.A2 })).toThrow(
        'User bad-id not found'
      );
    });
  });

  // ── FSM: dialogState ──────────────────────────────────────────────────────

  describe('getDialogState() / setDialogState()', () => {
    it('по умолчанию возвращает WELCOME', () => {
      const user = repo.create();
      expect(repo.getDialogState(user.id)).toBe(DialogState.WELCOME);
    });

    it('сохраняет и возвращает установленное состояние', () => {
      const user = repo.create();
      repo.setDialogState(user.id, DialogState.DICTIONARY);
      expect(repo.getDialogState(user.id)).toBe(DialogState.DICTIONARY);
    });

    it('состояния разных пользователей независимы', () => {
      const a = repo.create();
      const b = repo.create();
      repo.setDialogState(a.id, DialogState.SETTINGS);
      repo.setDialogState(b.id, DialogState.ADD_WORDS);
      expect(repo.getDialogState(a.id)).toBe(DialogState.SETTINGS);
      expect(repo.getDialogState(b.id)).toBe(DialogState.ADD_WORDS);
    });
  });

  // ── FSM: dialogContext ────────────────────────────────────────────────────

  describe('getDialogContext() / setDialogContext()', () => {
    it('по умолчанию возвращает пустой объект', () => {
      const user = repo.create();
      expect(repo.getDialogContext(user.id)).toEqual({});
    });

    it('сохраняет и возвращает контекст', () => {
      const user = repo.create();
      repo.setDialogContext(user.id, { wordId: 'abc-123', step: 2 });
      expect(repo.getDialogContext(user.id)).toEqual({ wordId: 'abc-123', step: 2 });
    });

    it('перезаписывает контекст при повторном вызове', () => {
      const user = repo.create();
      repo.setDialogContext(user.id, { wordId: 'old' });
      repo.setDialogContext(user.id, { wordId: 'new' });
      expect(repo.getDialogContext(user.id)).toEqual({ wordId: 'new' });
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('возвращает всех созданных пользователей', () => {
      repo.create();
      repo.create();
      repo.create();
      expect(repo.list()).toHaveLength(3);
    });

    it('возвращает пустой массив если пользователей нет', () => {
      expect(repo.list()).toEqual([]);
    });
  });
});
