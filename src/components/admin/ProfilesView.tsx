import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminStats } from "./AdminStats";
import { AdminFilters } from "./AdminFilters";
import { ExpandableProfileCard } from "./ExpandableProfileCard";
import { ProfileModal } from "./ProfileModal";
import { BulkActionsBar } from "./BulkActionsBar";
import { Import, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type FounderProfile = Tables<"founder_profiles">;

interface ProfilesViewProps {
  onSelectForMatching?: (profiles: FounderProfile[]) => void;
}

export const ProfilesView = ({ onSelectForMatching }: ProfilesViewProps) => {
  const [profiles, setProfiles] = useState<FounderProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<FounderProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<FounderProfile | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    stage: "all",
    cofounderType: "all",
    locationPreference: "all",
    matched: "all",
    status: "all",
  });
  const [sortBy, setSortBy] = useState<"seriousness_score" | "created_at">("created_at");
  const [importCallId, setImportCallId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterAndSortProfiles();
  }, [profiles, searchTerm, filters, sortBy]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Error fetching profiles",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProfiles = () => {
    let filtered = [...profiles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((profile) => {
        const ideaMatch = profile.idea_description?.toLowerCase().includes(term);
        const skillsMatch = profile.core_skills?.some((skill) => skill.toLowerCase().includes(term));
        const seekingMatch = profile.seeking_skills?.some((skill) => skill.toLowerCase().includes(term));
        const locationMatch = profile.location_preference?.toLowerCase().includes(term);
        const phoneMatch = profile.phone_number?.includes(term);
        const nameMatch = profile.name?.toLowerCase().includes(term);
        return ideaMatch || skillsMatch || seekingMatch || locationMatch || phoneMatch || nameMatch;
      });
    }

    if (filters.stage !== "all") {
      filtered = filtered.filter((p) => p.stage?.toLowerCase().includes(filters.stage.toLowerCase()));
    }
    if (filters.cofounderType !== "all") {
      filtered = filtered.filter((p) => {
        const type = p.cofounder_type?.toLowerCase() || "";
        const filterValue = filters.cofounderType.toLowerCase();
        if (filterValue === "mix") {
          return type.includes("mix") || (type.includes("technical") && type.includes("growth"));
        }
        return type.includes(filterValue);
      });
    }
    if (filters.locationPreference !== "all") {
      filtered = filtered.filter((p) => p.location_preference?.toLowerCase().includes(filters.locationPreference.toLowerCase()));
    }
    if (filters.matched !== "all") {
      filtered = filtered.filter((p) => p.matched === (filters.matched === "true"));
    }
    if (filters.status !== "all") {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    filtered.sort((a, b) => {
      if (sortBy === "seriousness_score") {
        return (b.seriousness_score || 0) - (a.seriousness_score || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredProfiles(filtered);
  };

  const handleToggleSelect = (profileId: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const handleClearSelection = () => setSelectedProfileIds(new Set());

  const handleEdit = (profile: FounderProfile) => {
    setSelectedProfile(profile);
    handleClearSelection();
  };

  const handleDelete = async (profileIds: string[]) => {
    if (!confirm(`Delete ${profileIds.length} profile(s)? This cannot be undone.`)) return;
    toast({ title: "Delete functionality", description: "Will be implemented" });
    handleClearSelection();
  };

  const handleMarkMatched = async (profileIds: string[]) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      for (const profileId of profileIds) {
        await supabase.functions.invoke("update-profile", {
          headers: { Authorization: `Bearer ${token}` },
          body: { profileId, matched: true },
        });
      }

      await fetchProfiles();
      toast({ title: "Success", description: `${profileIds.length} profile(s) marked as matched` });
      handleClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      });
    }
  };

  const handleSendWhatsAppIntro = async (profiles: FounderProfile[]) => {
    const whatsappProfiles = profiles.filter(p => p.whatsapp || p.phone_number);
    if (whatsappProfiles.length === 0) {
      toast({ title: "No contact info", description: "Selected profiles have no phone/WhatsApp", variant: "destructive" });
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("send-whatsapp-intro", {
        headers: { Authorization: `Bearer ${token}` },
        body: { founderIds: whatsappProfiles.map(p => p.id) },
      });

      if (error) throw error;
      toast({ title: "WhatsApp Intro Sent", description: `Initiated ${data.results?.length || 0} conversations` });
      await fetchProfiles();
      handleClearSelection();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send", variant: "destructive" });
    }
  };

  const handleImportCall = async () => {
    if (!importCallId.trim()) {
      toast({ title: "Error", description: "Enter a call ID", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("import-vapi-calls", {
        headers: { Authorization: `Bearer ${token}` },
        body: { callId: importCallId.trim() },
      });

      if (error) throw error;
      toast({ title: "Success", description: "Call imported" });
      setImportCallId("");
      setShowImport(false);
      fetchProfiles();
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedProfiles = profiles.filter(p => selectedProfileIds.has(p.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xs tracking-widest uppercase text-silver/40">Loading profiles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Profiles</h1>
          <p className="text-xs tracking-widest uppercase text-silver/40 mt-1">
            {profiles.length} founders
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchProfiles}
          className="text-silver/60 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <AdminStats profiles={profiles} />

      {/* Import Section */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Import className="h-4 w-4 text-silver/40" />
            <span className="text-sm text-silver/60">Import Historical Call</span>
          </div>
          {showImport ? <ChevronUp className="h-4 w-4 text-silver/40" /> : <ChevronDown className="h-4 w-4 text-silver/40" />}
        </button>
        {showImport && (
          <div className="px-4 pb-4 pt-2 border-t border-white/5">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Call ID (e.g., 019ab783...)"
                value={importCallId}
                onChange={(e) => setImportCallId(e.target.value)}
                disabled={isImporting}
                className="bg-transparent border-white/10 text-white placeholder:text-silver/30"
              />
              <Button onClick={handleImportCall} disabled={isImporting} className="bg-white text-charcoal hover:bg-white/90">
                {isImporting ? "..." : "Import"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <AdminFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedProfiles={selectedProfiles}
        onClearSelection={handleClearSelection}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMarkMatched={handleMarkMatched}
        onSendWhatsAppIntro={handleSendWhatsAppIntro}
      />

      {/* Results Count */}
      <p className="text-xs tracking-widest uppercase text-silver/40">
        {filteredProfiles.length} {filteredProfiles.length === 1 ? "result" : "results"}
      </p>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
          <ExpandableProfileCard
            key={profile.id}
            profile={profile}
            onViewDetails={() => setSelectedProfile(profile)}
            isSelected={selectedProfileIds.has(profile.id)}
            onToggleSelect={() => handleToggleSelect(profile.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredProfiles.length === 0 && (
        <div className="text-center py-24">
          <p className="text-4xl mb-4 opacity-20">∅</p>
          <h3 className="text-lg font-light text-white/60 mb-2">
            {profiles.length === 0 ? "No profiles yet" : "No matching profiles"}
          </h3>
          <p className="text-sm text-silver/40">
            {profiles.length === 0 
              ? "Profiles appear after phone interviews."
              : "Adjust filters to see more."}
          </p>
        </div>
      )}

      {/* Profile Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onUpdate={fetchProfiles}
        />
      )}
    </div>
  );
};
