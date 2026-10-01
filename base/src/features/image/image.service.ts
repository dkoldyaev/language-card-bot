import { env } from '../../core/env';
import { prisma } from '../../prisma';

export interface ExtractedKeywordsResponse {
  keywords?: string[];
}

export function sanitizeKeywords(rawKeywords: unknown, fallbackText: string): string[] {
  let keywords: string[] = [];
  if (Array.isArray(rawKeywords)) {
    keywords = rawKeywords
      .map((k) => String(k).trim().toLowerCase())
      .filter((k) => k.length > 0);
  } else if (typeof rawKeywords === 'string') {
    keywords = rawKeywords
      .split(/[,\s]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  }

  if (keywords.length === 0) {
    keywords = fallbackText
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3)
      .slice(0, 3);
  }

  if (keywords.length === 0) {
    keywords = ['object'];
  }

  // Ensure 2-3 keywords
  return keywords.slice(0, 3);
}

export async function extractKeywordsFromDefinition(definitionText: string): Promise<string[]> {
  const prompt = `Extract 2 to 3 concise, visually descriptive keywords in English for image search from the following definition:\n"${definitionText}"`;
  const jsonFormat = { keywords: ['keyword1', 'keyword2', 'keyword3'] };

  const response = await fetch(env.LLM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL,
      jsonFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { data?: ExtractedKeywordsResponse; error?: string };
  if (json.error) {
    throw new Error(`LLM API error: ${json.error}`);
  }

  return sanitizeKeywords(json.data?.keywords, definitionText);
}

export async function fetchImagesFromGenerator(keywords: string[]): Promise<string[]> {
  const response = await fetch(env.IMAGE_GENERATOR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: [keywords],
      provider: env.IMAGE_GENERATOR_PROVIDER,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image Generator API error (${response.status}): ${errorText}`);
  }

  const urls = (await response.json()) as string[];
  return Array.isArray(urls) ? urls : [];
}

export async function attachImagesToDefinition(
  definitionId: number,
  imageUrls: string[],
  keywords: string[]
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  const attachedImages: Array<{ id: number; url: string; source: string; text: string }> = [];

  for (const url of imageUrls) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      continue;
    }

    const existingImage = await prisma.image.findFirst({
      where: { url },
    });

    if (existingImage) {
      const updated = await prisma.image.update({
        where: { id: existingImage.id },
        data: {
          definitions: {
            connect: { id: definitionId },
          },
        },
      });
      attachedImages.push(updated);
    } else {
      const created = await prisma.image.create({
        data: {
          url,
          source: env.IMAGE_GENERATOR_PROVIDER,
          text: keywords.join(' '),
          definitions: {
            connect: { id: definitionId },
          },
        },
      });
      attachedImages.push(created);
    }
  }

  return attachedImages;
}

export async function processDefinitionImage(
  definitionId: number,
  definitionText: string
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  // 1. Extract 2-3 keywords from definition via LLM
  const keywords = await extractKeywordsFromDefinition(definitionText);

  // 2. Fetch images from image-generator
  const imageUrls = await fetchImagesFromGenerator(keywords);

  // 3. Attach images to definition in DB
  return attachImagesToDefinition(definitionId, imageUrls, keywords);
}
