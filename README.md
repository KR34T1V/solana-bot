# Solana Trading Bot

A trading bot for Solana with backtesting capabilities and multiple trading strategies.

## Features

- Real-time market data monitoring
- Multiple trading strategies (Mean Reversion, VWAP, Volume Enhanced MA)
- Backtesting engine with historical data
- Integration with Shyft API for historical data
- Web interface for monitoring and control

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Add your Shyft API key to the `.env` file:
```
SHYFT_API_KEY=your_api_key_here
```

## Fetching Historical Data

To fetch historical market data for backtesting:

```bash
# Fetch last 30 days of data for a specific market address
yarn fetch-data -- 30 YOUR_MARKET_ADDRESS

# Example with specific market address
yarn fetch-data -- 30 9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT
```

The data will be saved in the `data` directory and can be used for backtesting.

## Running Backtests

To run a backtest using the historical data:

```bash
# Run backtest with default configuration
yarn backtest

# Run backtest with custom configuration
yarn backtest -- '{"initialBalance":100,"dataSource":{"type":"csv","path":"data/solana_historical_30d.csv"}}'
```

## Development

Start the development server:

```bash
yarn dev
```

## Building

Create a production build:

```bash
yarn build
```

Preview the production build:

```bash
yarn preview
```

## License

MIT
