<script lang="ts">
  import { Input, Card } from '$lib/components/ui';
  import type { TokenInfo } from './types';
  import { createEventDispatcher } from 'svelte';

  export let selectedToken: TokenInfo | undefined = undefined;
  export let recentTokens: TokenInfo[] = [];
  export let searchResults: TokenInfo[] = [];
  export let loading = false;
  export let error: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    select: TokenInfo;
    search: string;
  }>();

  let searchQuery = '';
  let searchTimeout: NodeJS.Timeout;

  function handleSearch() {
    clearTimeout(searchTimeout);
    if (searchQuery.trim()) {
      searchTimeout = setTimeout(() => {
        dispatch('search', searchQuery.trim());
      }, 300);
    }
  }

  function handleSelect(token: TokenInfo) {
    selectedToken = token;
    dispatch('select', token);
  }

  // Clear search results when query is empty
  $: if (!searchQuery.trim()) {
    searchResults = [];
  }
</script>

<div class="space-y-4">
  <div class="flex space-x-2">
    <Input
      type="search"
      placeholder="Search by token address or name"
      bind:value={searchQuery}
      {error}
      disabled={loading}
      className="flex-1"
      on:input={handleSearch}
      on:keyup={handleSearch}
    />
  </div>

  {#if loading}
    <div class="flex justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    </div>
  {/if}

  {#if searchResults.length > 0}
    <Card title="Search Results" className="mt-4">
      <div class="space-y-2">
        {#each searchResults as token}
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-md transition-colors {selectedToken?.address === token.address ? 'bg-blue-50' : ''}"
            on:click={() => handleSelect(token)}
            disabled={loading}
          >
            <div class="flex justify-between items-center">
              <div>
                <span class="font-medium">{token.symbol}</span>
                <span class="text-sm text-gray-500 ml-2">{token.name}</span>
              </div>
              {#if selectedToken?.address === token.address}
                <span class="text-blue-500">✓</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </Card>
  {/if}

  {#if recentTokens.length > 0 && !searchResults.length}
    <Card title="Recent Tokens" className="mt-4">
      <div class="space-y-2">
        {#each recentTokens as token}
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-md transition-colors {selectedToken?.address === token.address ? 'bg-blue-50' : ''}"
            on:click={() => handleSelect(token)}
            disabled={loading}
          >
            <div class="flex justify-between items-center">
              <div>
                <span class="font-medium">{token.symbol}</span>
                <span class="text-sm text-gray-500 ml-2">{token.name}</span>
              </div>
              {#if selectedToken?.address === token.address}
                <span class="text-blue-500">✓</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </Card>
  {/if}
</div> 