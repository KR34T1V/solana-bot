import { z } from 'zod';
import type { EventType, SystemState, MarketState } from '../../types/events';

// Base Schemas
export const metadataSchema = z.object({
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  source: z.string(),
  environment: z.string(),
  userId: z.string().optional(),
  custom: z.record(z.unknown()).optional()
});

export const baseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string() as z.ZodType<EventType>,
  timestamp: z.string().datetime({ offset: true }),
  version: z.number().int().positive(),
  metadata: metadataSchema
});

// Context Schemas
export const userContextSchema = z.object({
  id: z.string(),
  permissions: z.array(z.string()),
  preferences: z.record(z.unknown()),
  session: z.string().optional()
});

export const systemContextSchema = z.object({
  nodeId: z.string(),
  environment: z.string(),
  version: z.string(),
  state: z.enum(['STARTING', 'RUNNING', 'DEGRADED', 'ERROR', 'SHUTTING_DOWN'] as [SystemState, ...SystemState[]])
});

export const marketConditionsSchema = z.object({
  volatility: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  liquidity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  trend: z.enum(['BULLISH', 'BEARISH', 'SIDEWAYS'])
});

export const marketContextSchema = z.object({
  tradingSession: z.string(),
  marketState: z.enum(['OPEN', 'CLOSED', 'PRE_MARKET', 'POST_MARKET', 'HALTED'] as [MarketState, ...MarketState[]]),
  conditions: marketConditionsSchema
});

export const eventContextSchema = z.object({
  user: userContextSchema.optional(),
  system: systemContextSchema.optional(),
  market: marketContextSchema.optional()
});

// Validation Result Schema
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  details: z.record(z.unknown()).optional()
});

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(validationErrorSchema).optional()
});

// Factory Options Schema
export const eventFactoryOptionsSchema = z.object({
  context: eventContextSchema.optional(),
  metadata: metadataSchema.partial().optional(),
  validate: z.boolean().optional()
}); 