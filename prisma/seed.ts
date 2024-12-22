import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test strategies
  const strategy1 = await prisma.strategy.create({
    data: {
      name: 'Moving Average Crossover',
      description: 'Simple strategy based on 50/200 EMA crossover',
      configJson: JSON.stringify({
        shortPeriod: 50,
        longPeriod: 200,
        timeframe: '1h'
      }),
      isActive: true
    }
  });

  const strategy2 = await prisma.strategy.create({
    data: {
      name: 'RSI Divergence',
      description: 'Identifies potential reversals using RSI divergence',
      configJson: JSON.stringify({
        rsiPeriod: 14,
        overbought: 70,
        oversold: 30
      }),
      isActive: true
    }
  });

  // Create test trades
  await prisma.trade.createMany({
    data: [
      {
        symbol: 'SOL/USDT',
        entryPrice: 100.50,
        exitPrice: 105.75,
        quantity: 10,
        side: 'BUY',
        status: 'CLOSED',
        profitLoss: 5.25,
        strategyId: strategy1.id
      },
      {
        symbol: 'SOL/USDT',
        entryPrice: 98.25,
        quantity: 15,
        side: 'BUY',
        status: 'OPEN',
        strategyId: strategy1.id
      },
      {
        symbol: 'SOL/USDT',
        entryPrice: 95.00,
        exitPrice: 93.50,
        quantity: 20,
        side: 'SELL',
        status: 'CLOSED',
        profitLoss: -1.50,
        strategyId: strategy2.id
      }
    ]
  });

  console.log('Database has been seeded with test data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 