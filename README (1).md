# TrueMadeAI Stripe Backend

Minimal Node.js + Stripe backend for Tivity, Tenet, and SafeAI premium features.

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your API keys from [API Keys page](https://dashboard.stripe.com/test/apikeys)
3. Create products and prices:
   - Go to Products → Create Product
   - For each product (Tivity, Tenet, SafeAI), create a recurring price
   - Copy the Price IDs (they look like `price_xxxxx`)

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Get this after setting up webhooks (step 4)
TIVITY_PRICE_ID=price_xxxxx
TENET_PRICE_ID=price_xxxxx
SAFEAI_PRICE_ID=price_xxxxx
```

### 4. Set Up Webhooks (for local testing)

Install Stripe CLI:
```bash
# Mac
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/webhook
```

The CLI will give you a webhook secret (`whsec_xxxxx`) - add it to your `.env` file.

### 5. Run the Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

### Create Checkout Session
```javascript
POST /create-checkout

Body:
{
  "product": "tivity",  // or "tenet", "safeai"
  "email": "user@example.com",
  "deviceId": "chrome-extension-unique-id"  // optional
}

Response:
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_xxxxx"
}
```

### Verify Premium Status
```javascript
POST /verify-premium

Body (option 1 - by email):
{
  "email": "user@example.com"
}

Body (option 2 - by customer ID):
{
  "customerId": "cus_xxxxx"
}

Response:
{
  "isPremium": true,
  "customerId": "cus_xxxxx",
  "email": "user@example.com",
  "subscriptions": [...]
}
```

### Webhook Handler
```
POST /webhook
```
Handles Stripe events (payment success, subscription changes, etc.)

### Health Check
```
GET /health
```

## Chrome Extension Integration

### Example: Create Checkout
```javascript
// In your Chrome extension
async function upgradeToPremium() {
  const response = await fetch('https://your-backend.com/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: 'tivity',
      email: userEmail,
      deviceId: chrome.runtime.id
    })
  });
  
  const { url } = await response.json();
  chrome.tabs.create({ url }); // Open Stripe checkout
}
```

### Example: Check Premium Status
```javascript
// In your Chrome extension
async function checkPremiumStatus() {
  const response = await fetch('https://your-backend.com/verify-premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail
    })
  });
  
  const { isPremium } = await response.json();
  
  if (isPremium) {
    chrome.storage.sync.set({ isPremium: true });
  }
}
```

## Deployment

### Option 1: Railway (Recommended - Easiest)

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Add environment variables in Railway dashboard
6. Railway auto-deploys on every push

**Cost:** $5/month for hobby plan

### Option 2: Render

1. Push to GitHub
2. Go to [Render.com](https://render.com)
3. New → Web Service
4. Connect GitHub repo
5. Add environment variables
6. Deploy

**Cost:** Free tier available (spins down after inactivity)

### Option 3: Vercel (Serverless)

Vercel works but you'll need to refactor slightly for serverless functions. Railway/Render are simpler for this use case.

### After Deployment

1. Update your Chrome extension with the production URL
2. In Stripe Dashboard, set up production webhooks:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-production-url.com/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the webhook secret to your production environment variables

## Testing

### Test the checkout flow:
```bash
curl -X POST http://localhost:3000/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"product":"tivity","email":"test@example.com"}'
```

### Test premium verification:
```bash
curl -X POST http://localhost:3000/verify-premium \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test with Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- More: https://stripe.com/docs/testing

## Adding Features Later

When you need a database (for faster lookups, analytics, etc.):

1. Add Postgres or MongoDB to Railway/Render
2. In webhook handler, save subscription data to DB
3. In `/verify-premium`, query DB instead of Stripe API

For now, querying Stripe directly keeps it simple and one less thing to maintain.

## Security Notes

- Never expose your `STRIPE_SECRET_KEY` in client-side code
- The webhook secret validates requests are actually from Stripe
- Use HTTPS in production (Railway/Render handle this automatically)
- Consider rate limiting if you get serious traffic

## Support

- Stripe Docs: https://stripe.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
