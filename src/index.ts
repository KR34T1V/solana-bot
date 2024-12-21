import { TradingBot } from './bot/trading-bot';

// Start the bot
const bot = new TradingBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  bot.stop();
});

process.on('SIGTERM', () => {
  bot.stop();
});

bot.initialize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
