import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { updateTaskStatus, updateChecklist } from '@/services/checklistService';
import { Checklist, Task } from '@/types';
import { useVerification } from '@/hooks/useVerification';
import { VerificationModal } from '@/components/modals/VerificationModal';
import ChecklistHeader from '@/components/checklist/ChecklistHeader';
import TasksList from '@/components/checklist/TasksList';
import RemarksSection from '@/components/checklist/RemarksSection';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getLanguageName } from '@/hooks/useTranslation';
import { 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Globe
} from 'lucide-react';

export default function SharedChecklist() {
  const [match1, params1] = useRoute("/shared/:token");
  const [match2, params2] = useRoute("/shared/checklist/:token");
  const [, navigate] = useLocation();
  
  // Use whichever route matched
  const match = match1 || match2;
  const params = params1 || params2;
  
  // Extract language from URL query parameters with multiple fallback methods
  const urlParams = new URLSearchParams(window.location.search);
  let langFromUrl = urlParams.get('lang') || 'en';
  
  // Alternative: check if lang is in the hash or URL
  if (langFromUrl === 'en' && window.location.href.includes('lang=')) {
    const langMatch = window.location.href.match(/lang=([a-z]{2})/);
    if (langMatch) {
      langFromUrl = langMatch[1];
    }
  }
  
  // Clean the token to remove any query parameters that might be included
  const rawToken = params?.token;
  const token = rawToken?.includes('?') ? rawToken.split('?')[0] : rawToken;
  
  console.log(`🌐 Full URL:`, window.location.href);
  console.log(`🌐 URL search params:`, window.location.search);
  console.log(`🌐 Raw token:`, rawToken);
  console.log(`🌐 Cleaned token:`, token);
  console.log(`🌐 Final detected language:`, langFromUrl);
  
  console.log(`SharedChecklist initialized with token: ${token}, language: ${langFromUrl}`);

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
  const [targetLanguage, setTargetLanguage] = useState<string>(langFromUrl);
  
  // Force language update if URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let currentLang = urlParams.get('lang') || 'en';
    
    // Alternative: check if lang is in the URL string directly
    if (currentLang === 'en' && window.location.href.includes('lang=')) {
      const langMatch = window.location.href.match(/lang=([a-z]{2})/);
      if (langMatch) {
        currentLang = langMatch[1];
      }
    }
    
    console.log(`🔄 Language detection update: ${currentLang} (from ${window.location.href})`);
    if (currentLang !== targetLanguage) {
      setTargetLanguage(currentLang);
      console.log(`🔄 Updated target language to: ${currentLang}`);
    }
  }, [window.location.search, targetLanguage]);

  const { toast } = useToast();
  const { checkVerificationStatus, token: verificationToken, maskedContact } = useVerification();
  const { subscribeToChecklist, sendChecklistUpdate } = useWebSocket();


  // Check verification status - only runs once when token is available
  useEffect(() => {
    if (!token) return;

    const isMounted = { current: true };

    const verifyAccess = async () => {
      if (!isMounted.current) return;
      
      setIsLoading(true);
      try {
        console.log(`Checking verification status for token: ${token}`);
        const status = await checkVerificationStatus(token);
        
        if (!isMounted.current) return;
        
        if (status) {
          setIsVerified(status.verified);
          setIsExpired(status.expired);
          setRecipientId(status.recipientId || null);
          setChecklistId(status.checklistId || null);
          
          if (status.targetLanguage) {
            console.log(`Setting target language: ${status.targetLanguage}`);
            setTargetLanguage(status.targetLanguage);
          }
          
          if (status.verified && status.checklistId && !status.expired) {
            await loadChecklist(status.checklistId);
          } else {
            setShowVerification(true);
          }
        } else {
          console.log("Verification status check failed but proceeding to verification anyway");
          setRecipientId(`auto_recipient_${Date.now()}`);
          setChecklistId('9999');
          setShowVerification(true);
        }
      } catch (error) {
        console.error('Error verifying access:', error);
        setShowVerification(true);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    verifyAccess();
    
    return () => {
      isMounted.current = false;
    };
  }, [token]);

  // Load checklist data using server-side endpoint to avoid Firebase authentication issues
  const loadChecklist = async (id: string) => {
    try {
      console.log(`Loading shared checklist with ID: ${id}`);
      
      if (!id || id === 'undefined' || id === 'null') {
        console.error(`Invalid checklist ID: ${id}`);
        throw new Error('Invalid checklist ID');
      }
      
      // Use server-side endpoint to get checklist data without Firebase authentication
      const url = new URL(`/api/shared/checklist/${id}`, window.location.origin);
      if (token) {
        url.searchParams.set('token', token);
      }
      const response = await fetch(url.toString());
      const result = await response.json();
      
      if (!result.success || !result.checklist) {
        // If the original checklist is not found, try to get any available checklist
        console.log('Original checklist not found, trying fallback');
        const fallbackResponse = await fetch('/api/verification/fallback-checklist');
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.success && fallbackData.checklistId) {
            const fallbackUrl = new URL(`/api/shared/checklist/${fallbackData.checklistId}`, window.location.origin);
            if (targetLanguage !== 'en') {
              fallbackUrl.searchParams.set('lang', targetLanguage);
            }
            const fallbackChecklistResponse = await fetch(fallbackUrl.toString());
            const fallbackResult = await fallbackChecklistResponse.json();
            
            if (fallbackResult.success && fallbackResult.checklist) {
              console.log('Using fallback checklist');
              toast({
                title: 'Notice',
                description: 'Original checklist not found. Showing a sample checklist instead.',
                variant: 'default'
              });
              return fallbackResult.checklist;
            }
          }
        }
        
        throw new Error('No checklist available');
      }
      
      // Server automatically handles translation based on verification record
      // Use the target language returned by the server
      if (result.targetLanguage) {
        setTargetLanguage(result.targetLanguage);
      }
      
      setChecklist(result.checklist);
      setRemarks(result.checklist.remarks || "");
      
      // Subscribe to realtime updates
      subscribeToChecklist(id);
      
      toast({
        title: 'Success',
        description: 'Your shared checklist has been loaded successfully.',
      });
      
      return result.checklist;
    } catch (error) {
      console.error('Error loading shared checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shared checklist',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Handle verification modal completion
  const handleVerificationComplete = async (isVerified: boolean) => {
    setShowVerification(false);
    setIsVerified(isVerified);
    
    if (isVerified && checklistId) {
      await loadChecklist(checklistId);
    }
  };

  // Handle task completion toggle
  const handleTaskToggle = async (taskId: string) => {
    if (!checklist) return;
    
    const updatedTasks = checklist.tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    const completedCount = updatedTasks.filter(task => task.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';
    
    const updatedChecklist = {
      ...checklist,
      tasks: updatedTasks,
      progress,
      status: status as 'completed' | 'in-progress' | 'not-started',
      updatedAt: new Date()
    };
    
    setChecklist(updatedChecklist);
    sendChecklistUpdate(updatedChecklist);
    
    try {
      if (checklist.id) {
        await updateTaskStatus(checklist.id, taskId, !checklist.tasks.find(t => t.id === taskId)?.completed);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Handle remarks submission
  const handleRemarksSubmit = async () => {
    if (!checklist) return;
    
    setIsSubmitting(true);
    try {
      const updatedChecklist = {
        ...checklist,
        remarks,
        updatedAt: new Date()
      };
      
      await updateChecklist(updatedChecklist);
      setChecklist(updatedChecklist);
      sendChecklistUpdate({ ...updatedChecklist, remarks, recipientId });
      
      toast({
        title: 'Success',
        description: 'Your remarks have been saved'
      });
    } catch (error) {
      console.error('Error saving remarks:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading shared checklist...</p>
        </div>
      </div>
    );
  }

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {token && (
            <VerificationModal
              isOpen={true}
              onClose={() => setShowVerification(false)}
              onVerified={(recipientId, checklistId) => {
                console.log(`🎯 Verification callback: recipientId=${recipientId}, checklistId=${checklistId}`);
                setIsVerified(true);
                setRecipientId(recipientId);
                setChecklistId(checklistId || null);
                setShowVerification(false);
                
                // Force reload the checklist data
                if (checklistId) {
                  loadChecklist(checklistId);
                }
              }}
              token={token}
              showCloseButton={false}
            />
          )}
        </div>
      </div>
    );
  }

  // Show loading state if verified but no checklist yet
  if (isVerified && !checklist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading your shared checklist...</p>
        </div>
      </div>
    );
  }

  // If not verified and no checklist, show verification
  if (!isVerified || !checklist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Unable to load shared checklist. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Verification Status Indicator */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-green-800 font-medium">Verified Access</p>
            <p className="text-green-600 text-sm">
              You have verified access to this shared checklist
              {maskedContact && typeof maskedContact === 'string' && ` via ${maskedContact}`}
            </p>
          </div>
        </div>

        {/* Language Indicator */}
        {targetLanguage !== 'en' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">Auto-Translated</p>
              <p className="text-blue-600 text-sm">
                This checklist has been automatically translated to {getLanguageName(targetLanguage as any)}
              </p>
            </div>
          </div>
        )}

        {/* Checklist Header */}
        <ChecklistHeader 
          checklist={checklist}
          onEditName={() => {}} // Read-only for shared checklists
        />

        {/* Tasks List */}
        <TasksList 
          tasks={checklist.tasks}
          onTaskToggle={handleTaskToggle}
          onTaskEdit={() => {}} // Read-only for shared checklists
          onAddTask={() => {}} // Read-only for shared checklists
          onDeleteTask={() => {}} // Read-only for shared checklists
          onPhotoUpload={() => {}} // Read-only for shared checklists
          readOnly={true}
        />

        {/* Remarks Section */}
        <RemarksSection
          remarks={remarks}
          onRemarksChange={setRemarks}
          onSubmit={handleRemarksSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}