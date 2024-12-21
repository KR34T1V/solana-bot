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
Run the bot against historical or simulated market data:
```bash
yarn backtest
```

The backtesting system provides:
- Trade execution simulation
- Position tracking
- PnL calculation
- Performance metrics:
  - Total trades
  - Win/loss ratio
  - Profit/loss statistics
  - Position analysis

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