<script lang="ts">
  import type { PageData } from './$types';
  import { formatDistanceToNow } from 'date-fns';

  export let data: PageData;

  const defaultData = {
    stats: {
      totalStrategies: 0,
      activeStrategies: 0,
      totalBacktests: 0,
      successfulBacktests: 0,
      latestStrategies: []
    },
    pendingBacktests: []
  };

  $: ({ stats = defaultData.stats, pendingBacktests = defaultData.pendingBacktests } = data);
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Dashboard</h1>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-600">Total Strategies</h3>
      <p class="text-3xl font-bold">{stats.totalStrategies}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-600">Active Strategies</h3>
      <p class="text-3xl font-bold">{stats.activeStrategies}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-600">Total Backtests</h3>
      <p class="text-3xl font-bold">{stats.totalBacktests}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-600">Successful Backtests</h3>
      <p class="text-3xl font-bold">{stats.successfulBacktests}</p>
    </div>
  </div>

  <!-- Pending Backtests -->
  {#if pendingBacktests.length > 0}
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-bold mb-4">Pending Backtests</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each pendingBacktests as backtest}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {backtest.strategy?.name ?? 'Unknown Strategy'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(backtest.createdAt), { addSuffix: true })}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Running
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Latest Strategies -->
  {#if stats.latestStrategies?.length > 0}
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-bold mb-4">Latest Strategies</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Backtests</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each stats.latestStrategies as strategy}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <a href="/strategy/{strategy.id}" class="text-blue-600 hover:text-blue-900">{strategy.name}</a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{strategy.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(strategy.createdAt), { addSuffix: true })}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{strategy.backtestCount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{strategy.versions}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div> 