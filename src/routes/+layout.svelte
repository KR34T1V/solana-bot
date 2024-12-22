<script lang="ts">
  import '../app.css';
  import WalletConnect from '$lib/components/WalletConnect.svelte';
  
  let { children } = $props();
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-white shadow">
    <nav class="container mx-auto px-4 py-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900">Solana Bot</h1>
      <WalletConnect />
    </nav>
  </header>

  <main class="container mx-auto px-4 py-8">
    {@render children()}
  </main>

  <footer class="bg-white shadow mt-auto">
    <div class="container mx-auto px-4 py-6 text-center text-gray-600">
      © 2024 Solana Bot. All rights reserved.
    </div>
  </footer>
</div> 