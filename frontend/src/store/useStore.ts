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

interface AppState {
  token: string | null;
  profile: UserProfile | null;
  appState: any | null;
  wordProcessing: WordProcessingStatus[];
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAppState: (appState: any) => void;
  updateWordProcessing: (status: WordProcessingStatus) => void;
}

const useStore = create<AppState>((set) => ({
  token: null,
  profile: null,
  appState: null,
  wordProcessing: [],
  setToken: (token) => set({ token }),
  setProfile: (profile) => set({ profile }),
  setAppState: (appState) => set({ appState }),
  updateWordProcessing: (status) => set((state) => {
    const existingIndex = state.wordProcessing.findIndex((w) => w.word === status.word);
    if (existingIndex >= 0) {
      const newList = [...state.wordProcessing];
      newList[existingIndex] = { ...newList[existingIndex], ...status };
      return { wordProcessing: newList };
    }
    return { wordProcessing: [...state.wordProcessing, status] };
  }),
}));

export default useStore;
