import { type Preset, Prisma } from '@prisma/client';
import { invalidateKeysByPattern, redisClient } from '../../core/cache';
import { prisma } from '../../prisma';
import { type LanguageCode, LanguageCodeSchema } from '../../types/language';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';
import { getPresetAdapter } from './adapters';
import type { CreatePresetInput, PresetDto, UpdatePresetInput } from './preset.type';

const PRESETS_CACHE_TTL_SECONDS = 3600;

type HttpError = Error & { statusCode: number };

function createHttpError(message: string, statusCode: number): HttpError {
  return Object.assign(new Error(message), { statusCode });
}

export async function invalidatePresetsCache(): Promise<void> {
  await invalidateKeysByPattern('presets:*');
}

export function formatPreset(preset: Preset): PresetDto {
  return {
    id: preset.id,
    title: preset.title,
    description: preset.description ?? null,
    for_language: LanguageCodeSchema.parse(preset.forLanguage),
    forLanguage: LanguageCodeSchema.parse(preset.forLanguage),
    type: preset.type,
    body: preset.body,
    createdAt: preset.createdAt instanceof Date ? preset.createdAt.toISOString() : String(preset.createdAt),
    updatedAt: preset.updatedAt instanceof Date ? preset.updatedAt.toISOString() : String(preset.updatedAt),
  };
}

export async function listPresets(filters?: { forLanguage?: LanguageCode }): Promise<PresetDto[]> {
  const langKey = filters?.forLanguage ? filters.forLanguage.toLowerCase() : 'all';
  const cacheKey = `presets:list:${langKey}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore parse error
    }
  }

  const where = filters?.forLanguage ? { forLanguage: filters.forLanguage.toLowerCase() } : undefined;
  const presets = await prisma.preset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const result = presets.map(formatPreset);
  await redisClient.set(cacheKey, JSON.stringify(result), 'EX', PRESETS_CACHE_TTL_SECONDS);
  return result;
}

export async function getPresetById(id: number): Promise<PresetDto | null> {
  const cacheKey = `presets:id:${id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore parse error
    }
  }

  const preset = await prisma.preset.findUnique({
    where: { id },
  });

  const result = preset ? formatPreset(preset) : null;
  if (result) {
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', PRESETS_CACHE_TTL_SECONDS);
  }
  return result;
}

export async function createPreset(data: CreatePresetInput): Promise<PresetDto> {
  const forLanguage = (data.for_language || data.forLanguage)?.toLowerCase();
  if (!forLanguage) {
    throw new Error('for_language or forLanguage is required');
  }
  const type = data.type || 'word-definition';

  const preset = await prisma.preset.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      forLanguage,
      type,
      body: data.body ?? Prisma.JsonNull,
    },
  });

  await invalidatePresetsCache();

  return formatPreset(preset);
}

export async function updatePreset(id: number, data: UpdatePresetInput): Promise<PresetDto> {
  const forLanguage = data.for_language || data.forLanguage ? (data.for_language || data.forLanguage)?.toLowerCase() : undefined;

  const preset = await prisma.preset.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(forLanguage && { forLanguage }),
      ...(data.type && { type: data.type }),
      ...(data.body !== undefined && { body: data.body ?? Prisma.JsonNull }),
    },
  });

  await invalidatePresetsCache();

  return formatPreset(preset);
}

export async function deletePreset(id: number): Promise<void> {
  await prisma.preset.delete({
    where: { id },
  });

  await invalidatePresetsCache();
}

export async function applyPreset(userId: number, username: string, dictionaryId: number, presetId: number) {
  const dictionary = await prisma.dictionary.findFirst({
    where: { id: dictionaryId, userId },
  });

  if (!dictionary) {
    throw createHttpError('Dictionary not found', 404);
  }

  const preset = await prisma.preset.findUnique({
    where: { id: presetId },
  });

  if (!preset) {
    throw createHttpError('Preset not found', 404);
  }

  if (preset.forLanguage !== dictionary.targetLanguage) {
    throw createHttpError(
      `Preset language (${preset.forLanguage}) does not match dictionary target language (${dictionary.targetLanguage})`,
      400
    );
  }

  const adapter = getPresetAdapter(preset.type);
  const result = await adapter.apply({
    userId,
    username,
    dictionaryId,
    preset,
  });

  await invalidateDashboardCache(userId, dictionaryId);

  return result;
}
