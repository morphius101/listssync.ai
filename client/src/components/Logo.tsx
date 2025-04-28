import { ClipboardCheck } from "lucide-react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ size = 'md' }: LogoProps) => {
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      icon: 'h-5 w-5'
    },
    md: {
      container: 'w-10 h-10',
      icon: 'h-6 w-6'
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'h-7 w-7'
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizes[size].container} rounded-lg bg-primary flex items-center justify-center`}>
        <ClipboardCheck className={`${sizes[size].icon} text-white`} />
      </div>
      <div className="text-xl font-bold text-gray-800">ClearCheck</div>
    </div>
  );
};

export default Logo;
