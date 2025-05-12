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

  // Check verification status
  useEffect(() => {
    if (!token) return;

    const verifyAccess = async () => {
      setIsLoading(true);
      try {
        const status = await checkVerificationStatus(token);
        
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
          toast({
            title: 'Error',
            description: 'Invalid or expired link',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error verifying access:', error);
        
        toast({
          title: 'Error',
          description: 'Unable to verify access. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAccess();
  }, [token, toast, checkVerificationStatus]);

  // Load checklist data
  const loadChecklist = async (id: string) => {
    try {
      const data = await getChecklistById(id);
      setChecklist(data);
      setRemarks(data.remarks || "");
      
      // Subscribe to realtime updates
      subscribeToChecklist(id);
      
      return data;
    } catch (error) {
      console.error('Error fetching checklist:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to load checklist. It may have been deleted or the link is invalid.',
        variant: 'destructive',
      });
      
      return null;
    }
  };

  const handleVerified = async (verifiedRecipientId: string, verifiedChecklistId?: string) => {
    setIsVerified(true);
    setShowVerification(false);
    setRecipientId(verifiedRecipientId);
    
    if (verifiedChecklistId) {
      setChecklistId(verifiedChecklistId);
      await loadChecklist(verifiedChecklistId);
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