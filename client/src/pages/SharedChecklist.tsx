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

  const { toast } = useToast();
  const { checkVerificationStatus, token: verificationToken, maskedContact } = useVerification();
  const { subscribeToChecklist, sendChecklistUpdate } = useWebSocket();

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

  // Load checklist data with better error handling and fallbacks
  const loadChecklist = async (id: string) => {
    try {
      console.log(`Attempting to load checklist with ID: ${id}`);
      
      // Verify ID is valid
      if (!id || id === 'undefined' || id === 'null') {
        console.error(`Invalid checklist ID: ${id}, will try a fallback`);
        throw new Error('Invalid checklist ID');
      }
      
      // Before making the API call, log the exact URL being requested
      const requestUrl = `/api/checklists/${id}`;
      console.log(`Making API request to: ${requestUrl}`);
      
      // Enhanced error handling for checklist fetching
      try {
        console.log(`Attempting to fetch checklist with ID: ${id}`);
        
        // First try the specific checklist ID
        try {
          const data = await getChecklistById(id);
          console.log(`API response for checklist ${id}:`, data);
          
          if (data) {
            console.log(`Successfully loaded checklist: ${data.name}`);
            setChecklist(data);
            setRemarks(data.remarks || "");
            
            // Subscribe to realtime updates
            subscribeToChecklist(id);
            return data;
          }
        } catch (specificError) {
          console.error(`Error fetching specific checklist ${id}:`, specificError);
          // Continue to fallback mechanisms
        }
        
        // CRITICAL FIX: Instead of falling back to an unrelated checklist,
        // retry loading the original one with a delay
        console.log(`🔄 Retrying to load the original checklist ID: ${id} after delay`);
        try {
          // Wait a short time to give the server a chance to catch up
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const retryData = await getChecklistById(id);
          
          if (retryData) {
            console.log(`✅ Successfully loaded original checklist on retry: ${retryData.name}`);
            setChecklist(retryData);
            setRemarks(retryData.remarks || "");
            subscribeToChecklist(id);
            
            toast({
              title: 'Success',
              description: 'Your shared checklist has been loaded successfully.',
            });
            
            return retryData;
          }
        } catch (retryError) {
          console.error(`❌ Error on retry attempt for original checklist ${id}:`, retryError);
        }
        
        // Show error instead of creating a fake checklist
        console.log('❌ Unable to load the specified checklist after multiple attempts');
        
        // Display error toast
        toast({
          title: 'Error Loading Checklist',
          description: 'We could not load the shared checklist. Please contact support with the checklist ID: ' + id,
          variant: 'destructive',
          duration: 10000, // Show longer
        });
        
        return null;
      } catch (apiError) {
        console.error(`Critical error when fetching checklist:`, apiError);
        
        // Show an error message instead of fake checklist
        toast({
          title: 'Server Connection Error',
          description: 'We\'re having trouble connecting to the server. Please try again in a few moments.',
          variant: 'destructive',
          duration: 10000,
        });
        
        return null;
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
      
      // Instead of showing a random checklist, display a clear error
      console.error('Failed to load the specific shared checklist:', error);
      
      toast({
        title: 'Error Loading Checklist',
        description: 'The shared checklist could not be loaded. Please contact greyson@listssync.ai and provide the token from your URL.',
        variant: 'destructive',
        duration: 10000,
      });
      
      // Return null - we won't show any checklist rather than showing the wrong one
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
        description: 'Could not determine which checklist to load. Using default.',
        variant: 'destructive',
      });
      return;
    }
    
    // Store the verified checklist ID
    setChecklistId(verifiedChecklistId);
    
    // Try to load the specific checklist (with multiple retry attempts)
    console.log(`🔍 Attempting to load verified checklist with ID: ${verifiedChecklistId}`);
    try {
      // First make dedicated attempts to load the exact checklist
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📦 Attempt ${attempt} to fetch checklist ${verifiedChecklistId}`);
          const data = await getChecklistById(verifiedChecklistId);
          
          if (data) {
            console.log(`✅ Successfully loaded original checklist: ${data.name}`);
            setChecklist(data);
            setRemarks(data.remarks || "");
            
            // Subscribe to realtime updates for the specific checklist
            subscribeToChecklist(verifiedChecklistId);
            
            toast({
              title: 'Success',
              description: 'Checklist loaded successfully!',
            });
            
            return;
          }
        } catch (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error);
          
          if (attempt < 3) {
            // Wait a bit before trying again
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // CRITICAL FIX: Never fall back to a different checklist ID!
      // Instead, try again with the SAME ID but with extra debug information
      console.warn('⚠️ Initial attempts failed, trying again with the original ID: ' + verifiedChecklistId);
      
      try {
        // Give the server a moment to ensure the checklist is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Make one final attempt with the original ID - no fallbacks!
        const finalAttempt = await getChecklistById(verifiedChecklistId);
        
        if (finalAttempt) {
          console.log(`✅ Final attempt successful: ${finalAttempt.name}`);
          setChecklist(finalAttempt);
          setRemarks(finalAttempt.remarks || "");
          subscribeToChecklist(verifiedChecklistId);
          
          toast({
            title: 'Success',
            description: 'Shared checklist loaded successfully',
          });
          
          return;
        }
      } catch (finalError) {
        console.error('Final attempt error:', finalError);
      }
      
      // Only if all attempts with the original ID fail, show an error
      toast({
        title: 'Error',
        description: 'The requested checklist could not be loaded. Please contact support.',
        variant: 'destructive',
        duration: 10000,
      });
    } catch (error) {
      console.error('❌ Error loading verified checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the checklist. Please contact greyson@listssync.ai for assistance.',
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading checklist...</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Calendar className="h-12 w-12 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          This shared checklist link has expired. Please contact the sender for a new link.
        </p>
        <Button onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <ShieldCheck className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Required</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          To access this checklist, you need to verify your identity with the code sent to you.
        </p>
        <Button onClick={() => setShowVerification(true)}>
          Verify Identity
        </Button>
        
        {token && (
          <VerificationModal
            isOpen={showVerification}
            onClose={() => setShowVerification(false)}
            onVerified={handleVerified}
            token={token}
            maskedEmail={maskedContact.email}
            maskedPhone={maskedContact.phone}
          />
        )}
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Checklist Not Found</h2>
        <p className="text-gray-600 mb-6 text-center">
          This checklist may have been deleted or the link is invalid.
        </p>
        <Button onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  const isCompleted = checklist.status === 'completed';

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      {(checklist as any).isTranslation && (
        <div className="mb-4 bg-blue-50 rounded-md p-3">
          <p className="text-sm text-blue-700 flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            This checklist has been translated to {(checklist as any).translatedTo || 'another language'}.
          </p>
        </div>
      )}
      
      <ChecklistHeader checklist={checklist} />
      
      <TasksList 
        tasks={checklist.tasks} 
        onTaskUpdate={handleTaskUpdate}
      />
      
      <RemarksSection 
        initialRemarks={remarks} 
        onChange={handleRemarksChange}
      />
      
      {isCompleted ? (
        <div className="mt-6 bg-green-50 p-4 rounded-lg flex items-center">
          <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
          <div>
            <h3 className="font-medium text-green-800">Checklist Completed</h3>
            <p className="text-sm text-green-600">This checklist has been marked as complete.</p>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-primary text-white text-center font-medium rounded-md shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Completed Checklist'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}