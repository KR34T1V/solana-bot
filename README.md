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

## Market Data Providers

The project uses a standardized provider interface for integrating different market data sources. Currently supported providers:

- Jupiter API (Real-time DEX prices)
- More coming soon...

### Implementing a New Provider

1. **Create Provider Class**

Create a new file in `src/lib/services/providers/your-provider.ts`:

```typescript
import type {
  BaseProvider,
  PriceData,
  OHLCVData,
  MarketDepth,
} from "$lib/types/provider";

export class YourProvider implements BaseProvider {
  async getPrice(tokenMint: string): Promise<PriceData> {
    // Implement price fetching
  }

  async getOHLCV(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData[]> {
    // Implement OHLCV data fetching
  }

  async getOrderBook?(tokenMint: string, limit?: number): Promise<MarketDepth> {
    // Optional: Implement order book fetching
  }
}
```

2. **Add Provider Type**

Update `src/lib/services/providers/provider.factory.ts`:

```typescript
export enum ProviderType {
  JUPITER = "jupiter",
  YOUR_PROVIDER = "your-provider",
}

export class ProviderFactory {
  private static createProvider(type: ProviderType): BaseProvider {
    switch (type) {
      case ProviderType.JUPITER:
        return new JupiterProvider();
      case ProviderType.YOUR_PROVIDER:
        return new YourProvider();
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
}
```

3. **Implement Tests**

Create `src/lib/services/providers/__tests__/your-provider.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { YourProvider } from "../your-provider";

describe("YourProvider", () => {
  let provider: YourProvider;

  beforeEach(() => {
    provider = new YourProvider();
  });

  describe("getPrice", () => {
    it("should fetch price successfully", async () => {
      // Test price fetching
    });

    it("should handle errors", async () => {
      // Test error handling
    });
  });

  // Add more test cases
});
```

4. **Required Implementations**

Each provider must implement:

- **Price Data**

  ```typescript
  interface PriceData {
    price: number; // Current price
    timestamp: number; // Unix timestamp
    confidence?: number; // Optional confidence score (0-1)
  }
  ```

- **OHLCV Data** (if supported)

  ```typescript
  interface OHLCVData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  ```

- **Order Book Data** (optional)
  ```typescript
  interface MarketDepth {
    bids: [price: number, size: number][];
    asks: [price: number, size: number][];
    timestamp: number;
  }
  ```

5. **Best Practices**

- Implement proper error handling
- Add retry logic for network requests
- Use TypeScript strict mode
- Add comprehensive logging
- Cache responses when appropriate
- Add rate limiting protection
- Document API limitations

6. **Usage Example**

```typescript
import {
  ProviderFactory,
  ProviderType,
} from "$lib/services/providers/provider.factory";

// Get provider instance
const provider = ProviderFactory.getProvider(ProviderType.YOUR_PROVIDER);

// Fetch price
const priceData = await provider.getPrice("token-mint-address");

// Fetch OHLCV data
const ohlcvData = await provider.getOHLCV("token-mint-address", 5, 100);
```

7. **Environment Configuration**

Add any required API keys or configuration to `.env`:

```env
# Your Provider Configuration
YOUR_PROVIDER_API_KEY="your-api-key"
YOUR_PROVIDER_API_URL="https://api.your-provider.com"
```

8. **Type Definitions**

Update `src/env.d.ts` with new environment variables:

```typescript
interface ImportMetaEnv {
  // ... existing env vars ...
  readonly YOUR_PROVIDER_API_KEY: string;
  readonly YOUR_PROVIDER_API_URL: string;
}
```

### Provider Requirements

1. **Error Handling**

   - Implement proper error types
   - Add retry logic for transient failures
   - Log errors with context

2. **Rate Limiting**

   - Respect API rate limits
   - Implement backoff strategies
   - Cache responses when possible

3. **Testing**

   - Unit tests for all methods
   - Integration tests with API
   - Error scenario coverage
   - Mock API responses

4. **Documentation**

   - API limitations
   - Rate limit details
   - Required configuration
   - Usage examples

5. **Monitoring**
   - Response times
   - Error rates
   - Rate limit status
   - Cache hit rates

### Jupiter Provider Implementation

The Jupiter provider is currently implemented with the following features:

1. **Price Data**

   - Real-time DEX aggregated prices
   - High confidence scores from liquidity aggregation
   - Automatic retry logic with exponential backoff

2. **Configuration**

Add to your `.env`:

```env
PUBLIC_JUPITER_API_URL="https://price.jup.ag/v4"
```

3. **Usage Example**

```typescript
import {
  ProviderFactory,
  ProviderType,
} from "$lib/services/providers/provider.factory";

// Get Jupiter provider
const provider = ProviderFactory.getProvider(ProviderType.JUPITER);

// Fetch SOL price
const solPrice = await provider.getPrice(
  "So11111111111111111111111111111111111111112",
);
console.log(`Current SOL price: $${solPrice.price}`);
```

4. **Features**

   - Real-time price updates
   - Automatic error recovery
   - Comprehensive error logging
   - Request retries (3 attempts)
   - Type-safe responses

5. **Limitations**

   - OHLCV data not supported
   - Order book data not implemented
   - Rate limits apply (check Jupiter docs)

6. **Error Handling**

```typescript
try {
  const price = await provider.getPrice(tokenMint);
} catch (error) {
  if (error.message.includes("No price data found")) {
    // Handle missing price data
  } else if (error.message.includes("Network error")) {
    // Handle network issues
  }
}
```

7. **Response Format**

```typescript
// Price Response
{
  price: number; // Current token price
  timestamp: number; // Unix timestamp in milliseconds
  confidence: 1; // Always 1 for Jupiter (DEX aggregated)
}
```

8. **Testing**

```bash
# Run Jupiter provider tests
yarn test src/lib/services/providers/__tests__/jupiter.provider.test.ts
```
