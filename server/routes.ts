import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Get all checklists
  app.get(`${API_BASE}/checklists`, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const checklists = await storage.getAllChecklists(userId);
      res.json(checklists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get checklist by ID
  app.get(`${API_BASE}/checklists/:id`, async (req, res) => {
    try {
      const checklist = await storage.getChecklistById(req.params.id);
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      res.json(checklist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new checklist
  app.post(`${API_BASE}/checklists`, async (req, res) => {
    try {
      const validatedData = checklistSchema.parse(req.body);
      
      // Add createdAt and updatedAt timestamps since they're required by ChecklistDTO
      const checklistData = {
        ...validatedData,
        remarks: validatedData.remarks || "",
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

  // Update checklist
  app.put(`${API_BASE}/checklists/:id`, async (req, res) => {
    try {
      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
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
  app.delete(`${API_BASE}/checklists/:id`, async (req, res) => {
    try {
      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
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
  app.patch(`${API_BASE}/checklists/:checklistId/tasks/:taskId`, async (req, res) => {
    try {
      const { checklistId, taskId } = req.params;
      
      // Check if checklist exists
      const existingChecklist = await storage.getChecklistById(checklistId);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist not found" });
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
