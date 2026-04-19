import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { updateTaskStatus, updateChecklist } from '@/services/checklistService';
import { Checklist, Task } from '@/types';
import { useVerification } from '@/hooks/useVerification';
import ChecklistHeader from '@/components/checklist/ChecklistHeader';
import TasksList from '@/components/checklist/TasksList';
import RemarksSection from '@/components/checklist/RemarksSection';
import { useToast } from '@/hooks/use-toast';
import { getLanguageName } from '@/hooks/useTranslation';
import { Loader2, AlertTriangle, Globe } from 'lucide-react';

export default function SharedChecklist() {
  const [match1, params1] = useRoute("/shared/:token");
  const [match2, params2] = useRoute("/shared/checklist/:token");
  const [, navigate] = useLocation();

  const match = match1 || match2;
  const params = params1 || params2;

  const urlParams = new URLSearchParams(window.location.search);
  const langFromUrl = urlParams.get('lang') || 'en';

  const rawToken = params?.token;
  const token = rawToken?.includes('?') ? rawToken.split('?')[0] : rawToken;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>(langFromUrl);
  const [translationApplied, setTranslationApplied] = useState(false);

  const { toast } = useToast();
  const { checkVerificationStatus } = useVerification();

  // Poll for live updates once checklist is loaded
  useEffect(() => {
    if (!token || !checklist) return;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const url = new URL(`/api/shared/checklist`, window.location.origin);
        url.searchParams.set('token', token);
        const res = await fetch(url.toString());
        const result = await res.json();
        if (result.success && result.checklist) {
          setChecklist((prev: any) => {
            if (JSON.stringify(prev) === JSON.stringify(result.checklist)) return prev;
            return result.checklist;
          });
          setTranslationApplied(Boolean(result.translationApplied));
          if (result.targetLanguage) setTargetLanguage(result.targetLanguage);
        }
      } catch {
        /* silent */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, checklist]);

  // On mount: resolve checklistId from token, then load
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      try {
        const status = await checkVerificationStatus(token);

        if (cancelled) return;

        if (!status) {
          setError('This shared link is invalid or no longer available.');
          return;
        }

        if (status.expired) {
          setIsExpired(true);
          setError('This shared link has expired. Please ask the sender for a new one.');
          return;
        }

        if (status.targetLanguage) setTargetLanguage(status.targetLanguage);
        setChecklistId(status.checklistId || null);

        if (status.checklistId) {
          await loadChecklist(status.checklistId);
        } else {
          setError('This shared link is not linked to a checklist.');
        }
      } catch {
        if (!cancelled) setError('We could not load this shared link. Please try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [token]);

  const loadChecklist = async (id: string) => {
    const url = new URL(`/api/shared/checklist`, window.location.origin);
    if (token) url.searchParams.set('token', token);
    const response = await fetch(url.toString());
    const result = await response.json();

    if (!result.success || !result.checklist) {
      throw new Error(result.message || 'Failed to load checklist');
    }

    if (result.targetLanguage) setTargetLanguage(result.targetLanguage);
    setTranslationApplied(Boolean(result.translationApplied));
    setChecklist(result.checklist);
    setRemarks(result.checklist.remarks || "");
    return result.checklist;
  };

  const handleTaskToggle = async (taskId: string, updates: Partial<Task>) => {
    if (!checklist) return;

    const updatedTasks = checklist.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';

    const updatedChecklist = {
      ...checklist,
      tasks: updatedTasks,
      progress,
      status: status as 'completed' | 'in-progress' | 'not-started',
      updatedAt: new Date(),
    };
    setChecklist(updatedChecklist);

    try {
      const task = checklist.tasks.find(t => t.id === taskId);
      if (checklist.id && task) {
        await updateTaskStatus(checklist.id, taskId, { completed: !task.completed });
      }
    } catch {
      console.error('Error updating task');
    }
  };

  const handleRemarksSubmit = async () => {
    if (!checklist) return;
    setIsSubmitting(true);
    try {
      const updatedChecklist = { ...checklist, remarks, updatedAt: new Date() };
      await updateChecklist(updatedChecklist);
      setChecklist(updatedChecklist);
      toast({ title: 'Success', description: 'Your remarks have been saved' });
    } catch {
      console.error('Error saving remarks');
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto bg-white rounded-lg border p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="font-medium text-gray-900">Shared checklist unavailable</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading your shared checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {translationApplied && targetLanguage !== 'en' && (
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

        <ChecklistHeader checklist={checklist} />
        <TasksList tasks={checklist.tasks} onTaskUpdate={handleTaskToggle} disabled={false} />
        <RemarksSection value={remarks} onChange={setRemarks} disabled={isSubmitting} />
      </div>
    </div>
  );
}
