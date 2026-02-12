import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMatchingWeights } from "@/contexts/SystemParametersContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Users, Zap, RefreshCw, Send, Loader2 } from "lucide-react";
import { MatchDetails } from "./MatchDetails";
import { getStatusConfig, canNotify } from "@/types/matchStatus";

interface FounderMatch {
  id: string;
  founder_id: string;
  matched_founder_id: string;
  total_score: number;
  compatibility_level: string | null;
  score_skills: number | null;
  score_stage: number | null;
  score_communication: number | null;
  score_vision: number | null;
  score_values: number | null;
  score_geo: number | null;
  score_advantages: number | null;
  status: string | null;
  created_at: string;
  founder_a?: { name: string | null; idea_description: string | null };
  founder_b?: { name: string | null; idea_description: string | null };
}

type FilterType = "all" | "highly_compatible" | "somewhat_compatible";

export const MatchesListView = () => {
  const [matches, setMatches] = useState<FounderMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedMatch, setSelectedMatch] = useState<FounderMatch | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sendingMatchIds, setSendingMatchIds] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();
  const matchingWeights = useMatchingWeights();

  // Configurable thresholds from system parameters
  const highThreshold = matchingWeights?.highly_compatible_threshold ?? 75;
  const minThreshold = matchingWeights?.min_match_score ?? 60;

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("founder_matches")
        .select(`
          id, founder_id, matched_founder_id, total_score, compatibility_level,
          score_skills, score_stage, score_communication, score_vision,
          score_values, score_geo, score_advantages, status, created_at
        `)
        .order("total_score", { ascending: false });

      if (error) throw error;

      const founderIds = new Set<string>();
      (data || []).forEach((m) => {
        founderIds.add(m.founder_id);
        founderIds.add(m.matched_founder_id);
      });

      const { data: founders } = await supabase
        .from("founder_profiles")
        .select("id, name, idea_description")
        .in("id", Array.from(founderIds));

      const founderMap = new Map(
        (founders || []).map((f) => [f.id, { name: f.name, idea_description: f.idea_description }])
      );

      const enrichedMatches = (data || []).map((m) => ({
        ...m,
        founder_a: founderMap.get(m.founder_id),
        founder_b: founderMap.get(m.matched_founder_id),
      }));

      setMatches(enrichedMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({ title: "Error", description: "Failed to load matches", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches;
    if (filter === "highly_compatible") return matches.filter((m) => m.total_score >= highThreshold);
    return matches.filter((m) => m.total_score >= minThreshold && m.total_score < highThreshold);
  }, [matches, filter, highThreshold, minThreshold]);

  const stats = useMemo(() => {
    const highlyCompatible = matches.filter((m) => m.total_score >= highThreshold).length;
    const somewhatCompatible = matches.filter((m) => m.total_score >= minThreshold && m.total_score < highThreshold).length;
    return { total: matches.length, highlyCompatible, somewhatCompatible };
  }, [matches, highThreshold, minThreshold]);

  const pendingHighMatches = useMemo(
    () => matches.filter((m) => canNotify(m.status || "pending") && m.total_score >= highThreshold),
    [matches, highThreshold]
  );

  const handleViewDetails = (match: FounderMatch) => {
    setSelectedMatch(match);
    setIsDetailsOpen(true);
  };

  const handleSendNotification = async (match: FounderMatch) => {
    setSendingMatchIds((prev) => new Set(prev).add(match.id));
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-intro", {
        body: { matchId: match.id },
      });
      if (error) throw error;
      toast({
        title: "Notification sent",
        description: `Match notification sent to ${data?.notifiedFounder?.name || match.founder_a?.name || "Founder A"}`,
      });
      await fetchMatches();
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message || "Could not send", variant: "destructive" });
    } finally {
      setSendingMatchIds((prev) => { const next = new Set(prev); next.delete(match.id); return next; });
    }
  };

  const handleBulkNotify = async () => {
    if (pendingHighMatches.length === 0) return;
    setIsBulkSending(true);
    setBulkProgress({ current: 0, total: pendingHighMatches.length });
    let sent = 0;
    let failed = 0;

    for (const match of pendingHighMatches) {
      try {
        setSendingMatchIds((prev) => new Set(prev).add(match.id));
        const { error } = await supabase.functions.invoke("send-whatsapp-intro", { body: { matchId: match.id } });
        if (error) throw error;
        sent++;
      } catch {
        failed++;
      } finally {
        setBulkProgress((p) => ({ ...p, current: sent + failed }));
        setSendingMatchIds((prev) => { const next = new Set(prev); next.delete(match.id); return next; });
      }
      if (match !== pendingHighMatches[pendingHighMatches.length - 1]) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setIsBulkSending(false);
    toast({ title: "Bulk notify complete", description: `${sent} sent, ${failed} failed` });
    await fetchMatches();
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (score >= 70) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (score >= minThreshold) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const renderStatusBadge = (status: string | null) => {
    const config = getStatusConfig(status || "pending");
    return (
      <span className={`${config.color} ${config.textColor} rounded-full text-xs px-2 py-0.5`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xs tracking-widest uppercase text-silver/40">Loading Matches</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-light text-white">Computed Matches</h2>
            <p className="text-xs text-silver/50 mt-1">
              {stats.total} total • {stats.highlyCompatible} highly compatible • {stats.somewhatCompatible} somewhat compatible
            </p>
          </div>
          <div className="flex gap-2">
            {pendingHighMatches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkNotify}
                disabled={isBulkSending}
                className="border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                {isBulkSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {isBulkSending ? `Sending ${bulkProgress.current}/${bulkProgress.total}...` : `Notify All Pending (${pendingHighMatches.length})`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMatches}
              className="border-white/10 text-silver/70 hover:text-white hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-white text-charcoal hover:bg-white/90" : "border-white/10 text-silver/70 hover:text-white hover:bg-white/5"}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filter === "highly_compatible" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("highly_compatible")}
            className={filter === "highly_compatible" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "border-white/10 text-silver/70 hover:text-white hover:bg-white/5"}
          >
            <Zap className="h-3 w-3 mr-1" />
            Highly Compatible ({stats.highlyCompatible})
          </Button>
          <Button
            variant={filter === "somewhat_compatible" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("somewhat_compatible")}
            className={filter === "somewhat_compatible" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "border-white/10 text-silver/70 hover:text-white hover:bg-white/5"}
          >
            Compatible ({stats.somewhatCompatible})
          </Button>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        {filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-silver/20 mb-4" />
            <p className="text-silver/50">No matches found</p>
            <p className="text-xs text-silver/30 mt-1">
              {filter !== "all" ? "Try adjusting your filter" : "Run the matching algorithm to generate matches"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider">Founder A</TableHead>
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider">Founder B</TableHead>
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider text-center">Score</TableHead>
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider text-center">Level</TableHead>
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="text-silver/50 text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.map((match) => {
                const isSending = sendingMatchIds.has(match.id);
                const isPending = canNotify(match.status || "pending");

                return (
                  <TableRow key={match.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div>
                        <p className="text-sm text-white font-medium">{match.founder_a?.name || "Unknown"}</p>
                        <p className="text-xs text-silver/40 line-clamp-1 max-w-48">{match.founder_a?.idea_description || "No description"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-white font-medium">{match.founder_b?.name || "Unknown"}</p>
                        <p className="text-xs text-silver/40 line-clamp-1 max-w-48">{match.founder_b?.idea_description || "No description"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs font-medium ${getScoreBadgeColor(match.total_score)}`}>
                        {Math.round(match.total_score)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          match.compatibility_level === "highly_compatible"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }`}
                      >
                        {match.compatibility_level === "highly_compatible" ? "High" : "Moderate"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{renderStatusBadge(match.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendNotification(match)}
                            disabled={isSending}
                            className="text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(match)}
                          className="text-silver/50 hover:text-white hover:bg-white/5"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-charcoal border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-light">
              {selectedMatch?.founder_a?.name || "Founder A"} ↔ {selectedMatch?.founder_b?.name || "Founder B"}
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <MatchDetails
              match={{
                id: selectedMatch.id,
                total_score: selectedMatch.total_score,
                compatibility_level: (selectedMatch.compatibility_level as "highly_compatible" | "somewhat_compatible") || "somewhat_compatible",
                dimension_scores: {
                  skills: selectedMatch.score_skills ?? 0,
                  stage: selectedMatch.score_stage ?? 0,
                  communication: selectedMatch.score_communication ?? 0,
                  vision: selectedMatch.score_vision ?? 0,
                  values: selectedMatch.score_values ?? 0,
                  geo: selectedMatch.score_geo ?? 0,
                  advantages: selectedMatch.score_advantages ?? 0,
                },
                status: selectedMatch.status,
              }}
              onStatusChange={() => {
                fetchMatches();
                setIsDetailsOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
