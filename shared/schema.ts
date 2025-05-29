import { pgTable, index, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  id: serial("id").primaryKey(),
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
  code: varchar("code", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  recipientId: text("recipient_id").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  checklistId: text("checklist_id"),
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

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
});

export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verifications.$inferSelect;

export interface VerificationDTO {
  token: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  checklistId?: string;
  targetLanguage?: string;
}
