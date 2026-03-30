# Deploying listssync.ai to Railway

## Prerequisites
- Railway account (railway.app)
- GitHub repo connected to Railway
- All env vars ready (see below)

## Steps

### 1. Create Railway Project
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select `morphius101/listssync.ai`
3. Railway will auto-detect the `railway.toml` config

### 2. Add Environment Variables
In Railway → your project → Variables, add ALL of these:

```
# Database
DATABASE_URL=postgresql://neondb_owner:...@ep-purple-shape-a51bbkji.us-east-2.aws.neon.tech/neondb?sslmode=require

# Stripe (use sk_test_... for staging, sk_live_... for production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PROFESSIONAL=price_1RXYovQjqQKNfQAYi63CE8Nn
STRIPE_PRICE_ENTERPRISE=price_1RXYqrQjqQKNfQAYIZQLyxaA

# Firebase (client-side — VITE_ prefix required)
VITE_FIREBASE_API_KEY=AIzaSyBgaKEv-...
VITE_FIREBASE_PROJECT_ID=clearcheck-d2402
VITE_FIREBASE_APP_ID=1:617548467244:web:566e263da878a380949589
VITE_FIREBASE_AUTH_DOMAIN=clearcheck-d2402.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=617548467244
VITE_FIREBASE_STORAGE_BUCKET=clearcheck-d2402.firebasestorage.app

# Firebase Admin (for production auth token verification)
# Generate from Firebase Console → Project Settings → Service Accounts → Generate new private key
# Then base64 encode the JSON: base64 -i serviceAccount.json
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 encoded service account JSON>

# Email
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=greyson@listssync.ai  # Must be verified in SendGrid

# SMS
TWILIO_ACCOUNT_SID=ACe02777...
TWILIO_AUTH_TOKEN=b7b309...
TWILIO_PHONE_NUMBER=+18663503513

# Translation
GEMINI_API_KEY=AIzaSyCZPXpZAFGvZQMhO80nWD-...

# Analytics (optional)
VITE_GA_MEASUREMENT_ID=G-93SBW5KJKH

# App
NODE_ENV=production
SESSION_SECRET=<generate a new secure random string>
PORT=3001
```

### 3. Custom Domain
1. Railway → your project → Settings → Domains → Add custom domain
2. Enter `listssync.ai`
3. Railway will give you a CNAME record
4. In your DNS provider (wherever listssync.ai is registered):
   - Add CNAME record: `@` → Railway's CNAME target
   - Or A record if CNAME on root isn't supported
5. Railway auto-provisions SSL

### 4. Firebase Authorized Domains
In Firebase Console → Authentication → Settings → Authorized domains:
- Add `listssync.ai`
- Add `www.listssync.ai`

### 5. Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://listssync.ai/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`

### 6. Firebase Admin Setup (production auth)
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → download JSON
3. Run: `base64 -i serviceAccount.json | pbcopy`
4. Paste as `FIREBASE_SERVICE_ACCOUNT_BASE64` in Railway env vars

Then update `server/middleware/auth.ts` to decode and use it:
```typescript
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
);
initializeApp({ credential: cert(serviceAccount) });
```

### 7. Run Database Migrations
After first deploy, run in Railway shell:
```bash
npm run db:push
```

## Deployment Checklist
- [ ] All env vars set in Railway
- [ ] `listssync.ai` added to Firebase authorized domains
- [ ] Stripe webhook configured for production URL
- [ ] Firebase Admin service account configured
- [ ] DNS pointing to Railway
- [ ] SSL certificate issued (automatic, may take a few minutes)
- [ ] `greyson@listssync.ai` inbox active for email sending
- [ ] Test end-to-end flow on production URL before announcing
