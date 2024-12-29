import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateStrategyConfig, validateStrategyName } from '../validation'

describe('Validation Service', () => {
  describe('validateStrategyConfig', () => {
    describe('MEAN_REVERSION strategy', () => {
      it('should validate valid mean reversion config', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          deviationThreshold: 2.0,
          lookbackPeriod: 20
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid timeframe', () => {
        const config = {
          timeframe: '2h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          deviationThreshold: 2.0,
          lookbackPeriod: 20
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('timeframe')
      })

      it('should reject negative profit target', () => {
        const config = {
          timeframe: '1h',
          profitTarget: -2.5,
          stopLoss: 1.5,
          deviationThreshold: 2.0,
          lookbackPeriod: 20
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('profitTarget')
      })

      it('should reject stop loss greater than profit target', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 3.0,
          deviationThreshold: 2.0,
          lookbackPeriod: 20
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('stopLoss')
      })

      it('should reject negative deviation threshold', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          deviationThreshold: -2.0,
          lookbackPeriod: 20
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('deviationThreshold')
      })

      it('should reject short lookback period', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          deviationThreshold: 2.0,
          lookbackPeriod: 5
        }

        const result = validateStrategyConfig('MEAN_REVERSION', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('lookbackPeriod')
      })
    })

    describe('TREND_FOLLOWING strategy', () => {
      it('should validate valid trend following config', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          fastMA: 10,
          slowMA: 20,
          momentumPeriod: 10
        }

        const result = validateStrategyConfig('TREND_FOLLOWING', JSON.stringify(config))
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid MA periods', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          fastMA: 20,
          slowMA: 10,
          momentumPeriod: 10
        }

        const result = validateStrategyConfig('TREND_FOLLOWING', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('slowMA')
      })

      it('should reject short momentum period', () => {
        const config = {
          timeframe: '1h',
          profitTarget: 2.5,
          stopLoss: 1.5,
          fastMA: 10,
          slowMA: 20,
          momentumPeriod: 3
        }

        const result = validateStrategyConfig('TREND_FOLLOWING', JSON.stringify(config))
        expect(result.isValid).toBe(false)
        expect(result.errors[0].field).toBe('momentumPeriod')
      })
    })

    it('should reject invalid strategy type', () => {
      const config = {
        timeframe: '1h',
        profitTarget: 2.5,
        stopLoss: 1.5
      }

      const result = validateStrategyConfig('INVALID_TYPE', JSON.stringify(config))
      expect(result.isValid).toBe(false)
      expect(result.errors[0].field).toBe('type')
    })

    it('should reject invalid JSON', () => {
      const result = validateStrategyConfig('MEAN_REVERSION', 'invalid json')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].field).toBe('config')
    })
  })

  describe('validateStrategyName', () => {
    it('should accept valid strategy name', () => {
      const result = validateStrategyName('My Strategy')
      expect(result).toBeNull()
    })

    it('should reject empty name', () => {
      const result = validateStrategyName('')
      expect(result?.field).toBe('name')
      expect(result?.message).toContain('required')
    })

    it('should reject short name', () => {
      const result = validateStrategyName('ab')
      expect(result?.field).toBe('name')
      expect(result?.message).toContain('at least 3 characters')
    })

    it('should reject long name', () => {
      const result = validateStrategyName('a'.repeat(51))
      expect(result?.field).toBe('name')
      expect(result?.message).toContain('not exceed 50 characters')
    })
  })
}) 