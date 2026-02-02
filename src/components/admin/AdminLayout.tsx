import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  GitMerge, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Home,
  Wrench,
  ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: "profiles" | "matching" | "matches" | "tools";
  onSectionChange: (section: "profiles" | "matching" | "matches" | "tools") => void;
}

const navItems = [
  { id: "profiles" as const, label: "Profiles", icon: Users, description: "Browse & manage founders" },
  { id: "matching" as const, label: "Matching", icon: GitMerge, description: "Connect founders manually" },
  { id: "matches" as const, label: "Matches", icon: ListChecks, description: "View computed matches" },
  { id: "tools" as const, label: "Tools", icon: Wrench, description: "System utilities" },
];

export const AdminLayout = ({ children, activeSection, onSectionChange }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex w-full bg-charcoal">
      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col border-r border-white/5 bg-charcoal transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
              <Home className="h-4 w-4" />
              <span className="text-sm font-medium">Meet Line</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-silver/60 hover:text-white hover:bg-white/5 h-8 w-8 p-0",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200 group",
                activeSection === item.id
                  ? "bg-white/10 text-white"
                  : "text-silver/60 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", activeSection === item.id && "text-white")} />
              {!collapsed && (
                <div className="text-left">
                  <span className="text-sm font-medium block">{item.label}</span>
                  <span className="text-xs text-silver/40 group-hover:text-silver/60 transition-colors">
                    {item.description}
                  </span>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={cn(
              "w-full text-silver/60 hover:text-white hover:bg-white/5 justify-start gap-3",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
