export * from './api-key.service';
export * from './historical-data.service';
export * from './trading.service';
export * from './jupiter.service';

import { prisma } from '$lib/server/prisma';
import { ApiKeyService } from './api-key.service';
import { JupiterService } from './jupiter.service';

export const apiKeyService = new ApiKeyService(prisma);
export const jupiterService = new JupiterService(); 