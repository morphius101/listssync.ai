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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Loader2, Mail, Phone, Languages, Share2, Smartphone, Globe } from 'lucide-react';

interface ShareChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: Checklist;
}

export function ShareChecklistModal({
  isOpen,
  onClose,
  checklist,
}: ShareChecklistModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('email');
  
  const { isLoading, shareChecklist } = useVerification();
  const { languages, isTranslating, translateChecklist } = useTranslation();

  const handleShare = async () => {
    // Check that either email or phone is provided
    if ((activeTab === 'email' && !email) || (activeTab === 'phone' && !phone)) {
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
    
    // Share the checklist
    const response = await shareChecklist(
      checklistToShare.id,
      activeTab === 'email' ? email : undefined,
      activeTab === 'phone' ? phone : undefined,
      recipientName
    );
    
    if (response?.shareUrl) {
      setShareUrl(response.shareUrl);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Share "{checklist.name}"
          </DialogTitle>
          <DialogDescription>
            Send this checklist to a recipient to complete.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {shareUrl ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-green-50 p-3 rounded-md text-green-700 text-center w-full">
                Verification code sent to recipient
              </div>
              
              <div className="flex items-center w-full space-x-2">
                <Input 
                  readOnly 
                  value={shareUrl} 
                  className="flex-1"
                />
                <Button onClick={handleCopyLink} size="sm">
                  Copy
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                The recipient will need to enter the verification code to access the checklist.
              </p>
            </div>
          ) : (
            <>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recipient@example.com"
                  />
                </TabsContent>
                
                <TabsContent value="phone" className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
            </>
          )}
        </div>
        
        <DialogFooter>
          {shareUrl ? (
            <Button onClick={onClose}>
              Done
            </Button>
          ) : (
            <Button 
              onClick={handleShare} 
              disabled={
                isLoading || 
                isTranslating || 
                (activeTab === 'email' && !email) || 
                (activeTab === 'phone' && !phone)
              }
            >
              {(isLoading || isTranslating) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isTranslating ? 'Translating...' : (isLoading ? 'Sending...' : 'Share Checklist')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}