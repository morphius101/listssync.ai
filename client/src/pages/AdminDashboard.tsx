import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ChecklistsManager from "@/components/dashboard/ChecklistsManager";
import ChecklistEditor from "@/components/dashboard/ChecklistEditor";
import ShareLinkModal from "@/components/modals/ShareLinkModal";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { DevelopmentBanner } from "@/components/DevelopmentBanner";
import { Checklist, ChecklistSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getChecklists, getChecklistById, createChecklist, updateChecklist, deleteChecklist, generateShareLink } from "@/services/checklistService";

const AdminDashboard = () => {
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
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

  const handleCreateNew = async () => {
    if (!user) return;

    // Check usage limits before creating new checklist
    try {
      const response = await fetch(`/api/user/${user.uid}/subscription`);
      const subscription = await response.json();
      
      if (subscription.limits.maxLists !== Infinity && checklists.length >= subscription.limits.maxLists) {
        toast({
          title: "Checklist Limit Reached",
          description: `You've reached your plan's limit of ${subscription.limits.maxLists} checklists. Please upgrade to create more.`,
          variant: "destructive",
        });
        setLocation('/pricing');
        return;
      }
    } catch (error) {
      console.error('Error checking subscription limits:', error);
    }

    setCurrentChecklist(null);
    setIsEditing(true);
  };

  const handleEdit = async (id: string) => {
    try {
      // Fetch the full checklist with tasks from the server
      const fullChecklist = await getChecklistById(id);
      
      if (fullChecklist) {
        setCurrentChecklist(fullChecklist);
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

  const handleShare = async (id: string) => {
    try {
      console.log("Sharing checklist with ID:", id);
      
      // Fetch the full checklist with tasks from the server
      const fullChecklist = await getChecklistById(id);
      console.log("Fetched full checklist:", fullChecklist);
      
      if (fullChecklist) {
        setCurrentChecklist(fullChecklist);
        console.log("Set current checklist:", fullChecklist.id);
        setIsShareModalOpen(true);
      } else {
        console.error("Could not fetch checklist with ID:", id);
        toast({
          title: "Error",
          description: "Could not load checklist for sharing. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching checklist for sharing:", error);
      toast({
        title: "Error",
        description: "Failed to load checklist details for sharing. Please try again.",
        variant: "destructive",
      });
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

  const handleUpgrade = () => {
    setLocation('/pricing');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Development Banner */}
      <DevelopmentBanner />
      
      {/* Subscription Status */}
      {user && (
        <div className="mb-6">
          <SubscriptionStatus userId={user.uid} onUpgrade={handleUpgrade} />
        </div>
      )}
      
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
      
      {currentChecklist && (
        <ShareLinkModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          checklistId={currentChecklist.id}
          checklist={currentChecklist}
          onGenerateNewLink={handleGenerateNewLink}
        />
      )}
      
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
