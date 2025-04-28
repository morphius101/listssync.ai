import { useState } from "react";
import { Task } from "@/types";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PhotoUploadModal from "../modals/PhotoUploadModal";

interface TasksListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const TasksList = ({ tasks, onTaskUpdate }: TasksListProps) => {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await onTaskUpdate(taskId, { completed: !completed });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleUploadPhoto = (taskId: string) => {
    setCurrentTaskId(taskId);
    setIsPhotoModalOpen(true);
  };

  const handlePhotoUploaded = async (photoUrl: string) => {
    if (currentTaskId) {
      try {
        await onTaskUpdate(currentTaskId, { photoUrl });
        setIsPhotoModalOpen(false);
        setCurrentTaskId(null);
      } catch (error) {
        console.error("Error saving photo URL:", error);
      }
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <ul className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <li key={task.id} className={`p-4 hover:bg-gray-50 transition-colors ${task.completed ? 'bg-gray-50' : ''}`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`w-6 h-6 ${
                      task.completed
                        ? "bg-primary border-2 border-primary"
                        : "border-2 border-gray-300"
                    } rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 p-0 flex items-center justify-center`}
                    onClick={() => handleToggleTask(task.id, task.completed)}
                  >
                    {task.completed && <Check className="h-4 w-4 text-white" />}
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>
                    {task.description}
                  </p>
                  {task.details && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {task.details}
                    </p>
                  )}
                  {task.photoUrl && (
                    <div className="mt-2">
                      <img 
                        src={task.photoUrl} 
                        alt="Task photo" 
                        className="h-24 w-auto rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {task.completed ? (
                    <Badge variant="success" className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  ) : task.photoRequired ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1 text-primary rounded-full hover:bg-blue-50"
                      onClick={() => handleUploadPhoto(task.id)}
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onSave={handlePhotoUploaded}
      />
    </>
  );
};

export default TasksList;
