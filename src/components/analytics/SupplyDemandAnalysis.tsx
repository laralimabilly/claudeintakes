import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface SupplyDemandAnalysisProps {
  profiles: FounderProfile[];
}

export const SupplyDemandAnalysis = ({ profiles }: SupplyDemandAnalysisProps) => {
  const categories = ["Technical", "Business", "Marketing", "Design", "Sales"];
  
  const data = categories.map((category) => {
    const demand = profiles.filter((p) =>
      p.seeking_skills?.some((skill) => skill.toLowerCase().includes(category.toLowerCase()))
    ).length;

    const supply = profiles.filter((p) =>
      p.core_skills?.some((skill) => skill.toLowerCase().includes(category.toLowerCase()))
    ).length;

    return {
      category,
      demand,
      supply,
      gap: demand - supply,
    };
  });

  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supply/Demand Analysis</CardTitle>
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
        <CardTitle>Supply/Demand Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="demand" fill="hsl(var(--destructive))" name="Demand (Seeking)" />
            <Bar dataKey="supply" fill="hsl(var(--primary))" name="Supply (Available)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
