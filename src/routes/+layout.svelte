<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { goto } from '$app/navigation';
  import { derived } from 'svelte/store';

  // Create a derived store for auth state
  const isLoggedIn = derived(page, $page => $page.data.userId != null);

  // Handle logout
  async function handleLogout(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    await fetch(form.action, { method: 'POST' });
    await invalidate('app:auth');
    goto('/auth/login');
  }

  // Revalidate page data on mount and after navigation
  onMount(() => {
    invalidate('app:auth');
  });
</script>

<div class="min-h-screen bg-gray-100">
  <!-- Navigation -->
  <nav class="bg-white shadow">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <a href="/" class="text-xl font-bold text-gray-800">
              Solana Bot
            </a>
          </div>
        </div>

        <div class="flex items-center">
          {#if $isLoggedIn}
            <a
              href="/dashboard"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Dashboard
            </a>
            <a
              href="/strategy"
              class="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Strategies
            </a>
            <a
              href="/strategy/new"
              class="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              New Strategy
            </a>
            <form 
              action="/api/auth/logout" 
              method="POST" 
              class="ml-4"
              on:submit={handleLogout}
            >
              <button
                type="submit"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Logout
              </button>
            </form>
          {:else}
            <a
              href="/auth/login"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Login
            </a>
            <a
              href="/auth/register"
              class="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Register
            </a>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <!-- Page Content -->
  <main>
    <slot />
  </main>
</div> 