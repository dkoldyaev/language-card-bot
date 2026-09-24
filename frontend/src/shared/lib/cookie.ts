export function getCookie<T extends string = string>(name: string): T | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${encodeURIComponent(name)})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) as T : null;
}

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: document.cookie is the standard browser API for reading/writing cookies
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
