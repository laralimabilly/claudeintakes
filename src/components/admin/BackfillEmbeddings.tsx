import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2, Sparkles, XCircle } from "lucide-react";

interface BackfillResult {
  success: boolean;
  processed?: number;
  failed?: number;
  total?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

interface EmbeddingStats {
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
}

export const BackfillEmbeddings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [stats, setStats] = useState<EmbeddingStats>({ total: 0, withEmbeddings: 0, withoutEmbeddings: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Get total profiles count
      const { count: totalCount } = await supabase
        .from("founder_profiles")
        .select("*", { count: "exact", head: true });

      // Get profiles with embeddings count
      const { count: withEmbeddingsCount } = await supabase
        .from("founder_profiles")
        .select("*", { count: "exact", head: true })
        .not("embedding", "is", null);

      const total = totalCount ?? 0;
      const withEmbeddings = withEmbeddingsCount ?? 0;

      setStats({
        total,
        withEmbeddings,
        withoutEmbeddings: total - withEmbeddings,
      });
    } catch (error) {
      console.error("Failed to fetch embedding stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchStats();

    // Poll every 5 seconds when processing or when there are profiles without embeddings
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleBackfill = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("backfill-embeddings", {
        body: { batchSize: 50, delayMs: 100 },
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
    ? Math.round((stats.withEmbeddings / stats.total) * 100) 
    : 0;

  return (
    <Card className="bg-charcoal-light border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">AI Embedding Generator</CardTitle>
              <CardDescription className="text-silver/60">
                Generate vector embeddings for founder matching
              </CardDescription>
            </div>
          </div>
          {!statsLoading && (
            <Badge 
              variant={stats.withoutEmbeddings === 0 ? "default" : "secondary"}
              className={stats.withoutEmbeddings === 0 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}
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
            <div className="text-xs text-silver/60">Total Profiles</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-2xl font-bold text-green-400">
              {statsLoading ? "-" : stats.withEmbeddings}
            </div>
            <div className="text-xs text-silver/60">With Embeddings</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {statsLoading ? "-" : stats.withoutEmbeddings}
            </div>
            <div className="text-xs text-silver/60">Need Processing</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/80">
            <strong>Cost Warning:</strong> This operation uses OpenAI's embedding API. 
            Estimated cost is ~$0.01 per 1,000 profiles processed.
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleBackfill}
          disabled={isLoading || stats.withoutEmbeddings === 0}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Embeddings...
            </>
          ) : stats.withoutEmbeddings === 0 ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              All Profiles Have Embeddings
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Embeddings for {stats.withoutEmbeddings} Founders
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
                {result.success ? "Processing Complete" : "Processing Failed"}
              </span>
            </div>
            
            {result.success && result.processed !== undefined && (
              <div className="text-sm text-silver/80 space-y-1">
                <p>✓ Processed: {result.processed} profiles</p>
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
