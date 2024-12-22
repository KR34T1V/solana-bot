import { writable } from 'svelte/store';
import type { Trade, Strategy, Stats } from '$lib/types';

interface TradingState {
  trades: Trade[];
  strategies: Strategy[];
  stats: Stats;
  loading: boolean;
  error: string | null;
}

const initialState: TradingState = {
  trades: [],
  strategies: [],
  stats: {
    totalTrades: 0,
    successRate: '0%',
    profitLoss: '$0.00',
    activeStrategies: 0
  },
  loading: false,
  error: null
};

function createTradingStore() {
  const { subscribe, set, update } = writable<TradingState>(initialState);

  return {
    subscribe,
    setTrades: (trades: Trade[]) => update(state => ({ ...state, trades })),
    setStrategies: (strategies: Strategy[]) => update(state => ({ ...state, strategies })),
    setStats: (stats: Stats) => update(state => ({ ...state, stats })),
    setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
    setError: (error: string | null) => update(state => ({ ...state, error })),
    reset: () => set(initialState)
  };
}

export const tradingStore = createTradingStore(); 