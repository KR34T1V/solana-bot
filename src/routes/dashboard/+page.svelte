<script lang="ts">
  import { PriceChart, TimeRangeSelector, TokenSelector } from '$lib/components/charts';
  import type { TokenInfo, TimeRange } from '$lib/components/charts/types';
  import { selectedToken, selectedTimeRange, chartData, recentTokens, isLoading, error } from '$lib/stores/token';
  import { onMount } from 'svelte';

  let searchQuery = '';
  let searchError: string | undefined;

  async function handleSearch(query: string) {
    if (!query.trim()) return;
    
    try {
      const response = await fetch(`/api/data/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search tokens');
      }
      
      const data = await response.json();
      // TODO: Handle search results
    } catch (err) {
      searchError = 'Failed to search tokens';
      console.error('Search error:', err);
    }
  }

  async function handleTokenSelect(token: TokenInfo) {
    try {
      isLoading.set(true);
      const response = await fetch(`/api/data/historical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: token.address,
          timeRange: $selectedTimeRange
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      chartData.set({
        token,
        prices: data.prices,
        timeRange: $selectedTimeRange,
        lastUpdated: Date.now()
      });
    } catch (err) {
      error.set('Failed to fetch historical data');
      console.error('Data fetch error:', err);
    } finally {
      isLoading.set(false);
    }
  }

  async function handleTimeRangeSelect(range: TimeRange) {
    selectedTimeRange.set(range);
    if ($selectedToken) {
      await handleTokenSelect($selectedToken);
    }
  }

  onMount(async () => {
    try {
      const response = await fetch('/api/data/recent-tokens');
      if (!response.ok) {
        throw new Error('Failed to fetch recent tokens');
      }
      
      const data = await response.json();
      recentTokens.set(data.tokens);
    } catch (err) {
      console.error('Failed to fetch recent tokens:', err);
    }
  });
</script>

<div class="container mx-auto px-4 py-8">
  <div class="grid gap-8">
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">Token Price Charts</h1>
      
      <div class="grid gap-4 md:grid-cols-[2fr,1fr]">
        <TokenSelector
          selectedToken={$selectedToken}
          recentTokens={$recentTokens}
          loading={$isLoading}
          error={searchError}
          on:search={e => handleSearch(e.detail)}
          on:select={e => handleTokenSelect(e.detail)}
        />
        
        <TimeRangeSelector
          value={$selectedTimeRange}
          disabled={$isLoading || !$selectedToken}
          on:select={e => handleTimeRangeSelect(e.detail)}
        />
      </div>
    </div>

    {#if $error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        {$error}
      </div>
    {/if}

    {#if $chartData}
      <PriceChart
        data={$chartData}
        options={{
          timeRange: $selectedTimeRange,
          showGrid: true,
          height: 400,
          tooltips: true
        }}
      />
    {/if}
  </div>
</div> 