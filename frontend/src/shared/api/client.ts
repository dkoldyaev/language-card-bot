import axios from 'axios';
import useStore from '../../store/useStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
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

    if (state.isOffline && config.url?.startsWith('/quiz/')) {
      return Promise.reject({ isOfflineMock: true, url: config.url, data: config.data });
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
    if (error && error.isOfflineMock) {
      const store = useStore.getState();
      const dictionary = store.dictionary;
      
      if (!dictionary || dictionary.length === 0) return Promise.resolve({ data: {} });

      const getRandomWord = () => dictionary[Math.floor(Math.random() * dictionary.length)];
      const getRandomDef = (word: any) => word.definitions[Math.floor(Math.random() * word.definitions.length)];

      const url = error.url;
      const data = typeof error.data === 'string' ? JSON.parse(error.data) : error.data;

      if (url === '/quiz/start' || url === '/quiz/next_card') {
        const word = getRandomWord();
        if (word && word.definitions.length > 0) {
          const def = getRandomDef(word);
          store.setQuizCard({ wordId: word.id, definition: { id: def.id, text: def.text, translation: def.translation?.text || null } });
        }
      } else if (url === '/quiz/answer') {
        const card = store.quizCard;
        if (card) {
          const word = dictionary.find(w => w.id === card.wordId);
          const isCorrect = data?.suggestion?.toLowerCase().trim() === word?.text.toLowerCase().trim();
          store.setQuizEvaluation({ result: isCorrect ? 'SUCCESS' : 'INCORRECT', suggestion: data?.suggestion });
        }
      } else if (url === '/quiz/translate_definition') {
        const card = store.quizCard;
        if (card && card.definition.translation) {
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
            store.setQuizCard({ wordId: word.id, definition: { id: def.id, text: def.text, translation: def.translation?.text || null } });
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
      useStore.getState().reset();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
