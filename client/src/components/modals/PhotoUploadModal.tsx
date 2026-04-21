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
import { initializeFirebase, ref, uploadBytes, getDownloadURL } from '@/lib/firebase';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoUrl: string) => Promise<void>;
  taskId?: string;
  checklistId?: string;
}

export const PhotoUploadModal = ({ isOpen, onClose, onSave, taskId, checklistId }: PhotoUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 10MB', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      const { storage } = initializeFirebase();

      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `task-photos/${checklistId || 'unknown'}/${taskId || 'unknown'}/${timestamp}-${safeName}`;

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      await onSave(downloadUrl);

      // Success path — only runs if onSave resolved (handleTaskToggle now re-throws)
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({ title: 'Photo uploaded', description: 'Photo proof saved successfully.' });
      onClose();
    } catch (error: any) {
      // Failure path — modal stays open, preview stays visible, user can retry
      console.error('Photo upload error:', error);
      toast({
        title: 'Failed to save',
        description: error.message || 'Please try again.',
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
          <DialogTitle>Upload Photo Proof</DialogTitle>
          <DialogDescription>Take or upload a photo to verify this task is complete.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="rounded-md w-full h-auto max-h-80 object-contain bg-gray-100" />
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
            <div
              className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex flex-col space-y-2">
                <p className="text-sm text-gray-500">Tap to take a photo or pick from your device</p>
                <Button variant="secondary" className="mx-auto" type="button">
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
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleSavePhoto} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
            ) : 'Save Photo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
