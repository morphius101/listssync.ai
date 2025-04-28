import { ChecklistDTO, TaskDTO, ChecklistSummaryDTO } from "@shared/schema";

export interface IStorage {
  getAllChecklists(): Promise<ChecklistSummaryDTO[]>;
  getChecklistById(id: string): Promise<ChecklistDTO | undefined>;
  createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO>;
  updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined>;
  deleteChecklist(id: string): Promise<boolean>;
  updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined>;
}

export class MemStorage implements IStorage {
  private checklists: Map<string, ChecklistDTO>;

  constructor() {
    this.checklists = new Map();
  }

  async getAllChecklists(): Promise<ChecklistSummaryDTO[]> {
    return Array.from(this.checklists.values()).map(checklist => ({
      id: checklist.id,
      name: checklist.name,
      status: checklist.status,
      progress: checklist.progress,
      taskCount: checklist.tasks.length,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt
    }));
  }

  async getChecklistById(id: string): Promise<ChecklistDTO | undefined> {
    return this.checklists.get(id);
  }

  async createChecklist(checklist: ChecklistDTO): Promise<ChecklistSummaryDTO> {
    // Ensure ID is created if not provided
    if (!checklist.id) {
      checklist.id = `checklist_${Date.now()}`;
    }
    
    // Set timestamps
    const now = new Date();
    checklist.createdAt = now;
    checklist.updatedAt = now;
    
    // Store in memory
    this.checklists.set(checklist.id, { ...checklist });
    
    // Return summary
    return {
      id: checklist.id,
      name: checklist.name,
      status: checklist.status,
      progress: checklist.progress,
      taskCount: checklist.tasks.length,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt
    };
  }

  async updateChecklist(checklist: ChecklistDTO): Promise<ChecklistDTO | undefined> {
    // Check if checklist exists
    if (!this.checklists.has(checklist.id)) {
      return undefined;
    }
    
    // Update timestamp
    checklist.updatedAt = new Date();
    
    // Update in storage
    this.checklists.set(checklist.id, { ...checklist });
    
    return checklist;
  }

  async deleteChecklist(id: string): Promise<boolean> {
    return this.checklists.delete(id);
  }

  async updateTask(checklistId: string, taskId: string, updates: Partial<TaskDTO>): Promise<TaskDTO | undefined> {
    // Get the checklist
    const checklist = this.checklists.get(checklistId);
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
    this.checklists.set(checklistId, checklist);
    
    return updatedTask;
  }
}

export const storage = new MemStorage();
