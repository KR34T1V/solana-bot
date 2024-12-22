<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount, onDestroy } from 'svelte';
  import { invalidate } from '$app/navigation';
  
  export let data: PageData;
  export let form: ActionData;

  let showCreateStrategyModal = false;
  let showHistoryModal = false;
  let showCreateTradeModal = false;
  let eventSource: EventSource;

  onMount(() => {
    eventSource = new EventSource('/api/trades');
    eventSource.addEventListener('trade', (event) => {
      const trade = JSON.parse(event.data);
      invalidate('trades');
    });
    eventSource.addEventListener('error', (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    });
  });

  onDestroy(() => {
    if (eventSource) eventSource.close();
  });

  function toggleCreateStrategyModal() {
    showCreateStrategyModal = !showCreateStrategyModal;
  }

  function toggleHistoryModal() {
    showHistoryModal = !showHistoryModal;
  }

  function toggleCreateTradeModal() {
    showCreateTradeModal = !showCreateTradeModal;
  }
</script>

<div class="space-y-8">
  <!-- Dashboard Stats -->
  <section class="bg-white shadow rounded-lg p-6">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Trading Dashboard</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gray-50 p-4 rounded-md">
        <h3 class="text-sm font-medium text-gray-500">Total Trades</h3>
        <p class="text-2xl font-bold text-gray-900">{data.stats.totalTrades}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-md">
        <h3 class="text-sm font-medium text-gray-500">Success Rate</h3>
        <p class="text-2xl font-bold text-gray-900">{data.stats.successRate}%</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-md">
        <h3 class="text-sm font-medium text-gray-500">Profit/Loss</h3>
        <p class="text-2xl font-bold text-emerald-600">{data.stats.profitLoss}</p>
      </div>
      <div class="bg-gray-50 p-4 rounded-md">
        <h3 class="text-sm font-medium text-gray-500">Active Strategies</h3>
        <p class="text-2xl font-bold text-gray-900">{data.stats.activeStrategies}</p>
      </div>
    </div>
  </section>

  <!-- Strategies -->
  <section class="bg-white shadow rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-800">Active Strategies</h2>
      <button 
        on:click={toggleCreateStrategyModal}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        New Strategy
      </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each data.strategies as strategy}
        <div class="border rounded-lg p-4">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-semibold">{strategy.name}</h3>
            <form method="POST" action="?/toggleStrategy" use:enhance>
              <input type="hidden" name="strategyId" value={strategy.id} />
              <input type="hidden" name="isActive" value={!strategy.isActive} />
              <button 
                type="submit"
                class="text-sm px-2 py-1 rounded {strategy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}"
              >
                {strategy.isActive ? 'Active' : 'Inactive'}
              </button>
            </form>
          </div>
          <p class="text-sm text-gray-600 mb-3">{strategy.description || 'No description'}</p>
          <div class="flex justify-between items-center">
            <button
              on:click={toggleCreateTradeModal}
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              New Trade
            </button>
            <form method="POST" action="?/deleteStrategy" use:enhance class="inline">
              <input type="hidden" name="strategyId" value={strategy.id} />
              <button 
                type="submit"
                class="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Quick Actions -->
  <section class="bg-white shadow rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-800">Quick Actions</h2>
      <button 
        on:click={toggleHistoryModal}
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        View History
      </button>
    </div>
  </section>
</div>

<!-- Modals -->
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
          {#if form?.error}
            <p class="text-red-500 text-sm">{form.error}</p>
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
          {#if form?.error}
            <p class="text-red-500 text-sm">{form.error}</p>
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

{#if showHistoryModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white rounded-lg p-6 w-full max-w-4xl">
      <h3 class="text-xl font-semibold mb-4">Recent Trading History</h3>
      <form method="POST" action="?/viewHistory" use:enhance>
        {#if form?.trades}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Price</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each form.trades as trade}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">{trade.symbol}</td>
                    <td class="px-6 py-4 whitespace-nowrap">{trade.strategy.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${trade.entryPrice}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${trade.exitPrice || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={trade.profitLoss != null && trade.profitLoss > 0 ? 'text-green-600' : 'text-red-600'}>
                        {trade.profitLoss != null ? `${trade.profitLoss > 0 ? '+' : ''}${trade.profitLoss}%` : '-'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {#if !trade.exitPrice}
                        <form method="POST" action="?/closeTrade" use:enhance class="inline">
                          <input type="hidden" name="tradeId" value={trade.id} />
                          <input
                            type="number"
                            step="0.00000001"
                            name="exitPrice"
                            class="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mr-2"
                            placeholder="Exit Price"
                            required
                          />
                          <button
                            type="submit"
                            class="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Close
                          </button>
                        </form>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            on:click={toggleHistoryModal}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
