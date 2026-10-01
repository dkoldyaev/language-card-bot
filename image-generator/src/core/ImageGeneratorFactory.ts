import { MockImageAdapter } from '../adapters/MockImageAdapter';
import { PexelsImageAdapter } from '../adapters/PexelsImageAdapter';
import { PixabayImageAdapter } from '../adapters/PixabayImageAdapter';
import { UnsplashImageAdapter } from '../adapters/UnsplashImageAdapter';
import { WikimediaImageAdapter } from '../adapters/WikimediaImageAdapter';
import type { ImageProviderType } from '../types/image';
import type { IImageGenerator } from './IImageGenerator';

export const ImageGeneratorFactory = {
  getGenerator(provider: ImageProviderType): IImageGenerator {
    switch (provider) {
      case 'mock':
        return new MockImageAdapter();
      case 'unsplash':
        return new UnsplashImageAdapter();
      case 'pexels':
        return new PexelsImageAdapter();
      case 'pixabay':
        return new PixabayImageAdapter();
      case 'wikimedia':
        return new WikimediaImageAdapter();
      default:
        throw new Error(`Unsupported image provider: ${provider}`);
    }
  },
};
