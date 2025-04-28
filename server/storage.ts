import { ChecklistDTO, TaskDTO, ChecklistSummaryDTO, checklists, tasks } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface IStorage {
  getAllChecklists(): Promise<ChecklistSummaryDTO[]>;
  getChecklistById(id: string): Promise<ChecklistDTO | undefined>;
  createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO>;
  updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined>;
  deleteChecklist(id: string): Promise<boolean>;
  updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAllChecklists(): Promise<ChecklistSummaryDTO[]> {
    const dbChecklists = await db.select().from(checklists);
    
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
      updatedAt: dbChecklist.updatedAt
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
      tasksData: tasksWithIds
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
      updatedAt: updatedChecklist.updatedAt
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
}

// Use the new DatabaseStorage
export const storage = new DatabaseStorage();
