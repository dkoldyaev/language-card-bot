import { Word, WordStatus, Definition } from '@ecb/shared';
import { v4 as uuid } from 'uuid';

/**
 * WordRepository — in-memory хранилище слов пользователей.
 *
 * TODO: Заменить на реальную БД (PostgreSQL / MongoDB).
 */
export class WordRepository {
  private readonly store = new Map<string, Word>();

  findById(id: string): Word | undefined {
    return this.store.get(id);
  }

  findByUserId(userId: string): Word[] {
    return Array.from(this.store.values()).filter((w) => w.userId === userId);
  }

  findByUserIdAndText(userId: string, text: string): Word | undefined {
    const normalized = text.trim().toLowerCase();
    return Array.from(this.store.values()).find(
      (w) => w.userId === userId && w.text.toLowerCase() === normalized
    );
  }

  create(userId: string, text: string): Word {
    const word: Word = {
      id: uuid(),
      userId,
      text: text.trim(),
      translation: '',
      translationStatus: WordStatus.Pending,
      definitions: [],
      status: WordStatus.Pending,
      createdAt: new Date(),
    };
    this.store.set(word.id, word);
    console.log(`[WordRepo] Created word "${word.text}" (${word.id}) for user ${userId}`);
    return word;
  }

  updateTranslation(wordId: string, translation: string): Word {
    const word = this._getOrThrow(wordId);
    word.translation = translation;
    word.translationStatus = WordStatus.Ready;
    this._recalculateStatus(word);
    return word;
  }

  addDefinitions(wordId: string, defs: Array<{ text: string }>): Definition[] {
    const word = this._getOrThrow(wordId);
    const created: Definition[] = defs.map((d) => ({
      id: uuid(),
      text: d.text,
      translation: '',
      translationStatus: WordStatus.Pending,
    }));
    word.definitions.push(...created);
    this._recalculateStatus(word);
    return created;
  }

  updateDefinitionTranslation(wordId: string, definitionId: string, translation: string): Word {
    const word = this._getOrThrow(wordId);
    const def = word.definitions.find((d) => d.id === definitionId);
    if (!def) throw new Error(`Definition ${definitionId} not found in word ${wordId}`);
    def.translation = translation;
    def.translationStatus = WordStatus.Ready;
    this._recalculateStatus(word);
    return word;
  }

  updateDefinitionText(wordId: string, definitionId: string, text: string): Word {
    const word = this._getOrThrow(wordId);
    const def = word.definitions.find((d) => d.id === definitionId);
    if (!def) throw new Error(`Definition ${definitionId} not found in word ${wordId}`);
    def.text = text;
    return word;
  }

  delete(wordId: string): void {
    this.store.delete(wordId);
    console.log(`[WordRepo] Deleted word ${wordId}`);
  }

  private _getOrThrow(wordId: string): Word {
    const word = this.store.get(wordId);
    if (!word) throw new Error(`Word ${wordId} not found`);
    return word;
  }

  /** Пересчитать агрегированный статус слова */
  private _recalculateStatus(word: Word): void {
    const translationReady = word.translationStatus === WordStatus.Ready;
    const allDefsReady =
      word.definitions.length > 0 &&
      word.definitions.every((d) => d.translationStatus === WordStatus.Ready);
    word.status =
      translationReady && allDefsReady ? WordStatus.Ready : WordStatus.Processing;
  }
}
