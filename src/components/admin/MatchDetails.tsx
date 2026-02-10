import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { canNotify, isActive } from "@/types/matchStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Check } from "lucide-react";

interface DimensionScores {
  skills: number;
  stage: number;
  communication: number;
  vision: number;
  values: number;
  geo: number;
  advantages: number;
}

interface MatchDetailsProps {
  match: {
    id?: string;
    total_score: number;
    compatibility_level: 'highly_compatible' | 'somewhat_compatible';
    dimension_scores: DimensionScores;
    status?: string | null;
  };
  onStatusChange?: () => void;
}

const DIMENSION_CONFIG = [
  { key: 'skills', label: 'Skills Complementarity', weight: 27 },
  { key: 'stage', label: 'Stage & Timeline', weight: 23 },
  { key: 'communication', label: 'Communication Style', weight: 19 },
  { key: 'vision', label: 'Vision Alignment', weight: 15 },
  { key: 'values', label: 'Working Values', weight: 11 },
  { key: 'geo', label: 'Geographic Fit', weight: 3 },
  { key: 'advantages', label: 'Advantage Synergy', weight: 2 },
] as const;

const STEPPER_STEPS = [
  { key: 'notified_a', label: 'Notified A' },
  { key: 'a_interested', label: 'A Interested' },
  { key: 'notified_b', label: 'Notified B' },
  { key: 'b_interested', label: 'B Interested' },
  { key: 'both_interested', label: 'Both Interested' },
  { key: 'intro_sent', label: 'Intro Sent' },
] as const;

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

function MatchStepper({ status }: { status: string }) {
  const currentIndex = STEPPER_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-3">
      {STEPPER_STEPS.map((step, i) => {
        const isPast = currentIndex > i;
        const isCurrent = currentIndex === i;
        const isFuture = currentIndex < i;

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-4 h-px mx-0.5 ${isPast ? 'bg-emerald-500/60' : 'bg-white/10'}`}
              />
            )}
            <div className="flex flex-col items-center gap-1 min-w-[56px]">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium border ${
                  isPast
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : isCurrent
                    ? 'bg-blue-500/20 border-blue-400 text-blue-400 ring-1 ring-blue-400/30'
                    : 'bg-white/5 border-white/10 text-silver/30'
                }`}
              >
                {isPast ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-[9px] text-center leading-tight ${
                  isCurrent ? 'text-blue-400 font-medium' : isPast ? 'text-emerald-400/60' : 'text-silver/30'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const MatchDetails = ({ match, onStatusChange }: MatchDetailsProps) => {
  const { total_score, compatibility_level, dimension_scores, status, id } = match;
  const statusKey = status || 'pending';
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendNotification = async () => {
    if (!id) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-intro", {
        body: { matchId: id },
      });
      if (error) throw error;
      toast({
        title: "Notification sent",
        description: `Match notification sent to ${data?.notifiedFounder?.name || "Founder A"}`,
      });
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send match notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-light text-white">Match Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={statusKey} />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                compatibility_level === 'highly_compatible'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {compatibility_level === 'highly_compatible' ? 'Highly Compatible' : 'Compatible'}
            </span>
          </div>
        </div>
        
        {/* Overall Score */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreTextColor(total_score)}`}>
              {Math.round(total_score)}%
            </div>
            <div className="text-sm text-silver/50">Overall Match Score</div>
          </div>

          {/* Send Notification button for pending matches */}
          {canNotify(statusKey) && id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendNotification}
              disabled={isSending}
              className="border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Send Notification
            </Button>
          )}
        </div>

        {/* Stepper for active flow */}
        {isActive(statusKey) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <MatchStepper status={statusKey} />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-xs text-silver/40 uppercase tracking-wider mb-3">
          Score Breakdown
        </div>

        {DIMENSION_CONFIG.map(({ key, label, weight }) => {
          const score = dimension_scores[key as keyof DimensionScores];
          
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-silver/70">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-silver/40">{weight}%</span>
                  <span className={`font-medium ${getScoreTextColor(score)}`}>
                    {Math.round(score)}
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div 
                  className={`h-full transition-all ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-white/5 text-[10px] text-silver/40">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Strong (≥80)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Moderate (60-79)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Weak (&lt;60)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
