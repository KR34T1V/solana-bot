import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  let interval: NodeJS.Timeout;
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue('event: heartbeat\ndata: connected\n\n');

      // Set up heartbeat
      interval = setInterval(() => {
        try {
          controller.enqueue('event: heartbeat\ndata: ping\n\n');
        } catch (error) {
          clearInterval(interval);
        }
      }, 30000);
    },
    cancel() {
      clearInterval(interval);
    }
  });

  return new Response(stream);
};

// Endpoint to notify clients of updates
export const POST: RequestHandler = async ({ request }) => {
  const { type, data } = await request.json();
  return json({ success: true });
}; 