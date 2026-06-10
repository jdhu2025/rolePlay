import { POST as handlePaymentNotification } from '@/app/api/payment/notify/[provider]/route';

export async function POST(req: Request) {
  return handlePaymentNotification(req, {
    params: Promise.resolve({ provider: 'creem' }),
  });
}
