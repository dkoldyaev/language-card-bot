import { describe, it, expect } from 'vitest';
import theme from './theme';

describe('theme', () => {
  it('should have a calm light mode palette', () => {
    expect(theme.palette.mode).toBe('light');
  });

  it('should have custom typography settings', () => {
    expect(theme.typography.fontFamily).toContain('Manrope');
  });
});
