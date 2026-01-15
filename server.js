require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Stripe webhook needs raw body, so we add this before other middleware
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      console.log('Customer:', session.customer);
      console.log('Product:', session.metadata?.product || 'unknown');
      // In the future, you'd save this to a database here
      break;
    
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription change:', subscription.id, subscription.status);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Create Stripe checkout session
app.post('/create-checkout', async (req, res) => {
  try {
    const { product, email, deviceId } = req.body;

    // Define your products/prices here
    const products = {
      'tivity': {
        priceId: process.env.TIVITY_PRICE_ID,
        name: 'Tivity Premium',
        successUrl: 'chrome-extension://YOUR_EXTENSION_ID/success.html'
      },
      'tenet': {
        priceId: process.env.TENET_PRICE_ID,
        name: 'Tenet Education',
        successUrl: 'chrome-extension://YOUR_EXTENSION_ID/success.html'
      },
      'safeai': {
        priceId: process.env.SAFEAI_PRICE_ID,
        name: 'SafeAI Family',
        successUrl: 'chrome-extension://YOUR_EXTENSION_ID/success.html'
      }
    };

    const selectedProduct = products[product];
    if (!selectedProduct) {
      return res.status(400).json({ error: 'Invalid product' });
    }

    // Create or retrieve customer
    let customer;
    if (email) {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: { deviceId: deviceId || 'unknown' }
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer?.id,
      customer_email: !customer ? email : undefined,
      line_items: [
        {
          price: selectedProduct.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: selectedProduct.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'chrome-extension://YOUR_EXTENSION_ID/cancel.html',
      metadata: {
        product: product,
        deviceId: deviceId || 'unknown'
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify premium status
app.post('/verify-premium', async (req, res) => {
  try {
    const { email, customerId, deviceId } = req.body;

    if (!email && !customerId) {
      return res.status(400).json({ error: 'Email or customerId required' });
    }

    let customer;

    // Find customer by email or customerId
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
    } else {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      customer = customers.data[0];
    }

    if (!customer) {
      return res.json({ 
        isPremium: false, 
        message: 'No customer found' 
      });
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    const isPremium = subscriptions.data.length > 0;

    res.json({
      isPremium,
      customerId: customer.id,
      email: customer.email,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end
      }))
    });
  } catch (error) {
    console.error('Error verifying premium status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
