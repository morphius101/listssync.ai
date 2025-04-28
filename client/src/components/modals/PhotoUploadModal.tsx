import { useState, useRef } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Image, Upload } from "lucide-react";
import { getFirebase, ref, uploadBytes, getDownloadURL } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoUrl: string) => void;
}

const PhotoUploadModal = ({ isOpen, onClose, onSave }: PhotoUploadModalProps) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.click();
    }
  };
  
  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.click();
    }
  };
  
  const handleUpload = async () => {
    if (!photo) return;
    
    setUploading(true);
    
    try {
      const { storage } = getFirebase();
      const storageRef = ref(storage, `photos/${Date.now()}_${photo.name}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, photo);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Pass URL to parent component
      onSave(downloadUrl);
      
      // Reset state
      setPhoto(null);
      setPhotoPreview(null);
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleClose = () => {
    setPhoto(null);
    setPhotoPreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {photoPreview ? (
            <div className="relative">
              <img 
                src={photoPreview} 
                alt="Preview" 
                className="w-full rounded-md object-cover max-h-64" 
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="mb-4 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50"
              onClick={handleGalleryClick}
            >
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Tap to take a photo or upload from gallery</p>
            </div>
          )}
          
          <input 
            type="file"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          
          {!photoPreview && (
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCameraClick}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Camera</span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleGalleryClick}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Image className="h-5 w-5" />
                  <span>Gallery</span>
                </div>
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!photo || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUploadModal;
