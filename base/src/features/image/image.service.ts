import { env } from '../../core/env';
import { prisma } from '../../prisma';

export interface ExtractedKeywordsResponse {
  keywords?: string[];
}

export function isEnglishWord(word: string): boolean {
  return /^[a-zA-Z0-9\s-]+$/.test(word.trim());
}

export function sanitizeKeywords(rawKeywords: unknown, fallbackText: string): string[] {
  let keywords: string[] = [];
  if (Array.isArray(rawKeywords)) {
    keywords = rawKeywords
      .map((k) => String(k).trim().toLowerCase())
      .filter((k) => k.length > 0 && isEnglishWord(k));
  } else if (typeof rawKeywords === 'string') {
    keywords = rawKeywords
      .split(/[,s]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0 && isEnglishWord(k));
  }

  if (keywords.length === 0) {
    keywords = fallbackText
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3 && isEnglishWord(w))
      .slice(0, 3);
  }

  // Strictly return empty array if no valid keywords exist, no silent fallback
  return keywords.slice(0, 3);
}


export function composeImageSearchKeywords(
  word: string | undefined,
  definitionKeywords: string[]
): string[] {
  if (!word || word.trim().length === 0) {
    return definitionKeywords;
  }

  const cleanWord = word.trim().toLowerCase();
  // Filter out any duplicates of target word from definition keywords
  const otherKeywords = definitionKeywords.filter(
    (k) => k.toLowerCase() !== cleanWord
  );

  // The first word MUST always be the target word itself:
  return [cleanWord, ...otherKeywords];
}

export function normalizeKeywordsText(keywords: string[]): string {
  return keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0)
    .sort()
    .join(' ');
}


export async function ensureEnglishKeywords(
  keywords: string[],
  fallbackText: string
): Promise<string[]> {
  const validEnglish = keywords.filter((k) => isEnglishWord(k));
  if (validEnglish.length > 0) {
    return validEnglish.slice(0, 3);
  }

  // Extract English ASCII tokens from fallbackText
  const englishTokens = fallbackText
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 3 && isEnglishWord(w))
    .slice(0, 3);

  if (englishTokens.length > 0) {
    return englishTokens;
  }

  return [];
}

export async function extractKeywordsFromDefinition(definitionText: string, wordText?: string): Promise<string[]> {
  const prompt = wordText
    ? `Extract keywords in English for image search for the target word "${wordText}" with definition:
"${definitionText}"

CRITICAL INSTRUCTIONS:
- The target word and definition may be written in any language (English, Russian, Spanish, German, French, etc.).
- Regardless of the language, all extracted keywords MUST be in English.
- The FIRST keyword MUST ALWAYS be the target word itself in English (translate the target word to English if it is in another language).
- Followed by 2 to 3 concise English visual keywords from the definition.`
    : `Extract 2 to 3 concise, visually descriptive keywords in English for image search from the following definition:
"${definitionText}"

CRITICAL INSTRUCTIONS:
- The definition may be written in any language (English, Russian, Spanish, German, French, Chinese, Japanese, etc.).
- Regardless of what language the definition is in, all extracted keywords MUST be in English.
- Translate any non-English concepts into English search keywords (ASCII English letters only: a-z).
- Never return keywords in the original non-English language.`;
  const jsonFormat = {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of keywords in English for image search',
      },
    },
    required: ['keywords'],
  };

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

  let keywords = sanitizeKeywords(json.data?.keywords, definitionText);
  if (!keywords.every((k) => isEnglishWord(k))) {
    keywords = await ensureEnglishKeywords(keywords, definitionText);
  }

  if (wordText && isEnglishWord(wordText)) {
    keywords = composeImageSearchKeywords(wordText, keywords);
  }

  return keywords;
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
  return Array.isArray(urls) ? urls.filter((url) => typeof url === 'string' && url.trim().length > 0) : [];
}

export async function attachExistingImagesToDefinition(
  definitionId: number,
  existingImages: Array<{ id: number; url: string; source: string; text: string; definitions?: Array<{ id: number }> }>
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  const attachedImages: Array<{ id: number; url: string; source: string; text: string }> = [];

  for (const img of existingImages) {
    const isAlreadyConnected = Array.isArray(img.definitions) && img.definitions.some((d) => d.id === definitionId);
    if (!isAlreadyConnected) {
      const updated = await prisma.image.update({
        where: { id: img.id },
        data: {
          definitions: {
            connect: { id: definitionId },
          },
        },
      });
      attachedImages.push(updated);
    } else {
      attachedImages.push(img);
    }
  }

  return attachedImages;
}

export async function attachImagesToDefinition(
  definitionId: number,
  imageUrls: string[],
  keywords: string[]
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  const attachedImages: Array<{ id: number; url: string; source: string; text: string }> = [];
  const normalizedText = normalizeKeywordsText(keywords);

  for (const url of imageUrls) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      continue;
    }

    const image = await prisma.image.upsert({
      where: { url },
      update: {
        definitions: {
          connect: { id: definitionId },
        },
      },
      create: {
        url,
        source: env.IMAGE_GENERATOR_PROVIDER,
        text: normalizedText,
        definitions: {
          connect: { id: definitionId },
        },
      },
    });
    attachedImages.push(image);
  }

  return attachedImages;
}

export async function processDefinitionImage(
  definitionId: number,
  definitionText: string,
  wordText?: string
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  // 1. Look up target word if not supplied
  let targetWord = wordText;
  if (!targetWord) {
    try {
      const def = await prisma.definition.findUnique({
        where: { id: definitionId },
        include: { word: true },
      });
      targetWord = def?.word?.text;
    } catch {
      // Ignore DB lookup error in tests if unmocked
    }
  }

  // 2. Extract keywords with the target word guaranteed to be first
  const keywords = await extractKeywordsFromDefinition(definitionText, targetWord);
  if (keywords.length === 0) {
    return [];
  }
  const normalizedText = normalizeKeywordsText(keywords);
  const rawJoinedText = keywords.join(' ');

  // 2. Check if the database table already has images with the same keywords
  const existingImages = await prisma.image.findMany({
    where: {
      OR: [
        { text: normalizedText },
        { text: rawJoinedText },
      ],
    },
    include: {
      definitions: true,
    },
  });

  if (existingImages.length > 0) {
    // If images with identical keywords already exist in the database table,
    // do NOT make any requests to image-generator. Attach all of them to the definition m2m.
    return attachExistingImagesToDefinition(definitionId, existingImages);
  }

  // 3. Otherwise, fetch images from image-generator
  const imageUrls = await fetchImagesFromGenerator(keywords);

  // 4. Attach new images to definition in DB
  return attachImagesToDefinition(definitionId, imageUrls, keywords);
}

export interface DefinitionImagesResult {
  keywords: string[];
  fromDb: boolean;
  images: Array<{ url: string; source: string; text: string }>;
}

export async function getImagesForDefinitionText(
  definitionText: string,
  wordText?: string
): Promise<DefinitionImagesResult> {
  // 1. Extract keywords with the target word guaranteed to be first
  const keywords = await extractKeywordsFromDefinition(definitionText, wordText);
  if (keywords.length === 0) {
    return {
      keywords: [],
      fromDb: false,
      images: [],
    };
  }
  const normalizedText = normalizeKeywordsText(keywords);
  const rawJoinedText = keywords.join(' ');

  // 2. Check if the database table already has images with the same keywords
  const existingImages = await prisma.image.findMany({
    where: {
      OR: [
        { text: normalizedText },
        { text: rawJoinedText },
      ],
    },
    select: {
      url: true,
      source: true,
      text: true,
    },
  });

  if (existingImages.length > 0) {
    return {
      keywords,
      fromDb: true,
      images: existingImages,
    };
  }

  // 3. Otherwise, fetch images from image-generator
  const imageUrls = await fetchImagesFromGenerator(keywords);

  return {
    keywords,
    fromDb: false,
    images: imageUrls.map((url) => ({
      url,
      source: env.IMAGE_GENERATOR_PROVIDER,
      text: normalizedText,
    })),
  };
}
