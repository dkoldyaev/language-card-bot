import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  id: number;
  username: string;
}

export interface SettingsState {
  baseLanguage: string;
  targetLanguage: string;
  desiredLevel: string;
}


export interface DictionaryTranslation {
  id: number;
  text: string;
}

export interface DictionaryDefinition {
  id: number;
  text: string;
  translation: DictionaryTranslation | null;
}

export interface DictionaryWord {
  id: number;
  text: string;
  definitions: DictionaryDefinition[];
}

export interface QuizCardData {
  wordId: number;
  definition: {
    id: number;
    text: string;
    translation: string | null;
  };
}

export interface QuizEvaluationData {
  result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
  suggestion: string;
}

interface AppState {
  token: string | null;
  mercureToken: string | null;
  profile: UserProfile | null;
  settings: SettingsState | null;
  appState: any | null;
  dictionary: DictionaryWord[];
  quizCard: QuizCardData | null;
  quizEvaluation: QuizEvaluationData | null;
  quizTranslation: string | null;
  quizVariants: string[] | null;
  setToken: (token: string | null) => void;
  setMercureToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: SettingsState | null) => void;
  setAppState: (appState: any) => void;
  setDictionary: (dictionary: DictionaryWord[]) => void;
  addDictionaryWord: (word: DictionaryWord) => void;
  removeDictionaryWord: (wordId: number) => void;
  setDictionaryDefinitions: (wordId: number, definitions: { id: number; text: string }[]) => void;
  updateDictionaryDefinition: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslation: (wordId: number, definitionId: number, text: string) => void;
  addDictionaryDefinition: (wordId: number, definition: DictionaryDefinition) => void;
  removeDictionaryDefinition: (wordId: number, definitionId: number) => void;
  setQuizCard: (card: QuizCardData | null) => void;
  setQuizEvaluation: (evalData: QuizEvaluationData | null) => void;
  setQuizTranslation: (translation: string | null) => void;
  setQuizVariants: (variants: string[] | null) => void;
  reset: () => void;
}

const initialState = {
  token: null,
  mercureToken: null,
  profile: null,
  settings: null,
  appState: null,
  dictionary: [],
  quizCard: null,
  quizEvaluation: null,
  quizTranslation: null,
  quizVariants: null,
};

const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setToken: (token) => set({ token }),
      setMercureToken: (mercureToken) => set({ mercureToken }),
      setProfile: (profile) => set({ profile }),
      setSettings: (settings) => set({ settings }),
      setAppState: (appState) => set((state) => {
        let quizCard = state.quizCard;
        if (appState && appState.currentWord && appState.currentDefinition) {
          quizCard = {
            wordId: appState.currentWord.id,
            definition: {
              id: appState.currentDefinition.id,
              text: appState.currentDefinition.text,
              translation: appState.currentDefinition.translation
            }
          };
        }
        return { appState, quizCard };
      }),
      setDictionary: (dictionary) => set((state) => {
        const dictionaryWordIds = new Set(dictionary.map(w => w.id));
        const shouldResetQuiz = state.quizCard && !dictionaryWordIds.has(state.quizCard.wordId);
        return { 
          dictionary,
          ...(shouldResetQuiz && { quizCard: null, quizEvaluation: null, quizTranslation: null, quizVariants: null })
        };
      }),
      setQuizCard: (card) => set({ quizCard: card, quizEvaluation: null, quizTranslation: null, quizVariants: null }),
      setQuizEvaluation: (evalData) => set({ quizEvaluation: evalData }),
      setQuizTranslation: (translation) => set({ quizTranslation: translation }),
      setQuizVariants: (variants) => set({ quizVariants: variants }),
      addDictionaryWord: (word) => set((state) => {
        const exists = state.dictionary.some(w => w.id === word.id || w.text.toLowerCase() === word.text.toLowerCase());
        if (exists) return state;
        return { dictionary: [word, ...state.dictionary] };
      }),
      removeDictionaryWord: (wordId) => set((state) => {
        const shouldResetQuiz = state.quizCard?.wordId === wordId;
        return {
          dictionary: state.dictionary.filter((w) => w.id !== wordId),
          ...(shouldResetQuiz && { quizCard: null, quizEvaluation: null, quizTranslation: null, quizVariants: null })
        };
      }),
      setDictionaryDefinitions: (wordId, definitions) => set((state) => ({
        dictionary: state.dictionary.map(word => {
          if (word.id === wordId) {
            const existingDefs = word.definitions || [];
            const newDefs = definitions.map(d => ({ id: d.id, text: d.text, translation: null }));
            const mergedDefs = [...existingDefs];
            for (const nd of newDefs) {
              if (!mergedDefs.some(ed => ed.id === nd.id)) {
                mergedDefs.push(nd);
              }
            }
            return {
              ...word,
              definitions: mergedDefs
            };
          }
          return word;
        })
      })),
      updateDictionaryDefinition: (wordId, definitionId, text) => set((state) => ({
        dictionary: state.dictionary.map(word => 
          word.id === wordId ? {
            ...word,
            definitions: word.definitions.map(def => 
              def.id === definitionId ? { ...def, text } : def
            )
          } : word
        )
      })),
      updateDictionaryTranslation: (wordId, definitionId, text) => set((state) => ({
        dictionary: state.dictionary.map(word => 
          word.id === wordId ? {
            ...word,
            definitions: word.definitions.map(def => 
              def.id === definitionId ? { 
                ...def, 
                translation: def.translation ? { ...def.translation, text } : { id: Date.now(), text } 
              } : def
            )
          } : word
        )
      })),
      addDictionaryDefinition: (wordId, definition) => set((state) => ({
        dictionary: state.dictionary.map(word => 
          word.id === wordId ? {
            ...word,
            definitions: [...word.definitions, definition]
          } : word
        )
      })),
      removeDictionaryDefinition: (wordId, definitionId) => set((state) => ({
        dictionary: state.dictionary.map(word => 
          word.id === wordId ? {
            ...word,
            definitions: word.definitions.filter(def => def.id !== definitionId)
          } : word
        )
      })),
      reset: () => set(initialState),
    }),
    {
      name: 'english-card-bot-storage', // unique name
      // you can also specify partialize here if you don't want to save some states (e.g., wordProcessing)
      // but for now saving everything is fine to keep the user logged in
    }
  )
);

export default useStore;
