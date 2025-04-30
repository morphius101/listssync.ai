import Logo from "./Logo";
import { Menu } from "lucide-react";
import { Link } from "wouter";

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
          </Link>
          <p className="text-xs text-gray-500 mt-1 hidden sm:block ml-12">
            Real-time checklists with instant photo proof
          </p>
        </div>
        <div>
          <button className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
