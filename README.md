# Solana Trading Bot

A TypeScript-based trading bot for Solana DEX markets using web3.js and Serum/OpenBook, with support for live trading, dry runs, and backtesting.

## Features

- Real-time market data monitoring
- Automated spread-based trading strategy
- Multiple operation modes:
  - Live trading on Solana DEX
  - Dry run with simulated trades
  - Backtesting with historical data
- Comprehensive logging system
- Performance tracking and metrics
- Graceful shutdown handling

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Solana wallet with funds (for live trading)
- Access to Solana RPC endpoint

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd solana-bot
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

## Configuration

Edit `.env` with your configuration:

### Network Settings
- `SOLANA_CLUSTER`: Solana network to use (mainnet-beta, devnet, testnet)
- `RPC_ENDPOINT`: Your Solana RPC endpoint

### Wallet Configuration
- `PRIVATE_KEY`: Your wallet private key (required for live trading)

### Market Settings
- `MARKET_ADDRESS`: The DEX market address you want to trade on
  - Will use default SOL/USDC market if not specified

### Trading Parameters
- `MIN_SPREAD_PERCENTAGE`: Minimum spread to consider for trading
- `MAX_TRADE_SIZE_SOL`: Maximum trade size in SOL
- `MIN_SOL_BALANCE`: Minimum SOL balance to maintain

### Testing Configuration
- `DRY_RUN`: Set to true for simulated trading
- `DRY_RUN_INITIAL_SOL`: Initial SOL balance for dry run/backtesting

## Usage

### Live Trading
```bash
yarn start    # Start live trading
yarn dev      # Start with hot-reloading
```

### Dry Run Testing
Set `DRY_RUN=true` in `.env` and run:
```bash
yarn start
```

### Backtesting
The bot includes a sophisticated backtesting system that supports both historical data and simulated market conditions.

#### Running a Backtest
Basic backtest with default settings:
```bash
yarn backtest
```

Custom backtest with configuration:
```bash
yarn backtest '{"initialBalance": 100, "dataSource": {"type": "simulated", "simulation": {"basePrice": 100, "volatility": 30, "timeframeMinutes": 1440}}}'
```

#### Backtesting Configuration

1. **Data Sources**
   - Historical Data (CSV):
     ```json
     {
       "dataSource": {
         "type": "csv",
         "path": "path/to/historical_data.csv"
       }
     }
     ```
   - Simulated Data:
     ```json
     {
       "dataSource": {
         "type": "simulated",
         "simulation": {
           "basePrice": 100,
           "volatility": 50,
           "spreadPercentage": 0.2,
           "timeframeMinutes": 1440,
           "interval": 60,
           "trendBias": 0
         }
       }
     }
     ```

2. **Simulation Parameters**
   - `basePrice`: Starting price in SOL
   - `volatility`: Annual volatility percentage
   - `spreadPercentage`: Average bid-ask spread
   - `timeframeMinutes`: Duration of simulation
   - `interval`: Data point interval in seconds
   - `trendBias`: Price trend bias (-1 to 1)

3. **Historical Data Format (CSV)**
   Required columns:
   ```csv
   timestamp,bidPrice,bidSize,askPrice,askSize
   2024-01-01T00:00:00Z,100.5,1.5,100.7,2.0
   ```

#### Backtest Results
The system provides comprehensive performance metrics:
- Total number of trades
- Win/loss ratio
- Profit and loss (PnL)
- Position analysis
- Trade history

Example output:
```
Backtest Results:
- Total Trades: 124
- Winning Trades: 75
- Win Rate: 60.48%
- Total PnL: 2.5430 SOL
- Percentage PnL: 25.43%
```

### Other Commands
```bash
yarn build    # Build the project
yarn lint     # Run linter
yarn format   # Format code
```

## Project Structure

```
src/
├── bot/            # Core bot logic
│   ├── trading-bot.ts
│   └── trading-strategy.ts
├── services/       # Service implementations
│   ├── market.ts           # Live market service
│   ├── wallet.ts          # Live wallet service
│   ├── mock-wallet.ts     # Dry run wallet
│   ├── backtest-market.ts # Backtesting market
│   └── backtest-wallet.ts # Backtesting wallet
├── utils/          # Utilities
│   └── logger.ts
├── config/         # Configuration
├── index.ts        # Live trading entry
└── backtest.ts     # Backtesting entry

logs/              # Trading and error logs
```

## Trading Strategy

The current implementation uses a simple spread-based strategy:
- Monitors bid-ask spread
- Places trades when spread exceeds threshold
- Configurable parameters in `.env`

To implement your own strategy:
1. Create a new class implementing the `TradingStrategy` interface
2. Update the strategy initialization in `index.ts` or `backtest.ts`

## Safety Considerations

- Never commit your `.env` file
- Start with small trade sizes
- Test thoroughly with dry run mode
- Monitor the bot's activity through logs
- Use reliable RPC endpoints
- Implement proper error handling

## License

[Add your license here] 