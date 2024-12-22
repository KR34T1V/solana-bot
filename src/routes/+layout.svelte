<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  let isAuthenticated = false;
  
  onMount(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    isAuthenticated = !!token;
  });
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-primary-600">Solana Bot</a>
          </div>
          
          {#if isAuthenticated}
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a
                href="/dashboard"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                class:border-primary-500={$page.url.pathname === '/dashboard'}
                class:text-primary-600={$page.url.pathname === '/dashboard'}
              >
                Dashboard
              </a>
              <a
                href="/strategy"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                class:border-primary-500={$page.url.pathname.startsWith('/strategy')}
                class:text-primary-600={$page.url.pathname.startsWith('/strategy')}
              >
                Strategies
              </a>
            </div>
          {/if}
        </div>
        
        <div class="flex items-center">
          {#if isAuthenticated}
            <button
              on:click={() => {
                localStorage.removeItem('token');
                window.location.href = '/auth/login';
              }}
              class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Logout
            </button>
          {:else}
            <a
              href="/auth/login"
              class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Login
            </a>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
</div> 