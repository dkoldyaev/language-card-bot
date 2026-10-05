import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

export async function performGuestMigration(token: string, mode: 'merge' | 'replace' = 'merge') {
  const store = useStore.getState();
  const dictionaries = store.dictionaries;
  const dictionary = store.dictionary;
  const guestDictionaryWords = store.guestDictionaryWords;
  const guestAttempts = store.guestQuizAttempts;

  if (
    dictionaries.length === 0 &&
    dictionary.length === 0 &&
    Object.keys(guestDictionaryWords).length === 0 &&
    guestAttempts.length === 0
  ) {
    return null;
  }

  const activeDict = dictionaries[0];
  const targetLanguage = activeDict?.targetLanguage || 'en';
  const baseLanguage = activeDict?.baseLanguage || 'ru';

  const guestEntries = Object.entries(guestDictionaryWords);
  const wordsFromGuestDictionaries = guestEntries.flatMap(([dictIdStr, dictWords]) => {
          const dict = dictionaries.find((d) => d.id === Number(dictIdStr));
          const target = dict?.targetLanguage || targetLanguage;
          const base = dict?.baseLanguage || baseLanguage;
          return dictWords.map((w) => ({
            text: w.text,
            targetLanguage: target,
            baseLanguage: base,
            definitions: w.definitions.map((def) => ({
              text: def.text,
              translation: def.translation?.text || null,
            })),
          }));
        });
  const words =
    wordsFromGuestDictionaries.length > 0
      ? wordsFromGuestDictionaries
      : dictionary.map((w) => ({
        text: w.text,
        targetLanguage,
        baseLanguage,
          definitions: w.definitions.map((def) => ({
            text: def.text,
            translation: def.translation?.text || null,
          })),
        }));

  const payload = {
    dictionaries: dictionaries.map((d) => ({
      name: d.name,
      targetLanguage: d.targetLanguage,
      baseLanguage: d.baseLanguage,
    })),
    words,
    quizAttempts: guestAttempts.map((a) => ({
      wordText: a.wordText,
      result: a.result,
      createdAt: a.createdAt,
    })),
    mode,
  };

  const response = await apiClient.post('/auth/migrate-guest', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Clear guest data once migrated to server
  const { dictionaries: migratedDictionaries, activeDictionaryId } = response.data;
  const storeAfterMigration = useStore.getState();
  const migratedWords = storeAfterMigration.dictionary;
  storeAfterMigration.clearGuestData();
  storeAfterMigration.setDictionaries(migratedDictionaries);
  storeAfterMigration.setActiveDictionaryId(activeDictionaryId);
  storeAfterMigration.setDictionary(migratedWords, activeDictionaryId);

  return response.data;
}
