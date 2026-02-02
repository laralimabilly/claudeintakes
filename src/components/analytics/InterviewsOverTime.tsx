import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface InterviewsOverTimeProps {
  profiles: FounderProfile[];
}

export const InterviewsOverTime = ({ profiles }: InterviewsOverTimeProps) => {
  const dateCounts: Record<string, number> = {};

  profiles.forEach((profile) => {
    const date = new Date(profile.created_at).toLocaleDateString();
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });

  const data = Object.entries(dateCounts)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, count]) => ({ date, count }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interviews Over Time</CardTitle>
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
        <CardTitle>Interviews Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
