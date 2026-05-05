"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Scale } from "lucide-react";
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
  const [isInitializing, setIsInitializing] = useState(true); // New state for pre-loading

  // Pre-load AI models on mount
  useEffect(() => {
    const warmUpAI = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiBaseUrl}/warmup`);
        if (res.ok) console.log("✅ AI Pre-loaded");
      } catch (e) {
        console.error("Warmup failed", e);
      } finally {
        // Minimum 1.5s delay for the animation to look nice
        setTimeout(() => setIsInitializing(false), 1500);
      }
    };
    warmUpAI();
  }, []);
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
      const response = await fetch(`${apiBaseUrl}/chat/stream`, {
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
      if (!response.body) throw new Error("No response body");

      // Initialize AI Message in state
      const aiMsgId = Date.now().toString();
      const initialAiMsg: Message = {
        role: "assistant",
        content: "",
        sources: [],
      };

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, initialAiMsg]
      } : s));

      // Hide loading dots as soon as the stream starts
      setIsLoading(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let sources: any[] = [];
      let metadataFound = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Split chunk into lines to handle metadata vs tokens
        const lines = chunk.split("\n");
        let processedChunk = "";

        for (const line of lines) {
            if (line.startsWith("__METADATA__:")) {
                try {
                    const metadata = JSON.parse(line.replace("__METADATA__:", ""));
                    sources = metadata.sources;
                    metadataFound = true;
                } catch (e) {
                    console.error("Metadata parse error", e);
                }
            } else if (line) {
                // If it's not metadata, it's a token
                processedChunk += line + (lines.length > 1 ? "" : ""); // Keep tokens clean
            }
        }

        if (!chunk.startsWith("__METADATA__:")) {
            fullContent += chunk;
        }

        // Update UI state with new content
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => 
            idx === s.messages.length - 1 ? { ...m, content: fullContent, sources } : m
          )
        } : s));
      }

      // Final Save to Firestore
      const finalSession = {
        ...userUpdatedSession,
        messages: [...userUpdatedSession.messages, { role: "assistant", content: fullContent, sources } as Message],
        lastUpdated: Date.now()
      };
      await setDoc(doc(db, "users", user.uid, "sessions", activeSessionId), finalSession);

    } catch (error) {
      console.error("Error:", error);
      const errorMsg: Message = {
        role: "assistant",
        content: "I couldn't reach the backend. Please ensure the FastAPI server is running.",
      };
      
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, errorMsg]
      } : s));
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
    <div className="flex h-screen bg-[#05070a] text-white overflow-hidden font-outfit selection:bg-blue-500/30 w-full relative">
      {/* Smart Pre-loading Overlay */}
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[#05070a] flex flex-col items-center justify-center backdrop-blur-3xl"
          >
            <div className="relative">
              {/* Outer Glows */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -inset-10 bg-blue-500/20 blur-[60px] rounded-full"
              />
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                className="relative flex flex-col items-center"
              >
                {/* Brand Logo / Icon */}
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 p-[2px] shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-8">
                  <div className="w-full h-full rounded-[22px] bg-[#05070a] flex items-center justify-center">
                    <Scale className="w-12 h-12 text-blue-400" />
                  </div>
                </div>

                <div className="text-center">
                  <motion.h2 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
                  >
                    Nyaya-Pro AI
                  </motion.h2>
                  <p className="text-blue-400/60 text-sm font-medium tracking-widest uppercase">
                    Initializing Legal Workspace...
                  </p>
                </div>
              </motion.div>
            </div>
            
            {/* Minimal Progress Bar */}
            <div className="mt-12 w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
