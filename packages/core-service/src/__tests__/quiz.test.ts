import { describe, it, expect, beforeEach } from 'vitest';
import { WordRepository } from '../repositories/WordRepository';
import { QuizService } from '../services/QuizService';
import { QuizAction } from '@ecb/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const USER_A = 'user-a';
const USER_B = 'user-b';

/** Создаёт слово с двумя готовыми определениями */
function seedWord(words: WordRepository, userId: string, text: string, defs = ['def1', 'def2']) {
  const word = words.create(userId, text);
  words.addDefinitions(word.id, defs.map((t) => ({ text: t })));
  return word;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('QuizService', () => {
  let words: WordRepository;
  let quiz: QuizService;

  beforeEach(() => {
    words = new WordRepository();
    quiz = new QuizService(words);
  });

  // ── start() ───────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('возвращает null если словарь пуст', () => {
      expect(quiz.start(USER_A)).toBeNull();
    });

    it('возвращает null если у слов нет определений', () => {
      words.create(USER_A, 'apple');
      expect(quiz.start(USER_A)).toBeNull();
    });

    it('возвращает карточку если есть слово с определениями', () => {
      seedWord(words, USER_A, 'apple');
      const card = quiz.start(USER_A);
      expect(card).not.toBeNull();
      expect(card!.sessionId).toBe(USER_A);
      expect(card!.definitionText).toBeTruthy();
      expect(card!.variants).toBeNull(); // варианты скрыты по умолчанию
      expect(card!.definitionTranslation).toBeNull(); // перевод скрыт
      expect(card!.streak).toBe(0);
    });

    it('сбрасывает streak при перезапуске', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      quiz.answer(USER_A, 'apple'); // correct → streak++
      quiz.start(USER_A); // перезапуск
      const card = quiz.currentCard(USER_A);
      expect(card!.streak).toBe(0);
    });

    it('изолирует сессии разных пользователей', () => {
      seedWord(words, USER_A, 'apple');
      seedWord(words, USER_B, 'banana');
      quiz.start(USER_A);
      expect(quiz.currentCard(USER_B)).toBeNull(); // у B нет сессии
    });
  });

  // ── currentCard() ─────────────────────────────────────────────────────────

  describe('currentCard()', () => {
    it('возвращает null если нет активной сессии', () => {
      expect(quiz.currentCard(USER_A)).toBeNull();
    });

    it('возвращает ту же карточку при повторном вызове', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      const c1 = quiz.currentCard(USER_A);
      const c2 = quiz.currentCard(USER_A);
      expect(c1!.definitionId).toBe(c2!.definitionId);
    });
  });

  // ── answer() ──────────────────────────────────────────────────────────────

  describe('answer()', () => {
    it('возвращает null если нет активной сессии', () => {
      expect(quiz.answer(USER_A, 'apple')).toBeNull();
    });

    it('correct — при точном совпадении (case-insensitive)', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, 'Apple');
      expect(result).not.toBeNull();
      expect(result!.verdict).toBe('correct');
      expect(result!.correctWord).toBe('apple');
      expect(result!.streak).toBe(1);
    });

    it('correct — с лишними пробелами', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, '  apple  ');
      expect(result!.verdict).toBe('correct');
    });

    it('correct — переходит на следующую карточку', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, 'apple');
      expect(result!.nextCard).not.toBeNull();
    });

    it('wrong — не переходит на следующую карточку', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, 'banana');
      expect(result!.verdict).toBe('wrong');
      expect(result!.nextCard).toBeNull();
      expect(result!.streak).toBe(0);
    });

    it('wrong — НЕ активирует варианты автоматически', () => {
      seedWord(words, USER_A, 'apple');
      quiz.start(USER_A);
      quiz.answer(USER_A, 'wrong');
      const card = quiz.currentCard(USER_A);
      // showVariants не меняется — пользователь сам нажмёт show_variants
      expect(card!.variants).toBeNull();
    });

    it('close — для опечатки в длинном слове', () => {
      seedWord(words, USER_A, 'serendipity'); // 11 букв
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, 'serendipiti'); // 1 ошибка
      expect(result!.verdict).toBe('close');
      expect(result!.nextCard).toBeNull(); // остаёмся
    });

    it('wrong (не close) — для короткого слова с опечаткой', () => {
      seedWord(words, USER_A, 'cat'); // 3 буквы → close не применяется
      quiz.start(USER_A);
      const result = quiz.answer(USER_A, 'cut');
      expect(result!.verdict).toBe('wrong');
    });

    it('streak растёт с каждым правильным ответом', () => {
      seedWord(words, USER_A, 'alpha');
      quiz.start(USER_A);
      quiz.answer(USER_A, 'alpha');
      quiz.answer(USER_A, 'alpha');
      const card = quiz.currentCard(USER_A);
      expect(card!.streak).toBe(2);
    });
  });

  // ── performAction() ───────────────────────────────────────────────────────

  describe('performAction()', () => {
    it('возвращает null если нет активной сессии', () => {
      expect(quiz.performAction(USER_A, QuizAction.ShowVariants)).toBeNull();
    });

    describe('show_variants', () => {
      it('раскрывает варианты ответа', () => {
        seedWord(words, USER_A, 'apple');
        quiz.start(USER_A);
        const card = quiz.performAction(USER_A, QuizAction.ShowVariants)!;
        expect(card.variants).not.toBeNull();
        expect(card.variants!).toContain('apple'); // правильный в списке
      });

      it('варианты содержат правильный ответ', () => {
        for (let i = 0; i < 10; i++) seedWord(words, USER_A, `word${i}`);
        quiz.start(USER_A);
        const session_card = quiz.currentCard(USER_A)!;
        const correctWord = words.findById(session_card.wordId)!.text;
        const card = quiz.performAction(USER_A, QuizAction.ShowVariants)!;
        expect(card.variants!).toContain(correctWord);
      });

      it('не изменяет варианты при повторном нажатии', () => {
        seedWord(words, USER_A, 'apple');
        quiz.start(USER_A);
        const card1 = quiz.performAction(USER_A, QuizAction.ShowVariants)!;
        const card2 = quiz.performAction(USER_A, QuizAction.ShowVariants)!;
        expect(card1.variants).toEqual(card2.variants);
      });
    });

    describe('translate_definition', () => {
      it('раскрывает перевод определения', () => {
        const word = words.create(USER_A, 'apple');
        words.addDefinitions(word.id, [{ text: 'a fruit' }]);
        words.updateDefinitionTranslation(word.id, words.findById(word.id)!.definitions[0].id, 'фрукт');
        quiz.start(USER_A);
        const card = quiz.performAction(USER_A, QuizAction.TranslateDefinition)!;
        expect(card.definitionTranslation).toBe('фрукт');
      });
    });

    describe('another_card', () => {
      it('переходит к новой карточке', () => {
        seedWord(words, USER_A, 'apple');
        quiz.start(USER_A);
        const before = quiz.currentCard(USER_A)!;
        quiz.performAction(USER_A, QuizAction.AnotherCard);
        const after = quiz.currentCard(USER_A)!;
        // Карточки могут быть теми же (одно слово), но флаги должны сброситься
        expect(after.variants).toBeNull();
        expect(after.definitionTranslation).toBeNull();
      });
    });

    describe('another_definition', () => {
      it('переключает на другое определение того же слова', () => {
        const word = words.create(USER_A, 'apple');
        words.addDefinitions(word.id, [{ text: 'def A' }, { text: 'def B' }]);
        quiz.start(USER_A);
        const before = quiz.currentCard(USER_A)!;
        quiz.performAction(USER_A, QuizAction.AnotherDefinition);
        const after = quiz.currentCard(USER_A)!;
        // Слово то же, определение (возможно) другое
        expect(after.wordId).toBe(before.wordId);
      });

      it('сбрасывает перевод при смене определения', () => {
        const word = words.create(USER_A, 'apple');
        words.addDefinitions(word.id, [{ text: 'def A' }, { text: 'def B' }]);
        quiz.start(USER_A);
        quiz.performAction(USER_A, QuizAction.TranslateDefinition);
        quiz.performAction(USER_A, QuizAction.AnotherDefinition);
        const card = quiz.currentCard(USER_A)!;
        expect(card.definitionTranslation).toBeNull();
      });
    });
  });
});
