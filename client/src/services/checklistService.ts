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

// Get checklist by ID with enhanced error handling and retry logic specifically for production
export const getChecklistById = async (id: string): Promise<Checklist | null> => {
  console.log(`🔍 Client: Attempting to fetch checklist from Firebase with ID: ${id}`);
  
  // Verify Firebase is initialized properly
  try {
    // Force re-initialization of Firebase to ensure connection is valid
    const { db } = getFirebase();
    
    // Handle ID normalization for different formats
    let normalizedId = id;
    
    // If the ID contains verification token format (has hyphens), extract the last part
    if (id.includes('-')) {
      const parts = id.split('-');
      const potentialId = parts[parts.length - 1];
      console.log(`🔄 Extracted potential ID from token: ${potentialId}`);
      
      // Try both the original ID and the extracted one
      try {
        // First try with the full token
        const tokenDocRef = doc(db, CHECKLIST_COLLECTION, id);
        const tokenDocSnap = await getDoc(tokenDocRef);
        
        if (tokenDocSnap.exists()) {
          console.log(`✅ Found checklist with full token ID: ${id}`);
          return convertFirestoreData(tokenDocSnap.data(), tokenDocSnap.id);
        }
        
        // Then try with the extracted ID
        const extractedDocRef = doc(db, CHECKLIST_COLLECTION, potentialId);
        const extractedDocSnap = await getDoc(extractedDocRef);
        
        if (extractedDocSnap.exists()) {
          console.log(`✅ Found checklist with extracted ID: ${potentialId}`);
          return convertFirestoreData(extractedDocSnap.data(), extractedDocSnap.id);
        }
      } catch (tokenError) {
        console.error(`Error trying token variations: ${tokenError}`);
      }
    }
    
    // Standard direct Firebase lookup
    try {
      console.log(`🔍 Trying direct Firebase lookup for ID: ${normalizedId}`);
      const docRef = doc(db, CHECKLIST_COLLECTION, normalizedId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`✅ Client: Successfully found checklist in Firebase: ${normalizedId}`);
        return convertFirestoreData(docSnap.data(), docSnap.id);
      }
    } catch (directLookupError) {
      console.error(`Error in direct Firebase lookup: ${directLookupError}`);
    }
    
    // If not found directly, check with the verification API
    console.log(`⚠️ No checklist found directly. Checking verification API for token: ${id}`);
    
    try {
      const response = await fetch(`/api/verification/status/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.checklistId) {
          console.log(`🔄 Found checklist ID via verification API: ${data.checklistId}`);
          
          // CRITICAL FIX: If we're loading a shared checklist, this is likely the original ID of a
          // checklist that was shared. We should prioritize finding this exact checklist first.
          // This fixes the issue where users are seeing blank checklists after verification.
          
          // First try directly with the verified checklist ID
          const verifiedDocRef = doc(db, CHECKLIST_COLLECTION, data.checklistId);
          const verifiedDocSnap = await getDoc(verifiedDocRef);
          
          if (verifiedDocSnap.exists()) {
            console.log(`✅ Successfully found original checklist via verification token: ${data.checklistId}`);
            return convertFirestoreData(verifiedDocSnap.data(), verifiedDocSnap.id);
          }
          
          // If we can't find the checklist directly, try alternate collection paths
          // This helps locate checklists that might be stored in user-specific subcollections
          try {
            // Try looking in shared-checklists collection
            const sharedRef = doc(db, 'shared-checklists', data.checklistId);
            const sharedSnap = await getDoc(sharedRef);
            
            if (sharedSnap.exists()) {
              console.log(`✅ Found original checklist in shared-checklists collection: ${data.checklistId}`);
              return convertFirestoreData(sharedSnap.data(), sharedSnap.id);
            }
            
            // Look in the user's checklists collection
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            
            for (const userDoc of usersSnapshot.docs) {
              const userChecklistRef = doc(collection(db, `users/${userDoc.id}/checklists`), data.checklistId);
              const userChecklistSnap = await getDoc(userChecklistRef);
              
              if (userChecklistSnap.exists()) {
                console.log(`✅ Found original checklist in user's collection: ${data.checklistId}`);
                return convertFirestoreData(userChecklistSnap.data(), userChecklistSnap.id);
              }
            }
          } catch (alternatePathError) {
            console.error(`Error searching alternate paths: ${alternatePathError}`);
          }
          
          // IMPORTANT: Instead of creating a generic checklist, try to retrieve the original one again
          // using the API directly - this would use the server-side database as a fallback
          try {
            console.log(`🔄 Trying server API to fetch original checklist: ${data.checklistId}`);
            const apiResponse = await fetch(`/api/checklists/${data.checklistId}`);
            
            if (apiResponse.ok) {
              const originalChecklist = await apiResponse.json();
              console.log(`✅ Successfully retrieved original checklist from API: ${data.checklistId}`);
              return originalChecklist;
            }
          } catch (apiError) {
            console.error(`Error fetching from API: ${apiError}`);
          }
          
          // Only create a new checklist as absolute last resort when we can't find the original
          console.log(`⚠️ Original checklist not found anywhere. Creating new one as last resort: ${data.checklistId}`);
            
          // Create a copy of the original checklist with the correct ID
          const defaultChecklist = {
            id: data.checklistId,
            name: "Shared Checklist",
            tasks: [
              {
                id: "1",
                description: "This is a shared checklist",
                details: "The original shared checklist couldn't be found. Contact support if you believe this is an error.",
                completed: false,
                photoRequired: false,
                photoUrl: null
              }
            ],
            status: 'not-started',
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            remarks: "This is a placeholder for a shared checklist that couldn't be found. Please contact greyson@listssync.ai with the checklist ID for assistance."
          };
          
          // Save the checklist to Firebase as a last resort
          try {
            await setDoc(verifiedDocRef, {
              ...defaultChecklist,
              createdAt: Timestamp.fromDate(defaultChecklist.createdAt),
              updatedAt: Timestamp.fromDate(defaultChecklist.updatedAt)
            });
            
            console.log(`✅ Created placeholder checklist with ID: ${data.checklistId}`);
            return defaultChecklist;
          } catch (createError) {
            console.error(`Error creating placeholder checklist: ${createError}`);
          }
          }
        }
      }
    } catch (verificationError) {
      console.error(`Error checking verification status: ${verificationError}`);
    }
    
    // Last resort: Try with alternative ID formats (handles production inconsistencies)
    console.log(`🔄 Trying alternative ID formats as last resort for: ${id}`);
    
    // Try with variations - handle potential format issues in production
    const variations = [
      id,                                // Original ID
      id.replace(/[^a-zA-Z0-9]/g, ''),  // Remove special characters
      id.toLowerCase(),                  // Lowercase version
      id.toUpperCase(),                  // Uppercase version
    ];
    
    for (const variant of variations) {
      if (variant === id) continue; // Skip if same as original
      
      try {
        const variantDocRef = doc(db, CHECKLIST_COLLECTION, variant);
        const variantDocSnap = await getDoc(variantDocRef);
        
        if (variantDocSnap.exists()) {
          console.log(`✅ Found checklist with variant ID: ${variant}`);
          return convertFirestoreData(variantDocSnap.data(), variantDocSnap.id);
        }
      } catch (variantError) {
        console.log(`Error trying variant ${variant}: ${variantError}`);
      }
    }
    
    // If all attempts failed, log and return null
    console.error(`❌ Checklist not found after all attempts for ID: ${id}`);
    return null;
  } catch (error) {
    console.error(`❌ Fatal error fetching checklist: ${error}`);
    
    // Try to recover by returning a placeholder checklist for debugging purposes
    // This is better than a complete app crash in production
    console.log(`⚠️ Returning debugging placeholder for ID: ${id}`);
    return {
      id: id,
      name: "Error Loading Checklist",
      tasks: [
        {
          id: "debug1",
          description: "Report this error to support",
          details: `Failed to load checklist with ID: ${id}. Please contact support with this information.`,
          completed: false,
          photoRequired: false,
          photoUrl: null
        }
      ],
      status: 'not-started',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      remarks: "Error loading checklist. Please contact greyson@listssync.ai with the checklist ID and verification token."
    };
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
