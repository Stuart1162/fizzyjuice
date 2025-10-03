const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

function setCors(res: any, origin?: string | string[]) {
  res.setHeader('Access-Control-Allow-Origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req: any, res: any) {
  setCors(res, req.headers.origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, successUrl, cancelUrl, currency } = req.body || {};
    const origin = req.headers.origin || (process.env.PUBLIC_URL ?? '');
    const success_url = successUrl || `${origin}/post-job?paid=1`;
    const cancel_url = cancelUrl || `${origin}/post-job?paid=0`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (currency || 'gbp').toLowerCase(),
            product_data: {
              name: title || 'Job Post Credit',
            },
            unit_amount: 1000, // £10
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('create-checkout-session error', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
};
