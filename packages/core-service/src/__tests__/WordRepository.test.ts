import { describe, it, expect, beforeEach } from 'vitest';
import { WordRepository } from '../repositories/WordRepository';
import { WordStatus } from '@ecb/shared';

/**
 * Тесты WordRepository
 *
 * Проверяют in-memory хранилище слов:
 * - базовый CRUD
 * - нормализацию текста
 * - пересчёт агрегированного статуса
 * - выброс ошибок при обращении к несуществующим записям
 */
describe('WordRepository', () => {
  let repo: WordRepository;

  beforeEach(() => {
    repo = new WordRepository();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('создаёт слово со статусом Pending', () => {
      const word = repo.create('user-1', 'hello');
      expect(word.text).toBe('hello');
      expect(word.userId).toBe('user-1');
      expect(word.status).toBe(WordStatus.Pending);
      expect(word.translationStatus).toBe(WordStatus.Pending);
      expect(word.translation).toBe('');
      expect(word.definitions).toHaveLength(0);
    });

    it('обрезает пробелы в тексте', () => {
      const word = repo.create('user-1', '  world  ');
      expect(word.text).toBe('world');
    });

    it('присваивает уникальный UUID каждому слову', () => {
      const a = repo.create('user-1', 'apple');
      const b = repo.create('user-1', 'banana');
      expect(a.id).not.toBe(b.id);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('возвращает слово по ID', () => {
      const word = repo.create('user-1', 'test');
      expect(repo.findById(word.id)).toEqual(word);
    });

    it('возвращает undefined для несуществующего ID', () => {
      expect(repo.findById('nonexistent')).toBeUndefined();
    });
  });

  // ── findByUserId ─────────────────────────────────────────────────────────

  describe('findByUserId()', () => {
    it('возвращает только слова нужного пользователя', () => {
      repo.create('user-1', 'apple');
      repo.create('user-1', 'banana');
      repo.create('user-2', 'cherry');

      const words = repo.findByUserId('user-1');
      expect(words).toHaveLength(2);
      expect(words.every((w) => w.userId === 'user-1')).toBe(true);
    });

    it('возвращает пустой массив для пользователя без слов', () => {
      expect(repo.findByUserId('user-999')).toEqual([]);
    });
  });

  // ── findByUserIdAndText ───────────────────────────────────────────────────

  describe('findByUserIdAndText()', () => {
    it('находит слово независимо от регистра', () => {
      const word = repo.create('user-1', 'Hello');
      expect(repo.findByUserIdAndText('user-1', 'hello')).toEqual(word);
      expect(repo.findByUserIdAndText('user-1', 'HELLO')).toEqual(word);
    });

    it('игнорирует пробелы в поисковом запросе', () => {
      const word = repo.create('user-1', 'test');
      expect(repo.findByUserIdAndText('user-1', '  test  ')).toEqual(word);
    });

    it('возвращает undefined для несуществующего текста', () => {
      repo.create('user-1', 'apple');
      expect(repo.findByUserIdAndText('user-1', 'orange')).toBeUndefined();
    });

    it('не путает слова разных пользователей', () => {
      repo.create('user-1', 'run');
      expect(repo.findByUserIdAndText('user-2', 'run')).toBeUndefined();
    });
  });

  // ── updateTranslation ─────────────────────────────────────────────────────

  describe('updateTranslation()', () => {
    it('обновляет перевод и translationStatus → Ready', () => {
      const word = repo.create('user-1', 'run');
      const updated = repo.updateTranslation(word.id, 'бежать');
      expect(updated.translation).toBe('бежать');
      expect(updated.translationStatus).toBe(WordStatus.Ready);
    });

    it('перевод готов, но нет определений → статус Processing', () => {
      const word = repo.create('user-1', 'run');
      const updated = repo.updateTranslation(word.id, 'бежать');
      // нет определений → allDefsReady = false (length === 0)
      expect(updated.status).toBe(WordStatus.Processing);
    });

    it('бросает ошибку для несуществующего wordId', () => {
      expect(() => repo.updateTranslation('bad-id', 'x')).toThrow('Word bad-id not found');
    });
  });

  // ── addDefinitions ────────────────────────────────────────────────────────

  describe('addDefinitions()', () => {
    it('добавляет определения к слову', () => {
      const word = repo.create('user-1', 'run');
      const defs = repo.addDefinitions(word.id, [{ text: 'def 1' }, { text: 'def 2' }]);
      expect(defs).toHaveLength(2);
      expect(repo.findById(word.id)!.definitions).toHaveLength(2);
    });

    it('каждое определение получает уникальный ID и статус Pending', () => {
      const word = repo.create('user-1', 'jump');
      const defs = repo.addDefinitions(word.id, [{ text: 'leap' }]);
      expect(defs[0].id).toBeTruthy();
      expect(defs[0].translationStatus).toBe(WordStatus.Pending);
      expect(defs[0].translation).toBe('');
    });
  });

  // ── updateDefinitionTranslation ───────────────────────────────────────────

  describe('updateDefinitionTranslation()', () => {
    it('обновляет перевод определения и его статус → Ready', () => {
      const word = repo.create('user-1', 'fly');
      const [def] = repo.addDefinitions(word.id, [{ text: 'to move through air' }]);
      repo.updateTranslation(word.id, 'летать');

      const updated = repo.updateDefinitionTranslation(word.id, def.id, 'двигаться по воздуху');
      const updatedDef = updated.definitions.find((d) => d.id === def.id)!;
      expect(updatedDef.translation).toBe('двигаться по воздуху');
      expect(updatedDef.translationStatus).toBe(WordStatus.Ready);
    });

    it('статус слова становится Ready когда всё готово', () => {
      const word = repo.create('user-1', 'fly');
      const [def] = repo.addDefinitions(word.id, [{ text: 'to move through air' }]);
      repo.updateTranslation(word.id, 'летать');
      const updated = repo.updateDefinitionTranslation(word.id, def.id, 'двигаться по воздуху');
      expect(updated.status).toBe(WordStatus.Ready);
    });

    it('бросает ошибку для несуществующего definitionId', () => {
      const word = repo.create('user-1', 'fly');
      expect(() => repo.updateDefinitionTranslation(word.id, 'bad-def', 'x')).toThrow(
        'Definition bad-def not found'
      );
    });
  });

  // ── updateDefinitionText ──────────────────────────────────────────────────

  describe('updateDefinitionText()', () => {
    it('обновляет текст определения', () => {
      const word = repo.create('user-1', 'jump');
      const [def] = repo.addDefinitions(word.id, [{ text: 'original text' }]);
      repo.updateDefinitionText(word.id, def.id, 'new text');
      const updatedDef = repo.findById(word.id)!.definitions[0];
      expect(updatedDef.text).toBe('new text');
    });

    it('бросает ошибку для несуществующего definitionId', () => {
      const word = repo.create('user-1', 'jump');
      expect(() => repo.updateDefinitionText(word.id, 'bad-def', 'x')).toThrow(
        'Definition bad-def not found'
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('удаляет слово из хранилища', () => {
      const word = repo.create('user-1', 'delete-me');
      repo.delete(word.id);
      expect(repo.findById(word.id)).toBeUndefined();
    });

    it('не бросает ошибку при удалении несуществующего ID', () => {
      expect(() => repo.delete('nonexistent')).not.toThrow();
    });
  });

  // ── _recalculateStatus ────────────────────────────────────────────────────

  describe('_recalculateStatus (через публичные методы)', () => {
    it('статус Processing когда перевод готов, но определения ещё нет', () => {
      const word = repo.create('user-1', 'test');
      const updated = repo.updateTranslation(word.id, 'тест');
      expect(updated.status).toBe(WordStatus.Processing);
    });

    it('статус Processing когда определения есть, но перевод слова не готов', () => {
      const word = repo.create('user-1', 'test');
      const [def] = repo.addDefinitions(word.id, [{ text: 'def' }]);
      repo.updateDefinitionTranslation(word.id, def.id, 'опр');
      expect(repo.findById(word.id)!.status).toBe(WordStatus.Processing);
    });

    it('статус Ready когда перевод слова и все определения готовы', () => {
      const word = repo.create('user-1', 'test');
      const [def] = repo.addDefinitions(word.id, [{ text: 'def' }]);
      repo.updateTranslation(word.id, 'тест');
      repo.updateDefinitionTranslation(word.id, def.id, 'опр');
      expect(repo.findById(word.id)!.status).toBe(WordStatus.Ready);
    });

    it('статус Processing если хотя бы одно определение из нескольких не готово', () => {
      const word = repo.create('user-1', 'test');
      const [def1, def2] = repo.addDefinitions(word.id, [{ text: 'def1' }, { text: 'def2' }]);
      repo.updateTranslation(word.id, 'тест');
      repo.updateDefinitionTranslation(word.id, def1.id, 'опр1');
      // def2 ещё Pending
      expect(repo.findById(word.id)!.status).toBe(WordStatus.Processing);
    });
  });
});
