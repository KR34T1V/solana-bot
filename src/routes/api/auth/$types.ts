/**
 * @file API route handler for HTTP endpoints
 * @version 1.0.0
 * @module routes/api/auth/$types
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { RequestEvent } from "@sveltejs/kit";

// Export the RequestHandler type with proper request typing
export type RequestHandler = {
  (event: RequestEvent): Promise<Response>;
};
