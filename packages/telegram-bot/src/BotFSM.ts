import {
  Language,
  CefrLevel,
  DialogState,
  Word,
  WordStatus,
} from '@ecb/shared';
import { MockTelegramClient, InlineButton } from './MockTelegramClient';
import { CoreServiceAdapter } from './CoreServiceAdapter';

/**
 * BotFSM — конечный автомат диалога Telegram-бота.
 *
 * Каждый метод handle*() соответствует состоянию из user-flow.txt.
 * Все переходы между состояниями описаны явно через DialogState.
 *
 * Структура:
 *   handleMessage()      — входящие текстовые сообщения
 *   handleCallback()     — нажатия на inline-кнопки
 *   send*()              — методы рендеринга конкретного экрана
 */
export class BotFSM {
  constructor(
    private readonly tg: MockTelegramClient,
    private readonly core: CoreServiceAdapter
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Entry point: текстовое сообщение от пользователя
  // ──────────────────────────────────────────────────────────────────────────
  async handleMessage(chatId: string, text: string): Promise<void> {
    const user = await this.core.findOrCreateUser(chatId);
    const state = await this.core.getDialogState(user.id);

    if (text === '/start') {
      await this.core.setDialogState(user.id, DialogState.WELCOME);
      return this.sendWelcome(chatId);
    }

    switch (state) {
      case DialogState.ADD_WORDS:
        return this.handleAddWords(chatId, user.id, text);
      case DialogState.EDIT_DEFINITION:
        return this.handleEditDefinitionText(chatId, user.id, text);
      case DialogState.EDIT_TRANSLATION:
        return this.handleEditTranslationText(chatId, user.id, text);
      default:
        // В остальных состояниях текст не обрабатываем — показываем текущий экран
        return this.sendWelcome(chatId);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Entry point: нажатие кнопки (callback_data)
  // ──────────────────────────────────────────────────────────────────────────
  async handleCallback(chatId: string, callbackData: string, queryId: string): Promise<void> {
    const user = await this.core.findOrCreateUser(chatId);
    this.tg.answerCallbackQuery(queryId);

    const [action, ...args] = callbackData.split(':');

    switch (action) {
      // ── Навигация ──────────────────────────────────────────────────────
      case 'nav_settings':
        await this.core.setDialogState(user.id, DialogState.SETTINGS);
        return this.sendSettings(chatId);

      case 'nav_dictionary':
        await this.core.setDialogState(user.id, DialogState.DICTIONARY);
        return this.sendDictionary(chatId);

      case 'nav_quiz':
        await this.core.setDialogState(user.id, DialogState.QUIZ);
        return this.sendQuizStub(chatId);

      case 'nav_welcome':
        await this.core.setDialogState(user.id, DialogState.WELCOME);
        return this.sendWelcome(chatId);

      // ── Settings ───────────────────────────────────────────────────────
      case 'set_base_lang':
        await this.core.setDialogState(user.id, DialogState.SET_BASE_LANGUAGE);
        return this.sendSetBaseLanguage(chatId);

      case 'set_learned_lang':
        await this.core.setDialogState(user.id, DialogState.SET_LEARNED_LANGUAGE);
        return this.sendSetLearnedLanguage(chatId);

      case 'set_level':
        await this.core.setDialogState(user.id, DialogState.SET_LEVEL);
        return this.sendSetLevel(chatId);

      case 'pick_base_lang': {
        const lang = args[0] as Language;
        await this.core.updateSettings(user.id, { baseLanguage: lang });
        await this.core.setDialogState(user.id, DialogState.SETTINGS);
        return this.sendSettings(chatId);
      }

      case 'pick_learned_lang': {
        const lang = args[0] as Language;
        await this.core.updateSettings(user.id, { learnedLanguage: lang });
        await this.core.setDialogState(user.id, DialogState.SETTINGS);
        return this.sendSettings(chatId);
      }

      case 'pick_level': {
        const level = args[0] as CefrLevel;
        await this.core.updateSettings(user.id, { level });
        await this.core.setDialogState(user.id, DialogState.SETTINGS);
        return this.sendSettings(chatId);
      }

      // ── Dictionary ─────────────────────────────────────────────────────
      case 'dict_add_words':
        await this.core.setDialogState(user.id, DialogState.ADD_WORDS);
        return this.sendAddWords(chatId);

      case 'dict_edit':
        await this.core.setDialogState(user.id, DialogState.EDIT_DICTIONARY);
        return this.sendEditDictionary(chatId, user.id);

      // ── Word received status ───────────────────────────────────────────
      case 'word_status':
        // Нажали на кнопку статуса конкретного слова — ничего не делаем
        return;

      // ── Edit dictionary ────────────────────────────────────────────────
      case 'edit_word': {
        const wordId = args[0];
        await this.core.setDialogContext(user.id, { wordId });
        await this.core.setDialogState(user.id, DialogState.EDIT_WORD);
        return this.sendEditWord(chatId, user.id, wordId);
      }

      case 'delete_word_confirm': {
        await this.core.setDialogState(user.id, DialogState.CONFIRM_DELETE_WORD);
        return this.sendConfirmDelete(chatId, user.id);
      }

      case 'delete_word_yes': {
        const ctx = await this.core.getDialogContext(user.id);
        const wordId = ctx.wordId as string;
        await this.core.deleteWord(user.id, wordId);
        await this.core.setDialogContext(user.id, {});
        await this.core.setDialogState(user.id, DialogState.EDIT_DICTIONARY);
        return this.sendEditDictionary(chatId, user.id);
      }

      case 'edit_definition': {
        const [wordId, defId] = args;
        await this.core.setDialogContext(user.id, { wordId, defId });
        await this.core.setDialogState(user.id, DialogState.EDIT_DEFINITION);
        return this.sendEditDefinition(chatId, user.id, wordId, defId);
      }

      case 'edit_translation': {
        const [wordId, defId] = args;
        await this.core.setDialogContext(user.id, { wordId, defId });
        await this.core.setDialogState(user.id, DialogState.EDIT_TRANSLATION);
        return this.sendEditTranslation(chatId, user.id, wordId, defId);
      }

      default:
        console.warn(`[BotFSM] Unknown callback action: "${action}"`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Обработчики текстового ввода в конкретных состояниях
  // ──────────────────────────────────────────────────────────────────────────

  private async handleAddWords(chatId: string, userId: string, text: string): Promise<void> {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) return;

    const results: Array<{ text: string; word?: Word; duplicate: boolean }> = [];

    for (const line of lines) {
      try {
        const word = await this.core.addWord(userId, line);
        results.push({ text: line, word, duplicate: false });
      } catch (err: unknown) {
        // 409 — слово уже существует
        const isDuplicate = err instanceof Error && err.message.includes('409');
        results.push({ text: line, duplicate: isDuplicate });
      }
    }

    await this.core.setDialogState(userId, DialogState.WORDS_RECEIVED);
    return this.sendWordsReceived(chatId, results);
  }

  private async handleEditDefinitionText(
    chatId: string,
    userId: string,
    newText: string
  ): Promise<void> {
    const ctx = await this.core.getDialogContext(userId);
    const { wordId, defId } = ctx as { wordId: string; defId: string };
    await this.core.updateDefinition(userId, wordId, defId, { text: newText });
    await this.core.setDialogState(userId, DialogState.EDIT_DEFINITION);
    return this.sendEditDefinition(chatId, userId, wordId, defId);
  }

  private async handleEditTranslationText(
    chatId: string,
    userId: string,
    newTranslation: string
  ): Promise<void> {
    const ctx = await this.core.getDialogContext(userId);
    const { wordId, defId } = ctx as { wordId: string; defId: string };
    await this.core.updateDefinition(userId, wordId, defId, { translation: newTranslation });
    await this.core.setDialogState(userId, DialogState.EDIT_TRANSLATION);
    return this.sendEditTranslation(chatId, userId, wordId, defId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Рендеринг экранов (send*)
  // ──────────────────────────────────────────────────────────────────────────

  sendWelcome(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '👋 <b>Добро пожаловать!</b>\nВыберите раздел:',
      buttons: [
        [btn('⚙️ Настройки', 'nav_settings'), btn('📖 Словарь', 'nav_dictionary')],
        [btn('🎯 Тренировка', 'nav_quiz')],
      ],
    });
  }

  sendSettings(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '⚙️ <b>Настройки</b>',
      buttons: [
        [btn('🌐 Родной язык', 'set_base_lang'), btn('📚 Изучаемый язык', 'set_learned_lang')],
        [btn('📊 Уровень', 'set_level')],
        [btn('📖 Словарь', 'nav_dictionary'), btn('🎯 Тренировка', 'nav_quiz')],
        [btn('← Назад', 'nav_welcome')],
      ],
    });
  }

  sendSetBaseLanguage(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '🌐 Выберите <b>родной язык</b>:',
      buttons: [
        ...languageButtons('pick_base_lang'),
        [btn('← Назад', 'nav_settings')],
      ],
    });
  }

  sendSetLearnedLanguage(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '📚 Выберите <b>изучаемый язык</b>:',
      buttons: [
        ...languageButtons('pick_learned_lang'),
        [btn('← Назад', 'nav_settings')],
      ],
    });
  }

  sendSetLevel(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '📊 Выберите <b>уровень</b>:',
      buttons: [
        Object.values(CefrLevel).map((l) => btn(l, `pick_level:${l}`)),
        [btn('← Назад', 'nav_settings')],
      ],
    });
  }

  sendDictionary(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '📖 <b>Словарь</b>',
      buttons: [
        [btn('➕ Добавить слова', 'dict_add_words'), btn('✏️ Редактировать', 'dict_edit')],
        [btn('🎯 Тренировка', 'nav_quiz'), btn('⚙️ Настройки', 'nav_settings')],
        [btn('← Назад', 'nav_welcome')],
      ],
    });
  }

  sendAddWords(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text:
        '➕ <b>Добавление слов</b>\n\nОтправьте слова (каждое с новой строки).\nПример:\napple\nbanana\ncherry',
      buttons: [[btn('← Назад', 'nav_dictionary')]],
    });
  }

  sendWordsReceived(
    chatId: string,
    results: Array<{ text: string; word?: Word; duplicate: boolean }>
  ): void {
    const text =
      '✅ <b>Слова получены</b>\n\n' +
      results
        .map((r) => {
          const icon = r.duplicate ? '⚠️' : statusIcon(r.word?.status ?? WordStatus.Pending);
          const defInfo = r.word
            ? ` (${r.word.definitions.length}/${r.word.definitions.length} опр.)`
            : '';
          return `${icon} ${r.text}${defInfo}${r.duplicate ? ' — уже в словаре' : ''}`;
        })
        .join('\n');

    const wordButtons: InlineButton[][] = results
      .filter((r) => r.word)
      .map((r) => [btn(`${r.text}`, `word_status:${r.word!.id}`)]);

    this.tg.sendMessage({
      chatId,
      text,
      buttons: [...wordButtons, [btn('← В словарь', 'nav_dictionary')]],
    });
  }

  async sendEditDictionary(chatId: string, userId: string): Promise<void> {
    const words = await this.core.getWords(userId);
    const text =
      words.length === 0
        ? '📖 <b>Ваш словарь пуст</b>\n\nДобавьте слова через кнопку ниже.'
        : '📖 <b>Ваш словарь</b>\n\nВыберите слово для редактирования:';

    const wordButtons: InlineButton[][] = words.map((w) => [
      btn(
        `${statusIcon(w.status)} ${w.text} (${w.definitions.filter((d) => d.translationStatus === WordStatus.Ready).length}/${w.definitions.length})`,
        `edit_word:${w.id}`
      ),
    ]);

    this.tg.sendMessage({
      chatId,
      text,
      buttons: [
        ...wordButtons,
        [btn('← В словарь', 'nav_dictionary')],
      ],
    });
  }

  async sendEditWord(chatId: string, userId: string, wordId: string): Promise<void> {
    const words = await this.core.getWords(userId);
    const word = words.find((w) => w.id === wordId);
    if (!word) {
      return this.sendEditDictionary(chatId, userId);
    }

    const defLines = word.definitions
      .map((d, i) => `${i + 1}. ${d.text}\n   → ${d.translation || '…'}`)
      .join('\n\n');

    const text = `✏️ <b>${word.text}</b>\nПеревод: ${word.translation || '…'}\n\n${defLines || 'Определения загружаются…'}`;

    const defButtons: InlineButton[][] = word.definitions.map((d, i) => [
      btn(`Определение ${i + 1}`, `edit_definition:${wordId}:${d.id}`),
    ]);

    this.tg.sendMessage({
      chatId,
      text,
      buttons: [
        [btn('🗑️ Удалить слово', 'delete_word_confirm')],
        ...defButtons,
        [btn('← Назад', 'dict_edit')],
      ],
    });
  }

  async sendConfirmDelete(chatId: string, userId: string): Promise<void> {
    const ctx = await this.core.getDialogContext(userId);
    const words = await this.core.getWords(userId);
    const word = words.find((w) => w.id === ctx.wordId);
    this.tg.sendMessage({
      chatId,
      text: `🗑️ Удалить слово <b>"${word?.text ?? '?'}"</b>?\nЭто действие необратимо.`,
      buttons: [
        [btn('✅ Да, удалить', 'delete_word_yes'), btn('← Назад', `edit_word:${ctx.wordId}`)],
      ],
    });
  }

  async sendEditDefinition(
    chatId: string,
    userId: string,
    wordId: string,
    defId: string
  ): Promise<void> {
    const words = await this.core.getWords(userId);
    const word = words.find((w) => w.id === wordId);
    const def = word?.definitions.find((d) => d.id === defId);
    if (!word || !def) return;

    const isLoading = def.translationStatus !== WordStatus.Ready;

    this.tg.sendMessage({
      chatId,
      text:
        `📝 <b>Определение:</b>\n${def.text}\n\n` +
        `📌 <b>Перевод:</b> ${def.translation || '…'}`,
      buttons: [
        [
          btn('✏️ Изменить текст', `edit_definition:${wordId}:${defId}`),
          isLoading
            ? btn('⏳ Перевод загружается…', 'noop')
            : btn('🔄 Изменить перевод', `edit_translation:${wordId}:${defId}`),
        ],
        [btn('← Назад', `edit_word:${wordId}`)],
      ],
    });
  }

  async sendEditTranslation(
    chatId: string,
    userId: string,
    wordId: string,
    defId: string
  ): Promise<void> {
    const words = await this.core.getWords(userId);
    const word = words.find((w) => w.id === wordId);
    const def = word?.definitions.find((d) => d.id === defId);
    if (!word || !def) return;

    this.tg.sendMessage({
      chatId,
      text:
        `🔄 <b>Редактирование перевода</b>\n\n` +
        `Определение: ${def.text}\n` +
        `Текущий перевод: ${def.translation || '…'}\n\n` +
        `Введите новый перевод:`,
      buttons: [[btn('← Назад', `edit_definition:${wordId}:${defId}`)]],
    });
  }

  sendQuizStub(chatId: string): void {
    this.tg.sendMessage({
      chatId,
      text: '🎯 <b>Тренировка</b>\n\n⚙️ Раздел в разработке.',
      buttons: [[btn('← Назад', 'nav_welcome')]],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function btn(text: string, callbackData: string): InlineButton {
  return { text, callbackData };
}

function statusIcon(status: WordStatus): string {
  switch (status) {
    case WordStatus.Ready:
      return '✅';
    case WordStatus.Processing:
      return '⏳';
    case WordStatus.Error:
      return '❌';
    default:
      return '🔄';
  }
}

function languageButtons(actionPrefix: string): InlineButton[][] {
  const languages: Array<[string, Language]> = [
    ['🇷🇺 Русский', Language.Russian],
    ['🇬🇧 English', Language.English],
    ['🇪🇸 Español', Language.Spanish],
    ['🇩🇪 Deutsch', Language.German],
    ['🇫🇷 Français', Language.French],
  ];
  // По 2 кнопки в ряду
  const rows: InlineButton[][] = [];
  for (let i = 0; i < languages.length; i += 2) {
    rows.push(
      languages.slice(i, i + 2).map(([label, lang]) => btn(label, `${actionPrefix}:${lang}`))
    );
  }
  return rows;
}
