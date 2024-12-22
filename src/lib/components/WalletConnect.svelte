<script lang="ts">
  import { onMount } from 'svelte';

  let provider: any = null;
  let publicKey = $state<string | null>(null);
  let isConnected = $state(false);

  function getProvider() {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.solana;
      
      if (provider?.isPhantom) {
        return provider;
      }
    }
    
    window.open('https://phantom.app/', '_blank');
  }

  onMount(() => {
    provider = getProvider();
    
    if (provider) {
      // Attempt to eagerly connect
      provider.connect({ onlyIfTrusted: true })
        .then(({ publicKey }: { publicKey: { toString: () => string } }) => {
          isConnected = true;
          publicKey = publicKey.toString();
        })
        .catch(() => {
          // Handle connection failure silently - user can connect manually
        });

      // Listen for connection events
      provider.on('connect', ({ publicKey }: { publicKey: { toString: () => string } }) => {
        isConnected = true;
        publicKey = publicKey.toString();
      });

      // Listen for disconnection events
      provider.on('disconnect', () => {
        isConnected = false;
        publicKey = null;
      });

      // Listen for account changes
      provider.on('accountChanged', (newPublicKey: { toString: () => string } | null) => {
        if (newPublicKey) {
          publicKey = newPublicKey.toString();
        } else {
          // Attempt to reconnect
          provider.connect().catch((error: Error) => {
            console.error('Failed to reconnect:', error);
          });
        }
      });
    }
  });

  async function connect() {
    try {
      await provider.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  async function disconnect() {
    try {
      await provider.disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }
</script>

<div class="flex items-center gap-4">
  {#if !isConnected}
    <button
      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      onclick={connect}
    >
      Connect Phantom
    </button>
  {:else}
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-600">
        {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
      </span>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        onclick={disconnect}
      >
        Disconnect
      </button>
    </div>
  {/if}
</div> 