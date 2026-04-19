export function validateEnv() {
  const required = ["DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"];
  const optional = [
    "SHARE_ACCESS_SALT",
    "SENDGRID_API_KEY",
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_MESSAGING_SERVICE_SID",
    "GEMINI_API_KEY",
    "VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID",
    "STRIPE_WEBHOOK_SECRET"
  ];

  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  console.log("✅ Required env vars OK");

  const missingOptional = optional.filter(k => !process.env[k]);
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Missing optional env vars (some features disabled): ${missingOptional.join(", ")}`);
  }
}
