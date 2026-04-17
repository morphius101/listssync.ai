import { useState, useEffect } from 'react';
import * as React from 'react';
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
import { useVerification, SendVerificationParams } from '@/hooks/useVerification';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';
import { AlertTriangle, Loader2, ClipboardCopy, Mail, Phone, Smartphone, Globe, Shield, MessageSquare } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  checklist?: Checklist;
  onGenerateNewLink?: () => Promise<string>;
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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

  // Phone tab state
  const [phoneTabLink, setPhoneTabLink] = useState<string | null>(null);
  const [phoneTabLinkLoading, setPhoneTabLinkLoading] = useState(false);
  const [phoneTabLinkCopied, setPhoneTabLinkCopied] = useState(false);
  const [showSmsText, setShowSmsText] = useState(false);

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
      setShowSmsText(false);
    }
  }, [isOpen]);

  // Auto-generate share link when Phone tab becomes active
  useEffect(() => {
    if (!isOpen || activeTab !== 'phone' || phoneTabLink || phoneTabLinkLoading) return;
    if (!onGenerateNewLink) return;

    setPhoneTabLinkLoading(true);
    onGenerateNewLink()
      .then((url) => setPhoneTabLink(url))
      .catch(() => setPhoneTabLink(null))
      .finally(() => setPhoneTabLinkLoading(false));
  }, [isOpen, activeTab, onGenerateNewLink]);

  const { isLoading, shareChecklist } = useVerification();
  const { languages, isTranslating } = useTranslation();

  const buildMsg = (link: string) => {
    const name = recipientName.trim();
    return `Hi${name ? ' ' + name : ''}, here's your cleaning checklist — tap to open: ${link}\n\nNo app download needed, just tap the link.`;
  };

  const handleCopyPhoneLink = () => {
    if (!phoneTabLink) return;
    navigator.clipboard.writeText(phoneTabLink);
    setPhoneTabLinkCopied(true);
    setTimeout(() => setPhoneTabLinkCopied(false), 2000);
  };

  const handleSmsShare = () => {
    if (!phoneTabLink) return;
    const msg = buildMsg(phoneTabLink);
    if (isMobile) {
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`;
    } else {
      setShowSmsText(true);
    }
  };

  const handleWhatsAppShare = () => {
    if (!phoneTabLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildMsg(phoneTabLink))}`, '_blank');
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

      if (response?.shareUrl) {
        setShareLink(response.shareUrl);
        setResponse(response);
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

              {response?.verificationCode && (
                <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                  <p className="text-yellow-800 text-xs font-medium">Development Mode: Verification Code</p>
                  <p className="font-mono text-center text-lg font-bold tracking-wider text-yellow-900 mt-1">
                    {response.verificationCode}
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    This code appears only in development mode to help with testing.
                  </p>
                </div>
              )}
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

              {/* ── Phone tab — new link-sharing flow ── */}
              <TabsContent value="phone" className="space-y-3">
                {phoneTabLinkLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating link…
                  </div>
                ) : phoneTabLink ? (
                  <>
                    {/* Read-only link */}
                    <div className="flex items-center space-x-2">
                      <Input readOnly value={phoneTabLink} className="flex-1 text-sm" />
                      <Button onClick={handleCopyPhoneLink} variant="outline" size="sm" type="button">
                        {phoneTabLinkCopied ? 'Copied!' : 'Copy'}
                        <ClipboardCopy className="w-4 h-4 ml-2" />
                      </Button>
                    </div>

                    {/* Text your cleaner — primary */}
                    <Button type="button" onClick={handleSmsShare} className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Text your cleaner
                    </Button>

                    {/* Desktop: copyable message textarea */}
                    {showSmsText && (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Copy and send this to your cleaner:</Label>
                        <textarea
                          readOnly
                          className="w-full text-sm border rounded-md p-2 bg-gray-50 resize-none focus:outline-none"
                          rows={4}
                          value={buildMsg(phoneTabLink)}
                        />
                      </div>
                    )}

                    {/* WhatsApp — mobile only */}
                    {isMobile && (
                      <Button type="button" variant="secondary" onClick={handleWhatsAppShare} className="w-full">
                        Send via WhatsApp
                      </Button>
                    )}

                    {/* Copy link — always visible */}
                    <Button type="button" variant="ghost" onClick={handleCopyPhoneLink} className="w-full">
                      <ClipboardCopy className="w-4 h-4 mr-2" />
                      {phoneTabLinkCopied ? 'Copied!' : 'Copy link'}
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Unable to generate link. Please close and reopen this dialog.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm flex items-start">
              <Smartphone className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                {activeTab === 'phone'
                  ? 'Send the link from your own phone — no verification code needed for your cleaner.'
                  : 'Email shares open directly from the secure inbox link. Recipients can complete the checklist from any device with a web browser.'}
              </p>
            </div>

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
