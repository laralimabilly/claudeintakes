import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, GitMerge, TrendingUp, Clock } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type FounderProfile = Tables<"founder_profiles">;

const COLORS = ["#fff", "#a1a1aa", "#71717a", "#52525b"];

const Analytics = () => {
  const [profiles, setProfiles] = useState<FounderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("get-profiles", {
        method: "POST",
      });

      if (error) throw error;
      setProfiles(data?.profiles || []);
    } catch (error) {
      toast({
        title: "Error fetching profiles",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate key metrics
  const totalProfiles = profiles.length;
  const matchedCount = profiles.filter(p => p.matched).length;
  const unmatchedCount = totalProfiles - matchedCount;
  const avgSeriousness = profiles.length > 0 
    ? Math.round(profiles.reduce((sum, p) => sum + (p.seriousness_score || 0), 0) / profiles.length * 10) / 10
    : 0;

  // Stage distribution
  const stageData = profiles.reduce((acc, p) => {
    const stage = p.stage || "unknown";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageChartData = Object.entries(stageData)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  // Skills supply vs demand
  const skillsDemand: Record<string, number> = {};
  const skillsSupply: Record<string, number> = {};

  profiles.forEach(p => {
    (p.seeking_skills || []).forEach(skill => {
      skillsDemand[skill] = (skillsDemand[skill] || 0) + 1;
    });
    (p.core_skills || []).forEach(skill => {
      skillsSupply[skill] = (skillsSupply[skill] || 0) + 1;
    });
  });

  const topSkillsData = Object.keys(skillsDemand)
    .map(skill => ({
      name: skill.length > 12 ? skill.slice(0, 12) + "…" : skill,
      demand: skillsDemand[skill] || 0,
      supply: skillsSupply[skill] || 0,
    }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 5);

  // Timeline urgency
  const urgencyData = profiles.reduce((acc, p) => {
    const urgency = p.timeline_start || "unknown";
    acc[urgency] = (acc[urgency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const urgencyChartData = Object.entries(urgencyData)
    .map(([name, value]) => ({ name: name === "now" ? "Now" : name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <p className="text-silver">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-silver hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-medium">Analytics</h1>
            <p className="text-silver text-sm">{totalProfiles} founders in pipeline</p>
          </div>
        </div>

        {/* 4 Quadrants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Q1: Pipeline Overview */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
                <Users className="h-4 w-4 text-silver" />
                Pipeline Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-light">{totalProfiles}</p>
                  <p className="text-xs text-silver">Total</p>
                </div>
                <div>
                  <p className="text-3xl font-light text-white">{matchedCount}</p>
                  <p className="text-xs text-silver">Matched</p>
                </div>
                <div>
                  <p className="text-3xl font-light">{unmatchedCount}</p>
                  <p className="text-xs text-silver">Unmatched</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-sm text-silver">Avg Seriousness</span>
                <span className="text-xl font-light">{avgSeriousness}/10</span>
              </div>
            </CardContent>
          </Card>

          {/* Q2: Stage Distribution */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
                <TrendingUp className="h-4 w-4 text-silver" />
                Stage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center">
                {stageChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stageChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#2B2B2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-silver text-sm">No data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Q3: Skills Gap */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
                <GitMerge className="h-4 w-4 text-silver" />
                Skills: Demand vs Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {topSkillsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSkillsData} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80} 
                        tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ background: '#2B2B2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="demand" fill="#fff" name="Seeking" radius={[0, 2, 2, 0]} />
                      <Bar dataKey="supply" fill="#52525b" name="Have" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-silver text-sm text-center pt-16">No data</p>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 pt-2 text-xs text-silver">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-sm" /> Seeking</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-zinc-600 rounded-sm" /> Have</span>
              </div>
            </CardContent>
          </Card>

          {/* Q4: Timeline Urgency */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
                <Clock className="h-4 w-4 text-silver" />
                Timeline Urgency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 pt-2">
                {urgencyChartData.slice(0, 4).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-sm text-silver w-28 truncate">{item.name}</span>
                    <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                      <div 
                        className="h-full bg-white/80 rounded"
                        style={{ width: `${(item.value / totalProfiles) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-8 text-right">{item.value}</span>
                  </div>
                ))}
                {urgencyChartData.length === 0 && (
                  <p className="text-silver text-sm text-center py-8">No data</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Analytics;