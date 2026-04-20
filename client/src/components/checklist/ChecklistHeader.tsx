import { Checklist } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistHeaderProps {
  checklist?: Checklist;
  name?: string;
  status?: 'not-started' | 'in-progress' | 'completed';
  progress?: number;
}

const ChecklistHeader = ({ checklist, name: propName, status: propStatus, progress: propProgress }: ChecklistHeaderProps) => {
  const name = propName || checklist?.name || "Untitled Checklist";
  const status = propStatus || checklist?.status || "not-started";
  const progress = propProgress !== undefined ? propProgress : (checklist?.progress || 0);
  const createdAt = checklist?.createdAt;
  const updatedAt = checklist?.updatedAt;
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    }
  };
  
  const formattedDate = (date: Date | any) => {
    try {
      // Handle both Date objects and Firestore timestamps
      const dateObj = date instanceof Date ? date : new Date(date.seconds * 1000);
      return format(dateObj, 'MMM d, yyyy');
    } catch (error) {
      return 'Unknown date';
    }
  };

  const submittedAt = checklist?.submittedAt;
  const submittedDateStr = (() => {
    if (!submittedAt) return null;
    try {
      const d = submittedAt instanceof Date ? submittedAt : new Date(submittedAt as string);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  })();

  return (
    <div className="mb-6">
      {submittedDateStr && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Submitted by recipient on {submittedDateStr}</span>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">{name}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge className={`flex items-center ${getStatusColor()}`}>
          {getStatusIcon()}
          {status === 'not-started' ? 'Not Started' :
            status === 'in-progress' ? 'In Progress' : 'Completed'}
        </Badge>

        <Badge variant="outline" className="flex items-center">
          <span className="font-medium">{progress}%</span>
        </Badge>
      </div>

      <div className="flex items-center text-sm text-gray-500">
        <Calendar className="w-3.5 h-3.5 mr-1" />
        <span>Created: {formattedDate(createdAt)}</span>

        {updatedAt && updatedAt !== createdAt && (
          <span className="ml-4">
            Updated: {formattedDate(updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChecklistHeader;