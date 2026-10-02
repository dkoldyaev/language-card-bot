import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

const DEFAULT_WIDTH = '640';
const DEFAULT_HEIGHT = '480';

export class MockImageAdapter implements IImageGenerator {
  async generate(keywordGroups: string[][]): Promise<string[][]> {
    let delay = 0;
    if (env.MOCK_TIMEOUT !== undefined) {
      const parsed = parseInt(env.MOCK_TIMEOUT, 10);
      if (!Number.isNaN(parsed)) {
        delay = parsed;
      }
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return keywordGroups.map((keywords) => {
      const text = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
      if (text.length === 0) {
        return [];
      }
      const encodedText = encodeURIComponent(text);
      return [
        `https://mockimage.tw/photo/${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}/282c34/61dafb/${encodedText}`,
        `https://mockimage.tw/photo/${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}/cccccc/000000/${encodedText}`
      ];
    });
  }
}
