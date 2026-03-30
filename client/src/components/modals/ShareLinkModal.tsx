import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ClipboardCopy, Check, Phone, Globe, MessageSquare, Link2 } from 'lucide-react';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  checklist?: any;
  onGenerateNewLink?: () => Promise<string>;
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  checklistId,
}: ShareLinkModalProps) {
  const [step, setStep] = useState<'options' | 'link'>('options');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  const { languages } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setStep('options');
      setPhone('');
      setSmsConsent(false);
      setShareLink('');
      setVerificationCode('');
      setMaskedPhone('');
      setIsCopied(false);
      setError('');
      setSmsSent(false);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {
        checklistId,
        recipientId: `recipient_${Date.now()}`,
        targetLanguage: selectedLanguage,
      };

      // Only add phone if provided AND consented
      if (phone && smsConsent) {
        params.phone = phone;
      }

      const res = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) throw new Error('Failed to generate link');
      const data = await res.json();

      setShareLink(data.shareUrl || '');
      setVerificationCode(data.verificationCode || '');
      setMaskedPhone(data.maskedPhone || '');
      setSmsSent(!!data.maskedPhone);
      setStep('link');
    } catch (err: any) {
      setError('Failed to generate share link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareLink;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Share Checklist
          </DialogTitle>
          <DialogDescription>
            {step === 'options'
              ? 'Generate a secure link to share this checklist with anyone.'
              : 'Copy the link and share it however you like.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'options' ? (
          <div className="space-y-5">
            {/* Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Recipient's language
              </Label>
              <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as LanguageCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional SMS */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Send code via SMS <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to share the link yourself — the recipient will need the code to open the checklist.
              </p>
            </div>

            {/* SMS consent — only show if phone entered */}
            {phone && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs">
                    By sending an SMS, you confirm the recipient agrees to receive a one-time verification code from ListsSync.ai. Msg & data rates may apply. Reply STOP to opt out.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sms-consent"
                    checked={smsConsent}
                    onCheckedChange={(c) => setSmsConsent(c as boolean)}
                  />
                  <Label htmlFor="sms-consent" className="text-xs text-amber-800 cursor-pointer">
                    Recipient consents to receive SMS
                  </Label>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isLoading || (!!phone && !smsConsent)}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Share Link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success state */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                Link generated!
              </p>
              {smsSent && maskedPhone && (
                <p className="text-xs mt-1">Verification code sent via SMS to {maskedPhone}.</p>
              )}
              {!smsSent && (
                <p className="text-xs mt-1">
                  Copy the link and send it yourself. The recipient will enter a code to verify access.
                </p>
              )}
            </div>

            {/* Link + copy */}
            <div className="flex items-center gap-2">
              <Input readOnly value={shareLink} className="flex-1 text-sm" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                <span className="ml-1">{isCopied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>

            {/* Dev mode code display */}
            {verificationCode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-xs text-yellow-700 font-medium mb-1">Dev mode — verification code:</p>
                <p className="font-mono text-2xl font-bold tracking-widest text-yellow-900">{verificationCode}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Recipients need the verification code to open this checklist. The code is included in the SMS if sent, or the sender can share it separately.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('options')}>
                New Link
              </Button>
              <Button className="flex-1" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
