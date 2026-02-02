import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface LocationPreferencesProps {
  profiles: FounderProfile[];
}

export const LocationPreferences = ({ profiles }: LocationPreferencesProps) => {
  const locationCounts: Record<string, number> = {};

  profiles.forEach((profile) => {
    const location = profile.location_preference || "Unknown";
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  });

  const data = Object.entries(locationCounts).map(([location, count]) => ({
    location,
    count,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location Preferences</CardTitle>
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
        <CardTitle>Location Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
