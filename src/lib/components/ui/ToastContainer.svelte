<script lang="ts">
    import { toastStore } from '$lib/stores/toast.store';
    import Toast from './Toast.svelte';
</script>

<div class="fixed bottom-0 right-0 z-50 p-4 space-y-4">
    {#each $toastStore as toast (toast.id)}
        <Toast {toast} />
    {/each}
</div> 