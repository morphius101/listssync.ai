import { useState } from 'react';
import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PhotoUploadModal } from '@/components/modals/PhotoUploadModal';
import { PhotoViewerModal } from '@/components/modals/PhotoViewerModal';
import { Camera, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TasksListProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  disabled?: boolean;
  checklistId?: string;
}

const TasksList = ({ tasks, onTaskUpdate, onUpdate, disabled = false, checklistId }: TasksListProps) => {
  const handleUpdateTask = onUpdate || onTaskUpdate || (async () => { console.log("Task update not implemented"); });
  const { toast } = useToast();
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string>('');
  const [viewerTaskTitle, setViewerTaskTitle] = useState<string | undefined>(undefined);

  const toggleTaskDetails = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  
  const handleTaskCompletionChange = async (taskId: string, completed: boolean) => {
    if (disabled) return;

    const task = tasks.find(t => t.id === taskId);

    if (task?.photoRequired && completed && !task.photoUrl) {
      setCurrentTaskId(taskId);
      setPhotoUploadModalOpen(true);
    } else {
      try {
        await handleUpdateTask(taskId, { completed });
      } catch (e: any) {
        toast({
          title: 'Could not save change',
          description: e.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handlePhotoUpload = async (photoUrl: string) => {
    if (currentTaskId && !disabled) {
      await handleUpdateTask(currentTaskId, {
        photoUrl,
        completed: true
      });
      setCurrentTaskId(null);
    }
  };
  
  const handlePhotoClick = (task: Task) => {
    if (task.photoUrl) {
      setViewerPhotoUrl(task.photoUrl);
      setViewerTaskTitle(task.description);
      setPhotoViewerOpen(true);
    } else {
      setCurrentTaskId(task.id);
      setPhotoUploadModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-xl font-semibold">Tasks</h2>
      
      <div className="space-y-3">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className={`bg-white border rounded-lg overflow-hidden ${
              task.completed ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="p-3 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={(checked) => 
                    handleTaskCompletionChange(task.id, checked === true)
                  }
                  className="mt-1"
                />
                
                <div>
                  <label 
                    htmlFor={`task-${task.id}`}
                    className={`font-medium ${
                      task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {task.description}
                  </label>
                  
                  {task.photoRequired && (
                    <div className="flex items-center mt-1 text-xs text-blue-600">
                      <Camera className="w-3 h-3 mr-1" />
                      {task.photoUrl ? 'Photo attached' : 'Photo required'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {task.photoUrl && (
                  <button
                    onClick={() => handlePhotoClick(task)}
                    className="w-8 h-8 rounded-md overflow-hidden"
                  >
                    <img 
                      src={task.photoUrl} 
                      alt="Task photo" 
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                
                {task.details && (
                  <button
                    onClick={() => toggleTaskDetails(task.id)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md"
                  >
                    {expandedTasks[task.id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {task.details && expandedTasks[task.id] && (
              <div className="px-3 pb-3 pt-0">
                <div className="pl-8 pr-2 text-sm text-gray-600 border-l-2 border-gray-200">
                  {task.details}
                </div>
              </div>
            )}
            
            {task.photoRequired && !task.photoUrl && task.completed && (
              <div className="px-3 pb-3 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-8"
                  onClick={() => handlePhotoClick(task)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Add required photo
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <div className="py-8 flex flex-col items-center justify-center text-center text-gray-500">
          <Info className="w-10 h-10 mb-2 text-gray-400" />
          <p>No tasks in this checklist.</p>
        </div>
      )}
      
      <PhotoUploadModal
        isOpen={photoUploadModalOpen}
        onClose={() => setPhotoUploadModalOpen(false)}
        onSave={handlePhotoUpload}
        taskId={currentTaskId ?? undefined}
        checklistId={checklistId}
      />

      <PhotoViewerModal
        isOpen={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        photoUrl={viewerPhotoUrl}
        taskTitle={viewerTaskTitle}
      />
    </div>
  );
};

export default TasksList;