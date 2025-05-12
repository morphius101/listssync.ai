import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { 
  translateChecklist, 
  translateText, 
  AVAILABLE_LANGUAGES,
  type LanguageCode 
} from "./services/translationService";
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

  app.post(`${API_BASE}/translate/checklist/:id`, async (req, res) => {
    try {
      const { targetLanguage, sourceLanguage } = req.body;
      
      if (!targetLanguage) {
        return res.status(400).json({ 
          message: "Missing required field: targetLanguage" 
        });
      }
      
      const checklist = await storage.getChecklistById(req.params.id);
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      
      const translatedChecklist = await translateChecklist(
        checklist,
        targetLanguage as LanguageCode,
        sourceLanguage as LanguageCode | undefined
      );
      
      res.json(translatedChecklist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Verification system routes
  app.post(`${API_BASE}/verification/send`, async (req, res) => {
    try {
      // Log the entire request body for debugging
      console.log('verification/send raw request body:', req.body);
      console.log('verification/send request headers:', req.headers);
      
      let { recipientId, email, phone, checklistId, recipientName } = req.body;
      
      console.log('verification/send parsed fields:', { 
        recipientId, 
        email, 
        phone, 
        checklistId, 
        recipientName 
      });
      
      // Input validation with more detailed logging
      if (!email && !phone) {
        console.error("Verification request missing both email and phone");
        return res.status(400).json({ 
          message: "Missing required fields: either email or phone must be provided" 
        });
      }
      
      if (!checklistId) {
        console.error("Verification request missing checklistId");
        return res.status(400).json({ 
          message: "Missing required field: checklistId" 
        });
      }
      
      // Generate a recipientId if not provided
      if (!recipientId) {
        recipientId = `recipient_${Date.now()}`;
        console.log(`Generated recipientId: ${recipientId}`);
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
      
      // Create verification (async with database storage)
      const { token, code } = await createVerification(
        recipientId, 
        email, 
        phone, 
        checklistId
      );
      
      console.log(`Verification created with token: ${token}, code: ${code}`);
      
      // Send verification code
      let sendSuccess = false;
      
      if (email) {
        console.log(`Attempting to send verification email to: ${email}`);
        const emailSuccess = await sendVerificationEmail(email, code);
        if (emailSuccess) {
          console.log(`Successfully sent verification email to: ${email}`);
          sendSuccess = true;
        } else {
          console.error(`Failed to send verification email to ${email}`);
        }
      }
      
      if (phone) {
        console.log(`Attempting to send verification SMS to: ${phone}`);
        const smsSuccess = await sendVerificationSMS(phone, code);
        if (smsSuccess) {
          console.log(`Successfully sent verification SMS to: ${phone}`);
          sendSuccess = true;
        } else {
          console.error(`Failed to send verification SMS to ${phone}`);
        }
      }
      
      if (!sendSuccess) {
        return res.status(500).json({ 
          message: "Failed to send verification code. Please try again." 
        });
      }
      
      // Create share URL with token
      const shareUrl = `${req.protocol}://${req.get('host')}/shared/${token}`;
      
      // Return masked contact info, token, and share URL
      const response: any = { 
        token,
        shareUrl,
        message: "Verification code sent to recipient" 
      };
      
      if (email) {
        response.maskedEmail = formatEmailForDisplay(email);
      }
      
      if (phone) {
        response.maskedPhone = formatPhoneForDisplay(phone);
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
          message: "Missing required fields: token, code" 
        });
      }
      
      const isValid = await verifyCode(token, code);
      
      if (isValid) {
        const verification = await getVerification(token);
        res.json({ 
          verified: true, 
          recipientId: verification?.recipientId,
          checklistId: verification?.checklistId 
        });
      } else {
        res.status(400).json({ 
          verified: false, 
          message: "Invalid or expired verification code" 
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(`${API_BASE}/verification/status/:token`, async (req, res) => {
    try {
      const { token } = req.params;
      
      const verified = await isVerified(token);
      const verification = await getVerification(token);
      
      if (verification) {
        res.json({ 
          verified, 
          expired: verification.expiresAt < new Date(),
          recipientId: verification.recipientId,
          checklistId: verification.checklistId
        });
      } else {
        res.status(404).json({ 
          message: "Verification not found" 
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Share checklist route with mobile-friendly options
  app.post(`${API_BASE}/checklists/:id/share`, async (req, res) => {
    try {
      const { id } = req.params;
      const { recipientEmail, recipientPhone, recipientName } = req.body;
      
      const checklist = await storage.getChecklistById(id);
      
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
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
        id
      );
      
      // Create share URL with token
      const shareUrl = `${req.protocol}://${req.get('host')}/shared/${token}`;
      
      // Send verification via email or SMS
      if (recipientEmail) {
        await sendVerificationEmail(recipientEmail, code);
      }
      
      if (recipientPhone) {
        await sendVerificationSMS(recipientPhone, code);
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
