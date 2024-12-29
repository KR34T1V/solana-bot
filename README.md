# Solana Trading Bot

A scalable trading bot platform built with Svelte 5 and SvelteKit, featuring strategy management, backtesting, and real-time trading capabilities.

## Features

- Strategy management and backtesting
- Real-time market data integration via Birdeye API
- Virtual wallet simulation
- Performance analytics
- TypeScript-first codebase
- Test-driven development

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Testing

The project uses Vitest for unit testing and coverage reporting.

```bash
# Run tests
yarn test

# Run tests with UI
yarn test:ui

# Generate coverage report
yarn test:coverage

# Run end-to-end tests
yarn test:e2e
```

### Coverage Thresholds

We maintain strict coverage requirements:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

Coverage reports are generated in HTML format and can be viewed by opening `coverage/index.html` in a browser.

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

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="your-database-url"
BIRDEYE_API_KEY="your-birdeye-api-key"
```

## Contributing

1. Write tests for new features
2. Ensure all tests pass
3. Meet coverage thresholds
4. Follow TypeScript strict mode
5. Use Prettier for code formatting

## License

[MIT](LICENSE)
