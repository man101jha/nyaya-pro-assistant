"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { ChatLayout } from "@/components/ChatLayout";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatWindow, Message } from "@/components/ChatWindow";
import { ChatInput } from "@/components/ChatInput";
import { ChatSession } from "@/components/Sidebar";

// Empty session starts with no messages to trigger suggestion chips
const INITIAL_MESSAGES: Message[] = [];

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleNewSession = useCallback(async () => {
    if (!user) return;
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Case",
      messages: INITIAL_MESSAGES,
      lastUpdated: Date.now()
    };
    
    // Save to Firestore
    await setDoc(doc(db, "users", user.uid, "sessions", newId), newSession);
    setActiveSessionId(newId);
  }, [user]);

  // Load from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "sessions"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSessions: ChatSession[] = [];
      snapshot.forEach((doc) => {
        fetchedSessions.push(doc.data() as ChatSession);
      });
      
      setSessions(fetchedSessions);

      // Initialize a new session if none exist
      if (fetchedSessions.length === 0) {
        handleNewSession();
      } else if (!activeSessionId) {
        // Auto-select the most recent session
        setActiveSessionId(fetchedSessions[0].id);
      }
    });

    return () => unsubscribe();
  }, [user, activeSessionId, handleNewSession]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || INITIAL_MESSAGES;

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId || !user) return;

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    if (!sessionToUpdate) return;

    // 1. Add User Message
    const userMsg: Message = { role: "user", content };
    const isFirstUserMsg = sessionToUpdate.messages.length <= 1;
    const newTitle = isFirstUserMsg ? (content.length > 30 ? content.substring(0, 30) + "..." : content) : sessionToUpdate.title;
    
    const userUpdatedSession = {
      ...sessionToUpdate,
      title: newTitle,
      messages: [...sessionToUpdate.messages, userMsg],
      lastUpdated: Date.now()
    };

    // Optimistic UI Update & DB Save
    setSessions(prev => prev.map(s => s.id === activeSessionId ? userUpdatedSession : s));
    await setDoc(doc(db, "users", user.uid, "sessions", activeSessionId), userUpdatedSession);
    
    setIsLoading(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content,
          history: userUpdatedSession.messages.slice(-4).map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) throw new Error("Backend response error");
      const data = await response.json();

      // 2. Add AI Message
      const aiMsg: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };

      const finalSession = {
        ...userUpdatedSession,
        messages: [...userUpdatedSession.messages, aiMsg],
        lastUpdated: Date.now()
      };

      // Optimistic UI Update & DB Save
      setSessions(prev => prev.map(s => s.id === activeSessionId ? finalSession : s));
      await setDoc(doc(db, "users", user.uid, "sessions", activeSessionId), finalSession);

    } catch (error) {
      console.error("Error:", error);
      const errorMsg: Message = {
        role: "assistant",
        content: "I couldn't reach the backend. Please ensure the FastAPI server is running.",
      };
      
      const errorSession = {
        ...userUpdatedSession,
        messages: [...userUpdatedSession.messages, errorMsg],
        lastUpdated: Date.now()
      };
      
      setSessions(prev => prev.map(s => s.id === activeSessionId ? errorSession : s));
      await setDoc(doc(db, "users", user.uid, "sessions", activeSessionId), errorSession);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="h-screen w-full bg-[#090A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ChatLayout 
      sessions={sessions}
      activeSessionId={activeSessionId}
      onNewSession={() => {
        handleNewSession();
        setIsSidebarOpen(false);
      }}
      onSessionSelect={(id) => {
        handleSessionSelect(id);
        setIsSidebarOpen(false);
      }}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      <ChatHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex-1 overflow-hidden relative flex flex-col z-20">
            <ChatWindow 
              messages={messages} 
              isLoading={isLoading} 
              onSourceClick={handleSendMessage}
              onSend={handleSendMessage}
            />
        <div className="bg-gradient-to-t from-[#090A0F] via-[#090A0F]/80 to-transparent pt-6 pb-2">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </ChatLayout>
  );
}
