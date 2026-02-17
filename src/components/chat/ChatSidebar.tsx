import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, MessageCircle, Plus, Users, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ConversationWithDetails {
  id: string;
  type: "dm" | "group";
  name: string | null;
  updated_at: string;
  members: { user_id: string; display_name: string }[];
  last_message?: { content: string; created_at: string };
}

interface ChatSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ChatSidebar({ activeConversationId, onSelectConversation }: ChatSidebarProps) {
  const { user, signOut } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatEmail, setNewChatEmail] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"dm" | "group">("dm");
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberRows?.length) {
      setConversations([]);
      return;
    }

    const convoIds = memberRows.map((m) => m.conversation_id);

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convoIds)
      .order("updated_at", { ascending: false });

    if (!convos) return;

    const detailed: ConversationWithDetails[] = await Promise.all(
      convos.map(async (c) => {
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", c.id);

        const memberIds = members?.map((m) => m.user_id) ?? [];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", memberIds);

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...c,
          members: profiles?.map((p) => ({ user_id: p.id, display_name: p.display_name })) ?? [],
          last_message: msgs?.[0] ?? undefined,
        };
      })
    );

    setConversations(detailed);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const getConversationName = (convo: ConversationWithDetails) => {
    if (convo.type === "group") return convo.name || "Group Chat";
    const other = convo.members.find((m) => m.user_id !== user?.id);
    return other?.display_name || "Unknown";
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const startDM = async () => {
    if (!user) return;
    setLoading(true);

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", newChatEmail)
      .limit(1)
      .maybeSingle();

    if (!targetProfile) {
      toast.error("User not found");
      setLoading(false);
      return;
    }

    if (targetProfile.id === user.id) {
      toast.error("Can't message yourself");
      setLoading(false);
      return;
    }

    // Check existing DM
    const existing = conversations.find(
      (c) =>
        c.type === "dm" &&
        c.members.length === 2 &&
        c.members.some((m) => m.user_id === targetProfile.id)
    );

    if (existing) {
      onSelectConversation(existing.id);
      setDialogOpen(false);
      setNewChatEmail("");
      setLoading(false);
      return;
    }

    const { data: convo, error } = await supabase
      .from("conversations")
      .insert({ type: "dm" as const })
      .select()
      .single();

    if (error || !convo) {
      toast.error("Failed to create conversation");
      setLoading(false);
      return;
    }

    await supabase.from("conversation_members").insert([
      { conversation_id: convo.id, user_id: user.id },
      { conversation_id: convo.id, user_id: targetProfile.id },
    ]);

    await fetchConversations();
    onSelectConversation(convo.id);
    setDialogOpen(false);
    setNewChatEmail("");
    setLoading(false);
  };

  const startGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setLoading(true);

    const { data: convo, error } = await supabase
      .from("conversations")
      .insert({ type: "group" as const, name: newGroupName.trim() })
      .select()
      .single();

    if (error || !convo) {
      toast.error("Failed to create group");
      setLoading(false);
      return;
    }

    await supabase.from("conversation_members").insert({
      conversation_id: convo.id,
      user_id: user.id,
    });

    await fetchConversations();
    onSelectConversation(convo.id);
    setDialogOpen(false);
    setNewGroupName("");
    setLoading(false);
  };

  const filtered = conversations.filter((c) =>
    getConversationName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Chats</h1>
        <div className="flex gap-1">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setDialogType("dm")}>
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dialogType === "dm" ? "New Message" : "New Group"}</DialogTitle>
              </DialogHeader>
              {dialogType === "dm" ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Search user by name..."
                    value={newChatEmail}
                    onChange={(e) => setNewChatEmail(e.target.value)}
                  />
                  <Button onClick={startDM} disabled={loading || !newChatEmail} className="w-full">
                    Start Chat
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <Button onClick={startGroup} disabled={loading || !newGroupName} className="w-full">
                    Create Group
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant={dialogType === "dm" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDialogType("dm")}
                >
                  <MessageCircle className="mr-1 h-3 w-3" /> DM
                </Button>
                <Button
                  variant={dialogType === "group" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDialogType("group")}
                >
                  <Users className="mr-1 h-3 w-3" /> Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {filtered.map((convo) => (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              activeConversationId === convo.id ? "bg-muted" : ""
            }`}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs">
                {convo.type === "group" ? (
                  <Users className="h-4 w-4" />
                ) : (
                  getInitials(getConversationName(convo))
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{getConversationName(convo)}</p>
              {convo.last_message && (
                <p className="truncate text-xs text-muted-foreground">{convo.last_message.content}</p>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start one!
          </div>
        )}
      </ScrollArea>

      {/* User Footer */}
      <div className="flex items-center gap-3 border-t px-4 py-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {user?.email?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-sm">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
