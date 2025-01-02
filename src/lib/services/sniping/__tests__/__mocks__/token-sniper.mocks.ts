import { vi } from "vitest";

export const mockOnProgramAccountChange = vi.fn(() => 123);
export const mockRemoveProgramAccountChangeListener = vi.fn();
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Setup mocks
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn(() => ({
    onProgramAccountChange: mockOnProgramAccountChange,
    removeProgramAccountChangeListener: mockRemoveProgramAccountChangeListener,
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
  })),
}));

vi.mock("../../../logging.service", () => ({
  logger: mockLogger,
}));

vi.mock("../../../providers/provider.factory", () => ({
  ProviderFactory: {
    getProvider: vi.fn(() => ({
      getPrice: vi
        .fn()
        .mockResolvedValue({
          price: 1.0,
          timestamp: Date.now(),
          confidence: 0.95,
        }),
      getOrderBook: vi.fn().mockResolvedValue({
        bids: [[1.0, 1000]],
        asks: [[1.1, 1000]],
        timestamp: Date.now(),
      }),
    })),
  },
  ProviderType: {
    JUPITER: "jupiter",
  },
}));

vi.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
}));
