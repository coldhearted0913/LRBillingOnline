/**
 * Server-side initialization
 * Runs when the server starts
 */
import { initializeScheduler } from './services/scheduler';

// Initialize scheduler only on server side
if (typeof window === 'undefined') {
  // Initialize scheduled jobs
  initializeScheduler();
  console.log('[Init] Scheduler initialized');
}

