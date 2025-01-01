<!-- Historical Data Test Page -->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { BirdeyeOHLCVResponse } from '$lib/types/birdeye.types';

    let address = '';
    let timeframe = '1h';
    let data: BirdeyeOHLCVResponse | null = null;
    let error: string | null = null;
    let loading = false;

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    async function fetchData() {
        if (!address) {
            error = 'Please enter a token address';
            return;
        }

        loading = true;
        error = null;
        data = null;

        try {
            const response = await fetch('/api/data/historical', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address,
                    timeframe
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch data');
            }

            data = await response.json();
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
        } finally {
            loading = false;
        }
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Historical Data Test</h1>

    <div class="mb-4">
        <label class="block text-sm font-medium mb-1" for="address">
            Token Address
        </label>
        <input
            type="text"
            id="address"
            bind:value={address}
            class="w-full p-2 border rounded"
            placeholder="Enter Solana token address"
        />
    </div>

    <div class="mb-4">
        <label class="block text-sm font-medium mb-1" for="timeframe">
            Timeframe
        </label>
        <select
            id="timeframe"
            bind:value={timeframe}
            class="w-full p-2 border rounded"
        >
            {#each timeframes as tf}
                <option value={tf}>{tf}</option>
            {/each}
        </select>
    </div>

    <button
        on:click={fetchData}
        disabled={loading}
        class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
        {loading ? 'Loading...' : 'Fetch Data'}
    </button>

    {#if error}
        <div class="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
        </div>
    {/if}

    {#if data}
        <div class="mt-4">
            <h2 class="text-xl font-semibold mb-2">Results</h2>
            <div class="bg-gray-100 p-4 rounded overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr>
                            <th class="px-4 py-2">Time</th>
                            <th class="px-4 py-2">Open</th>
                            <th class="px-4 py-2">High</th>
                            <th class="px-4 py-2">Low</th>
                            <th class="px-4 py-2">Close</th>
                            <th class="px-4 py-2">Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.data.items as item}
                            <tr>
                                <td class="border px-4 py-2">
                                    {new Date(item.unixTime * 1000).toLocaleString()}
                                </td>
                                <td class="border px-4 py-2">{item.open.toFixed(6)}</td>
                                <td class="border px-4 py-2">{item.high.toFixed(6)}</td>
                                <td class="border px-4 py-2">{item.low.toFixed(6)}</td>
                                <td class="border px-4 py-2">{item.close.toFixed(6)}</td>
                                <td class="border px-4 py-2">{item.volume.toFixed(2)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div> 