# Solana Trading Bot

A scalable trading bot platform built with Svelte 5 and SvelteKit, featuring automated trading strategies using Birdeye's historical data API.

## Features

- Strategy management and backtesting
- Real-time market data integration via Birdeye API
- Virtual wallet simulation
- Performance analytics
- TypeScript-first codebase
- Test-driven development

## Database Configuration

The project supports both SQLite and PostgreSQL databases. You can easily switch between them using the provided script.

### Database Setup

1. **SQLite** (Default, no additional setup required)
   ```bash
   ./scripts/switch-db.sh sqlite
   npx prisma generate
   npx prisma migrate dev
   ```

2. **PostgreSQL**
   - Install PostgreSQL if not already installed
   - Create a database:
     ```bash
     createdb solana_bot
     ```
   - Switch to PostgreSQL:
     ```bash
     ./scripts/switch-db.sh postgres
     npx prisma generate
     npx prisma migrate dev
     ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# JWT Secret (Required)
# Run: openssl rand -base64 32
JWT_SECRET="your-jwt-secret-here"

# Solana Network
SOLANA_NETWORK="devnet"  # or "mainnet-beta"
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Database Configuration
DATABASE_URL="file:./prisma/dev.db"  # For SQLite
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solana_bot?schema=public"  # For PostgreSQL

# Encryption key for API keys (32 bytes)
# Run: openssl rand -base64 32
ENCRYPTION_KEY="your-encryption-key-here"

# Birdeye API
BIRDEYE_API_URL="https://public-api.birdeye.so"
```

## Development

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Initialize the database:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

3. Start the development server:
   ```bash
   yarn dev
   ```

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
yarn test

# Run tests with UI
yarn test:ui

# Generate coverage report
yarn test:coverage

# Run E2E tests
yarn test:e2e
```

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   ├── server/         # Server-side utilities
│   ├── services/       # Core business logic
│   ├── stores/         # State management
│   ├── test/          # Test utilities and setup
│   ├── types/         # TypeScript definitions
│   └── utils/         # Helper functions
├── routes/            # SvelteKit routes
└── app.d.ts          # TypeScript declarations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

UNLICENSED