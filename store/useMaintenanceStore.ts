import { create } from 'zustand';
import { api } from '../services/edgeApi';
import { SystemSetting, MasterCatalogItem, PurgeTarget, PurgeAnalysis } from '../types';

interface MaintenanceState {
  settings: SystemSetting[];
  catalogs: MasterCatalogItem[];
  loading: boolean;
  selectedCategory: string;
  error: string | null;

  // Lifecycle
  analysis: PurgeAnalysis | null;
  isAnalyzing: boolean;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown, actorId: string) => Promise<void>;

  fetchCatalogs: (category?: string) => Promise<void>;
  upsertCatalogItem: (item: Partial<MasterCatalogItem>, actorId: string) => Promise<void>;
  deleteCatalogItem: (id: string, actorId: string) => Promise<void>;

  analyzePurge: (target: PurgeTarget, days: number) => Promise<void>;
  executePurge: (target: PurgeTarget, days: number, actorId: string) => Promise<void>;
  clearAnalysis: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  settings: [],
  catalogs: [],
  loading: false,
  selectedCategory: 'ALL',
  error: null,

  analysis: null,
  isAnalyzing: false,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.maintenance.getSettings();
      if (res.data) set({ settings: res.data });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  updateSetting: async (key, value, actorId) => {
    // Optimistic Update
    const prevSettings = get().settings;
    set((state) => ({
      settings: state.settings.map((s) => (s.key === key ? { ...s, value } : s)),
    }));

    try {
      const res = await api.maintenance.updateSetting({ key, value, actor_id: actorId });
      if (res.error) throw new Error(res.error);
    } catch (e) {
      // Rollback
      set({ settings: prevSettings, error: e instanceof Error ? e.message : 'Update failed' });
    }
  },

  fetchCatalogs: async (category) => {
    set({ loading: true });
    try {
      const res = await api.maintenance.getCatalogs({ category });
      if (res.data) set({ catalogs: res.data });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Fetch error' });
    } finally {
      set({ loading: false });
    }
  },

  upsertCatalogItem: async (item, actorId) => {
    try {
      const res = await api.maintenance.upsertCatalog({ ...item, actor_id: actorId });
      if (res.data) {
        set((state) => {
          const exists = state.catalogs.find((c) => c.id === res.data!.id);
          if (exists) {
            return { catalogs: state.catalogs.map((c) => (c.id === res.data!.id ? res.data! : c)) };
          }
          return { catalogs: [res.data!, ...state.catalogs] };
        });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Upsert error' });
    }
  },

  deleteCatalogItem: async (id, actorId) => {
    set((state) => ({ catalogs: state.catalogs.filter((c) => c.id !== id) }));
    await api.maintenance.softDeleteCatalog({ id, actor_id: actorId });
  },

  analyzePurge: async (target, days) => {
    set({ isAnalyzing: true, analysis: null });
    try {
      // Simulate latency for scan effect
      await new Promise((r) => setTimeout(r, 1200));
      const res = await api.maintenance.analyzePurge({ target, days });
      if (res.data) set({ analysis: res.data });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Analysis failed' });
    } finally {
      set({ isAnalyzing: false });
    }
  },

  executePurge: async (target, days, actorId) => {
    set({ loading: true });
    try {
      await api.maintenance.executePurge({ target, days, actor_id: actorId });
      set({ analysis: null }); // Clear analysis after run
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Purge failed' });
    } finally {
      set({ loading: false });
    }
  },

  clearAnalysis: () => set({ analysis: null }),
}));
