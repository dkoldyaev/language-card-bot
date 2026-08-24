import { create } from 'zustand';

interface UserProfile {
  id: number;
  username: string;
}

interface AppState {
  token: string | null;
  profile: UserProfile | null;
  appState: any | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAppState: (appState: any) => void;
}

const useStore = create<AppState>((set) => ({
  token: null,
  profile: null,
  appState: null,
  setToken: (token) => set({ token }),
  setProfile: (profile) => set({ profile }),
  setAppState: (appState) => set({ appState }),
}));

export default useStore;
