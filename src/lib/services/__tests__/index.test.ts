import { describe, it, expect } from 'vitest';
import * as services from '../index';

describe('Services Index', () => {
  it('should export all services', () => {
    expect(services).toHaveProperty('HistoricalDataService');
    expect(services).toHaveProperty('TradingBotService');
    expect(services).toHaveProperty('WalletService');
    expect(services).toHaveProperty('BirdeyeService');
    expect(services).toHaveProperty('StrategyService');
  });

  it('should export services as classes', () => {
    expect(services.HistoricalDataService).toBeTypeOf('function');
    expect(services.TradingBotService).toBeTypeOf('function');
    expect(services.WalletService).toBeTypeOf('function');
    expect(services.BirdeyeService).toBeTypeOf('function');
    expect(services.StrategyService).toBeTypeOf('function');
  });
}); 