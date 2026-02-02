import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
    total_score: number;
    compatibility_level: 'highly_compatible' | 'somewhat_compatible';
    dimension_scores: DimensionScores;
  };
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

export const MatchDetails = ({ match }: MatchDetailsProps) => {
  const { total_score, compatibility_level, dimension_scores } = match;

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-light text-white">Match Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${
                compatibility_level === 'highly_compatible'
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
              }`}
            >
              {compatibility_level === 'highly_compatible' ? 'Highly Compatible' : 'Compatible'}
            </Badge>
          </div>
        </div>
        
        {/* Overall Score */}
        <div className="flex items-center gap-4 mt-4">
          <div 
            className={`text-4xl font-bold ${getScoreTextColor(total_score)}`}
          >
            {Math.round(total_score)}%
          </div>
          <div className="text-sm text-silver/50">
            Overall Match Score
          </div>
        </div>
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
