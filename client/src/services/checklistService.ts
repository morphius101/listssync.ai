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

// Get checklist by ID
export const getChecklistById = async (id: string): Promise<Checklist> => {
  const { db } = getFirebase();
  const docRef = doc(db, CHECKLIST_COLLECTION, id);
  
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Checklist not found");
  }
  
  return convertFirestoreData(docSnap.data(), docSnap.id);
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
  // Get the current URL domain
  const protocol = window.location.protocol;
  const host = window.location.host;
  
  // Create a unique link
  return `${protocol}//${host}/checklist/${checklistId}`;
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
