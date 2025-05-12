import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checklist } from '@/types';
import { generateShareLink } from '@/services/checklistService';
import ShareLinkModal from './ShareLinkModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Copy, Mail, QrCode, Link, Share } from 'lucide-react';

interface ShareChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: Checklist;
}

export function ShareChecklistModal({
  isOpen,
  onClose,
  checklist
}: ShareChecklistModalProps) {
  const [activeTab, setActiveTab] = useState<string>('link');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const isMobile = useIsMobile();
  
  // Generate a QR code for the checklist
  const shareUrl = window.location.origin + '/shared/' + checklist.id;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  
  // Share via native share API (mobile)
  const handleNativeShare = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `ListsSync.ai: ${checklist.name}`,
          text: `Check out this checklist: ${checklist.name}`,
          url: shareUrl,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };
  
  // Open the verification modal
  const handleOpenLinkModal = () => {
    setShowLinkModal(true);
  };

  return (
    <>
      <Dialog open={isOpen && !showLinkModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Checklist</DialogTitle>
            <DialogDescription>
              Choose how you want to share this checklist
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="link" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link" className="flex items-center">
                <Link className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Send
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="py-4">
              <div className="flex flex-col space-y-4">
                <p className="text-sm text-gray-500">
                  Copy this link to share the checklist directly
                </p>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button 
                    onClick={handleCopyLink} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  
                  {isMobile && typeof navigator.share === 'function' && (
                    <Button 
                      onClick={handleNativeShare}
                      variant="outline"
                      className="flex-1"
                    >
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                </div>
                
                <Button onClick={handleOpenLinkModal} className="mt-2">
                  Share with Verification
                </Button>
                
                <p className="text-xs text-gray-400 mt-2">
                  Sharing with verification allows you to control who can access the checklist and track their completion.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="qr" className="py-4">
              <div className="flex flex-col items-center space-y-4">
                <p className="text-sm text-gray-500">
                  Scan this QR code to open the checklist on another device
                </p>
                
                <div className="border border-gray-200 p-2 rounded-md">
                  <img 
                    src={qrCodeUrl}
                    alt="QR Code for Checklist"
                    className="w-full max-w-[200px] h-auto"
                  />
                </div>
                
                <Button onClick={handleOpenLinkModal} className="mt-2">
                  Share with Verification
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="py-4">
              <div className="flex flex-col space-y-4">
                <p className="text-sm text-gray-500">
                  Send this checklist to someone via email or text message with a verification code
                </p>
                
                <Button onClick={handleOpenLinkModal} className="mt-2">
                  Send with Verification
                </Button>
                
                <p className="text-xs text-gray-400 mt-2">
                  Recipients will need to verify their identity before accessing the checklist.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {showLinkModal && (
        <ShareLinkModal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            onClose();
          }}
          checklistId={checklist.id}
          checklist={checklist}
        />
      )}
    </>
  );
}