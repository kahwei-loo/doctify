import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onTryDemo: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onTryDemo }) => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-landing-accent to-landing-teal">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Doctify</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth/login')}
            >
              Sign In
            </Button>
            <Button
              onClick={onTryDemo}
              className="bg-gradient-to-r from-landing-accent to-landing-teal text-white border-0 hover:opacity-90 transition-opacity"
            >
              Try Demo
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
