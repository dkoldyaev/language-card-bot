import axios from 'axios';
import useStore, { type DictionaryWord } from '../../store/useStore';
import { trackEvent } from '../lib/analytics';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required');
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const state = useStore.getState();
    const token = state.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if ((state.isOffline || !state.token) && config.url?.startsWith('/quiz/')) {
      return Promise.reject({ isOfflineMock: true, url: config.url, data: config.data });
    }

    if (!state.token) {
      if (config.url === '/add_word' || config.url === '/add_word/batch' || config.url?.startsWith('/add_word/')) {
        return Promise.reject({ isGuestAddWordMock: true, url: config.url });
      }
      if (config.url === '/dictionary' || config.url?.startsWith('/dictionary?') || config.url?.startsWith('/dictionary/')) {
        return Promise.reject({ isGuestDictionaryMock: true, url: config.url, params: config.params, method: config.method });
      }
      if (config.url === '/dictionaries' || config.url?.startsWith('/dictionaries?') || config.url?.startsWith('/dictionaries/')) {
        return Promise.reject({ isGuestDictionariesMock: true, url: config.url, params: config.params, method: config.method, data: config.data });
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.isGuestAddWordMock) {
      return Promise.resolve({ data: { message: 'Guest mode: word addition disabled' } });
    }

    if (error?.isGuestDictionaryMock) {
      const store = useStore.getState();
      const currentDictId = error.params?.dictionaryId ?? store.activeDictionaryId;
      const dictWords = (currentDictId && store.guestDictionaryWords[currentDictId]) || store.dictionary || [];
      return Promise.resolve({ data: { dictionary: dictWords } });
    }

    if (error?.isGuestDictionariesMock) {
      const store = useStore.getState();
      const method = (error.method || 'get').toLowerCase();

      if (method === 'get') {
        return Promise.resolve({
          data: {
            dictionaries: store.dictionaries,
            activeDictionaryId: store.activeDictionaryId,
          },
        });
      }

      if (method === 'post') {
        const data = typeof error.data === 'string' ? JSON.parse(error.data) : (error.data || {});
        if (error.url?.includes('/select')) {
          const match = error.url.match(/\/dictionaries\/(\d+)\/select/);
          if (match) {
            const id = Number(match[1]);
            store.setActiveDictionaryId(id);
            const dictWords = store.guestDictionaryWords[id] || [];
            store.setDictionary(dictWords);
          }
          return Promise.resolve({ data: { success: true } });
        }

        const dictId = Date.now();
        const isFirst = store.dictionaries.length === 0 || !store.activeDictionaryId;
        const defaultName = `${(data.targetLanguage || 'en').toUpperCase()} (${(data.baseLanguage || 'ru').toUpperCase()})`;
        const newDict = {
          id: dictId,
          name: data.name?.trim().length > 0 ? data.name.trim() : defaultName,
          targetLanguage: (data.targetLanguage || 'en').toLowerCase(),
          baseLanguage: (data.baseLanguage || 'ru').toLowerCase(),
          wordCount: 0,
          isActive: isFirst,
          createdAt: new Date().toISOString(),
        };
        store.addDictionary(newDict);
        if (newDict.isActive) {
          store.setActiveDictionaryId(newDict.id);
        }
        store.setDictionary([]);
        return Promise.resolve({ data: { dictionary: newDict } });
      }

      if (method === 'patch') {
        const match = error.url?.match(/\/dictionaries\/(\d+)/);
        if (match) {
          const id = Number(match[1]);
          const data = typeof error.data === 'string' ? JSON.parse(error.data) : (error.data || {});
          if (data.name) {
            store.updateDictionaryItem(id, { name: data.name });
          }
        }
        return Promise.resolve({ data: { success: true } });
      }

      if (method === 'delete') {
        const match = error.url?.match(/\/dictionaries\/(\d+)/);
        if (match) {
          const id = Number(match[1]);
          store.removeDictionary(id);
        }
        return Promise.resolve({ data: { success: true } });
      }

      return Promise.resolve({ data: {} });
    }
    if (error?.isOfflineMock) {
      const store = useStore.getState();
      const dictionary = store.dictionary;
      
      if (!dictionary || dictionary.length === 0) return Promise.resolve({ data: {} });

      const getRandomWord = () => dictionary[Math.floor(Math.random() * dictionary.length)];
      const getRandomDef = (word: DictionaryWord) => word.definitions[Math.floor(Math.random() * word.definitions.length)];

      const url = error.url;
      const data = typeof error.data === 'string' ? JSON.parse(error.data) : error.data;

      if (url === '/quiz/start' || url === '/quiz/next_card') {
        const word = getRandomWord();
        if (word && word.definitions.length > 0) {
          const def = getRandomDef(word);
          const defText = def.text;
          const transText = def.translation?.text ?? null;
          store.setQuizCard({ wordId: word.id, definition: { id: def.id, text: defText, translation: transText, images: def.images } });
        }
      } else if (url === '/quiz/answer') {
        const card = store.quizCard;
        if (card) {
          const word = dictionary.find(w => w.id === card.wordId);
          const isCorrect = data?.suggestion?.toLowerCase().trim() === word?.text.toLowerCase().trim();
          const result = isCorrect ? 'SUCCESS' : 'INCORRECT';
          if (!store.token && word) {
            store.recordGuestQuizAttempt(word.text, result);
          }
          store.setQuizEvaluation({ result, suggestion: data?.suggestion });
        }
      } else if (url === '/quiz/translate_definition') {
        const card = store.quizCard;
        if (card?.definition.translation) {
          store.setQuizTranslation(card.definition.translation);
        } else if (card) {
          store.setQuizTranslation("Translation not available offline");
        }
      } else if (url === '/quiz/next_definition') {
        const card = store.quizCard;
        if (card) {
          const word = dictionary.find(w => w.id === card.wordId);
          if (word && word.definitions.length > 0) {
            const def = getRandomDef(word);
            const defText = def.text;
            const transText = def.translation?.text || null;
            store.setQuizCard({ wordId: word.id, definition: { id: def.id, text: defText, translation: transText, images: def.images } });
          }
        }
      } else if (url === '/quiz/variants') {
        const card = store.quizCard;
        if (card) {
          const word = dictionary.find(w => w.id === card.wordId);
          if (word) {
            const variants = [word.text];
            let attempts = 0;
            while (variants.length < 4 && variants.length < dictionary.length && attempts < 20) {
              const randomWord = getRandomWord().text;
              if (!variants.includes(randomWord)) variants.push(randomWord);
              attempts++;
            }
            store.setQuizVariants(variants.sort(() => Math.random() - 0.5));
          }
        }
      }

      return Promise.resolve({ data: { offline: true } });
    }

    if (error.response && error.response.status === 401) {
      if (useStore.getState().token) {
        useStore.getState().reset();
      }
    }
    
    // Ignore aborted requests or offline/guest mocks for error tracking
    if (
      !axios.isCancel(error) &&
      !error.isOfflineMock &&
      !error.isGuestDictionaryMock &&
      !error.isGuestDictionariesMock &&
      !error.isGuestAddWordMock
    ) {
      trackEvent('API Error', { 
        status: error.response?.status || 'network_error', 
        url: error.config?.url || 'unknown_url' 
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
