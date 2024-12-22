interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface BaseStrategyConfig {
  timeframe: string;
  profitTarget: number;
  stopLoss: number;
}

interface MeanReversionConfig extends BaseStrategyConfig {
  deviationThreshold: number;
  lookbackPeriod: number;
}

interface TrendFollowingConfig extends BaseStrategyConfig {
  fastMA: number;
  slowMA: number;
  momentumPeriod: number;
}

type StrategyConfig = MeanReversionConfig | TrendFollowingConfig;

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

function validateTimeframe(timeframe: string): ValidationError | null {
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return {
      field: 'timeframe',
      message: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
    };
  }
  return null;
}

function validateProfitTarget(profitTarget: number): ValidationError | null {
  if (profitTarget <= 0) {
    return {
      field: 'profitTarget',
      message: 'Profit target must be greater than 0'
    };
  }
  return null;
}

function validateStopLoss(stopLoss: number, profitTarget: number): ValidationError | null {
  if (stopLoss <= 0) {
    return {
      field: 'stopLoss',
      message: 'Stop loss must be greater than 0'
    };
  }
  if (stopLoss >= profitTarget) {
    return {
      field: 'stopLoss',
      message: 'Stop loss must be less than profit target'
    };
  }
  return null;
}

function validateMeanReversionConfig(config: MeanReversionConfig): ValidationResult {
  const errors: ValidationError[] = [];

  const timeframeError = validateTimeframe(config.timeframe);
  if (timeframeError) errors.push(timeframeError);

  const profitTargetError = validateProfitTarget(config.profitTarget);
  if (profitTargetError) errors.push(profitTargetError);

  const stopLossError = validateStopLoss(config.stopLoss, config.profitTarget);
  if (stopLossError) errors.push(stopLossError);

  if (config.deviationThreshold <= 0) {
    errors.push({
      field: 'deviationThreshold',
      message: 'Deviation threshold must be greater than 0'
    });
  }

  if (config.lookbackPeriod < 10) {
    errors.push({
      field: 'lookbackPeriod',
      message: 'Lookback period must be at least 10 periods'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateTrendFollowingConfig(config: TrendFollowingConfig): ValidationResult {
  const errors: ValidationError[] = [];

  const timeframeError = validateTimeframe(config.timeframe);
  if (timeframeError) errors.push(timeframeError);

  const profitTargetError = validateProfitTarget(config.profitTarget);
  if (profitTargetError) errors.push(profitTargetError);

  const stopLossError = validateStopLoss(config.stopLoss, config.profitTarget);
  if (stopLossError) errors.push(stopLossError);

  if (config.fastMA <= 0) {
    errors.push({
      field: 'fastMA',
      message: 'Fast MA period must be greater than 0'
    });
  }

  if (config.slowMA <= config.fastMA) {
    errors.push({
      field: 'slowMA',
      message: 'Slow MA period must be greater than fast MA period'
    });
  }

  if (config.momentumPeriod < 5) {
    errors.push({
      field: 'momentumPeriod',
      message: 'Momentum period must be at least 5 periods'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateStrategyConfig(type: string, configStr: string): ValidationResult {
  try {
    const config = JSON.parse(configStr) as StrategyConfig;

    switch (type) {
      case 'MEAN_REVERSION':
        return validateMeanReversionConfig(config as MeanReversionConfig);
      case 'TREND_FOLLOWING':
        return validateTrendFollowingConfig(config as TrendFollowingConfig);
      default:
        return {
          isValid: false,
          errors: [{
            field: 'type',
            message: `Invalid strategy type: ${type}`
          }]
        };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'config',
        message: 'Invalid JSON configuration'
      }]
    };
  }
}

export function validateStrategyName(name: string): ValidationError | null {
  if (!name.trim()) {
    return {
      field: 'name',
      message: 'Strategy name is required'
    };
  }

  if (name.length < 3) {
    return {
      field: 'name',
      message: 'Strategy name must be at least 3 characters long'
    };
  }

  if (name.length > 50) {
    return {
      field: 'name',
      message: 'Strategy name must not exceed 50 characters'
    };
  }

  return null;
} 