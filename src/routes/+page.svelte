<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  import { tradingStore } from '$lib/stores/trading';
  import CreateStrategyModal from '$lib/components/modals/CreateStrategyModal.svelte';
  import CreateTradeModal from '$lib/components/modals/CreateTradeModal.svelte';
  import HistoryModal from '$lib/components/modals/HistoryModal.svelte';

  const props = $props();

  let showCreateStrategyModal = $state(false);
  let showCreateTradeModal = $state(false);
  let showHistoryModal = $state(false);

  // SSE connection for real-time updates
  let eventSource: EventSource;

  $effect(() => {
    eventSource = new EventSource('/api/trades');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      tradingStore.setTrades(update.trades);
      tradingStore.setStats(update.stats);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  });

  // Initialize store with server data
  $effect(() => {
    tradingStore.setTrades(props.data.trades);
    tradingStore.setStrategies(props.data.strategies);
    tradingStore.setStats(props.data.stats);
  });
</script>

<div class="container mx-auto px-4 py-8">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Stats Cards -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Total Trades</h3>
      <p class="text-3xl font-bold text-gray-900">{$tradingStore.stats.totalTrades}</p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Success Rate</h3>
      <p class="text-3xl font-bold text-gray-900">{$tradingStore.stats.successRate}</p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Profit/Loss</h3>
      <p class="text-3xl font-bold {$tradingStore.stats.profitLoss?.startsWith('-') ? 'text-red-600' : 'text-green-600'}">
        {$tradingStore.stats.profitLoss}
      </p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Active Strategies</h3>
      <p class="text-3xl font-bold text-gray-900">{$tradingStore.stats.activeStrategies}</p>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex space-x-4 mb-8">
    <button
      onclick={() => showCreateStrategyModal = true}
      class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Create Strategy
    </button>
    <button
      onclick={() => showCreateTradeModal = true}
      class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
    >
      Create Trade
    </button>
    <button
      onclick={() => showHistoryModal = true}
      class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
    >
      View History
    </button>
  </div>

  <!-- Active Strategies Table -->
  <div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">Active Strategies</h2>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each $tradingStore.strategies as strategy}
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{strategy.name}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{strategy.description}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {strategy.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {strategy.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <form method="POST" action="?/toggleStrategy" use:enhance class="inline">
                  <input type="hidden" name="id" value={strategy.id} />
                  <button type="submit" class="text-indigo-600 hover:text-indigo-900">
                    {strategy.active ? 'Deactivate' : 'Activate'}
                  </button>
                </form>
                <form method="POST" action="?/deleteStrategy" use:enhance class="inline ml-4">
                  <input type="hidden" name="id" value={strategy.id} />
                  <button type="submit" class="text-red-600 hover:text-red-900">Delete</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<CreateStrategyModal
  show={showCreateStrategyModal}
  onClose={() => showCreateStrategyModal = false}
/>

<CreateTradeModal
  show={showCreateTradeModal}
  onClose={() => showCreateTradeModal = false}
/>

<HistoryModal
  show={showHistoryModal}
  trades={$tradingStore.trades}
  onClose={() => showHistoryModal = false}
/>
