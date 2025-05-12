import { 
  ChecklistDTO, 
  TaskDTO, 
  ChecklistSummaryDTO, 
  VerificationDTO,
  checklists, 
  tasks,
  verifications 
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface IStorage {
  getAllChecklists(userId?: string): Promise<ChecklistSummaryDTO[]>;
  getChecklistById(id: string): Promise<ChecklistDTO | undefined>;
  createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO>;
  updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined>;
  deleteChecklist(id: string): Promise<boolean>;
  updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined>;
  
  // Verification methods for scalable access control
  createVerification(verification: VerificationDTO): Promise<VerificationDTO>;
  getVerificationByToken(token: string): Promise<VerificationDTO | undefined>;
  markVerificationAsVerified(token: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {

  async getAllChecklists(userId?: string): Promise<ChecklistSummaryDTO[]> {
    // Base query
    let dbChecklists;
    
    // If userId is provided, filter checklists by user
    if (userId) {
      dbChecklists = await db.select().from(checklists).where(eq(checklists.userId, userId));
    } else {
      dbChecklists = await db.select().from(checklists);
    }
    
    return dbChecklists.map(checklist => {
      const tasksData = checklist.tasksData as TaskDTO[] || [];
      
      return {
        id: checklist.id.toString(),
        name: checklist.name,
        status: checklist.status as 'not-started' | 'in-progress' | 'completed',
        progress: checklist.progress,
        taskCount: tasksData.length,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt
      };
    });
  }

  async getChecklistById(id: string): Promise<ChecklistDTO | undefined> {
    const [dbChecklist] = await db.select().from(checklists).where(eq(checklists.id, parseInt(id)));
    
    if (!dbChecklist) {
      return undefined;
    }
    
    const tasksData = dbChecklist.tasksData as TaskDTO[] || [];
    
    return {
      id: dbChecklist.id.toString(),
      name: dbChecklist.name,
      status: dbChecklist.status as 'not-started' | 'in-progress' | 'completed',
      progress: dbChecklist.progress,
      tasks: tasksData,
      remarks: dbChecklist.remarks || "",
      createdAt: dbChecklist.createdAt,
      updatedAt: dbChecklist.updatedAt,
      userId: dbChecklist.userId ? dbChecklist.userId.toString() : undefined
    };
  }

  async createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO> {
    // Format tasks for storage as JSON
    const tasksWithIds = checklist.tasks.map(task => 
      task.id ? task : { ...task, id: uuidv4() }
    );
    
    // Insert the checklist
    const [insertedChecklist] = await db.insert(checklists).values({
      name: checklist.name,
      status: checklist.status,
      progress: checklist.progress,
      remarks: checklist.remarks || "",
      tasksData: tasksWithIds,
      userId: checklist.userId
    }).returning();
    
    // Return the checklist summary
    return {
      id: insertedChecklist.id.toString(),
      name: insertedChecklist.name,
      status: insertedChecklist.status as 'not-started' | 'in-progress' | 'completed',
      progress: insertedChecklist.progress,
      taskCount: tasksWithIds.length,
      createdAt: insertedChecklist.createdAt,
      updatedAt: insertedChecklist.updatedAt
    };
  }

  async updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined> {
    const checklistId = parseInt(checklist.id);
    
    // Check if checklist exists
    const existingChecklist = await this.getChecklistById(checklist.id);
    if (!existingChecklist) {
      return undefined;
    }
    
    // Update the checklist
    const [updatedChecklist] = await db.update(checklists)
      .set({
        name: checklist.name,
        status: checklist.status,
        progress: checklist.progress,
        remarks: checklist.remarks,
        tasksData: checklist.tasks,
        updatedAt: new Date()
      })
      .where(eq(checklists.id, checklistId))
      .returning();
    
    if (!updatedChecklist) {
      return undefined;
    }
    
    const tasksData = updatedChecklist.tasksData as TaskDTO[] || [];
    
    return {
      id: updatedChecklist.id.toString(),
      name: updatedChecklist.name,
      status: updatedChecklist.status as 'not-started' | 'in-progress' | 'completed',
      progress: updatedChecklist.progress,
      tasks: tasksData,
      remarks: updatedChecklist.remarks || "",
      createdAt: updatedChecklist.createdAt,
      updatedAt: updatedChecklist.updatedAt,
      userId: updatedChecklist.userId ? updatedChecklist.userId.toString() : undefined
    };
  }

  async deleteChecklist(id: string): Promise<boolean> {
    try {
      await db.delete(checklists).where(eq(checklists.id, parseInt(id)));
      return true;
    } catch (error) {
      console.error("Error deleting checklist:", error);
      return false;
    }
  }

  async updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined> {
    // Get the checklist
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) {
      return undefined;
    }
    
    // Find and update the task
    const taskIndex = checklist.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return undefined;
    }
    
    // Update the task
    const updatedTask = { ...checklist.tasks[taskIndex], ...updates };
    checklist.tasks[taskIndex] = updatedTask;
    
    // Recalculate progress
    const completedTasks = checklist.tasks.filter(task => task.completed).length;
    checklist.progress = Math.round((completedTasks / checklist.tasks.length) * 100);
    
    // Update status based on progress
    if (checklist.progress === 100) {
      checklist.status = 'completed';
    } else if (checklist.progress > 0) {
      checklist.status = 'in-progress';
    } else {
      checklist.status = 'not-started';
    }
    
    // Update timestamp
    checklist.updatedAt = new Date();
    
    // Save changes
    await this.updateChecklist(checklist);
    
    return updatedTask;
  }

  // Verification Methods
  async createVerification(verification: VerificationDTO): Promise<VerificationDTO> {
    const [insertedVerification] = await db
      .insert(verifications)
      .values({
        token: verification.token,
        code: verification.code,
        expiresAt: verification.expiresAt,
        verified: verification.verified,
        recipientId: verification.recipientId,
        recipientEmail: verification.recipientEmail,
        recipientPhone: verification.recipientPhone,
        checklistId: verification.checklistId,
      })
      .returning();
    
    return {
      token: insertedVerification.token,
      code: insertedVerification.code,
      createdAt: insertedVerification.createdAt,
      expiresAt: insertedVerification.expiresAt,
      verified: insertedVerification.verified,
      recipientId: insertedVerification.recipientId,
      recipientEmail: insertedVerification.recipientEmail || undefined,
      recipientPhone: insertedVerification.recipientPhone || undefined,
      checklistId: insertedVerification.checklistId || undefined,
    };
  }
  
  async getVerificationByToken(token: string): Promise<VerificationDTO | undefined> {
    try {
      const [foundVerification] = await db
        .select()
        .from(verifications)
        .where(eq(verifications.token, token));
      
      if (!foundVerification) return undefined;
      
      return {
        token: foundVerification.token,
        code: foundVerification.code,
        createdAt: foundVerification.createdAt,
        expiresAt: foundVerification.expiresAt,
        verified: foundVerification.verified,
        recipientId: foundVerification.recipientId,
        recipientEmail: foundVerification.recipientEmail || undefined,
        recipientPhone: foundVerification.recipientPhone || undefined,
        checklistId: foundVerification.checklistId || undefined,
      };
    } catch (error) {
      console.error('Error retrieving verification:', error);
      return undefined;
    }
  }
  
  async markVerificationAsVerified(token: string): Promise<boolean> {
    try {
      const [updated] = await db
        .update(verifications)
        .set({ verified: true })
        .where(eq(verifications.token, token))
        .returning();
      
      return !!updated;
    } catch (error) {
      console.error('Error marking verification as verified:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();