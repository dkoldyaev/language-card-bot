export const IMAGE_PROVIDERS = [
  'mock',
  'unsplash',
  'pexels',
  'pixabay',
  'wikimedia',
] as const;

export type ImageProviderType = (typeof IMAGE_PROVIDERS)[number];
