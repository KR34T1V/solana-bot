<script lang="ts">
  import { error as svelteError } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import { createChart, type IChartApi, type ISeriesApi, type LineData, type Time, type SeriesMarker, type SeriesMarkerPosition } from 'lightweight-charts';
  import { runBacktest, type BacktestConfig } from '../../backtest';
  import { logger } from '../../utils/logger';

  let chartContainer: HTMLElement;
  let chart: IChartApi;
  let priceLineSeries: ISeriesApi<'Line'>;
  let tradeMarkerSeries: ISeriesApi<'Line'>;
  
  const defaultSimulation = {
    basePrice: 100,
    volatility: 50,
    spreadPercentage: 0.2,
    timeframeMinutes: 24 * 60,
    interval: 60,
    trendBias: 0,
  };

  let config: BacktestConfig = {
    initialBalance: 100,
    dataSource: {
      type: 'simulated' as const,
      simulation: { ...defaultSimulation }
    }
  };

  let simulation = $state(config.dataSource.simulation ?? defaultSimulation);

  // Use reactive variables
  let results = $state({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: '0',
    totalPnL: '0',
    percentagePnL: '0',
    averagePosition: 0
  });
  let isRunning = $state(false);
  let errorMessage = $state<string | null>(null);

  onMount(() => {
    try {
      chart = createChart(chartContainer, {
        width: 800,
        height: 400,
        layout: {
          background: { color: '#1a1a1a' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2B2B43' },
          horzLines: { color: '#2B2B43' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      priceLineSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });

      // Create a separate series for markers
      tradeMarkerSeries = chart.addLineSeries({
        color: 'rgba(0, 0, 0, 0)',
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Handle window resize
      const resizeChart = () => {
        if (chartContainer && chart) {
          const { width, height } = chartContainer.getBoundingClientRect();
          chart.applyOptions({ width, height });
        }
      };
      window.addEventListener('resize', resizeChart);
      resizeChart();

      return () => {
        window.removeEventListener('resize', resizeChart);
        chart.remove();
      };
    } catch (err) {
      logger.error('Failed to initialize chart', {
        error: err instanceof Error ? err : new Error(String(err)),
        component: 'BacktestPage'
      });
      errorMessage = 'Failed to initialize chart';
    }
  });

  async function startBacktest() {
    isRunning = true;
    errorMessage = null;

    try {
      logger.info('Starting backtest', {
        config,
        component: 'BacktestPage'
      });

      config.dataSource.simulation = { ...simulation };
      const { historicalData, trades, metrics } = await runBacktest(config);
      
      // Update price chart
      const priceData: LineData<Time>[] = historicalData.map(d => ({
        time: Math.floor(new Date(d.timestamp).getTime() / 1000) as Time,
        value: (d.bestBid.price + d.bestAsk.price) / 2,
      }));
      priceLineSeries.setData(priceData);

      // Add trade markers
      const tradeMarkers: SeriesMarker<Time>[] = trades.map(trade => ({
        time: Math.floor(new Date(trade.timestamp).getTime() / 1000) as Time,
        position: (trade.type === 'buy' ? 'belowBar' : 'aboveBar') as SeriesMarkerPosition,
        color: trade.type === 'buy' ? '#4CAF50' : '#FF5252',
        shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown',
        text: `${trade.type.toUpperCase()} ${trade.amount.toFixed(4)} @ ${trade.price.toFixed(2)}`,
      }));
      tradeMarkerSeries.setMarkers(tradeMarkers);

      // Update results
      results = {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: metrics.winRate.toFixed(2),
        totalPnL: metrics.totalPnL.toFixed(4),
        percentagePnL: metrics.percentagePnL.toFixed(2),
        averagePosition: metrics.averagePosition,
      };

      logger.info('Backtest completed', {
        metrics,
        component: 'BacktestPage'
      });
    } catch (err) {
      logger.error('Backtest failed', {
        error: err instanceof Error ? err : new Error(String(err)),
        config,
        component: 'BacktestPage'
      });
      errorMessage = err instanceof Error ? err.message : 'Backtest failed';
    } finally {
      isRunning = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Backtest Visualization</h1>

  {#if errorMessage}
    <div class="bg-red-900 text-white p-4 rounded mb-4">
      Error: {errorMessage}
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div class="bg-gray-800 p-4 rounded">
      <h2 class="text-xl mb-2">Configuration</h2>
      <div class="space-y-2">
        <label class="block">
          Initial Balance (SOL)
          <input type="number" bind:value={config.initialBalance} class="w-full bg-gray-700 p-2 rounded" />
        </label>
        <label class="block">
          Volatility (%)
          <input 
            type="number" 
            bind:value={simulation.volatility} 
            class="w-full bg-gray-700 p-2 rounded" 
          />
        </label>
        <label class="block">
          Spread (%)
          <input 
            type="number" 
            bind:value={simulation.spreadPercentage} 
            class="w-full bg-gray-700 p-2 rounded" 
            step="0.1" 
          />
        </label>
        <label class="block">
          Trend Bias (-1 to 1)
          <input 
            type="number" 
            bind:value={simulation.trendBias} 
            class="w-full bg-gray-700 p-2 rounded" 
            step="0.1" 
            min="-1" 
            max="1" 
          />
        </label>
      </div>
      <button 
        class="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        onclick={startBacktest}
        disabled={isRunning}
      >
        {isRunning ? 'Running...' : 'Start Backtest'}
      </button>
    </div>

    <div class="bg-gray-800 p-4 rounded">
      <h2 class="text-xl mb-2">Results</h2>
      <div class="grid grid-cols-2 gap-2">
        <div>Total Trades: {results.totalTrades}</div>
        <div>Win Rate: {results.winRate}%</div>
        <div>Total PnL: {results.totalPnL} SOL</div>
        <div>PnL %: {results.percentagePnL}%</div>
        <div>Winning Trades: {results.winningTrades}</div>
        <div>Losing Trades: {results.losingTrades}</div>
        <div>Avg Position: {results.averagePosition.toFixed(4)}</div>
      </div>
    </div>
  </div>

  <div class="bg-gray-800 p-4 rounded">
    <div bind:this={chartContainer} class="w-full h-[400px]"></div>
  </div>
</div>

<style>
  :global(html) {
    background-color: #121212;
    color: #ffffff;
  }
</style> 