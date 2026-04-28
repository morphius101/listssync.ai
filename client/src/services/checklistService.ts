import { Checklist, ChecklistSummary, Task } from "@/types";
import { getAuth } from "firebase/auth";

// API base URL
const API_BASE = '/api';

// Get the current user's Firebase ID token for authenticated requests
async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  try {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

// Get all checklists (optionally filtered by current user)
export const getChecklists = async (): Promise<ChecklistSummary[]> => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  console.log('🔍 Fetching checklists from PostgreSQL for user:', userId);
  
  try {
    const response = await fetch(`${API_BASE}/checklists`, {
      headers: await getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch checklists: ${response.status}`);
    }
    
    const checklists = await response.json();
    console.log('✅ Fetched checklists from PostgreSQL:', checklists);
    
    return checklists.map((checklist: any) => ({
      id: checklist.id,
      name: checklist.name,
      status: checklist.status || "not-started",
      progress: checklist.progress || 0,
      taskCount: (checklist.tasks || []).length,
      createdAt: new Date(checklist.createdAt),
      updatedAt: new Date(checklist.updatedAt),
      userId: checklist.userId || null,
    }));
  } catch (error) {
    console.error('❌ Error fetching checklists from PostgreSQL:', error);
    // Return empty array instead of falling back to Firebase
    return [];
  }
};

// Get checklist by ID
export const getChecklistById = async (id: string): Promise<Checklist | null> => {
  console.log(`🔍 Client: Attempting to fetch checklist from PostgreSQL with ID: ${id}`);
  
  try {
    const response = await fetch(`${API_BASE}/checklists/${id}`, {
      headers: await getAuthHeaders(),
    });
    
    if (!response.ok) {
      console.log(`❌ Checklist not found in PostgreSQL: ${id}`);
      return null;
    }
    
    const checklist = await response.json();
    console.log(`✅ Found checklist in PostgreSQL: ${checklist.name}`);
    
    return {
      id: checklist.id,
      name: checklist.name,
      tasks: checklist.tasks || [],
      status: checklist.status || "not-started",
      progress: checklist.progress || 0,
      createdAt: new Date(checklist.createdAt),
      updatedAt: new Date(checklist.updatedAt),
      remarks: checklist.remarks || "",
      userId: checklist.userId || null,
    };
  } catch (error) {
    console.error(`❌ Error fetching checklist from PostgreSQL: ${error}`);
    return null;
  }
};

// Create new checklist
export const createChecklist = async (checklist: Checklist): Promise<ChecklistSummary> => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  console.log('🔍 Creating checklist in PostgreSQL for user:', userId);
  
  try {
    // Prepare data for PostgreSQL API
    const checklistData = {
      ...checklist,
      userId: userId || null, // Associate with current user if logged in
    };
    
    // Use PostgreSQL API instead of Firebase
    const response = await fetch(`${API_BASE}/checklists`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(checklistData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create checklist: ${response.status}`);
    }
    
    const createdChecklist = await response.json();
    console.log('✅ Created checklist in PostgreSQL:', createdChecklist);
    
    return {
      id: createdChecklist.id,
      name: createdChecklist.name,
      status: createdChecklist.status,
      progress: createdChecklist.progress,
      taskCount: (createdChecklist.tasks || []).length,
      createdAt: new Date(createdChecklist.createdAt),
      updatedAt: new Date(createdChecklist.updatedAt),
      userId: createdChecklist.userId || null,
    };
  } catch (error) {
    console.error('❌ Error creating checklist in PostgreSQL:', error);
    throw error;
  }
};

// Update checklist
export const updateChecklist = async (checklist: Checklist): Promise<void> => {
  console.log('🔍 Updating checklist in PostgreSQL:', checklist.id);
  
  try {
    // Use PostgreSQL API instead of Firebase
    const response = await fetch(`${API_BASE}/checklists/${checklist.id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(checklist),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update checklist: ${response.status}`);
    }
    
    console.log('✅ Updated checklist in PostgreSQL');
  } catch (error) {
    console.error('❌ Error updating checklist in PostgreSQL:', error);
    throw error;
  }
};

// Delete checklist
export const deleteChecklist = async (id: string): Promise<void> => {
  console.log('🔍 Deleting checklist from PostgreSQL:', id);
  
  try {
    // Use PostgreSQL API instead of Firebase
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/checklists/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete checklist: ${response.status}`);
    }
    
    console.log('✅ Deleted checklist from PostgreSQL');
  } catch (error) {
    console.error('❌ Error deleting checklist from PostgreSQL:', error);
    throw error;
  }
};

// Update task status
export const updateTaskStatus = async (checklistId: string, taskId: string, updates: Partial<Task>): Promise<void> => {
  console.log('🔍 Updating task status in PostgreSQL:', checklistId, taskId);
  
  try {
    const response = await fetch(`${API_BASE}/checklists/${checklistId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.status}`);
    }
    
    console.log('✅ Updated task status in PostgreSQL');
  } catch (error) {
    console.error('❌ Error updating task status in PostgreSQL:', error);
    throw error;
  }
};

// Generate a pre-verified share link for manual sharing (Phone tab / WhatsApp).
// targetLanguage must be plumbed through — without it the server defaults to 'en'
// and the recipient view never shows the translation banner.
export const generateShareLink = async (checklistId: string, targetLanguage?: string): Promise<string> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/verification/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',
    body: JSON.stringify({
      checklistId,
      recipientId: `link_${Date.now()}`,
      targetLanguage: targetLanguage || 'en',
    }),
  });
  if (!res.ok) throw new Error('Failed to generate share link');
  const data = await res.json();
  return data.shareUrl;
};

// Subscribe to checklist updates (stub - real-time updates handled differently)
export const subscribeToChecklist = (
  checklistId: string,
  callback: (checklist: Checklist) => void
): (() => void) => {
  console.log('🔍 Subscribing to checklist updates:', checklistId);
  
  // This function is deprecated in favor of periodic polling or WebSocket
  // Return a no-op unsubscribe function
  return () => {
    console.log('Unsubscribing from checklist updates');
  };
};