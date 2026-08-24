import { create } from 'zustand';

interface UserProfile {
  id: number;
  username: string;
}

interface AppState {
  token: string | null;
  profile: UserProfile | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
}

const useStore = create<AppState>((set) => ({
  token: null,
  profile: null,
  setToken: (token) => set({ token }),
  setProfile: (profile) => set({ profile }),
}));

export default useStore;
