import { describe, expect, it } from 'vitest';
import theme, { createAppTheme } from './theme';

describe('theme', () => {
  it('should have a calm light mode palette by default', () => {
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.background.default).toBe('#F7F5EF');
    expect(theme.palette.background.paper).toBe('#FFFFFF');
  });

  it('should have custom typography settings', () => {
    expect(theme.typography.fontFamily).toContain('Manrope');
  });

  it('should create a dark mode palette with dark background and light text', () => {
    const darkTheme = createAppTheme('dark');
    expect(darkTheme.palette.mode).toBe('dark');
    expect(darkTheme.palette.background.default).toBe('#0E131F');
    expect(darkTheme.palette.background.paper).toBe('#181F2E');
    expect(darkTheme.palette.text.primary).toBe('#F1F5F9');
  });
});
