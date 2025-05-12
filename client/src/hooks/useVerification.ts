import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface SendVerificationParams {
  checklistId: string;
  email?: string;
  phone?: string;
  recipientName?: string;
  recipientId?: string;
}

interface VerifyCodeParams {
  token: string;
  code: string;
}

interface ShareChecklistResponse {
  token: string;
  maskedEmail?: string;
  maskedPhone?: string;
  shareUrl: string;
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

interface VerificationMaskedContact {
  email?: string;
  phone?: string;
}

export function useVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [maskedContact, setMaskedContact] = useState<VerificationMaskedContact>({});

  // Send a verification code to a recipient
  const shareChecklist = async ({
    checklistId,
    email,
    phone,
    recipientName,
    recipientId
  }: SendVerificationParams): Promise<ShareChecklistResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    console.log("useVerification.shareChecklist called with:", {
      checklistId,
      email,
      phone,
      recipientName,
      recipientId
    });
    
    if (!checklistId) {
      console.error("Missing checklistId in shareChecklist!");
      setError("Missing checklist ID");
      setIsLoading(false);
      return null;
    }
    
    try {
      // Ensure we have a valid checklist ID
      if (!checklistId || checklistId.trim() === '') {
        console.error("Invalid or empty checklistId!");
        setError("Invalid checklist ID");
        setIsLoading(false);
        return null;
      }
      
      // Prepare API request data
      const requestData = {
        checklistId,
        email: email && email.trim() !== '' ? email.trim() : undefined,
        phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
        recipientName: recipientName || undefined,
        recipientId: recipientId || `recipient_${Date.now()}`
      };
      
      console.log("Making API request with data:", requestData);
      
      const response = await apiRequest('/api/verification/send', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        setMaskedContact({
          email: data.maskedEmail,
          phone: data.maskedPhone
        });
      }
      
      return data;
    } catch (err) {
      setError('Failed to send verification code');
      console.error('Send verification error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify a code against a token
  const verifyCode = async ({
    token,
    code
  }: VerifyCodeParams): Promise<VerifyCodeResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/verification/verify', {
        method: 'POST',
        body: JSON.stringify({
          token,
          code
        }),
      });
      
      return await response.json();
    } catch (err) {
      setError('Failed to verify code');
      console.error('Verify code error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if a token is verified
  const checkVerificationStatus = async (token: string): Promise<VerificationStatus | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/verification/status/${token}`, {
        method: 'GET'
      });
      
      return await response.json();
    } catch (err) {
      setError('Failed to check verification status');
      console.error('Check verification status error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    token,
    maskedContact,
    shareChecklist,
    verifyCode,
    checkVerificationStatus
  };
}