import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
});

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
});

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
