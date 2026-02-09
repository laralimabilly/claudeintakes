import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  Users,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface ConversationRow {
  id: string;
  founder_id: string;
  phone_number: string;
  current_state: string;
  context: Record<string, unknown>;
  last_message_at: string;
  founder_name: string | null;
  last_message?: string | null;
}

interface MessageRow {
  id: string;
  phone_number: string;
  message_content: string | null;
  is_from_user: boolean | null;
  received_at: string;
}

const STATE_BADGES: Record<string, { label: string; className: string }> = {
  IDLE: { label: "Idle", className: "border-white/10 text-silver/60 bg-white/[0.03]" },
  MATCH_NOTIFIED: { label: "Match Notified", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  MATCH_DETAILS_SENT: { label: "Details Sent", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  INTRO_CONFIRMED: { label: "Intro Confirmed", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  WAITING_FOR_OTHER: { label: "Waiting for Other", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  DECLINE_FEEDBACK: { label: "Decline Feedback", className: "border-red-500/30 text-red-400 bg-red-500/10" },
  INTRO_SENT: { label: "Intro Sent", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  FOLLOWUP_PENDING: { label: "Followup Pending", className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
};

export const WhatsAppView = () => {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<ConversationRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const { data: convos, error: convoError } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (convoError) throw convoError;

      const founderIds = [...new Set((convos || []).map((c) => c.founder_id))];
      const { data: founders } = await supabase
        .from("founder_profiles")
        .select("id, name")
        .in("id", founderIds);

      const nameMap = new Map((founders || []).map((f) => [f.id, f.name]));

      // Get last message for each phone number
      const phoneNumbers = [...new Set((convos || []).map((c) => c.phone_number))];
      const lastMessages = new Map<string, string | null>();

      if (phoneNumbers.length > 0) {
        for (const phone of phoneNumbers) {
          const { data: msgs } = await supabase
            .from("whatsapp_messages")
            .select("message_content")
            .eq("phone_number", phone)
            .order("received_at", { ascending: false })
            .limit(1);
          lastMessages.set(phone, msgs?.[0]?.message_content || null);
        }
      }

      const enriched: ConversationRow[] = (convos || []).map((c) => ({
        id: c.id,
        founder_id: c.founder_id,
        phone_number: c.phone_number,
        current_state: c.current_state,
        context: (c.context as Record<string, unknown>) || {},
        last_message_at: c.last_message_at,
        founder_name: nameMap.get(c.founder_id) || null,
        last_message: lastMessages.get(c.phone_number) || null,
      }));

      setConversations(enriched);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (phoneNumber: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, phone_number, message_content, is_from_user, received_at")
        .eq("phone_number", phoneNumber)
        .order("received_at", { ascending: true });

      if (error) throw error;
      setMessages((data as MessageRow[]) || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectConvo = (convo: ConversationRow) => {
    setSelectedConvo(convo);
    fetchMessages(convo.phone_number);
  };

  const handleResetToIdle = async (convo: ConversationRow) => {
    setResettingId(convo.id);
    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ current_state: "IDLE", context: {} })
        .eq("id", convo.id);

      if (error) throw error;

      toast({ title: "Reset", description: `Conversation reset to IDLE` });
      await fetchConversations();
      if (selectedConvo?.id === convo.id) {
        setSelectedConvo({ ...convo, current_state: "IDLE", context: {} });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reset", variant: "destructive" });
    } finally {
      setResettingId(null);
    }
  };

  const getStateBadge = (state: string) => {
    const config = STATE_BADGES[state] || STATE_BADGES.IDLE;
    return (
      <Badge variant="outline" className={`text-[10px] ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-xs tracking-widest uppercase text-silver/40">Loading Conversations</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedConvo) {
    const ctx = selectedConvo.context;
    const hasMatchContext = ctx.match_id || ctx.other_founder_name;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedConvo(null); setMessages([]); }}
              className="text-silver/60 hover:text-white hover:bg-white/5 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-light text-white">
                {selectedConvo.founder_name || "Unknown"}
              </h2>
              <p className="text-xs text-silver/50 mt-0.5">{selectedConvo.phone_number}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStateBadge(selectedConvo.current_state)}
              {selectedConvo.current_state !== "IDLE" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetToIdle(selectedConvo)}
                  disabled={resettingId === selectedConvo.id}
                  className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {resettingId === selectedConvo.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3 mr-1" />
                  )}
                  Reset
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMessages(selectedConvo.phone_number)}
                className="border-white/10 text-silver/70 hover:text-white hover:bg-white/5"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Match context card */}
          {hasMatchContext && (
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3 flex items-center gap-4">
                <Users className="h-4 w-4 text-silver/50 flex-shrink-0" />
                <div className="text-xs text-silver/70 space-y-0.5">
                  {ctx.other_founder_name && (
                    <p>Match with: <span className="text-white">{ctx.other_founder_name as string}</span></p>
                  )}
                  {ctx.score != null && (
                    <p>Score: <span className="text-white">{String(ctx.score)}%</span></p>
                  )}
                  {ctx.compatibility_level && (
                    <p>Level: <span className="text-white">{String(ctx.compatibility_level).replace("_", " ")}</span></p>
                  )}
                  {ctx.side && (
                    <p>Side: <span className="text-white">{String(ctx.side).toUpperCase()}</span></p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-silver/40" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageSquare className="h-8 w-8 text-silver/20 mb-2" />
              <p className="text-silver/40 text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {messages.map((msg) => {
                const isUser = msg.is_from_user !== false;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isUser
                          ? "bg-white/10 text-white"
                          : "bg-white/[0.04] text-silver/80"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message_content || "(empty)"}
                      </p>
                      <p className={`text-[10px] mt-1 ${isUser ? "text-silver/40 text-right" : "text-silver/30"}`}>
                        {format(new Date(msg.received_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-light text-white">WhatsApp Conversations</h2>
            <p className="text-xs text-silver/50 mt-1">{conversations.length} conversations</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConversations}
            className="border-white/10 text-silver/70 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MessageSquare className="h-12 w-12 text-silver/20 mb-4" />
            <p className="text-silver/50">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => handleSelectConvo(convo)}
                className="w-full text-left px-6 py-4 hover:bg-white/[0.02] transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white font-medium truncate">
                      {convo.founder_name || "Unknown"}
                    </span>
                    {getStateBadge(convo.current_state)}
                  </div>
                  <p className="text-xs text-silver/40 truncate">{convo.phone_number}</p>
                  {convo.last_message && (
                    <p className="text-xs text-silver/50 mt-1 truncate max-w-md">
                      {convo.last_message.slice(0, 60)}{convo.last_message.length > 60 ? "…" : ""}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-silver/30">
                    {format(new Date(convo.last_message_at), "MMM d, h:mm a")}
                  </span>
                  {convo.current_state !== "IDLE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleResetToIdle(convo); }}
                      disabled={resettingId === convo.id}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 px-2"
                    >
                      {resettingId === convo.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
