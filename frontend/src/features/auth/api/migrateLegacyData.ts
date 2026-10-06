import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

function makePayload() {
  const state = useStore.getState();
  const dictionaries = state.dictionaries;
  const firstDictionary = dictionaries[0];
  if (state.dictionary.length > 0 && !firstDictionary) {
    throw new Error('Legacy dictionary words have no dictionary metadata');
  }
  const words = Object.entries(state.guestDictionaryWords).flatMap(([dictionaryId, dictionaryWords]) => {
    const dictionary = dictionaries.find((item) => item.id === Number(dictionaryId));
    if (!dictionary) return [];
    return dictionaryWords.map((word) => ({
      text: word.text,
      targetLanguage: dictionary.targetLanguage,
      baseLanguage: dictionary.baseLanguage,
      definitions: word.definitions.map((definition) => ({
        text: definition.text,
        translation: definition.translation ? definition.translation.text : null,
      })),
    }));
  });

  const currentDictionaryWords = words.length === 0 && firstDictionary
    ? state.dictionary.map((word) => ({
      text: word.text,
      targetLanguage: firstDictionary.targetLanguage,
      baseLanguage: firstDictionary.baseLanguage,
      definitions: word.definitions.map((definition) => ({
        text: definition.text,
        translation: definition.translation ? definition.translation.text : null,
      })),
    }))
    : [];

  return {
    dictionaries: dictionaries.map((dictionary) => ({
      name: dictionary.name,
      targetLanguage: dictionary.targetLanguage,
      baseLanguage: dictionary.baseLanguage,
    })),
    words: words.length > 0 ? words : currentDictionaryWords,
    quizAttempts: state.guestQuizAttempts.map((attempt) => ({
      wordText: attempt.wordText,
      result: attempt.result,
      createdAt: attempt.createdAt,
    })),
    mode: 'merge',
  };
}

export async function migrateLegacyData() {
  const response = await apiClient.post('/auth/migrate-guest', makePayload());
  const state = useStore.getState();
  state.clearGuestData();
  state.setDictionaries(response.data.dictionaries);
  state.setActiveDictionaryId(response.data.activeDictionaryId);
  state.setDictionary([], response.data.activeDictionaryId);
  return response.data;
}
