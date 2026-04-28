import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  // Lazy init inside handler — prevents cold-start crash if env vars missing
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('Razorpay keys missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel env vars.');
    return NextResponse.json(
      { error: 'Payment gateway not configured. Please contact support.' },
      { status: 503 }
    );
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const body = await req.json();
    const { amount, currency = 'INR', receipt, notes } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error: any) {
    console.error('Razorpay create order error:', error);
    return NextResponse.json(
      { error: error?.error?.description || error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
