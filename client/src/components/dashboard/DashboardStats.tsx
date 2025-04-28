import { ClipboardList, Clock, CheckCircle } from "lucide-react";

interface DashboardStatsProps {
  activeChecklists: number;
  inProgressChecklists: number;
  completedToday: number;
}

const DashboardStats = ({ 
  activeChecklists, 
  inProgressChecklists, 
  completedToday 
}: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Checklists</p>
            <p className="text-3xl font-bold text-gray-900">{activeChecklists}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-gray-900">{inProgressChecklists}</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-full">
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Completed Today</p>
            <p className="text-3xl font-bold text-gray-900">{completedToday}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
