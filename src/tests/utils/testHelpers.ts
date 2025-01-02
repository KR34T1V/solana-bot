/**
 * @file Test utility functions and helpers
 * @version 1.0.0
 * @module tests/utils/testHelpers
 * @author Development Team
 * @lastModified 2024-01-02
 */

import type { RequestEvent } from "@sveltejs/kit";

/**
 * @function createRequestEvent
 * @description Creates a mock request event for testing API endpoints
 *
 * @param {string} method - HTTP method for the request
 * @param {string} path - URL path for the request
 * @param {unknown} body - Optional request body
 * @param {Record<string, string>} headers - Optional request headers
 * @returns {Promise<RequestEvent>} A mocked RequestEvent object for testing
 */
export async function createRequestEvent(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<RequestEvent> {
  return {
    request: new Request(`http://localhost${path}`, {
      method,
      headers: new Headers(headers),
      body: body ? JSON.stringify(body) : null,
    }),
    locals: {},
    params: {},
    platform: {},
    route: { id: path },
    setHeaders: () => {},
    url: new URL(`http://localhost${path}`),
    isDataRequest: false,
    getClientAddress: () => "127.0.0.1",
    cookies: new Map(),
    fetch: fetch,
    isSubRequest: false,
  } as unknown as RequestEvent;
}
