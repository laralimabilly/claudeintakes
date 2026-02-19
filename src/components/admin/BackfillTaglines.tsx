import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

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
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-amber-400/60" />
        <div>
          <h3 className="text-sm font-medium text-white">Generate Taglines</h3>
          <p className="text-xs text-silver/50">AI-generate short taglines for profiles missing them</p>
        </div>
      </div>
      <Button
        onClick={handleBackfill}
        disabled={isRunning}
        variant="outline"
        size="sm"
        className="border-white/10 text-white hover:bg-white/5"
      >
        {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {isRunning ? "Generating..." : "Generate Missing Taglines"}
      </Button>
      {result && (
        <p className="text-xs text-silver/50">
          {result.processed}/{result.total} generated{result.errors ? `, ${result.errors} failed` : ""}
        </p>
      )}
    </div>
  );
};
