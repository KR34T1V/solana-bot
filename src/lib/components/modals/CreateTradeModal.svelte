<script lang="ts">
  import { enhance } from '$app/forms';
  
  interface $$Props {
    show: boolean;
    onClose: () => void;
  }

  let { show, onClose } = $props<$$Props>();
  let form = $state<{ error?: string }>();
</script>

<div class:hidden={!show} class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
            on:click={onClose}
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