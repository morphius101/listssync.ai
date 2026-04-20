import { useState, useEffect, useCallback } from 'react';
import { getDebugEvents, type DebugEvent } from '@/lib/analytics';

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 1000) return 'just now';
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  return date.toLocaleTimeString();
}

function formatParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
}

export default function DebugAnalytics() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [, tick] = useState(0);

  const refresh = useCallback(() => {
    setEvents(getDebugEvents());
    tick(n => n + 1); // nudges relativeTime strings to update
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 500);
    return () => clearInterval(id);
  }, [refresh]);

  // Guard after hooks — import.meta.env.PROD is a build-time constant so
  // hook call order is always the same; this never violates the rules of hooks.
  if (import.meta.env.PROD) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Analytics Debug Panel</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Dev only · last {events.length} of 20 trackEvent() calls · refreshes every 500ms
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-amber-900 text-amber-300 border border-amber-700">
            DEV
          </span>
        </div>

        {events.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-10 text-center text-gray-500 text-sm">
            No events yet. Trigger a trackEvent() call to see it here.
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-28">Time</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-48">Event</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Params</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {events.map((ev, i) => (
                    <tr
                      key={`${ev.timestamp.getTime()}-${i}`}
                      className={i === 0 ? 'bg-gray-800/40' : 'hover:bg-gray-900/60'}
                    >
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap align-top">
                        {relativeTime(ev.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 text-indigo-300 font-medium align-top whitespace-nowrap">
                        {ev.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-300 align-top">
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                          {formatParams(ev.params)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-600">
          Buffer holds the 20 most recent events. Clears on page refresh.
          Route only added in dev via{' '}
          <code className="text-gray-500">import.meta.env.DEV</code>.
        </p>
      </div>
    </div>
  );
}
