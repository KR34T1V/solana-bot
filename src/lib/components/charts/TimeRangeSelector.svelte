<script lang="ts">
  import { Button } from '$lib/components/ui';
  import type { TimeRange } from './types';

  export let value: TimeRange;
  export let disabled = false;

  const timeRanges: Array<{ value: TimeRange; label: string }> = [
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' }
  ];

  function handleSelect(range: TimeRange) {
    if (!disabled) {
      value = range;
    }
  }
</script>

<div class="flex space-x-2">
  {#each timeRanges as range}
    <Button
      size="sm"
      variant={value === range.value ? 'primary' : 'secondary'}
      disabled={disabled}
      on:click={() => handleSelect(range.value)}
    >
      {range.label}
    </Button>
  {/each}
</div> 