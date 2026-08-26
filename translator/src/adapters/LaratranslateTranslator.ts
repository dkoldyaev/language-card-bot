import { ITranslator } from '../core/ITranslator';
import { Credentials, Translator } from '@translated/lara';

export class LaratranslateTranslator implements ITranslator {
  private lara: Translator;

  constructor() {
    const accessKeyId = process.env.LARA_ACCESS_KEY_ID || '';
    const accessKeySecret = process.env.LARA_ACCESS_KEY_SECRET || '';
    
    if (!accessKeyId || !accessKeySecret) {
      console.warn('Warning: LARA_ACCESS_KEY_ID or LARA_ACCESS_KEY_SECRET is not set. Translation may fail.');
    }

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
