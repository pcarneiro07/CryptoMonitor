import { create } from 'zustand';
import type { BackfillStatus, DashboardData, DatabaseSummary, FetchStatus } from '../types';
import { fetchDashboardFromBackend } from './cryptoData';

const FETCH_INTERVAL_MS = 10 * 60 * 1000;
const COUNTDOWN_START = 600;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface DashboardStore {
  data: DashboardData | null;
  status: FetchStatus;
  countdown: number;

  databaseSummary: DatabaseSummary | null;
  databaseSummaryLoading: boolean;
  databaseSummaryError: string | null;

  backfillStatus: BackfillStatus | null;
  backfillLoading: boolean;
  backfillError: string | null;

  fetchData: () => Promise<void>;
  startPolling: () => () => void;
  decrementCountdown: () => void;

  fetchDatabaseSummary: () => Promise<void>;
  fetchBackfillStatus: () => Promise<void>;
  startBackfill: (days?: number, limit?: number) => Promise<void>;
  stopBackfill: () => Promise<void>;
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    return data?.detail || data?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  data: null,
  countdown: COUNTDOWN_START,

  databaseSummary: null,
  databaseSummaryLoading: false,
  databaseSummaryError: null,

  backfillStatus: null,
  backfillLoading: false,
  backfillError: null,

  status: {
    isLoading: false,
    isError: false,
    errorMessage: null,
    lastSuccess: null,
    countdown: COUNTDOWN_START,
  },

  fetchData: async () => {
    set((state) => ({
      status: {
        ...state.status,
        isLoading: true,
        isError: false,
        errorMessage: null,
      },
    }));

    try {
      const dashboard = await fetchDashboardFromBackend();

      set({
        data: dashboard,
        countdown: COUNTDOWN_START,
        status: {
          isLoading: false,
          isError: false,
          errorMessage: dashboard.databaseWarning || null,
          lastSuccess: new Date().toISOString(),
          countdown: COUNTDOWN_START,
        },
      });

      get().fetchDatabaseSummary().catch(() => undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';

      set((state) => ({
        status: {
          ...state.status,
          isLoading: false,
          isError: true,
          errorMessage,
        },
      }));
    }
  },

  decrementCountdown: () => {
    set((state) => ({
      countdown: Math.max(0, state.countdown - 1),
    }));
  },

  startPolling: () => {
    const { fetchData, decrementCountdown, fetchBackfillStatus, fetchDatabaseSummary } = get();

    fetchData();
    fetchDatabaseSummary().catch(() => undefined);
    fetchBackfillStatus().catch(() => undefined);

    const countdownInterval = setInterval(() => {
      decrementCountdown();
    }, 1000);

    const fetchInterval = setInterval(() => {
      fetchData();
    }, FETCH_INTERVAL_MS);

    const backfillStatusInterval = setInterval(() => {
      fetchBackfillStatus().catch(() => undefined);
    }, 3000);

    const databaseSummaryInterval = setInterval(() => {
      fetchDatabaseSummary().catch(() => undefined);
    }, 15000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(fetchInterval);
      clearInterval(backfillStatusInterval);
      clearInterval(databaseSummaryInterval);
    };
  },

  fetchDatabaseSummary: async () => {
    set({
      databaseSummaryLoading: true,
      databaseSummaryError: null,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/database/summary`);

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const summary = (await response.json()) as DatabaseSummary;

      set({
        databaseSummary: summary,
        databaseSummaryLoading: false,
        databaseSummaryError: null,
      });
    } catch (error) {
      set({
        databaseSummaryLoading: false,
        databaseSummaryError:
          error instanceof Error ? error.message : 'Failed to fetch database summary',
      });
    }
  },

  fetchBackfillStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/database/backfill/status`);

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const status = (await response.json()) as BackfillStatus;

      set({
        backfillStatus: status,
        backfillError: null,
      });
    } catch (error) {
      set({
        backfillError:
          error instanceof Error ? error.message : 'Failed to fetch backfill status',
      });
    }
  },

  startBackfill: async (days = 7, limit = 20) => {
    set({
      backfillLoading: true,
      backfillError: null,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/database/backfill/start?days=${days}&limit=${limit}&delay_seconds=1.2`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await get().fetchBackfillStatus();

      set({
        backfillLoading: false,
        backfillError: null,
      });
    } catch (error) {
      set({
        backfillLoading: false,
        backfillError:
          error instanceof Error ? error.message : 'Failed to start backfill',
      });
    }
  },

  stopBackfill: async () => {
    set({
      backfillLoading: true,
      backfillError: null,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/database/backfill/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await get().fetchBackfillStatus();

      set({
        backfillLoading: false,
        backfillError: null,
      });
    } catch (error) {
      set({
        backfillLoading: false,
        backfillError:
          error instanceof Error ? error.message : 'Failed to stop backfill',
      });
    }
  },
}));