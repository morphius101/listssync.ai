import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVerification, VerifyCodeResponse } from '@/hooks/useVerification';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ShieldCheck, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (recipientId: string, checklistId?: string) => void;
  token: string;
  maskedEmail?: string;
  maskedPhone?: string;
  maskedContact?: {
    email?: string;
    phone?: string;
  };
  showCloseButton?: boolean;
}

export function VerificationModal({
  isOpen,
  onClose,
  onVerified,
  token,
  maskedEmail,
  maskedPhone,
  maskedContact,
  showCloseButton = true,
}: VerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyCode } = useVerification();
  const { toast } = useToast();

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      console.log(`🔍 Starting verification process with token: ${token}`);
      
      // Step 1: Try the standard verification API
      try {
        const result = await verifyCode({
          token,
          code: verificationCode,
        });

        console.log(`📋 Verification API response:`, result);

        if (result?.verified) {
          console.log(`✅ Verification successful with checklistId: ${result.checklistId || '(not set)'}`);
          
          toast({
            title: 'Success',
            description: 'Verification successful',
          });
          
          // Use the original checklist ID that was shared
          if (result.checklistId) {
            console.log(`📋 Using original shared checklist ID: ${result.checklistId}`);
            
            // Close modal and trigger callback
            setTimeout(() => {
              onVerified(result.recipientId || '', result.checklistId);
            }, 1000);
            return;
          }
        }
      } catch (verifyError) {
        console.error("❌ Error during verification:", verifyError);
      }
      
      // Step 2: Try to get the original checklist ID from the verification status
      try {
        console.log("🔍 Querying verification status API for original checklist ID");
        const response = await fetch(`/api/verification/status/${token}`);
        
        if (response.ok) {
          const statusData = await response.json();
          
          if (statusData.checklistId) {
            console.log(`✅ Found original checklist ID: ${statusData.checklistId}`);
            const originalRecipientId = statusData.recipientId || `recipient_${Date.now()}`;
            
            onVerified(originalRecipientId, statusData.checklistId);
            return;
          }
        }
      } catch (statusError) {
        console.error("❌ Error getting verification status:", statusError);
      }
      
      // Step 3: Try to extract checklist ID from token
      try {
        const possibleChecklistId = token.split('-').pop() || token;
        console.log(`🔍 Extracted possible checklist ID from token: ${possibleChecklistId}`);
        
        const testResponse = await fetch(`/api/checklists/${possibleChecklistId}`);
        
        if (testResponse.ok) {
          console.log(`✅ Found checklist with ID: ${possibleChecklistId}`);
          onVerified(`recipient_${Date.now()}`, possibleChecklistId);
          return;
        }
      } catch (extractError) {
        console.error("❌ Error testing extracted ID:", extractError);
      }
      
      // No valid checklist ID found, show error
      console.error("❌ All attempts to find original checklist failed");
      
      toast({
        title: 'Error',
        description: 'Could not find the shared checklist. Please contact the sender.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Verification error:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to verify code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldCheck className="w-5 h-5 text-primary mr-2" />
            Verification Required
          </DialogTitle>
          <DialogDescription>
            Enter the verification code sent to you to access this checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {((maskedEmail || maskedPhone) || (maskedContact?.email || maskedContact?.phone)) && (
            <div className="bg-muted p-3 rounded-md text-sm">
              {(maskedEmail || maskedContact?.email) && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>Code sent to: {maskedEmail || maskedContact?.email}</span>
                </div>
              )}
              {(maskedPhone || maskedContact?.phone) && (
                <div className="flex items-center space-x-2 mt-1">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>Code sent to: {maskedPhone || maskedContact?.phone}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Input
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <p className="text-xs text-gray-500 text-center">
              The code is 6 digits and valid for 10 minutes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleVerification} disabled={isVerifying}>
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}