import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import ChecklistHeader from "@/components/checklist/ChecklistHeader";
import TasksList from "@/components/checklist/TasksList";
import RemarksSection from "@/components/checklist/RemarksSection";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checklist, Task } from "@/types";
import { updateTaskStatus, updateChecklist } from "@/services/checklistService";
import { useRealtimeChecklist } from "@/hooks/useRealtimeChecklist";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ChecklistViewProps {
  id?: string;
}

const ChecklistView = ({ id: propId }: ChecklistViewProps) => {
  const [match, params] = useRoute("/checklist/:id");
  const checklistId = propId || params?.id;
  const { checklist, setChecklist, isLoading } = useRealtimeChecklist(checklistId);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const { toast } = useToast();

  // Sync remarks when checklist loads
  useEffect(() => {
    if (checklist) setRemarks(checklist.remarks || "");
  }, [checklist?.id]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    if (!checklist) return;
    
    try {
      // Optimistically update UI
      const updatedTasks = checklist.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      setChecklist({
        ...checklist,
        tasks: updatedTasks
      });
      
      // Update in Firebase
      await updateTaskStatus(checklist.id, taskId, updates);
      
      // Update progress
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      
      const status = progress === 100 
        ? ('completed' as const) 
        : progress > 0 
          ? ('in-progress' as const) 
          : ('not-started' as const);
      
      setChecklist(prev => prev ? {
        ...prev,
        progress,
        status
      } : null);
      
      await updateChecklist({
        ...checklist,
        tasks: updatedTasks,
        progress,
        status
      });
      
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
      
      // Revert the optimistic update by refetching
      const fresh = await import('@/services/checklistService').then(m => m.getChecklistById(checklist.id));
      if (fresh) setChecklist(fresh);
    }
  };

  const handleRemarksChange = (value: string) => {
    setRemarks(value);
  };

  const handleSubmit = async () => {
    if (!checklist) return;
    
    // Check if all required photo tasks have photos
    const tasksWithoutRequiredPhotos = checklist.tasks.filter(
      task => task.photoRequired && !task.photoUrl && task.completed
    );
    
    if (tasksWithoutRequiredPhotos.length > 0) {
      toast({
        title: "Missing photos",
        description: `${tasksWithoutRequiredPhotos.length} completed ${
          tasksWithoutRequiredPhotos.length === 1 ? "task requires" : "tasks require"
        } a photo. Please upload photos before submitting.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if all tasks are completed
    const incompleteTasks = checklist.tasks.filter(task => !task.completed);
    if (incompleteTasks.length > 0) {
      setShowCompletionDialog(true);
      return;
    }
    
    submitChecklist();
  };

  const submitChecklist = async () => {
    if (!checklist) return;
    
    setIsSubmitting(true);
    try {
      const updatedChecklist: Checklist = {
        ...checklist,
        remarks,
        status: 'completed' as 'completed',
        progress: 100,
        updatedAt: new Date()
      };
      
      await updateChecklist(updatedChecklist);
      
      toast({
        title: "Success",
        description: "Checklist completed and submitted successfully!",
      });
      
      // Redirect to a thank you page or show a success message
      setChecklist(updatedChecklist);
      
    } catch (error) {
      console.error("Error submitting checklist:", error);
      toast({
        title: "Error",
        description: "Failed to submit checklist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowCompletionDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Checklist Not Found</h2>
        <p className="text-gray-600 mb-4">This checklist may have been deleted or the link is invalid.</p>
      </div>
    );
  }

  const isCompleted = checklist.status === 'completed';

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-20">
      <ChecklistHeader checklist={checklist} />
      
      <TasksList 
        tasks={checklist.tasks} 
        onTaskUpdate={handleTaskUpdate}
      />
      
      <RemarksSection 
        initialRemarks={remarks} 
        onChange={handleRemarksChange}
      />
      
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-primary text-white text-center font-medium rounded-md shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Completed Checklist"}
          </Button>
        </div>
      )}
      
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Not all tasks are checked as complete. Do you still want to submit this checklist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCompletionDialog(false)}>
              Cancel
            </AlertDialogAction>
            <AlertDialogAction onClick={submitChecklist} className="bg-primary hover:bg-primary-dark">
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChecklistView;
