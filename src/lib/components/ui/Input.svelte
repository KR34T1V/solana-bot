<script lang="ts">
  export let type: 'text' | 'number' | 'email' | 'password' | 'search' = 'text';
  export let value: string | number = '';
  export let label: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let placeholder = '';
  export let disabled = false;
  export let readonly = false;
  export let error: string | undefined = undefined;
  export let className = '';

  // Handle input validation and formatting
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (type === 'number') {
      // Remove non-numeric characters except decimal point and minus
      target.value = target.value.replace(/[^\d.-]/g, '');
    }
  }
</script>

<div class="flex flex-col">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1" for={name}>
      {label}
    </label>
  {/if}

  <input
    {type}
    {name}
    {placeholder}
    {disabled}
    {readonly}
    bind:value
    on:input={handleInput}
    class="
      block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
      {error ? 'border-red-300' : 'border-gray-300'}
      {disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
      {readonly ? 'bg-gray-50' : ''}
      {className}
    "
  />

  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div> 