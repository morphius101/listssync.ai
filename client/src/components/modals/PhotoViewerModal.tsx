import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  taskTitle?: string;
}

export const PhotoViewerModal = ({ isOpen, onClose, photoUrl, taskTitle }: PhotoViewerModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] p-4 sm:p-6 bg-background">
        <DialogHeader>
          <DialogTitle className="text-base pr-8 break-words">
            {taskTitle || 'Task photo'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size proof photo for this task.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center">
          <img
            src={photoUrl}
            alt={taskTitle ? `Photo for ${taskTitle}` : 'Task photo'}
            className="max-h-[80vh] max-w-full object-contain rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoViewerModal;
