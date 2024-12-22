import { ShyftMarketService } from '../services/shyft-market';
import { createObjectCsvWriter } from 'csv-writer';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Get API key from environment
    const apiKey = process.env.SHYFT_API_KEY;
    if (!apiKey) {
      throw new Error('SHYFT_API_KEY not found in environment variables');
    }

    // Initialize Shyft service
    const shyftService = new ShyftMarketService(apiKey);

    // Parse command line arguments
    const days = process.argv[2] ? parseInt(process.argv[2]) : 30;
    const address = process.argv[3] || 'YOUR_DEFAULT_MARKET_ADDRESS'; // Replace with actual market address

    // Calculate time range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    logger.info(`Fetching ${days} days of historical data for address ${address}...`);
    const historicalData = await shyftService.fetchHistoricalData(address, startTime, endTime);
    logger.info(`Fetched ${historicalData.length} data points`);

    // Save to CSV
    const filename = path.join(dataDir, `solana_historical_${days}d_${address}.csv`);
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

    const csvData = historicalData.map(point => ({
      timestamp: point.timestamp.toISOString(),
      bidPrice: point.bestBid.price,
      bidSize: point.bestBid.size,
      askPrice: point.bestAsk.price,
      askSize: point.bestAsk.size,
    }));

    await csvWriter.writeRecords(csvData);
    logger.info(`Data saved to ${filename}`);

    logger.info('Historical data fetch completed successfully');
  } catch (error) {
    logger.error('Failed to fetch historical data:', error);
    process.exit(1);
  }
}

// Run the script
main(); 