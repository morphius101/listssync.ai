import { useState } from 'react';

export interface SendVerificationParams {
  checklistId: string;
  email?: string;
  phone?: string;
  recipientName?: string;
  recipientId?: string;
  targetLanguage?: string;
  checklistName?: string;
  ownerName?: string;
}

export interface ShareChecklistResponse {
  token: string;
  shareUrl: string;
}

interface VerificationStatus {
  verified: boolean;
  expired: boolean;
  recipientId?: string;
  checklistId?: string;
  targetLanguage?: string;
  maskedEmail?: string;
  maskedPhone?: string;
}

export function useVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');

  const shareChecklist = async ({
    checklistId,
    email,
    phone,
    recipientName,
    recipientId,
    targetLanguage,
    checklistName,
    ownerName,
  }: SendVerificationParams): Promise<ShareChecklistResponse | null> => {
    setIsLoading(true);
    setError(null);

    if (!checklistId) {
      setError('Missing checklist ID');
      setIsLoading(false);
      return null;
    }

    if (!email && !phone) {
      setError('Please provide either an email address or phone number');
      setIsLoading(false);
      return null;
    }

    try {
      const response = await fetch('/api/verification/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          checklistId: checklistId.trim(),
          recipientId: recipientId || `recipient_${Date.now()}`,
          email: email?.trim(),
          phone: phone?.trim(),
          targetLanguage,
          checklistName,
          ownerName,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `Request failed: ${response.status}`);
      }

      if (data.token) setToken(data.token);
      return data;
    } catch (err) {
      setError('Failed to send share link');
      console.error('shareChecklist error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerificationStatus = async (token: string): Promise<VerificationStatus | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/verification/status/${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    token,
    shareChecklist,
    checkVerificationStatus,
  };
}
