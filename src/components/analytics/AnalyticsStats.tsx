import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { FounderProfile } from "@/types/founder";

interface AnalyticsStatsProps {
  profiles: FounderProfile[];
  allProfiles: FounderProfile[];
}

export const AnalyticsStats = ({ profiles, allProfiles }: AnalyticsStatsProps) => {
  const totalInterviews = profiles.length;
  const avgSeriousness =
    profiles.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) / totalInterviews || 0;
  const unmatchedCount = profiles.filter((p) => !p.matched).length;

  // Calculate this week vs last week
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = allProfiles.filter(
    (p) => new Date(p.created_at) >= oneWeekAgo
  ).length;
  const lastWeek = allProfiles.filter(
    (p) => new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo
  ).length;

  const weeklyTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{totalInterviews}</div>
          <p className="text-sm text-muted-foreground">Total Interviews</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{avgSeriousness.toFixed(1)}</div>
            {avgSeriousness >= 7 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">Avg Seriousness Score</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {thisWeek} / {lastWeek}
            </div>
            {weeklyTrend > 0 ? (
              <span className="text-xs text-green-500">+{weeklyTrend.toFixed(0)}%</span>
            ) : weeklyTrend < 0 ? (
              <span className="text-xs text-red-500">{weeklyTrend.toFixed(0)}%</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">This Week / Last Week</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{unmatchedCount}</div>
          <p className="text-sm text-muted-foreground">Unmatched Founders</p>
        </CardContent>
      </Card>
    </div>
  );
};
