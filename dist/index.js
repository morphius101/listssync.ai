var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/geminiTranslationService.ts
var geminiTranslationService_exports = {};
__export(geminiTranslationService_exports, {
  AVAILABLE_LANGUAGES: () => AVAILABLE_LANGUAGES,
  getLanguageName: () => getLanguageName,
  translateChecklist: () => translateChecklist,
  translateText: () => translateText
});
import { GoogleGenAI } from "@google/genai";
async function translateText(text2, targetLanguage, sourceLanguage) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("\u26A0\uFE0F GEMINI_API_KEY not found, returning original text");
      return text2;
    }
    if (targetLanguage === "en" && !sourceLanguage) {
      return text2;
    }
    const targetLangName = AVAILABLE_LANGUAGES[targetLanguage];
    const sourceLangName = sourceLanguage ? AVAILABLE_LANGUAGES[sourceLanguage] : "the source language";
    const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
    Only return the translated text, no additional commentary or explanation.
    
    Text to translate: "${text2}"`;
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    const translatedText = result.text || text2;
    console.log(`\u{1F30D} Gemini Translation: ${sourceLanguage || "auto"} \u2192 ${targetLanguage}`);
    console.log(`\u{1F4DD} Original: ${text2.substring(0, 50)}...`);
    console.log(`\u{1F4DD} Translated: ${translatedText.substring(0, 50)}...`);
    return translatedText || text2;
  } catch (error) {
    console.error("\u274C Gemini translation error:", error);
    return text2;
  }
}
async function translateChecklist(checklist, targetLanguage, _sourceLanguage) {
  try {
    console.log(`\u{1F504} Starting checklist translation to ${targetLanguage}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("\u26A0\uFE0F GEMINI_API_KEY not found, returning original checklist");
      return checklist;
    }
    if (targetLanguage === "en") {
      return checklist;
    }
    const targetLangName = AVAILABLE_LANGUAGES[targetLanguage];
    const prompt = `Translate this checklist JSON into ${targetLangName}.

Rules:
- Preserve the exact JSON structure and all keys.
- Translate only human-readable text fields such as name, remarks, task descriptions, and task details.
- Do not translate IDs, status enums, booleans, URLs, timestamps, or numeric fields.
- Return valid JSON only. No markdown, no explanation.

Checklist JSON:
${JSON.stringify(checklist)}`;
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    const translatedText = result.text?.trim();
    if (!translatedText) {
      console.warn("\u26A0\uFE0F Gemini returned empty checklist translation; using original checklist");
      return checklist;
    }
    const parsed = JSON.parse(translatedText);
    parsed.translatedTo = targetLanguage;
    parsed.translatedAt = checklist?.updatedAt || checklist?.translatedAt || (/* @__PURE__ */ new Date()).toISOString();
    console.log(`\u2705 Checklist translation to ${targetLanguage} completed`);
    return parsed;
  } catch (error) {
    console.error("\u274C Checklist translation error:", error);
    return checklist;
  }
}
function getLanguageName(code) {
  return AVAILABLE_LANGUAGES[code] || code;
}
var genAI, AVAILABLE_LANGUAGES;
var init_geminiTranslationService = __esm({
  "server/services/geminiTranslationService.ts"() {
    "use strict";
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    AVAILABLE_LANGUAGES = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
      zh: "Chinese",
      ru: "Russian",
      ja: "Japanese",
      ar: "Arabic",
      hi: "Hindi"
    };
  }
});

// server/services/emailService.ts
var emailService_exports = {};
__export(emailService_exports, {
  sendEmail: () => sendEmail,
  sendVerificationEmail: () => sendVerificationEmail
});
import { MailService } from "@sendgrid/mail";
function safeGetEnv(key) {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : void 0;
}
async function sendEmail(options) {
  const { to, subject, text: text2, html, from = "greyson@listssync.ai" } = options;
  if (!sendgridApiKey) {
    console.error("\u274C ERROR: SENDGRID_API_KEY not set - cannot send emails");
    throw new Error("SendGrid API key is required for email delivery");
  }
  try {
    console.log(`\u{1F4E7} Attempting to send email via SendGrid to ${to}...`);
    const message = {
      to,
      from,
      subject,
      text: text2,
      html
    };
    console.log("\u{1F4E7} Sending message with payload:", {
      to,
      from,
      subject,
      textLength: text2 ? text2.length : 0,
      htmlLength: html ? html.length : 0
    });
    console.log(`\u{1F504} EXECUTING: mailService.send() with message to ${to}...`);
    try {
      const response = await mailService.send(message);
      console.log(`\u2705 SUCCESS: Email sent through SendGrid to ${to}`);
      console.log(`\u2705 SendGrid API Response:`, JSON.stringify(response));
      return true;
    } catch (sendGridError) {
      console.error(`\u274C SendGrid.send() threw an error:`, sendGridError);
      throw sendGridError;
    }
  } catch (error) {
    console.error("\u274C Failed to send email. Error details:", error.message || "Unknown error");
    if (error.response) {
      console.error("\u274C SendGrid API error response:", {
        body: error.response.body,
        statusCode: error.response.statusCode
      });
    }
    console.error("===================================================");
    console.error(`\u274C EMAIL SENDING FAILED! DETAILS:`);
    console.error(`- To: ${to}`);
    console.error(`- Subject: ${subject}`);
    console.error(`- Error: ${error.message || "Unknown error"}`);
    console.error("===================================================");
    throw error;
  }
}
async function sendVerificationEmail(email, code, token) {
  const subject = token ? "Your ListsSync.ai Checklist Link" : "Your ListsSync.ai Verification Code";
  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.listssync.ai" : `http://localhost:5000`;
  const shareUrl = token ? `${baseUrl}/shared/${token}` : void 0;
  const text2 = `
${shareUrl ? `You can open your shared ListsSync.ai checklist here: ${shareUrl}

This secure email link already verifies your access. No extra code entry is required.` : `Your verification code for ListsSync.ai is: ${code}

This code will expire in 10 minutes.`}

Thank you,
The ListsSync.ai Team
  `.trim();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .code {
      font-size: 24px;
      font-weight: bold;
      color: #4f46e5;
      padding: 10px;
      margin: 20px 0;
      text-align: center;
      letter-spacing: 5px;
    }
    .button {
      display: inline-block;
      background-color: #4f46e5;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
      letter-spacing: normal;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    ${shareUrl ? `
    <h2>Your Shared Checklist</h2>
    <p>Use the secure link below to open your ListsSync.ai checklist.</p>
    <p>You can also access your checklist directly by clicking the button below:</p>
    <div style="text-align: center;">
      <a href="${shareUrl}" style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; letter-spacing: normal;">View Checklist</a>
    </div>
    <p>This secure email link already verifies your access, so you do not need to enter a separate code.</p>
    ` : `
    <h2>Your Verification Code</h2>
    <p>Please use the following code to verify your identity on ListsSync.ai:</p>
    <div class="code">${code}</div>
    <p>This code will expire in 10 minutes.</p>
    `}
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ListsSync.ai | www.listssync.ai</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  return sendEmail({
    to: email,
    subject,
    text: text2,
    html
  });
}
var mailService, sendgridApiKey;
var init_emailService = __esm({
  "server/services/emailService.ts"() {
    "use strict";
    mailService = new MailService();
    console.log("\u{1F4DD} Email Environment variables check:");
    console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
    console.log("- SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
    console.log("- SENDGRID_API_KEY value is string type:", typeof process.env.SENDGRID_API_KEY === "string");
    console.log("- SENDGRID_API_KEY length:", process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
    console.log("- First characters of key (if exists):", process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 3) + "..." : "N/A");
    sendgridApiKey = safeGetEnv("SENDGRID_API_KEY");
    if (sendgridApiKey) {
      console.log("\u{1F511} Setting up SendGrid with valid API key...");
      mailService.setApiKey(sendgridApiKey);
      console.log("\u2705 SendGrid mail service initialized successfully");
    } else {
      console.warn("\u26A0\uFE0F SENDGRID_API_KEY not set properly, email delivery is disabled");
    }
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  TIER_LIMITS: () => TIER_LIMITS,
  checklists: () => checklists,
  insertChecklistSchema: () => insertChecklistSchema,
  insertMailingListSubscriptionSchema: () => insertMailingListSubscriptionSchema,
  insertSmsConsentSchema: () => insertSmsConsentSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserSchema: () => insertUserSchema,
  insertVerificationSchema: () => insertVerificationSchema,
  leads: () => leads,
  mailingListSubscriptions: () => mailingListSubscriptions,
  sessions: () => sessions,
  smsConsents: () => smsConsents,
  tasks: () => tasks,
  users: () => users,
  verifications: () => verifications,
  waitlist: () => waitlist
});
import { pgTable, index, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  // Firebase UID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Subscription fields
  subscriptionTier: varchar("subscription_tier").notNull().default("free"),
  // free, starter, professional, business, enterprise
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  // active, inactive, past_due, canceled
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Usage tracking
  listSyncCount: integer("list_sync_count").notNull().default(0),
  languageUseCount: integer("language_use_count").notNull().default(0),
  lastSyncAt: timestamp("last_sync_at"),
  // Feature flags
  allowedLanguages: jsonb("allowed_languages").default(["en", "es"]),
  // JSON array of language codes
  // CRM / onboarding profile
  useCase: varchar("use_case", { length: 100 }),
  teamSize: varchar("team_size", { length: 50 }),
  phone: varchar("phone", { length: 30 }),
  signupMethod: varchar("signup_method", { length: 20 }),
  // 'google' | 'email'
  signupSource: varchar("signup_source", { length: 50 }),
  trialStartedAt: timestamp("trial_started_at"),
  marketingOptIn: boolean("marketing_opt_in").default(false)
}, (table) => [
  index("users_stripe_customer_idx").on(table.stripeCustomerId),
  index("users_subscription_tier_idx").on(table.subscriptionTier),
  index("users_email_idx").on(table.email)
]);
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(),
  description: text("description").notNull(),
  details: text("details"),
  completed: boolean("completed").notNull().default(false),
  photoRequired: boolean("photo_required").notNull().default(false),
  photoUrl: text("photo_url"),
  orderIndex: integer("order_index").notNull().default(0)
}, (table) => ({
  // Index for faster task lookup by checklist
  checklistIdIdx: index("task_checklist_id_idx").on(table.checklistId),
  // Composite index for efficient querying of task status within checklists
  taskStatusIdx: index("task_status_idx").on(table.checklistId, table.completed)
}));
var checklists = pgTable("checklists", {
  id: text("id").primaryKey(),
  // Changed to text to support Firebase IDs
  name: text("name").notNull(),
  status: text("status").notNull().default("not-started"),
  progress: integer("progress").notNull().default(0),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  tasksData: jsonb("tasks_data"),
  // Store tasks as JSON for Firebase compatibility
  shareToken: text("share_token"),
  userId: text("user_id")
  // Firebase user ID
}, (table) => ({
  // Index for faster lookup by user
  userIdIdx: index("checklist_user_id_idx").on(table.userId),
  // Index for finding checklists by status
  statusIdx: index("checklist_status_idx").on(table.status),
  // Index for finding shared checklists
  shareTokenIdx: index("checklist_share_token_idx").on(table.shareToken)
}));
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true
});
var insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  code: varchar("code", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  recipientId: text("recipient_id").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  checklistId: text("checklist_id"),
  targetLanguage: varchar("target_language", { length: 10 }).default("en")
}, (table) => ({
  // Index for faster token lookup
  tokenIdx: index("verification_token_idx").on(table.token),
  // Index for expiration query optimizations
  expiresAtIdx: index("verification_expires_at_idx").on(table.expiresAt),
  // Index for finding verifications by checklist
  checklistIdIdx: index("verification_checklist_id_idx").on(table.checklistId),
  // Composite index for contact lookups
  contactIdx: index("verification_contact_idx").on(table.recipientEmail, table.recipientPhone)
}));
var insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true
});
var mailingListSubscriptions = pgTable("mailing_list_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmationToken: varchar("confirmation_token", { length: 128 }),
  source: varchar("source", { length: 50 }).notNull().default("development_banner"),
  // Track where they signed up
  leadType: varchar("lead_type", { length: 50 }).notNull().default("marketing_lead"),
  // Categorize the type of lead
  userAgent: text("user_agent"),
  // For analytics
  ipAddress: varchar("ip_address", { length: 45 })
  // For compliance
}, (table) => ({
  // Index for faster email lookup
  emailIdx: index("mailing_list_email_idx").on(table.email),
  // Index for finding unconfirmed subscriptions
  confirmedIdx: index("mailing_list_confirmed_idx").on(table.confirmed),
  // Index for analytics by source
  sourceIdx: index("mailing_list_source_idx").on(table.source),
  // Index for filtering by lead type
  leadTypeIdx: index("mailing_list_lead_type_idx").on(table.leadType)
}));
var insertMailingListSubscriptionSchema = createInsertSchema(mailingListSubscriptions).omit({
  id: true,
  subscribedAt: true
});
var insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true
});
var TIER_LIMITS = {
  free: {
    maxLists: 5,
    maxUsers: 1,
    syncFrequency: "6hours",
    allowedLanguages: ["en", "es"],
    maxLanguages: 2,
    storageGB: 1,
    features: ["manual_sync", "basic_translation", "mobile_access"]
  },
  professional: {
    maxLists: 100,
    maxUsers: 10,
    syncFrequency: "realtime",
    maxLanguages: 15,
    storageGB: 50,
    features: ["realtime_sync", "advanced_analytics", "integrations", "workflow_automation", "api_access", "team_collaboration", "priority_support"]
  },
  enterprise: {
    maxLists: Infinity,
    maxUsers: Infinity,
    syncFrequency: "realtime",
    maxLanguages: Infinity,
    storageGB: Infinity,
    features: ["unlimited_everything", "custom_deployment", "enterprise_sla", "custom_integrations", "onboarding"]
  }
};
var smsConsents = pgTable("sms_consents", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  consentedAt: timestamp("consented_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertSmsConsentSchema = createInsertSchema(smsConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  converted: boolean("converted").notNull().default(false)
}, (table) => ({
  emailIdx: index("leads_email_idx").on(table.email)
}));
var waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  userAgent: text("user_agent"),
  ipHash: varchar("ip_hash", { length: 64 })
}, (table) => ({
  emailIdx: index("waitlist_email_idx").on(table.email)
}));

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
var DatabaseStorage = class {
  async getAllChecklists(userId) {
    let dbChecklists;
    if (userId) {
      dbChecklists = await db.select().from(checklists).where(eq(checklists.userId, userId));
    } else {
      dbChecklists = await db.select().from(checklists);
    }
    return dbChecklists.map((checklist) => {
      const tasksData = checklist.tasksData || [];
      return {
        id: checklist.id.toString(),
        name: checklist.name,
        status: checklist.status,
        progress: checklist.progress,
        taskCount: tasksData.length,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt
      };
    });
  }
  async getChecklistById(id) {
    console.log(`\u{1F50D} Attempting to fetch checklist with ID: ${id}`);
    try {
      try {
        console.log(`Trying to fetch checklist with exact ID: ${id}`);
        const [dbChecklist] = await db.select().from(checklists).where(eq(checklists.id, id));
        if (dbChecklist) {
          console.log(`\u2705 Found checklist by exact ID: ${id}`);
          const tasksData = dbChecklist.tasksData || [];
          return {
            id: dbChecklist.id,
            name: dbChecklist.name,
            tasks: tasksData,
            status: dbChecklist.status,
            progress: dbChecklist.progress,
            createdAt: dbChecklist.createdAt,
            updatedAt: dbChecklist.updatedAt,
            remarks: dbChecklist.remarks || "",
            userId: dbChecklist.userId || void 0
          };
        }
      } catch (directError) {
        console.log(`\u274C Error finding checklist by exact ID: ${directError.message}`);
      }
      try {
        console.log(`Trying to fetch checklist by share token: ${id}`);
        const [tokenChecklist] = await db.select().from(checklists).where(eq(checklists.shareToken, id));
        if (tokenChecklist) {
          console.log(`\u2705 Found checklist by share token: ${id}`);
          const tasksData = tokenChecklist.tasksData || [];
          return {
            id,
            // Use the share token as the ID for consistency
            name: tokenChecklist.name,
            tasks: tasksData,
            status: tokenChecklist.status,
            progress: tokenChecklist.progress,
            createdAt: tokenChecklist.createdAt,
            updatedAt: tokenChecklist.updatedAt,
            remarks: tokenChecklist.remarks || "",
            userId: tokenChecklist.userId || void 0
          };
        }
      } catch (tokenError) {
        console.log(`\u274C Error finding checklist by share token: ${tokenError.message}`);
      }
      try {
        console.log(`Checking verifications table for token: ${id}`);
        const [verification] = await db.select().from(verifications).where(eq(verifications.token, id)).limit(1);
        if (verification && verification.checklistId) {
          console.log(`\u2705 Found verification with checklist ID: ${verification.checklistId}`);
          try {
            const [linkedChecklist] = await db.select().from(checklists).where(eq(checklists.id, verification.checklistId));
            if (linkedChecklist) {
              console.log(`\u2705 Found checklist via verification link: ${verification.checklistId}`);
              const tasksData = linkedChecklist.tasksData || [];
              return {
                id: linkedChecklist.id,
                name: linkedChecklist.name,
                tasks: tasksData,
                status: linkedChecklist.status,
                progress: linkedChecklist.progress,
                createdAt: linkedChecklist.createdAt,
                updatedAt: linkedChecklist.updatedAt,
                remarks: linkedChecklist.remarks || "",
                userId: linkedChecklist.userId || void 0
              };
            }
          } catch (linkedError) {
            console.log(`\u274C Error finding linked checklist by ID: ${linkedError.message}`);
          }
        }
      } catch (verificationError) {
        console.log(`\u274C Error checking verification: ${verificationError.message}`);
      }
      console.log(`\u274C Checklist not found with ID: ${id}`);
      return void 0;
    } catch (error) {
      console.error(`\u274C Error in getChecklistById: ${error.message}`);
      return void 0;
    }
  }
  async createChecklist(checklist) {
    const tasksWithIds = checklist.tasks.map(
      (task) => task.id ? task : { ...task, id: uuidv4() }
    );
    const [insertedChecklist] = await db.insert(checklists).values({
      id: checklist.id,
      name: checklist.name,
      status: checklist.status,
      progress: checklist.progress,
      remarks: checklist.remarks || "",
      tasksData: tasksWithIds,
      userId: checklist.userId
    }).returning();
    return {
      id: insertedChecklist.id,
      name: insertedChecklist.name,
      status: insertedChecklist.status,
      progress: insertedChecklist.progress,
      taskCount: tasksWithIds.length,
      createdAt: insertedChecklist.createdAt,
      updatedAt: insertedChecklist.updatedAt
    };
  }
  async updateChecklist(checklist) {
    try {
      const [updatedChecklist] = await db.update(checklists).set({
        name: checklist.name,
        status: checklist.status,
        progress: checklist.progress,
        remarks: checklist.remarks,
        tasksData: checklist.tasks,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(checklists.id, checklist.id)).returning();
      if (!updatedChecklist) return void 0;
      const tasksData = updatedChecklist.tasksData || [];
      return {
        id: updatedChecklist.id,
        name: updatedChecklist.name,
        status: updatedChecklist.status,
        progress: updatedChecklist.progress,
        tasks: tasksData,
        remarks: updatedChecklist.remarks || "",
        createdAt: updatedChecklist.createdAt,
        updatedAt: updatedChecklist.updatedAt,
        userId: updatedChecklist.userId || void 0
      };
    } catch (error) {
      console.error("Error updating checklist:", error);
      return void 0;
    }
  }
  async deleteChecklist(id) {
    try {
      await db.delete(checklists).where(eq(checklists.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting checklist:", error);
      return false;
    }
  }
  async updateTask(checklistId, taskId, updates) {
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) {
      return void 0;
    }
    const taskIndex = checklist.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      return void 0;
    }
    const updatedTask = { ...checklist.tasks[taskIndex], ...updates };
    checklist.tasks[taskIndex] = updatedTask;
    const completedTasks = checklist.tasks.filter((task) => task.completed).length;
    checklist.progress = Math.round(completedTasks / checklist.tasks.length * 100);
    if (checklist.progress === 100) {
      checklist.status = "completed";
    } else if (checklist.progress > 0) {
      checklist.status = "in-progress";
    } else {
      checklist.status = "not-started";
    }
    checklist.updatedAt = /* @__PURE__ */ new Date();
    await this.updateChecklist(checklist);
    return updatedTask;
  }
  // Verification Methods
  async createVerification(verification) {
    try {
      const [insertedVerification] = await db.insert(verifications).values({
        token: verification.token,
        code: verification.code,
        expiresAt: verification.expiresAt,
        verified: verification.verified,
        recipientId: verification.recipientId,
        recipientEmail: verification.recipientEmail,
        recipientPhone: verification.recipientPhone,
        checklistId: verification.checklistId,
        targetLanguage: verification.targetLanguage || "en"
      }).returning();
      return {
        token: insertedVerification.token,
        code: insertedVerification.code,
        createdAt: insertedVerification.createdAt,
        expiresAt: insertedVerification.expiresAt,
        verified: insertedVerification.verified,
        recipientId: insertedVerification.recipientId,
        recipientEmail: insertedVerification.recipientEmail || void 0,
        recipientPhone: insertedVerification.recipientPhone || void 0,
        checklistId: insertedVerification.checklistId || void 0,
        targetLanguage: insertedVerification.targetLanguage || "en"
      };
    } catch (error) {
      console.error("Error creating verification:", error);
      throw error;
    }
  }
  async getVerificationByToken(token) {
    try {
      const [foundVerification] = await db.select().from(verifications).where(eq(verifications.token, token));
      if (!foundVerification) return void 0;
      return {
        token: foundVerification.token,
        code: foundVerification.code,
        createdAt: foundVerification.createdAt,
        expiresAt: foundVerification.expiresAt,
        verified: foundVerification.verified,
        recipientId: foundVerification.recipientId,
        recipientEmail: foundVerification.recipientEmail || void 0,
        recipientPhone: foundVerification.recipientPhone || void 0,
        checklistId: foundVerification.checklistId || void 0,
        targetLanguage: foundVerification.targetLanguage || "en"
      };
    } catch (error) {
      console.error("Error retrieving verification:", error);
      return void 0;
    }
  }
  async markVerificationAsVerified(token) {
    try {
      const [updated] = await db.update(verifications).set({ verified: true }).where(eq(verifications.token, token)).returning();
      return !!updated;
    } catch (error) {
      console.error("Error marking verification as verified:", error);
      return false;
    }
  }
  /**
   * Update the verification code for a specific token
   * This is used to correct code mismatches during development/testing
   */
  async updateVerificationCode(token, code) {
    try {
      console.log(`Updating verification code for token: ${token}`);
      const [updated] = await db.update(verifications).set({ code }).where(eq(verifications.token, token)).returning();
      return !!updated;
    } catch (error) {
      console.error("Error updating verification code:", error);
      return false;
    }
  }
  /**
   * Get all verifications from the database
   * Useful for debug and finding active verifications
   */
  async getAllVerifications() {
    try {
      console.log(`Retrieving all verifications from database...`);
      const allVerifications = await db.select().from(verifications);
      console.log(`Found ${allVerifications.length} verifications`);
      return allVerifications.map((v) => ({
        token: v.token,
        code: v.code,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
        verified: v.verified,
        recipientId: v.recipientId,
        recipientEmail: v.recipientEmail || void 0,
        recipientPhone: v.recipientPhone || void 0,
        checklistId: v.checklistId || void 0
      }));
    } catch (error) {
      console.error("Error retrieving all verifications:", error);
      return [];
    }
  }
  // Mailing list methods implementation
  async subscribeToMailingList(subscription) {
    try {
      const [insertedSubscription] = await db.insert(mailingListSubscriptions).values({
        email: subscription.email,
        confirmed: subscription.confirmed,
        confirmationToken: subscription.confirmationToken,
        source: subscription.source,
        leadType: subscription.leadType,
        userAgent: subscription.userAgent,
        ipAddress: subscription.ipAddress
      }).returning();
      return {
        id: insertedSubscription.id,
        email: insertedSubscription.email,
        subscribedAt: insertedSubscription.subscribedAt,
        confirmed: insertedSubscription.confirmed,
        confirmationToken: insertedSubscription.confirmationToken || void 0,
        source: insertedSubscription.source,
        leadType: insertedSubscription.leadType,
        userAgent: insertedSubscription.userAgent || void 0,
        ipAddress: insertedSubscription.ipAddress || void 0
      };
    } catch (error) {
      console.error("Error creating mailing list subscription:", error);
      throw error;
    }
  }
  async confirmMailingListSubscription(token) {
    try {
      const [updatedSubscription] = await db.update(mailingListSubscriptions).set({ confirmed: true, confirmationToken: null }).where(eq(mailingListSubscriptions.confirmationToken, token)).returning();
      return !!updatedSubscription;
    } catch (error) {
      console.error("Error confirming mailing list subscription:", error);
      return false;
    }
  }
  async getMailingListSubscription(email) {
    try {
      const [subscription] = await db.select().from(mailingListSubscriptions).where(eq(mailingListSubscriptions.email, email));
      if (!subscription) return void 0;
      return {
        id: subscription.id,
        email: subscription.email,
        subscribedAt: subscription.subscribedAt,
        confirmed: subscription.confirmed,
        confirmationToken: subscription.confirmationToken || void 0,
        source: subscription.source,
        leadType: subscription.leadType,
        userAgent: subscription.userAgent || void 0,
        ipAddress: subscription.ipAddress || void 0
      };
    } catch (error) {
      console.error("Error retrieving mailing list subscription:", error);
      return void 0;
    }
  }
  // User management methods for subscription tiers
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || void 0;
    } catch (error) {
      console.error("Error getting user:", error);
      return void 0;
    }
  }
  async upsertUser(userData) {
    try {
      const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return user;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }
  async updateUserSubscription(userId, tier, stripeData) {
    try {
      const updateData = {
        subscriptionTier: tier,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (stripeData) {
        if (stripeData.customerId) updateData.stripeCustomerId = stripeData.customerId;
        if (stripeData.subscriptionId) updateData.stripeSubscriptionId = stripeData.subscriptionId;
        if (stripeData.status) updateData.subscriptionStatus = stripeData.status;
        if (stripeData.endsAt) updateData.subscriptionEndsAt = stripeData.endsAt;
      }
      if (tier === "free") {
        updateData.allowedLanguages = ["en", "es"];
      } else if (tier === "professional") {
        updateData.allowedLanguages = ["en", "es", "fr", "de", "it"];
      } else if (tier === "enterprise") {
        updateData.allowedLanguages = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"];
      }
      const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
      return user || void 0;
    } catch (error) {
      console.error("Error updating user subscription:", error);
      return void 0;
    }
  }
  async incrementUserUsage(userId, type) {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      if (type === "sync") {
        await db.update(users).set({
          listSyncCount: (user.listSyncCount || 0) + 1,
          lastSyncAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, userId));
      } else if (type === "language") {
        await db.update(users).set({
          languageUseCount: (user.languageUseCount || 0) + 1
        }).where(eq(users.id, userId));
      }
      return true;
    } catch (error) {
      console.error("Error incrementing user usage:", error);
      return false;
    }
  }
  async checkUserLimits(userId, action) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { allowed: false, tier: "free" };
      }
      const tier = user.subscriptionTier;
      const limits = TIER_LIMITS[tier];
      switch (action) {
        case "create_list":
          const currentLists = await this.getAllChecklists(userId);
          const listCount = currentLists.length;
          return {
            allowed: listCount < limits.maxLists,
            limit: limits.maxLists === Infinity ? void 0 : limits.maxLists,
            current: listCount,
            tier
          };
        case "translate":
          const allowedLanguages = user.allowedLanguages || ["en", "es"];
          return {
            allowed: true,
            limit: limits.maxLanguages === Infinity ? void 0 : limits.maxLanguages,
            current: allowedLanguages.length,
            tier
          };
        case "sync":
          return {
            allowed: true,
            tier
          };
        default:
          return { allowed: false, tier };
      }
    } catch (error) {
      console.error("Error checking user limits:", error);
      return { allowed: false, tier: "free" };
    }
  }
  async recordSmsConsent(consent) {
    try {
      const [insertedConsent] = await db.insert(smsConsents).values({
        phoneNumber: consent.phoneNumber,
        firstName: consent.firstName,
        lastName: consent.lastName,
        consentedAt: consent.consentedAt,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        isActive: consent.isActive ?? true
      }).returning();
      return {
        id: insertedConsent.id,
        phoneNumber: insertedConsent.phoneNumber,
        firstName: insertedConsent.firstName,
        lastName: insertedConsent.lastName,
        consentedAt: insertedConsent.consentedAt,
        ipAddress: insertedConsent.ipAddress || void 0,
        userAgent: insertedConsent.userAgent || void 0,
        isActive: insertedConsent.isActive || true
      };
    } catch (error) {
      console.error("Error recording SMS consent:", error);
      throw error;
    }
  }
  async getSmsConsent(phoneNumber) {
    try {
      const [consent] = await db.select().from(smsConsents).where(and(
        eq(smsConsents.phoneNumber, phoneNumber),
        eq(smsConsents.isActive, true)
      )).orderBy(desc(smsConsents.createdAt)).limit(1);
      if (!consent) return void 0;
      return {
        id: consent.id,
        phoneNumber: consent.phoneNumber,
        firstName: consent.firstName,
        lastName: consent.lastName,
        consentedAt: consent.consentedAt,
        ipAddress: consent.ipAddress || void 0,
        userAgent: consent.userAgent || void 0,
        isActive: consent.isActive || true
      };
    } catch (error) {
      console.error("Error retrieving SMS consent:", error);
      return void 0;
    }
  }
  async revokeSmsConsent(phoneNumber) {
    try {
      const [updatedConsent] = await db.update(smsConsents).set({ isActive: false }).where(eq(smsConsents.phoneNumber, phoneNumber)).returning();
      return !!updatedConsent;
    } catch (error) {
      console.error("Error revoking SMS consent:", error);
      return false;
    }
  }
  async upsertLead(email, source) {
    try {
      await db.insert(leads).values({ email, source: source || "landing_page" }).onConflictDoNothing();
    } catch (error) {
      console.error("Error upserting lead:", error);
    }
  }
  async convertLead(email) {
    try {
      await db.update(leads).set({ converted: true }).where(eq(leads.email, email));
    } catch (error) {
      console.error("Error converting lead:", error);
    }
  }
  async upsertWaitlist(email, source, userAgent, ipHash) {
    try {
      await db.insert(waitlist).values({ email, source: source || "beta_gate", userAgent, ipHash }).onConflictDoNothing();
    } catch (error) {
      console.error("Error upserting waitlist:", error);
    }
  }
};
var storage = new DatabaseStorage();

// server/middleware/auth.ts
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: missing token" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (hasServiceAccount) {
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = { uid: decodedToken.uid, email: decodedToken.email };
        return next();
      } catch (verifyError) {
        console.error("\u{1F534} Firebase verifyIdToken failed:", verifyError?.message || verifyError);
        return res.status(401).json({ error: "Unauthorized: token verification failed" });
      }
    }
    if (process.env.NODE_ENV === "production") {
      console.error("\u{1F534} FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in production");
      return res.status(500).json({ error: "Authentication is not configured correctly" });
    }
    const decoded = decodeJwtPayload(idToken);
    if (!decoded?.sub) {
      return res.status(401).json({ error: "Unauthorized: invalid token" });
    }
    req.user = { uid: decoded.sub, email: decoded.email };
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}

// server/middleware/betaMode.ts
function getAllowlist() {
  return (process.env.BETA_ALLOWLIST_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
function isBetaActive() {
  return process.env.BETA_MODE === "true";
}
var betaModeGuard = (req, res, next) => {
  if (!isBetaActive()) return next();
  const allowlist = getAllowlist();
  if (allowlist.length === 0) return next();
  const userEmail = (req.user?.email || "").toLowerCase();
  if (userEmail && allowlist.includes(userEmail)) return next();
  return res.status(403).json({ error: "Private beta", code: "BETA_MODE_ACTIVE" });
};

// server/routes.ts
init_geminiTranslationService();
import rateLimit from "express-rate-limit";
import { WebSocketServer } from "ws";
import { z } from "zod";
import compression from "compression";

// server/services/verificationService.ts
import { v4 as uuidv42 } from "uuid";
init_emailService();
import twilio from "twilio";
function generateVerificationCode() {
  try {
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    console.log(`Generated verification code: ${code}`);
    return code;
  } catch (error) {
    console.error("Error generating verification code:", error);
    return (1e5 + Math.floor(Math.random() * 9e5)).toString();
  }
}
function generateToken() {
  try {
    const token = uuidv42();
    console.log(`Generated verification token: ${token}`);
    return token;
  } catch (error) {
    console.error("Error generating UUID token:", error);
    const timestamp2 = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 10);
    const fallbackToken = `token_${timestamp2}_${randomPart}`;
    console.log(`Generated fallback token: ${fallbackToken}`);
    return fallbackToken;
  }
}
async function createVerification(recipientId, email, phone, checklistId, targetLanguage) {
  try {
    console.log(`\u{1F511} Creating verification for recipient: ${recipientId}`);
    console.log(`\u{1F511} Contact methods: ${email ? "Email \u2713" : "Email \u2717"}, ${phone ? "Phone \u2713" : "Phone \u2717"}`);
    console.log(`\u{1F511} Checklist ID: ${checklistId || "Not provided"}`);
    const code = generateVerificationCode();
    const token = generateToken();
    console.log(`\u{1F511} Generated code: ${code}, token: ${token}`);
    const now = /* @__PURE__ */ new Date();
    const expires = new Date(now.getTime() + 30 * 60 * 1e3);
    console.log(`\u{1F511} Verification expires at: ${expires.toISOString()}`);
    const verificationData = {
      token,
      code,
      createdAt: now,
      expiresAt: expires,
      verified: false,
      recipientId,
      recipientEmail: email,
      recipientPhone: phone,
      checklistId,
      targetLanguage: targetLanguage || "en"
    };
    console.log(`\u{1F511} Storing verification in database...`);
    await storage.createVerification(verificationData);
    console.log(`\u2705 Verification stored successfully`);
    console.log(`\u{1F511} Created verification with token ${token} and code ${code}`);
    return { token, code };
  } catch (error) {
    console.error("\u274C Error creating verification:", error);
    if (typeof error === "object" && error !== null) {
      console.error("\u274C Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      });
    }
    if (error.message?.includes("duplicate key")) {
      console.log("\u274C Duplicate verification detected");
      try {
        const existingVerifications = await storage.getAllVerifications();
        const existingVerification = existingVerifications.find(
          (v) => v.recipientId === recipientId && !v.verified && v.expiresAt > /* @__PURE__ */ new Date()
        );
        if (existingVerification) {
          console.log(`\u{1F4CB} Found existing verification, returning it`);
          return {
            token: existingVerification.token,
            code: existingVerification.code
          };
        }
      } catch (lookupError) {
        console.error("\u274C Error looking up existing verification:", lookupError);
      }
    }
    console.log(`\u{1F527} NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
    if (process.env.NODE_ENV === "development") {
      console.log("\u{1F527} Using fallback verification (development only)");
      const fallbackToken = uuidv42();
      const fallbackCode = generateVerificationCode();
      return { token: fallbackToken, code: fallbackCode };
    }
    throw new Error(`Failed to create verification: ${error.message || "Unknown error"}`);
  }
}
async function verifyCode(token, code) {
  try {
    console.log(`\u{1F50D} Verifying code for token: ${token}`);
    const record = await storage.getVerificationByToken(token);
    if (!record) {
      console.log(`\u274C Verification token not found: ${token}`);
      return false;
    }
    if (record.expiresAt < /* @__PURE__ */ new Date()) {
      console.log(`\u23F0 Verification token has expired`);
      return false;
    }
    if (record.verified) {
      console.log(`\u26A0\uFE0F Verification token already used`);
      return false;
    }
    if (record.code !== code) {
      console.log(`\u274C Verification failed \u2014 code mismatch`);
      return false;
    }
    console.log(`\u2705 Code matched \u2014 marking as verified`);
    return await storage.markVerificationAsVerified(token);
  } catch (error) {
    console.error("\u274C Error verifying code:", error);
    return false;
  }
}
async function getVerification(token) {
  try {
    return await storage.getVerificationByToken(token);
  } catch (error) {
    console.error("Error getting verification:", error);
    return void 0;
  }
}
function formatPhoneForDisplay(phone) {
  const digits = phone.replace(/\D/g, "");
  const lastFour = digits.slice(-4);
  return `****-****-${lastFour}`;
}
function formatEmailForDisplay(email) {
  const [username, domain] = email.split("@");
  if (!username || !domain) return email;
  return `${username.charAt(0)}*****@${domain}`;
}
async function sendVerificationSMS(phone, code, token) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    console.log("===================================================");
    console.log(`\u{1F4F1} Attempting to send SMS verification to: ${formatPhoneForDisplay(phone)}`);
    console.log(`\u{1F4F1} Code: ${code}`);
    console.log(`\u{1F4F1} TWILIO_ACCOUNT_SID status: ${accountSid ? "Present" : "Missing"}`);
    console.log(`\u{1F4F1} TWILIO_AUTH_TOKEN status: ${authToken ? "Present" : "Missing"}`);
    console.log(`\u{1F4F1} TWILIO_PHONE_NUMBER: ${twilioPhone || "Missing"}`);
    console.log(`\u{1F4F1} NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
    console.log("===================================================");
    if (!accountSid || !authToken) {
      console.error("Cannot send SMS: Missing Twilio credentials");
      if (process.env.NODE_ENV === "development") {
        console.log("\u{1F4F1} DEVELOPMENT MODE: Skipping actual SMS send but returning success");
        return true;
      }
      return false;
    }
    if (!twilioPhone) {
      console.error("Cannot send SMS: Missing Twilio phone number");
      if (process.env.NODE_ENV === "development") {
        console.log("\u{1F4F1} DEVELOPMENT MODE: Skipping actual SMS send but returning success");
        return true;
      }
      return false;
    }
    let formattedPhone = phone;
    if (!phone.startsWith("+")) {
      if (phone.length === 10) {
        formattedPhone = `+1${phone}`;
        console.log(`\u{1F4F1} Formatted phone from ${phone} to E.164 format: ${formattedPhone}`);
      } else {
        formattedPhone = `+${phone}`;
        console.log(`\u{1F4F1} Added + prefix to phone: ${formattedPhone}`);
      }
    }
    const client = twilio(accountSid, authToken);
    console.log(`\u{1F4F1} Sending verification code to: ${formatPhoneForDisplay(formattedPhone)}`);
    console.log(`\u{1F4F1} Code: ${code}`);
    let messageBody = `Your ListsSync.ai verification code is: ${code}`;
    if (token) {
      const baseUrl = process.env.NODE_ENV === "production" ? "https://www.listssync.ai" : `http://localhost:5000`;
      const shareUrl = `${baseUrl}/shared/${token}`;
      messageBody += `

Access your checklist: ${shareUrl}`;
      messageBody += `

This link will take you directly to the shared checklist after verification.`;
    }
    try {
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      const messageParams = {
        body: messageBody,
        to: formattedPhone
      };
      if (messagingServiceSid) {
        messageParams.messagingServiceSid = messagingServiceSid;
      } else {
        messageParams.from = twilioPhone;
      }
      const message = await client.messages.create(messageParams);
      console.log(`\u{1F4F1} Verification SMS sent successfully to: ${formatPhoneForDisplay(formattedPhone)} \u2705`);
      console.log(`\u{1F4F1} Twilio message SID: ${message.sid}`);
      return true;
    } catch (twilioError) {
      console.error("\u{1F4F1} Twilio API Error:", twilioError.message);
      console.error("\u{1F4F1} Twilio Error Code:", twilioError.code);
      if (twilioError.code === 21211) {
        console.error("\u{1F4F1} Invalid phone number format. Please check the number and try again.");
      }
      if (process.env.NODE_ENV === "development") {
        console.log("\u{1F4F1} DEVELOPMENT MODE: Returning success despite Twilio error");
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS:", error.message || error);
    if (process.env.NODE_ENV === "development") {
      console.log("\u{1F4F1} DEVELOPMENT MODE: Returning success despite error");
      return true;
    }
    return false;
  }
}
async function sendVerificationEmail2(email, code, token) {
  try {
    const maskedEmail = formatEmailForDisplay(email);
    console.log("===================================================");
    console.log(`\u{1F4E7} Sending verification code to: ${maskedEmail}`);
    console.log(`\u{1F4E7} Code: ${code}`);
    console.log("===================================================");
    await sendVerificationEmail(email, code, token);
    console.log(`\u{1F4E7} Verification email sent successfully to: ${maskedEmail} \u2705`);
    return true;
  } catch (error) {
    console.error("\u274C Error sending verification email:", error.message || "Unknown error");
    if (error.response) {
      console.error("SendGrid API error details:", error.response.body || "No response body");
    }
    console.error("===================================================");
    console.error(`\u274C VERIFICATION EMAIL FAILED TO: ${formatEmailForDisplay(email)}`);
    console.error(`\u274C Error: ${error.message || "Unknown error"}`);
    console.error("===================================================");
    return false;
  }
}

// server/routes.ts
import Stripe from "stripe";
var verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 3,
  message: { error: "Too many verification attempts. Please wait 15 minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false
});
var waitlistRateLimit = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 5,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
var stripe = null;
var stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey) {
  const isTestMode = stripeKey.startsWith("sk_test_");
  const isLiveMode = stripeKey.startsWith("sk_live_");
  console.log(`\u{1F511} Stripe initialization: ${isLiveMode ? "LIVE MODE" : isTestMode ? "TEST MODE" : "UNKNOWN MODE"}`);
  if (process.env.NODE_ENV === "production" && isTestMode) {
    console.warn("\u26A0\uFE0F  WARNING: Using Stripe test keys in production environment!");
  }
  stripe = new Stripe(stripeKey);
} else {
  console.log("\u274C No Stripe secret key found in environment");
}
var APP_URL = process.env.APP_URL?.replace(/\/$/, "");
var SITE_CONFIG = {
  protocol: process.env.NODE_ENV === "production" ? "https" : "http",
  host: process.env.NODE_ENV === "production" ? "www.listssync.ai" : void 0
  // undefined will use req.get('host')
};
function getSiteBaseUrl(req) {
  if (APP_URL) return APP_URL;
  const protocol = SITE_CONFIG.protocol || req.protocol;
  const host = SITE_CONFIG.host || req.get("host");
  return `${protocol}://${host}`;
}
async function registerRoutes(app2) {
  const API_BASE = "/api";
  app2.get(`${API_BASE}/health`, (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.use(compression());
  app2.get(`${API_BASE}/user/:userId/subscription`, requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = req.user?.uid;
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const limits = TIER_LIMITS[user.subscriptionTier];
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
      console.error("Error getting user subscription:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });
  app2.post(`${API_BASE}/user/register`, requireAuth, async (req, res) => {
    try {
      const {
        userId,
        email,
        firstName,
        lastName,
        profileImageUrl,
        useCase,
        teamSize,
        phone,
        signupMethod,
        signupSource,
        trialStartedAt,
        marketingOptIn,
        displayName
      } = req.body;
      const authenticatedUserId = req.user?.uid;
      if (!userId || !email) {
        return res.status(400).json({ error: "Missing required fields: userId and email" });
      }
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      let first = firstName;
      let last = lastName;
      if (!first && displayName) {
        const parts = displayName.trim().split(" ");
        first = parts[0];
        last = parts.slice(1).join(" ") || void 0;
      }
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName: first,
        lastName: last,
        profileImageUrl,
        subscriptionTier: "free",
        subscriptionStatus: "active",
        allowedLanguages: TIER_LIMITS.free.allowedLanguages,
        useCase: useCase || null,
        teamSize: teamSize || null,
        phone: phone || null,
        signupMethod: signupMethod || "google",
        signupSource: signupSource || "google_oauth",
        trialStartedAt: trialStartedAt ? new Date(trialStartedAt) : /* @__PURE__ */ new Date(),
        marketingOptIn: marketingOptIn ?? false
      });
      if (email) {
        await storage.convertLead(email).catch(() => {
        });
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
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  app2.post(`${API_BASE}/leads`, async (req, res) => {
    try {
      const { email, source } = req.body;
      if (!email) return res.status(400).json({ error: "email required" });
      await storage.upsertLead(email, source || "landing_page");
      res.json({ success: true });
    } catch (error) {
      console.error("Error capturing lead:", error);
      res.status(500).json({ error: "Failed to capture lead" });
    }
  });
  app2.post(`${API_BASE}/waitlist`, waitlistRateLimit, async (req, res) => {
    try {
      const { email, source } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Valid email required" });
      }
      const userAgent = req.headers["user-agent"] || void 0;
      const ip = (req.ip || "").replace(/::ffff:/, "");
      const crypto = await import("crypto");
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
      await storage.upsertWaitlist(email, source || "beta_gate", userAgent, ipHash);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      res.status(500).json({ error: "Failed to add to waitlist" });
    }
  });
  app2.post(`${API_BASE}/create-subscription`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: "Payment processing not available. Please configure Stripe API keys." });
      }
      const { userId, tier, email } = req.body;
      const authenticatedUserId = req.user?.uid;
      if (!userId || !tier || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!["professional"].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }
      let customer;
      const user = await storage.getUser(userId);
      if (user?.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email,
          metadata: { userId }
        });
        await storage.updateUserSubscription(userId, user?.subscriptionTier || "free", {
          customerId: customer.id
        });
      }
      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        console.error("\u274C STRIPE_PRICE_ID is not set");
        return res.status(500).json({ error: "Stripe price not configured" });
      }
      console.log(`\u{1F511} Using price ID: ${priceId}`);
      console.log(`\u{1F511} Stripe key type: ${stripeKey?.substring(0, 8) ?? "unknown"}...`);
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 14
        },
        success_url: `${getSiteBaseUrl(req)}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getSiteBaseUrl(req)}/subscription/cancel`,
        metadata: {
          userId,
          tier
        }
      });
      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });
  app2.get(`${API_BASE}/subscription/session/:sessionId`, requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: "Stripe not configured" });
      }
      const { sessionId } = req.params;
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"]
      });
      const sub = session.subscription;
      const trialEnd = sub?.trial_end ?? null;
      res.json({
        trialEnd,
        // Unix timestamp or null
        amount: 99,
        // cents-free dollar amount for display
        currency: "usd"
      });
    } catch (error) {
      console.error("Error retrieving checkout session:", error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });
  app2.post(`${API_BASE}/stripe/webhook`, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ error: "Stripe not configured" });
      }
      const sig = req.headers["stripe-signature"];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        console.error("\u274C STRIPE_WEBHOOK_SECRET is not set \u2014 rejecting webhook");
        return res.status(400).json({ error: "Webhook secret not configured" });
      }
      let event;
      try {
        const rawBody = req.rawBody;
        if (!rawBody) {
          return res.status(400).json({ error: "Missing raw body" });
        }
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object;
          const { userId, tier } = session.metadata || {};
          if (userId && tier) {
            await storage.updateUserSubscription(userId, tier, {
              customerId: session.customer,
              subscriptionId: session.subscription,
              status: "active"
            });
          }
          break;
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object;
          const customer = await stripe.customers.retrieve(subscription.customer);
          if (customer && !customer.deleted && customer.metadata?.userId) {
            const status = subscription.status === "active" ? "active" : "inactive";
            const tier2 = status === "active" ? "professional" : "free";
            await storage.updateUserSubscription(customer.metadata.userId, tier2, {
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
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook failed" });
    }
  });
  const taskSchema = z.object({
    id: z.string(),
    description: z.string(),
    details: z.string().optional(),
    completed: z.boolean(),
    photoRequired: z.boolean(),
    photoUrl: z.string().nullable()
  });
  const checklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    tasks: z.array(taskSchema),
    status: z.enum(["not-started", "in-progress", "completed"]),
    progress: z.number().min(0).max(100),
    remarks: z.string().optional(),
    userId: z.string().optional()
  });
  app2.get(`${API_BASE}/checklists`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const checklists2 = await storage.getAllChecklists(userId);
      res.json(checklists2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/batch`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      if (!req.body.batch || !Array.isArray(req.body.batch)) {
        return res.status(400).json({ message: "Invalid batch request format" });
      }
      const batchRequests = req.body.batch;
      const results = [];
      for (const request of batchRequests) {
        try {
          if (!request.operation || !request.path) {
            results.push({ error: "Invalid request format" });
            continue;
          }
          switch (request.operation) {
            case "get-checklist":
              if (!request.id) {
                results.push({ error: "Missing checklist ID" });
                break;
              }
              const checklist = await storage.getChecklistById(request.id);
              results.push(checklist || { error: "Checklist not found" });
              break;
            case "update-task":
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
            case "get-checklists":
              const userId = req.user?.uid;
              const checklists2 = await storage.getAllChecklists(userId);
              results.push(checklists2);
              break;
            default:
              results.push({ error: "Unsupported operation" });
          }
        } catch (error) {
          results.push({ error: error.message });
        }
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get(`${API_BASE}/checklists/:id`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      console.log(`\u{1F50D} Getting checklist by ID: ${req.params.id}`);
      const createDefaultChecklist = (id) => {
        return {
          id,
          name: "Welcome to ListsSync.ai",
          tasks: [
            {
              id: "1",
              description: "Welcome to ListsSync.ai",
              details: "This is a sample task to get you started",
              completed: false,
              photoRequired: false,
              photoUrl: null
            },
            {
              id: "2",
              description: "Create your first checklist",
              details: 'Go to the dashboard and click "New Checklist"',
              completed: false,
              photoRequired: false,
              photoUrl: null
            }
          ],
          status: "not-started",
          progress: 0,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          remarks: "Welcome to ListsSync.ai! This is a default checklist created for you."
        };
      };
      const authenticatedUserId = req.user?.uid;
      let checklist;
      try {
        checklist = await storage.getChecklistById(req.params.id);
        if (checklist) {
          if (!authenticatedUserId || checklist.userId !== authenticatedUserId) {
            return res.status(403).json({ error: "Forbidden" });
          }
          console.log(`\u2705 Found checklist: ${checklist.name}`);
          return res.json(checklist);
        }
      } catch (specificError) {
        console.error(`\u274C Error fetching specific checklist ${req.params.id}:`, specificError);
      }
      console.log(`\u2753 Checklist not found with ID: ${req.params.id}`);
      return res.status(404).json({
        error: "Checklist not found",
        message: `Checklist with ID ${req.params.id} does not exist. Please ensure you have the correct link.`,
        checklistId: req.params.id
      });
    } catch (error) {
      console.error("\u{1F4A5} Unexpected error in checklist endpoint:", error);
      return res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });
  app2.post(`${API_BASE}/checklists`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const validatedData = checklistSchema.parse(req.body);
      const authenticatedUserId = req.user?.uid;
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const limits = await storage.checkUserLimits(authenticatedUserId, "create_list");
      if (!limits.allowed) {
        return res.status(403).json({
          error: "Subscription limit reached",
          message: `You've reached the limit of ${limits.limit} lists for your ${limits.tier} plan. Please upgrade to create more lists.`,
          tier: limits.tier,
          limit: limits.limit,
          current: limits.current,
          upgradeRequired: true
        });
      }
      const checklistData = {
        ...validatedData,
        userId: authenticatedUserId,
        remarks: validatedData.remarks || "",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const newChecklist = await storage.createChecklist(checklistData);
      await storage.incrementUserUsage(authenticatedUserId, "sync");
      res.status(201).json(newChecklist);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });
  app2.put(`${API_BASE}/checklists/:id`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const authenticatedUserId = req.user?.uid;
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const validatedData = checklistSchema.parse(req.body);
      if (req.params.id !== validatedData.id) {
        return res.status(400).json({ message: "ID in URL does not match ID in request body" });
      }
      const checklistData = {
        ...validatedData,
        remarks: validatedData.remarks || "",
        updatedAt: /* @__PURE__ */ new Date(),
        createdAt: existingChecklist.createdAt,
        userId: existingChecklist.userId
      };
      const updatedChecklist = await storage.updateChecklist(checklistData);
      if (!updatedChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.json(updatedChecklist);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete(`${API_BASE}/checklists/:id`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const authenticatedUserId = req.user?.uid;
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const success = await storage.deleteChecklist(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch(`${API_BASE}/checklists/:checklistId/tasks/:taskId`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const { checklistId, taskId } = req.params;
      const authenticatedUserId = req.user?.uid;
      const existingChecklist = await storage.getChecklistById(checklistId);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      if (!authenticatedUserId || existingChecklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = req.body;
      const updatedTask = await storage.updateTask(checklistId, taskId, updates);
      if (!updatedTask) {
        return res.status(404).json({ message: "Checklist or task not found" });
      }
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get(`${API_BASE}/languages`, (req, res) => {
    res.json(AVAILABLE_LANGUAGES);
  });
  app2.post(`${API_BASE}/translate/text`, async (req, res) => {
    try {
      const { text: text2, targetLanguage, sourceLanguage } = req.body;
      if (!text2 || !targetLanguage) {
        return res.status(400).json({
          message: "Missing required fields: text, targetLanguage"
        });
      }
      const translatedText = await translateText(
        text2,
        targetLanguage,
        sourceLanguage
      );
      res.json({ original: text2, translated: translatedText });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/translate/checklist/:id`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const { targetLanguage, sourceLanguage, userId } = req.body;
      const authenticatedUserId = req.user?.uid;
      console.log("Translation request received:", { id: req.params.id, targetLanguage, sourceLanguage, userId });
      if (!authenticatedUserId || userId && userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!targetLanguage) {
        return res.status(400).json({
          message: "Missing required field: targetLanguage"
        });
      }
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          const allowedLanguages = user.allowedLanguages || ["en", "es"];
          if (!allowedLanguages.includes(targetLanguage)) {
            return res.status(403).json({
              error: "Language not allowed",
              message: `Translation to ${targetLanguage} is not available in your ${user.subscriptionTier} plan. Please upgrade to access more languages.`,
              tier: user.subscriptionTier,
              allowedLanguages,
              upgradeRequired: true
            });
          }
        }
      }
      const checklist = await storage.getChecklistById(req.params.id);
      console.log("Found checklist for translation:", checklist ? "Yes" : "No");
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      if (checklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      console.log("Starting translation process...");
      const translatedChecklist = await translateChecklist(
        checklist,
        targetLanguage,
        sourceLanguage
      );
      await storage.incrementUserUsage(authenticatedUserId, "language");
      console.log("Translation completed successfully");
      res.json(translatedChecklist);
    } catch (error) {
      console.error("Translation endpoint error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/verification/generate`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const { checklistId, recipientId, targetLanguage } = req.body;
      if (!checklistId) return res.status(400).json({ error: "checklistId required" });
      const rid = recipientId || `link_${Date.now()}`;
      const { token } = await createVerification(rid, void 0, void 0, checklistId, targetLanguage || "en");
      await storage.markVerificationAsVerified(token);
      const isProduction = process.env.NODE_ENV === "production";
      const protocol = isProduction ? "https" : req.protocol || "http";
      const host = isProduction ? "www.listssync.ai" : req.get("host") || "localhost:5000";
      let shareUrl = `${protocol}://${host}/shared/${token}`;
      if (targetLanguage && targetLanguage !== "en") shareUrl += `?lang=${targetLanguage}`;
      res.json({ token, shareUrl });
    } catch (error) {
      console.error("Error generating share link:", error);
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });
  app2.post(`${API_BASE}/verification/send`, verificationRateLimit, async (req, res) => {
    console.log("================================================");
    console.log("\u{1F4E8} VERIFICATION REQUEST RECEIVED");
    console.log("================================================");
    try {
      let { recipientId, email, phone, checklistId, recipientName, targetLanguage } = req.body;
      const isProduction = process.env.NODE_ENV === "production";
      const maskedEmail = email ? formatEmailForDisplay(email) : void 0;
      const maskedPhone = phone ? formatPhoneForDisplay(phone) : void 0;
      if (isProduction) {
        console.log("\u{1F4E8} verification/send request:", {
          checklistId,
          recipientId,
          recipientName: recipientName || null,
          targetLanguage: targetLanguage || "en",
          hasEmail: !!email,
          hasPhone: !!phone,
          maskedEmail,
          maskedPhone
        });
      } else {
        console.log("\u{1F4DD} verification/send raw request body:", req.body);
        console.log("\u{1F4DD} verification/send request headers:", req.headers);
        console.log("\u{1F4DD} Environment:", process.env.NODE_ENV || "not set");
        console.log("\u{1F4CB} verification/send parsed fields:", {
          recipientId,
          email,
          phone,
          checklistId,
          recipientName,
          targetLanguage
        });
        console.log("\u{1F511} SENDGRID_API_KEY available:", !!process.env.SENDGRID_API_KEY);
        console.log("\u{1F511} TWILIO_ACCOUNT_SID available:", !!process.env.TWILIO_ACCOUNT_SID);
      }
      if (!email && !phone) {
        console.error("\u274C Verification request missing both email and phone");
        return res.status(400).json({
          message: "Missing required fields: either email or phone must be provided"
        });
      }
      if (!checklistId) {
        console.error("\u274C Verification request missing checklistId");
        return res.status(400).json({
          message: "Missing required field: checklistId"
        });
      }
      if (phone) {
        const cleanedPhone = phone.replace(/\D/g, "");
        if (cleanedPhone !== phone) {
          console.log(`\u{1F4F1} Cleaned phone number from ${phone} to ${cleanedPhone}`);
          phone = cleanedPhone;
        }
        if (!phone.startsWith("+")) {
          if (phone.length === 10) {
            phone = `+1${phone}`;
            console.log(`\u{1F4F1} Formatted US phone number to E.164: ${phone}`);
          } else {
            phone = `+${phone}`;
            console.log(`\u{1F4F1} Added + prefix to phone: ${phone}`);
          }
        }
      }
      if (!recipientId) {
        recipientId = `recipient_${Date.now()}`;
        console.log(`\u{1F4CC} Generated recipientId: ${recipientId}`);
      }
      if (phone) {
        const cleanedPhone = phone.replace(/\D/g, "");
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
      console.log(`\u2705 Verification created with token: ${token}, code: ${code}`);
      const requiresCode = Boolean(phone && !email);
      let sendSuccess = false;
      if (email) {
        console.log("================================================");
        console.log(`\u{1F4E7} Attempting to send verification email to: ${email}`);
        console.log(`\u{1F4E7} Code: ${code}`);
        console.log(`\u{1F4E7} SENDGRID_API_KEY status: ${!!process.env.SENDGRID_API_KEY ? "Present" : "Missing"}`);
        console.log(`\u{1F4E7} SENDER_EMAIL: greyson@listssync.ai`);
        console.log("================================================");
        try {
          const emailSuccess = await Promise.race([
            sendVerificationEmail2(email, code, token),
            new Promise((resolve) => setTimeout(() => {
              console.log("\u{1F4E7} Email send operation timed out after 10 seconds");
              resolve(false);
            }, 1e4))
          ]);
          if (emailSuccess) {
            console.log(`\u2705 Successfully sent verification email to: ${email}`);
            sendSuccess = true;
            await storage.markVerificationAsVerified(token);
          } else {
            console.error(`\u274C Failed to send verification email to ${email}`);
            console.error(`\u{1F4E7} Verification email failure details:`);
            console.error(`- Email: ${email.substring(0, 3)}...${email.substring(email.indexOf("@"))}`);
            console.error(`- Environment: ${process.env.NODE_ENV}`);
            if (process.env.NODE_ENV === "development") {
              console.log(`\u2139\uFE0F Continuing verification flow despite email failure (development only)`);
              sendSuccess = true;
            } else {
              return res.status(500).json({ message: "Failed to send verification email. Please try again or use phone verification." });
            }
          }
        } catch (emailError) {
          console.error(`\u274C Exception during verification email sending:`, emailError.message);
          console.error(`\u274C Stack trace: ${emailError.stack}`);
          return res.status(500).json({
            message: `Email verification error: ${emailError.message}`
          });
        }
      }
      if (phone) {
        console.log(`Attempting to send verification SMS to: ${phone}`);
        console.log("TWILIO CONFIG CHECK (ROUTES LEVEL):");
        console.log("TWILIO_ACCOUNT_SID status:", process.env.TWILIO_ACCOUNT_SID ? "Present" : "Missing");
        console.log("TWILIO_AUTH_TOKEN status:", process.env.TWILIO_AUTH_TOKEN ? "Present" : "Missing");
        console.log("TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER || "Missing");
        console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
        try {
          const smsSuccess = await sendVerificationSMS(phone, code, token);
          if (smsSuccess) {
            console.log(`Successfully sent verification SMS to: ${phone}`);
            sendSuccess = true;
          } else {
            console.error(`Failed to send verification SMS to ${phone}`);
            if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
              console.log("\u26A0\uFE0F Twilio credentials missing or not properly configured");
              if (process.env.NODE_ENV === "production") {
                return res.status(500).json({
                  message: "SMS verification is currently unavailable. Please try email verification instead.",
                  type: "error"
                });
              } else {
                console.log(`\u{1F4F1} Verification code for ${phone}: ${code}`);
                sendSuccess = true;
              }
            }
          }
        } catch (smsError) {
          console.error("SMS SENDING ERROR (CAUGHT AT ROUTES LEVEL):", smsError);
          if (process.env.NODE_ENV === "development") {
            console.log("\u26A0\uFE0F SMS sending failed, but allowing verification flow to continue");
            console.log(`\u{1F4F1} Verification code in development: ${code}`);
            sendSuccess = true;
          } else {
            console.error("\u26A0\uFE0F SMS verification failed in production environment");
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
      let protocol = "https";
      let host = "www.listssync.ai";
      if (process.env.NODE_ENV === "development") {
        protocol = req.protocol || "http";
        host = req.get("host") || "localhost:5000";
      }
      console.log(`DEBUG URL GENERATION:
- Protocol: ${protocol}
- Host: ${host}
- Token: ${token}
- Environment: ${process.env.NODE_ENV || "unknown"}`);
      if (!token) {
        console.error("\u274C Failed to generate verification token");
        return res.status(500).json({ message: "Failed to generate share link. Please try again." });
      }
      let shareUrl = `${protocol}://${host}/shared/${token}`;
      if (targetLanguage && targetLanguage !== "en") {
        shareUrl += `?lang=${targetLanguage}`;
      }
      console.log(`\u2705 Generated share URL: ${shareUrl}`);
      const response = {
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
      const isMissingTwilioCredentials = !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER;
      if (process.env.NODE_ENV === "development") {
        response.verificationCode = code;
        response.debug = {
          environment: "development",
          twilioStatus: isMissingTwilioCredentials ? "missing credentials" : "configured"
        };
      }
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/verification/verify`, async (req, res) => {
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
      if (verification.expiresAt < /* @__PURE__ */ new Date()) {
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
        targetLanguage: verification.targetLanguage || "en",
        message: "Verification successful"
      });
    } catch (error) {
      console.error("Unexpected error in verification endpoint:", error);
      return res.status(500).json({ verified: false, message: "Internal server error" });
    }
  });
  if (process.env.NODE_ENV === "development") {
    app2.post(`${API_BASE}/debug/test-sms`, async (req, res) => {
      try {
        const { phone } = req.body;
        if (!phone) {
          return res.status(400).json({ success: false, message: "Phone number is required" });
        }
        console.log("\u{1F9EA} Testing SMS to phone:", phone);
        console.log("TWILIO CONFIG CHECK:");
        console.log("TWILIO_ACCOUNT_SID status:", process.env.TWILIO_ACCOUNT_SID ? "Present" : "Missing");
        console.log("TWILIO_AUTH_TOKEN status:", process.env.TWILIO_AUTH_TOKEN ? "Present" : "Missing");
        console.log("TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER);
        const testCode = Math.floor(1e5 + Math.random() * 9e5).toString();
        const testMessage = `This is a test message from ListsSync.ai. Your verification code is: ${testCode}`;
        try {
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
          let formattedPhone = phone;
          if (!phone.startsWith("+")) {
            if (phone.length === 10) {
              formattedPhone = `+1${phone}`;
            } else {
              formattedPhone = `+${phone}`;
            }
          }
          console.log(`\u{1F4F1} Formatted phone number: ${formattedPhone}`);
          const twilio2 = await import("twilio").then((module) => module.default);
          const client = twilio2(accountSid, authToken);
          const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          const msgParams = { body: testMessage, to: formattedPhone };
          if (messagingServiceSid) {
            msgParams.messagingServiceSid = messagingServiceSid;
          } else {
            msgParams.from = twilioPhone;
          }
          const message = await client.messages.create(msgParams);
          console.log(`\u2705 Test SMS sent successfully. SID: ${message.sid}`);
          return res.json({
            success: true,
            message: `Test SMS sent to ${formattedPhone}`,
            testCode,
            twilioMessageSid: message.sid,
            status: message.status
          });
        } catch (error) {
          console.error("\u274C Twilio SMS Error:", error);
          let errorDetails = {
            message: error.message || "Unknown error"
          };
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
        console.error("\u274C Test SMS endpoint error:", error);
        return res.status(500).json({
          success: false,
          message: "Server error when testing SMS"
        });
      }
    });
    app2.post(`${API_BASE}/debug/test-email`, async (req, res) => {
      console.log("\u{1F9EA} TEST EMAIL ENDPOINT called (DEV MODE ONLY)");
      try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }
        console.log(`\u{1F9EA} Attempting to send a test email to ${email}`);
        const testCode = Math.floor(1e5 + Math.random() * 9e5).toString();
        const result = await sendVerificationEmail2(email, testCode);
        console.log(`\u{1F9EA} Test email sending result: ${result ? "SUCCESS" : "FAILED"}`);
        return res.json({
          success: true,
          message: `Test email ${result ? "sent" : "attempted"} with code: ${testCode}`,
          code: testCode
        });
      } catch (error) {
        console.error("\u{1F9EA} Test email error:", error);
        return res.status(500).json({
          success: false,
          message: `Error sending test email: ${error.message || "Unknown error"}`
        });
      }
    });
  } else {
    app2.post(`${API_BASE}/debug/test-email`, (req, res) => {
      console.warn("\u26A0\uFE0F Someone tried to access the debug email endpoint in production mode");
      res.status(404).json({ error: "Not found" });
    });
  }
  app2.get(`${API_BASE}/shared/checklist`, async (req, res) => {
    try {
      const { token } = req.query;
      console.log(`Fetching shared checklist with token: ${token ? "provided" : "none"}`);
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required"
        });
      }
      const verification = await storage.getVerificationByToken(token);
      if (!verification) {
        return res.status(404).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      if (!verification.verified) {
        return res.status(403).json({ success: false, message: "Verification required" });
      }
      if (verification.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(410).json({ success: false, message: "Verification token has expired" });
      }
      console.log(`Found verification record for token: ${token}, checklist: ${verification.checklistId}, language: ${verification.targetLanguage}`);
      if (!verification.checklistId) {
        return res.status(404).json({ success: false, message: "No checklist linked to this token" });
      }
      let checklist = await storage.getChecklistById(verification.checklistId);
      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: "Checklist not found"
        });
      }
      let finalChecklist = checklist;
      let effectiveTargetLanguage = verification.targetLanguage || "en";
      let translationApplied = false;
      if (effectiveTargetLanguage && effectiveTargetLanguage !== "en") {
        console.log(`Translating checklist to: ${effectiveTargetLanguage}`);
        try {
          const { translateChecklist: translateChecklist2 } = await Promise.resolve().then(() => (init_geminiTranslationService(), geminiTranslationService_exports));
          const validLanguages = ["en", "es", "fr", "de", "pt", "zh", "ru", "ja", "ar", "hi"];
          if (validLanguages.includes(effectiveTargetLanguage)) {
            finalChecklist = await translateChecklist2(checklist, effectiveTargetLanguage, "en");
            translationApplied = finalChecklist !== checklist && finalChecklist?.translatedTo === effectiveTargetLanguage;
            if (!translationApplied) {
              effectiveTargetLanguage = "en";
            }
          } else {
            finalChecklist = checklist;
            effectiveTargetLanguage = "en";
          }
          console.log(`Successfully translated checklist to ${effectiveTargetLanguage}`);
        } catch (translationError) {
          console.error("Translation failed, serving original checklist:", translationError);
          finalChecklist = checklist;
          effectiveTargetLanguage = "en";
        }
      }
      console.log(`Serving checklist in target language: ${effectiveTargetLanguage}`);
      res.json({ success: true, checklist: finalChecklist, targetLanguage: effectiveTargetLanguage, translationApplied });
    } catch (error) {
      console.error("Error fetching shared checklist:", error);
      res.status(500).json({ success: false, message: "Failed to fetch checklist" });
    }
  });
  app2.get(`${API_BASE}/shared/checklist/:checklistId`, async (req, res) => {
    try {
      const { checklistId } = req.params;
      const { token } = req.query;
      console.log(`Fetching shared checklist: ${checklistId}, token: ${token ? "provided" : "none"}`);
      if (!token || typeof token !== "string") {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      const verification = await storage.getVerificationByToken(token);
      if (!verification) {
        return res.status(404).json({ success: false, message: "Invalid or expired token" });
      }
      if (!verification.verified) {
        return res.status(403).json({ success: false, message: "Verification required" });
      }
      if (verification.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(410).json({ success: false, message: "Verification token has expired" });
      }
      if (verification.checklistId !== checklistId) {
        return res.status(403).json({ success: false, message: "Token does not match requested checklist" });
      }
      const checklist = await storage.getChecklistById(checklistId);
      if (!checklist) {
        console.log(`Checklist ${checklistId} not found in any data source`);
        return res.status(404).json({
          success: false,
          message: "Checklist not found"
        });
      }
      let effectiveTargetLanguage = verification.targetLanguage || "en";
      let finalChecklist = checklist;
      let translationApplied = false;
      if (effectiveTargetLanguage && effectiveTargetLanguage !== "en") {
        console.log(`Translating checklist to: ${effectiveTargetLanguage}`);
        try {
          const { translateChecklist: translateChecklist2 } = await Promise.resolve().then(() => (init_geminiTranslationService(), geminiTranslationService_exports));
          const validLanguages = ["en", "es", "fr", "de", "pt", "zh", "ru", "ja", "ar", "hi"];
          if (validLanguages.includes(effectiveTargetLanguage)) {
            finalChecklist = await translateChecklist2(checklist, effectiveTargetLanguage, "en");
            translationApplied = finalChecklist !== checklist && finalChecklist?.translatedTo === effectiveTargetLanguage;
            if (!translationApplied) {
              effectiveTargetLanguage = "en";
            }
          } else {
            finalChecklist = checklist;
            effectiveTargetLanguage = "en";
          }
          console.log(`Successfully translated checklist to ${effectiveTargetLanguage}`);
        } catch (translationError) {
          console.error("Translation failed, serving original checklist:", translationError);
          finalChecklist = checklist;
          effectiveTargetLanguage = "en";
        }
      }
      console.log(`Serving checklist in target language: ${effectiveTargetLanguage}`);
      res.json({ success: true, checklist: finalChecklist, targetLanguage: effectiveTargetLanguage, translationApplied });
    } catch (error) {
      console.error("Error fetching shared checklist:", error);
      res.status(500).json({ success: false, message: "Failed to fetch checklist" });
    }
  });
  app2.get(`${API_BASE}/verification/status/:token`, async (req, res) => {
    try {
      const rawToken = req.params.token;
      const token = decodeURIComponent(rawToken).split("?")[0];
      const verification = await getVerification(token);
      if (!verification) {
        return res.status(404).json({ message: "Verification token not found" });
      }
      const expired = verification.expiresAt < /* @__PURE__ */ new Date();
      return res.json({
        verified: verification.verified,
        expired,
        recipientId: verification.recipientId,
        checklistId: verification.checklistId || null,
        targetLanguage: verification.targetLanguage || "en",
        maskedEmail: verification.recipientEmail ? formatEmailForDisplay(verification.recipientEmail) : void 0,
        maskedPhone: verification.recipientPhone ? formatPhoneForDisplay(verification.recipientPhone) : void 0
      });
    } catch (error) {
      console.error("Error in verification status check:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/checklists/:id/share`, requireAuth, betaModeGuard, async (req, res) => {
    try {
      const { id } = req.params;
      const { recipientEmail, recipientPhone, recipientName, targetLanguage } = req.body;
      const authenticatedUserId = req.user?.uid;
      const checklist = await storage.getChecklistById(id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      if (!authenticatedUserId || checklist.userId !== authenticatedUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!recipientEmail && !recipientPhone) {
        return res.status(400).json({
          message: "Missing recipient contact information: email or phone required"
        });
      }
      const recipientId = Math.random().toString(36).substring(2, 15);
      const { token, code } = await createVerification(
        recipientId,
        recipientEmail,
        recipientPhone,
        id,
        targetLanguage
      );
      const protocol = SITE_CONFIG.protocol || req.protocol;
      const host = SITE_CONFIG.host || req.get("host");
      const shareUrl = `${protocol}://${host}/shared/${token}`;
      if (recipientEmail) {
        const emailSent = await sendVerificationEmail2(recipientEmail, code, token);
        if (!emailSent) {
          return res.status(502).json({ message: "Failed to send verification email" });
        }
      }
      if (recipientPhone) {
        const smsSent = await sendVerificationSMS(recipientPhone, code, token);
        if (!smsSent) {
          return res.status(502).json({ message: "Failed to send verification SMS" });
        }
      }
      res.json({
        shareUrl,
        token,
        recipientId,
        message: "Verification code sent to recipient"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post(`${API_BASE}/sms-consent`, async (req, res) => {
    try {
      const { phoneNumber, firstName, lastName, consentedAt, ipAddress, userAgent } = req.body;
      if (!phoneNumber || !firstName || !lastName) {
        return res.status(400).json({ message: "Phone number, first name, and last name are required" });
      }
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
      console.log(`\u{1F4F1} Recording SMS consent for: ${phoneNumber}`);
      const existing = await storage.getSmsConsent(phoneNumber);
      if (existing && existing.isActive) {
        return res.json({
          success: true,
          message: "SMS consent already recorded for this phone number",
          consent: existing
        });
      }
      const consentData = {
        phoneNumber,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        consentedAt: consentedAt ? new Date(consentedAt) : /* @__PURE__ */ new Date(),
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get("User-Agent"),
        isActive: true
      };
      const savedConsent = await storage.recordSmsConsent(consentData);
      console.log(`\u2705 SMS consent recorded for ${phoneNumber}`);
      res.json({
        success: true,
        message: "SMS consent recorded successfully",
        consent: savedConsent
      });
    } catch (error) {
      console.error("Error recording SMS consent:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record SMS consent"
      });
    }
  });
  app2.get(`${API_BASE}/sms-consent/:phoneNumber`, async (req, res) => {
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
    } catch (error) {
      console.error("Error retrieving SMS consent:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve SMS consent"
      });
    }
  });
  app2.delete(`${API_BASE}/sms-consent/:phoneNumber`, async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const success = await storage.revokeSmsConsent(phoneNumber);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "No SMS consent found to revoke"
        });
      }
      console.log(`\u{1F6AB} SMS consent revoked for ${phoneNumber}`);
      res.json({
        success: true,
        message: "SMS consent revoked successfully"
      });
    } catch (error) {
      console.error("Error revoking SMS consent:", error);
      res.status(500).json({
        success: false,
        message: "Failed to revoke SMS consent"
      });
    }
  });
  app2.post(`${API_BASE}/mailing-list/subscribe`, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const cleanEmail = email.trim().toLowerCase();
      console.log(`\u{1F4E7} Mailing list subscription request for: ${cleanEmail}`);
      const existing = await storage.getMailingListSubscription(cleanEmail);
      if (existing) {
        return res.json({
          success: true,
          message: "You're already subscribed to our mailing list"
        });
      }
      const confirmationToken = `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const userAgent = req.get("User-Agent") || void 0;
      const ipAddress = req.ip || req.connection.remoteAddress || void 0;
      const subscription = await storage.subscribeToMailingList({
        email: cleanEmail,
        confirmed: false,
        confirmationToken,
        source: "development_banner",
        leadType: "marketing_lead",
        userAgent,
        ipAddress,
        subscribedAt: /* @__PURE__ */ new Date()
      });
      try {
        const confirmationUrl = `${req.protocol}://${req.get("host")}/api/mailing-list/confirm/${confirmationToken}`;
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
        const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_emailService(), emailService_exports));
        await sendEmail2({
          to: cleanEmail,
          subject: "Confirm your ListsSync.ai subscription",
          text: `Please confirm your subscription by visiting: ${confirmationUrl}`,
          html: emailHtml
        });
        console.log(`\u2705 Confirmation email sent to ${cleanEmail}`);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
      res.json({
        success: true,
        message: "Please check your email to confirm your subscription"
      });
    } catch (error) {
      console.error("Mailing list subscription error:", error);
      res.status(500).json({ message: "Failed to subscribe to mailing list" });
    }
  });
  app2.get(`${API_BASE}/mailing-list/confirm/:token`, async (req, res) => {
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
    } catch (error) {
      console.error("Email confirmation error:", error);
      res.status(500).send("Internal server error");
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connections = /* @__PURE__ */ new Map();
  wss.on("connection", (ws2) => {
    let checklistId = null;
    let userId = null;
    ws2.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "subscribe") {
          checklistId = data.checklistId;
          userId = data.userId;
          if (checklistId) {
            if (!connections.has(checklistId)) {
              connections.set(checklistId, /* @__PURE__ */ new Set());
            }
            connections.get(checklistId)?.add(ws2);
            ws2.send(JSON.stringify({
              type: "subscribed",
              checklistId
            }));
          }
        }
        if (data.type === "update" && data.checklistId) {
          const clients = connections.get(data.checklistId);
          if (clients) {
            clients.forEach((client) => {
              if (client !== ws2 && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: "update",
                  checklistId: data.checklistId,
                  data: data.data,
                  userId: data.userId,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws2.on("close", () => {
      if (checklistId && connections.has(checklistId)) {
        connections.get(checklistId)?.delete(ws2);
        if (connections.get(checklistId)?.size === 0) {
          connections.delete(checklistId);
        }
      }
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { default: viteConfig } = await import("../vite.config");
  const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not Found" });
  });
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/validateEnv.ts
function validateEnv() {
  const required = ["DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"];
  const optional = [
    "SENDGRID_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_MESSAGING_SERVICE_SID",
    "GEMINI_API_KEY",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_PROJECT_ID",
    "STRIPE_WEBHOOK_SECRET"
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`\u274C Missing required env vars: ${missing.join(", ")}`);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  console.log("\u2705 Required env vars OK");
  const missingOptional = optional.filter((k) => !process.env[k]);
  if (missingOptional.length > 0) {
    console.warn(`\u26A0\uFE0F  Missing optional env vars (some features disabled): ${missingOptional.join(", ")}`);
  }
}

// server/index.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
      );
      initializeApp({ credential: cert(serviceAccount) });
      console.log("\u2705 Firebase Admin initialized with service account");
    } catch (e) {
      console.warn("\u26A0\uFE0F  Firebase Admin: failed to parse service account, falling back to default");
      initializeApp();
    }
  } else {
    console.log("\u2139\uFE0F  Firebase Admin: no service account configured (dev mode \u2014 JWT decode fallback active)");
    initializeApp();
  }
}
validateEnv();
console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("TWILIO_ACCOUNT_SID exists:", !!process.env.TWILIO_ACCOUNT_SID);
console.log("TWILIO_AUTH_TOKEN exists:", !!process.env.TWILIO_AUTH_TOKEN);
console.log("TWILIO_PHONE_NUMBER exists:", !!process.env.TWILIO_PHONE_NUMBER);
console.log("Twilio SID first chars:", process.env.TWILIO_ACCOUNT_SID?.substring(0, 5));
console.log("Twilio Auth first chars:", process.env.TWILIO_AUTH_TOKEN?.substring(0, 5));
console.log("Twilio Phone:", process.env.TWILIO_PHONE_NUMBER);
console.log("================================");
var app = express2();
app.set("trust proxy", 1);
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (host === "listssync.ai") {
    return res.redirect(301, `https://www.listssync.ai${req.url}`);
  }
  next();
});
app.get("/api/health", (_req, res) => {
  res.status(200).send("OK");
});
app.get("/terms", (_req, res) => {
  res.redirect(301, "/terms.html");
});
app.get("/privacy-policy", (_req, res) => {
  res.redirect(301, "/privacy-policy.html");
});
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not Found" });
  });
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "3001");
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
