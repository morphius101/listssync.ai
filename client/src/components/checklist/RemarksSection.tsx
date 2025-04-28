import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RemarksSectionProps {
  initialRemarks?: string;
  onChange: (remarks: string) => void;
}

const RemarksSection = ({ initialRemarks = "", onChange }: RemarksSectionProps) => {
  const [remarks, setRemarks] = useState(initialRemarks);

  useEffect(() => {
    setRemarks(initialRemarks);
  }, [initialRemarks]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRemarks(value);
    onChange(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <Label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
        Additional Remarks
      </Label>
      <Textarea
        id="remarks"
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
        placeholder="Add any additional notes here..."
        value={remarks}
        onChange={handleChange}
      />
    </div>
  );
};

export default RemarksSection;
