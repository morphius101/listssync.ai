import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { getChecklistById, updateTaskStatus, updateChecklist } from '@/services/checklistService';
import { Checklist, Task } from '@/types';
import { useVerification } from '@/hooks/useVerification';
import { VerificationModal } from '@/components/modals/VerificationModal';
import ChecklistHeader from '@/components/checklist/ChecklistHeader';
import TasksList from '@/components/checklist/TasksList';
import RemarksSection from '@/components/checklist/RemarksSection';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Globe
} from 'lucide-react';

export default function SharedChecklist() {
  const [match, params] = useRoute("/shared/:token");
  const [, navigate] = useLocation();
  const token = params?.token;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');

  const { toast } = useToast();
  const { checkVerificationStatus, token: verificationToken, maskedContact } = useVerification();
  const { subscribeToChecklist, sendChecklistUpdate } = useWebSocket();
  const { translateChecklist } = useTranslation();

  // Check verification status - only runs once when token is available
  useEffect(() => {
    if (!token) return;

    // Create a reference to track if the component is still mounted
    const isMounted = { current: true };

    const verifyAccess = async () => {
      if (!isMounted.current) return;
      
      setIsLoading(true);
      try {
        console.log(`Checking verification status for token: ${token} (one-time check)`);
        const status = await checkVerificationStatus(token);
        
        if (!isMounted.current) return;
        
        // Always proceed with verification, even if status is null
        // This makes the system more robust to temporary API issues
        if (status) {
          setIsVerified(status.verified);
          setIsExpired(status.expired);
          setRecipientId(status.recipientId || null);
          setChecklistId(status.checklistId || null);
          
          // Capture target language from verification
          if (status.targetLanguage) {
            console.log(`🌐 Setting target language: ${status.targetLanguage}`);
            setTargetLanguage(status.targetLanguage);
          }
          
          if (status.verified && status.checklistId && !status.expired) {
            await loadChecklist(status.checklistId);
          } else {
            // Need verification
            setShowVerification(true);
          }
        } else {
          // Even if status check fails, proceed to verification
          console.log("Verification status check failed but proceeding to verification anyway");
          // Use default values
          setRecipientId(`auto_recipient_${Date.now()}`);
          setChecklistId('9999');
          setShowVerification(true);
        }
      } catch (error) {
        console.error('Error verifying access:', error);
        
        if (isMounted.current) {
          toast({
            title: 'Error',
            description: 'Unable to verify access. Please try again later.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    verifyAccess();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted.current = false;
    };
  }, [token]); // Only depend on token to prevent re-runs

  // Load checklist data with better error handling and multi-source fetch strategy
  const loadChecklist = async (id: string) => {
    try {
      console.log(`📋 Attempting to load checklist with ID: ${id}`);
      
      // Verify ID is valid
      if (!id || id === 'undefined' || id === 'null') {
        console.error(`⚠️ Invalid checklist ID: ${id}`);
        throw new Error('Invalid checklist ID');
      }
      
      // CRITICAL FIX: For Firebase-style IDs, prioritize direct Firebase fetch
      // Firebase IDs are typically longer strings with letters and numbers
      const isLikelyFirebaseId = id.length > 20 && /[a-zA-Z]/.test(id);
      
      if (isLikelyFirebaseId) {
        console.log(`🔥 ID appears to be a Firebase ID: ${id} - trying Firebase first`);
        
        // Attempt direct Firebase lookup as the first approach
        try {
          const firebaseData = await getChecklistById(id);
          
          if (firebaseData) {
            console.log(`✅ Successfully loaded checklist from Firebase: ${firebaseData.name}`);
            
            // Check if we need to translate this checklist
            let finalChecklist = firebaseData;
            if (token && targetLanguage !== 'en') {
              try {
                console.log(`🌐 Translating checklist to ${targetLanguage}`);
                const translatedData = await translateChecklist(id, targetLanguage as any, 'en');
                if (translatedData) {
                  finalChecklist = translatedData;
                  console.log(`✅ Checklist translated successfully`);
                }
              } catch (translationError) {
                console.error('Translation failed, using original:', translationError);
              }
            }
            
            setChecklist(finalChecklist);
            setRemarks(finalChecklist.remarks || "");
            
            // Subscribe to realtime updates
            subscribeToChecklist(id);
            
            toast({
              title: 'Success',
              description: 'Your shared checklist has been loaded successfully.',
            });
            
            return finalChecklist;
          }
        } catch (firebaseError) {
          console.error(`❌ Error fetching directly from Firebase: ${firebaseError}`);
        }
      } else {
        console.log(`🔢 ID appears to be a numeric/PostgreSQL ID: ${id}`);
      }
      
      // Try multiple fetch strategies in sequence
      // 1. Try server API (PostgreSQL) route
      try {
        const serverRequestUrl = `/api/checklists/${id}`;
        console.log(`🔍 Making server API request to: ${serverRequestUrl}`);
        
        const response = await fetch(serverRequestUrl);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Server API returned data for ${id}:`, data);
          
          if (data) {
            setChecklist(data);
            setRemarks(data.remarks || "");
            subscribeToChecklist(id);
            return data;
          }
        } else {
          console.log(`❌ Server API returned status ${response.status}`);
        }
      } catch (serverError) {
        console.error(`❌ Error fetching from server API: ${serverError}`);
      }
      
      // 2. If not already tried, use Firebase as backup
      if (!isLikelyFirebaseId) {
        try {
          console.log(`🔥 Trying Firebase as backup for ID: ${id}`);
          const firebaseData = await getChecklistById(id);
          
          if (firebaseData) {
            console.log(`✅ Successfully loaded checklist from Firebase: ${firebaseData.name}`);
            setChecklist(firebaseData);
            setRemarks(firebaseData.remarks || "");
            subscribeToChecklist(id);
            return firebaseData;
          }
        } catch (firebaseBackupError) {
          console.error(`❌ Firebase backup attempt failed: ${firebaseBackupError}`);
        }
      }
      
      // 3. Final attempt - try with a delay (allows server processing time)
      console.log(`⏱️ Making final attempt after delay for ID: ${id}`);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      try {
        // Try Firebase one last time
        const finalData = await getChecklistById(id);
        
        if (finalData) {
          console.log(`✅ Final attempt successful: ${finalData.name}`);
          setChecklist(finalData);
          setRemarks(finalData.remarks || "");
          subscribeToChecklist(id);
          
          toast({
            title: 'Success',
            description: 'Your shared checklist has been loaded',
          });
          
          return finalData;
        }
      } catch (finalError) {
        console.error(`❌ Final attempt failed: ${finalError}`);
      }
      
      // Show error instead of creating a fake checklist
      console.log('❌ Unable to load the specified checklist after multiple attempts');
      
      // Display error toast with specific contact information
      toast({
        title: 'Error Loading Checklist',
        description: 'We could not load the shared checklist. Please contact greyson@listssync.ai with the checklist ID: ' + id,
        variant: 'destructive',
        duration: 15000, // Show longer for user to see email
      });
      
      return null;
    } catch (apiError) {
      console.error(`Critical error when fetching checklist:`, apiError);
      
      // Show a helpful error message with contact information
      toast({
        title: 'Loading Error',
        description: 'There was a problem loading this checklist. Please refresh the page or contact greyson@listssync.ai for assistance.',
        variant: 'destructive',
        duration: 10000,
      });
      
      return null;
    }
  };

  const handleVerified = async (verifiedRecipientId: string, verifiedChecklistId?: string) => {
    console.log('🔐 Verification successful with recipient:', verifiedRecipientId);
    console.log('📋 Verification successful with checklist ID:', verifiedChecklistId);
    
    setIsVerified(true);
    setShowVerification(false);
    setRecipientId(verifiedRecipientId);
    
    if (!verifiedChecklistId) {
      console.error('⚠️ No checklist ID received after verification - this is unexpected');
      toast({
        title: 'Warning',
        description: 'Could not determine which checklist to load. Please contact the sender.',
        variant: 'destructive',
      });
      return;
    }
    
    // Store the verified checklist ID
    setChecklistId(verifiedChecklistId);
    
    // CRITICAL FIX: This is the main function that loads the shared checklist
    // We must ensure it correctly retrieves the original checklist, not a generic one
    console.log(`🔍 Loading the ORIGINAL shared checklist with ID: ${verifiedChecklistId}`);
    
    try {
      // First, try to retrieve directly from Firebase
      console.log(`📦 Attempting direct Firebase retrieval for ID: ${verifiedChecklistId}`);
      const firebaseData = await getChecklistById(verifiedChecklistId);
      
      if (firebaseData) {
        console.log(`✅ Successfully loaded original shared checklist: "${firebaseData.name}"`);
        console.log(`✅ Checklist tasks: ${firebaseData.tasks?.length || 0}`);
        
        setChecklist(firebaseData);
        setRemarks(firebaseData.remarks || "");
        
        // Subscribe to realtime updates
        subscribeToChecklist(verifiedChecklistId);
        
        toast({
          title: 'Success',
          description: 'Shared checklist loaded successfully!',
        });
        
        return;
      }
      
      // If direct Firebase retrieval fails, try the API route
      console.log(`🔄 Firebase retrieval failed, trying API route for ID: ${verifiedChecklistId}`);
      
      try {
        const apiResponse = await fetch(`/api/checklists/${verifiedChecklistId}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          console.log(`✅ Successfully loaded checklist via API: "${apiData.name}"`);
          console.log(`✅ API checklist tasks: ${apiData.tasks?.length || 0}`);
          
          setChecklist(apiData);
          setRemarks(apiData.remarks || "");
          subscribeToChecklist(verifiedChecklistId);
          
          toast({
            title: 'Success',
            description: 'Shared checklist loaded successfully!',
          });
          
          return;
        }
      } catch (apiError) {
        console.error('API route error:', apiError);
      }
      
      // If all attempts fail, show an error - DO NOT create a generic checklist
      console.error(`❌ All attempts to load original checklist ${verifiedChecklistId} failed`);
      
      toast({
        title: 'Error',
        description: 'We could not retrieve the shared checklist. Please contact the sender or support at greyson@listssync.ai',
        variant: 'destructive',
        duration: 10000,
      });
    } catch (error) {
      console.error('❌ Critical error loading shared checklist:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to load the shared checklist. Please contact greyson@listssync.ai for assistance.',
        variant: 'destructive',
        duration: 10000,
      });
    }
  };
  
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    if (!checklist) return;
    
    try {
      // Optimistically update UI
      const updatedTasks = checklist.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      setChecklist({
        ...checklist,
        tasks: updatedTasks
      });
      
      // Update in backend
      await updateTaskStatus(checklist.id, taskId, updates);
      
      // Calculate new progress
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      
      const status = progress === 100 
        ? ('completed' as const) 
        : progress > 0 
          ? ('in-progress' as const) 
          : ('not-started' as const);
      
      setChecklist(prev => prev ? {
        ...prev,
        progress,
        status
      } : null);
      
      // Update checklist status
      await updateChecklist({
        ...checklist,
        tasks: updatedTasks,
        progress,
        status
      });
      
      // Notify other users through WebSocket
      sendChecklistUpdate(checklist.id, {
        taskId,
        updates,
        progress,
        status
      });
      
    } catch (error) {
      console.error('Error updating task:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      
      // Revert the optimistic update
      if (checklistId) {
        await loadChecklist(checklistId);
      }
    }
  };

  const handleRemarksChange = (value: string) => {
    setRemarks(value);
  };

  const handleSubmit = async () => {
    if (!checklist) return;
    
    setIsSubmitting(true);
    try {
      const updatedChecklist: Checklist = {
        ...checklist,
        remarks,
        status: 'completed' as const,
        progress: 100,
        updatedAt: new Date()
      };
      
      await updateChecklist(updatedChecklist);
      
      toast({
        title: 'Success',
        description: 'Checklist completed and submitted successfully!',
      });
      
      // Update local state
      setChecklist(updatedChecklist);
      
      // Notify other users
      sendChecklistUpdate(checklist.id, {
        completed: true,
        remarks,
        recipientId
      });
      
    } catch (error) {
      console.error('Error submitting checklist:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to submit checklist. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Checklist</h2>
        <p className="text-gray-600 mb-2 text-center">
          Please wait while we load your checklist.
        </p>
      </div>
    );
  }

  // Render verification screen
  if (showVerification || (isExpired && !checklist)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center mb-6">
            <ShieldCheck className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-center">Verification Required</h2>
            <p className="text-gray-600 text-center mt-2">
              Please verify your identity to access this checklist.
            </p>
          </div>
          
          <VerificationModal
            isOpen={true}
            onVerified={handleVerified}
            token={token || ""}
            maskedContact={maskedContact}
            onClose={() => {}}
            showCloseButton={false}
          />
        </div>
      </div>
    );
  }

  if (!checklist) {
    // Show details about the token to help debugging in production
    const isProduction = import.meta.env.MODE === 'production';
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Checklist Not Found</h2>
        <p className="text-gray-600 mb-6 text-center">
          This checklist may have been deleted or the link is invalid.
        </p>
        
        {/* Enhanced error details help when debugging in production */}
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 max-w-md w-full">
          <h3 className="text-sm font-medium text-red-800 mb-2">Error Details</h3>
          <p className="text-sm text-red-700 mb-1">
            The checklist could not be loaded. Please contact support and provide the following information:
          </p>
          <ul className="text-xs text-red-700 list-disc pl-5 mb-2">
            <li>Token: {token}</li>
            <li>Environment: {isProduction ? 'Production' : 'Development'}</li>
            <li>Time: {new Date().toISOString()}</li>
          </ul>
          <p className="text-xs text-red-700">
            Email: greyson@listssync.ai
          </p>
        </div>
        
        <div className="flex space-x-4">
          <Button onClick={() => navigate('/')}>
            Return Home
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Try again with a delay
              setIsLoading(true);
              setTimeout(async () => {
                if (token) {
                  try {
                    // Retry loading with the token
                    const status = await checkVerificationStatus(token);
                    if (status && status.checklistId) {
                      await loadChecklist(status.checklistId);
                    }
                  } catch (e) {
                    console.error("Retry failed:", e);
                  } finally {
                    setIsLoading(false);
                  }
                }
              }, 2000);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Safety check - if checklist is null, show a friendly error
  if (!checklist) {
    return (
      <div className="container mx-auto py-4 px-4 max-w-4xl">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Checklist Not Available</h2>
          <p className="text-gray-600 mb-4">
            {error || "The requested checklist could not be loaded. This may be due to invalid access or the checklist no longer exists."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center"
            >
              <span className="mr-2">↻</span> Retry Loading
            </Button>
            <Button 
              onClick={() => navigate('/')}
              className="flex items-center justify-center"
            >
              Return to Dashboard
            </Button>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            <p>Contact greyson@listssync.ai for assistance with this checklist.</p>
            <p className="mt-2">Token: {token || 'Unknown'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Only if checklist exists, we can safely access its properties
  const isCompleted = checklist?.status === 'completed';
  
  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      <ChecklistHeader 
        name={checklist?.name || 'Untitled Checklist'}
        progress={checklist?.progress || 0}
        status={checklist?.status || 'not-started'}
      />
      
      <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-white">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{new Date(checklist?.updatedAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
        
        <TasksList 
          tasks={checklist?.tasks || []} 
          onUpdate={handleTaskUpdate}
          disabled={isCompleted}
        />
      </div>
      
      <RemarksSection 
        value={remarks} 
        onChange={handleRemarksChange}
        disabled={isCompleted}
      />
      
      {!isCompleted && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Checklist'
            )}
          </Button>
        </div>
      )}
      
      {isCompleted && (
        <div className="mt-6 flex justify-center">
          <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            <span>This checklist has been completed and submitted.</span>
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>ListsSync.ai - Syncing checklists in real-time with instant photo proof.</p>
        <p>© 2025 ListsSync.ai - All rights reserved</p>
      </div>
    </div>
  );
}