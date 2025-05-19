import { Checklist, ChecklistSummary, Task } from "@/types";
import { getFirebase, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot, Timestamp, addDoc, ref } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

const CHECKLIST_COLLECTION = "checklists";

// Convert Firestore data to Checklist object
const convertFirestoreData = (data: any, id?: string): Checklist => {
  return {
    id: id || data.id,
    name: data.name,
    tasks: data.tasks || [],
    status: data.status || "not-started",
    progress: data.progress || 0,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    remarks: data.remarks || "",
    userId: data.userId || null
  };
};

// Get all checklists (optionally filtered by current user)
export const getChecklists = async (): Promise<ChecklistSummary[]> => {
  const { db } = getFirebase();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  let checklistsQuery;
  
  if (userId) {
    // Get only user's checklists if logged in
    checklistsQuery = query(
      collection(db, CHECKLIST_COLLECTION),
      where("userId", "==", userId)
    );
  } else {
    // Get all checklists if no user is logged in (for demo purposes)
    checklistsQuery = collection(db, CHECKLIST_COLLECTION);
  }
  
  const snapshot = await getDocs(checklistsQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      status: data.status || "not-started",
      progress: data.progress || 0,
      taskCount: (data.tasks || []).length,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      userId: data.userId || null,
    };
  });
};

// Get checklist by ID with enhanced error handling and retry logic
export const getChecklistById = async (id: string): Promise<Checklist | null> => {
  console.log(`🔍 Client: Attempting to fetch checklist from Firebase with ID: ${id}`);
  
  try {
    const { db } = getFirebase();
    const docRef = doc(db, CHECKLIST_COLLECTION, id);
    
    // First attempt
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`✅ Client: Successfully found checklist in Firebase: ${id}`);
      return convertFirestoreData(docSnap.data(), docSnap.id);
    }
    
    // If not found, try checking if this is a verification token
    console.log(`⚠️ Client: No checklist found with direct ID: ${id}. Checking if it's a verification token...`);
    
    // Call our server API to check if this is a verification token that maps to a checklist
    try {
      const response = await fetch(`/api/verification/status/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.checklistId && data.checklistId !== id) {
          console.log(`🔄 Client: Found a different checklist ID via verification: ${data.checklistId}`);
          
          // Try fetching with this new ID
          const verifiedDocRef = doc(db, CHECKLIST_COLLECTION, data.checklistId);
          const verifiedDocSnap = await getDoc(verifiedDocRef);
          
          if (verifiedDocSnap.exists()) {
            console.log(`✅ Client: Successfully found checklist via verification token`);
            return convertFirestoreData(verifiedDocSnap.data(), verifiedDocSnap.id);
          }
        }
      }
    } catch (verificationError) {
      console.error('Error checking verification status:', verificationError);
    }
    
    // Log that we couldn't find the checklist
    console.error(`❌ Client: Checklist not found with ID: ${id}`);
    return null;
  } catch (error) {
    console.error(`❌ Client: Error fetching checklist: ${error}`);
    throw error;
  }
};

// Create new checklist
export const createChecklist = async (checklist: Checklist): Promise<ChecklistSummary> => {
  const { db } = getFirebase();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  // Create a sanitized version for Firestore
  const { id, ...checklistData } = checklist;
  
  // Add timestamps and user ID
  const now = new Date();
  const data = {
    ...checklistData,
    userId: userId || null, // Associate with current user if logged in
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  
  // Add to Firestore with auto-generated ID
  const docRef = await addDoc(collection(db, CHECKLIST_COLLECTION), data);
  
  // Return summary for UI
  return {
    id: docRef.id,
    name: checklist.name,
    status: checklist.status,
    progress: checklist.progress,
    taskCount: checklist.tasks.length,
    createdAt: now,
    updatedAt: now,
    userId: userId || null,
  };
};

// Update existing checklist
export const updateChecklist = async (checklist: Checklist): Promise<void> => {
  const { db } = getFirebase();
  const docRef = doc(db, CHECKLIST_COLLECTION, checklist.id);
  
  // Create a sanitized version for Firestore
  const { id, ...checklistData } = checklist;
  
  // Update timestamp
  const data = {
    ...checklistData,
    updatedAt: Timestamp.fromDate(new Date()),
  };
  
  return updateDoc(docRef, data);
};

// Delete checklist
export const deleteChecklist = async (id: string): Promise<void> => {
  const { db } = getFirebase();
  const docRef = doc(db, CHECKLIST_COLLECTION, id);
  
  return deleteDoc(docRef);
};

// Update task status
export const updateTaskStatus = async (checklistId: string, taskId: string, updates: Partial<Task>): Promise<void> => {
  const { db } = getFirebase();
  const docRef = doc(db, CHECKLIST_COLLECTION, checklistId);
  
  // Get current checklist
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Checklist not found");
  }
  
  const data = docSnap.data();
  
  // Update the specific task
  const updatedTasks = (data.tasks || []).map((task: Task) => 
    task.id === taskId ? { ...task, ...updates } : task
  );
  
  // Calculate progress
  const completedTasks = updatedTasks.filter((task: Task) => task.completed).length;
  const progress = Math.round((completedTasks / updatedTasks.length) * 100);
  
  // Update status based on progress
  let status = data.status;
  if (progress === 100) {
    status = 'completed';
  } else if (progress > 0) {
    status = 'in-progress';
  } else {
    status = 'not-started';
  }
  
  // Update the document
  return updateDoc(docRef, {
    tasks: updatedTasks,
    progress,
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

// Generate share link for checklist
export const generateShareLink = async (checklistId: string): Promise<string> => {
  // Use custom domain in production, otherwise use current domain
  const isProduction = import.meta.env.MODE === 'production';
  
  if (isProduction) {
    // Use our custom domain in production
    return `https://www.listssync.ai/checklist/${checklistId}`;
  } else {
    // Use local domain in development
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/checklist/${checklistId}`;
  }
};

// Setup real-time listener for checklist updates
export const subscribeToChecklist = (
  checklistId: string, 
  callback: (checklist: Checklist) => void
): () => void => {
  const { db } = getFirebase();
  const docRef = doc(db, CHECKLIST_COLLECTION, checklistId);
  
  const unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const checklist = convertFirestoreData(doc.data(), doc.id);
      callback(checklist);
    }
  });
  
  return unsubscribe;
};
