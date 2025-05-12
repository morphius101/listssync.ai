import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface SendVerificationParams {
  checklistId: string;
  email?: string;
  phone?: string;
  recipientName?: string;
  recipientId?: string;
}

export interface VerifyCodeParams {
  token: string;
  code: string;
}

export interface ShareChecklistResponse {
  token: string;
  maskedEmail?: string;
  maskedPhone?: string;
  shareUrl: string;
}

export interface VerifyCodeResponse {
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
    
    // Only one of email or phone should be provided
    if (!email && !phone) {
      console.error("Either email or phone must be provided");
      setError("Please provide either an email address or phone number");
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
      
      // Prepare API request data with detailed validation
      const requestData: SendVerificationParams = {
        checklistId: checklistId.trim(),
        recipientId: recipientId || `recipient_${Date.now()}`
      };
      
      // Only add valid values to the request
      if (recipientName && recipientName.trim()) {
        requestData.recipientName = recipientName.trim();
      }
      
      if (email && email.trim()) {
        console.log("Adding email to request:", email.trim());
        requestData.email = email.trim();
      }
      
      if (phone && phone.trim()) {
        console.log("Adding phone to request:", phone.trim());
        requestData.phone = phone.trim();
      }
      
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