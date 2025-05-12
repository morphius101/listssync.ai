import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';

interface RemarksSectionProps {
  initialRemarks?: string;
  onChange: (remarks: string) => void;
}

const RemarksSection = ({ initialRemarks = "", onChange }: RemarksSectionProps) => {
  const [remarks, setRemarks] = useState(initialRemarks);

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRemarks(value);
    onChange(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <MessageSquare className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-medium">Notes & Remarks</h2>
      </div>
      
      <Textarea 
        placeholder="Add any notes, observations, or issues encountered during the inspection..." 
        value={remarks}
        onChange={handleRemarksChange}
        className="min-h-[120px]"
      />
      
      <p className="text-xs text-gray-500">
        These remarks will be saved with your completed checklist.
      </p>
    </div>
  );
};

export default RemarksSection;