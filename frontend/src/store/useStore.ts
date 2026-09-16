import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
  is_admin?: boolean;
}

export interface SettingsState {
  baseLanguage: string;
  targetLanguage: string;
}

export interface DictionaryItem {
  id: number;
  name: string;
  targetLanguage: string;
  baseLanguage: string;
  wordCount: number;
  isActive: boolean;
  createdAt?: string;
}

export interface DictionaryTranslation {
  id: number;
  text: string;
}

export interface PresetBadge {
  id: number;
  title: string;
}

export interface DictionaryDefinition {
  id: number;
  text: string;
  translation: DictionaryTranslation | null;
  presets?: PresetBadge[];
}

export interface DictionaryWord {
  id: number;
  text: string;
  definitions: DictionaryDefinition[];
  presets?: PresetBadge[];
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

export interface WordMasteryStats {
  newWords: number;
  learningWords: number;
  masteredWords: number;
}

export interface NeedsAttentionWord {
  wordId: number;
  text: string;
  definition: string;
  translation: string | null;
  errorCount: number;
  successCount: number;
  lastResult: string;
}

export interface DayActivity {
  date: string;
  dayLabel: string;
  count: number;
}

export interface DashboardStats {
  streak: number;
  todayCount: number;
  totalWords: number;
  totalDefinitions: number;
  totalAttempts: number;
  accuracy: number;
  mastery: WordMasteryStats;
  needsAttention: NeedsAttentionWord[];
  weeklyActivity: DayActivity[];
}

export type SyncActionPayload = 
  | { type: 'EDIT_TRANSLATION'; wordId: number; definitionId: number; text: string }
  | { type: 'DELETE_WORD'; wordId: number }
  | { type: 'DELETE_DEFINITION'; wordId: number; definitionId: number };

export type SyncAction = SyncActionPayload & { timestamp: number };

interface AppState {
  token: string | null;
  mercureToken: string | null;
  isOffline: boolean;
  syncQueue: SyncAction[];
  profile: UserProfile | null;
  settings: SettingsState | null;
  dictionaries: DictionaryItem[];
  activeDictionaryId: number | null;
  selectedDictionaryId: number | null;
  setSelectedDictionaryId: (selectedDictionaryId: number | null) => void;
  appState: any | null;
  dictionary: DictionaryWord[];
  quizCard: QuizCardData | null;
  quizEvaluation: QuizEvaluationData | null;
  quizTranslation: string | null;
  quizVariants: string[] | null;
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats | null) => void;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (themeMode: 'light' | 'dark' | 'system') => void;
  toggleThemeMode: () => void;
  setIsOffline: (isOffline: boolean) => void;
  enqueueSyncAction: (action: SyncActionPayload) => void;
  clearSyncQueue: () => void;
  setToken: (token: string | null) => void;
  setMercureToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: SettingsState | null) => void;
  setDictionaries: (dictionaries: DictionaryItem[]) => void;
  setActiveDictionaryId: (activeDictionaryId: number | null) => void;
  addDictionary: (dictionary: DictionaryItem) => void;
  removeDictionary: (id: number) => void;
  updateDictionaryItem: (id: number, partial: Partial<DictionaryItem>) => void;
  setAppState: (appState: any) => void;
  setDictionary: (dictionary: DictionaryWord[]) => void;
  addDictionaryWord: (word: DictionaryWord) => void;
  addDictionaryWords: (words: DictionaryWord[]) => void;
  removeDictionaryWord: (wordId: number) => void;
  setDictionaryDefinitions: (wordId: number, definitions: { id: number; text: string }[], wordText?: string) => void;
  setDictionaryDefinitionsBatch: (items: { wordId: number; word: string; definitions: { id: number; text: string; presets?: PresetBadge[] }[] }[]) => void;
  updateDictionaryDefinition: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslation: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslationsBatch: (words: { wordId: number; definitions: { id: number; translation: string }[] }[]) => void;
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
  isOffline: !navigator.onLine,
  syncQueue: [] as SyncAction[],
  profile: null,
  settings: null,
  dictionaries: [] as DictionaryItem[],
  activeDictionaryId: null as number | null,
  selectedDictionaryId: null as number | null,
  appState: null,
  dictionary: [],
  quizCard: null,
  quizEvaluation: null,
  quizTranslation: null,
  quizVariants: null,
  dashboardStats: null,
  themeMode: 'light' as 'light' | 'dark' | 'system',
};

const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () => set((state) => {
        let currentMode = state.themeMode;
        if (currentMode === 'system') {
          const isDarkSystem = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
          currentMode = isDarkSystem ? 'dark' : 'light';
        }
        return { themeMode: currentMode === 'dark' ? 'light' : 'dark' };
      }),
      setIsOffline: (isOffline) => set({ isOffline }),
      enqueueSyncAction: (action) => set((state) => ({ 
        syncQueue: [...state.syncQueue, { ...action, timestamp: Date.now() } as SyncAction] 
      })),
      clearSyncQueue: () => set({ syncQueue: [] }),
      setToken: (token) => set({ token }),
      setMercureToken: (mercureToken) => set({ mercureToken }),
      setProfile: (profile) => set({ profile }),
      setSettings: (settings) => set({ settings }),
      setDictionaries: (dictionaries) => set({ dictionaries }),
      setActiveDictionaryId: (activeDictionaryId) => set((state) => ({
        activeDictionaryId,
        dictionaries: state.dictionaries.map(d => ({
          ...d,
          isActive: d.id === activeDictionaryId
        }))
      })),
      setSelectedDictionaryId: (selectedDictionaryId) => set({ selectedDictionaryId }),
      addDictionary: (dict) => set((state) => ({
        dictionaries: state.dictionaries.some(d => d.id === dict.id)
          ? state.dictionaries.map(d => d.id === dict.id ? dict : d)
          : [...state.dictionaries, dict]
      })),
      removeDictionary: (id) => set((state) => ({
        dictionaries: state.dictionaries.filter(d => d.id !== id),
        activeDictionaryId: state.activeDictionaryId === id ? null : state.activeDictionaryId,
        selectedDictionaryId: state.selectedDictionaryId === id ? null : state.selectedDictionaryId,
      })),
      updateDictionaryItem: (id, partial) => set((state) => ({
        dictionaries: state.dictionaries.map(d => d.id === id ? { ...d, ...partial } : d)
      })),
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
        const activeDictionaryId = appState?.activeDictionaryId ?? state.activeDictionaryId;
        return {
          appState,
          quizCard,
          activeDictionaryId,
          dictionaries: state.dictionaries.map(d => ({
            ...d,
            isActive: d.id === activeDictionaryId
          }))
        };
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
      setDashboardStats: (dashboardStats) => set({ dashboardStats }),
      addDictionaryWord: (word) => set((state) => {
        const exists = state.dictionary.some(w => w.id === word.id || w.text.toLowerCase() === word.text.toLowerCase());
        if (exists) return state;
        return { dictionary: [word, ...state.dictionary] };
      }),
      addDictionaryWords: (words) => set((state) => {
        const existingIds = new Set(state.dictionary.map(w => w.id));
        const existingTexts = new Set(state.dictionary.map(w => w.text.toLowerCase()));
        const newWords = words.filter(w => !existingIds.has(w.id) && !existingTexts.has(w.text.toLowerCase()));
        if (newWords.length === 0) return state;
        return { dictionary: [...newWords, ...state.dictionary] };
      }),
      removeDictionaryWord: (wordId) => set((state) => {
        const shouldResetQuiz = state.quizCard?.wordId === wordId;
        if (state.isOffline) {
          state.enqueueSyncAction({ type: 'DELETE_WORD', wordId });
        }
        return {
          dictionary: state.dictionary.filter((w) => w.id !== wordId),
          ...(shouldResetQuiz && { quizCard: null, quizEvaluation: null, quizTranslation: null, quizVariants: null })
        };
      }),
      setDictionaryDefinitions: (wordId, definitions, wordText) => set((state) => {
        const wordExists = state.dictionary.some((w) => w.id === wordId);
        const mappedDefs = definitions.map((d) => ({
          id: d.id,
          text: d.text,
          translation: (d as any).translation ?? null,
          presets: (d as any).presets ?? [],
        }));

        if (!wordExists && wordText) {
          return {
            dictionary: [
              {
                id: wordId,
                text: wordText,
                definitions: mappedDefs,
                presets: [],
              },
              ...state.dictionary,
            ],
          };
        }

        return {
          dictionary: state.dictionary.map((word) => {
            if (word.id === wordId) {
              const existingDefs = word.definitions || [];
              const mergedDefs = [...existingDefs];
              for (const nd of mappedDefs) {
                const existingIdx = mergedDefs.findIndex((ed) => ed.id === nd.id);
                if (existingIdx === -1) {
                  mergedDefs.push(nd);
                } else if (nd.presets && nd.presets.length > 0) {
                  mergedDefs[existingIdx] = {
                    ...mergedDefs[existingIdx],
                    presets: nd.presets,
                  };
                }
              }
              return {
                ...word,
                definitions: mergedDefs,
              };
            }
            return word;
          }),
        };
      }),
      setDictionaryDefinitionsBatch: (items) => set((state) => {
        const itemsMap = new Map(items.map((item) => [item.wordId, item]));
        const existingWordIds = new Set(state.dictionary.map((w) => w.id));

        const missingWords: DictionaryWord[] = items
          .filter((item) => !existingWordIds.has(item.wordId))
          .map((item) => ({
            id: item.wordId,
            text: item.word,
            definitions: item.definitions.map((d) => ({
              id: d.id,
              text: d.text,
              translation: (d as any).translation ?? null,
              presets: (d as any).presets ?? [],
            })),
            presets: [],
          }));

        const updatedDictionary = state.dictionary.map((word) => {
          const item = itemsMap.get(word.id);
          if (!item) return word;

          const existingDefs = word.definitions || [];
          const mergedDefs = [...existingDefs];
          const mappedNewDefs = item.definitions.map((d) => ({
            id: d.id,
            text: d.text,
            translation: (d as any).translation ?? null,
            presets: (d as any).presets ?? [],
          }));

          for (const nd of mappedNewDefs) {
            const existingIdx = mergedDefs.findIndex((ed) => ed.id === nd.id);
            if (existingIdx === -1) {
              mergedDefs.push(nd);
            } else if (nd.presets && nd.presets.length > 0) {
              mergedDefs[existingIdx] = {
                ...mergedDefs[existingIdx],
                presets: nd.presets,
              };
            }
          }

          return {
            ...word,
            definitions: mergedDefs,
          };
        });

        return {
          dictionary: [...missingWords, ...updatedDictionary],
        };
      }),
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
      updateDictionaryTranslation: (wordId, definitionId, text) => set((state) => {
        if (state.isOffline) {
          state.enqueueSyncAction({ type: 'EDIT_TRANSLATION', wordId, definitionId, text });
        }
        return {
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
        };
      }),
      addDictionaryDefinition: (wordId, definition) => set((state) => ({
        dictionary: state.dictionary.map(word => 
          word.id === wordId ? {
            ...word,
            definitions: [...word.definitions, definition]
          } : word
        )
      })),
      removeDictionaryDefinition: (wordId, definitionId) => set((state) => {
        if (state.isOffline) {
          state.enqueueSyncAction({ type: 'DELETE_DEFINITION', wordId, definitionId });
        }
        return {
          dictionary: state.dictionary.map(word => 
            word.id === wordId ? {
              ...word,
              definitions: word.definitions.filter(def => def.id !== definitionId)
            } : word
          )
        };
      }),
      reset: () => set((state) => ({ ...initialState, themeMode: state.themeMode, isOffline: !navigator.onLine })),
    }),
    {
      name: 'english-card-bot-storage',
    }
  )
);

export default useStore;
