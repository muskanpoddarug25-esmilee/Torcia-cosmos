import { abandonedCartWorker } from './abandoned-cart';
import { startExpirySweep, stopExpirySweep } from './expiry-sweep';

console.log('[WORKERS] Starting background workers...');

// Start the local expiry sweep (runs every 5 min, expires stale pending_payment orders)
startExpirySweep();

abandonedCartWorker.on('completed', job => {
  console.log(`[BULLMQ] Cart check ${job.id} completed`);
});

abandonedCartWorker.on('failed', (job, err) => {
  console.log(`[BULLMQ] Cart check ${job?.id} failed with ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WORKERS] Shutting down workers...');
  stopExpirySweep();
  await abandonedCartWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKERS] Shutting down workers (SIGINT)...');
  stopExpirySweep();
  await abandonedCartWorker.close();
  process.exit(0);
});
