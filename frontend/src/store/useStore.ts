import { create } from 'zustand';

interface UserProfile {
  id: number;
  username: string;
}

export interface WordProcessingStatus {
  word: string;
  status: 'processing' | 'definitions_received' | 'processed' | 'duplicate';
  definitionsCount?: number;
  processedCount?: number;
  totalDefinitions?: number;
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

interface AppState {
  token: string | null;
  profile: UserProfile | null;
  appState: any | null;
  wordProcessing: WordProcessingStatus[];
  dictionary: DictionaryWord[];
  quizCard: QuizCardData | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAppState: (appState: any) => void;
  updateWordProcessing: (status: WordProcessingStatus) => void;
  setDictionary: (dictionary: DictionaryWord[]) => void;
  removeDictionaryWord: (wordId: number) => void;
  updateDictionaryDefinition: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslation: (wordId: number, definitionId: number, text: string) => void;
  addDictionaryDefinition: (wordId: number, definition: DictionaryDefinition) => void;
  removeDictionaryDefinition: (wordId: number, definitionId: number) => void;
  setQuizCard: (card: QuizCardData | null) => void;
}

const useStore = create<AppState>((set) => ({
  token: null,
  profile: null,
  appState: null,
  wordProcessing: [],
  dictionary: [],
  quizCard: null,
  setToken: (token) => set({ token }),
  setProfile: (profile) => set({ profile }),
  setAppState: (appState) => set({ appState }),
  setDictionary: (dictionary) => set({ dictionary }),
  setQuizCard: (card) => set({ quizCard: card }),
  updateWordProcessing: (status) => set((state) => {
    const existingIndex = state.wordProcessing.findIndex((w) => w.word === status.word);
    if (existingIndex >= 0) {
      const newList = [...state.wordProcessing];
      newList[existingIndex] = { ...newList[existingIndex], ...status };
      return { wordProcessing: newList };
    }
    return { wordProcessing: [...state.wordProcessing, status] };
  }),
  removeDictionaryWord: (wordId) => set((state) => ({
    dictionary: state.dictionary.filter((w) => w.id !== wordId),
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
}));

export default useStore;
