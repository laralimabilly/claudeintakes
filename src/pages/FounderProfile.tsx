import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Target, Briefcase, Sparkles, Heart, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FounderProfile } from "@/types/founder";

const FounderProfile = () => {
  const { id } = useParams<{ id: string }>();

  const isValidProfileId = useMemo(() => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }, [id]);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["public-founder-profile", id],
    queryFn: async () => {
      if (!id) throw new Error("Profile ID is required");
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) throw new Error("Invalid profile link");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-profile?id=${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch profile");
      }

      return response.json() as Promise<FounderProfile>;
    },
    enabled: isValidProfileId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <Skeleton className="h-[700px] w-full bg-charcoal-foreground/5 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isValidProfileId) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-charcoal-foreground mb-4">Invalid Link</h1>
          <p className="text-charcoal-foreground/50 mb-6">This profile link doesn't look right.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-charcoal-foreground/70 hover:text-charcoal-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-charcoal-foreground mb-4">Profile Not Found</h1>
          <p className="text-charcoal-foreground/50 mb-6">This founder profile doesn't exist or has been removed.</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-charcoal-foreground/70 hover:text-charcoal-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.name || "Anonymous Founder";

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      {/* Minimal Header */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-charcoal-foreground/40 hover:text-charcoal-foreground/70 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <span className="text-[10px] text-charcoal-foreground/30 tracking-[0.2em] uppercase">Founder Profile</span>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-start justify-center p-4 sm:p-6 overflow-auto">
        <div className="w-full max-w-6xl bg-charcoal-foreground/[0.03] border border-charcoal-foreground/10 rounded-lg overflow-hidden">
          
          {/* Top Section - Name & Key Info */}
          <div className="p-5 sm:p-6 border-b border-charcoal-foreground/10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-medium text-charcoal-foreground tracking-tight mb-2">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-foreground/50">
                  {profile.location_preference && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {profile.location_preference}
                    </span>
                  )}
                  {profile.stage && (
                    <span className="inline-flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {profile.stage}
                    </span>
                  )}
                  {profile.previous_founder && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Serial Founder
                    </span>
                  )}
                  {profile.commitment_level && (
                    <span className="text-charcoal-foreground/40">
                      {profile.commitment_level}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Superpower Badge */}
              {profile.superpower && (
                <div className="flex items-start gap-2 bg-ochre/10 px-3 py-2 rounded-sm max-w-sm">
                  <Sparkles className="w-4 h-4 text-ochre shrink-0 mt-0.5" />
                  <p className="text-xs text-charcoal-foreground/80 leading-relaxed">{profile.superpower}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-charcoal-foreground/10">
            
            {/* Left Column - The Venture */}
            <div className="p-5 sm:p-6 lg:col-span-1 space-y-4">
              {profile.idea_description && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">The Idea</h3>
                  <p className="text-sm text-charcoal-foreground/80 leading-relaxed">
                    {profile.idea_description}
                  </p>
                </div>
              )}
              
              {profile.problem_solving && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">Problem</h3>
                  <p className="text-sm text-charcoal-foreground/70 leading-relaxed">
                    {profile.problem_solving}
                  </p>
                </div>
              )}

              {profile.excitement_reason && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">Why This</h3>
                  <p className="text-sm text-charcoal-foreground/60 leading-relaxed">
                    {profile.excitement_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Middle Column - The Founder */}
            <div className="p-5 sm:p-6 lg:col-span-1 space-y-4 bg-charcoal-foreground/[0.01]">
              {profile.background && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">Background</h3>
                  <p className="text-sm text-charcoal-foreground/70 leading-relaxed">
                    {profile.background}
                  </p>
                </div>
              )}

              {/* Skills */}
              {profile.core_skills && profile.core_skills.length > 0 && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.core_skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="bg-charcoal-foreground/5 text-charcoal-foreground/60 text-[10px] px-2 py-0.5 hover:bg-charcoal-foreground/10">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Seeking Skills */}
              {profile.seeking_skills && profile.seeking_skills.length > 0 && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5">Seeking</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.seeking_skills.map((skill, i) => (
                      <Badge key={i} className="bg-ochre/20 text-ochre text-[10px] px-2 py-0.5 hover:bg-ochre/30 border-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.cofounder_type && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1">Looking For</h3>
                  <p className="text-sm text-charcoal-foreground/70">{profile.cofounder_type}</p>
                </div>
              )}
            </div>

            {/* Right Column - The Match */}
            <div className="p-5 sm:p-6 lg:col-span-1 space-y-4 bg-charcoal-foreground/[0.02]">
              {/* Success Criteria */}
              {profile.success_criteria && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    What Makes a Great Match
                  </h3>
                  <p className="text-sm text-charcoal-foreground/70 leading-relaxed">
                    {profile.success_criteria}
                  </p>
                </div>
              )}

              {/* Equity Thoughts */}
              {profile.equity_thoughts && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1.5 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    On Equity
                  </h3>
                  <p className="text-sm text-charcoal-foreground/60 leading-relaxed">
                    {profile.equity_thoughts}
                  </p>
                </div>
              )}

              {profile.timeline_start && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1">Timeline</h3>
                  <p className="text-sm text-charcoal-foreground/70">{profile.timeline_start}</p>
                </div>
              )}

              {profile.working_style && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1">Work Style</h3>
                  <p className="text-sm text-charcoal-foreground/70">{profile.working_style}</p>
                </div>
              )}

              {profile.non_negotiables && profile.non_negotiables.length > 0 && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1">Must-Haves</h3>
                  <ul className="space-y-0.5">
                    {profile.non_negotiables.map((item, i) => (
                      <li key={i} className="text-xs text-charcoal-foreground/60 flex items-start gap-1.5">
                        <span className="text-ochre/70 mt-0.5">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.deal_breakers && profile.deal_breakers.length > 0 && (
                <div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase text-charcoal-foreground/40 mb-1">Deal Breakers</h3>
                  <ul className="space-y-0.5">
                    {profile.deal_breakers.map((item, i) => (
                      <li key={i} className="text-xs text-charcoal-foreground/50 flex items-start gap-1.5">
                        <span className="text-destructive/50 mt-0.5">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 border-t border-charcoal-foreground/10 flex items-center justify-between">
            <span className="text-[10px] text-charcoal-foreground/30">
              {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
            <Link 
              to="/cofoundermatching" 
              className="text-[10px] text-charcoal-foreground/40 hover:text-charcoal-foreground/60 transition-colors tracking-wide"
            >
              Create your profile →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FounderProfile;
