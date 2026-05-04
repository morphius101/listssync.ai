import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { Link } from 'wouter';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVerification, SendVerificationParams, ShareChecklistResponse } from '@/hooks/useVerification';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';
import { AlertTriangle, Loader2, ClipboardCopy, Mail, Phone, Smartphone, Globe, Shield, Send, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

// Phone-input client-side validation. Mirrors server/utils/phone.ts:normalizeUSPhone
// behavior so the user gets immediate feedback before hitting the consent gate.
type PhoneValidation =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'non_us' }
  | { state: 'valid'; e164: string };

function validatePhone(input: string): PhoneValidation {
  if (!input.trim()) return { state: 'empty' };
  try {
    const parsed = parsePhoneNumberFromString(input, 'US');
    if (!parsed?.isValid()) return { state: 'invalid' };
    if (parsed.country !== 'US') return { state: 'non_us' };
    return { state: 'valid', e164: parsed.number };
  } catch {
    return { state: 'invalid' };
  }
}

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  checklist?: Checklist;
  onGenerateNewLink?: (targetLanguage?: string) => Promise<string>;
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  checklistId,
  checklist,
  onGenerateNewLink
}: ShareLinkModalProps) {
  console.log("ShareLinkModal rendered with checklistId:", checklistId);
  console.log("ShareLinkModal rendered with checklist:", checklist);

  // Email tab state
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);

  // Phone tab state — Phase 4d: phone input + consent-gate flow
  const [phoneTabLink, setPhoneTabLink] = useState<string | null>(null);
  const [phoneTabLinkLoading, setPhoneTabLinkLoading] = useState(false);
  const [phoneTabLinkCopied, setPhoneTabLinkCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResponse, setSmsResponse] = useState<ShareChecklistResponse | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShareLink(null);
      setIsCopied(false);
      setRecipientEmail('');
      setRecipientName('');
      setSelectedLanguage('en');
      setResponse(null);
      setError(null);
      setActiveTab('email');
      setEmailConsent(false);
      setPhoneTabLink(null);
      setPhoneTabLinkLoading(false);
      setPhoneTabLinkCopied(false);
      setRecipientPhone('');
      setIsSendingSms(false);
      setSmsResponse(null);
    }
  }, [isOpen]);

  const phoneValidation = useMemo(() => validatePhone(recipientPhone), [recipientPhone]);
  const smsStatus =
    smsResponse && 'smsStatus' in smsResponse ? smsResponse.smsStatus : undefined;

  // Invalidate the phone-tab link when the language picker changes so the next
  // generation reflects the recipient's language. Without this the link is
  // generated once on tab-activation and never updates.
  useEffect(() => {
    setPhoneTabLink(null);
  }, [selectedLanguage]);

  // Auto-generate share link when Phone tab becomes active (or after language change reset)
  useEffect(() => {
    if (!isOpen || activeTab !== 'phone' || phoneTabLink || phoneTabLinkLoading) return;
    if (!onGenerateNewLink) return;

    setPhoneTabLinkLoading(true);
    onGenerateNewLink(selectedLanguage)
      .then((url) => setPhoneTabLink(url))
      .catch(() => setPhoneTabLink(null))
      .finally(() => setPhoneTabLinkLoading(false));
  }, [isOpen, activeTab, onGenerateNewLink, phoneTabLink, selectedLanguage]);

  const { isLoading, shareChecklist } = useVerification();
  const { languages, isTranslating } = useTranslation();

  const handleCopyPhoneLink = () => {
    if (!phoneTabLink) return;
    navigator.clipboard.writeText(phoneTabLink);
    setPhoneTabLinkCopied(true);
    setTimeout(() => setPhoneTabLinkCopied(false), 2000);
  };

  const handleSendSms = async () => {
    if (phoneValidation.state !== 'valid' || isSendingSms) return;
    setIsSendingSms(true);
    setSmsResponse(null);
    try {
      const recipientId = `recipient_${Date.now()}`;
      const result = await shareChecklist({
        checklistId,
        recipientId,
        recipientName,
        targetLanguage: selectedLanguage,
        phone: phoneValidation.e164,
      });
      if (!result) {
        setSmsResponse(null);
        return;
      }
      setSmsResponse(result);
      // Cache the share URL for the manual copy-link affordance when the
      // server returned one (sent / pending_consent both include it).
      if ('shareUrl' in result && result.shareUrl) {
        setPhoneTabLink(result.shareUrl);
      }
      if ('token' in result) {
        trackEvent('checklist_sent', { recipient_count: 1, checklist_id: checklistId });
      }
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleShareLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    console.log('Share form values:', {
      activeTab,
      recipientEmail,
      recipientName,
      checklistId,
      hasChecklist: !!checklist
    });

    if (activeTab === 'email' && !recipientEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    if (activeTab === 'email' && !emailConsent) {
      setError('Please confirm that the recipient consents to receive emails.');
      return;
    }

    if (!checklistId) {
      setError('Unable to share: missing checklist ID.');
      return;
    }

    try {
      const recipientId = `recipient_${Date.now()}`;
      const params: SendVerificationParams = {
        checklistId: checklistId,
        recipientName,
        recipientId,
        targetLanguage: selectedLanguage
      };

      if (activeTab === 'email' && recipientEmail) {
        params.email = recipientEmail;
      }

      console.log('Sharing checklist with params:', params);

      const response = await shareChecklist(params);

      if (response && 'shareUrl' in response && response.shareUrl) {
        setShareLink(response.shareUrl);
        setResponse(response);
        trackEvent('checklist_sent', { recipient_count: 1, checklist_id: checklistId });
      } else {
        setError('Failed to deliver the share link. Please try again.');
      }
    } catch (err: any) {
      console.error('Share checklist error:', err);
      setError(err.message || 'Failed to deliver the share link. Please try again.');
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Checklist</DialogTitle>
          <DialogDescription>
            Send the checklist to someone for completion
          </DialogDescription>
        </DialogHeader>

        {shareLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-3 rounded-md text-green-700 text-sm">
              <p className="font-medium">
                {response?.maskedEmail && (
                  <>Checklist link emailed to <span className="font-bold">{response.maskedEmail}</span></>
                )}
                {!response?.maskedEmail && (
                  <>Checklist link sent to the recipient</>
                )}
              </p>
              <p className="text-xs mt-1">
                {response?.maskedEmail
                  ? 'The email link is already verified for that recipient — no extra code entry is required.'
                  : 'The recipient can open the checklist directly from the link.'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Input readOnly value={shareLink} className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline" size="sm">
                {isCopied ? 'Copied!' : 'Copy'}
                <ClipboardCopy className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <p className="text-sm text-gray-500 text-center">
              Email recipients can open the checklist directly from the secure link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleShareLink} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <Label htmlFor="language">Language for recipient</Label>
              <Select
                value={selectedLanguage}
                onValueChange={(value) => setSelectedLanguage(value as LanguageCode)}
              >
                <SelectTrigger id="language" className="flex-1">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient's name (optional)</Label>
              <Input
                id="recipient-name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Enter recipient's name"
              />
            </div>

            <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Phone
                </TabsTrigger>
              </TabsList>

              {/* ── Email tab — untouched ── */}
              <TabsContent value="email" className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Email Communication Consent</p>
                      <p className="text-xs">
                        By sharing this checklist via email, you confirm that the recipient has agreed to receive communications from ListsSync.ai, including verification codes and checklist updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <Checkbox
                      id="email-consent"
                      checked={emailConsent}
                      onCheckedChange={(checked) => setEmailConsent(checked as boolean)}
                    />
                    <Label htmlFor="email-consent" className="text-xs text-blue-800">
                      I confirm the recipient consents to receive emails from ListsSync.ai
                    </Label>
                  </div>
                </div>
              </TabsContent>

              {/* ── Phone tab — Twilio-driven SMS via the Phase 4b consent gate ── */}
              <TabsContent value="phone" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="recipient-phone">Recipient's phone number (US only)</Label>
                  <Input
                    id="recipient-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={recipientPhone}
                    onChange={(e) => {
                      setRecipientPhone(e.target.value);
                      // Clear stale send-result when the user edits the number.
                      if (smsResponse) setSmsResponse(null);
                    }}
                    placeholder="(555) 123-4567"
                    disabled={isSendingSms || smsStatus === 'sent' || smsStatus === 'pending_consent'}
                  />
                  {phoneValidation.state === 'valid' && (
                    <p className="text-xs text-green-600">✓ Valid US number</p>
                  )}
                  {phoneValidation.state === 'non_us' && (
                    <p className="text-xs text-red-600">
                      ✗ Not a US number — use email or copy the link below
                    </p>
                  )}
                  {phoneValidation.state === 'invalid' && recipientPhone.trim() !== '' && (
                    <p className="text-xs text-red-600">✗ Not a valid phone number</p>
                  )}
                </div>

                {/* Send via SMS — calls /api/verification/generate with the consent gate */}
                <Button
                  type="button"
                  onClick={handleSendSms}
                  className="w-full"
                  disabled={
                    phoneValidation.state !== 'valid'
                    || isSendingSms
                    || smsStatus === 'sent'
                    || smsStatus === 'pending_consent'
                  }
                >
                  {isSendingSms ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send via SMS
                    </>
                  )}
                </Button>

                {/* Server-side smsStatus rendering — one of four states */}
                {smsStatus === 'sent' && (
                  <div className="bg-green-50 p-3 rounded-md text-green-700 text-sm flex items-start">
                    <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <p>
                      Sent to {recipientPhone}. Recipient will receive the
                      checklist link shortly.
                    </p>
                  </div>
                )}

                {smsStatus === 'pending_consent' && (
                  <div className="bg-amber-50 p-3 rounded-md text-amber-800 text-sm">
                    <p>
                      Waiting for {recipientPhone} to confirm SMS — they were
                      texted once to confirm. We'll send the checklist link as
                      soon as they reply YES. You can also copy the link below
                      to send via email or another method.
                    </p>
                  </div>
                )}

                {smsStatus === 'opted_out' && (
                  <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <p>
                      {recipientPhone} has opted out of SMS from ListsSync.
                      Send by email or copy the link.
                    </p>
                  </div>
                )}

                {smsStatus === 'missing_business_name' && (
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded-md text-amber-900 text-sm space-y-2">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <p>
                        Add your business name in Settings before sharing via
                        SMS. Recipients need to know who's texting them.
                      </p>
                    </div>
                    <Link href="/settings">
                      <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
                        Open Settings
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Copy share link — manual fallback for non-SMS delivery
                    (WhatsApp / iMessage / email outside our flow). Generates
                    a token via the Phone-tab auto-generate and lets the Owner
                    deliver the URL themselves without going through Twilio. */}
                {phoneTabLinkLoading ? (
                  <div className="flex items-center justify-center py-3 text-gray-500 text-xs">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Preparing copy-link fallback…
                  </div>
                ) : phoneTabLink ? (
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs text-gray-500">
                      Or copy the link to send via email or another channel:
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input readOnly value={phoneTabLink} className="flex-1 text-sm" />
                      <Button onClick={handleCopyPhoneLink} variant="outline" size="sm" type="button">
                        {phoneTabLinkCopied ? 'Copied!' : 'Copy'}
                        <ClipboardCopy className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>

            {activeTab === 'email' && (
              <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm flex items-start">
                <Smartphone className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  Email shares open directly from the secure inbox link.
                  Recipients can complete the checklist from any device with
                  a web browser.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Submit button only relevant for email tab */}
            {activeTab === 'email' && (
              <Button
                type="submit"
                disabled={isLoading || isTranslating || !recipientEmail || !emailConsent}
                className="w-full"
              >
                {(isLoading || isTranslating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isTranslating ? 'Translating...' : (isLoading ? 'Sending...' : 'Share Checklist')}
              </Button>
            )}
          </form>
        )}

        <DialogFooter>
          {shareLink && (
            <Button onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
