import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Sparkles } from "lucide-react";
import type { FounderProfile } from "@/types/founder";

interface ProfileCardProps {
  profile: FounderProfile;
  onViewDetails: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const ProfileCard = ({ profile, onViewDetails, isSelected, onToggleSelect }: ProfileCardProps) => {
  const identifier = profile.name || profile.phone_number || "Unknown";
  const ideaTruncated = profile.idea_description?.slice(0, 120) || "No description";
  const seriousnessPercent = (profile.seriousness_score || 0) * 10;

  const statusConfig = {
    new: { label: "New", color: "bg-white/10 text-white/70" },
    reviewed: { label: "Reviewed", color: "bg-silver/20 text-silver" },
    matched: { label: "Matched", color: "bg-white/20 text-white" },
    contacted: { label: "Contacted", color: "bg-silver/30 text-white" },
  };

  const status = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.new;

  const hasRecentNotes = profile.notes_updated_at && 
    new Date(profile.notes_updated_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div 
      className={`group relative bg-white/[0.02] border border-white/5 rounded-sm p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 ${isSelected ? 'border-white/30 bg-white/[0.05]' : ''}`}
    >
      {hasRecentNotes && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full animate-pulse" />
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-2">
          <p className="text-xs tracking-widest uppercase text-silver/40">{identifier}</p>
          <span className={`inline-block px-2 py-0.5 text-[10px] tracking-wider uppercase ${status.color}`}>
            {status.label}
          </span>
        </div>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label="Select profile"
          className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-charcoal"
        />
      </div>
      
      {/* Idea */}
      <p className="text-sm text-silver/70 leading-relaxed mb-6 min-h-[3.5rem]">
        {ideaTruncated}
        {profile.idea_description && profile.idea_description.length > 120 && "..."}
      </p>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div>
          <p className="text-silver/40 uppercase tracking-wider mb-1">Stage</p>
          <p className="text-white/80">{profile.stage || "—"}</p>
        </div>
        <div>
          <p className="text-silver/40 uppercase tracking-wider mb-1">Location</p>
          <p className="text-white/80">{profile.location_preference || "—"}</p>
        </div>
        <div>
          <p className="text-silver/40 uppercase tracking-wider mb-1">Score</p>
          <div className="flex items-center gap-2">
            <span className="text-white/80">{profile.seriousness_score || 0}/10</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/40 transition-all duration-500" 
                style={{ width: `${seriousnessPercent}%` }} 
              />
            </div>
          </div>
        </div>
        <div>
          <p className="text-silver/40 uppercase tracking-wider mb-1">Type</p>
          <p className="text-white/80">{profile.cofounder_type || "—"}</p>
        </div>
      </div>

      {/* Skills */}
      {profile.core_skills && profile.core_skills.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-silver/40 uppercase tracking-wider mb-2">Has</p>
          <div className="flex flex-wrap gap-1">
            {profile.core_skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 text-[10px] bg-white/5 text-silver/60 rounded-sm">
                {skill}
              </span>
            ))}
            {profile.core_skills.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] text-silver/40">
                +{profile.core_skills.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {profile.seeking_skills && profile.seeking_skills.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-silver/40 uppercase tracking-wider mb-2">Seeking</p>
          <div className="flex flex-wrap gap-1">
            {profile.seeking_skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 text-[10px] border border-white/10 text-silver/60 rounded-sm">
                {skill}
              </span>
            ))}
            {profile.seeking_skills.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] text-silver/40">
                +{profile.seeking_skills.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-white/5">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-silver/60 hover:text-white hover:bg-white/5 transition-colors h-9"
          onClick={onViewDetails}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          View
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-silver/40 hover:text-silver/60 transition-colors h-9"
          disabled
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Match
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[10px] text-silver/30">
          {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {profile.notes_updated_at && (
          <p className="text-[10px] text-white/50 mt-1">
            Notes updated {new Date(profile.notes_updated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};
