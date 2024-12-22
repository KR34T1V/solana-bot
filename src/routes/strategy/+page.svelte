<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  $: ({ strategies } = data);
</script>

<svelte:head>
  <title>Strategies - Solana Bot</title>
</svelte:head>

<div class="py-6">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900">Trading Strategies</h1>
      <button class="btn btn-primary">
        Create Strategy
      </button>
    </div>

    {#if strategies.length === 0}
      <div class="mt-6 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No strategies</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new trading strategy.</p>
      </div>
    {:else}
      <div class="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {#each strategies as strategy}
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-gray-900">{strategy.name}</h3>
                  <p class="mt-1 text-sm text-gray-500">{strategy.type}</p>
                </div>
                <div class="ml-4">
                  <button class="btn btn-secondary">
                    Edit
                  </button>
                </div>
              </div>
              <div class="mt-4">
                <dl>
                  <dt class="text-sm font-medium text-gray-500">Created</dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    {new Date(strategy.createdAt).toLocaleDateString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div> 