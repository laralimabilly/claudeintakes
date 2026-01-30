import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-10 sm:py-14 px-4 sm:px-6 bg-[hsl(0_0%_5%)] border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm">
          <Link to="/" className="font-medium text-white hover:text-silver transition-colors min-h-[44px] flex items-center">
            Evan Buhler © 2025
          </Link>
          <Link 
            to="/privacy" 
            className="text-silver hover:text-white transition-colors min-h-[44px] flex items-center"
          >
            Privacy Policy
          </Link>
          <Link 
            to="/terms" 
            className="text-silver hover:text-white transition-colors min-h-[44px] flex items-center"
          >
            Terms of Service
          </Link>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-silver">
          <span>Built with</span>
          <Heart className="w-4 h-4 text-silver fill-silver" />
          <span>for founders</span>
        </div>
      </div>
    </footer>
  );
};