import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FounderProfile } from "@/types/founder";

interface TopDealBreakersProps {
  profiles: FounderProfile[];
}

export const TopDealBreakers = ({ profiles }: TopDealBreakersProps) => {
  const dealBreakerCounts: Record<string, number> = {};

  profiles.forEach((profile) => {
    profile.deal_breakers?.forEach((dealBreaker) => {
      dealBreakerCounts[dealBreaker] = (dealBreakerCounts[dealBreaker] || 0) + 1;
    });
  });

  const topDealBreakers = Object.entries(dealBreakerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  if (topDealBreakers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Deal Breakers</CardTitle>
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
        <CardTitle>Top Deal Breakers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topDealBreakers.map(([dealBreaker, count]) => (
            <Badge
              key={dealBreaker}
              variant="destructive"
              className="text-sm"
              style={{ fontSize: `${Math.min(16 + count, 24)}px` }}
            >
              {dealBreaker} ({count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
