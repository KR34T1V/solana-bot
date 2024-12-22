<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
</script>

<div class="space-y-8">
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

  <section class="bg-white shadow rounded-lg p-6">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
        Start New Strategy
      </button>
      <button class="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
        View Trading History
      </button>
    </div>
  </section>
</div>
