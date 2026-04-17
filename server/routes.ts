import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import rateLimit from "express-rate-limit";

const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: { error: "Too many verification attempts. Please wait 15 minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});
import { WebSocketServer } from "ws";
import { z } from "zod";
import compression from "compression";
import { 
  translateChecklist, 
  translateText, 
  AVAILABLE_LANGUAGES,
  type LanguageCode 
} from "./services/geminiTranslationService";
import {
  createVerification,
  verifyCode,
  isVerified,
  getVerification,
  formatPhoneForDisplay,
  formatEmailForDisplay,
  sendVerificationSMS,
  sendVerificationEmail
} from "./services/verificationService";
import { ChecklistDTO, TIER_LIMITS, SubscriptionTier } from "../shared/schema";
import Stripe from "stripe";

// Initialize Stripe
let stripe: Stripe | null = null;

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (stripeKey) {
  const isTestMode = stripeKey.startsWith('sk_test_');
  const isLiveMode = stripeKey.startsWith('sk_live_');

  console.log(`🔑 Stripe initialization: ${isLiveMode ? 'LIVE MODE' : isTestMode ? 'TEST MODE' : 'UNKNOWN MODE'}`);

  if (process.env.NODE_ENV === 'production' && isTestMode) {
    console.warn('⚠️  WARNING: Using Stripe test keys in production environment!');
  }

  stripe = new Stripe(stripeKey);
} else {
  console.log('❌ No Stripe secret key found in environment');
}

// Site configuration for URLs - prefer an explicit canonical app URL in production.
const APP_URL = process.env.APP_URL?.replace(/\/$/, '');
const SITE_CONFIG = {
  protocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  host: process.env.NODE_ENV === 'production' ? 'www.listssync.ai' : undefined // undefined will use req.get('host')
};

function getSiteBaseUrl(req: Request): string {
  if (APP_URL) return APP_URL;
  const protocol = SITE_CONFIG.protocol || req.protocol;
  const host = SITE_CONFIG.host || req.get('host');
  return `${protocol}://${host}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API base path
  const API_BASE = "/api";

  // Health check — used by Railway, load balancers, uptime monitors
  app.get(`${API_BASE}/health`, (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Setup API response compression for performance
  app.use(compression());

  // ===============================
  // USER SUBSCRIPTION ROUTES
  // ===============================

  // Get user subscription status
  app.get(`${API_BASE}/user/:userId/subscription`, requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = (req as any).user?.uid;

      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const limits = TIER_LIMITS[user.subscriptionTier as SubscriptionTier];
      
      res.json({
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        endsAt: user.subscriptionEndsAt,
        usage: {
          listSyncCount: user.listSyncCount,
          languageUseCount: user.languageUseCount,
          lastSyncAt: user.lastSyncAt
        },
        limits,
        allowedLanguages: user.allowedLanguages
      });
    } catch (error) {
      console.error('Error getting user subscription:', error);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  });

  // Create or update user with automatic free tier enrollment
  app.post(`${API_BASE}/user/register`, requireAuth, async (req, res) => {
    try {
      const {
        userId, email, firstName, lastName, profileImageUrl,
        useCase, teamSize, phone, signupMethod, signupSource,
        trialStartedAt, marketingOptIn, displayName
      } = req.body;
      const authenticatedUserId = (req as any).user?.uid;

      if (!userId || !email) {
        return res.status(400).json({ error: 'Missing required fields: userId and email' });
      }

      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Split displayName into first/last if firstName not provided
      let first = firstName;
      let last = lastName;
      if (!first && displayName) {
        const parts = displayName.trim().split(' ');
        first = parts[0];
        last = parts.slice(1).join(' ') || undefined;
      }

      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName: first,
        lastName: last,
        profileImageUrl,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        allowedLanguages: TIER_LIMITS.free.allowedLanguages,
        useCase: useCase || null,
        teamSize: teamSize || null,
        phone: phone || null,
        signupMethod: signupMethod || 'google',
        signupSource: signupSource || 'google_oauth',
        trialStartedAt: trialStartedAt ? new Date(trialStartedAt) : new Date(),
        marketingOptIn: marketingOptIn ?? false,
      });

      // Mark any lead as converted
      if (email) {
        await storage.convertLead(email).catch(() => {});
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          allowedLanguages: user.allowedLanguages
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  // Lead capture — email collected before form completion
  app.post(`${API_BASE}/leads`, async (req, res) => {
    try {
      const { email, source } = req.body;
      if (!email) return res.status(400).json({ error: 'email required' });
      await storage.upsertLead(email, source || 'landing_page');
      res.json({ success: true });
    } catch (error) {
      console.error('Error capturing lead:', error);
      res.status(500).json({ error: 'Failed to capture lead' });
    }
  });

  // Create Stripe checkout session for subscriptions
  app.post(`${API_BASE}/create-subscription`, requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: 'Payment processing not available. Please configure Stripe API keys.' });
      }

      const { userId, tier, email } = req.body;
      const authenticatedUserId = (req as any).user?.uid;
      
      if (!userId || !tier || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!['professional', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      // Create or get Stripe customer
      let customer;
      const user = await storage.getUser(userId);
      
      if (user?.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email,
          metadata: { userId }
        });
        
        await storage.updateUserSubscription(userId, user?.subscriptionTier as SubscriptionTier || 'free', {
          customerId: customer.id
        });
      }

      // Define price IDs for each tier (configured in Stripe dashboard)
      const priceIds = {
        professional: process.env.STRIPE_PRICE_PROFESSIONAL || "price_1RikHtARacWLsYzMi1CWbouU",
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "price_1RikInARacWLsYzMLMt2mL4x"
      };
      
      console.log(`🔑 Using price IDs: Professional=${priceIds.professional}, Enterprise=${priceIds.enterprise}`);
      console.log(`🔑 Stripe key type: ${stripeKey?.substring(0, 8) ?? 'unknown'}...`);

      const siteBaseUrl = getSiteBaseUrl(req);

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceIds[tier as keyof typeof priceIds],
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${getSiteBaseUrl(req)}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getSiteBaseUrl(req)}/subscription/cancel`,
        metadata: {
          userId,
          tier
        }
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  });

  // Stripe webhook for subscription events
  app.post(`${API_BASE}/stripe/webhook`, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe not configured' });
      }

      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET is not set — rejecting webhook');
        return res.status(400).json({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        const rawBody = (req as any).rawBody;
        if (!rawBody) {
          return res.status(400).json({ error: 'Missing raw body' });
        }
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err: any) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle subscription events
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const { userId, tier } = session.metadata || {};
          
          if (userId && tier) {
            await storage.updateUserSubscription(userId, tier as SubscriptionTier, {
              customerId: session.customer as string,
              subscriptionId: session.subscription as string,
              status: 'active'
            });
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if (customer && !customer.deleted && customer.metadata?.userId) {
            const status = subscription.status === 'active' ? 'active' : 'inactive';
            const tier = status === 'active' ? 'professional' : 'free';
            
            await storage.updateUserSubscription(customer.metadata.userId, tier, {
              subscriptionId: subscription.id,
              status
            });
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook failed' });
    }
  });

  // Task schema for validation
  const taskSchema = z.object({
    id: z.string(),
    description: z.string(),
    details: z.string().optional(),
    completed: z.boolean(),
    photoRequired: z.boolean(),
    photoUrl: z.string().nullable(),
  });

  // Checklist schema for validation
  const checklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    tasks: z.array(taskSchema),
    status: z.enum(['not-started', 'in-progress', 'completed']),
    progress: z.number().min(0).max(100),
    remarks: z.string().optional(),
    userId: z.string().optional(),
  });

  // Get all checklists — requires auth, scoped to the authenticated user
  app.get(`${API_BASE}/checklists`, requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const checklists = await storage.getAllChecklists(userId);
      res.json(checklists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Batch API endpoint for optimizing multiple requests
  app.post(`${API_BASE}/batch`, requireAuth, async (req, res) => {
    try {
      // Validate batch request structure
      if (!req.body.batch || !Array.isArray(req.body.batch)) {
        return res.status(400).json({ message: "Invalid batch request format" });
      }
      
      const batchRequests = req.body.batch;
      const results = [];
      
      // Process each request in the batch
      for (const request of batchRequests) {
        try {
          // Validate each request has the required fields
          if (!request.operation || !request.path) {
            results.push({ error: "Invalid request format" });
            continue;
          }
          
          // Handle different operation types
          switch (request.operation) {
            case 'get-checklist':
              if (!request.id) {
                results.push({ error: "Missing checklist ID" });
                break;
              }
              
              const checklist = await storage.getChecklistById(request.id);
              results.push(checklist || { error: "Checklist not found" });
              break;
              
            case 'update-task':
              if (!request.checklistId || !request.taskId || !request.updates) {
                results.push({ error: "Missing required parameters" });
                break;
              }
              
              const updatedTask = await storage.updateTask(
                request.checklistId,
                request.taskId,
                request.updates
              );
              
              results.push(updatedTask || { error: "Failed to update task" });
              break;
              
            case 'get-checklists':
              const userId = (req as any).user?.uid;
              const checklists = await storage.getAllChecklists(userId);
              results.push(checklists);
              break;
              
            default:
              results.push({ error: "Unsupported operation" });
          }
        } catch (error: any) {
          results.push({ error: error.message });
        }
      }
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get checklist by ID - GUARANTEED to return a valid response
  app.get(`${API_BASE}/checklists/:id`, requireAuth, async (req, res) => {
    try {
      console.log(`🔍 Getting checklist by ID: ${req.params.id}`);
      
      // Define a function to create a default checklist
      const createDefaultChecklist = (id: string) => {
        return {
          id: id,
          name: 'Welcome to ListsSync.ai',
          tasks: [
            {
              id: '1',
              description: 'Welcome to ListsSync.ai',
              details: 'This is a sample task to get you started',
              completed: false,
              photoRequired: false,
              photoUrl: null
            },
            {
              id: '2',
              description: 'Create your first checklist',
              details: 'Go to the dashboard and click "New Checklist"',
              completed: false,
              photoRequired: false,
              photoUrl: null
            }
          ],
          status: 'not-started' as 'not-started',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          remarks: 'Welcome to ListsSync.ai! This is a default checklist created for you.'
        };
      };
      
      const authenticatedUserId = (req as any).user?.uid;

      // First try to get the requested checklist
      let checklist;
      try {
        checklist = await storage.getChecklistById(req.params.id);
        if (checklist) {
          if (!authenticatedUserId || checklist.userId !== authenticatedUserId) {
            return res.status(403).json({ error: 'Forbidden' });
          }

          console.log(`✅ Found checklist: ${checklist.name}`);
          return res.json(checklist);
        }
      } catch (specificError) {
        console.error(`❌ Error fetching specific checklist ${req.params.id}:`, specificError);
      }
      
      console.log(`❓ Checklist not found with ID: ${req.params.id}`);
      
      // PRODUCTION FIX: Don't create fallback checklists for sharing
      // Return 404 error instead of creating generic content
      return res.status(404).json({
        error: 'Checklist not found',
        message: `Checklist with ID ${req.params.id} does not exist. Please ensure you have the correct link.`,
        checklistId: req.params.id
      });
    } catch (error: any) {
      console.error('💥 Unexpected error in checklist endpoint:', error);
      return res.status(500).json({ error: 'Failed to fetch checklist' });
    }
  });

  // Create new checklist with tier limits enforcement
  app.post(`${API_BASE}/checklists`, requireAuth, async (req, res) => {
    try {
      const validatedData = checklistSchema.parse(req.body);
      const authenticatedUserId = (req as any).user?.uid;

      if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limits = await storage.checkUserLimits(authenticatedUserId, 'create_list');
      if (!limits.allowed) {
        return res.status(403).json({ 
          error: 'Subscription limit reached',
          message: `You've reached the limit of ${limits.limit} lists for your ${limits.tier} plan. Please upgrade to create more lists.`,
          tier: limits.tier,
          limit: limits.limit,
          current: limits.current,
          upgradeRequired: true
        });
      }
      
      // Add createdAt and updatedAt timestamps since they're required by ChecklistDTO
      const checklistData = {
        ...validatedData,
        userId: authenticatedUserId,
        remarks: validatedData.remarks || "",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newChecklist = await storage.createChecklist(checklistData);
      await storage.incrementUserUsage(authenticatedUserId, 'sync');
      
      res.status(201).json(newChecklist);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update checklist
  app.put(`${API_BASE}/checklists/:id`, requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).user?.uid;

      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }

      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const validatedData = checklistSchema.parse(req.body);
      
      if (req.params.id !== validatedData.id) {
        return res.status(400).json({ message: "ID in URL does not match ID in request body" });
      }
      
      // Add timestamps and preserve userId
      const checklistData = {
        ...validatedData,
        remarks: validatedData.remarks || "",
        updatedAt: new Date(),
        createdAt: existingChecklist.createdAt,
        userId: existingChecklist.userId
      };
      
      const updatedChecklist = await storage.updateChecklist(checklistData);
      
      if (!updatedChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      res.json(updatedChecklist);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Delete checklist
  app.delete(`${API_BASE}/checklists/:id`, requireAuth, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).user?.uid;

      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }

      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const success = await storage.deleteChecklist(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update task status
  app.patch(`${API_BASE}/checklists/:checklistId/tasks/:taskId`, requireAuth, async (req, res) => {
    try {
      const { checklistId, taskId } = req.params;
      const authenticatedUserId = (req as any).user?.uid;
      
      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(checklistId);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }

      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const updates = req.body;
      
      const updatedTask = await storage.updateTask(checklistId, taskId, updates);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Checklist or task not found" });
      }
      
      res.json(updatedTask);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Translation routes
  app.get(`${API_BASE}/languages`, (req, res) => {
    res.json(AVAILABLE_LANGUAGES);
  });

  app.post(`${API_BASE}/translate/text`, async (req, res) => {
    try {
      const { text, targetLanguage, sourceLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ 
          message: "Missing required fields: text, targetLanguage" 
        });
      }
      
      const translatedText = await translateText(
        text, 
        targetLanguage as LanguageCode,
        sourceLanguage as LanguageCode | undefined
      );
      
      res.json({ original: text, translated: translatedText });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`${API_BASE}/translate/checklist/:id`, requireAuth, async (req, res) => {
    try {
      const { targetLanguage, sourceLanguage, userId } = req.body;
      const authenticatedUserId = (req as any).user?.uid;
      console.log('Translation request received:', { id: req.params.id, targetLanguage, sourceLanguage, userId });

      if (!authenticatedUserId || (userId && userId !== authenticatedUserId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (!targetLanguage) {
        return res.status(400).json({ 
          message: "Missing required field: targetLanguage" 
        });
      }

      // Check user language limits if userId is provided
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          const allowedLanguages = user.allowedLanguages as string[] || ['en', 'es'];
          
          if (!allowedLanguages.includes(targetLanguage)) {
            return res.status(403).json({
              error: 'Language not allowed',
              message: `Translation to ${targetLanguage} is not available in your ${user.subscriptionTier} plan. Please upgrade to access more languages.`,
              tier: user.subscriptionTier,
              allowedLanguages,
              upgradeRequired: true
            });
          }
        }
      }
      
      const checklist = await storage.getChecklistById(req.params.id);
      console.log('Found checklist for translation:', checklist ? 'Yes' : 'No');
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }

      if (checklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      console.log('Starting translation process...');
      const translatedChecklist = await translateChecklist(
        checklist,
        targetLanguage as LanguageCode,
        sourceLanguage as LanguageCode | undefined
      );

      // Increment language usage count
      await storage.incrementUserUsage(authenticatedUserId, 'language');
      
      console.log('Translation completed successfully');
      res.json(translatedChecklist);
    } catch (error: any) {
      console.error('Translation endpoint error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verification system routes
  app.post(`${API_BASE}/verification/send`, verificationRateLimit, async (req, res) => {
    console.log('================================================');
    console.log('📨 VERIFICATION REQUEST RECEIVED');
    console.log('================================================');
    
    try {
      let { recipientId, email, phone, checklistId, recipientName, targetLanguage } = req.body;

      const isProduction = process.env.NODE_ENV === 'production';
      const maskedEmail = email ? formatEmailForDisplay(email) : undefined;
      const maskedPhone = phone ? formatPhoneForDisplay(phone) : undefined;

      if (isProduction) {
        console.log('📨 verification/send request:', {
          checklistId,
          recipientId,
          recipientName: recipientName || null,
          targetLanguage: targetLanguage || 'en',
          hasEmail: !!email,
          hasPhone: !!phone,
          maskedEmail,
          maskedPhone,
        });
      } else {
        console.log('📝 verification/send raw request body:', req.body);
        console.log('📝 verification/send request headers:', req.headers);
        console.log('📝 Environment:', process.env.NODE_ENV || 'not set');
        console.log('📋 verification/send parsed fields:', { 
          recipientId, 
          email, 
          phone, 
          checklistId, 
          recipientName,
          targetLanguage 
        });
        console.log('🔑 SENDGRID_API_KEY available:', !!process.env.SENDGRID_API_KEY);
        console.log('🔑 TWILIO_ACCOUNT_SID available:', !!process.env.TWILIO_ACCOUNT_SID);
      }
      
      // Input validation with more detailed logging
      if (!email && !phone) {
        console.error("❌ Verification request missing both email and phone");
        return res.status(400).json({ 
          message: "Missing required fields: either email or phone must be provided" 
        });
      }
      
      if (!checklistId) {
        console.error("❌ Verification request missing checklistId");
        return res.status(400).json({ 
          message: "Missing required field: checklistId" 
        });
      }
      
      // For phone numbers, ensure they're in the proper format
      if (phone) {
        // Sanitize phone number - keep only digits
        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone !== phone) {
          console.log(`📱 Cleaned phone number from ${phone} to ${cleanedPhone}`);
          phone = cleanedPhone;
        }
        
        // Format to E.164 if needed
        if (!phone.startsWith('+')) {
          // For US numbers (10 digits)
          if (phone.length === 10) {
            phone = `+1${phone}`;
            console.log(`📱 Formatted US phone number to E.164: ${phone}`);
          } else {
            // For other numbers, just add +
            phone = `+${phone}`;
            console.log(`📱 Added + prefix to phone: ${phone}`);
          }
        }
      }
      
      // Generate a recipientId if not provided
      if (!recipientId) {
        recipientId = `recipient_${Date.now()}`;
        console.log(`📌 Generated recipientId: ${recipientId}`);
      }
      
      // Clean phone number if provided (remove any non-numeric characters)
      if (phone) {
        // Keep only digits
        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone !== phone) {
          console.log(`Cleaned phone number from ${phone} to ${cleanedPhone}`);
          phone = cleanedPhone;
        }
      }
      
      console.log(`Creating verification for recipient: ${recipientId}, contact: ${email || phone}`);
      
      const { token, code } = await createVerification(
        recipientId,
        email,
        phone,
        checklistId,
        targetLanguage
      );

      console.log(`✅ Verification created with token: ${token}, code: ${code}`);
      
      const requiresCode = Boolean(phone && !email);
      
      // Send verification code
      let sendSuccess = false;
      
      if (email) {
        console.log('================================================');
        console.log(`📧 Attempting to send verification email to: ${email}`);
        console.log(`📧 Code: ${code}`);
        console.log(`📧 SENDGRID_API_KEY status: ${!!process.env.SENDGRID_API_KEY ? 'Present' : 'Missing'}`);
        console.log(`📧 SENDER_EMAIL: greyson@listssync.ai`);
        console.log('================================================');
        
        try {
          // Add extra timeout to ensure SendGrid has enough time to process
          const emailSuccess = await Promise.race([
            sendVerificationEmail(email, code, token),
            new Promise<boolean>((resolve) => setTimeout(() => {
              console.log('📧 Email send operation timed out after 10 seconds');
              resolve(false);
            }, 10000))
          ]);
          
          if (emailSuccess) {
            console.log(`✅ Successfully sent verification email to: ${email}`);
            sendSuccess = true;
            await storage.markVerificationAsVerified(token);
          } else {
            console.error(`❌ Failed to send verification email to ${email}`);
            console.error(`📧 Verification email failure details:`);
            console.error(`- Email: ${email.substring(0, 3)}...${email.substring(email.indexOf('@'))}`);
            console.error(`- Environment: ${process.env.NODE_ENV}`);

            if (process.env.NODE_ENV === 'development') {
              console.log(`ℹ️ Continuing verification flow despite email failure (development only)`);
              sendSuccess = true;
            } else {
              return res.status(500).json({ message: "Failed to send verification email. Please try again or use phone verification." });
            }
          }
        } catch (emailError: any) {
          console.error(`❌ Exception during verification email sending:`, emailError.message);
          console.error(`❌ Stack trace: ${emailError.stack}`);
          
          return res.status(500).json({ 
            message: `Email verification error: ${emailError.message}` 
          });
        }
      }
      
      if (phone) {
        console.log(`Attempting to send verification SMS to: ${phone}`);
        
        // Debug output for Twilio environment vars at route level
        console.log('TWILIO CONFIG CHECK (ROUTES LEVEL):');
        console.log('TWILIO_ACCOUNT_SID status:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
        console.log('TWILIO_AUTH_TOKEN status:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
        console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'Missing');
        console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
        
        try {
          // Attempt to send SMS via Twilio
          const smsSuccess = await sendVerificationSMS(phone, code, token);
          
          if (smsSuccess) {
            console.log(`Successfully sent verification SMS to: ${phone}`);
            sendSuccess = true;
          } else {
            console.error(`Failed to send verification SMS to ${phone}`);
            
            // Special handling for when credentials are missing
            if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
              console.log('⚠️ Twilio credentials missing or not properly configured');
              
              if (process.env.NODE_ENV === 'production') {
                // In production, provide professional error response
                return res.status(500).json({ 
                  message: "SMS verification is currently unavailable. Please try email verification instead.",
                  type: "error" 
                });
              } else {
                // Only log verification code in development mode
                console.log(`📱 Verification code for ${phone}: ${code}`);
                sendSuccess = true; // Allow flow to continue in development
              }
            }
          }
        } catch (smsError) {
          console.error('SMS SENDING ERROR (CAUGHT AT ROUTES LEVEL):', smsError);
          
          // Different behavior based on environment
          if (process.env.NODE_ENV === 'development') {
            // In development, log more details and allow flow to continue
            console.log('⚠️ SMS sending failed, but allowing verification flow to continue');
            console.log(`📱 Verification code in development: ${code}`);
            sendSuccess = true; // Allow flow to continue without actual SMS
          } else {
            // In production, handle more professionally
            console.error('⚠️ SMS verification failed in production environment');
            // Return a professional error message immediately
            return res.status(500).json({ 
              message: "SMS verification is currently unavailable. Please try email verification instead.",
              type: "error" 
            });
          }
        }
      }
      
      if (!sendSuccess) {
        return res.status(500).json({ 
          message: "Failed to send verification code. Please try again." 
        });
      }
      
      // Create share URL with token, using custom domain in production
      // Ensure we have valid values for protocol and host regardless of environment
      let protocol = 'https';
      let host = 'www.listssync.ai';
      
      // In development, use server values
      if (process.env.NODE_ENV === 'development') {
        protocol = req.protocol || 'http';
        host = req.get('host') || 'localhost:5000';
      }
      
      console.log(`DEBUG URL GENERATION:
- Protocol: ${protocol}
- Host: ${host}
- Token: ${token}
- Environment: ${process.env.NODE_ENV || 'unknown'}`);
      
      // Final token validation before building URL
      if (!token) {
        console.error('❌ Failed to generate verification token');
        return res.status(500).json({ message: "Failed to generate share link. Please try again." });
      }
      
      // Create the final share URL with language parameter if specified
      let shareUrl = `${protocol}://${host}/shared/${token}`;
      if (targetLanguage && targetLanguage !== 'en') {
        shareUrl += `?lang=${targetLanguage}`;
      }
      console.log(`✅ Generated share URL: ${shareUrl}`);
      
      // Return masked contact info, token, and share URL
      const response: any = { 
        token,
        shareUrl,
        requiresCode,
        message: requiresCode ? "Verification code sent to recipient" : "Checklist link sent to recipient"
      };
      
      if (email) {
        response.maskedEmail = formatEmailForDisplay(email);
      }
      
      if (phone) {
        response.maskedPhone = formatPhoneForDisplay(phone);
      }
      
      // Show verification code in response in the following cases:
      // 1. In development mode (for easier testing)
      // 2. When Twilio credentials are missing in production (for testing without SMS)
      const isMissingTwilioCredentials = !process.env.TWILIO_ACCOUNT_SID || 
                                         !process.env.TWILIO_AUTH_TOKEN || 
                                         !process.env.TWILIO_PHONE_NUMBER;
      
      // Only include verification code in development environment
      if (process.env.NODE_ENV === 'development') {
        response.verificationCode = code;
        response.debug = {
          environment: 'development',
          twilioStatus: isMissingTwilioCredentials ? 'missing credentials' : 'configured'
        };
      }
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`${API_BASE}/verification/verify`, async (req, res) => {
    try {
      const { token, code } = req.body;

      if (!token || !code) {
        return res.status(400).json({
          verified: false,
          message: "Missing required fields: token, code"
        });
      }

      const verification = await storage.getVerificationByToken(token);
      if (!verification) {
        return res.status(404).json({ verified: false, message: "Invalid or expired verification token" });
      }

      if (!verification.checklistId) {
        return res.status(400).json({ verified: false, message: "Verification is not linked to a checklist" });
      }

      if (verification.expiresAt < new Date()) {
        return res.status(410).json({ verified: false, message: "Verification token has expired" });
      }

      const verified = await verifyCode(token, code);
      if (!verified) {
        return res.status(400).json({ verified: false, message: "Invalid verification code" });
      }

      const checklist = await storage.getChecklistById(verification.checklistId);
      if (!checklist) {
        return res.status(404).json({ verified: false, message: "Shared checklist is no longer available" });
      }

      return res.json({
        verified: true,
        recipientId: verification.recipientId,
        checklistId: verification.checklistId,
        targetLanguage: verification.targetLanguage || 'en',
        message: "Verification successful"
      });
    } catch (error: any) {
      console.error("Unexpected error in verification endpoint:", error);
      return res.status(500).json({ verified: false, message: "Internal server error" });
    }
  });

  // Test email endpoint for debugging SendGrid issues - DEVELOPMENT ONLY
  if (process.env.NODE_ENV === 'development') {
    // Test endpoint for Twilio SMS
  app.post(`${API_BASE}/debug/test-sms`, async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
      }
      
      console.log('🧪 Testing SMS to phone:', phone);
      
      // Show Twilio configuration
      console.log('TWILIO CONFIG CHECK:');
      console.log('TWILIO_ACCOUNT_SID status:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
      console.log('TWILIO_AUTH_TOKEN status:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
      console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
      
      // Create a test message
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const testMessage = `This is a test message from ListsSync.ai. Your verification code is: ${testCode}`;
      
      try {
        // Initialize Twilio client
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        
        if (!accountSid || !authToken || !twilioPhone) {
          return res.status(500).json({ 
            success: false, 
            message: "Twilio credentials are missing",
            missingCredentials: {
              accountSid: !accountSid,
              authToken: !authToken,
              twilioPhone: !twilioPhone
            }
          });
        }
        
        // Format phone to E.164 if needed
        let formattedPhone = phone;
        if (!phone.startsWith('+')) {
          if (phone.length === 10) {
            formattedPhone = `+1${phone}`; // US number
          } else {
            formattedPhone = `+${phone}`;
          }
        }
        
        console.log(`📱 Formatted phone number: ${formattedPhone}`);
        
        // Use the already imported Twilio
        const twilio = await import('twilio').then(module => module.default);
        const client = twilio(accountSid, authToken);
        
        // Send the test message (use Messaging Service if available)
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        const msgParams: any = { body: testMessage, to: formattedPhone };
        if (messagingServiceSid) {
          msgParams.messagingServiceSid = messagingServiceSid;
        } else {
          msgParams.from = twilioPhone;
        }
        const message = await client.messages.create(msgParams);
        
        console.log(`✅ Test SMS sent successfully. SID: ${message.sid}`);
        
        return res.json({ 
          success: true, 
          message: `Test SMS sent to ${formattedPhone}`,
          testCode,
          twilioMessageSid: message.sid,
          status: message.status
        });
      } catch (error: any) {
        console.error('❌ Twilio SMS Error:', error);
        
        // Try to extract more helpful error information
        let errorDetails: any = {
          message: error.message || 'Unknown error'
        };
        
        // Add Twilio-specific error info if available
        if (error.code) {
          errorDetails.code = error.code;
          errorDetails.status = error.status;
          
          if (error.code === 21211) {
            errorDetails.suggestion = "This error typically means the phone number format is invalid. Make sure it includes the country code.";
          } else if (error.code === 21608) {
            errorDetails.suggestion = "This error typically means the phone number is not verified in your Twilio trial account. Go to https://www.twilio.com/console/phone-numbers/verified to verify it.";
          }
        }
        
        return res.status(500).json({ 
          success: false, 
          message: "Failed to send test SMS", 
          error: errorDetails
        });
      }
      
    } catch (error) {
      console.error('❌ Test SMS endpoint error:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Server error when testing SMS" 
      });
    }
  });
  
  app.post(`${API_BASE}/debug/test-email`, async (req, res) => {
      console.log('🧪 TEST EMAIL ENDPOINT called (DEV MODE ONLY)');
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }
        
        console.log(`🧪 Attempting to send a test email to ${email}`);
        
        // Generate a test code
        const testCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Try to send email via our service
        const result = await sendVerificationEmail(email, testCode);
        
        console.log(`🧪 Test email sending result: ${result ? 'SUCCESS' : 'FAILED'}`);
        
        return res.json({
          success: true,
          message: `Test email ${result ? 'sent' : 'attempted'} with code: ${testCode}`,
          code: testCode
        });
      } catch (error: any) {
        console.error('🧪 Test email error:', error);
        return res.status(500).json({
          success: false,
          message: `Error sending test email: ${error.message || 'Unknown error'}`
        });
      }
    });
  } else {
    // In production, return 404 for the debug endpoint
    app.post(`${API_BASE}/debug/test-email`, (req, res) => {
      console.warn('⚠️ Someone tried to access the debug email endpoint in production mode');
      res.status(404).json({ error: 'Not found' });
    });
  }

  // Endpoint to get shared checklist data with translation support (token-based)
  app.get(`${API_BASE}/shared/checklist`, async (req, res) => {
    try {
      const { token } = req.query;
      console.log(`Fetching shared checklist with token: ${token ? 'provided' : 'none'}`);
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Token is required' 
        });
      }
      
      // Get verification record to find the checklist ID and target language
      const verification = await storage.getVerificationByToken(token as string);
      if (!verification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invalid or expired token' 
        });
      }

      if (!verification.verified) {
        return res.status(403).json({ success: false, message: 'Verification required' });
      }

      if (verification.expiresAt < new Date()) {
        return res.status(410).json({ success: false, message: 'Verification token has expired' });
      }
      
      console.log(`Found verification record for token: ${token}, checklist: ${verification.checklistId}, language: ${verification.targetLanguage}`);
      
      // Get the checklist
      if (!verification.checklistId) {
        return res.status(404).json({ success: false, message: 'No checklist linked to this token' });
      }
      let checklist = await storage.getChecklistById(verification.checklistId);
      if (!checklist) {
        return res.status(404).json({ 
          success: false, 
          message: 'Checklist not found' 
        });
      }
      
      let finalChecklist = checklist;
      let effectiveTargetLanguage = verification.targetLanguage || 'en';
      let translationApplied = false;
      
      // Apply translation if needed
      if (effectiveTargetLanguage && effectiveTargetLanguage !== 'en') {
        console.log(`Translating checklist to: ${effectiveTargetLanguage}`);
        try {
          const { translateChecklist } = await import('./services/geminiTranslationService');
          const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ru', 'ja', 'ar', 'hi'];
          if (validLanguages.includes(effectiveTargetLanguage)) {
            finalChecklist = await translateChecklist(checklist, effectiveTargetLanguage as any, 'en');
            translationApplied = finalChecklist !== checklist && (finalChecklist as any)?.translatedTo === effectiveTargetLanguage;
            if (!translationApplied) {
              effectiveTargetLanguage = 'en';
            }
          } else {
            finalChecklist = checklist;
            effectiveTargetLanguage = 'en';
          }
          console.log(`Successfully translated checklist to ${effectiveTargetLanguage}`);
        } catch (translationError) {
          console.error('Translation failed, serving original checklist:', translationError);
          finalChecklist = checklist;
          effectiveTargetLanguage = 'en';
        }
      }
      
      console.log(`Serving checklist in target language: ${effectiveTargetLanguage}`);
      
      res.json({ success: true, checklist: finalChecklist, targetLanguage: effectiveTargetLanguage, translationApplied });
    } catch (error) {
      console.error('Error fetching shared checklist:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch checklist' });
    }
  });

  // Endpoint to get shared checklist data with translation support (ID-based)
  app.get(`${API_BASE}/shared/checklist/:checklistId`, async (req, res) => {
    try {
      const { checklistId } = req.params;
      const { token } = req.query;
      console.log(`Fetching shared checklist: ${checklistId}, token: ${token ? 'provided' : 'none'}`);

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const verification = await storage.getVerificationByToken(token);
      if (!verification) {
        return res.status(404).json({ success: false, message: 'Invalid or expired token' });
      }

      if (!verification.verified) {
        return res.status(403).json({ success: false, message: 'Verification required' });
      }

      if (verification.expiresAt < new Date()) {
        return res.status(410).json({ success: false, message: 'Verification token has expired' });
      }

      if (verification.checklistId !== checklistId) {
        return res.status(403).json({ success: false, message: 'Token does not match requested checklist' });
      }

      const checklist = await storage.getChecklistById(checklistId);
      if (!checklist) {
        console.log(`Checklist ${checklistId} not found in any data source`);
        return res.status(404).json({ 
          success: false, 
          message: 'Checklist not found' 
        });
      }
      
      // Determine target language from verification record if token is provided
      let effectiveTargetLanguage = verification.targetLanguage || 'en';
      
      // Apply translation if target language is not English
      let finalChecklist = checklist;
      let translationApplied = false;
      if (effectiveTargetLanguage && effectiveTargetLanguage !== 'en') {
        console.log(`Translating checklist to: ${effectiveTargetLanguage}`);
        try {
          const { translateChecklist } = await import('./services/geminiTranslationService');
          const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ru', 'ja', 'ar', 'hi'];
          if (validLanguages.includes(effectiveTargetLanguage)) {
            finalChecklist = await translateChecklist(checklist, effectiveTargetLanguage as any, 'en');
            translationApplied = finalChecklist !== checklist && (finalChecklist as any)?.translatedTo === effectiveTargetLanguage;
            if (!translationApplied) {
              effectiveTargetLanguage = 'en';
            }
          } else {
            finalChecklist = checklist;
            effectiveTargetLanguage = 'en';
          }
          console.log(`Successfully translated checklist to ${effectiveTargetLanguage}`);
        } catch (translationError) {
          console.error('Translation failed, serving original checklist:', translationError);
          finalChecklist = checklist;
          effectiveTargetLanguage = 'en';
        }
      }
      
      console.log(`Serving checklist in target language: ${effectiveTargetLanguage}`);
      
      res.json({ success: true, checklist: finalChecklist, targetLanguage: effectiveTargetLanguage, translationApplied });
    } catch (error) {
      console.error('Error fetching shared checklist:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch checklist' });
    }
  });

  app.get(`${API_BASE}/verification/status/:token`, async (req, res) => {
    try {
      const rawToken = req.params.token;
      const token = decodeURIComponent(rawToken).split('?')[0];

      const verification = await getVerification(token);
      if (!verification) {
        return res.status(404).json({ message: "Verification token not found" });
      }

      const expired = verification.expiresAt < new Date();

      return res.json({
        verified: verification.verified,
        expired,
        recipientId: verification.recipientId,
        checklistId: verification.checklistId || null,
        targetLanguage: verification.targetLanguage || 'en',
        maskedEmail: verification.recipientEmail ? formatEmailForDisplay(verification.recipientEmail) : undefined,
        maskedPhone: verification.recipientPhone ? formatPhoneForDisplay(verification.recipientPhone) : undefined
      });
    } catch (error: any) {
      console.error("Error in verification status check:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Share checklist route with mobile-friendly options
  app.post(`${API_BASE}/checklists/:id/share`, requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { recipientEmail, recipientPhone, recipientName, targetLanguage } = req.body;
      const authenticatedUserId = (req as any).user?.uid;
      
      const checklist = await storage.getChecklistById(id);
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }

      if (!authenticatedUserId || checklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (!recipientEmail && !recipientPhone) {
        return res.status(400).json({ 
          message: "Missing recipient contact information: email or phone required" 
        });
      }
      
      // Generate random recipientId if not provided
      const recipientId = Math.random().toString(36).substring(2, 15);
      
      // Create verification for recipient access
      const { token, code } = await createVerification(
        recipientId,
        recipientEmail,
        recipientPhone,
        id,
        targetLanguage
      );
      
      // Create share URL with token, using custom domain in production
      const protocol = SITE_CONFIG.protocol || req.protocol;
      const host = SITE_CONFIG.host || req.get('host');
      const shareUrl = `${protocol}://${host}/shared/${token}`;
      
      // Send verification via email or SMS and fail honestly if delivery fails
      if (recipientEmail) {
        const emailSent = await sendVerificationEmail(recipientEmail, code, token);
        if (!emailSent) {
          return res.status(502).json({ message: 'Failed to send verification email' });
        }
      }
      
      if (recipientPhone) {
        const smsSent = await sendVerificationSMS(recipientPhone, code, token);
        if (!smsSent) {
          return res.status(502).json({ message: 'Failed to send verification SMS' });
        }
      }
      
      res.json({
        shareUrl,
        token,
        recipientId,
        message: "Verification code sent to recipient"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // SMS consent endpoint for Twilio compliance
  app.post(`${API_BASE}/sms-consent`, async (req, res) => {
    try {
      const { phoneNumber, firstName, lastName, consentedAt, ipAddress, userAgent } = req.body;
      
      if (!phoneNumber || !firstName || !lastName) {
        return res.status(400).json({ message: "Phone number, first name, and last name are required" });
      }

      // Clean and validate phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      console.log(`📱 Recording SMS consent for: ${phoneNumber}`);
      
      // Check if consent already exists for this phone number
      const existing = await storage.getSmsConsent(phoneNumber);
      if (existing && existing.isActive) {
        return res.json({
          success: true,
          message: "SMS consent already recorded for this phone number",
          consent: existing
        });
      }

      // Record the consent
      const consentData = {
        phoneNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        consentedAt: consentedAt ? new Date(consentedAt) : new Date(),
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent'),
        isActive: true
      };

      const savedConsent = await storage.recordSmsConsent(consentData);
      
      console.log(`✅ SMS consent recorded for ${phoneNumber}`);
      
      res.json({
        success: true,
        message: "SMS consent recorded successfully",
        consent: savedConsent
      });
    } catch (error: any) {
      console.error('Error recording SMS consent:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to record SMS consent" 
      });
    }
  });

  // Get SMS consent status
  app.get(`${API_BASE}/sms-consent/:phoneNumber`, async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      const consent = await storage.getSmsConsent(phoneNumber);
      
      if (!consent) {
        return res.status(404).json({ 
          success: false,
          message: "No SMS consent found for this phone number" 
        });
      }
      
      res.json({
        success: true,
        consent
      });
    } catch (error: any) {
      console.error('Error retrieving SMS consent:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to retrieve SMS consent" 
      });
    }
  });

  // Revoke SMS consent
  app.delete(`${API_BASE}/sms-consent/:phoneNumber`, async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      const success = await storage.revokeSmsConsent(phoneNumber);
      
      if (!success) {
        return res.status(404).json({ 
          success: false,
          message: "No SMS consent found to revoke" 
        });
      }
      
      console.log(`🚫 SMS consent revoked for ${phoneNumber}`);
      
      res.json({
        success: true,
        message: "SMS consent revoked successfully"
      });
    } catch (error: any) {
      console.error('Error revoking SMS consent:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to revoke SMS consent" 
      });
    }
  });

  // Mailing list subscription endpoint
  app.post(`${API_BASE}/mailing-list/subscribe`, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const cleanEmail = email.trim().toLowerCase();
      console.log(`📧 Mailing list subscription request for: ${cleanEmail}`);
      
      // Check if email already exists
      const existing = await storage.getMailingListSubscription(cleanEmail);
      if (existing) {
        return res.json({ 
          success: true, 
          message: "You're already subscribed to our mailing list" 
        });
      }

      // Generate confirmation token
      const confirmationToken = `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Get user agent and IP for analytics
      const userAgent = req.get('User-Agent') || undefined;
      const ipAddress = req.ip || req.connection.remoteAddress || undefined;

      // Create subscription record
      const subscription = await storage.subscribeToMailingList({
        email: cleanEmail,
        confirmed: false,
        confirmationToken,
        source: 'development_banner',
        leadType: 'marketing_lead',
        userAgent,
        ipAddress,
        subscribedAt: new Date()
      });

      // Send confirmation email
      try {
        const confirmationUrl = `${req.protocol}://${req.get('host')}/api/mailing-list/confirm/${confirmationToken}`;
        
        const emailHtml = `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #2563eb;">Welcome to ListsSync.ai!</h2>
            <p>Thank you for subscribing to our mailing list. We'll keep you updated on new features and improvements.</p>
            <p>Please confirm your subscription by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Confirm Subscription
              </a>
            </p>
            <p style="font-size: 14px; color: #666;">
              If you didn't sign up for this, you can safely ignore this email.
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">
              ListsSync.ai - Sync real-time checklists with instant photo proof
            </p>
          </div>
        `;

        const { sendEmail } = await import('./services/emailService');
        await sendEmail({
          to: cleanEmail,
          subject: 'Confirm your ListsSync.ai subscription',
          text: `Please confirm your subscription by visiting: ${confirmationUrl}`,
          html: emailHtml
        });

        console.log(`✅ Confirmation email sent to ${cleanEmail}`);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the subscription if email fails
      }
      
      res.json({ 
        success: true, 
        message: "Please check your email to confirm your subscription" 
      });
    } catch (error: any) {
      console.error('Mailing list subscription error:', error);
      res.status(500).json({ message: "Failed to subscribe to mailing list" });
    }
  });

  // Email confirmation endpoint
  app.get(`${API_BASE}/mailing-list/confirm/:token`, async (req, res) => {
    try {
      const { token } = req.params;
      
      const confirmed = await storage.confirmMailingListSubscription(token);
      
      if (confirmed) {
        res.send(`
          <html>
            <head><title>Subscription Confirmed</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #10b981;">Subscription Confirmed!</h1>
              <p>Thank you for confirming your subscription to ListsSync.ai updates.</p>
              <p>We'll keep you informed about new features and improvements.</p>
              <a href="/" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">
                Return to ListsSync.ai
              </a>
            </body>
          </html>
        `);
      } else {
        res.status(400).send(`
          <html>
            <head><title>Invalid Token</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #ef4444;">Invalid or Expired Token</h1>
              <p>This confirmation link is invalid or has already been used.</p>
              <a href="/" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">
                Return to ListsSync.ai
              </a>
            </body>
          </html>
        `);
      }
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Set up WebSocket server for real-time checklist updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections by checklist ID and user ID
  const connections = new Map<string, Set<any>>();
  
  wss.on('connection', (ws) => {
    let checklistId: string | null = null;
    let userId: string | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client subscribe
        if (data.type === 'subscribe') {
          checklistId = data.checklistId;
          userId = data.userId;
          
          // Register this connection
          if (checklistId) {
            if (!connections.has(checklistId)) {
              connections.set(checklistId, new Set());
            }
            connections.get(checklistId)?.add(ws);
            
            ws.send(JSON.stringify({
              type: 'subscribed',
              checklistId
            }));
          }
        }
        
        // Handle checklist updates from clients
        if (data.type === 'update' && data.checklistId) {
          // Broadcast to all clients except sender
          const clients = connections.get(data.checklistId);
          if (clients) {
            clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) { // 1 = WebSocket.OPEN
                client.send(JSON.stringify({
                  type: 'update',
                  checklistId: data.checklistId,
                  data: data.data,
                  userId: data.userId,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Clean up on disconnect
    ws.on('close', () => {
      if (checklistId && connections.has(checklistId)) {
        connections.get(checklistId)?.delete(ws);
        
        // Remove empty connection sets
        if (connections.get(checklistId)?.size === 0) {
          connections.delete(checklistId);
        }
      }
    });
  });
  
  return httpServer;
}
