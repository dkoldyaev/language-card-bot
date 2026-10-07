import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LanguageCode } from '../shared/i18n/types';

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
  is_admin?: boolean;
  isAnonymous?: boolean;
  active_dictionary_id?: number | null;
}

export interface SettingsState {
  baseLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface DictionaryItem {
  id: number;
  name: string;
  targetLanguage: LanguageCode;
  baseLanguage: LanguageCode;
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
  images?: QuizCardImageItem[];
}

export interface UnnormalizedDefinitionText {
  text?: string;
  translations?: Record<string, string>;
}

export interface UnnormalizedDefinition {
  id: number;
  text: string | UnnormalizedDefinitionText;
  translation?: DictionaryTranslation | string | null;
  presets?: PresetBadge[];
}

export interface DictionaryWord {
  id: number;
  text: string;
  definitions: DictionaryDefinition[];
  presets?: PresetBadge[];
  isProcessing?: boolean;
}

export interface UnnormalizedWord {
  id: number;
  text: string;
  definitions: UnnormalizedDefinition[];
  presets?: PresetBadge[];
  isProcessing?: boolean;
}

export interface AppSyncState {
  currentWord?: { id: number; text?: string } | null;
  currentDefinition?: {
    id: number;
    text: string;
    translation: string | null;
    images?: QuizCardImageItem[];
  } | null;
  activeDictionaryId?: number | null;
  mode?: string;
  type?: string;
}

export interface DefinitionInput {
  id: number;
  text: string;
  translation?: DictionaryTranslation;
  presets?: PresetBadge[];
}

export interface QuizCardImageItem {
  id: number;
  url: string;
  source: string;
}

export interface QuizCardData {
  wordId: number;
  definition: {
    id: number;
    text: string;
    translation: string | null;
    images?: QuizCardImageItem[];
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

export interface GuestQuizAttempt {
  wordText: string;
  result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
  createdAt: string;
}

interface AppState {
  token: string | null;
  mercureToken: string | null;
  profile: UserProfile | null;
  settings: SettingsState | null;
  dictionaries: DictionaryItem[];
  activeDictionaryId: number | null;

  appState: AppSyncState | null;
  isDictionaryLoading: boolean;
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
  setToken: (token: string | null) => void;
  setMercureToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: SettingsState | null) => void;
  setDictionaries: (dictionaries: DictionaryItem[]) => void;
  setActiveDictionaryId: (id: number | null) => void;
  addDictionary: (dictionary: DictionaryItem) => void;
  removeDictionary: (id: number) => void;
  updateDictionaryItem: (id: number, partial: Partial<DictionaryItem>) => void;
  setAppState: (appState: AppSyncState | null) => void;
  setIsDictionaryLoading: (isLoading: boolean) => void;
  setDictionary: (dictionary: DictionaryWord[], dictId?: number, options?: { updateActiveId?: boolean }) => void;
  addDictionaryWord: (word: DictionaryWord, dictId?: number) => void;
  addDictionaryWords: (words: DictionaryWord[], dictId?: number) => void;
  removeDictionaryWord: (wordId: number) => void;
  setDictionaryDefinitions: (wordId: number, definitions: DefinitionInput[], wordText?: string) => void;
  setDictionaryDefinitionsBatch: (items: { wordId: number; word: string; definitions: DefinitionInput[] }[]) => void;
  updateDictionaryDefinition: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslation: (wordId: number, definitionId: number, text: string) => void;
  updateDictionaryTranslationsBatch: (words: { wordId: number; definitions: { id: number; translation: string }[] }[]) => void;
  addDictionaryDefinition: (wordId: number, definition: DictionaryDefinition) => void;
  removeDictionaryDefinition: (wordId: number, definitionId: number) => void;
  removeDefinitionImage: (wordId: number, definitionId: number, imageId: number) => void;
  setQuizCard: (card: QuizCardData | null) => void;
  setQuizEvaluation: (evalData: QuizEvaluationData | null) => void;
  setQuizTranslation: (translation: string | null) => void;
  setQuizVariants: (variants: string[] | null) => void;
  setDefinitionImagesBatch: (items: Array<{ id: number; images: QuizCardImageItem[] }>) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (hasSeen: boolean) => void;
  presets: unknown[]; // Type should be PresetItem[] but we don't have it imported here. It's fine for now, or we can use unknown[]
  setPresets: (presets: unknown[]) => void;
  reset: () => void;
}

const initialState = {
  token: null,
  mercureToken: null,
  profile: null,
  settings: null,
  dictionaries: [] as DictionaryItem[],
  activeDictionaryId: null as number | null,

  appState: null,
  isDictionaryLoading: true,
  dictionary: [] as DictionaryWord[],
  guestQuizAttempts: [] as GuestQuizAttempt[],
  guestDictionaryWords: {} as Record<number, DictionaryWord[]>,
  quizCard: null,
  quizEvaluation: null,
  quizTranslation: null,
  quizVariants: null,
  dashboardStats: null,
  presets: [] as unknown[], // Using unknown[] temporarily, will be typed below
  themeMode: 'light' as 'light' | 'dark' | 'system',
  hasSeenOnboarding: false,
  hasCompletedGuestOnboarding: false,
};

export const normalizeWordDefinitions = (word: UnnormalizedWord | DictionaryWord, baseLang?: string): DictionaryWord => {
  return {
    ...word,
    isProcessing: word.isProcessing,
    definitions: (word.definitions || []).map((def) => {
      let text: string | UnnormalizedDefinitionText = def.text;
      let translation: DictionaryTranslation | string | null | undefined = def.translation;
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
        text: text as string,
        translation: translation ?? null,
      };
    }),
  };
};

export const normalizeWords = (words: (UnnormalizedWord | DictionaryWord)[], baseLang?: string): DictionaryWord[] => {
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
      setToken: (token) => set({ token }),
      setMercureToken: (mercureToken) => set({ mercureToken }),
      setProfile: (profile) => set({ profile }),
      setSettings: (settings) => set({ settings }),
      setDictionaries: (dictionaries) => set({ dictionaries }),
      setActiveDictionaryId: (activeDictionaryId) => set({ activeDictionaryId }),

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
        };
      }),
      updateDictionaryItem: (id, partial) => set((state) => ({
        dictionaries: state.dictionaries.map(d => d.id === id ? { ...d, ...partial } : d)
      })),
      setAppState: (appState) => set((state) => {
        let quizCard = state.quizCard;
        if (appState?.currentWord && appState.currentDefinition) {
          quizCard = {
            wordId: appState.currentWord.id,
            definition: {
              id: appState.currentDefinition.id,
              text: appState.currentDefinition.text,
              translation: appState.currentDefinition.translation,
              images: appState.currentDefinition.images
            }
          };
        }
        return {
          appState,
          quizCard,
        };
      }),
      setIsDictionaryLoading: (isDictionaryLoading) => set({ isDictionaryLoading }),
      setDictionary: (dictionary, dictId, options = { updateActiveId: true }) => set((state) => {
        const dict = dictId ? state.dictionaries.find(d => d.id === dictId) : undefined;
        const normalizedDictionary = (dictionary || []).map((word) => normalizeWordDefinitions(word, dict?.baseLanguage?.toLowerCase()));
        
        const dictionaryWordIds = new Set(normalizedDictionary.map(w => w.id));
        const shouldResetQuiz = state.quizCard && !dictionaryWordIds.has(state.quizCard.wordId);
        
        const updatedGuestWords = (!state.token && dictId)
          ? { ...state.guestDictionaryWords, [dictId]: normalizedDictionary }
          : state.guestDictionaryWords;
        return {
          dictionary: normalizedDictionary,
          guestDictionaryWords: updatedGuestWords,
          ...(options.updateActiveId && dictId !== undefined ? { activeDictionaryId: dictId } : {}),
          ...(shouldResetQuiz ? { quizCard: null, quizVariants: null } : {})
        };
      }),
      setQuizCard: (card) => set({ quizCard: card, quizEvaluation: null, quizTranslation: null, quizVariants: null }),
      setQuizEvaluation: (evalData) => set({ quizEvaluation: evalData }),
      setQuizTranslation: (translation) => set({ quizTranslation: translation }),
      setQuizVariants: (variants) => set({ quizVariants: variants }),
      setDefinitionImagesBatch: (items) => set((state) => {
        const imageMap = new Map(items.map((item) => [item.id, item.images]));
        let quizCard = state.quizCard;
        if (quizCard && imageMap.has(quizCard.definition.id)) {
          quizCard = {
            ...quizCard,
            definition: {
              ...quizCard.definition,
              images: imageMap.get(quizCard.definition.id),
            },
          };
        }
        const dictionary = state.dictionary.map((w) => ({
          ...w,
          definitions: w.definitions.map((d) => {
            if (imageMap.has(d.id)) {
              return { ...d, images: imageMap.get(d.id) };
            }
            return d;
          }),
        }));
        return { quizCard, dictionary };
      }),
      setDashboardStats: (dashboardStats) => set({ dashboardStats }),
      setPresets: (presets) => set({ presets }),
      addDictionaryWord: (word, dictId) => set((state) => {
        const dict = dictId ? state.dictionaries.find(d => d.id === dictId) : undefined;
        const normalized = normalizeWordDefinitions(word, dict?.baseLanguage?.toLowerCase());
        const exists = state.dictionary.some(w => w.id === normalized.id || w.text.toLowerCase() === normalized.text.toLowerCase());
        if (exists) return state;
        return { dictionary: [normalized, ...state.dictionary] };
      }),
      addDictionaryWords: (words, dictId) => set((state) => {
        const dict = dictId ? state.dictionaries.find(d => d.id === dictId) : undefined;
        const normalized = normalizeWords(words, dict?.baseLanguage?.toLowerCase());
        const existingIds = new Set(state.dictionary.map(w => w.id));
        const existingTexts = new Set(state.dictionary.map(w => w.text.toLowerCase()));
        const newWords = normalized.filter(w => !existingIds.has(w.id) && !existingTexts.has(w.text.toLowerCase()));
        if (newWords.length === 0) return state;
        return { dictionary: [...newWords, ...state.dictionary] };
      }),
      removeDictionaryWord: (wordId) => set((state) => {
        const shouldResetQuiz = state.quizCard?.wordId === wordId;
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
          translation: typeof d.translation === 'string'
            ? { id: d.id, text: d.translation }
            : d.translation ?? null,
          presets: d.presets ?? [],
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
              translation: typeof d.translation === 'string'
                ? { id: d.id, text: d.translation }
                : d.translation ?? null,
              presets: d.presets ?? [],
            })),
            presets: [],
            isProcessing: false,
          }));

        const updatedDictionary = state.dictionary.map((word) => {
          const item = itemsMap.get(word.id);
          if (!item) return word;

          const existingDefs = word.definitions || [];
          const mergedDefs: DictionaryDefinition[] = [...existingDefs];
          const mappedNewDefs = item.definitions.map((d) => ({
            id: d.id,
            text: d.text,
            translation: typeof d.translation === 'string'
              ? { id: d.id, text: d.translation }
              : d.translation ?? null,
            presets: d.presets ?? [],
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
            isProcessing: false,
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
        return {
          dictionary: state.dictionary.map(word => 
            word.id === wordId ? {
              ...word,
              definitions: word.definitions.filter(def => def.id !== definitionId)
            } : word
          )
        };
      }),
      removeDefinitionImage: (wordId, definitionId, imageId) => set((state) => {
        return {
          dictionary: state.dictionary.map(word => 
            word.id === wordId ? {
              ...word,
              definitions: word.definitions.map(def => 
                def.id === definitionId ? {
                  ...def,
                  images: (def.images || []).filter(img => img.id !== imageId)
                } : def
              )
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
        dashboardStats: null,
        quizCard: null,
        quizEvaluation: null,
        quizTranslation: null,
        quizVariants: null,
        hasSeenOnboarding: false,
        hasCompletedGuestOnboarding: false,
      }),
      reset: () => set((state) => ({ ...initialState, themeMode: state.themeMode })),
    }),
    {
      name: 'english-card-bot-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.settings) {
            if (state.settings.baseLanguage?.includes('-')) {
              state.settings.baseLanguage = state.settings.baseLanguage.split('-')[0] as LanguageCode;
            }
            if (state.settings.targetLanguage?.includes('-')) {
              state.settings.targetLanguage = state.settings.targetLanguage.split('-')[0] as LanguageCode;
            }
          }
          if (Array.isArray(state.dictionaries)) {
            state.dictionaries.forEach(d => {
              if (d.baseLanguage?.includes('-')) {
                d.baseLanguage = d.baseLanguage.split('-')[0] as LanguageCode;
              }
              if (d.targetLanguage?.includes('-')) {
                d.targetLanguage = d.targetLanguage.split('-')[0] as LanguageCode;
              }
            });
          }
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
          if (state.token) {
            const GUEST_ID_THRESHOLD = 1000000000;

            if (Array.isArray(state.dictionaries)) {
              state.dictionaries = state.dictionaries.filter(d => d.id < GUEST_ID_THRESHOLD);
            }
            state.guestDictionaryWords = {};
            state.guestQuizAttempts = [];
          }
        }
      },
    }
  )
);

export default useStore;
