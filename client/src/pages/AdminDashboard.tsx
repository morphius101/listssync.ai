import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ChecklistsManager from "@/components/dashboard/ChecklistsManager";
import ChecklistEditor from "@/components/dashboard/ChecklistEditor";
import ShareLinkModal from "@/components/modals/ShareLinkModal";
import { Checklist, ChecklistSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getChecklists, createChecklist, updateChecklist, deleteChecklist, generateShareLink } from "@/services/checklistService";

const AdminDashboard = () => {
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    setIsLoading(true);
    try {
      const data = await getChecklists();
      setChecklists(data);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      toast({
        title: "Error",
        description: "Failed to load checklists. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentChecklist(null);
    setIsEditing(true);
  };

  const handleEdit = async (id: string) => {
    try {
      // Find checklist in the existing list
      const summaryChecklist = checklists.find(c => c.id === id);
      
      if (summaryChecklist) {
        // Create a full checklist object from the summary
        const checklist: Checklist = {
          id: summaryChecklist.id,
          name: summaryChecklist.name,
          status: summaryChecklist.status,
          progress: summaryChecklist.progress,
          createdAt: summaryChecklist.createdAt,
          updatedAt: summaryChecklist.updatedAt,
          tasks: [],
          remarks: "",
        };
        
        setCurrentChecklist(checklist);
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error fetching checklist:", error);
      toast({
        title: "Error",
        description: "Failed to load checklist details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    setChecklistToDelete(id);
  };

  const confirmDelete = async () => {
    if (!checklistToDelete) return;
    
    try {
      await deleteChecklist(checklistToDelete);
      setChecklists(checklists.filter(c => c.id !== checklistToDelete));
      toast({
        title: "Success",
        description: "Checklist deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting checklist:", error);
      toast({
        title: "Error",
        description: "Failed to delete checklist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecklistToDelete(null);
    }
  };

  const handleShare = (id: string) => {
    const summaryChecklist = checklists.find(c => c.id === id);
    if (summaryChecklist) {
      // Create a full checklist object from the summary
      const checklist: Checklist = {
        id: summaryChecklist.id,
        name: summaryChecklist.name,
        status: summaryChecklist.status,
        progress: summaryChecklist.progress,
        createdAt: summaryChecklist.createdAt,
        updatedAt: summaryChecklist.updatedAt,
        tasks: [],
        remarks: "",
      };
      setCurrentChecklist(checklist);
      setIsShareModalOpen(true);
    }
  };

  const handleView = (id: string) => {
    setLocation(`/checklist/${id}`);
  };

  const handleSaveChecklist = async (checklist: Checklist) => {
    try {
      if (checklist.id && checklists.some(c => c.id === checklist.id)) {
        // Update existing checklist
        await updateChecklist(checklist);
        setChecklists(checklists.map(c => c.id === checklist.id ? {...c, ...checklist} : c));
      } else {
        // Create new checklist
        const newChecklist = await createChecklist(checklist);
        setChecklists([...checklists, newChecklist]);
      }
      setIsEditing(false);
      return Promise.resolve();
    } catch (error) {
      console.error("Error saving checklist:", error);
      return Promise.reject(error);
    }
  };

  const handleGenerateNewLink = async () => {
    if (!currentChecklist) return "";
    
    try {
      const link = await generateShareLink(currentChecklist.id);
      return link;
    } catch (error) {
      console.error("Error generating share link:", error);
      return Promise.reject(error);
    }
  };

  const getStats = () => {
    const totalActive = checklists.length;
    const inProgress = checklists.filter(c => c.status === 'in-progress').length;
    
    // Count completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedToday = checklists.filter(c => {
      if (c.status !== 'completed') return false;
      
      // Convert timestamp to date if needed
      const updatedAt = c.updatedAt instanceof Date ? 
        c.updatedAt : 
        new Date(c.updatedAt);
      
      return updatedAt >= today;
    }).length;
    
    return {
      activeChecklists: totalActive,
      inProgressChecklists: inProgress,
      completedToday,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {isEditing ? (
        <ChecklistEditor
          checklist={currentChecklist}
          onSave={handleSaveChecklist}
          onCancel={() => setIsEditing(false)}
          onShare={() => setIsShareModalOpen(true)}
        />
      ) : (
        <>
          <DashboardStats {...getStats()} />
          
          <ChecklistsManager
            checklists={checklists}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShare={handleShare}
            onView={handleView}
          />
        </>
      )}
      
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        checklistId={currentChecklist?.id || ""}
        checklist={currentChecklist}
        onGenerateNewLink={handleGenerateNewLink}
      />
      
      <AlertDialog open={!!checklistToDelete} onOpenChange={() => setChecklistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              checklist and all associated tasks and photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
