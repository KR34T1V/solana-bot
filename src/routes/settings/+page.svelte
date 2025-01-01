<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;
  export let form: ActionData;

  let showAddKey = false;
  let loading = false;
  let showApiKey = false;
  let selectedProvider = 'birdeye';

  $: ({ apiKeys } = data);
  $: birdeyeKey = apiKeys.find(key => key.provider === 'birdeye');
  $: jupiterKey = apiKeys.find(key => key.provider === 'jupiter');

  const providers = [
    { 
      id: 'birdeye', 
      name: 'Birdeye', 
      description: 'Real-time Solana token data and analytics',
      docUrl: 'https://birdeye.so/api'
    },
    { 
      id: 'jupiter', 
      name: 'Jupiter', 
      description: 'Solana token price aggregation and swap routing',
      docUrl: 'https://docs.jup.ag/apis/price-api'
    }
  ];

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString();
  }

  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }

  function getProviderDetails(providerId: string) {
    return providers.find(p => p.id === providerId);
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">Settings</h1>

  <!-- API Keys Section -->
  <div class="bg-white rounded-lg shadow">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-semibold">API Keys</h2>
          <p class="text-sm text-gray-500 mt-1">Manage your data provider API keys</p>
        </div>
        {#if !showAddKey}
          <button
            class="btn btn-primary"
            on:click={() => showAddKey = true}
          >
            Add API Key
          </button>
        {/if}
      </div>
    </div>

    <div class="p-6">
      {#if form?.error}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-red-700">{form.error}</p>
        </div>
      {/if}

      {#if form?.success}
        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p class="text-green-700">API key saved successfully!</p>
        </div>
      {/if}

      {#if showAddKey}
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-medium mb-4">Add API Key</h3>
          <form
            method="POST"
            action="?/saveApiKey"
            use:enhance={() => {
              loading = true;
              return async ({ result, update }) => {
                loading = false;
                
                if (result.type === 'success') {
                  showAddKey = false;
                  await invalidateAll();
                }
                
                await update();
              };
            }}
          >
            <div class="space-y-4">
              <div>
                <label for="provider" class="block text-sm font-medium text-gray-700">Provider</label>
                <select
                  id="provider"
                  name="provider"
                  bind:value={selectedProvider}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {#each providers as provider}
                    <option value={provider.id}>{provider.name}</option>
                  {/each}
                </select>
                {#if selectedProvider}
                  {@const provider = getProviderDetails(selectedProvider)}
                  <p class="mt-1 text-sm text-gray-500">
                    {provider?.description}
                    <a href={provider?.docUrl} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700">
                      View API docs →
                    </a>
                  </p>
                {/if}
              </div>

              <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Production Key"
                />
              </div>

              <div>
                <label for="key" class="block text-sm font-medium text-gray-700">API Key</label>
                <div class="mt-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    id="key"
                    name="key"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                    placeholder="Enter your API key"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center"
                    on:click={toggleApiKeyVisibility}
                  >
                    {#if showApiKey}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  class="btn btn-secondary"
                  on:click={() => showAddKey = false}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </div>
          </form>
        </div>
      {/if}

      <!-- API Keys List -->
      {#if apiKeys.length > 0}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Verified</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each apiKeys as apiKey}
                {@const provider = getProviderDetails(apiKey.provider)}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{apiKey.name}</div>
                    <div class="text-sm text-gray-500">{provider?.description || ''}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{provider?.name || apiKey.provider}</div>
                    <a href={provider?.docUrl} target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:text-blue-700">
                      API Docs
                    </a>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(apiKey.createdAt)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      {apiKey.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apiKey.lastVerified ? formatDate(apiKey.lastVerified) : 'Never'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-3">
                      <form
                        method="POST"
                        action="?/verifyApiKey"
                        class="inline"
                        use:enhance={() => {
                          loading = true;
                          return async ({ result }) => {
                            loading = false;
                            if (result.type === 'success') {
                              await invalidateAll();
                            }
                          };
                        }}
                      >
                        <input type="hidden" name="provider" value={apiKey.provider} />
                        <button
                          type="submit"
                          class="text-blue-600 hover:text-blue-900"
                          disabled={loading}
                        >
                          Verify
                        </button>
                      </form>
                      <form
                        method="POST"
                        action="?/deleteApiKey"
                        class="inline"
                        use:enhance={() => {
                          return async ({ result }) => {
                            if (result.type === 'success') {
                              await invalidateAll();
                            }
                          };
                        }}
                      >
                        <input type="hidden" name="provider" value={apiKey.provider} />
                        <button
                          type="submit"
                          class="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-gray-500">No API keys added yet.</p>
          <p class="text-sm text-gray-400 mt-1">Add an API key to start using market data providers.</p>
        </div>
      {/if}
    </div>
  </div>
</div> 