# 🚀 Quick Start: Get This Running in 1 Hour

This guide will get your Stripe backend deployed and working with your Chrome extension.

## ⚡ Super Fast Setup (5 Steps)

### Step 1: Get Your Stripe Keys (5 min)

1. Sign up at [stripe.com](https://stripe.com) (use test mode for now)
2. Go to [Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
3. Copy your **Secret Key** (starts with `sk_test_`)
4. Keep this tab open, you'll need it

### Step 2: Create Your Products (5 min)

1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click "+ Create product"
3. Create three products:

**Tivity Premium**
- Name: Tivity Premium
- Description: Focus blocking for productivity
- Pricing: $4.99/month (or whatever you want)
- Click "Add pricing" → Recurring → Monthly → Create

**Tenet Education** 
- Name: Tenet Education
- Description: AI governance for schools
- Pricing: $2/student/month
- Recurring → Monthly → Create

**SafeAI Family**
- Name: SafeAI Family
- Description: AI safety for families
- Pricing: $9.99/month
- Recurring → Monthly → Create

4. **Copy each Price ID** (looks like `price_1Abc123...`) - you'll need these

### Step 3: Deploy to Railway (15 min)

1. Push this code to GitHub (make your repo public for now)
2. Go to [railway.app](https://railway.app) → Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Click on your service → Variables tab
6. Add these variables:

```
STRIPE_SECRET_KEY = sk_test_your_key_here
TIVITY_PRICE_ID = price_your_tivity_id
TENET_PRICE_ID = price_your_tenet_id  
SAFEAI_PRICE_ID = price_your_safeai_id
```

7. Your backend is now live! Copy the URL (looks like `https://your-app.up.railway.app`)

### Step 4: Set Up Webhooks (5 min)

1. In Stripe Dashboard → [Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "+ Add endpoint"
3. Endpoint URL: `https://your-railway-url.up.railway.app/webhook`
4. Description: "TrueMadeAI webhook"
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click "Add endpoint"
7. Copy the **Signing Secret** (starts with `whsec_`)
8. Back in Railway → Add one more variable:
   ```
   STRIPE_WEBHOOK_SECRET = whsec_your_secret_here
   ```

### Step 5: Test It! (5 min)

Open your terminal:

```bash
# Test creating a checkout session
curl -X POST https://your-railway-url.up.railway.app/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"product":"tivity","email":"test@example.com"}'
```

You should get back a URL. Open it and you'll see Stripe checkout!

Use test card: `4242 4242 4242 4242`, any future date, any CVC.

Then test verification:

```bash
curl -X POST https://your-railway-url.up.railway.app/verify-premium \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Should return `"isPremium": true` 🎉

## 🔌 Connect to Your Chrome Extension (30 min)

Now integrate with your extension using `chrome-extension-example.js`:

### Update Your Extension

1. In your extension's background script or wherever you handle premium logic:

```javascript
const BACKEND_URL = 'https://your-railway-url.up.railway.app';

// Check if user is premium
async function checkPremium() {
  const { userEmail } = await chrome.storage.sync.get('userEmail');
  
  if (!userEmail) return false;
  
  const res = await fetch(`${BACKEND_URL}/verify-premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail })
  });
  
  const data = await res.json();
  await chrome.storage.sync.set({ isPremium: data.isPremium });
  return data.isPremium;
}

// Upgrade to premium
async function upgradeToPremium() {
  const email = prompt('Enter your email:');
  
  const res = await fetch(`${BACKEND_URL}/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: 'tivity',
      email: email,
      deviceId: chrome.runtime.id
    })
  });
  
  const { url } = await res.json();
  chrome.tabs.create({ url });
  
  // Save email for later verification
  await chrome.storage.sync.set({ userEmail: email });
}
```

2. Add a button in your popup.html:

```html
<button id="upgradeBtn">Upgrade to Premium</button>

<script>
document.getElementById('upgradeBtn').onclick = upgradeToPremium;
</script>
```

3. Create `success.html` (shown after payment):

```html
<!DOCTYPE html>
<html>
<head>
  <title>Payment Successful!</title>
  <style>
    body { text-align: center; padding: 50px; font-family: Arial; }
    .success { color: green; font-size: 24px; }
  </style>
</head>
<body>
  <div class="success">✓ Payment Successful!</div>
  <p>Premium features unlocked. This tab will close automatically...</p>
  <script>
    // Verify premium status
    async function verify() {
      const { userEmail } = await chrome.storage.sync.get('userEmail');
      const res = await fetch('https://your-railway-url.up.railway.app/verify-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await res.json();
      await chrome.storage.sync.set({ isPremium: data.isPremium });
      
      setTimeout(() => window.close(), 3000);
    }
    verify();
  </script>
</body>
</html>
```

4. Update your `manifest.json`:

```json
{
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://your-railway-url.up.railway.app/*"
  ]
}
```

## 🎯 What You Have Now

- ✅ Backend deployed and running
- ✅ Stripe checkout working
- ✅ Webhooks receiving payment confirmations
- ✅ Premium verification API
- ✅ Chrome extension integration
- ✅ Works across devices (Chrome Sync API)

## 💰 Costs

- **Stripe**: Free (2.9% + 30¢ per transaction)
- **Railway**: $5/month (free tier available but limited)
- **Total**: ~$5/month + Stripe fees

## 🔄 Going to Production

When you're ready to go live:

1. Switch Stripe from test mode to live mode
2. Create products again in live mode
3. Update Railway variables with live keys
4. Update Chrome extension with new price IDs
5. Submit extension to Chrome Web Store

## 🐛 Troubleshooting

**"Webhook signature verification failed"**
- Make sure you added the webhook secret to Railway
- Check that the webhook endpoint URL is correct

**"No customer found"**  
- User needs to complete checkout first
- Check email matches exactly

**Extension can't connect to backend**
- Add your backend URL to `host_permissions` in manifest.json
- Check CORS is enabled (it is by default in the server code)

## 📚 Next Steps

1. **Add a database** when you have lots of users (for faster lookups)
2. **Add analytics** to track conversions
3. **Add email notifications** when subscriptions change
4. **Implement family sharing** for SafeAI

Need help? The full code is commented with examples!
