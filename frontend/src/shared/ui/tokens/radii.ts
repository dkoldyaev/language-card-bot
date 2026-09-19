/**
 * Concentric Border Radius Tokens.
 * Subordinate items have smaller radius than their containing surfaces.
 */
export const radiusTokens = {
  sm: 8, // Badges, chips, tags, tooltips
  md: 12, // Buttons, textfields, selectors, icon buttons
  lg: 16, // Dialogs, accordions, menus
  xl: 20, // Cards, major surface panels
  full: 9999, // Pills, circular avatars
} as const;

export type RadiusTokens = typeof radiusTokens;
