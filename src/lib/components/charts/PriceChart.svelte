<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, type ChartConfiguration } from 'chart.js/auto';
  import type { ChartData, ChartOptions } from './types';
  import { Card } from '$lib/components/ui';
  import { format } from 'date-fns';

  export let data: ChartData;
  export let options: ChartOptions = {
    timeRange: '1h',
    showGrid: true,
    height: 400,
    tooltips: true
  };

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  $: if (chart && data) {
    updateChart();
  }

  onMount(() => {
    if (canvas) {
      initChart();
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  function initChart() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: data.token.symbol,
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          tooltip: {
            enabled: options.tooltips,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${value.toFixed(2)} USD`;
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: getTimeUnit(options.timeRange)
            },
            grid: {
              display: options.showGrid
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              display: options.showGrid
            },
            ticks: {
              callback: (value) => `$${value}`
            }
          }
        }
      }
    };

    chart = new Chart(ctx, config);
    updateChart();
  }

  function updateChart() {
    if (!chart || !data.prices.length) return;

    const timestamps = data.prices.map(p => new Date(p.timestamp));
    const prices = data.prices.map(p => p.value);

    chart.data.labels = timestamps;
    chart.data.datasets[0].data = prices;
    chart.update('none');
  }

  function getTimeUnit(timeRange: string): 'hour' | 'day' | 'week' | 'month' {
    switch (timeRange) {
      case '1h':
      case '4h':
        return 'hour';
      case '1d':
        return 'day';
      case '1w':
        return 'week';
      case '1m':
        return 'month';
      default:
        return 'hour';
    }
  }
</script>

<Card padding={false}>
  <div style="height: {options.height}px;">
    <canvas bind:this={canvas} />
  </div>
</Card> 