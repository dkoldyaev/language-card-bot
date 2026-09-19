/**
 * Semantic Spacing Tokens for CardBot Design System.
 * Based on an 8pt grid with 4pt half-step for micro-alignment.
 * All units are expressed both as numeric MUI theme multiplier factors
 * and CSS-friendly pixel/rem strings.
 */

export const spacingTokens = {
  // Page level
  page_outer_horizontal_padding: { xs: 2, sm: 3, md: 4 }, // 16px, 24px, 32px
  page_outer_vertical_padding: { xs: 3, md: 4 }, // 24px, 32px
  page_bottom_nav_clearance: { xs: 11, md: 0 }, // 88px on mobile to clear fixed bottom bar

  // Section level
  section_vertical_gap: 4, // 32px between major page sections
  section_header_gap: 2, // 16px between section title and section body

  // Block / Surface level
  block_inner_padding_compact: { xs: 2, sm: 2.5 }, // 16px mobile, 20px desktop
  block_inner_padding_normal: { xs: 2.5, sm: 3 }, // 20px mobile, 24px desktop
  block_inner_padding_spacious: { xs: 3, sm: 4.5 }, // 24px mobile, 36px desktop

  // Component / Control level
  form_field_gap: 2, // 16px between form inputs
  element_group_gap: 1, // 8px between tags, action buttons, chip groups
  inline_icon_gap: 1, // 8px between icon and label inside button/chip
  micro_gap: 0.5, // 4px micro gap (e.g. tight chip clusters)

  // Typography hierarchy gaps
  header_overline_title_gap: 0.5, // 4px between overline and H1/H2
  header_title_subtitle_gap: 1, // 8px between Title and description paragraph
} as const;

export type SpacingTokens = typeof spacingTokens;
