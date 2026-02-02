import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { ProfilesView } from "./ProfilesView";
import { MatchingView } from "./MatchingView";
import { MatchesListView } from "./MatchesListView";
import { ToolsView } from "./ToolsView";

export const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<"profiles" | "matching" | "matches" | "tools">("profiles");

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {activeSection === "profiles" && <ProfilesView />}
      {activeSection === "matching" && <MatchingView />}
      {activeSection === "matches" && <MatchesListView />}
      {activeSection === "tools" && <ToolsView />}
    </AdminLayout>
  );
};
