import { create } from 'zustand';
import { kvGet, kvSet } from '../db/database';
import type { Unit } from '../types';

export interface UserProfile {
  goal: 'speed' | 'distance' | 'fitness' | 'weight_loss' | null;
  targetSpeedMinsPerKm: string;
  targetDistanceKm: string;
  currentSpeedMinsPerKm: string;
  currentDistanceKm: string;
  age: string;
  gender: 'male' | 'female' | null;
  heightCm: string;
  weightKg: string;
  planStartDate: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  goal: null,
  targetSpeedMinsPerKm: '',
  targetDistanceKm: '',
  currentSpeedMinsPerKm: '',
  currentDistanceKm: '',
  age: '',
  gender: null,
  heightCm: '',
  weightKg: '',
  planStartDate: null,
};

interface SettingsStore {
  unit: Unit;
  profile: UserProfile;
  load: () => Promise<void>;
  setUnit: (unit: Unit) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  unit: 'km',
  profile: DEFAULT_PROFILE,
  load: async () => {
    const [u, p] = await Promise.all([kvGet('unit'), kvGet('profile')]);
    const update: Partial<SettingsStore> = {};
    if (u === 'km' || u === 'mi') update.unit = u;
    if (p) {
      try {
        update.profile = { ...DEFAULT_PROFILE, ...JSON.parse(p) };
      } catch {}
    }
    set(update);
  },
  setUnit: (unit) => {
    set({ unit });
    kvSet('unit', unit).catch(() => {});
  },
  setProfile: (updates) => {
    const newProfile = { ...get().profile, ...updates };
    set({ profile: newProfile });
    kvSet('profile', JSON.stringify(newProfile)).catch(() => {});
  },
}));

