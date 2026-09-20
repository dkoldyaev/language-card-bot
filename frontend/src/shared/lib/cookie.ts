export function getCookie<T extends string = string>(name: string): T | null {
  if (typeof document === 'undefined') return null;
  // biome-ignore lint/suspicious/noAssignInExpressions: thats why we write it only once, in this 
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${encodeURIComponent(name)})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) as T : null;
}

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noAssignInExpressions: thats why we write it only once, in this 
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
