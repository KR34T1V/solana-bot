import { z } from 'zod';
import { baseEventSchema } from './schemas';

// Market Event Schemas
export const marketEventSchema = baseEventSchema.extend({
  symbol: z.string(),
  exchange: z.string(),
  timestamp: z.string().datetime({ offset: true })
});

export const priceUpdateSchema = marketEventSchema.extend({
  type: z.literal('PRICE_UPDATE'),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  side: z.enum(['BUY', 'SELL'])
});

export const liquidityChangeSchema = marketEventSchema.extend({
  type: z.literal('LIQUIDITY_CHANGE'),
  oldLiquidity: z.number().nonnegative(),
  newLiquidity: z.number().nonnegative(),
  reason: z.string().optional()
});

export const marketDepthSchema = marketEventSchema.extend({
  type: z.literal('MARKET_DEPTH'),
  bids: z.array(z.tuple([z.number(), z.number()])),
  asks: z.array(z.tuple([z.number(), z.number()])),
  sequenceNumber: z.number().int()
});

// Trading Event Schemas
export const tradingEventSchema = baseEventSchema.extend({
  symbol: z.string(),
  exchange: z.string(),
  orderId: z.string()
});

export const orderCreatedSchema = tradingEventSchema.extend({
  type: z.literal('ORDER_CREATED'),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']),
  strategy: z.string().optional()
});

export const orderExecutedSchema = tradingEventSchema.extend({
  type: z.literal('ORDER_EXECUTED'),
  executionId: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  side: z.enum(['BUY', 'SELL']),
  timestamp: z.string().datetime({ offset: true }),
  fee: z.number().nonnegative().optional(),
  remainingQuantity: z.number().nonnegative()
});

// System Event Schemas
export const systemEventSchema = baseEventSchema.extend({
  component: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
});

export const healthCheckSchema = systemEventSchema.extend({
  type: z.literal('HEALTH_CHECK'),
  status: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY']),
  checks: z.record(z.object({
    status: z.enum(['PASS', 'FAIL']),
    latency: z.number(),
    message: z.string().optional()
  }))
});

export const errorOccurredSchema = systemEventSchema.extend({
  type: z.literal('ERROR_OCCURRED'),
  error: z.object({
    message: z.string(),
    code: z.string(),
    stack: z.string().optional(),
    context: z.record(z.unknown()).optional()
  }),
  handled: z.boolean(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

// User Event Schemas
export const userEventSchema = baseEventSchema.extend({
  userId: z.string(),
  sessionId: z.string()
});

export const userActionSchema = userEventSchema.extend({
  type: z.literal('USER_ACTION'),
  action: z.string(),
  target: z.string(),
  data: z.record(z.unknown()),
  result: z.enum(['SUCCESS', 'FAILURE']),
  timestamp: z.string().datetime({ offset: true })
});

export const strategyChangeSchema = userEventSchema.extend({
  type: z.literal('STRATEGY_CHANGE'),
  strategy: z.string(),
  changes: z.array(z.object({
    parameter: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown()
  })),
  reason: z.string().optional()
});

// Schema Registry
export const eventSchemas = {
  // Market Events
  PRICE_UPDATE: priceUpdateSchema,
  LIQUIDITY_CHANGE: liquidityChangeSchema,
  MARKET_DEPTH: marketDepthSchema,

  // Trading Events
  ORDER_CREATED: orderCreatedSchema,
  ORDER_EXECUTED: orderExecutedSchema,

  // System Events
  HEALTH_CHECK: healthCheckSchema,
  ERROR_OCCURRED: errorOccurredSchema,

  // User Events
  USER_ACTION: userActionSchema,
  STRATEGY_CHANGE: strategyChangeSchema
} as const; 