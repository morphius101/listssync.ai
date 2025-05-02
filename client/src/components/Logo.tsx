import { CheckSquare } from "lucide-react";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export const Logo = ({ size = 'md' }: LogoProps) => {
  return (
    <div className={`text-primary ${sizes[size]}`}>
      <CheckSquare className="w-full h-full" strokeWidth={2} />
    </div>
  );
};