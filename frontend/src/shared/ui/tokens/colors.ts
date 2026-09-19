/**
 * Color Tokens & Semantic Learning Statuses
 */
export const colorTokens = {
  brand: {
    ink: '#172033',
    blue: '#2453A6',
    coral: '#D86642',
    paper: '#F7F5EF',
  },
  hero: {
    lightBg: '#172033',
    darkBg: '#111622',
    text: '#FFFFFF',
    mutedText: 'rgba(255, 255, 255, 0.75)',
    accent: '#E8A17F',
  },
  learningStatus: {
    mastered: {
      color: '#24756D',
      lightBg: '#E8F3F1',
      darkBg: 'rgba(36, 117, 109, 0.2)',
    },
    learning: {
      color: '#3A86FF',
      lightBg: '#EBF2FF',
      darkBg: 'rgba(58, 134, 255, 0.2)',
    },
    newWord: {
      color: '#647084',
      lightBg: '#F1F5F9',
      darkBg: 'rgba(148, 163, 184, 0.15)',
    },
    attention: {
      color: '#B94343',
      lightBg: '#FCE8E7',
      darkBg: 'rgba(185, 67, 67, 0.2)',
    },
    streak: {
      color: '#E85D04',
      lightBg: '#FFF2EB',
      darkBg: 'rgba(232, 93, 4, 0.2)',
    },
    preset: {
      color: '#7C3AED',
      lightBg: '#F5F3FF',
      darkBg: 'rgba(124, 58, 237, 0.2)',
    },
  },
} as const;
