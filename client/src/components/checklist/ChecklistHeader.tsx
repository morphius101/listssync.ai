import { Checklist } from "@/types";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChecklistHeaderProps {
  checklist: Checklist;
}

const ChecklistHeader = ({ checklist }: ChecklistHeaderProps) => {
  const completed = checklist.tasks.filter(task => task.completed).length;
  const total = checklist.tasks.length;
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">{checklist.name}</h1>
        <p className="text-sm text-gray-500">
          {total} tasks to complete
        </p>
        
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3 text-sm text-blue-700">
              <p>Tap tasks to mark complete. Camera icon means a photo is required.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 rounded-b-lg">
        <div className="flex items-center px-4 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">{progressPercentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default ChecklistHeader;
