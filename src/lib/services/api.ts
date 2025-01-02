/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/api
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { PrismaClient } from "@prisma/client";
import { ManagedAuthService } from "./core/managed-auth";
import { ManagedLoggingService } from "./core/managed-logging";

// Initialize services
const prisma = new PrismaClient();
const loggingService = new ManagedLoggingService({
  level: "info",
  serviceName: "solana-bot-api",
});

// Start logging service
await loggingService.start();

// Initialize auth service with logging
export const authService = new ManagedAuthService(loggingService);

// Start auth service
await authService.start();

// Cleanup on process exit
process.on("beforeExit", async () => {
  await authService.stop();
  await loggingService.stop();
  await prisma.$disconnect();
});
