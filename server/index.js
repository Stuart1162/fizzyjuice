/* Simple Stripe test server for Checkout Sessions */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'] }));
app.use(express.json());

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY missing in environment. Set it in jobs-board/.env');
}
const stripe = require('stripe')(STRIPE_SECRET_KEY || '');

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }
    const { title, successUrl, cancelUrl, currency = 'gbp' } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: title || 'Job Post Credit',
            },
            unit_amount: 1000, // £10.00 test
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || 'http://localhost:3000/post-job?paid=1',
      cancel_url: cancelUrl || 'http://localhost:3000/post-job?paid=0',
      metadata: {
        kind: 'job_post',
      },
    });
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`[stripe-server] listening on http://localhost:${port}`);
});
