import { useState, useEffect } from "react";
import { Checklist, Task } from "@/types";
import { GripVertical, Plus, Trash2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ChecklistEditorProps {
  checklist: Checklist | null;
  onSave: (checklist: Checklist) => Promise<void>;
  onCancel: () => void;
  onShare: () => void;
}

const ChecklistEditor = ({ checklist, onSave, onCancel, onShare }: ChecklistEditorProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(checklist?.name || "");
  const [tasks, setTasks] = useState<Task[]>(checklist?.tasks || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (checklist) {
      setName(checklist.name);
      setTasks(checklist.tasks || []);
    } else {
      setName("");
      setTasks([]);
    }
  }, [checklist]);

  const handleAddTask = () => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      description: "",
      completed: false,
      photoRequired: false,
      photoUrl: null,
    };
    setTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleTaskChange = (taskId: string, field: keyof Task, value: any) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, [field]: value } : task
    ));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTasks(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Checklist name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (tasks.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one task",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all tasks have descriptions
    const emptyTasks = tasks.some(task => !task.description.trim());
    if (emptyTasks) {
      toast({
        title: "Error",
        description: "All tasks must have descriptions",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedChecklist: Checklist = {
        id: checklist?.id || `checklist_${Date.now()}`,
        name,
        tasks,
        status: checklist?.status || "not-started",
        progress: checklist?.progress || 0,
        createdAt: checklist?.createdAt || new Date(),
        updatedAt: new Date(),
        remarks: checklist?.remarks || "",
      };
      
      await onSave(updatedChecklist);
      
      toast({
        title: "Success",
        description: `Checklist ${checklist ? "updated" : "created"} successfully`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: `Failed to ${checklist ? "update" : "create"} checklist. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {checklist ? "Edit Checklist" : "Create Checklist"}
        </h2>
        {checklist && <p className="text-sm text-gray-500">{checklist.name}</p>}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="mb-6">
            <Label htmlFor="checklist-name" className="block text-sm font-medium text-gray-700 mb-1">
              Checklist Name
            </Label>
            <Input
              id="checklist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              placeholder="e.g. Beach House Cleaning"
              required
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Label className="block text-sm font-medium text-gray-700">Tasks</Label>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleAddTask}
                className="px-2 py-1 text-sm text-primary hover:text-primary-dark focus:outline-none font-medium flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </Button>
            </div>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div 
                    className="space-y-3"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <div {...provided.dragHandleProps} className="cursor-move">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                              type="text"
                              className="flex-1 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                              value={task.description}
                              onChange={(e) => handleTaskChange(task.id, "description", e.target.value)}
                              placeholder="Enter task description"
                            />
                            
                            <div className="flex items-center">
                              <div className="inline-flex items-center cursor-pointer">
                                <span className="mr-2 text-xs text-gray-600">Photo</span>
                                <Switch
                                  checked={task.photoRequired}
                                  onCheckedChange={(checked) => handleTaskChange(task.id, "photoRequired", checked)}
                                />
                              </div>
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {tasks.length === 0 && (
              <div className="p-6 text-center border border-dashed border-gray-300 rounded-md">
                <p className="text-gray-500">No tasks yet. Add some tasks to get started.</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {checklist && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onShare}
                  className="px-4 py-2 text-primary border border-primary rounded-md shadow-sm hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Share2 className="h-4 w-4" />
                    <span>Share Link</span>
                  </div>
                </Button>
              )}
            </div>
            <div className="space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChecklistEditor;
