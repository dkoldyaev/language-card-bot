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

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      const res = await this.lara.translate(text, sourceLang, targetLang);
      
      // If we pass a single string, the translation is a string.
      return res.translation as string;
    } catch (error) {
      console.error('Error translating with Laratranslate API:', error);
      throw error;
    }
  }
}
