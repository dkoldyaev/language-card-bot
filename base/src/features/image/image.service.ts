import { env } from '../../core/env';
import { prisma } from '../../prisma';

export interface ExtractedKeywordsResponse {
  keywordSets: string[][];
}

export function normalizeKeywordsText(keywords: string[]): string {
  return keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0)
    .sort()
    .join(' ');
}

export async function extractKeywordsFromDefinition(definitionText: string, wordText?: string): Promise<string[][]> {
  const prompt = wordText
    ? `Extract multiple sets of keywords in English for image search for the target word "${wordText}" based on its definition:
"${definitionText}"

CRITICAL INSTRUCTIONS:
- Generate 1 to 4 distinct sets of keywords that visually represent the definition.
- Each keyword set MUST contain exactly 1 or 2 words.
- All keywords MUST be in English, regardless of the language of the target word or definition. Translate non-English concepts into English.
- If the target word "${wordText}" clarifies or adds necessary context to a keyword set, include it in the set.
- Do NOT include the target word if it creates a tautology or redundancy (e.g., if target word is "apple" and the extracted word is "apple", just output ["apple"], not ["apple", "apple"]).
- Output an array of arrays of strings.`
    : `Extract multiple sets of visually descriptive keywords in English for image search from the following definition:
"${definitionText}"

CRITICAL INSTRUCTIONS:
- Generate 1 to 4 distinct sets of keywords that visually represent the definition.
- Each keyword set MUST contain exactly 1 or 2 words.
- All keywords MUST be in English, regardless of the language of the definition. Translate non-English concepts into English.
- Output an array of arrays of strings.`;

  const jsonFormat = {
    type: 'object',
    properties: {
      keywordSets: {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'string' }
        },
        description: 'List of keyword sets, where each set is an array of 1 or 2 English words for image search',
      },
    },
    required: ['keywordSets'],
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

  return json.data?.keywordSets || [];
}

export async function fetchImagesFromGenerator(keywordSets: string[][]): Promise<string[][]> {
  const response = await fetch(env.IMAGE_GENERATOR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: keywordSets,
      provider: env.IMAGE_GENERATOR_PROVIDER,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image Generator API error (${response.status}): ${errorText}`);
  }

  const urls = (await response.json()) as string[][];
  return Array.isArray(urls) ? urls : [];
}

export async function attachExistingImagesToDefinition(
  definitionId: number,
  existingImages: Array<{ id: number; url: string; source: string; text: string; definitions?: Array<{ id: number }> }>
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  if (existingImages.length === 0) {
    return [];
  }

  // 1. Identify which images are not yet connected to this definition
  const idsToConnect = existingImages
    .filter((img) => !Array.isArray(img.definitions) || !img.definitions.some((d) => d.id === definitionId))
    .map((img) => ({ id: img.id }));

  // 2. Perform a single batch connect if there are unlinked images
  if (idsToConnect.length > 0) {
    await prisma.definition.update({
      where: { id: definitionId },
      data: {
        images: {
          connect: idsToConnect,
        },
      },
    });
  }

  // 3. Return the formatted list of images
  return existingImages.map((img) => ({
    id: img.id,
    url: img.url,
    source: img.source,
    text: img.text,
  }));
}

export async function attachImagesToDefinition(
  definitionId: number,
  imageUrlGroups: string[][],
  keywordSets: string[][]
): Promise<Array<{ id: number; url: string; source: string; text: string }>> {
  const attachedImages: Array<{ id: number; url: string; source: string; text: string }> = [];

  for (let i = 0; i < imageUrlGroups.length; i++) {
    const ks = keywordSets[i] || [];
    const normalizedText = normalizeKeywordsText(ks);
    const urls = imageUrlGroups[i];
    if (!Array.isArray(urls)) continue;

    for (const url of urls) {
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

  // 2. Extract keywords
  const keywordSets = await extractKeywordsFromDefinition(definitionText, targetWord);
  if (keywordSets.length === 0) {
    return [];
  }

  const normalizedTexts = keywordSets.map(normalizeKeywordsText);
  const rawTexts = keywordSets.map(ks => ks.join(' '));

  // 3. Check if the database table already has images with the same keywords
  const existingImages = await prisma.image.findMany({
    where: {
      OR: [
        { text: { in: normalizedTexts } },
        { text: { in: rawTexts } },
      ],
    },
    include: {
      definitions: true,
    },
  });

  const foundNormalizedTexts = new Set(existingImages.map(img => img.text));
  const missingSets = keywordSets.filter(ks => {
    const norm = normalizeKeywordsText(ks);
    const raw = ks.join(' ');
    return !foundNormalizedTexts.has(norm) && !foundNormalizedTexts.has(raw);
  });

  let newImages: Array<{ id: number; url: string; source: string; text: string }> = [];
  if (missingSets.length > 0) {
    const imageUrlGroups = await fetchImagesFromGenerator(missingSets);
    newImages = await attachImagesToDefinition(definitionId, imageUrlGroups, missingSets);
  }

  const attachedExisting = await attachExistingImagesToDefinition(definitionId, existingImages);
  return [...attachedExisting, ...newImages];
}

export interface DefinitionImagesResult {
  keywordSets: string[][];
  fromDb: boolean;
  images: Array<{ url: string; source: string; text: string }>;
}

export async function getImagesForDefinitionText(
  definitionText: string,
  wordText?: string
): Promise<DefinitionImagesResult> {
  const keywordSets = await extractKeywordsFromDefinition(definitionText, wordText);
  if (keywordSets.length === 0) {
    return {
      keywordSets: [],
      fromDb: false,
      images: [],
    };
  }

  const normalizedTexts = keywordSets.map(normalizeKeywordsText);
  const rawTexts = keywordSets.map(ks => ks.join(' '));

  const existingImages = await prisma.image.findMany({
    where: {
      OR: [
        { text: { in: normalizedTexts } },
        { text: { in: rawTexts } },
      ],
    },
    select: {
      url: true,
      source: true,
      text: true,
    },
  });

  const foundNormalizedTexts = new Set(existingImages.map(img => img.text));
  const missingSets = keywordSets.filter(ks => {
    const norm = normalizeKeywordsText(ks);
    const raw = ks.join(' ');
    return !foundNormalizedTexts.has(norm) && !foundNormalizedTexts.has(raw);
  });

  let newImages: Array<{ url: string; source: string; text: string }> = [];
  if (missingSets.length > 0) {
    const imageUrlGroups = await fetchImagesFromGenerator(missingSets);
    for (let i = 0; i < imageUrlGroups.length; i++) {
      const urls = imageUrlGroups[i] || [];
      for (const url of urls) {
        newImages.push({
          url,
          source: env.IMAGE_GENERATOR_PROVIDER,
          text: normalizeKeywordsText(missingSets[i] || []),
        });
      }
    }
  }

  return {
    keywordSets,
    fromDb: missingSets.length === 0,
    images: [...existingImages, ...newImages],
  };
}
