<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  export let data: PageData;
  
  let selectedVersion: any = null;
  let showConfirmRevert = false;
  
  $: versions = data.strategy.versions.sort((a: any, b: any) => b.version - a.version);
  $: currentVersion = versions.find((v: any) => v.version === data.strategy.currentVersion);
  
  // Debug logging
  $: {
    if (selectedVersion) {
      console.log('Selected Version:', selectedVersion);
      console.log('Performance Data:', selectedVersion.performance);
      console.log('Current Version:', currentVersion);
      if (currentVersion) {
        console.log('Current Version Performance:', currentVersion.performance);
      }
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }
  
  function formatMetric(value: number) {
    return value?.toFixed(2) ?? 'N/A';
  }
  
  function getPerformanceColor(change: number) {
    if (!change && change !== 0) return 'text-gray-500';
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  }

  function getMetricComparison(timeframe: string, metrics: any, currentMetrics: any) {
    if (!metrics || !currentMetrics) return null;
    
    return {
      winRateChange: metrics.winRate - currentMetrics.winRate,
      sharpeChange: metrics.sharpeRatio - currentMetrics.sharpeRatio,
      profitFactorChange: metrics.profitFactor - currentMetrics.profitFactor
    };
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Strategy Versions</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Versions List -->
    <div class="col-span-1 bg-white rounded-lg shadow p-4">
      <h2 class="text-xl font-semibold mb-4">Version History</h2>
      <div class="space-y-4">
        {#each versions as version}
          <div 
            class="p-4 border rounded-lg cursor-pointer transition-colors duration-200 hover:bg-gray-50"
            class:bg-blue-50={selectedVersion?.id === version.id}
            on:click={() => selectedVersion = version}
          >
            <div class="flex justify-between items-center">
              <span class="font-medium">Version {version.version}</span>
              {#if version.version === data.strategy.currentVersion}
                <span class="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              {/if}
            </div>
            <div class="text-sm text-gray-500 mt-1">{formatDate(version.createdAt)}</div>
            <div class="text-sm mt-2">{version.changes}</div>
            {#if version.performance}
              <div class="text-xs text-gray-500 mt-2">
                Overall Win Rate: {formatMetric(version.performance.overall.averageWinRate)}%
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Version Details -->
    {#if selectedVersion}
      <div class="col-span-2 bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-xl font-semibold">Version {selectedVersion.version} Details</h2>
            <p class="text-gray-500 mt-1">Created on {formatDate(selectedVersion.createdAt)}</p>
          </div>
          
          {#if selectedVersion.version !== data.strategy.currentVersion}
            <button
              class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              on:click={() => showConfirmRevert = true}
            >
              Revert to This Version
            </button>
          {/if}
        </div>
        
        <!-- Configuration Changes -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">Configuration</h3>
          <pre class="bg-gray-50 p-4 rounded overflow-x-auto">
            {JSON.stringify(JSON.parse(selectedVersion.config), null, 2)}
          </pre>
        </div>
        
        <!-- Performance Metrics -->
        {#if selectedVersion.performance}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-4">Performance Metrics</h3>
            
            <!-- Overall Metrics -->
            <div class="mb-6 p-4 border rounded-lg">
              <h4 class="font-medium mb-2">Overall Performance</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div class="text-sm text-gray-600">Total Backtests</div>
                  <div class="text-lg font-medium">{selectedVersion.performance.overall.totalBacktests}</div>
                </div>
                <div>
                  <div class="text-sm text-gray-600">Average Win Rate</div>
                  <div class="text-lg font-medium">{formatMetric(selectedVersion.performance.overall.averageWinRate)}%</div>
                </div>
                <div>
                  <div class="text-sm text-gray-600">Best Timeframe</div>
                  <div class="text-lg font-medium">{selectedVersion.performance.overall.bestTimeframe}</div>
                </div>
                <div>
                  <div class="text-sm text-gray-600">Avg Sharpe Ratio</div>
                  <div class="text-lg font-medium">{formatMetric(selectedVersion.performance.overall.averageSharpeRatio)}</div>
                </div>
              </div>
            </div>
            
            <!-- Timeframe Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each Object.entries(selectedVersion.performance.timeframes) as [timeframe, metrics]}
                <div class="border rounded-lg p-4">
                  <h4 class="font-medium mb-2">{timeframe} Timeframe</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span>Win Rate:</span>
                      <span>{formatMetric(metrics.winRate)}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Profit Factor:</span>
                      <span>{formatMetric(metrics.profitFactor)}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Sharpe Ratio:</span>
                      <span>{formatMetric(metrics.sharpeRatio)}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Max Drawdown:</span>
                      <span>{formatMetric(metrics.maxDrawdown)}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Total Trades:</span>
                      <span>{metrics.totalTrades}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Profitable Trades:</span>
                      <span>{metrics.profitableTrades}</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
            
            <!-- Performance Comparison -->
            {#if currentVersion && selectedVersion.version !== currentVersion.version && currentVersion.performance}
              <div class="mt-6">
                <h3 class="text-lg font-semibold mb-4">Comparison with Current Version</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {#each Object.entries(selectedVersion.performance.timeframes) as [timeframe, metrics]}
                    {#if currentVersion.performance?.timeframes[timeframe]}
                      {#let comparison = getMetricComparison(timeframe, metrics, currentVersion.performance.timeframes[timeframe])}
                        {#if comparison}
                          <div class="border rounded-lg p-4">
                            <h4 class="font-medium mb-2">{timeframe} Comparison</h4>
                            <div class="space-y-2">
                              <div class="flex justify-between">
                                <span>Win Rate Change:</span>
                                <span class={getPerformanceColor(comparison.winRateChange)}>
                                  {comparison.winRateChange > 0 ? '+' : ''}{formatMetric(comparison.winRateChange)}%
                                </span>
                              </div>
                              <div class="flex justify-between">
                                <span>Sharpe Ratio Change:</span>
                                <span class={getPerformanceColor(comparison.sharpeChange)}>
                                  {comparison.sharpeChange > 0 ? '+' : ''}{formatMetric(comparison.sharpeChange)}
                                </span>
                              </div>
                              <div class="flex justify-between">
                                <span>Profit Factor Change:</span>
                                <span class={getPerformanceColor(comparison.profitFactorChange)}>
                                  {comparison.profitFactorChange > 0 ? '+' : ''}{formatMetric(comparison.profitFactorChange)}
                                </span>
                              </div>
                            </div>
                          </div>
                        {/if}
                      {/let}
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-gray-500 italic">No performance data available for this version.</div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Revert Confirmation Modal -->
  {#if showConfirmRevert}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold mb-4">Confirm Revert</h3>
        <p class="mb-6">Are you sure you want to revert to version {selectedVersion.version}? This will create a new version based on these settings.</p>
        
        <form
          method="POST"
          action="?/revert"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === 'success') {
                showConfirmRevert = false;
              }
            };
          }}
        >
          <input type="hidden" name="versionId" value={selectedVersion.id}>
          
          <div class="flex justify-end space-x-4">
            <button
              type="button"
              class="px-4 py-2 border rounded hover:bg-gray-50"
              on:click={() => showConfirmRevert = false}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Confirm Revert
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div> 