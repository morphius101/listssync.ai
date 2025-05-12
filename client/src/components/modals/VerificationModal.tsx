import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVerification } from '@/hooks/useVerification';
import { Loader2, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (recipientId: string, checklistId?: string) => void;
  token: string;
  maskedEmail?: string;
  maskedPhone?: string;
}

export function VerificationModal({
  isOpen,
  onClose,
  onVerified,
  token,
  maskedEmail,
  maskedPhone,
}: VerificationModalProps) {
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const { isLoading, error, verifyCode } = useVerification();

  // Auto-format verification code as it's entered (add spaces)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-digit characters
    const digits = e.target.value.replace(/\D/g, '');
    
    // Take only the first 6 digits
    const truncated = digits.substring(0, 6);
    
    // Format with a space in the middle for readability
    if (truncated.length > 3) {
      setCode(`${truncated.substring(0, 3)} ${truncated.substring(3)}`);
    } else {
      setCode(truncated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove spaces for verification
    const cleanCode = code.replace(/\s/g, '');
    
    if (cleanCode.length !== 6) {
      return; // Don't submit if code isn't complete
    }
    
    const result = await verifyCode({ token, code: cleanCode });
    
    if (result?.verified) {
      setIsVerified(true);
      
      // Delay to show success state
      setTimeout(() => {
        onVerified(result.recipientId || '', result.checklistId);
      }, 1500);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setIsVerified(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Identity</DialogTitle>
          <DialogDescription>
            {isVerified ? (
              <div className="flex items-center justify-center text-green-500 mt-2">
                <CheckCircle2 className="w-6 h-6 mr-2" />
                <span>Verification successful!</span>
              </div>
            ) : (
              <>
                Enter the 6-digit code sent to:
                <div className="flex items-center justify-center mt-2 font-medium">
                  {maskedEmail && (
                    <div className="flex items-center text-primary">
                      <Mail className="w-4 h-4 mr-1" />
                      <span>{maskedEmail}</span>
                    </div>
                  )}
                  
                  {maskedPhone && (
                    <div className="flex items-center text-primary">
                      <Phone className="w-4 h-4 mr-1" />
                      <span>{maskedPhone}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {!isVerified && (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col items-center space-y-4">
              <div className="grid flex-1 gap-2">
                <Input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000 000"
                  className="text-center text-xl tracking-widest py-6"
                  inputMode="numeric"
                  disabled={isLoading || isVerified}
                  autoFocus
                />
                
                {error && (
                  <div className="flex items-center text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <DialogFooter className="sm:justify-center">
                <Button
                  type="submit"
                  disabled={code.replace(/\s/g, '').length !== 6 || isLoading || isVerified}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}