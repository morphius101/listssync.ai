import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistId: string;
  onGenerateNewLink: () => Promise<string>;
}

const ShareLinkModal = ({ isOpen, onClose, checklistId, onGenerateNewLink }: ShareLinkModalProps) => {
  const [shareLink, setShareLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  // Generate link when modal opens
  useEffect(() => {
    if (isOpen && !shareLink) {
      generateLink();
    }
  }, [isOpen]);
  
  const generateLink = async () => {
    setIsGenerating(true);
    try {
      const newLink = await onGenerateNewLink();
      setShareLink(newLink);
    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    }).catch(err => {
      console.error('Error copying text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Checklist</DialogTitle>
          <DialogDescription>
            Share this link with your cleaner
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex">
            <Input
              type="text"
              readOnly
              className="flex-1 rounded-r-none"
              value={shareLink}
            />
            <Button
              className="rounded-l-none"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3 text-sm text-blue-700">
                <p>Anyone with this link can view and complete the checklist. Generate a new link if needed for security.</p>
              </div>
            </div>
          </div>
          
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-primary hover:text-primary-dark font-medium focus:outline-none flex items-center space-x-1"
              disabled={isGenerating}
              onClick={generateLink}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              <span>Generate New Link</span>
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkModal;
