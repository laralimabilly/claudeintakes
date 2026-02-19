import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSection } from "@/components/founder-profile/ProfileSection";
import { ProfileField } from "@/components/founder-profile/ProfileField";
import { ProfileBadgeList } from "@/components/founder-profile/ProfileBadgeList";
import type { FounderProfile } from "@/types/founder";

const FounderProfilePage = () => {
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
        <div className="w-full max-w-3xl">
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
          <Link to="/" className="inline-flex items-center gap-2 text-charcoal-foreground/70 hover:text-charcoal-foreground transition-colors">
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
          <Link to="/" className="inline-flex items-center gap-2 text-charcoal-foreground/70 hover:text-charcoal-foreground transition-colors">
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
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-charcoal-foreground/40 hover:text-charcoal-foreground/70 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <span className="text-[10px] text-charcoal-foreground/30 tracking-[0.2em] uppercase">
          Founder Profile Report
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center p-4 sm:p-6 overflow-auto">
        <div className="w-full max-w-3xl space-y-0">
          {/* Title Bar */}
          <div className="bg-charcoal-foreground/[0.04] border border-charcoal-foreground/10 rounded-t-lg px-5 sm:px-6 py-5">
            <h1 className="text-2xl sm:text-3xl font-medium text-charcoal-foreground tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-charcoal-foreground/30 mt-1">
              Profile Created: {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Sections - stacked like the text report */}
          <div className="border-x border-charcoal-foreground/10 divide-y divide-charcoal-foreground/10">
            {/* IDEA & VISION */}
            <ProfileSection title="Idea & Vision">
              <ProfileField label="Idea Description" value={profile.idea_description} />
              <ProfileField label="Problem Solving" value={profile.problem_solving} />
              <ProfileField label="Target Customer" value={profile.target_customer} />
              <ProfileField label="Stage" value={profile.stage} />
              <ProfileField label="Excitement Reason" value={profile.excitement_reason} />
            </ProfileSection>

            {/* FOUNDER BACKGROUND */}
            <ProfileSection title="Founder Background">
              <ProfileField label="Background" value={profile.background} />
              <ProfileBadgeList label="Core Skills" items={profile.core_skills} variant="default" />
              <ProfileField
                label="Previous Founder"
                value={profile.previous_founder === true ? "Yes" : profile.previous_founder === false ? "No" : null}
              />
              <ProfileField label="Superpower" value={profile.superpower} highlight />
              <ProfileBadgeList label="Weaknesses & Blindspots" items={profile.weaknesses_blindspots} variant="muted" />
            </ProfileSection>

            {/* CO-FOUNDER SEARCH */}
            <ProfileSection title="Co-Founder Search">
              <ProfileBadgeList label="Seeking Skills" items={profile.seeking_skills} variant="accent" />
              <ProfileField label="Co-founder Type" value={profile.cofounder_type} />
              <ProfileField label="Location Preference" value={profile.location_preference} />
              <ProfileField label="Commitment Level" value={profile.commitment_level} />
              <ProfileField label="Working Style" value={profile.working_style} />
            </ProfileSection>

            {/* REQUIREMENTS & PREFERENCES */}
            <ProfileSection title="Requirements & Preferences">
              <ProfileBadgeList label="Non-Negotiables" items={profile.non_negotiables} variant="accent" icon="→" />
              <ProfileBadgeList label="Deal Breakers" items={profile.deal_breakers} variant="destructive" icon="✕" />
              <ProfileField label="Equity Thoughts" value={profile.equity_thoughts} />
              <ProfileField label="Success Criteria" value={profile.success_criteria} />
            </ProfileSection>

            {/* TIMELINE & COMMITMENT */}
            <ProfileSection title="Timeline & Commitment">
              <ProfileField label="Timeline to Start" value={profile.timeline_start} />
              <ProfileField label="Urgency Level" value={profile.urgency_level} />
              <ProfileField
                label="Seriousness Score"
                value={profile.seriousness_score != null ? `${profile.seriousness_score}/10` : null}
              />
              <ProfileField label="Willingness to Pay" value={profile.willingness_to_pay} />
            </ProfileSection>

            {/* CALL SUMMARY */}
            {profile.call_summary && (
              <ProfileSection title="Call Summary">
                <p className="text-sm text-charcoal-foreground/70 leading-relaxed">
                  {profile.call_summary}
                </p>
              </ProfileSection>
            )}
          </div>

          {/* Footer */}
          <div className="bg-charcoal-foreground/[0.02] border border-charcoal-foreground/10 rounded-b-lg px-5 sm:px-6 py-3 flex items-center justify-between">
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

export default FounderProfilePage;
