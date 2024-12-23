<script lang="ts">
  import type { PageData } from './$types';
  import { onMount, onDestroy } from 'svelte';
  
  export let data: PageData;
  
  $: ({ strategy, currentVersion, backtests } = data);

  let progressIntervals: { [key: string]: number } = {};

  onMount(() => {
    // Set up progress polling for running backtests
    backtests.forEach(backtest => {
      if (backtest.status === 'RUNNING') {
        startProgressPolling(backtest.id);
      }
    });
  });

  onDestroy(() => {
    // Clean up intervals
    Object.values(progressIntervals).forEach(interval => {
      clearInterval(interval);
    });
  });

  async function checkBacktestProgress(backtestId: string) {
    try {
      const response = await fetch(`/api/backtest/${backtestId}/status`);
      const data = await response.json();
      
      // Update backtest status in the list
      backtests = backtests.map(b => 
        b.id === backtestId ? { ...b, status: data.status, results: data.results } : b
      );

      // If backtest is complete or failed, stop polling
      if (data.status !== 'RUNNING') {
        clearInterval(progressIntervals[backtestId]);
        delete progressIntervals[backtestId];
      }
    } catch (error) {
      console.error('Error checking backtest progress:', error);
    }
  }

  function startProgressPolling(backtestId: string) {
    if (!progressIntervals[backtestId]) {
      progressIntervals[backtestId] = setInterval(() => checkBacktestProgress(backtestId), 2000) as unknown as number;
    }
  }

  function formatDate(date: string | Date | null | undefined) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  function formatNumber(num: number | null | undefined, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(decimals);
  }

  function formatDateRange(start: string | null | undefined, end: string | null | undefined, days: number | null | undefined) {
    if (!start || !end || !days) return 'N/A';
    return `${formatDate(start)} to ${formatDate(end)} (${days} days)`;
  }

  function parsePerformance(performanceJson: string | null) {
    if (!performanceJson) return null;
    try {
      return JSON.parse(performanceJson);
    } catch (e) {
      console.error('Error parsing performance data:', e);
      return null;
    }
  }

  function parseResults(resultsJson: string | null) {
    if (!resultsJson) return { totalTrades: 0, profitableTrades: 0 };
    try {
      return JSON.parse(resultsJson);
    } catch (e) {
      console.error('Error parsing results data:', e);
      return { totalTrades: 0, profitableTrades: 0 };
    }
  }

  $: performance = parsePerformance(currentVersion?.performance);
  $: timeframes = performance?.timeframes || {};
</script>

<div class="container mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">{strategy.name}</h1>
    <div class="space-x-4">
      <a
        href="/strategy/{strategy.id}/edit"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
      >
        Edit Strategy
      </a>
      <a
        href="/strategy/{strategy.id}/backtest"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
      >
        Run Backtest
      </a>
    </div>
  </div>

  <!-- Strategy Details -->
  <div class="bg-white rounded-lg shadow mb-8">
    <div class="px-6 py-4 border-b">
      <h2 class="text-lg font-semibold">Strategy Details</h2>
    </div>
    <div class="p-6">
      <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <dt class="text-sm font-medium text-gray-500">Type</dt>
          <dd class="mt-1 text-sm text-gray-900">{strategy.type}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Created</dt>
          <dd class="mt-1 text-sm text-gray-900">{formatDate(strategy.createdAt)}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Current Version</dt>
          <dd class="mt-1 text-sm text-gray-900">{strategy.currentVersion}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
          <dd class="mt-1 text-sm text-gray-900">{formatDate(strategy.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  </div>

  <!-- Strategy Configuration -->
  <div class="bg-white rounded-lg shadow mb-8">
    <div class="px-6 py-4 border-b">
      <h2 class="text-lg font-semibold">Strategy Configuration</h2>
    </div>
    <div class="p-6">
      <div class="bg-gray-50 rounded-lg p-4">
        <pre class="text-sm overflow-x-auto whitespace-pre-wrap font-mono text-gray-800">
          {JSON.stringify(currentVersion?.config, null, 2)}
        </pre>
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  {#if performance}
    <div class="bg-white rounded-lg shadow mb-8">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold">Performance Metrics</h2>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each Object.entries(timeframes) as [timeframe, metrics]}
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-sm font-medium text-gray-500 mb-2">{timeframe}</h3>
              <dl class="space-y-2">
                <div>
                  <dt class="text-xs text-gray-500">Date Range</dt>
                  <dd class="text-sm font-medium">
                    {formatDateRange(metrics?.dateRange?.start, metrics?.dateRange?.end, metrics?.dateRange?.days)}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Win Rate</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.winRate)}%</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Profit Factor</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.profitFactor)}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Sharpe Ratio</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.sharpeRatio)}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Max Drawdown</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.maxDrawdown)}%</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Total Trades</dt>
                  <dd class="text-sm font-medium">{metrics?.totalTrades ?? 'N/A'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Profitable Trades</dt>
                  <dd class="text-sm font-medium">{metrics?.profitableTrades ?? 'N/A'}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Average Profit</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.averageProfit)} USDC</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500">Average Loss</dt>
                  <dd class="text-sm font-medium">{formatNumber(metrics?.averageLoss)} USDC</dd>
                </div>
              </dl>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Backtest Results -->
  <div class="bg-white rounded-lg shadow">
    <div class="px-6 py-4 border-b">
      <h2 class="text-lg font-semibold">Backtest History</h2>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeframe</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each backtests as backtest}
            {@const results = parseResults(backtest.results)}
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(backtest.createdAt)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{backtest.pair}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{backtest.timeframe}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDateRange(backtest.startDate, backtest.endDate, 
                  Math.ceil((new Date(backtest.endDate).getTime() - new Date(backtest.startDate).getTime()) / (1000 * 60 * 60 * 24))
                )}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {backtest.status === 'RUNNING' ? '...' : results.totalTrades}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {backtest.status === 'RUNNING' ? '...' : 
                 results.totalTrades > 0 ? formatNumber((results.profitableTrades / results.totalTrades) * 100) : 'N/A'}%
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {#if backtest.status === 'RUNNING'}
                  <div class="flex items-center space-x-2">
                    <div class="animate-pulse h-2 w-16 bg-yellow-200 rounded"></div>
                    <span class="text-xs text-yellow-800">Processing...</span>
                  </div>
                {:else}
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    {backtest.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                     backtest.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                     'bg-yellow-100 text-yellow-800'}">
                    {backtest.status}
                  </span>
                {/if}
              </td>
            </tr>
          {/each}
          {#if backtests.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                No backtests run yet
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div> 