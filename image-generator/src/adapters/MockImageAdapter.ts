import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

export class MockImageAdapter implements IImageGenerator {
  async generate(keywordGroups: string[][]): Promise<string[]> {
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

    let width = '640';
    if (env.MOCK_IMAGE_WIDTH !== undefined && env.MOCK_IMAGE_WIDTH.trim() !== '') {
      width = env.MOCK_IMAGE_WIDTH.trim();
    }

    let height = '480';
    if (env.MOCK_IMAGE_HEIGHT !== undefined && env.MOCK_IMAGE_HEIGHT.trim() !== '') {
      height = env.MOCK_IMAGE_HEIGHT.trim();
    }

    return keywordGroups.map((keywords) => {
      const text = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
      const displayText = text.length > 0 ? text : 'image';
      const encodedText = encodeURIComponent(displayText);
      return `https://mockimage.tw/photo/${width}x${height}/282c34/61dafb/${encodedText}`;
    });
  }
}
