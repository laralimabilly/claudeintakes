import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, ChevronDown, ChevronUp, Link2, MapPin, Target, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type FounderProfile = Tables<"founder_profiles">;

interface ExpandableProfileCardProps {
  profile: FounderProfile;
  onViewDetails: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const ExpandableProfileCard = ({ 
  profile, 
  onViewDetails, 
  isSelected, 
  onToggleSelect 
}: ExpandableProfileCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const displayName = profile.name || "Anonymous Founder";
  const seriousnessPercent = (profile.seriousness_score || 0) * 10;

  const statusConfig = {
    new: { label: "New", color: "bg-white/10 text-white/70" },
    reviewed: { label: "Reviewed", color: "bg-silver/20 text-silver" },
    matched: { label: "Matched", color: "bg-white/20 text-white" },
    contacted: { label: "Contacted", color: "bg-silver/30 text-white" },
  };

  const status = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.new;

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/founder/${profile.id}`;
    await navigator.clipboard.writeText(profileUrl);
    toast({ title: "Link copied!", description: "Profile link copied to clipboard" });
  };

  return (
    <div 
      className={`group relative bg-white/[0.02] border border-white/5 rounded-sm overflow-hidden transition-all duration-300 ${
        isSelected ? "border-white/30 bg-white/[0.05]" : "hover:bg-white/[0.04] hover:border-white/10"
      }`}
    >
      {/* Collapsed Header - Always Visible */}
      <div className="p-4 flex items-center gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label="Select profile"
          className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-charcoal"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-white truncate">{displayName}</h3>
            <span className={`px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-silver/50">
            {profile.stage && (
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {profile.stage}
              </span>
            )}
            {profile.location_preference && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.location_preference}
              </span>
            )}
          </div>
        </div>

        {/* Seriousness Score */}
        <div className="flex items-center gap-2 text-xs text-silver/50">
          <span>{profile.seriousness_score || 0}/10</span>
          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/40 transition-all" 
              style={{ width: `${seriousnessPercent}%` }} 
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-silver/40 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 animate-fade-in">
          {/* Idea Description */}
          {profile.idea_description && (
            <div className="mb-4">
              <p className="text-xs text-silver/40 uppercase tracking-wider mb-1">Idea</p>
              <p className="text-sm text-silver/70 leading-relaxed">{profile.idea_description}</p>
            </div>
          )}

          {/* Skills Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {profile.core_skills && profile.core_skills.length > 0 && (
              <div>
                <p className="text-[10px] text-silver/40 uppercase tracking-wider mb-2">Has</p>
                <div className="flex flex-wrap gap-1">
                  {profile.core_skills.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[10px] bg-white/5 text-silver/60 rounded-sm">
                      {skill}
                    </span>
                  ))}
                  {profile.core_skills.length > 4 && (
                    <span className="text-[10px] text-silver/40">+{profile.core_skills.length - 4}</span>
                  )}
                </div>
              </div>
            )}

            {profile.seeking_skills && profile.seeking_skills.length > 0 && (
              <div>
                <p className="text-[10px] text-silver/40 uppercase tracking-wider mb-2">Seeking</p>
                <div className="flex flex-wrap gap-1">
                  {profile.seeking_skills.slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[10px] border border-white/10 text-silver/60 rounded-sm">
                      {skill}
                    </span>
                  ))}
                  {profile.seeking_skills.length > 4 && (
                    <span className="text-[10px] text-silver/40">+{profile.seeking_skills.length - 4}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            <div>
              <p className="text-silver/40 uppercase tracking-wider mb-0.5">Type</p>
              <p className="text-white/70">{profile.cofounder_type || "—"}</p>
            </div>
            <div>
              <p className="text-silver/40 uppercase tracking-wider mb-0.5">Commitment</p>
              <p className="text-white/70">{profile.commitment_level || "—"}</p>
            </div>
            <div>
              <p className="text-silver/40 uppercase tracking-wider mb-0.5">Timeline</p>
              <p className="text-white/70">{profile.timeline_start || "—"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-white/5">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-silver/60 hover:text-white hover:bg-white/5 h-8"
              onClick={onViewDetails}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Full Profile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-silver/60 hover:text-white hover:bg-white/5 h-8"
              onClick={handleCopyLink}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Copy Link
            </Button>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-silver/30 mt-3">
            {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
};
