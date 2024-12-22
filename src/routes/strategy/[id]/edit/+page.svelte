<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let selectedType = data.strategyTypes.find(t => t.id === data.strategy.type) || data.strategyTypes[0];
  let name = data.strategy.name;
  let config = JSON.parse(data.strategy.config);
  let error = '';
  let loading = false;
  let showDeleteConfirm = false;
  
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
  <title>Edit Strategy - Solana Bot</title>
</svelte:head>

<div class="py-6">
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-gray-900">Edit Strategy</h1>
      <div class="flex space-x-4">
        <button
          class="btn btn-danger"
          on:click={() => showDeleteConfirm = true}
        >
          Delete
        </button>
        <a href="/strategy" class="btn btn-secondary">
          Cancel
        </a>
      </div>
    </div>

    <form
      method="POST"
      action="?/update"
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
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
  <div class="fixed inset-0 z-10 overflow-y-auto">
    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
      <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 class="text-base font-semibold leading-6 text-gray-900">Delete Strategy</h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Are you sure you want to delete this strategy? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <form
            method="POST"
            action="?/delete"
            use:enhance={() => {
              loading = true;
              return async ({ result }) => {
                loading = false;
                if (result.type === 'error') {
                  error = result.error;
                  showDeleteConfirm = false;
                }
              };
            }}
          >
            <button
              type="submit"
              class="btn btn-danger w-full sm:ml-3 sm:w-auto"
              disabled={loading}
            >
              Delete
            </button>
          </form>
          <button
            type="button"
            class="btn btn-secondary mt-3 w-full sm:mt-0 sm:w-auto"
            on:click={() => showDeleteConfirm = false}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 