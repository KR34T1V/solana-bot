<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data, form } = $props<{ data: PageData; form?: { error?: string } }>();

  let showCreateStrategyModal = $state(false);
  let showCreateTradeModal = $state(false);
  let showHistoryModal = $state(false);

  function toggleCreateStrategyModal() {
    showCreateStrategyModal = !showCreateStrategyModal;
  }

  function toggleCreateTradeModal() {
    showCreateTradeModal = !showCreateTradeModal;
  }

  function toggleHistoryModal() {
    showHistoryModal = !showHistoryModal;
  }

  // SSE connection for real-time updates
  let eventSource: EventSource;

  $effect(() => {
    eventSource = new EventSource('/api/trades');
    
    eventSource.onmessage = (event) => {
      // Handle trade updates
      console.log('Trade update:', event.data);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  });
</script>

<div class="container mx-auto px-4 py-8">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <!-- Stats Cards -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Total Trades</h3>
      <p class="text-3xl font-bold text-gray-900">{data.stats.totalTrades}</p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Success Rate</h3>
      <p class="text-3xl font-bold text-gray-900">{data.stats.successRate}%</p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Profit/Loss</h3>
      <p class="text-3xl font-bold {data.stats.profitLoss?.startsWith('-') ? 'text-red-600' : 'text-green-600'}">
        {data.stats.profitLoss ?? '$0.00'}
      </p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-700">Active Strategies</h3>
      <p class="text-3xl font-bold text-gray-900">{data.stats.activeStrategies}</p>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex space-x-4 mb-8">
    <button
      on:click={toggleCreateStrategyModal}
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Create Strategy
    </button>
    <button
      on:click={toggleCreateTradeModal}
      class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
    >
      Create Trade
    </button>
    <button
      on:click={toggleHistoryModal}
      class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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
          {#each data.strategies as strategy}
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

  <!-- Create Strategy Modal -->
  {#if showCreateStrategyModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Create New Strategy</h3>
        
        <form method="POST" action="?/createStrategy" use:enhance>
          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">Strategy Name</label>
              <input
                type="text"
                id="name"
                name="name"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              ></textarea>
            </div>

            <div>
              <label for="config" class="block text-sm font-medium text-gray-700">Configuration (JSON)</label>
              <textarea
                id="config"
                name="config"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter JSON configuration"
              ></textarea>
            </div>

            {#if data.form?.error}
              <p class="text-red-500 text-sm">{data.form.error}</p>
            {/if}
            
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                on:click={toggleCreateStrategyModal}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Create Trade Modal -->
  {#if showCreateTradeModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold mb-4">Create New Trade</h3>
        
        <form method="POST" action="?/createTrade" use:enhance>
          <div class="space-y-4">
            <div>
              <label for="symbol" class="block text-sm font-medium text-gray-700">Symbol</label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label for="entryPrice" class="block text-sm font-medium text-gray-700">Entry Price</label>
              <input
                type="number"
                step="0.00000001"
                id="entryPrice"
                name="entryPrice"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label for="quantity" class="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                step="0.00000001"
                id="quantity"
                name="quantity"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label for="side" class="block text-sm font-medium text-gray-700">Side</label>
              <select
                id="side"
                name="side"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>

            {#if data.form?.error}
              <p class="text-red-500 text-sm">{data.form.error}</p>
            {/if}
            
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                on:click={toggleCreateTradeModal}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Trade
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- History Modal -->
  {#if showHistoryModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold">Trading History</h3>
          <button
            on:click={toggleHistoryModal}
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each data.trades as trade}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trade.symbol}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.side}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${trade.entryPrice}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${trade.exitPrice ?? '-'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.quantity}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm {trade.profitLoss?.startsWith('-') ? 'text-red-600' : 'text-green-600'}">
                    {trade.profitLoss ?? '-'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {trade.exitPrice ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                      {trade.exitPrice ? 'Closed' : 'Open'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
</div>
