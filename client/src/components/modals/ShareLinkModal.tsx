import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVerification } from '@/hooks/useVerification';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';
import { Loader2, ClipboardCopy, Mail, Phone, Languages, Smartphone, Globe } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  checklist?: Checklist;
  onGenerateNewLink?: () => Promise<string>;
}

export default function ShareLinkModal({ 
  isOpen, 
  onClose, 
  checklistId, 
  checklist,
  onGenerateNewLink
}: ShareLinkModalProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [response, setResponse] = useState<any>(null);
  
  const { isLoading, shareChecklist } = useVerification();
  const { languages, isTranslating, translateChecklist } = useTranslation();

  const handleShareLink = async () => {
    if ((activeTab === 'email' && !recipientEmail) || (activeTab === 'phone' && !recipientPhone)) {
      return;
    }
    
    // If we don't have the full checklist object but we have the generateNewLink function, use it directly
    if (!checklist && onGenerateNewLink) {
      try {
        const link = await onGenerateNewLink();
        setShareLink(link);
        setResponse({
          shareUrl: link,
          maskedEmail: activeTab === 'email' ? formatEmailDisplay(recipientEmail) : undefined,
          maskedPhone: activeTab === 'phone' ? formatPhoneDisplay(recipientPhone) : undefined
        });
        return;
      } catch (error) {
        console.error('Error generating link:', error);
        return;
      }
    }
    
    // If we don't have either, we can't proceed
    if (!checklist) {
      console.error('No checklist data available');
      return;
    }
    
    // Create a translated version if not in English
    let checklistToShare = checklist;
    if (selectedLanguage !== 'en') {
      try {
        checklistToShare = await translateChecklist(checklist.id, selectedLanguage, 'en');
      } catch (error) {
        console.error('Translation error:', error);
        // Continue with original checklist if translation fails
      }
    }
    
    // Generate a recipient ID if not provided
    const recipientId = `recipient_${Date.now()}`;
    
    // Share the checklist
    const response = await shareChecklist({
      checklistId: checklistToShare.id,
      email: activeTab === 'email' ? recipientEmail : undefined,
      phone: activeTab === 'phone' ? recipientPhone : undefined,
      recipientName,
      recipientId
    });
    
    if (response?.shareUrl) {
      setShareLink(response.shareUrl);
      setResponse(response);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Checklist</DialogTitle>
          <DialogDescription>
            Send this checklist to team members with verification.
          </DialogDescription>
        </DialogHeader>
        
        {shareLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-md text-green-700">
              <h3 className="font-semibold text-center mb-2">Verification code sent!</h3>
              <p className="text-sm">
                {activeTab === 'email' && response?.maskedEmail && (
                  <>A verification code has been sent to <span className="font-medium">{response.maskedEmail}</span></>
                )}
                {activeTab === 'phone' && response?.maskedPhone && (
                  <>A verification code has been sent to <span className="font-medium">{response.maskedPhone}</span></>
                )}
                {!response?.maskedEmail && !response?.maskedPhone && (
                  <>A verification code has been sent to the recipient</>
                )}
              </p>
              <p className="text-xs mt-1">
                The recipient will need this verification code to access the checklist.
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
              The recipient will need to enter the verification code to access the checklist.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
              
              <TabsContent value="email" className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </TabsContent>
              
              <TabsContent value="phone" className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </TabsContent>
            </Tabs>
            
            <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm flex items-start">
              <Smartphone className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                The recipient will receive a verification code to access the checklist.
                They can complete it from any device with a web browser.
              </p>
            </div>
            
            <Button 
              onClick={handleShareLink} 
              disabled={isLoading || isTranslating || 
                (activeTab === 'email' && !recipientEmail) || 
                (activeTab === 'phone' && !recipientPhone)
              }
              className="w-full"
            >
              {(isLoading || isTranslating) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isTranslating ? 'Translating...' : (isLoading ? 'Sending...' : 'Share Checklist')}
            </Button>
          </div>
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