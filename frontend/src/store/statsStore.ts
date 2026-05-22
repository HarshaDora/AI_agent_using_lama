/**
 * Zustand store for server stats and monitoring.
 */

import { create } from 'zustand';
import type { ServerStats, BenchmarkResult } from '../types';
import { getStats } from '../services/api';

interface StatsState {
  stats: ServerStats | null;
  isLoading: boolean;
  error: string | null;
  benchmarkResults: BenchmarkResult[];
  isBenchmarkRunning: boolean;

  // Actions
  fetchStats: () => Promise<void>;
  addBenchmarkResult: (result: BenchmarkResult) => void;
  updateBenchmarkResult: (userId: number, update: Partial<BenchmarkResult>) => void;
  clearBenchmarks: () => void;
  setBenchmarkRunning: (running: boolean) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  isLoading: false,
  error: null,
  benchmarkResults: [],
  isBenchmarkRunning: false,

  fetchStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const stats = await getStats();
      set({ stats, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch stats',
        isLoading: false,
      });
    }
  },

  addBenchmarkResult: (result) => {
    set((state) => ({
      benchmarkResults: [...state.benchmarkResults, result],
    }));
  },

  updateBenchmarkResult: (userId, update) => {
    set((state) => ({
      benchmarkResults: state.benchmarkResults.map((r) =>
        r.userId === userId ? { ...r, ...update } : r
      ),
    }));
  },

  clearBenchmarks: () => set({ benchmarkResults: [] }),

  setBenchmarkRunning: (running) => set({ isBenchmarkRunning: running }),
}));
