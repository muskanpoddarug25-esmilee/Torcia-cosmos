import { paymentWorker } from './payment-verify';
import { abandonedCartWorker } from './abandoned-cart';

console.log('[BULLMQ] Starting background workers...');

paymentWorker.on('completed', job => {
  console.log(`[BULLMQ] Job ${job.id} completed successfully`);
});

paymentWorker.on('failed', (job, err) => {
  console.log(`[BULLMQ] Job ${job?.id} failed with ${err.message}`);
});

abandonedCartWorker.on('completed', job => {
  console.log(`[BULLMQ] Cart check ${job.id} completed`);
});

abandonedCartWorker.on('failed', (job, err) => {
  console.log(`[BULLMQ] Cart check ${job?.id} failed with ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[BULLMQ] Shutting down workers...');
  await paymentWorker.close();
  await abandonedCartWorker.close();
  process.exit(0);
});
