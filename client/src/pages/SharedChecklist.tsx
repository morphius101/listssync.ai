import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Checklist, Task } from '@/types';
import { useVerification } from '@/hooks/useVerification';
import ChecklistHeader from '@/components/checklist/ChecklistHeader';
import TasksList from '@/components/checklist/TasksList';
import { useToast } from '@/hooks/use-toast';
import { getLanguageName } from '@/hooks/useTranslation';
import { Loader2, AlertTriangle, Globe, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function SharedChecklist() {
  const [match1, params1] = useRoute("/shared/:token");
  const [match2, params2] = useRoute("/shared/checklist/:token");

  const params = params1 || params2;

  const urlParams = new URLSearchParams(window.location.search);
  const langFromUrl = urlParams.get('lang') || 'en';

  const rawToken = params?.token;
  const token = rawToken?.includes('?') ? rawToken.split('?')[0] : rawToken;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>(langFromUrl);
  const [translationApplied, setTranslationApplied] = useState(false);

  const loadedAtRef = useRef<number>(0); // ms timestamp when checklist first loaded

  const { toast } = useToast();
  const { checkVerificationStatus } = useVerification();

  // Poll for live updates (owner-side changes) while the recipient is working
  useEffect(() => {
    if (!token || !checklist || isSubmitted) return;
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
  }, [token, checklist, isSubmitted]);

  // On mount: resolve checklistId from token, then load checklist
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
          setError('This shared link has expired. Please ask the sender for a new one.');
          return;
        }

        if (status.targetLanguage) setTargetLanguage(status.targetLanguage);

        if (!status.checklistId) {
          setError('This shared link is not linked to a checklist.');
          return;
        }

        const url = new URL(`/api/shared/checklist`, window.location.origin);
        url.searchParams.set('token', token);
        const res = await fetch(url.toString());
        const result = await res.json();

        if (cancelled) return;

        if (!result.success || !result.checklist) {
          setError(result.message || 'Failed to load checklist');
          return;
        }

        if (result.targetLanguage) setTargetLanguage(result.targetLanguage);
        setTranslationApplied(Boolean(result.translationApplied));

        const loaded: Checklist = result.checklist;
        setChecklist(loaded);
        loadedAtRef.current = Date.now();
        trackEvent('checklist_opened', {
          checklist_id: loaded.id,
          offline: navigator.onLine === false,
        });

        // If already submitted, show confirmation immediately
        if (loaded.submittedAt) {
          setSubmittedAt(new Date(loaded.submittedAt as string));
          setIsSubmitted(true);
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

  // Optimistic per-task update — calls PATCH /api/shared/task
  const handleTaskToggle = async (taskId: string, updates: Partial<Task>) => {
    if (!checklist || !token) return;

    // Optimistic update
    const prevChecklist = checklist;
    const updatedTasks = checklist.tasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);
    const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';

    setChecklist({
      ...checklist,
      tasks: updatedTasks,
      progress,
      status: status as Checklist['status'],
      updatedAt: new Date(),
    });

    try {
      const body: Record<string, unknown> = { token, taskId };
      if (updates.completed !== undefined) body.completed = updates.completed;
      if (updates.photoUrl !== undefined) body.photoUrl = updates.photoUrl;

      const res = await fetch('/api/shared/task', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }

      // Fire after server confirms — never optimistically
      if (updates.photoUrl !== undefined) {
        trackEvent('photo_uploaded', {
          checklist_id: checklist.id,
          was_offline: navigator.onLine === false,
          action_ts: Date.now(), // for offline-queued uploads this will equal sync time
        });
      } else if (updates.completed === true) {
        trackEvent('item_completed', {
          checklist_id: checklist.id,
          has_photo: !!(checklist.tasks.find(t => t.id === taskId)?.photoUrl),
        });
      }
    } catch (e: any) {
      setChecklist(prevChecklist);
      throw e;
    }
  };

  const canSubmit = (() => {
    if (!checklist) return false;
    if (checklist.progress < 100) return false;
    return checklist.tasks.every(t => !t.photoRequired || t.photoUrl);
  })();

  const handleSubmit = async () => {
    if (!token || !canSubmit || !checklist) return;
    const snap = checklist; // stable reference for analytics after async ops
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shared/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Submit failed');
      }
      setSubmittedAt(new Date(result.submittedAt));
      setIsSubmitted(true);
      trackEvent('checklist_completed', { // GA4 KEY EVENT
        checklist_id: snap.id,
        duration_seconds: loadedAtRef.current
          ? Math.round((Date.now() - loadedAtRef.current) / 1000)
          : null,
        photo_count: snap.tasks.filter(t => t.photoUrl).length,
      });
    } catch (e: any) {
      toast({
        title: 'Submit failed',
        description: e.message || 'Please try again.',
        variant: 'destructive',
      });
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

  if (!checklist) return null;

  // Submitted confirmation screen
  if (isSubmitted) {
    const dateStr = submittedAt
      ? submittedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      : '';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 bg-white rounded-lg border p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="text-2xl font-semibold text-gray-900">Submitted</h1>
          <p className="text-gray-600">Thanks! Your work has been recorded.</p>
          {dateStr && <p className="text-sm text-gray-400">{dateStr}</p>}
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
        <TasksList tasks={checklist.tasks} onTaskUpdate={handleTaskToggle} disabled={false} checklistId={checklist.id} />

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className="min-w-[140px]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit
          </Button>
        </div>
        {!canSubmit && checklist.progress < 100 && (
          <p className="text-sm text-gray-500 text-right mt-2">
            Complete all tasks to submit.
          </p>
        )}
        {!canSubmit && checklist.progress === 100 && checklist.tasks.some(t => t.photoRequired && !t.photoUrl) && (
          <p className="text-sm text-gray-500 text-right mt-2">
            Upload required photos to submit.
          </p>
        )}
      </div>
    </div>
  );
}
