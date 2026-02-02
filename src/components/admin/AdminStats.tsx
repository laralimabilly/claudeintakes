import type { FounderProfile } from "@/types/founder";

interface AdminStatsProps {
  profiles: FounderProfile[];
}

export const AdminStats = ({ profiles }: AdminStatsProps) => {
  const totalProfiles = profiles.length;
  const unmatchedProfiles = profiles.filter((p) => !p.matched).length;
  const avgSeriousness =
    profiles.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) / totalProfiles || 0;

  return (
    <div className="grid grid-cols-3 gap-px bg-white/10 rounded-lg overflow-hidden">
      <div className="bg-charcoal p-8 text-center">
        <div className="text-5xl font-light text-white tracking-tight">{totalProfiles}</div>
        <p className="text-xs tracking-widest uppercase text-silver/60 mt-2">Total Founders</p>
      </div>
      <div className="bg-charcoal p-8 text-center">
        <div className="text-5xl font-light text-white tracking-tight">{unmatchedProfiles}</div>
        <p className="text-xs tracking-widest uppercase text-silver/60 mt-2">Unmatched</p>
      </div>
      <div className="bg-charcoal p-8 text-center">
        <div className="text-5xl font-light text-white tracking-tight">{avgSeriousness.toFixed(1)}</div>
        <p className="text-xs tracking-widest uppercase text-silver/60 mt-2">Avg Score</p>
      </div>
    </div>
  );
};
