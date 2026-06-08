import {
  QuizCard,
  QuizAnswerResult,
  QuizAnswerVerdict,
  QuizAction,
  Word,
  Definition,
} from '@ecb/shared';
import { WordRepository } from '../repositories/WordRepository';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Levenshtein distance — для определения "close match" */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/** Нормализация строки для сравнения (lowercase + trim) */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Перемешать массив (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Выбрать случайный элемент */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Session state (in-memory)
// ─────────────────────────────────────────────────────────────────────────────

interface QuizSessionState {
  userId: string;
  currentWordId: string;
  currentDefinitionId: string;
  /** Показывать ли перевод определения */
  showTranslation: boolean;
  /** Показывать ли варианты ответа */
  showVariants: boolean;
  /** Сгенерированные варианты (кешируются, чтобы не перегенерировать) */
  cachedVariants: string[] | null;
  /** Счётчик правильных ответов за сессию */
  streak: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// QuizService
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Бизнес-логика Quiz-режима.
 *
 * Сессии хранятся in-memory (по одной на userId).
 * TODO: Перенести сессии в Redis при переходе к реальной БД.
 *
 * Алгоритм (по user-flow.txt):
 *  1. start()   — выбирает случайное слово и определение
 *  2. currentCard() — возвращает текущую карточку (без побочных эффектов)
 *  3. answer() — проверяет ответ:
 *       - correct → streak++, клиент показывает emoji «успех» 2 секунды и удаляет, следующая карточка
 *       - close   → остаёмся на карточке; клиент показывает emoji «почти» 2 секунды и удаляет; showVariants не меняем
 *       - wrong   → остаёмся на карточке; клиент показывает emoji «неверно» 2 секунды и удаляет; showVariants не меняем
 *  4. performAction() — обрабатывает действия UI:
 *       - show_variants        → генерирует 5 дистракторов + правильный (action от пользователя)
 *       - translate_definition → открывает перевод
 *       - another_card         → следующее слово, сбрасывает флаги
 *       - another_definition   → другое определение того же слова
 */
export class QuizService {
  private sessions = new Map<string, QuizSessionState>();

  constructor(private readonly words: WordRepository) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Начать или перезапустить квиз для пользователя.
   * @returns первая карточка или null если в словаре нет готовых слов
   */
  start(userId: string): QuizCard | null {
    const session = this._createSession(userId);
    if (!session) return null;
    this.sessions.set(userId, session);
    return this._buildCard(session);
  }

  /**
   * Получить текущую карточку (без изменения состояния).
   * @returns null если сессии нет — нужно вызвать start()
   */
  currentCard(userId: string): QuizCard | null {
    const session = this.sessions.get(userId);
    if (!session) return null;
    return this._buildCard(session);
  }

  /**
   * Принять ответ пользователя.
   */
  answer(userId: string, suggestion: string): QuizAnswerResult | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    const word = this.words.findById(session.currentWordId);
    if (!word) return null;

    const verdict = this._checkAnswer(suggestion, word.text);
    const correctWord = word.text;

    if (verdict === 'correct') {
      session.streak++;
      // Сбрасываем флаги и переходим к следующему слову.
      // Клиент покажет emoji "успех" на 2 секунды и сам переключит UI на nextCard.
      const next = this._advanceToNext(userId);
      return { verdict, correctWord, nextCard: next, streak: session.streak };
    } else {
      // close / wrong:
      // Не меняем showVariants автоматически.
      // Клиент покажет emoji ("почти" / "неверно"),
      // удалит его через 2 секунды и ожидает дальнейшего ответа пользователя.
      return {
        verdict,
        correctWord,
        nextCard: null, // остаёмся на той же карточке
        streak: session.streak,
      };
    }
  }

  /**
   * Обработать действие пользователя на карточке.
   */
  performAction(userId: string, action: QuizAction): QuizCard | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    switch (action) {
      case QuizAction.ShowVariants: {
        if (!session.showVariants) {
          const word = this.words.findById(session.currentWordId);
          if (word) {
            session.showVariants = true;
            session.cachedVariants = this._generateVariants(userId, word);
          }
        }
        break;
      }

      case QuizAction.TranslateDefinition: {
        session.showTranslation = true;
        break;
      }

      case QuizAction.AnotherCard: {
        // Другая карточка (скип) — сбрасываем флаги, следующее слово
        this._advanceToNext(userId);
        break;
      }

      case QuizAction.AnotherDefinition: {
        // Другое определение того же слова (если возможно)
        const word = this.words.findById(session.currentWordId);
        if (word && word.definitions.length > 1) {
          const otherDefs = word.definitions.filter(
            (d) => d.id !== session.currentDefinitionId
          );
          const nextDef = pickRandom(otherDefs);
          session.currentDefinitionId = nextDef.id;
          session.showTranslation = false;
        }
        break;
      }
    }

    return this._buildCard(session);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Создать новую сессию, выбрав случайное слово */
  private _createSession(userId: string): QuizSessionState | null {
    const readyWords = this.words.findByUserId(userId).filter((w) => w.definitions.length > 0);
    if (readyWords.length === 0) return null;

    const word = pickRandom(readyWords);
    const def = pickRandom(word.definitions);

    return {
      userId,
      currentWordId: word.id,
      currentDefinitionId: def.id,
      showTranslation: false,
      showVariants: false,
      cachedVariants: null,
      streak: 0,
    };
  }

  /** Перейти к следующему случайному слову */
  private _advanceToNext(userId: string): QuizCard | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    const readyWords = this.words.findByUserId(userId).filter((w) => w.definitions.length > 0);
    if (readyWords.length === 0) return null;

    const word = pickRandom(readyWords);
    const def = pickRandom(word.definitions);

    session.currentWordId = word.id;
    session.currentDefinitionId = def.id;
    session.showTranslation = false;
    session.showVariants = false;
    session.cachedVariants = null;

    return this._buildCard(session);
  }

  /** Построить QuizCard из состояния сессии */
  private _buildCard(session: QuizSessionState): QuizCard {
    const word = this.words.findById(session.currentWordId);
    const def = word?.definitions.find((d) => d.id === session.currentDefinitionId);

    return {
      sessionId: session.userId,
      wordId: session.currentWordId,
      definitionId: session.currentDefinitionId,
      definitionText: def?.text ?? '',
      definitionTranslation: session.showTranslation ? (def?.translation ?? null) : null,
      variants: session.showVariants ? (session.cachedVariants ?? null) : null,
      streak: session.streak,
    };
  }

  /**
   * Сгенерировать варианты ответа: 5 дистракторов + правильный в случайной позиции.
   * Дистракторы — другие слова пользователя.
   */
  private _generateVariants(userId: string, correctWord: Word): string[] {
    const allWords = this.words.findByUserId(userId);
    const distractors = allWords
      .filter((w) => w.id !== correctWord.id)
      .map((w) => w.text);

    // Берём до 5 дистракторов
    const picked = shuffle(distractors).slice(0, 5);
    // Добавляем правильный и перемешиваем финальный список
    return shuffle([...picked, correctWord.text]);
  }

  /**
   * Проверить ответ пользователя.
   * - correct: точное совпадение (case-insensitive, trim)
   * - close: расстояние Левенштейна ≤ 2 и длина слова > 4
   * - wrong: всё остальное
   */
  private _checkAnswer(suggestion: string, correctText: string): QuizAnswerVerdict {
    const norm = normalize(suggestion);
    const correct = normalize(correctText);

    if (norm === correct) return 'correct';

    const dist = levenshtein(norm, correct);
    const isClose = dist <= 2 && correct.length > 4;
    return isClose ? 'close' : 'wrong';
  }
}
