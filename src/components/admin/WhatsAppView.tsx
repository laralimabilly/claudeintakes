// src/components/admin/WhatsAppView.tsx
// ============================================================================
// WhatsApp conversation viewer for admin dashboard
//
// Shows all founder conversations with state badges,
// click-to-expand chat view, and admin override controls.
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, RotateCcw, ChevronLeft, User } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationItem {
  id: string;
  founder_id: string;
  phone_number: string;
  current_state: string;
  context: Record<string, unknown>;
  last_message_at: string;
  founder_name: string | null;
  last_message_preview: string | null;
}

interface ChatMessage {
  id: string;
  phone_number: string;
  message_content: string;
  is_from_user: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// State badge colors (matching conversationState.ts states)
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  IDLE:               { bg: "bg-gray-500/20",    text: "text-gray-400" },
  MATCH_NOTIFIED:     { bg: "bg-blue-500/20",    text: "text-blue-400" },
  MATCH_DETAILS_SENT: { bg: "bg-blue-500/20",    text: "text-blue-400" },
  INTRO_CONFIRMED:    { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  WAITING_FOR_OTHER:  { bg: "bg-yellow-500/20",  text: "text-yellow-400" },
  DECLINE_FEEDBACK:   { bg: "bg-red-500/20",     text: "text-red-400" },
  INTRO_SENT:         { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  FOLLOWUP_PENDING:   { bg: "bg-yellow-500/20",  text: "text-yellow-400" },
};

function StateBadge({ state }: { state: string }) {
  const colors = STATE_COLORS[state] || STATE_COLORS.IDLE;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {state.replace(/_/g, " ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helper: get auth token
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WhatsAppView() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversations list
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    }
  }, [selectedPhone]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      // Fetch conversations joined with founder names
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          id,
          founder_id,
          phone_number,
          current_state,
          context,
          last_message_at,
          founder:founder_profiles!whatsapp_conversations_founder_id_fkey(name)
        `)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Fetch last message preview for each phone
      const items: ConversationItem[] = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: lastMsg } = await supabase
            .from("whatsapp_messages")
            .select("message_content")
            .eq("phone_number", conv.phone_number)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: conv.id,
            founder_id: conv.founder_id,
            phone_number: conv.phone_number,
            current_state: conv.current_state,
            context: conv.context || {},
            last_message_at: conv.last_message_at,
            founder_name: conv.founder?.name || null,
            last_message_preview: lastMsg?.message_content?.slice(0, 60) || null,
          };
        })
      );

      setConversations(items);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(phoneNumber: string) {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, phone_number, message_content, is_from_user, created_at")
      .eq("phone_number", phoneNumber)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return;
    }

    setMessages(data || []);
  }

  async function handleResetToIdle(conversationId: string, phoneNumber: string) {
    setResetting(true);
    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ current_state: "IDLE", context: {} })
        .eq("id", conversationId);

      if (error) throw error;

      toast({ title: "Reset", description: "Conversation reset to IDLE" });
      fetchConversations();
    } catch (err) {
      toast({ title: "Error", description: "Failed to reset conversation", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  }

  // Selected conversation details
  const selectedConv = conversations.find((c) => c.phone_number === selectedPhone);

  // ---------------------------------------------------------------------------
  // Render: Conversation list (left panel)
  // ---------------------------------------------------------------------------

  function renderConversationList() {
    if (loading) {
      return <div className="p-4 text-white/50">Loading conversations...</div>;
    }

    if (conversations.length === 0) {
      return (
        <div className="p-8 text-center text-white/40">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No WhatsApp conversations yet</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[calc(100vh-220px)]">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelectedPhone(conv.phone_number)}
            className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
              selectedPhone === conv.phone_number ? "bg-white/10" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium truncate">
                {conv.founder_name || conv.phone_number}
              </span>
              <StateBadge state={conv.current_state} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs truncate max-w-[200px]">
                {conv.last_message_preview || "No messages"}
              </span>
              <span className="text-white/30 text-xs whitespace-nowrap ml-2">
                {new Date(conv.last_message_at).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </ScrollArea>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Chat panel (right panel)
  // ---------------------------------------------------------------------------

  function renderChatPanel() {
    if (!selectedPhone || !selectedConv) {
      return (
        <div className="flex-1 flex items-center justify-center text-white/30">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select a conversation</p>
          </div>
        </div>
      );
    }

    const ctx = selectedConv.context;

    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white/60"
                onClick={() => setSelectedPhone(null)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <User className="w-5 h-5 text-white/40" />
              <div>
                <p className="text-white text-sm font-medium">
                  {selectedConv.founder_name || "Unknown"}
                </p>
                <p className="text-white/40 text-xs">{selectedConv.phone_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StateBadge state={selectedConv.current_state} />
              {selectedConv.current_state !== "IDLE" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetting}
                  onClick={() => handleResetToIdle(selectedConv.id, selectedConv.phone_number)}
                  className="text-xs border-white/10 text-white/60 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Active match context card */}
          {ctx.match_id && (
            <div className="mt-2 p-2 rounded bg-white/5 border border-white/10 text-xs">
              <span className="text-white/50">Active match:</span>{" "}
              <span className="text-white">{(ctx.other_founder_name as string) || "Unknown"}</span>
              {ctx.score && (
                <>
                  {" "}
                  <span className="text-white/50">•</span>{" "}
                  <span className="text-emerald-400">{String(ctx.score)}%</span>
                </>
              )}
              {ctx.side && (
                <>
                  {" "}
                  <span className="text-white/50">• Side</span>{" "}
                  <span className="text-white">{String(ctx.side).toUpperCase()}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_from_user ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.is_from_user
                      ? "bg-blue-600/30 text-white"
                      : "bg-white/10 text-white/90"
                  }`}
                >
                  {msg.message_content}
                  <div className={`text-[10px] mt-1 ${msg.is_from_user ? "text-blue-300/50" : "text-white/30"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-180px)] border border-white/10 rounded-lg overflow-hidden bg-charcoal">
      {/* Left: Conversation list */}
      <div className={`w-full md:w-80 border-r border-white/10 ${selectedPhone ? "hidden md:block" : ""}`}>
        <div className="p-3 border-b border-white/10">
          <h3 className="text-white text-sm font-medium">WhatsApp Conversations</h3>
          <p className="text-white/40 text-xs">{conversations.length} conversations</p>
        </div>
        {renderConversationList()}
      </div>

      {/* Right: Chat panel */}
      <div className={`flex-1 flex flex-col ${!selectedPhone ? "hidden md:flex" : ""}`}>
        {renderChatPanel()}
      </div>
    </div>
  );
}
