import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

const Admin = () => {
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-silver">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to /auth
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal p-4">
        <div className="text-center space-y-4 max-w-md">
          <ShieldAlert className="h-16 w-16 mx-auto text-red-400" />
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-silver">
            You don't have admin privileges. Please contact an administrator to request access.
          </p>
          <p className="text-sm text-silver/60">
            Signed in as: {user.email}
          </p>
          <Button onClick={signOut} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
};

export default Admin;