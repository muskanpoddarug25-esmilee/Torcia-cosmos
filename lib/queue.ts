import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Create a singleton Redis connection for queues
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const paymentQueue = new Queue('payment-verification', { connection });
export const abandonedCartQueue = new Queue('abandoned-cart', { connection });

export async function enqueuePaymentVerification(data: { qrId: string, username: string, password: string, orderId: string, merchantId: string, customerPhone: string, conversationId: string }) {
  console.log(`[QUEUE] Enqueueing payment verification for order ${data.orderId}`);
  await paymentQueue.add('verify', data, {
    attempts: 20,
    backoff: {
      type: 'fixed',
      delay: 15000, // 15 seconds
    },
    delay: 15000, // First attempt after 15 seconds
  });
}

export async function enqueueAbandonedCartCheck(data: { orderId: string, merchantId: string, customerPhone: string, conversationId: string }) {
  console.log(`[QUEUE] Enqueueing abandoned cart check for order ${data.orderId}`);
  // For production, use 1 hour: 60 * 60 * 1000
  // But for testing purposes we'll use 5 minutes if a DEV env var is set, or 1 hour
  const delayTime = process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 60 * 60 * 1000;
  
  await abandonedCartQueue.add('check', data, {
    delay: delayTime,
  });
}
