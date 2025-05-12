import { useState, useRef, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoUrl: string) => void;
}

export const PhotoUploadModal = ({ isOpen, onClose, onSave }: PhotoUploadModalProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image size should be less than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemovePhoto = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSavePhoto = async () => {
    if (!selectedImage) return;
    
    setIsUploading(true);
    try {
      // In a real implementation, we would upload the image to a server or cloud storage
      // and get back a URL. For this demo, we'll just use the data URL directly.
      
      // Simulating a network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(selectedImage);
      setSelectedImage(null);
      
      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogDescription>
            Take or upload a photo for this task.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {selectedImage ? (
            <div className="relative">
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="rounded-md w-full h-auto max-h-80 object-contain bg-gray-100" 
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={handleRemovePhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex flex-col space-y-2">
                <p className="text-sm text-gray-500">
                  Take a photo or upload from your device
                </p>
                <Button 
                  variant="secondary" 
                  className="mx-auto"
                  onClick={handleSelectPhoto}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Photo
                </Button>
              </div>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSavePhoto} 
            disabled={!selectedImage || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Save Photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};