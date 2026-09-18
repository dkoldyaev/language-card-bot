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

export interface GuestQuizAttempt {
  wordText: string;
  result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
  createdAt: string;
}

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
  guestQuizAttempts: GuestQuizAttempt[];
  guestDictionaryWords: Record<number, DictionaryWord[]>;
  recordGuestQuizAttempt: (wordText: string, result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT') => void;
  clearGuestData: () => void;
  hasCompletedGuestOnboarding: boolean;
  setHasCompletedGuestOnboarding: (hasCompletedGuestOnboarding: boolean) => void;
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
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (hasSeen: boolean) => void;
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
  dictionary: [] as DictionaryWord[],
  guestQuizAttempts: [] as GuestQuizAttempt[],
  guestDictionaryWords: {} as Record<number, DictionaryWord[]>,
  quizCard: null,
  quizEvaluation: null,
  quizTranslation: null,
  quizVariants: null,
  dashboardStats: null,
  themeMode: 'light' as 'light' | 'dark' | 'system',
  hasSeenOnboarding: false,
  hasCompletedGuestOnboarding: false,
};

export const normalizeWordDefinitions = (word: DictionaryWord, baseLang?: string): DictionaryWord => {
  return {
    ...word,
    definitions: (word.definitions || []).map((def: any) => {
      let text = def.text;
      let translation = def.translation;
      if (text && typeof text === 'object') {
        if (text.translations && !translation && baseLang) {
          const transStr = text.translations[baseLang];
          if (transStr) {
            translation = { id: def.id, text: transStr };
          }
        }
        text = typeof text.text === 'string' ? text.text : '';
      }
      if (typeof translation === 'string') {
        translation = { id: def.id, text: translation };
      }
      return {
        ...def,
        text,
        translation,
      };
    }),
  };
};

export const normalizeWords = (words: DictionaryWord[], baseLang?: string): DictionaryWord[] => {
  return (words || []).map((w) => normalizeWordDefinitions(w, baseLang));
};

const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setHasCompletedGuestOnboarding: (hasCompletedGuestOnboarding) => set({ hasCompletedGuestOnboarding }),
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
      setSelectedDictionaryId: (selectedDictionaryId) => set((state) => {
        if (!state.token && selectedDictionaryId) {
          const dict = state.dictionaries.find(d => d.id === selectedDictionaryId);
          const baseLang = dict?.baseLanguage?.toLowerCase();
          const dictWords = normalizeWords(state.guestDictionaryWords[selectedDictionaryId] || [], baseLang);
          return {
            selectedDictionaryId,
            dictionary: dictWords,
          };
        }
        return { selectedDictionaryId };
      }),
      addDictionary: (dict) => set((state) => ({
        dictionaries: state.dictionaries.some(d => d.id === dict.id)
          ? state.dictionaries.map(d => d.id === dict.id ? dict : d)
          : [...state.dictionaries, dict]
      })),
      removeDictionary: (id) => set((state) => {
        const updatedGuestWords = { ...state.guestDictionaryWords };
        delete updatedGuestWords[id];
        return {
          dictionaries: state.dictionaries.filter(d => d.id !== id),
          guestDictionaryWords: updatedGuestWords,
          activeDictionaryId: state.activeDictionaryId === id ? null : state.activeDictionaryId,
          selectedDictionaryId: state.selectedDictionaryId === id ? null : state.selectedDictionaryId,
        };
      }),
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
        const normalizedDictionary = (dictionary || []).map((word) => ({
          ...word,
          definitions: (word.definitions || []).map((def: any) => {
            let text = def.text;
            let translation = def.translation;
            if (text && typeof text === 'object') {
              if (text.translations && !translation) {
                const baseLang = state.dictionaries.find(d => d.id === state.selectedDictionaryId)?.baseLanguage?.toLowerCase();
                const transStr = baseLang ? text.translations[baseLang] : null;
                if (transStr) {
                  translation = { id: def.id, text: transStr };
                }
              }
              text = text.text || '';
            }
            return {
              ...def,
              text,
              translation,
            };
          }),
        }));
        const dictionaryWordIds = new Set(normalizedDictionary.map(w => w.id));
        const shouldResetQuiz = state.quizCard && !dictionaryWordIds.has(state.quizCard.wordId);
        const currentDictId = state.selectedDictionaryId ?? state.activeDictionaryId ?? state.dictionaries[0]?.id;
        const updatedGuestWords = (!state.token && currentDictId)
          ? { ...state.guestDictionaryWords, [currentDictId]: normalizedDictionary }
          : state.guestDictionaryWords;
        return {
          dictionary: normalizedDictionary,
          guestDictionaryWords: updatedGuestWords,
          ...(shouldResetQuiz ? { quizCard: null, quizVariants: null } : {})
        };
      }),
      setQuizCard: (card) => set({ quizCard: card, quizEvaluation: null, quizTranslation: null, quizVariants: null }),
      setQuizEvaluation: (evalData) => set({ quizEvaluation: evalData }),
      setQuizTranslation: (translation) => set({ quizTranslation: translation }),
      setQuizVariants: (variants) => set({ quizVariants: variants }),
      setDashboardStats: (dashboardStats) => set({ dashboardStats }),
      addDictionaryWord: (word) => set((state) => {
        const dict = state.dictionaries.find(d => d.id === state.selectedDictionaryId) ?? state.dictionaries[0];
        const normalized = normalizeWordDefinitions(word, dict?.baseLanguage?.toLowerCase());
        const exists = state.dictionary.some(w => w.id === normalized.id || w.text.toLowerCase() === normalized.text.toLowerCase());
        if (exists) return state;
        return { dictionary: [normalized, ...state.dictionary] };
      }),
      addDictionaryWords: (words) => set((state) => {
        const dict = state.dictionaries.find(d => d.id === state.selectedDictionaryId) ?? state.dictionaries[0];
        const normalized = normalizeWords(words, dict?.baseLanguage?.toLowerCase());
        const existingIds = new Set(state.dictionary.map(w => w.id));
        const existingTexts = new Set(state.dictionary.map(w => w.text.toLowerCase()));
        const newWords = normalized.filter(w => !existingIds.has(w.id) && !existingTexts.has(w.text.toLowerCase()));
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
      updateDictionaryTranslationsBatch: (words) => set((state) => {
        const wordsMap = new Map(words.map((w) => [
          w.wordId,
          new Map(w.definitions.map((d) => [d.id, d.translation]))
        ]));

        return {
          dictionary: state.dictionary.map((word) => {
            const defsMap = wordsMap.get(word.id);
            if (!defsMap) return word;

            return {
              ...word,
              definitions: word.definitions.map((def) => {
                const translationText = defsMap.get(def.id);
                if (translationText !== undefined) {
                  return {
                    ...def,
                    translation: def.translation
                      ? { ...def.translation, text: translationText }
                      : { id: Date.now(), text: translationText }
                  };
                }
                return def;
              }),
            };
          }),
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
      recordGuestQuizAttempt: (wordText, result) => set((state) => ({
        guestQuizAttempts: [
          ...state.guestQuizAttempts,
          { wordText, result, createdAt: new Date().toISOString() },
        ],
      })),
      clearGuestData: () => set({
        guestQuizAttempts: [],
        guestDictionaryWords: {},
        dictionary: [],
        dictionaries: [],
        activeDictionaryId: null,
        selectedDictionaryId: null,
        dashboardStats: null,
        quizCard: null,
        quizEvaluation: null,
        quizTranslation: null,
        quizVariants: null,
        hasSeenOnboarding: false,
        hasCompletedGuestOnboarding: false,
      }),
      reset: () => set((state) => ({ ...initialState, themeMode: state.themeMode, isOffline: !navigator.onLine })),
    }),
    {
      name: 'english-card-bot-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.dictionary)) {
            state.dictionary = normalizeWords(state.dictionary);
          }
          if (state.guestDictionaryWords && typeof state.guestDictionaryWords === 'object') {
            for (const [id, words] of Object.entries(state.guestDictionaryWords)) {
              if (Array.isArray(words)) {
                state.guestDictionaryWords[Number(id)] = normalizeWords(words);
              }
            }
          }
        }
      },
    }
  )
);

export default useStore;
