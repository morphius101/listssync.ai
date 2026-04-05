/**
 * useRealtimeChecklist
 *
 * Polls the server every 10s for checklist updates when the tab is visible.
 * This gives "near real-time" sync for shared checklists without WebSockets.
 * When the app is in background, polling pauses to save battery/bandwidth.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Checklist } from '@/types';
import { getChecklistById } from '@/services/checklistService';

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export function useRealtimeChecklist(checklistId: string | null | undefined) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchChecklist = useCallback(async () => {
    if (!checklistId) return;
    try {
      const data = await getChecklistById(checklistId);
      if (isMountedRef.current && data) {
        setChecklist(prev => {
          // Only update if something actually changed (avoid unnecessary re-renders)
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [checklistId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchChecklist, POLL_INTERVAL_MS);
  }, [fetchChecklist]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!checklistId) { setIsLoading(false); return; }

    // Initial load
    fetchChecklist();

    // Start polling
    startPolling();

    // Pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) stopPolling();
      else { fetchChecklist(); startPolling(); }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checklistId, fetchChecklist, startPolling, stopPolling]);

  return { checklist, setChecklist, isLoading, error, refetch: fetchChecklist };
}
