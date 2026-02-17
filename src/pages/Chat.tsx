import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessagePanel } from "@/components/chat/MessagePanel";
import { useIsMobile } from "@/hooks/use-mobile";

const Chat = () => {
  const { user, loading } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const showSidebar = !isMobile || !activeConversationId;
  const showMessages = !isMobile || activeConversationId;

  return (
    <div className="flex h-screen bg-background">
      {showSidebar && (
        <div className={`${isMobile ? "w-full" : "w-80"} flex-shrink-0`}>
          <ChatSidebar
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
          />
        </div>
      )}
      {showMessages && (
        <div className="flex-1">
          {isMobile && activeConversationId && (
            <button
              onClick={() => setActiveConversationId(null)}
              className="w-full border-b px-4 py-2 text-left text-sm text-primary hover:bg-muted"
            >
              ← Back to chats
            </button>
          )}
          <MessagePanel conversationId={activeConversationId} />
        </div>
      )}
    </div>
  );
};

export default Chat;
