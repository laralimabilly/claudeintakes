import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { FounderProfile } from "@/types/founder";

interface WillingnessToPayProps {
  profiles: FounderProfile[];
}

export const WillingnessToPay = ({ profiles }: WillingnessToPayProps) => {
  const paymentCounts: Record<string, number> = {};

  profiles.forEach((profile) => {
    const payment = profile.willingness_to_pay || "Unknown";
    paymentCounts[payment] = (paymentCounts[payment] || 0) + 1;
  });

  const data = Object.entries(paymentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([payment, count]) => ({ payment, count }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Willingness to Pay</CardTitle>
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
        <CardTitle>Willingness to Pay Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="payment" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
