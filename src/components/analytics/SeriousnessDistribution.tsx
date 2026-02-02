import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface SeriousnessDistributionProps {
  profiles: FounderProfile[];
}

export const SeriousnessDistribution = ({ profiles }: SeriousnessDistributionProps) => {
  const scoreCounts: Record<number, number> = {};

  profiles.forEach((profile) => {
    const score = profile.seriousness_score || 0;
    scoreCounts[score] = (scoreCounts[score] || 0) + 1;
  });

  const data = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    count: scoreCounts[i] || 0,
  }));

  const avgScore =
    profiles.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) / profiles.length || 0;

  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seriousness Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seriousness Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" />
            <YAxis />
            <Tooltip />
            <ReferenceLine
              x={avgScore}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
              label={{ value: `Avg: ${avgScore.toFixed(1)}`, position: "top" }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
