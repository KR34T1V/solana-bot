import type { RequestEvent } from "@sveltejs/kit";

// Export the RequestHandler type with proper request typing
export type RequestHandler = {
  (event: RequestEvent): Promise<Response>;
};
