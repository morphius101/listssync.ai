import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  
  // API base path
  const API_BASE = "/api";

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
  
  // Add user endpoint to get current user info
  app.get(`${API_BASE}/auth/user`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all checklists (protected route)
  app.get(`${API_BASE}/checklists`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checklists = await storage.getAllChecklists(userId);
      res.json(checklists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get checklist by ID (protected route)
  app.get(`${API_BASE}/checklists/:id`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checklist = await storage.getChecklistById(req.params.id);
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      // Only allow access to user's own checklists or shared checklists
      if (checklist.userId && checklist.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this checklist" });
      }
      
      res.json(checklist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new checklist (protected route)
  app.post(`${API_BASE}/checklists`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = checklistSchema.parse({
        ...req.body,
        userId // Associate checklist with current user
      });
      
      // Add createdAt and updatedAt timestamps since they're required by ChecklistDTO
      const checklistData = {
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newChecklist = await storage.createChecklist(checklistData);
      res.status(201).json(newChecklist);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update checklist (protected route)
  app.put(`${API_BASE}/checklists/:id`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if the checklist belongs to the current user
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      // Check ownership
      if (existingChecklist.userId && existingChecklist.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this checklist" });
      }
      
      const validatedData = checklistSchema.parse(req.body);
      
      if (req.params.id !== validatedData.id) {
        return res.status(400).json({ message: "ID in URL does not match ID in request body" });
      }
      
      // Add timestamps and preserve userId
      const checklistData = {
        ...validatedData,
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

  // Delete checklist (protected route)
  app.delete(`${API_BASE}/checklists/:id`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if the checklist belongs to the current user
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      // Check ownership
      if (existingChecklist.userId && existingChecklist.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this checklist" });
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

  // Update task status (protected route)
  app.patch(`${API_BASE}/checklists/:checklistId/tasks/:taskId`, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { checklistId, taskId } = req.params;
      
      // Check if the checklist belongs to the current user
      const existingChecklist = await storage.getChecklistById(checklistId);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      // Check ownership
      if (existingChecklist.userId && existingChecklist.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this checklist" });
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

  const httpServer = createServer(app);
  return httpServer;
}
