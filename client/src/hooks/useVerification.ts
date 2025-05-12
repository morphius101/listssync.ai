import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SendVerificationParams {
  recipientId: string;
  email?: string;
  phone?: string;
  checklistId?: string;
}

interface SendVerificationResponse {
  token: string;
  maskedEmail?: string;
  maskedPhone?: string;
}

interface VerifyCodeParams {
  token: string;
  code: string;
}

interface VerifyCodeResponse {
  verified: boolean;
  recipientId?: string;
  checklistId?: string;
  message?: string;
}

interface VerificationStatus {
  verified: boolean;
  expired: boolean;
  recipientId?: string;
  checklistId?: string;
}

export function useVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [maskedContact, setMaskedContact] = useState<{
    email?: string;
    phone?: string;
  }>({});
  const { toast } = useToast();

  const sendVerification = useCallback(async ({
    recipientId,
    email,
    phone,
    checklistId
  }: SendVerificationParams): Promise<SendVerificationResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/verification/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          email,
          phone,
          checklistId,
        }),
      });
      
      setToken(response.token);
      setMaskedContact({
        email: response.maskedEmail,
        phone: response.maskedPhone,
      });
      
      toast({
        title: 'Verification code sent',
        description: `Check your ${email ? 'email' : 'phone'} for the verification code.`,
      });
      
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send verification code';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const verifyCode = useCallback(async ({
    token: verificationToken,
    code,
  }: VerifyCodeParams): Promise<VerifyCodeResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/verification/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken || token,
          code,
        }),
      });
      
      if (response.verified) {
        toast({
          title: 'Verified',
          description: 'Your identity has been verified.',
        });
      } else {
        toast({
          title: 'Verification failed',
          description: response.message || 'Invalid verification code',
          variant: 'destructive',
        });
      }
      
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Verification failed';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, toast]);

  const checkVerificationStatus = useCallback(async (
    verificationToken: string
  ): Promise<VerificationStatus | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await apiRequest(`/api/verification/status/${verificationToken || token}`);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check verification status';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const shareChecklist = useCallback(async (
    checklistId: string,
    recipientEmail?: string,
    recipientPhone?: string,
    recipientName?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/checklists/${checklistId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          recipientPhone,
          recipientName,
        }),
      });
      
      toast({
        title: 'Checklist shared',
        description: 'Verification code sent to recipient.',
      });
      
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to share checklist';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    error,
    token,
    maskedContact,
    sendVerification,
    verifyCode,
    checkVerificationStatus,
    shareChecklist,
  };
}