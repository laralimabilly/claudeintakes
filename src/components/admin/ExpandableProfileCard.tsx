import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, ChevronDown, ChevronUp, Link2, MapPin, Target, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FounderProfile } from "@/types/founder";

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

  const isAnonymous = !profile.name;
  const displayName = profile.name || profile.phone_number || "Anonymous Founder";
  const seriousnessPercent = (profile.seriousness_score || 0) * 10;
  const taglineText = (profile as any).tagline as string | null;
  const summaryPreview = taglineText || profile.idea_description || profile.call_summary?.slice(0, 120) || null;

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
      <div className="p-4 space-y-2">
        {/* Row 1: Name + Status + Score */}
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label="Select profile"
            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-charcoal shrink-0"
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isAnonymous && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
            <h3 className={`text-sm font-medium truncate ${isAnonymous ? "text-amber-400/80 italic" : "text-white"}`}>
              {displayName}
            </h3>
            <span className={`px-1.5 py-0.5 text-[10px] tracking-wider uppercase whitespace-nowrap shrink-0 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-silver/50 shrink-0">
            <span className="tabular-nums">{profile.seriousness_score || 0}/10</span>
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
            className="text-silver/40 hover:text-white hover:bg-white/5 h-8 w-8 p-0 shrink-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Row 2: Summary (1-line truncated) */}
        {!isExpanded && summaryPreview && (
          <p className="text-xs text-silver/50 truncate pl-9">
            {summaryPreview}
          </p>
        )}

        {/* Row 3: Structured badges */}
        {!isExpanded && (
          <div className="flex items-center gap-1.5 pl-9 flex-wrap">
            {profile.stage && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white/5 text-silver/60 rounded-sm whitespace-nowrap">
                <Target className="h-2.5 w-2.5 shrink-0" />
                {profile.stage.length > 25 ? profile.stage.slice(0, 25) + "…" : profile.stage}
              </span>
            )}
            {profile.location_preference && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white/5 text-silver/60 rounded-sm whitespace-nowrap">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {profile.location_preference.length > 25 ? profile.location_preference.slice(0, 25) + "…" : profile.location_preference}
              </span>
            )}
            {profile.core_skills && profile.core_skills.length > 0 && (
              <>
                {profile.core_skills.slice(0, 2).map((skill, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-white/5 text-silver/50 rounded-sm whitespace-nowrap">
                    {skill}
                  </span>
                ))}
                {profile.core_skills.length > 2 && (
                  <span className="text-[10px] text-silver/30">+{profile.core_skills.length - 2}</span>
                )}
              </>
            )}
            {profile.cofounder_type && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] border border-white/10 text-silver/50 rounded-sm whitespace-nowrap">
                seeks {profile.cofounder_type.length > 20 ? profile.cofounder_type.slice(0, 20) + "…" : profile.cofounder_type}
              </span>
            )}
          </div>
        )}
      </div>


      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 animate-fade-in">
          {/* Summary */}
          {(profile.call_summary || profile.idea_description) && (
            <div className="mb-4">
              <p className="text-xs text-silver/40 uppercase tracking-wider mb-1">
                {profile.call_summary ? "Summary" : "Idea"}
              </p>
              <p className="text-sm text-silver/70 leading-relaxed">
                {profile.call_summary || profile.idea_description}
              </p>
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
