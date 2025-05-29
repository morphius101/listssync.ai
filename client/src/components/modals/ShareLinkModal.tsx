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
import { useVerification, SendVerificationParams } from '@/hooks/useVerification';
import { useTranslation, LanguageCode } from '@/hooks/useTranslation';
import { Checklist } from '@/types';
import { AlertTriangle, Loader2, ClipboardCopy, Mail, Phone, Languages, Smartphone, Globe } from 'lucide-react';

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
  console.log("ShareLinkModal rendered with checklistId:", checklistId);
  console.log("ShareLinkModal rendered with checklist:", checklist);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { isLoading, shareChecklist } = useVerification();
  const { languages, isTranslating, translateChecklist } = useTranslation();

  const handleShareLink = async (e?: React.FormEvent) => {
    // If event provided, prevent default form submission
    if (e) e.preventDefault();
    
    // Reset any previous errors
    setError(null);
    
    // Debug form values
    console.log('Share form values:', {
      activeTab,
      recipientEmail,
      recipientPhone,
      recipientName,
      checklistId,
      hasChecklist: !!checklist
    });
    
    // Validate required fields with detailed logging
    if (activeTab === 'email' && !recipientEmail) {
      console.log('Email validation failed: empty email address');
      setError('Please enter a valid email address.');
      return;
    }
    
    if (activeTab === 'phone' && !recipientPhone) {
      console.log('Phone validation failed: empty phone number');
      setError('Please enter a valid phone number.');
      return;
    }
    
    // Log which validation passed
    console.log(`Validation passed for ${activeTab} with value: ${activeTab === 'email' ? recipientEmail : recipientPhone}`);
    
    // Validate checklist ID
    if (!checklistId) {
      console.error("Missing checklist ID");
      setError('Unable to share: missing checklist ID.');
      return;
    }
    
    try {
      // Make a copy of the checklist for potential translation
      let checklistToShare = checklist;
      
      // For now, skip translation to isolate the sharing issue
      // TODO: Re-enable translation once basic sharing works
      if (selectedLanguage !== 'en') {
        console.log('Translation feature temporarily disabled for debugging - using original checklist');
      }
      
      // Always proceed with sharing regardless of checklist object state
      // The important thing is that we have a valid checklistId
      if (!checklistId) {
        setError('No checklist ID available for sharing');
        return;
      }
      
      // Generate a recipient ID and prepare sharing parameters
      const recipientId = `recipient_${Date.now()}`;
      
      const params: SendVerificationParams = {
        checklistId: checklistId, // Use the checklistId prop directly
        recipientName,
        recipientId
      };
      
      // Add contact method based on active tab
      if (activeTab === 'email' && recipientEmail) {
        params.email = recipientEmail;
      } else if (activeTab === 'phone' && recipientPhone) {
        params.phone = recipientPhone;
      }
      
      console.log('Sharing checklist with simplified params:', params);
      
      // Log the complete parameters before making the API call
      console.log('Sharing checklist with params:', params);
      
      // Try a direct fetch call to diagnose the issue
      try {
        console.log('Making direct fetch call with params:', params);
        
        const directResponse = await fetch('/api/verification/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params),
          credentials: 'include'
        });
        
        console.log('Direct fetch response status:', directResponse.status);
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log('Direct fetch success with data:', data);
          
          if (data.shareUrl) {
            setShareLink(data.shareUrl);
            setResponse(data);
            return;
          }
        } else {
          console.error('Direct fetch failed with status:', directResponse.status);
          const errorText = await directResponse.text();
          console.error('Error details:', errorText);
          throw new Error(`API error: ${directResponse.status} - ${errorText}`);
        }
      } catch (directError) {
        console.error('Direct fetch error:', directError);
      }
      
      // If direct fetch failed or returned no data, fall back to the hook
      console.log('Falling back to the shareChecklist hook');
      const response = await shareChecklist(params);
      
      if (response?.shareUrl) {
        setShareLink(response.shareUrl);
        setResponse(response);
      } else {
        setError('Failed to generate a share link. Please try again.');
      }
    } catch (err: any) {
      console.error('Share checklist error:', err);
      setError(err.message || 'Failed to share checklist. Please try again.');
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
                  <>A verification code has been sent to <span className="font-bold">{response.maskedEmail}</span></>
                )}
                {response?.maskedPhone && (
                  <>A verification code has been sent to <span className="font-bold">{response.maskedPhone}</span></>
                )}
                {!response?.maskedEmail && !response?.maskedPhone && (
                  <>A verification code has been sent to the recipient</>
                )}
              </p>
              <p className="text-xs mt-1">
                The recipient will need this verification code to access the checklist.
              </p>
              
              {/* Display verification code in development mode */}
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
              The recipient will need to enter the verification code to access the checklist.
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
            
            {error && (
              <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <Button 
              type="submit"
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