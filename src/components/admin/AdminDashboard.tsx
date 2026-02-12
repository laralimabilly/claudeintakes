import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { ProfilesView } from "./ProfilesView";
import { MatchingView } from "./MatchingView";
import { MatchesListView } from "./MatchesListView";
import { ToolsView } from "./ToolsView";
import WhatsAppView from "./WhatsAppView";
import { SystemParametersView } from "./SystemParametersView";
import { SystemParametersProvider } from "@/contexts/SystemParametersContext";

export const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<"profiles" | "matching" | "matches" | "tools" | "whatsapp" | "config">("profiles");

  return (
    <SystemParametersProvider>
      <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {activeSection === "profiles" && <ProfilesView />}
        {activeSection === "matching" && <MatchingView />}
        {activeSection === "matches" && <MatchesListView />}
        {activeSection === "tools" && <ToolsView />}
        {activeSection === "whatsapp" && <WhatsAppView />}
        {activeSection === "config" && <SystemParametersView />}
      </AdminLayout>
    </SystemParametersProvider>
  );
};
