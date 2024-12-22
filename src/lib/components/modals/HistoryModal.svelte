<script lang="ts">
  import type { Trade } from '$lib/types';
  
  interface $$Props {
    show: boolean;
    trades: Trade[];
    onClose: () => void;
  }

  let { show, trades, onClose } = $props<$$Props>();
</script>

<div class:hidden={!show} class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold">Trading History</h3>
      <button
        onclick={onClose}
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
          {#each trades as trade}
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