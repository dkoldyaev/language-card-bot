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

  async generate(keywordGroups: string[][]): Promise<string[][]> {
    return Promise.all(keywordGroups.map((keywords) => this.fetchSingle(keywords)));
  }

  private async fetchSingle(keywords: string[]): Promise<string[]> {
    const query = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
    if (query.length === 0) {
      return [];
    }

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3`;

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
    if (data.photos && data.photos.length > 0) {
      return data.photos.map(photo => photo.src?.medium || photo.src?.large || '').filter(u => u.length > 0);
    }

    return [];
  }
}
