<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let pair = data.tradingPairs[0].id;
  let timeframe = data.timeframes[0].id;
  let startDate = new Date();
  let endDate = new Date();
  let initialBalance = 1000;
  let error = '';
  let loading = false;
  let backtest: any = null;
  
  // Set default date range to last 30 days
  startDate.setDate(startDate.getDate() - 30);
  
  function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }
  
  async function pollBacktestStatus(backtestId: string) {
    while (true) {
      const response = await fetch(`/api/backtest/${backtestId}`);
      const data = await response.json();
      
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        backtest = data;
        loading = false;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
</script>

<svelte:head>
  <title>Backtest Strategy - Solana Bot</title>
</svelte:head>

<div class="py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Backtest Strategy</h1>
        <p class="mt-1 text-sm text-gray-500">
          {data.strategy.name} ({data.strategy.type})
        </p>
      </div>
      <a href="/strategy/{data.strategy.id}/edit" class="btn btn-secondary">
        Back to Strategy
      </a>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Backtest Configuration Form -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900">Configuration</h2>
        
        <form
          method="POST"
          action="?/run"
          class="mt-6 space-y-6"
          use:enhance={() => {
            loading = true;
            error = '';
            return async ({ result }) => {
              if (result.type === 'success') {
                backtest = result.data.backtest;
                pollBacktestStatus(backtest.id);
              } else {
                loading = false;
                error = result.error;
              }
            };
          }}
        >
          {#if error}
            <div class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          {/if}

          <!-- Trading Pair -->
          <div>
            <label for="pair" class="label">Trading Pair</label>
            <div class="mt-1">
              <select
                id="pair"
                name="pair"
                class="input"
                bind:value={pair}
              >
                {#each data.tradingPairs as tradingPair}
                  <option value={tradingPair.id}>{tradingPair.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Timeframe -->
          <div>
            <label for="timeframe" class="label">Timeframe</label>
            <div class="mt-1">
              <select
                id="timeframe"
                name="timeframe"
                class="input"
                bind:value={timeframe}
              >
                {#each data.timeframes as tf}
                  <option value={tf.id}>{tf.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="startDate" class="label">Start Date</label>
              <div class="mt-1">
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  class="input"
                  value={formatDate(startDate)}
                  max={formatDate(endDate)}
                />
              </div>
            </div>
            <div>
              <label for="endDate" class="label">End Date</label>
              <div class="mt-1">
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  class="input"
                  value={formatDate(endDate)}
                  min={formatDate(startDate)}
                />
              </div>
            </div>
          </div>

          <!-- Initial Balance -->
          <div>
            <label for="initialBalance" class="label">Initial Balance (USDC)</label>
            <div class="mt-1">
              <input
                type="number"
                id="initialBalance"
                name="initialBalance"
                class="input"
                bind:value={initialBalance}
                min="100"
                step="100"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end">
            <button
              type="submit"
              class="btn btn-primary"
              disabled={loading}
            >
              {#if loading}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running Backtest...
              {:else}
                Run Backtest
              {/if}
            </button>
          </div>
        </form>
      </div>

      <!-- Results Panel -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900">Results</h2>
        
        {#if loading}
          <div class="mt-6 text-center">
            <svg class="animate-spin mx-auto h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-sm text-gray-500">Running backtest...</p>
          </div>
        {:else if backtest && backtest.status === 'COMPLETED'}
          <div class="mt-6 grid grid-cols-2 gap-4">
            {#if backtest.results}
              {@const results = JSON.parse(backtest.results)}
              <div class="bg-gray-50 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-500">Total Trades</dt>
                <dd class="mt-1 text-2xl font-semibold text-gray-900">{results.totalTrades}</dd>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-500">Win Rate</dt>
                <dd class="mt-1 text-2xl font-semibold text-gray-900">{(results.winRate * 100).toFixed(1)}%</dd>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-500">Profit/Loss</dt>
                <dd class="mt-1 text-2xl font-semibold" class:text-green-600={results.profitLoss > 0} class:text-red-600={results.profitLoss < 0}>
                  {results.profitLoss > 0 ? '+' : ''}{results.profitLoss.toFixed(2)} USDC
                </dd>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-500">Max Drawdown</dt>
                <dd class="mt-1 text-2xl font-semibold text-red-600">
                  -{results.maxDrawdown.toFixed(2)} USDC
                </dd>
              </div>
              <div class="col-span-2 bg-gray-50 p-4 rounded-lg">
                <dt class="text-sm font-medium text-gray-500">Sharpe Ratio</dt>
                <dd class="mt-1 text-2xl font-semibold text-gray-900">{results.sharpeRatio.toFixed(2)}</dd>
              </div>
            {/if}
          </div>
        {:else if backtest && backtest.status === 'FAILED'}
          <div class="mt-6 text-center">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Backtest Failed</h3>
            <p class="mt-1 text-sm text-gray-500">Please try again with different parameters.</p>
          </div>
        {:else}
          <div class="mt-6 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No Results</h3>
            <p class="mt-1 text-sm text-gray-500">Run a backtest to see the results.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div> 