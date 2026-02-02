import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface PreviousFounderRateProps {
  profiles: FounderProfile[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export const PreviousFounderRate = ({ profiles }: PreviousFounderRateProps) => {
  const previousFounders = profiles.filter((p) => p.previous_founder === true);
  const firstTime = profiles.filter((p) => p.previous_founder === false);

  const previousAvgScore =
    previousFounders.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) /
      previousFounders.length || 0;
  const firstTimeAvgScore =
    firstTime.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) / firstTime.length || 0;

  const data = [
    { name: `Previous (Avg: ${previousAvgScore.toFixed(1)})`, value: previousFounders.length },
    { name: `First-time (Avg: ${firstTimeAvgScore.toFixed(1)})`, value: firstTime.length },
  ];

  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previous Founder Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const previousPercent = ((previousFounders.length / profiles.length) * 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Founder Rate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">{previousPercent}%</div>
          <p className="text-sm text-muted-foreground">Have founded before</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
