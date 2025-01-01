import { writable } from 'svelte/store';
import type { TokenInfo, ChartData, TimeRange } from '$lib/components/charts/types';

export const selectedToken = writable<TokenInfo | undefined>(undefined);
export const recentTokens = writable<TokenInfo[]>([]);
export const chartData = writable<ChartData | undefined>(undefined);
export const selectedTimeRange = writable<TimeRange>('1h');
export const isLoading = writable(false);
export const error = writable<string | undefined>(undefined);

export function addRecentToken(token: TokenInfo) {
  recentTokens.update(tokens => {
    const existingIndex = tokens.findIndex(t => t.address === token.address);
    if (existingIndex !== -1) {
      tokens.splice(existingIndex, 1);
    }
    return [token, ...tokens.slice(0, 4)];
  });
}

export function clearError() {
  error.set(undefined);
}

export function setLoading(loading: boolean) {
  isLoading.set(loading);
  if (loading) {
    error.set(undefined);
  }
} 