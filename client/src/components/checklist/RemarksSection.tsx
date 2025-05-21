import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';

interface RemarksSectionProps {
  initialRemarks?: string;
  onChange?: (remarks: string) => void;
  value?: string;
  disabled?: boolean;
}

const RemarksSection = ({ initialRemarks = "", onChange, value, disabled = false }: RemarksSectionProps) => {
  const [remarks, setRemarks] = useState(initialRemarks || value || "");

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setRemarks(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <MessageSquare className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-medium">Notes & Remarks</h2>
      </div>
      
      <Textarea 
        placeholder="Add notes, observations, or special circumstances that need to be documented..." 
        value={value !== undefined ? value : remarks}
        onChange={handleRemarksChange}
        className="min-h-[120px]"
        disabled={disabled}
      />
      
      <p className="text-xs text-gray-500">
        These remarks will be saved with your completed checklist.
      </p>
    </div>
  );
};

export default RemarksSection;