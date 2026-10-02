import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

interface UnsplashPhoto {
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export class UnsplashImageAdapter implements IImageGenerator {
  private readonly accessKey: string;

  constructor() {
    if (!env.UNSPLASH_ACCESS_KEY || env.UNSPLASH_ACCESS_KEY.trim() === '') {
      throw new Error('UNSPLASH_ACCESS_KEY is required for UnsplashImageAdapter');
    }
    this.accessKey = env.UNSPLASH_ACCESS_KEY;
  }

  async generate(keywordGroups: string[][]): Promise<string[][]> {
    return Promise.all(keywordGroups.map((keywords) => this.fetchSingle(keywords)));
  }

  private async fetchSingle(keywords: string[]): Promise<string[]> {
    const query = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
    if (query.length === 0) {
      return [];
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${this.accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unsplash API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as UnsplashSearchResponse;
    if (data.results && data.results.length > 0) {
      return data.results.map(res => res.urls?.regular || res.urls?.small || '').filter(u => u.length > 0);
    }

    return [];
  }
}
