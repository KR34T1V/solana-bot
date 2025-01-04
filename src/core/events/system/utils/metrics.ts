import os from 'os';
import type { SystemHealthMetrics } from '../types/system-event';

/**
 * Get current system metrics
 */
export async function getSystemMetrics(): Promise<SystemHealthMetrics> {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory
    },
    cpu: {
      usage: process.cpuUsage().user / 1000000, // Convert to seconds
      load: os.loadavg()
    },
    latency: 0, // This should be implemented based on your monitoring system
    uptime: os.uptime()
  };
} 