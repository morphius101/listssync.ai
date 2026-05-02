import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/hooks/useAuth';

const MAX_LEN = 120;

export default function Settings() {
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.title = 'Settings — ListsSync.ai';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users/me', { headers: await getAuthHeaders() });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const current = data?.businessName ?? '';
        setBusinessName(current);
        setInitialName(current);
      } catch (err) {
        console.error('Settings: failed to load profile', err);
        if (!cancelled) {
          toast({
            title: 'Could not load settings',
            description: 'Refresh the page to try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const trimmed = businessName.trim();
  const isDirty = trimmed !== initialName.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_LEN;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !isDirty || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ business_name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `status ${res.status}`);
      }
      setInitialName(body?.businessName ?? trimmed);
      setBusinessName(body?.businessName ?? trimmed);
      toast({ title: 'Saved', description: 'Your business name was updated.' });
    } catch (err: any) {
      console.error('Settings: failed to save', err);
      toast({
        title: 'Could not save',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600 mb-6">Manage how your account appears to recipients.</p>

        <Card>
          <CardHeader>
            <CardTitle>Business name</CardTitle>
            <CardDescription>
              This appears in SMS messages your recipients receive so they recognize who's
              sharing checklists with them. Required to share via SMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  type="text"
                  inputMode="text"
                  autoComplete="organization"
                  maxLength={MAX_LEN}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Lakeshore Cleaning Co."
                  disabled={isLoading || isSaving}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {trimmed.length === 0
                      ? 'Cannot be empty.'
                      : trimmed.length > MAX_LEN
                      ? `Too long — max ${MAX_LEN} characters.`
                      : ' '}
                  </span>
                  <span>{businessName.length}/{MAX_LEN}</span>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading || isSaving || !isValid || !isDirty}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
