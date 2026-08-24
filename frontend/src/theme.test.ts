import { describe, it, expect } from 'vitest';
import theme from './theme';

describe('theme', () => {
  it('should have a dark mode palette', () => {
    expect(theme.palette.mode).toBe('dark');
  });

  it('should have custom typography settings', () => {
    expect(theme.typography.fontFamily).toContain('Inter');
  });
});
