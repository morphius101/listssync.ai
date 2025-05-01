import { ClipboardCheck, Wifi, Zap, Camera, Clock, Users, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import { Link } from "wouter";

const Feature = ({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => (
  <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-shrink-0 mt-1">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
    </div>
    <div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Sync real-time checklists with <span className="text-primary">instant photo proof</span>
            </h1>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              No app downloads, no confusion. Just clarity across teams.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/dashboard">
                <Button className="px-6 py-3 text-base mr-4">Get Started</Button>
              </Link>
              <Button variant="outline" className="px-6 py-3 text-base">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Why teams choose ListsSync.ai
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-gray-500 sm:mt-4">
              Built for the way real teams work in the field
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Feature 
              icon={<Smartphone className="w-6 h-6" />} 
              title="No apps to download" 
              description="Just a clean link. Share it with anyone and they can get started immediately."
            />
            <Feature 
              icon={<Users className="w-6 h-6" />} 
              title="Built for field teams" 
              description="Designed for cleaners, contractors, and field teams — not generic forms."
            />
            <Feature 
              icon={<Camera className="w-6 h-6" />} 
              title="Seamless photo proof" 
              description="Track tasks and collect photo proof in one smooth flow."
            />
            <Feature 
              icon={<Wifi className="w-6 h-6" />} 
              title="Works offline" 
              description="Works with or without WiFi. Because real work isn't always online."
            />
            <Feature 
              icon={<Zap className="w-6 h-6" />} 
              title="Real-time updates" 
              description="Live checklist view — no waiting until after it's too late."
            />
            <Feature 
              icon={<Clock className="w-6 h-6" />} 
              title="Full control" 
              description="You stay in control — update your checklist anytime, even mid-job."
            />
          </div>
        </div>
      </div>
      
      {/* Call to Action */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-indigo-200">Start creating your first checklist today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/dashboard">
                <Button className="px-5 py-3 text-base font-medium">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;