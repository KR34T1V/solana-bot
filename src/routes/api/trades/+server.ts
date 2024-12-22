import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue('event: heartbeat\ndata: connected\n\n');

      // Set up Prisma subscription (mock for now)
      const interval = setInterval(() => {
        controller.enqueue('event: heartbeat\ndata: ping\n\n');
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up on close
      return () => {
        clearInterval(interval);
      };
    }
  });

  return new Response(stream);
};

// Endpoint to notify clients of updates
export const POST: RequestHandler = async ({ request, locals }) => {
  const { type, data } = await request.json();
  
  // In a real implementation, you would broadcast this to all connected clients
  // For now, we'll just invalidate the trades dependency which will trigger a reload
  
  return json({ success: true });
}; 