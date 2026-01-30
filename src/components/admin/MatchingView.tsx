// src/components/admin/MatchingView.tsx
// UPDATED: Now uses AI-powered embeddings for matching

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  X, 
  Send, 
  Users,
  ArrowRight,
  MapPin,
  Briefcase,
  Zap,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { findHybridMatches, type AIMatchResult } from "@/lib/matchingUtils";

type FounderProfile = Tables<"founder_profiles">;

export const MatchingView = () => {
  const [profiles, setProfiles] = useState<FounderProfile[]>([]);
  const [selectedForMatch, setSelectedForMatch] = useState<FounderProfile[]>([]);
  const [focusedFounder, setFocusedFounder] = useState<FounderProfile | null>(null);
  const [aiMatches, setAIMatches] = useState<AIMatchResult[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Load AI matches when a founder is focused
  useEffect(() => {
    if (focusedFounder) {
      loadAIMatches(focusedFounder);
    } else {
      setAIMatches([]);
    }
  }, [focusedFounder]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchProfiles = async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;
      const unmatchedProfiles = (data.profiles || []).filter((p: FounderProfile) => !p.matched);
      setProfiles(unmatchedProfiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load profiles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIMatches = async (founder: FounderProfile) => {
    setIsLoadingMatches(true);
    try {
      const matches = await findHybridMatches(
        founder.id,
        founder,
        0.70, // Similarity threshold
        20    // Candidates to evaluate
      );
      setAIMatches(matches);
    } catch (error) {
      console.error("Error loading AI matches:", error);
      toast({
        title: "Matching Error",
        description: "Failed to load AI-powered matches",
        variant: "destructive",
      });
      setAIMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    let result = profiles;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) =>
        p.name?.toLowerCase().includes(term) ||
        p.idea_description?.toLowerCase().includes(term) ||
        p.core_skills?.some(s => s.toLowerCase().includes(term)) ||
        p.location_preference?.toLowerCase().includes(term)
      );
    }
    
    // If we have AI matches and a focused founder, sort by AI similarity
    if (focusedFounder && aiMatches.length > 0) {
      const scoreMap = new Map(aiMatches.map(m => [m.id, m.similarity]));
      result = [...result].sort((a, b) => {
        const scoreA = scoreMap.get(a.id) ?? 0;
        const scoreB = scoreMap.get(b.id) ?? 0;
        return scoreB - scoreA;
      });
    }
    
    return result;
  }, [profiles, searchTerm, focusedFounder, aiMatches]);

  const getAIScoreForProfile = (profileId: string): number | null => {
    if (!focusedFounder || aiMatches.length === 0) return null;
    const match = aiMatches.find(m => m.id === profileId);
    return match ? match.similarity : null;
  };

  const addToMatch = (profile: FounderProfile) => {
    if (selectedForMatch.find(p => p.id === profile.id)) return;
    
    const newSelected = [...selectedForMatch, profile];
    setSelectedForMatch(newSelected);
    
    if (!focusedFounder) {
      setFocusedFounder(profile);
    }
  };

  const removeFromMatch = (profileId: string) => {
    const newSelected = selectedForMatch.filter(p => p.id !== profileId);
    setSelectedForMatch(newSelected);
    
    if (focusedFounder?.id === profileId) {
      setFocusedFounder(newSelected[0] || null);
    }
  };

  const handleSendIntro = async () => {
    if (selectedForMatch.length < 2) {
      toast({ title: "Select at least 2 founders", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("send-whatsapp-intro", {
        headers: { Authorization: `Bearer ${token}` },
        body: { founderIds: selectedForMatch.map(p => p.id) },
      });

      if (error) throw error;

      toast({ title: "Intro Sent!", description: `Connected ${selectedForMatch.length} founders` });
      setSelectedForMatch([]);
      setFocusedFounder(null);
      fetchProfiles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const ScoreBadge = ({ score, isAI = false }: { score: number; isAI?: boolean }) => {
    const percentage = isAI ? Math.round(score * 100) : score;
    const tier = percentage >= 85 ? "excellent" : percentage >= 70 ? "good" : percentage >= 55 ? "fair" : "low";
    
    const colors = {
      excellent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      low: "bg-silver/10 text-silver/50 border-silver/20",
    };
    
    return (
      <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${colors[tier]} inline-flex items-center gap-1`}>
        {isAI && <Zap className="w-2.5 h-2.5" />}
        {percentage}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xs tracking-widest uppercase text-silver/40">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Available Founders */}
      <div className="flex-1 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-light text-white">Available Founders</h2>
            {focusedFounder && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400/80">
                <Zap className="h-2.5 w-2.5 mr-1" />
                AI-Ranked for {focusedFounder.name || "Founder"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-silver/50 mb-4">{filteredProfiles.length} unmatched</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver/40" />
            <Input
              placeholder="Search by name, idea, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-transparent border-white/10 text-white placeholder:text-silver/30"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoadingMatches && focusedFounder && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-silver/50">Loading AI matches...</p>
              </div>
            )}

            {filteredProfiles.map((profile) => {
              const isSelected = selectedForMatch.some(p => p.id === profile.id);
              const isFocused = focusedFounder?.id === profile.id;
              const aiScore = getAIScoreForProfile(profile.id);
              
              return (
                <div
                  key={profile.id}
                  className={`p-4 rounded-sm border transition-all cursor-pointer ${
                    isFocused
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : isSelected 
                        ? "bg-white/10 border-white/30" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => !isSelected && addToMatch(profile)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          {profile.name || "Anonymous"}
                        </h4>
                        {aiScore !== null && <ScoreBadge score={aiScore} isAI={true} />}
                      </div>
                      <p className="text-xs text-silver/50 line-clamp-2 mt-1">
                        {profile.idea_description || "No description"}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-silver/40">
                        {profile.location_preference && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {profile.location_preference}
                          </span>
                        )}
                        {profile.cofounder_type && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-2.5 w-2.5" />
                            seeks {profile.cofounder_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-silver/40 hover:text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        isSelected ? removeFromMatch(profile.id) : addToMatch(profile);
                      }}
                    >
                      {isSelected ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredProfiles.length === 0 && !isLoadingMatches && (
              <div className="text-center py-12">
                <Users className="h-8 w-8 text-silver/20 mx-auto mb-3" />
                <p className="text-sm text-silver/40">No unmatched founders</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Selected for Matching */}
      <div className="w-80 lg:w-96 flex flex-col bg-white/[0.01]">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-light text-white mb-1">Match Group</h2>
          <p className="text-xs text-silver/50">
            {selectedForMatch.length} founder{selectedForMatch.length !== 1 ? "s" : ""} selected
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {selectedForMatch.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRight className="h-6 w-6 text-silver/20 mx-auto mb-3" />
                <p className="text-sm text-silver/40">Click founders to add them</p>
                <p className="text-xs text-silver/30 mt-1">First selected becomes the AI reference</p>
              </div>
            ) : (
              selectedForMatch.map((profile, index) => {
                const isFocused = focusedFounder?.id === profile.id;
                return (
                  <div key={profile.id} className="relative">
                    {index > 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[8px] text-silver/60">+</span>
                      </div>
                    )}
                    <div 
                      className={`p-4 rounded-sm border cursor-pointer transition-all ${
                        isFocused 
                          ? "bg-emerald-500/10 border-emerald-500/30" 
                          : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                      }`}
                      onClick={() => setFocusedFounder(profile)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-white truncate">
                              {profile.name || "Anonymous"}
                            </h4>
                            {isFocused && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/70">
                                <Zap className="w-2.5 h-2.5" />
                                AI Ref
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-silver/50 mt-0.5">
                            {profile.stage || "Unknown stage"}
                          </p>
                          {profile.core_skills && profile.core_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.core_skills.slice(0, 3).map((skill, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-1.5 py-0.5 text-[9px] bg-white/10 text-silver/70 rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          {profile.seeking_skills && profile.seeking_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.seeking_skills.slice(0, 2).map((skill, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400/80 rounded"
                                >
                                  seeks: {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-silver/40 hover:text-white hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromMatch(profile.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Send Button */}
        <div className="p-4 border-t border-white/5">
          <Button
            className="w-full bg-white text-charcoal hover:bg-white/90 disabled:opacity-50"
            disabled={selectedForMatch.length < 2 || isSending}
            onClick={handleSendIntro}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : `Introduce ${selectedForMatch.length} Founders`}
          </Button>
          {selectedForMatch.length < 2 && selectedForMatch.length > 0 && (
            <p className="text-[10px] text-silver/40 text-center mt-2">
              Select at least 2 founders to match
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
