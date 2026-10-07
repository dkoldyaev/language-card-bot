import { env } from '../core/env';
import type { IImageGenerator } from '../core/IImageGenerator';

interface WikimediaImageInfo {
  url: string;
  mime?: string;
  descriptionurl?: string;
  descriptionshorturl?: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
}

interface WikimediaPage {
  pageid?: number;
  ns?: number;
  title?: string;
  imageinfo?: WikimediaImageInfo[];
}

interface WikimediaResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

export class WikimediaImageAdapter implements IImageGenerator {
  private readonly userAgent: string;

  constructor() {
    if (!env.WIKIMEDIA_USER_AGENT || env.WIKIMEDIA_USER_AGENT.trim() === '') {
      throw new Error('WIKIMEDIA_USER_AGENT is required for WikimediaImageAdapter');
    }
    this.userAgent = env.WIKIMEDIA_USER_AGENT;
  }

  async generate(keywordGroups: string[][]): Promise<string[][]> {
    return Promise.all(keywordGroups.map((keywords) => this.fetchSingle(keywords)));
  }

  private async fetchSingle(keywords: string[]): Promise<string[]> {
    const query = keywords.map((k) => k.trim()).filter((k) => k.length > 0).join(' ');
    if (query.length === 0) {
      return [];
    }

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=640&format=json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wikimedia Commons API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as WikimediaResponse;
    const pages = data.query?.pages;

    if (pages) {
      const validPages = Object.values(pages).filter((p) => {
        const info = p.imageinfo?.[0];
        return info?.mime?.startsWith('image/');
      }).slice(0, 3);

      if (validPages.length > 0) {
        return validPages.map(page => {
          const imageInfo = page.imageinfo?.[0];
          return imageInfo?.thumburl || imageInfo?.url || '';
        }).filter(url => url.length > 0);
      }
    }

    return [];
  }
}
