import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

export class PixabayImageAdapter implements IImageGenerator {
  private readonly apiKey: string;

  constructor() {
    if (!env.PIXABAY_API_KEY || env.PIXABAY_API_KEY.trim() === '') {
      throw new Error('PIXABAY_API_KEY is required for PixabayImageAdapter');
    }
    this.apiKey = env.PIXABAY_API_KEY;
  }

  async generate(keywordGroups: string[][]): Promise<string[]> {
    return Promise.all(keywordGroups.map((keywords) => this.fetchSingle(keywords)));
  }

  private async fetchSingle(keywords: string[]): Promise<string> {
    const rawQuery = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
    // Pixabay max q length is 100 characters
    const query = rawQuery.slice(0, 100);
    const searchQuery = query.length > 0 ? query : 'nature';

    // Pixabay minimum per_page is 3
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(this.apiKey)}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=3`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pixabay API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as PixabaySearchResponse;
    const firstHit = data.hits && data.hits.length > 0 ? data.hits[0] : null;

    if (firstHit?.webformatURL) {
      return firstHit.webformatURL;
    }

    if (firstHit?.largeImageURL) {
      return firstHit.largeImageURL;
    }

    return `https://mockimage.tw/photo/640x480/cccccc/333333/${encodeURIComponent(searchQuery)}`;
  }
}
