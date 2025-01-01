<script lang="ts">
  export let value: string;
  export let options: Array<{ value: string; label: string }>;
  export let label: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let disabled = false;
  export let error: string | undefined = undefined;
  export let className = '';
</script>

<div class="flex flex-col">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1" for={name}>
      {label}
    </label>
  {/if}
  
  <select
    {name}
    {disabled}
    bind:value
    class="
      block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
      {error ? 'border-red-300' : 'border-gray-300'}
      {disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
      {className}
    "
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>

  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div> 