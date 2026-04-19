import { pgTable, index, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Management Schema for tiered pricing
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Firebase UID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Subscription fields
  subscriptionTier: varchar("subscription_tier").notNull().default("free"), // free, starter, professional, business, enterprise
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"), // active, inactive, past_due, canceled
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Usage tracking
  listSyncCount: integer("list_sync_count").notNull().default(0),
  languageUseCount: integer("language_use_count").notNull().default(0),
  lastSyncAt: timestamp("last_sync_at"),
  // Feature flags
  allowedLanguages: jsonb("allowed_languages").default(['en', 'es']), // JSON array of language codes
  // CRM / onboarding profile
  useCase: varchar("use_case", { length: 100 }),
  teamSize: varchar("team_size", { length: 50 }),
  phone: varchar("phone", { length: 30 }),
  signupMethod: varchar("signup_method", { length: 20 }), // 'google' | 'email'
  signupSource: varchar("signup_source", { length: 50 }),
  trialStartedAt: timestamp("trial_started_at"),
  marketingOptIn: boolean("marketing_opt_in").default(false),
}, (table) => [
  index("users_stripe_customer_idx").on(table.stripeCustomerId),
  index("users_subscription_tier_idx").on(table.subscriptionTier),
  index("users_email_idx").on(table.email),
]);

// Sessions table for user authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Task Schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(),
  description: text("description").notNull(),
  details: text("details"),
  completed: boolean("completed").notNull().default(false),
  photoRequired: boolean("photo_required").notNull().default(false),
  photoUrl: text("photo_url"),
  orderIndex: integer("order_index").notNull().default(0),
}, (table) => ({
  // Index for faster task lookup by checklist
  checklistIdIdx: index("task_checklist_id_idx").on(table.checklistId),
  // Composite index for efficient querying of task status within checklists
  taskStatusIdx: index("task_status_idx").on(table.checklistId, table.completed)
}));

// Checklist Schema
export const checklists = pgTable("checklists", {
  id: text("id").primaryKey(), // Changed to text to support Firebase IDs
  name: text("name").notNull(),
  status: text("status").notNull().default("not-started"),
  progress: integer("progress").notNull().default(0),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  tasksData: jsonb("tasks_data"), // Store tasks as JSON for Firebase compatibility
  shareToken: text("share_token"),
  userId: text("user_id"), // Firebase user ID
}, (table) => ({
  // Index for faster lookup by user
  userIdIdx: index("checklist_user_id_idx").on(table.userId),
  // Index for finding checklists by status
  statusIdx: index("checklist_status_idx").on(table.status),
  // Index for finding shared checklists
  shareTokenIdx: index("checklist_share_token_idx").on(table.shareToken)
}));

// Insert Schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

// Storage interface types - aligned with frontend types
export interface TaskDTO {
  id: string;
  description: string;
  details?: string;
  completed: boolean;
  photoRequired: boolean;
  photoUrl: string | null;
}

export interface ChecklistDTO {
  id: string;
  name: string;
  tasks: TaskDTO[];
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  remarks: string;
  userId?: string;
}

export interface ChecklistSummaryDTO {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Verification Schema for secure access to shared checklists
export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  code: varchar("code", { length: 10 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  recipientId: text("recipient_id").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  checklistId: text("checklist_id"),
  targetLanguage: varchar("target_language", { length: 10 }).default('en'),
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

export const shareAccesses = pgTable("share_accesses", {
  id: serial("id").primaryKey(),
  shareToken: varchar("share_token", { length: 128 }).notNull().references(() => verifications.token),
  firstAccessedAt: timestamp("first_accessed_at").notNull().defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").notNull().defaultNow(),
  ipHash: varchar("ip_hash", { length: 64 }),
  userAgent: text("user_agent"),
  accessCount: integer("access_count").notNull().default(1),
  visitorId: varchar("visitor_id", { length: 36 }),
}, (table) => ({
  tokenIdx: index("share_access_token_idx").on(table.shareToken),
  visitorIdx: index("share_access_visitor_idx").on(table.visitorId),
}));

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
});

export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verifications.$inferSelect;

export interface VerificationDTO {
  token: string;
  code?: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  checklistId?: string;
  targetLanguage?: string;
}

// Mailing List Subscriptions Schema for marketing campaigns
export const mailingListSubscriptions = pgTable("mailing_list_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmationToken: varchar("confirmation_token", { length: 128 }),
  source: varchar("source", { length: 50 }).notNull().default("development_banner"), // Track where they signed up
  leadType: varchar("lead_type", { length: 50 }).notNull().default("marketing_lead"), // Categorize the type of lead
  userAgent: text("user_agent"), // For analytics
  ipAddress: varchar("ip_address", { length: 45 }), // For compliance
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

export const insertMailingListSubscriptionSchema = createInsertSchema(mailingListSubscriptions).omit({
  id: true,
  subscribedAt: true,
});

export type InsertMailingListSubscription = z.infer<typeof insertMailingListSubscriptionSchema>;
export type MailingListSubscription = typeof mailingListSubscriptions.$inferSelect;

export interface MailingListSubscriptionDTO {
  id?: number;
  email: string;
  subscribedAt: Date;
  confirmed: boolean;
  confirmationToken?: string;
  source: string;
  leadType: string;
  userAgent?: string;
  ipAddress?: string;
}

// User management types
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export interface UserDTO {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  subscriptionTier: 'free' | 'professional' | 'enterprise';
  subscriptionStatus?: string;
  subscriptionEndsAt?: Date;
  listSyncCount: number;
  languageUseCount: number;
  allowedLanguages: string[];
}

// Subscription tier limits based on competitive analysis
export const TIER_LIMITS = {
  free: {
    maxLists: 5,
    maxUsers: 1,
    syncFrequency: '6hours',
    allowedLanguages: ['en', 'es'],
    maxLanguages: 2,
    storageGB: 1,
    features: ['manual_sync', 'basic_translation', 'mobile_access']
  },
  professional: {
    maxLists: 100,
    maxUsers: 10,
    syncFrequency: 'realtime',
    maxLanguages: 15,
    storageGB: 50,
    features: ['realtime_sync', 'advanced_analytics', 'integrations', 'workflow_automation', 'api_access', 'team_collaboration', 'priority_support']
  },
  enterprise: {
    maxLists: Infinity,
    maxUsers: Infinity,
    syncFrequency: 'realtime',
    maxLanguages: Infinity,
    storageGB: Infinity,
    features: ['unlimited_everything', 'custom_deployment', 'enterprise_sla', 'custom_integrations', 'onboarding']
  }
} as const;

export const smsConsents = pgTable("sms_consents", {
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

export const insertSmsConsentSchema = createInsertSchema(smsConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertSmsConsent = z.infer<typeof insertSmsConsentSchema>;
export type SmsConsent = typeof smsConsents.$inferSelect;

export interface SmsConsentDTO {
  id?: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  consentedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive?: boolean;
}

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

// Leads table — captures partial signups for abandonment recovery
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  converted: boolean("converted").notNull().default(false),
}, (table) => ({
  emailIdx: index("leads_email_idx").on(table.email),
}));

export type Lead = typeof leads.$inferSelect;

// Waitlist table — beta mode email capture
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  userAgent: text("user_agent"),
  ipHash: varchar("ip_hash", { length: 64 }),
}, (table) => ({
  emailIdx: index("waitlist_email_idx").on(table.email),
}));

export type Waitlist = typeof waitlist.$inferSelect;
