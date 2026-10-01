import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export class PexelsImageAdapter implements IImageGenerator {
  private readonly apiKey: string;

  constructor() {
    if (!env.PEXELS_API_KEY || env.PEXELS_API_KEY.trim() === '') {
      throw new Error('PEXELS_API_KEY is required for PexelsImageAdapter');
    }
    this.apiKey = env.PEXELS_API_KEY;
  }

  async generate(keywordGroups: string[][]): Promise<string[]> {
    return Promise.all(keywordGroups.map((keywords) => this.fetchSingle(keywords)));
  }

  private async fetchSingle(keywords: string[]): Promise<string> {
    const query = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
    const searchQuery = query.length > 0 ? query : 'nature';

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pexels API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as PexelsSearchResponse;
    const firstPhoto = data.photos && data.photos.length > 0 ? data.photos[0] : null;

    if (firstPhoto?.src?.medium) {
      return firstPhoto.src.medium;
    }

    if (firstPhoto?.src?.large) {
      return firstPhoto.src.large;
    }

    return `https://mockimage.tw/photo/640x480/cccccc/333333/${encodeURIComponent(searchQuery)}`;
  }
}
