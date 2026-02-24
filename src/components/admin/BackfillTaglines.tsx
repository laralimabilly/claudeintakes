import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";

export const BackfillTaglines = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; errors: number; total: number } | null>(null);
  const { toast } = useToast();

  const handleBackfill = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-taglines", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Taglines generated",
        description: `${data.processed} profiles updated${data.errors ? `, ${data.errors} errors` : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="bg-charcoal-light border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-white text-lg">Tagline Generator</CardTitle>
            <CardDescription className="text-silver/60">
              AI-generate short taglines for profiles missing them
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleBackfill}
          disabled={isRunning}
          className="w-full bg-amber-600 hover:bg-amber-700"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Taglines...
            </>
          ) : result ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Generated {result.processed}/{result.total} Taglines
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Missing Taglines
            </>
          )}
        </Button>

        {result && (
          <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="font-medium text-green-400">Generation Complete</span>
            </div>
            <div className="text-sm text-silver/80">
              <p>✓ Generated: {result.processed} taglines</p>
              {result.errors > 0 && (
                <p className="text-amber-400">⚠ Failed: {result.errors} profiles</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
