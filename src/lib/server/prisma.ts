/**
 * @file Utility functions and helpers
 * @version 1.0.0
 * @module lib/server/prisma
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export { prisma };
