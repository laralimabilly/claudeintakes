import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { ProfilesView } from "./ProfilesView";
import { MatchingView } from "./MatchingView";
import { ToolsView } from "./ToolsView";

export const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<"profiles" | "matching" | "tools">("profiles");

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {activeSection === "profiles" && <ProfilesView />}
      {activeSection === "matching" && <MatchingView />}
      {activeSection === "tools" && <ToolsView />}
    </AdminLayout>
  );
};
