import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2, MapPin, XCircle } from "lucide-react";

interface BackfillResult {
  success: boolean;
  geocoded?: number;
  preferencesOnly?: number;
  failed?: number;
  total?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

interface GeoStats {
  total: number;
  withLocation: number;
  withoutLocation: number;
}

export const BackfillGeolocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [stats, setStats] = useState<GeoStats>({ total: 0, withLocation: 0, withoutLocation: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Get total profiles with location_preference
      const { count: totalCount } = await supabase
        .from("founder_profiles")
        .select("*", { count: "exact", head: true })
        .not("location_preference", "is", null);

      // Get profiles with location records
      const { count: withLocationCount } = await supabase
        .from("founder_locations")
        .select("*", { count: "exact", head: true });

      const total = totalCount ?? 0;
      const withLocation = withLocationCount ?? 0;

      setStats({
        total,
        withLocation,
        withoutLocation: Math.max(0, total - withLocation),
      });
    } catch (error) {
      console.error("Failed to fetch geolocation stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBackfill = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("backfill-geocoding", {
        body: { batchSize: 50, delayMs: 1100 },
      });

      if (error) {
        setResult({ success: false, error: error.message });
      } else {
        setResult(data as BackfillResult);
        // Refresh stats after completion
        await fetchStats();
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.withLocation / stats.total) * 100) 
    : 0;

  return (
    <Card className="bg-charcoal-light border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Geolocation Backfill</CardTitle>
              <CardDescription className="text-silver/60">
                Geocode founder locations for distance-based matching
              </CardDescription>
            </div>
          </div>
          {!statsLoading && (
            <Badge 
              variant={stats.withoutLocation === 0 ? "default" : "secondary"}
              className={stats.withoutLocation === 0 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}
            >
              {completionPercentage}% Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Display */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <div className="text-2xl font-bold text-white">
              {statsLoading ? "-" : stats.total}
            </div>
            <div className="text-xs text-silver/60">With Location Text</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-2xl font-bold text-green-400">
              {statsLoading ? "-" : stats.withLocation}
            </div>
            <div className="text-xs text-silver/60">Geocoded</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {statsLoading ? "-" : stats.withoutLocation}
            </div>
            <div className="text-xs text-silver/60">Need Processing</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Info Notice */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80">
            <strong>Rate Limited:</strong> Uses OpenStreetMap Nominatim API (free). 
            Processing is throttled to 1 request/second to respect API limits.
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleBackfill}
          disabled={isLoading || stats.withoutLocation === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Geocoding Locations...
            </>
          ) : stats.withoutLocation === 0 ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              All Profiles Geocoded
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Geocode {stats.withoutLocation} Founder Locations
            </>
          )}
        </Button>

        {/* Results Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? "bg-green-500/10 border-green-500/20" 
              : "bg-red-500/10 border-red-500/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={`font-medium ${result.success ? "text-green-400" : "text-red-400"}`}>
                {result.success ? "Geocoding Complete" : "Geocoding Failed"}
              </span>
            </div>
            
            {result.success && (
              <div className="text-sm text-silver/80 space-y-1">
                {result.geocoded !== undefined && (
                  <p>✓ Geocoded: {result.geocoded} profiles (with coordinates)</p>
                )}
                {result.preferencesOnly !== undefined && result.preferencesOnly > 0 && (
                  <p className="text-blue-400">○ Preferences only: {result.preferencesOnly} profiles</p>
                )}
                {result.failed !== undefined && result.failed > 0 && (
                  <p className="text-amber-400">⚠ Failed: {result.failed} profiles</p>
                )}
                {result.message && <p className="text-silver/60">{result.message}</p>}
              </div>
            )}
            
            {result.error && (
              <p className="text-sm text-red-300">{result.error}</p>
            )}
            
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-300/80 max-h-24 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
