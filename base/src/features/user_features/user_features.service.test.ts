import { UserFeature } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../prisma';
import { getFeatureFromCommandName, getUserFeatureFlags } from './user_features.service';

vi.mock('../../prisma');

describe('user feature flags', () => {
  beforeEach(() => {
    vi.mocked(prisma.userFeatureFlag.findMany).mockReset();
  });

  it('keeps every feature disabled when the user has no flag records', async () => {
    vi.mocked(prisma.userFeatureFlag.findMany).mockResolvedValue([]);

    await expect(getUserFeatureFlags(42)).resolves.toEqual({
      multipleDictionaries: false,
      cardImages: false,
    });
  });

  it('returns only explicitly enabled feature flags', async () => {
    vi.mocked(prisma.userFeatureFlag.findMany).mockResolvedValue([
      { feature: UserFeature.MULTIPLE_DICTIONARIES, enabled: true },
      { feature: UserFeature.CARD_IMAGES, enabled: false },
    ]);

    await expect(getUserFeatureFlags(42)).resolves.toEqual({
      multipleDictionaries: true,
      cardImages: false,
    });
  });

  it('maps CLI feature names to their stored feature values', () => {
    expect(getFeatureFromCommandName('multiple-dictionaries')).toBe(UserFeature.MULTIPLE_DICTIONARIES);
    expect(getFeatureFromCommandName('card-images')).toBe(UserFeature.CARD_IMAGES);
    expect(getFeatureFromCommandName('unknown-feature')).toBeNull();
  });
});
