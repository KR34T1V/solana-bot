import axios from 'axios';
import { createObjectCsvWriter } from 'csv-writer';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CoinGeckoDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface ProcessedDataPoint {
  timestamp: string;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
}

async function fetchHistoricalData(
  days: number = 30,
  currency: string = 'sol',
  vsCurrency: string = 'usd'
): Promise<CoinGeckoDataPoint[]> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      throw new Error('COINGECKO_API_KEY not found in environment variables');
    }

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${currency}/market_chart`,
      {
        params: {
          vs_currency: vsCurrency,
          days: days,
          interval: 'hourly',
        },
        headers: {
          'x-cg-demo-api-key': apiKey,
        },
      }
    );

    const prices = response.data.prices;
    const volumes = response.data.total_volumes;

    return prices.map((price: [number, number], index: number) => ({
      timestamp: price[0],
      price: price[1],
      volume: volumes[index][1],
    }));
  } catch (error) {
    logger.error('Error fetching data from CoinGecko:', error);
    throw error;
  }
}

function processData(data: CoinGeckoDataPoint[]): ProcessedDataPoint[] {
  return data.map(point => {
    // Simulate bid-ask spread based on volume (higher volume = tighter spread)
    const volumeNormalized = Math.min(Math.max(point.volume / 1e7, 0.1), 1);
    const spreadPercentage = 0.002 / volumeNormalized; // Base 0.2% spread, adjusted by volume
    const spreadAmount = point.price * spreadPercentage;

    // Calculate bid and ask prices
    const midPrice = point.price;
    const bidPrice = midPrice - spreadAmount / 2;
    const askPrice = midPrice + spreadAmount / 2;

    // Simulate sizes based on volume
    const baseSize = point.volume / point.price / 1000; // Convert volume to SOL and scale down
    const bidSize = baseSize * (0.8 + Math.random() * 0.4); // ±20% variation
    const askSize = baseSize * (0.8 + Math.random() * 0.4);

    return {
      timestamp: new Date(point.timestamp).toISOString(),
      bidPrice: Number(bidPrice.toFixed(4)),
      bidSize: Number(bidSize.toFixed(4)),
      askPrice: Number(askPrice.toFixed(4)),
      askSize: Number(askSize.toFixed(4)),
    };
  });
}

async function saveToCSV(data: ProcessedDataPoint[], filename: string): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: [
      { id: 'timestamp', title: 'timestamp' },
      { id: 'bidPrice', title: 'bidPrice' },
      { id: 'bidSize', title: 'bidSize' },
      { id: 'askPrice', title: 'askPrice' },
      { id: 'askSize', title: 'askSize' },
    ],
  });

  await csvWriter.writeRecords(data);
  logger.info(`Data saved to ${filename}`);
}

async function main() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Parse command line arguments
    const days = process.argv[2] ? parseInt(process.argv[2]) : 30;
    
    logger.info(`Fetching ${days} days of historical data...`);
    const rawData = await fetchHistoricalData(days);
    logger.info(`Fetched ${rawData.length} data points`);

    const processedData = processData(rawData);
    const filename = path.join(dataDir, `solana_historical_${days}d.csv`);
    await saveToCSV(processedData, filename);

    logger.info('Historical data fetch completed successfully');
  } catch (error) {
    logger.error('Failed to fetch historical data:', error);
    process.exit(1);
  }
}

// Run the script
main(); 