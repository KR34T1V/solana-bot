<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let selectedPair = data.tradingPairs[0];
  let selectedTimeframe = data.timeframes[0];
  let startDate = new Date();
  let endDate = new Date();
  let initialBalance = 1000;
  let loading = false;
  let error = '';
  let success = false;
  
  // Set default date range (last 30 days)
  startDate.setDate(startDate.getDate() - 30);
  
  function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }
  
  $: console.log('Form Data:', {
    pair: selectedPair,
    timeframe: selectedTimeframe,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    initialBalance
  });
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Backtest Strategy</h1>
  
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold mb-4">Configure Backtest</h2>
    
    {#if error}
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-700">{error}</p>
      </div>
    {/if}

    {#if success}
      <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <p class="text-green-700">Backtest started successfully! Results will be available soon.</p>
      </div>
    {/if}
    
    <form
      method="POST"
      action="?/create"
      class="space-y-6"
      use:enhance={() => {
        loading = true;
        error = '';
        success = false;
        
        return async ({ result }) => {
          loading = false;
          
          if (result.type === 'success') {
            success = true;
            console.log('Backtest created:', result);
          } else if (result.type === 'error') {
            error = result.error;
          } else if (result.data?.error) {
            error = result.data.error;
          }
        };
      }}
    >
      <!-- Trading Pair -->
      <div>
        <label for="pair" class="block text-sm font-medium text-gray-700 mb-1">Trading Pair</label>
        <select
          id="pair"
          name="pair"
          bind:value={selectedPair}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          disabled={loading}
        >
          {#each data.tradingPairs as pair}
            <option value={pair}>{pair}</option>
          {/each}
        </select>
      </div>

      <!-- Timeframe -->
      <div>
        <label for="timeframe" class="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
        <select
          id="timeframe"
          name="timeframe"
          bind:value={selectedTimeframe}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          disabled={loading}
        >
          {#each data.timeframes as timeframe}
            <option value={timeframe}>{timeframe}</option>
          {/each}
        </select>
      </div>

      <!-- Date Range -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            bind:value={startDate}
            max={formatDate(endDate)}
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
        </div>
        
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            bind:value={endDate}
            min={formatDate(startDate)}
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
        </div>
      </div>

      <!-- Initial Balance -->
      <div>
        <label for="initialBalance" class="block text-sm font-medium text-gray-700 mb-1">Initial Balance (USDC)</label>
        <input
          type="number"
          id="initialBalance"
          name="initialBalance"
          bind:value={initialBalance}
          min="1"
          step="1"
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {#if loading}
            <span class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting Backtest...
            </span>
          {:else}
            Start Backtest
          {/if}
        </button>
      </div>
    </form>
  </div>
</div> 