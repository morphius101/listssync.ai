import { ChecklistSummary } from "@/types";
import { Plus, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface ChecklistsManagerProps {
  checklists: ChecklistSummary[];
  onCreateNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onView: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const ChecklistsManager = ({ 
  checklists, 
  onCreateNew, 
  onEdit, 
  onDelete,
  onShare,
  onView,
  onDuplicate
}: ChecklistsManagerProps) => {
  const [location, setLocation] = useLocation();

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
            Completed
          </div>
        );
      case 'in-progress':
        return (
          <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
            In Progress ({progress || 0}%)
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            Not Started
          </div>
        );
    }
  };

  const formatCreatedAt = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Your Checklists</h2>
        <button 
          onClick={onCreateNew}
          className="px-4 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>New Checklist</span>
          </div>
        </button>
      </div>
      
      <div className="divide-y divide-gray-200">
        {checklists.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No checklists yet. Create your first one!</p>
          </div>
        ) : (
          checklists.map((checklist) => (
            <div key={checklist.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="cursor-pointer" onClick={() => onView(checklist.id)}>
                  <p className="font-medium text-gray-900">{checklist.name}</p>
                  <p className="text-sm text-gray-500">
                    {checklist.taskCount} tasks • Created {formatCreatedAt(checklist.createdAt)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(checklist.status, checklist.progress)}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 rounded-full hover:bg-gray-100">
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(checklist.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(checklist.id)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare(checklist.id)}>
                        Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(checklist.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChecklistsManager;
