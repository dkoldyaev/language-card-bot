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

/** Data written by the removed browser-only guest mode, excluding credentials. */
export function hasLegacyLocalData(): boolean {
  try {
    const raw = localStorage.getItem('english-card-bot-storage');
    if (!raw) return false;
    const state = JSON.parse(raw)?.state;
    if (!state) return false;

    return (Array.isArray(state.dictionaries) && state.dictionaries.length > 0)
      || (Array.isArray(state.dictionary) && state.dictionary.length > 0)
      || (Array.isArray(state.guestQuizAttempts) && state.guestQuizAttempts.length > 0)
      || (state.guestDictionaryWords && Object.keys(state.guestDictionaryWords).length > 0);
  } catch {
    return false;
  }
}
