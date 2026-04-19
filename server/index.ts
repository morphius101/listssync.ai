import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnv } from "./validateEnv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      );
      initializeApp({ credential: cert(serviceAccount) });
      console.log('✅ Firebase Admin initialized with service account');
    } catch (e) {
      console.warn('⚠️  Firebase Admin: failed to parse service account, falling back to default');
      initializeApp();
    }
  } else {
    console.log('ℹ️  Firebase Admin: no service account configured (dev mode — JWT decode fallback active)');
    initializeApp();
  }
}

validateEnv();

// Debug log environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('TWILIO_PHONE_NUMBER exists:', !!process.env.TWILIO_PHONE_NUMBER);
console.log('Twilio SID first chars:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 5));
console.log('Twilio Auth first chars:', process.env.TWILIO_AUTH_TOKEN?.substring(0, 5));
console.log('Twilio Phone:', process.env.TWILIO_PHONE_NUMBER);
console.log('================================');

const app = express();

// Trust Railway/proxy forwarding headers so secure redirects, IP logging, and rate limiting
// work correctly behind the platform edge/load balancer.
app.set('trust proxy', 1);

// Save raw body buffer before JSON parsing — required for Stripe webhook signature verification
app.use(cookieParser());
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Middleware to redirect from root domain to www
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host === 'listssync.ai') {
    return res.redirect(301, `https://www.listssync.ai${req.url}`);
  }
  next();
});

// Add health check endpoint on a separate route
app.get('/api/health', (_req, res) => {
  res.status(200).send('OK');
});

// Legal pages are served as static files from dist/public/
// (copied there by the build script — see package.json "build" command)
app.get('/terms', (_req, res) => {
  res.redirect(301, '/terms.html');
});

app.get('/privacy-policy', (_req, res) => {
  res.redirect(301, '/privacy-policy.html');
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Any API route that wasn't matched above must return a real 404 and never fall through
  // to the SPA/static index handler.
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Port: use env var or default (5000 is blocked by AirPlay on macOS, use 3000 locally)
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "3001");
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
