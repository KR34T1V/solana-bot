import type { RequestEvent } from "@sveltejs/kit";

export async function createRequestEvent(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<RequestEvent> {
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    request,
    url: new URL(request.url),
    params: {},
    locals: {},
    platform: {},
    getClientAddress: () => "127.0.0.1",
  } as RequestEvent;
}
