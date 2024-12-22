<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let selectedType = data.strategyTypes[0];
  let name = '';
  let config = selectedType.defaultConfig;
  let error = '';
  let loading = false;
  
  $: configString = JSON.stringify(config, null, 2);
  
  function handleTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    selectedType = data.strategyTypes.find(t => t.id === select.value) || data.strategyTypes[0];
    config = { ...selectedType.defaultConfig };
  }
  
  function updateConfig(key: string, value: string | number) {
    config = {
      ...config,
      [key]: typeof selectedType.defaultConfig[key] === 'number' ? Number(value) : value
    };
  }
</script>

<svelte:head>
  <title>Create Strategy - Solana Bot</title>
</svelte:head>

<div class="py-6">
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900">Create Strategy</h1>
      <a href="/strategy" class="btn btn-secondary">
        Cancel
      </a>
    </div>

    <form
      method="POST"
      action="?/create"
      class="mt-6 space-y-6"
      use:enhance={() => {
        loading = true;
        return async ({ result }) => {
          loading = false;
          if (result.type === 'success') {
            goto('/strategy');
          } else if (result.type === 'error') {
            error = result.error;
          }
        };
      }}
    >
      {#if error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      {/if}

      <!-- Strategy Name -->
      <div>
        <label for="name" class="label">Strategy Name</label>
        <div class="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            required
            class="input"
            bind:value={name}
            placeholder="My Trading Strategy"
          />
        </div>
      </div>

      <!-- Strategy Type -->
      <div>
        <label for="type" class="label">Strategy Type</label>
        <div class="mt-1">
          <select
            id="type"
            name="type"
            class="input"
            value={selectedType.id}
            on:change={handleTypeChange}
          >
            {#each data.strategyTypes as type}
              <option value={type.id}>{type.name}</option>
            {/each}
          </select>
          <p class="mt-2 text-sm text-gray-500">{selectedType.description}</p>
        </div>
      </div>

      <!-- Strategy Configuration -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Configuration</h3>
        
        {#each Object.entries(config) as [key, value]}
          <div>
            <label for={key} class="label capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </label>
            <div class="mt-1">
              {#if typeof value === 'number'}
                <input
                  id={key}
                  type="number"
                  step="0.1"
                  class="input"
                  value={value}
                  on:input={(e) => updateConfig(key, e.currentTarget.value)}
                />
              {:else}
                <input
                  id={key}
                  type="text"
                  class="input"
                  value={value}
                  on:input={(e) => updateConfig(key, e.currentTarget.value)}
                />
              {/if}
            </div>
          </div>
        {/each}

        <input type="hidden" name="config" value={configString} />
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={loading}
        >
          {#if loading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating...
          {:else}
            Create Strategy
          {/if}
        </button>
      </div>
    </form>
  </div>
</div> 