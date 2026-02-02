import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Save, X, Link2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FounderProfile } from "@/types/founder";

interface ProfileModalProps {
  profile: FounderProfile;
  onClose: () => void;
  onUpdate?: () => void;
}

export const ProfileModal = ({ profile, onClose, onUpdate }: ProfileModalProps) => {
  const [status, setStatus] = useState<string>(profile.status || "new");
  const [adminNotes, setAdminNotes] = useState(profile.admin_notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Get the user's session token for authenticated edge function call
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Route through edge function for proper server-side admin verification
      const { data, error } = await supabase.functions.invoke("update-profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          profileId: profile.id,
          status: status,
          admin_notes: adminNotes 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateReport = () => {
    const formatValue = (value: any): string => {
      if (!value) return "N/A";
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return String(value);
    };

    const report = `
FOUNDER PROFILE REPORT
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════════════════════════════

CONTACT INFORMATION
──────────────────────────────────────────────────────────────
Phone Number: ${formatValue(profile.phone_number)}
WhatsApp: ${formatValue(profile.whatsapp)}
Preferred Contact: ${formatValue(profile.preferred_contact)}

IDEA & VISION
──────────────────────────────────────────────────────────────
Idea Description: ${formatValue(profile.idea_description)}

Problem Solving: ${formatValue(profile.problem_solving)}

Target Customer: ${formatValue(profile.target_customer)}

Stage: ${formatValue(profile.stage)}

Excitement Reason: ${formatValue(profile.excitement_reason)}

FOUNDER BACKGROUND
──────────────────────────────────────────────────────────────
Background: ${formatValue(profile.background)}

Core Skills: ${formatValue(profile.core_skills)}

Previous Founder: ${formatValue(profile.previous_founder)}

Superpower: ${formatValue(profile.superpower)}

Weaknesses & Blindspots: ${formatValue(profile.weaknesses_blindspots)}

CO-FOUNDER SEARCH
──────────────────────────────────────────────────────────────
Seeking Skills: ${formatValue(profile.seeking_skills)}

Co-founder Type: ${formatValue(profile.cofounder_type)}

Location Preference: ${formatValue(profile.location_preference)}

Commitment Level: ${formatValue(profile.commitment_level)}

Working Style: ${formatValue(profile.working_style)}

REQUIREMENTS & PREFERENCES
──────────────────────────────────────────────────────────────
Non-negotiables: ${formatValue(profile.non_negotiables)}

Deal Breakers: ${formatValue(profile.deal_breakers)}

Equity Thoughts: ${formatValue(profile.equity_thoughts)}

Success Criteria: ${formatValue(profile.success_criteria)}

TIMELINE & COMMITMENT
──────────────────────────────────────────────────────────────
Timeline to Start: ${formatValue(profile.timeline_start)}

Urgency Level: ${formatValue(profile.urgency_level)}

Seriousness Score: ${formatValue(profile.seriousness_score)}/10

Willingness to Pay: ${formatValue(profile.willingness_to_pay)}

Match Frequency Preference: ${formatValue(profile.match_frequency_preference)}

CALL SUMMARY
──────────────────────────────────────────────────────────────
${formatValue(profile.call_summary)}

═══════════════════════════════════════════════════════════════
Profile Created: ${new Date(profile.created_at).toLocaleString()}
Call ID: ${profile.vapi_call_id}
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `founder-profile-${profile.whatsapp || profile.phone_number || profile.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/founder/${profile.id}`;
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Link copied!", description: "Public profile link copied to clipboard" });
  };

  const renderField = (label: string, value: any) => {
    if (!value) return null;
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <p className="text-xs tracking-widest uppercase text-charcoal/50 font-bold">{label}</p>
          <div className="flex flex-wrap gap-1.5">
            {value.map((item, idx) => (
              <span key={idx} className="px-2 py-1 text-xs bg-charcoal/5 text-charcoal/70 rounded-sm">
                {item}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <div className="space-y-1">
          <p className="text-xs tracking-widest uppercase text-charcoal/50 font-bold">{label}</p>
          <p className="text-sm text-charcoal">{value ? "Yes" : "No"}</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-xs tracking-widest uppercase text-charcoal/50 font-bold">{label}</p>
        <p className="text-sm text-charcoal leading-relaxed">{value}</p>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-cream border-charcoal/10 p-0 gap-0">
        {/* Header */}
        <div className="px-8 py-6 border-b border-charcoal/5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-widest uppercase text-charcoal/50 font-bold mb-1">Profile</p>
              <h2 className="text-xl font-light text-charcoal">
                {profile.name || profile.whatsapp || profile.phone_number || "Unknown Contact"}
              </h2>
            </div>
            <div className="flex gap-2 pt-12">
              <Button 
                onClick={handleSaveChanges} 
                size="sm" 
                disabled={isSaving}
                className="bg-charcoal text-white hover:bg-charcoal/90 h-9"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button 
                onClick={handleCopyLink} 
                variant="outline" 
                size="sm"
                className="border-charcoal/20 text-charcoal hover:bg-charcoal/5 h-9"
              >
                <Link2 className="w-3.5 h-3.5 mr-2" />
                Copy Link
              </Button>
              <Button 
                onClick={generateReport} 
                variant="outline" 
                size="sm"
                className="border-charcoal/20 text-charcoal hover:bg-charcoal/5 h-9"
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[70vh]">
          <div className="px-8 py-6 space-y-8">
            {/* Status & Notes */}
            <div className="bg-charcoal/[0.02] border border-charcoal/5 rounded-sm p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs tracking-widest uppercase text-charcoal/50 font-bold">Pipeline Stage</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white border-charcoal/10 text-charcoal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-charcoal/10">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs tracking-widest uppercase text-charcoal/50 font-bold">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this founder..."
                  className="min-h-[100px] bg-white border-charcoal/10 text-charcoal placeholder:text-charcoal/60 resize-none"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-charcoal/[0.02] rounded-sm">
                <p className="text-[10px] tracking-widest uppercase text-charcoal/50 font-bold mt-1 mb-2">Score</p>
                <p className="text-2xl font-light text-charcoal">{profile.seriousness_score || 0}</p>
              </div>
              <div className="text-center p-4 bg-charcoal/[0.02] rounded-sm">
                <p className="text-[10px] tracking-widest uppercase text-charcoal/50 font-bold mt-1 mb-2">Stage</p>
                <p className="text-sm text-charcoal">{profile.stage || "—"}</p>
              </div>
              <div className="text-center p-4 bg-charcoal/[0.02] rounded-sm">
                <p className="text-[10px] tracking-widest uppercase text-charcoal/50 font-bold mt-1 mb-2">Seeking</p>
                <p className="text-sm text-charcoal">{profile.cofounder_type || "—"}</p>
              </div>
              <div className="text-center p-4 bg-charcoal/[0.02] rounded-sm">
                <p className="text-[10px] tracking-widest uppercase text-charcoal/50 font-bold mt-1 mb-2">Location</p>
                <p className="text-sm text-charcoal">{profile.location_preference || "—"}</p>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-6">
              <div className="border-t border-charcoal/5 pt-6">
                <h3 className="text-md tracking-widest uppercase text-charcoal/60 mb-8">Idea & Vision</h3>
                <div className="space-y-4">
                  {renderField("Idea Description", profile.idea_description)}
                  {renderField("Problem Solving", profile.problem_solving)}
                  {renderField("Target Customer", profile.target_customer)}
                  {renderField("Excitement Reason", profile.excitement_reason)}
                </div>
              </div>

              <div className="border-t border-charcoal/5 pt-6">
                <h3 className="text-md tracking-widest uppercase text-charcoal/60 mb-8">Background</h3>
                <div className="space-y-4">
                  {renderField("Background", profile.background)}
                  {renderField("Core Skills", profile.core_skills)}
                  {renderField("Previous Founder", profile.previous_founder)}
                  {renderField("Superpower", profile.superpower)}
                  {renderField("Weaknesses & Blindspots", profile.weaknesses_blindspots)}
                </div>
              </div>

              <div className="border-t border-charcoal/5 pt-6">
                <h3 className="text-md tracking-widest uppercase text-charcoal/60 mb-8">Co-founder Search</h3>
                <div className="space-y-4">
                  {renderField("Seeking Skills", profile.seeking_skills)}
                  {renderField("Commitment Level", profile.commitment_level)}
                  {renderField("Working Style", profile.working_style)}
                  {renderField("Non-negotiables", profile.non_negotiables)}
                  {renderField("Deal Breakers", profile.deal_breakers)}
                  {renderField("Equity Thoughts", profile.equity_thoughts)}
                </div>
              </div>

              <div className="border-t border-charcoal/5 pt-6">
                <h3 className="text-md tracking-widest uppercase text-charcoal/60 mb-8">Timeline</h3>
                <div className="space-y-4">
                  {renderField("Timeline to Start", profile.timeline_start)}
                  {renderField("Urgency Level", profile.urgency_level)}
                  {renderField("Willingness to Pay", profile.willingness_to_pay)}
                  {renderField("Match Frequency Preference", profile.match_frequency_preference)}
                  {renderField("Success Criteria", profile.success_criteria)}
                </div>
              </div>

              {profile.call_summary && (
                <div className="border-t border-charcoal/5 pt-6">
                  <h3 className="text-md tracking-widest uppercase text-charcoal/60 mb-8">Call Summary</h3>
                  <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap">{profile.call_summary}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-charcoal/5 pt-4 text-xs text-charcoal/60 space-y-1">
              <p>Created: {new Date(profile.created_at).toLocaleString()}</p>
              <p>Call ID: {profile.vapi_call_id}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
