import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Mic, MicOff, FileText, Download, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@11labs/react";

interface DeckAnalysis {
  companyName: string;
  oneLineSummary: string;
  coreThesis: string;
  targetCustomer: string;
  marketSize: string;
  whyNow: string;
  traction: string;
  businessModel: string;
  competition: string;
  team: string;
  ask: string;
  redFlags: string[];
  strongPoints: string[];
  overallReadiness: number;
  topThreeQuestions: string[];
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ThesisAlignment = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [deckContent, setDeckContent] = useState<string>("");
  const [deckAnalysis, setDeckAnalysis] = useState<DeckAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<{ prompt?: string; firstMessage?: string } | null>(null);

  // ElevenLabs Conversation Hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("ElevenLabs conversation connected");
      setIsConnecting(false);
      toast({
        title: "Connected to Line",
        description: "Start speaking - Line is listening.",
      });
    },
    onDisconnect: () => {
      console.log("ElevenLabs conversation disconnected");
      toast({
        title: "Conversation ended",
        description: "Your feedback summary is ready to export.",
      });
    },
    onMessage: (message) => {
      console.log("Message received:", message);
      // Handle different message types
      if (message.message) {
        const role = message.source === "user" ? "user" : "assistant";
        setConversationHistory(prev => [
          ...prev,
          {
            role,
            content: message.message,
            timestamp: new Date(),
          }
        ]);
      }
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      setIsConnecting(false);
      toast({
        title: "Connection error",
        description: "Could not connect to Line. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ["application/pdf", "text/plain", "text/markdown"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".md")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or text file.",
        variant: "destructive",
      });
      return;
    }

    setDeckFile(file);
    
    // For text files, read directly
    if (file.type === "text/plain" || file.name.endsWith(".md")) {
      const text = await file.text();
      setDeckContent(text);
      analyzeDeck(text, file.name);
    } else if (file.type === "application/pdf") {
      // For PDFs, convert to base64 and send to backend
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      analyzeDeckPdf(base64, file.name);
    }
  }, [toast]);

  // Analyze deck content (text)
  const analyzeDeck = async (content: string, fileName: string) => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("parse-deck", {
        body: { deckContent: content, deckName: fileName },
      });

      if (error) throw error;
      
      if (data.analysis) {
        setDeckAnalysis(data.analysis);
        toast({
          title: "Deck analyzed",
          description: `Ready to discuss ${data.analysis.companyName}`,
        });
      }
    } catch (error) {
      console.error("Error analyzing deck:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze your deck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze PDF deck
  const analyzeDeckPdf = async (pdfBase64: string, fileName: string) => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("parse-deck", {
        body: { pdfBase64, deckName: fileName },
      });

      if (error) throw error;
      
      if (data.analysis) {
        setDeckAnalysis(data.analysis);
        toast({
          title: "Deck analyzed",
          description: `Ready to discuss ${data.analysis.companyName}`,
        });
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error analyzing PDF:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze your deck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  // Get signed URL and start conversation
  const startConversation = async () => {
    try {
      setIsConnecting(true);

      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get signed URL from backend
      const { data, error } = await supabase.functions.invoke("elevenlabs-signed-url", {
        body: { deckAnalysis },
      });

      if (error) throw error;

      if (!data.signedUrl) {
        throw new Error("No signed URL returned");
      }

      console.log("Got signed URL, starting conversation...");
      setSignedUrl(data.signedUrl);
      
      // Store overrides for display
      if (data.promptOverride || data.firstMessageOverride) {
        setOverrides({
          prompt: data.promptOverride,
          firstMessage: data.firstMessageOverride,
        });
      }

      // Start the ElevenLabs conversation
      await conversation.startSession({
        signedUrl: data.signedUrl,
      });

    } catch (error) {
      console.error("Error starting conversation:", error);
      setIsConnecting(false);
      
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast({
          title: "Microphone access required",
          description: "Please allow microphone access to talk to Line.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: error instanceof Error ? error.message : "Could not start voice conversation.",
          variant: "destructive",
        });
      }
    }
  };

  // End conversation
  const endConversation = async () => {
    await conversation.endSession();
  };

  // Export conversation as text
  const exportFeedback = () => {
    if (conversationHistory.length === 0) {
      toast({
        title: "No conversation to export",
        description: "Have a conversation with Line first.",
        variant: "destructive",
      });
      return;
    }

    let exportText = `# Thesis Alignment Feedback\n`;
    exportText += `## ${deckAnalysis?.companyName || "Your Pitch"}\n`;
    exportText += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    if (deckAnalysis) {
      exportText += `### Initial Analysis\n`;
      exportText += `**Summary:** ${deckAnalysis.oneLineSummary}\n`;
      exportText += `**Readiness Score:** ${deckAnalysis.overallReadiness}/10\n\n`;
      exportText += `**Strong Points:**\n${deckAnalysis.strongPoints?.map(p => `- ${p}`).join("\n") || "None identified"}\n\n`;
      exportText += `**Areas to Address:**\n${deckAnalysis.redFlags?.map(f => `- ${f}`).join("\n") || "None identified"}\n\n`;
    }

    exportText += `### Conversation\n\n`;
    conversationHistory.forEach(msg => {
      const speaker = msg.role === "assistant" ? "Line" : "You";
      exportText += `**${speaker}:** ${msg.content}\n\n`;
    });

    // Create and download file
    const blob = new Blob([exportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thesis-feedback-${deckAnalysis?.companyName?.replace(/\s+/g, "-").toLowerCase() || "pitch"}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Feedback exported",
      description: "Check your downloads folder.",
    });
  };

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
      
      {/* Back link */}
      <Link 
        to="/" 
        className="fixed top-6 left-6 sm:top-8 sm:left-12 lg:left-20 z-20 flex items-center gap-2 text-silver/60 hover:text-white transition-colors text-sm"
      >
        <span>←</span>
        <span>Home</span>
      </Link>
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-12 pt-28 sm:pt-36 pb-24 sm:pb-32">
        {/* Header */}
        <header className="mb-12 sm:mb-16">
          <span className="text-silver/40 text-xs tracking-widest uppercase block mb-6">Thesis Alignment</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-[1.3] mb-6">
            Talk to Line about your pitch.
          </h1>
          <p className="text-silver/60 text-lg max-w-2xl">
            Upload your deck, then have a voice conversation. Line will push back, ask hard questions and help you anticipate investor skepticism.
          </p>
        </header>

        {/* Step 1: Upload Deck */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-ochre/20 flex items-center justify-center text-ochre text-sm font-medium">
              1
            </div>
            <h2 className="text-lg text-white font-medium">Upload your pitch deck</h2>
          </div>

          {!deckAnalysis ? (
            <div className="bg-cream/[0.03] border border-white/10 p-8 rounded-sm">
              {/* File upload area */}
              <div 
                className="border-2 border-dashed border-silver/20 rounded-sm p-8 text-center cursor-pointer hover:border-silver/40 transition-colors mb-6"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-silver/40 mx-auto mb-4" />
                <p className="text-white mb-2">Drop your deck here or click to upload</p>
                <p className="text-silver/40 text-sm">PDF, TXT, or Markdown</p>
              </div>

              {isAnalyzing && (
                <div className="flex items-center justify-center gap-3 text-silver">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing your deck...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-cream/[0.03] border border-white/10 p-8 rounded-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-medium text-lg">{deckAnalysis.companyName}</h3>
                  <p className="text-silver/60">{deckAnalysis.oneLineSummary}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-light text-ochre">{deckAnalysis.overallReadiness}</span>
                  <span className="text-silver/40">/10</span>
                  <p className="text-silver/40 text-xs mt-1">Readiness</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-silver/40 text-xs uppercase tracking-wider mb-2">Strong Points</h4>
                  <ul className="text-sm text-silver/80 space-y-1">
                    {deckAnalysis.strongPoints?.slice(0, 3).map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-silver/40 text-xs uppercase tracking-wider mb-2">Areas to Address</h4>
                  <ul className="text-sm text-silver/80 space-y-1">
                    {deckAnalysis.redFlags?.slice(0, 3).map((flag, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400">!</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeckAnalysis(null);
                  setDeckContent("");
                  setDeckFile(null);
                }}
                className="text-charcoal border-silver/20"
              >
                Upload Different Deck
              </Button>
            </div>
          )}
        </section>

        {/* Step 2: Voice Conversation */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              deckAnalysis ? "bg-ochre/20 text-ochre" : "bg-silver/10 text-silver/40"
            }`}>
              2
            </div>
            <h2 className={`text-lg font-medium ${deckAnalysis ? "text-white" : "text-silver/40"}`}>
              Talk to Line
            </h2>
          </div>

          <div className="bg-cream/[0.03] border border-white/10 p-8 rounded-sm">
            {!isConnected && !isConnecting ? (
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  deckAnalysis ? "bg-ochre/20" : "bg-silver/10"
                }`}>
                  <Mic className={`w-10 h-10 ${deckAnalysis ? "text-ochre" : "text-silver/40"}`} />
                </div>
                <p className="text-silver/60 mb-6">
                  {deckAnalysis 
                    ? "Ready to discuss your pitch. Line will ask probing questions."
                    : "Upload a deck first, or start without one to describe your idea."
                  }
                </p>
                <Button
                  onClick={startConversation}
                  className="bg-ochre hover:bg-ochre/90 text-white px-8"
                >
                  Start Conversation
                </Button>
              </div>
            ) : isConnecting ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-ochre mx-auto mb-4 animate-spin" />
                <p className="text-silver/60">Connecting to Line...</p>
              </div>
            ) : (
              <div>
                {/* Active conversation UI */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isSpeaking ? "bg-ochre scale-110" : "bg-ochre/20"
                  }`} style={{
                    boxShadow: isSpeaking ? "0 0 40px rgba(194, 105, 38, 0.4)" : "none",
                  }}>
                    {isSpeaking ? (
                      <Volume2 className="w-10 h-10 text-white animate-pulse" />
                    ) : (
                      <Mic className="w-10 h-10 text-ochre" />
                    )}
                  </div>
                </div>

                <p className="text-center text-silver/60 mb-6">
                  {isSpeaking ? "Line is speaking..." : "Line is listening... speak now"}
                </p>

                {/* Transcript */}
                {conversationHistory.length > 0 && (
                  <div className="bg-charcoal/50 rounded-sm p-4 mb-6 max-h-64 overflow-y-auto">
                    {conversationHistory.map((msg, i) => (
                      <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
                        <span className={`text-xs uppercase tracking-wider ${
                          msg.role === "assistant" ? "text-ochre" : "text-silver/40"
                        }`}>
                          {msg.role === "assistant" ? "Line" : "You"}
                        </span>
                        <p className={`text-sm mt-1 ${
                          msg.role === "assistant" ? "text-white" : "text-silver/80"
                        }`}>
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={endConversation}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <MicOff className="w-4 h-4 mr-2" />
                    End Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Export */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              conversationHistory.length > 0 ? "bg-ochre/20 text-ochre" : "bg-silver/10 text-silver/40"
            }`}>
              3
            </div>
            <h2 className={`text-lg font-medium ${
              conversationHistory.length > 0 ? "text-white" : "text-silver/40"
            }`}>
              Export Feedback
            </h2>
          </div>

          <div className="bg-cream/[0.03] border border-white/10 p-8 rounded-sm">
            <p className="text-silver/60 mb-6">
              {conversationHistory.length > 0 
                ? "Download your conversation and feedback as a text file."
                : "Complete a conversation to export your feedback."
              }
            </p>
            <Button
              onClick={exportFeedback}
              disabled={conversationHistory.length === 0}
              className="bg-white text-charcoal hover:bg-silver-light disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Feedback
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5">
          <p className="text-sm text-silver/40 mb-4">
            Your deck and conversations are not stored. Everything stays private.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-silver/40 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Back to home</span>
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default ThesisAlignment;
