import { create } from 'zustand';

export interface Shot {
  id: string;
  scene_number: string;
  description: string;
  vfx_types: string[];
  complexity: string;
  estimated_hours?: number;
  rate_per_hour?: number;
  estimated_cost?: number;
  contingency_percent: number;
  overhead_percent: number;
  final_price?: number;
}

interface BidState {
  shots: Shot[];
  currentScript: string | null;
  setShots: (shots: Shot[]) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  deleteShot: (id: string) => void;
  addShot: (shot: Shot) => void;
  setCurrentScript: (path: string | null) => void;
  clear: () => void;
}

export const useBidStore = create<BidState>((set) => ({
  shots: [],
  currentScript: null,

  setShots: (shots) => set({ shots }),

  updateShot: (id, updates) =>
    set((state) => ({
      shots: state.shots.map((shot) =>
        shot.id === id ? { ...shot, ...updates } : shot
      ),
    })),

  deleteShot: (id) =>
    set((state) => ({
      shots: state.shots.filter((shot) => shot.id !== id),
    })),

  addShot: (shot) =>
    set((state) => ({
      shots: [...state.shots, shot],
    })),

  setCurrentScript: (path) => set({ currentScript: path }),

  clear: () => set({ shots: [], currentScript: null }),
}));
