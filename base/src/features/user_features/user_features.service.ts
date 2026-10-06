import { UserFeature, type UserFeatureFlag } from '@prisma/client';
import { prisma } from '../../prisma';

export const featureCommandNames = {
  'multiple-dictionaries': UserFeature.MULTIPLE_DICTIONARIES,
  'card-images': UserFeature.CARD_IMAGES,
} as const;

export type FeatureCommandName = keyof typeof featureCommandNames;

export interface UserFeatureFlags {
  multipleDictionaries: boolean;
  cardImages: boolean;
}

function toUserFeatureFlags(flags: Array<Pick<UserFeatureFlag, 'feature' | 'enabled'>>): UserFeatureFlags {
  return {
    multipleDictionaries: flags.some(
      (flag) => flag.feature === UserFeature.MULTIPLE_DICTIONARIES && flag.enabled
    ),
    cardImages: flags.some(
      (flag) => flag.feature === UserFeature.CARD_IMAGES && flag.enabled
    ),
  };
}

export async function getUserFeatureFlags(userId: number): Promise<UserFeatureFlags> {
  const flags = await prisma.userFeatureFlag.findMany({
    where: { userId },
    select: {
      feature: true,
      enabled: true,
    },
  });

  return toUserFeatureFlags(flags);
}

export function getFeatureFromCommandName(featureName: string): UserFeature | null {
  if (featureName in featureCommandNames) {
    return featureCommandNames[featureName as FeatureCommandName];
  }

  return null;
}
