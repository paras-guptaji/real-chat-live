import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface MessagePanelProps {
  conversationId: string | null;
}

export function MessagePanel({ conversationId }: MessagePanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationName, setConversationName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetchConversation = async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      const memberIds = members?.map((m) => m.user_id) ?? [];
      setMemberCount(memberIds.length);

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberIds);

      const profMap: Record<string, string> = {};
      profs?.forEach((p) => (profMap[p.id] = p.display_name));
      setProfiles(profMap);

      if (convo?.type === "group") {
        setConversationName(convo.name || "Group Chat");
      } else {
        const other = profs?.find((p) => p.id !== user?.id);
        setConversationName(other?.display_name || "Chat");
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
    };

    fetchConversation();
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm">or start a new one from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">
            {conversationName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{conversationName}</p>
          <p className="text-xs text-muted-foreground">{memberCount} members</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const senderName = profiles[msg.sender_id] || "Unknown";

          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${isOwn ? "order-2" : ""}`}>
                {!isOwn && (
                  <p className="mb-1 text-xs text-muted-foreground">{senderName}</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`mt-1 text-xs text-muted-foreground ${isOwn ? "text-right" : ""}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t px-4 py-3">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
