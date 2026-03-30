import { ClipboardList, Clock, CheckCircle, ListChecks } from "lucide-react";

interface DashboardStatsProps {
  activeChecklists: number;
  inProgressChecklists: number;
  completedToday: number;
  totalTasks?: number;
}

const DashboardStats = ({ 
  activeChecklists, 
  inProgressChecklists, 
  completedToday,
  totalTasks = 0,
}: DashboardStatsProps) => {
  const stats = [
    {
      label: 'Total Checklists',
      value: activeChecklists,
      icon: ClipboardList,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'In Progress',
      value: inProgressChecklists,
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Completed',
      value: completedToday,
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-500',
    },
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: ListChecks,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2.5 ${stat.iconBg} rounded-lg`}>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
