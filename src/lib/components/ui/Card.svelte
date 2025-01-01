<script lang="ts">
  export let title: string | undefined = undefined;
  export let padding = true;
  export let className = '';
</script>

<div class="bg-white rounded-lg shadow {padding ? 'p-6' : ''} {className}">
  {#if title}
    <h2 class="text-xl font-bold mb-4">{title}</h2>
  {/if}
  <slot />
</div> 