import { ITranslator } from '../core/ITranslator';
import { Credentials, Translator } from '@translated/lara';
import { env } from '../core/env';

export class LaratranslateTranslator implements ITranslator {
  private lara: Translator;

  constructor() {
    const accessKeyId = env.LARA_ACCESS_KEY_ID || '';
    const accessKeySecret = env.LARA_ACCESS_KEY_SECRET || '';

    const credentials = new Credentials(accessKeyId, accessKeySecret);
    this.lara = new Translator(credentials);
  }

  async translate(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const res = await this.lara.translate(texts, sourceLang, targetLang);
      return res.translation as string[];
    } catch (error) {
      console.error('Error translating with Laratranslate API:', error);
      throw error;
    }
  }
}
