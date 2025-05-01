import { ClipboardCheck, Check, List } from "lucide-react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ size = 'md' }: LogoProps) => {
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      icon: 'h-5 w-5',
      text: 'text-lg'
    },
    md: {
      container: 'w-10 h-10',
      icon: 'h-6 w-6',
      text: 'text-xl'
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'h-7 w-7',
      text: 'text-2xl'
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizes[size].container} rounded-lg bg-primary flex items-center justify-center`}>
        <List className={`${sizes[size].icon} text-white absolute`} />
        <Check className={`${sizes[size].icon} text-white relative ml-1 mt-1`} />
      </div>
      <div className={`${sizes[size].text} font-bold`}>
        <span className="text-primary">Lists</span>
        <span className="text-gray-800">Sync</span>
        <span className="text-primary">.ai</span>
      </div>
    </div>
  );
};

export default Logo;
