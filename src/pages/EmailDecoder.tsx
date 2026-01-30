import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Twitter, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Analysis {
  hotTake: string | null;
  realMeaning: string;
  confidenceScore: number;
  confidenceLabel: string;
  nextMove: string;
  shouldFollowUp: boolean;
  followUpReasoning: string;
}

const EmailDecoder = () => {
  const [emailContent, setEmailContent] = useState("");
  const [includeSass, setIncludeSass] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const { toast } = useToast();

  const handleDecode = async () => {
    if (!emailContent.trim() || emailContent.trim().length < 20) {
      toast({
        title: "Need more content",
        description: "Please paste a longer email thread to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decode-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ emailContent, includeSass }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error("Decode error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const text = `Just ran my investor email through @FounderKit's Line decoder... 💀\n\nVerdict: ${analysis?.confidenceLabel} (${analysis?.confidenceScore}/10)\n\nTry it: founderkit.tools/investor/email-decoder`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleReset = () => {
    setAnalysis(null);
    setEmailContent("");
  };

  const getConfidenceColor = (score: number) => {
    if (score <= 3) return "bg-red-500";
    if (score <= 5) return "bg-amber-500";
    if (score <= 7) return "bg-yellow-500";
    return "bg-white";
  };

  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal to-[hsl(0_0%_12%)]" />

      {/* Back link */}
      <Link
        to="/investor"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 text-silver hover:text-white transition-colors min-h-[44px] min-w-[44px] px-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Investor Tools</span>
      </Link>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {!analysis ? (
          /* Input View */
          <div className="space-y-8 animate-fade-up">
            <header className="text-center space-y-4">
              <span className="text-silver/40 text-xs tracking-widest uppercase">Pattern Recognition</span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white tracking-tight">
                Decode Email Thread
              </h1>
              <p className="text-base sm:text-lg text-silver max-w-md mx-auto">
                Paste your investor email and get Line's translation + real advice.
              </p>
              {/* Hand-drawn underline */}
              <svg className="mx-auto w-32 h-4 text-silver/20" viewBox="0 0 150 20">
                <path d="M 5,10 Q 35,16 75,8 T 145,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </header>

            <div className="space-y-5">
              {/* Hand-drawn frame around textarea */}
              <div className="relative">
                <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <path 
                    d="M 12,15 Q 8,8 25,10 L 375,12 Q 392,8 390,25 L 388,275 Q 390,292 373,288 L 22,290 Q 8,293 12,275 L 15,25 Q 10,15 12,15"
                    fill="none" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Paste your email thread with an investor here..."
                  className="w-full h-64 sm:h-80 p-5 bg-white/5 backdrop-blur-sm text-white placeholder:text-silver/50 focus:outline-none focus:bg-white/10 resize-none text-sm sm:text-base transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="sass-mode"
                    checked={includeSass}
                    onCheckedChange={setIncludeSass}
                  />
                  <Label
                    htmlFor="sass-mode"
                    className="text-sm text-silver cursor-pointer font-handwritten text-lg"
                  >
                    Include Line's sass ✏️
                  </Label>
                </div>
              </div>

              <button
                onClick={handleDecode}
                disabled={isLoading || !emailContent.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] bg-white text-charcoal font-medium text-base hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-charcoal/30 border-t-charcoal rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Decode Email Thread
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-sm text-silver/50 font-handwritten">
              No login required. Your emails are not stored.
            </p>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6 animate-fade-up">
            <header className="text-center space-y-2">
              <span className="text-silver/40 text-xs tracking-widest uppercase">Analysis Complete</span>
              <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                Here's What Line Sees
              </h1>
            </header>

            {/* Line's Hot Take */}
            {analysis.hotTake && (
              <section className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8">
                <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <path 
                    d="M 10,12 L 390,8 Q 398,10 395,20 L 392,130 Q 395,142 385,140 L 12,145 Q 5,143 8,132 L 12,18 Q 8,10 10,12"
                    fill="none" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">✏️</span>
                    <h2 className="text-lg font-medium text-white">Line's Hot Take</h2>
                  </div>
                  <p className="text-silver leading-relaxed font-handwritten text-xl italic">
                    "{analysis.hotTake}"
                  </p>
                </div>
              </section>
            )}

            {/* Real Talk */}
            <section className="relative bg-white/5 backdrop-blur-sm p-6 sm:p-8 space-y-6">
              <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="none">
                <path 
                  d="M 8,15 L 392,10 Q 400,12 397,25 L 394,375 Q 397,390 385,388 L 10,392 Q 3,390 6,378 L 10,22 Q 6,12 8,15"
                  fill="none" 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📊</span>
                  <h2 className="text-lg font-medium text-white">Real Talk</h2>
                </div>

                {/* What they actually mean */}
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-widest text-silver/50 mb-2">
                    What they actually mean
                  </h3>
                  <p className="text-sm sm:text-base text-silver leading-relaxed">
                    {analysis.realMeaning}
                  </p>
                </div>

                {/* Confidence Level */}
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-widest text-silver/50 mb-2">
                    Interest Level
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${getConfidenceColor(analysis.confidenceScore)} transition-all`}
                        style={{ width: `${analysis.confidenceScore * 10}%` }}
                      />
                    </div>
                    <span className="text-lg font-medium text-white whitespace-nowrap">
                      {analysis.confidenceScore}/10
                    </span>
                  </div>
                  <p className="text-sm text-silver/60 mt-1 font-handwritten">
                    {analysis.confidenceLabel}
                  </p>
                </div>

                {/* Next Move */}
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-widest text-silver/50 mb-2">
                    Next Move
                  </h3>
                  <p className="text-sm sm:text-base text-silver leading-relaxed">
                    {analysis.nextMove}
                  </p>
                </div>

                {/* Should you follow up */}
                <div className="pt-5 border-t border-white/10">
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-10 h-10 flex items-center justify-center font-bold text-charcoal text-sm ${
                        analysis.shouldFollowUp ? "bg-white" : "bg-silver/30"
                      }`}
                    >
                      {analysis.shouldFollowUp ? "✓" : "✗"}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        Should you follow up?{" "}
                        <span className={analysis.shouldFollowUp ? "text-white" : "text-silver/50"}>
                          {analysis.shouldFollowUp ? "Yes" : "No"}
                        </span>
                      </h3>
                      <p className="text-sm text-silver/70 mt-1">
                        {analysis.followUpReasoning}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-white text-charcoal font-medium text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <Twitter className="w-4 h-4" />
                Share to X
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] border border-white/20 text-white font-medium text-sm hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Analyze Another
              </button>
            </div>

            <p className="text-center text-sm text-silver/50 font-handwritten">
              Your emails are not stored. Analysis powered by Line.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDecoder;
