export interface Task {
  id: string;
  description: string;
  details?: string;
  completed: boolean;
  photoRequired: boolean;
  photoUrl: string | null;
}

export interface Checklist {
  id: string;
  name: string;
  tasks: Task[];
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  remarks: string;
  userId?: string | null;
}

export interface ChecklistSummary {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  taskCount: number;
  createdAt: Date | any; // Support for Firestore Timestamp
  updatedAt: Date | any; // Support for Firestore Timestamp
  userId?: string | null;
}
