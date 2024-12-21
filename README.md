# Solana Trading Bot

A TypeScript-based trading bot for Solana DEX markets using web3.js and Serum/OpenBook.

## Features

- Real-time market data monitoring
- Automated spread tracking
- Configurable trading parameters
- Logging system for monitoring and debugging
- Graceful shutdown handling

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Solana wallet with funds
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

Edit `.env` with your configuration:
- `SOLANA_CLUSTER`: Solana network to use (mainnet-beta, devnet, testnet)
- `RPC_ENDPOINT`: Your Solana RPC endpoint
- `PRIVATE_KEY`: Your wallet private key
- `MARKET_ADDRESS`: The DEX market address you want to trade on
- `MIN_SPREAD_PERCENTAGE`: Minimum spread to consider for trading
- `MAX_TRADE_SIZE_SOL`: Maximum trade size in SOL
- `MIN_SOL_BALANCE`: Minimum SOL balance to maintain

## Usage

Start the bot in development mode:
```bash
yarn dev
```

Build and run in production:
```bash
yarn build
yarn start
```

Other commands:
```bash
yarn lint    # Run linter
yarn format  # Format code
```

## Project Structure

```
src/
├── config/         # Configuration and environment setup
├── services/       # Core services (wallet, market)
└── index.ts        # Main bot logic

logs/              # Trading and error logs
```

## Safety Considerations

- Never commit your `.env` file
- Start with small trade sizes on devnet
- Monitor the bot's activity through logs
- Use reliable RPC endpoints

## License

[Add your license here] 