# Solana Trading Bot

A secure, scalable Solana trading bot with real-time token detection and automated trading capabilities.

## Features

### Token Detection Service

- Real-time monitoring of new token mints on Solana
- Robust validation and filtering of token launches
- Support for multiple log formats and creator detection
- Configurable validation rules for decimals, metadata, and creators
- Type-safe event emission for token detection and errors

## Installation

```bash
npm install
```

## Configuration

The token detector can be configured with the following options:

```typescript
interface TokenConfig {
  minDecimals: number; // Minimum allowed decimal places
  maxDecimals: number; // Maximum allowed decimal places
  requiredMetadataFields: string[]; // Required metadata fields (e.g., ['name', 'symbol'])
  excludedCreators?: string[]; // List of creators to exclude
  minInitialLiquidity?: number; // Minimum initial liquidity requirement
}
```

## Usage

```typescript
import { Connection } from "@solana/web3.js";
import { TokenDetector } from "./lib/services/detection/token-detector";

// Initialize connection
const connection = new Connection("YOUR_RPC_ENDPOINT");

// Configure token detector
const config = {
  minDecimals: 0,
  maxDecimals: 9,
  requiredMetadataFields: ["name", "symbol"],
  excludedCreators: ["EXCLUDED_CREATOR_ADDRESS"],
};

// Create detector instance
const detector = new TokenDetector(connection, config);

// Listen for new token detections
detector.on("detection", (result) => {
  console.log("New token detected:", result.token);
  console.log("Confidence score:", result.confidence);
  console.log("Validation results:", result.validationResults);
});

// Handle errors
detector.on("error", (error) => {
  console.error("Detection error:", error);
});

// Start monitoring
await detector.start();
```

## Testing

Run the test suite:

```bash
npm test
```

Run specific tests:

```bash
npm test src/lib/services/detection/__tests__/token-detector.test.ts
```

## Development

### Code Structure

- `src/lib/services/detection/` - Token detection service
  - `token-detector.ts` - Main token detection implementation
  - `__tests__/` - Test files

### Token Detection Process

1. Monitor Solana Token Program logs for new mint instructions
2. Extract mint address and creator information
3. Validate token metadata and configuration
4. Calculate confidence score based on validation results
5. Emit detection events for valid tokens

### Validation Rules

- Decimal places within configured range
- Required metadata fields present
- Creator not in exclusion list
- Valid public keys for mint and creator addresses

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

UNLICENSED
