import type { RequestEvent } from '@sveltejs/kit';

type MockRequestEvent<T extends string = string> = RequestEvent<Record<string, string>, T>;

export function createRequestEvent<T extends string = string>(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  routeId?: T;
}): MockRequestEvent<T> {
  const {
    method = 'GET',
    url = 'http://localhost',
    body = null,
    headers = {},
    routeId = url as T
  } = options;

  const request = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });

  return {
    request,
    url: new URL(url),
    params: {},
    route: { id: routeId },
    locals: {},
    platform: {},
    getClientAddress: () => '127.0.0.1',
    cookies: {
      get: (name: string) => undefined,
      set: (name: string, value: string, options?: any) => {},
      delete: (name: string, options?: any) => {},
      serialize: (name: string, value: string, options?: any) => ''
    },
    fetch,
    setHeaders: (headers: Record<string, string>) => {},
    isDataRequest: false,
    isSubRequest: false
  } as MockRequestEvent<T>;
} 