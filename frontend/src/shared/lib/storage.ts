export function hasExistingLocalStorage(): boolean {
  try {
    const raw = localStorage.getItem('english-card-bot-storage');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const s = parsed?.state;
    if (!s) return false;

    if (s.token) return true;
    if (s.hasSeenOnboarding || s.hasCompletedGuestOnboarding) return true;
    if (Array.isArray(s.dictionaries) && s.dictionaries.length > 0) return true;
    if (Array.isArray(s.dictionary) && s.dictionary.length > 0) return true;
    if (Array.isArray(s.guestQuizAttempts) && s.guestQuizAttempts.length > 0) return true;
    if (s.guestDictionaryWords && Object.keys(s.guestDictionaryWords).length > 0) return true;

    return false;
  } catch {
    return false;
  }
}
