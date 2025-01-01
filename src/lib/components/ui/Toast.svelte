<script lang="ts">
    import { toastStore } from '$lib/stores/toast.store';
    import { fly } from 'svelte/transition';
    import type { ToastMessage } from '$lib/types/toast';

    export let toast: ToastMessage;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const colors = {
        success: 'bg-green-100 border-green-500 text-green-900',
        error: 'bg-red-100 border-red-500 text-red-900',
        warning: 'bg-yellow-100 border-yellow-500 text-yellow-900',
        info: 'bg-blue-100 border-blue-500 text-blue-900'
    };

    function handleDismiss() {
        if (toast.dismissible) {
            toastStore.remove(toast.id);
        }
    }
</script>

<div
    class="fixed bottom-4 right-4 z-50"
    transition:fly={{ x: 100, duration: 300 }}
    role="alert"
>
    <div
        class={`rounded-lg border-l-4 p-4 shadow-md ${colors[toast.type]}`}
        on:click={handleDismiss}
        on:keydown={(e) => e.key === 'Enter' && handleDismiss()}
        tabindex="0"
    >
        <div class="flex items-center">
            <span class="mr-2 text-xl" aria-hidden="true">{icons[toast.type]}</span>
            <div>
                {#if toast.title}
                    <h4 class="font-semibold">{toast.title}</h4>
                {/if}
                <p class="text-sm">{toast.message}</p>
                {#if toast.description}
                    <p class="mt-1 text-xs opacity-75">{toast.description}</p>
                {/if}
            </div>
            {#if toast.dismissible}
                <button
                    class="ml-4 text-sm opacity-75 hover:opacity-100"
                    on:click|stopPropagation={handleDismiss}
                    aria-label="Dismiss notification"
                >
                    ✕
                </button>
            {/if}
        </div>
    </div>
</div> 