import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '../../../utils/logger';

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    setHeaders({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let interval: NodeJS.Timeout;
    
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Send initial heartbeat
          controller.enqueue('event: heartbeat\ndata: connected\n\n');

          // Set up heartbeat
          interval = setInterval(() => {
            try {
              controller.enqueue('event: heartbeat\ndata: ping\n\n');
            } catch (err) {
              logger.error('Failed to send heartbeat', {
                error: err,
                component: 'TradesServer'
              });
              clearInterval(interval);
            }
          }, 30000);
        } catch (err) {
          logger.error('Failed to start stream', {
            error: err,
            component: 'TradesServer'
          });
          throw err;
        }
      },
      cancel() {
        clearInterval(interval);
        logger.debug('Stream cancelled', {
          component: 'TradesServer'
        });
      }
    });

    return new Response(stream);
  } catch (err) {
    logger.error('Failed to create stream', {
      error: err,
      component: 'TradesServer'
    });
    throw error(500, 'Failed to create stream');
  }
};

// Endpoint to notify clients of updates
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { type, data } = await request.json();
    
    logger.debug('Trade update received', {
      type,
      data,
      component: 'TradesServer'
    });

    return json({ success: true });
  } catch (err) {
    logger.error('Failed to process trade update', {
      error: err,
      component: 'TradesServer'
    });
    throw error(500, 'Failed to process trade update');
  }
}; 