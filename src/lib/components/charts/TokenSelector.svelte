<script lang="ts">
  import { Input, Card } from '$lib/components/ui';
  import type { TokenInfo } from './types';
  import { createEventDispatcher } from 'svelte';

  export let selectedToken: TokenInfo | undefined = undefined;
  export let recentTokens: TokenInfo[] = [];
  export let loading = false;
  export let error: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    select: TokenInfo;
    search: string;
  }>();

  let searchQuery = '';

  function handleSearch() {
    if (searchQuery.trim()) {
      dispatch('search', searchQuery.trim());
    }
  }

  function handleSelect(token: TokenInfo) {
    selectedToken = token;
    dispatch('select', token);
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
      on:input={() => handleSearch()}
    />
  </div>

  {#if recentTokens.length > 0}
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
              <span class="text-xs text-gray-400">{token.address.slice(0, 8)}...{token.address.slice(-6)}</span>
            </div>
          </button>
        {/each}
      </div>
    </Card>
  {/if}
</div> 