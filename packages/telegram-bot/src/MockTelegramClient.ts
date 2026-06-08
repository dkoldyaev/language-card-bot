/**
 * MockTelegramClient
 *
 * Заглушка Telegram Bot API.
 * Все исходящие сообщения логируются в консоль вместо реальной отправки.
 *
 * TODO: Заменить на реальный вызов Telegram Bot API (node-telegram-bot-api / grammy / telegraf).
 */

export interface InlineButton {
  text: string;
  callbackData: string;
}

export interface SendMessageOptions {
  chatId: string;
  text: string;
  buttons?: InlineButton[][];  // массив рядов кнопок
}

export class MockTelegramClient {
  private readonly botName: string;

  constructor(botName = 'MockBot') {
    this.botName = botName;
    console.log(`[${this.botName}] 🤖 MockTelegramClient initialized`);
  }

  sendMessage(opts: SendMessageOptions): void {
    const buttons = opts.buttons
      ? opts.buttons
          .map((row) => `  [${row.map((b) => b.text).join('] [')}]`)
          .join('\n')
      : '';
    console.log(
      `\n[${this.botName}] ─── MESSAGE to chat ${opts.chatId} ───\n` +
        `${opts.text}\n` +
        (buttons ? `Buttons:\n${buttons}\n` : '') +
        `────────────────────────────────────`
    );
  }

  editMessage(opts: SendMessageOptions & { messageId: number }): void {
    const buttons = opts.buttons
      ? opts.buttons
          .map((row) => `  [${row.map((b) => b.text).join('] [')}]`)
          .join('\n')
      : '';
    console.log(
      `\n[${this.botName}] ─── EDIT MSG #${opts.messageId} in chat ${opts.chatId} ───\n` +
        `${opts.text}\n` +
        (buttons ? `Buttons:\n${buttons}\n` : '') +
        `────────────────────────────────────`
    );
  }

  answerCallbackQuery(queryId: string, text?: string): void {
    console.log(`[${this.botName}] ✓ answerCallbackQuery ${queryId}: ${text ?? ''}`);
  }
}
