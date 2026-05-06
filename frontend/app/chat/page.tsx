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
  const LOADING_MESSAGES = [
    "Initializing legal workspace...",
    "Consulting the Constitution...",
    "Scanning Bharatiya Nyaya Sanhita (BNS)...",
    "Loading procedural codes...",
    "Nyaya-Pro is preparing your answer...",
    "Verifying legal references..."
  ];

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // New state for pre-loading

  // Rotate loading messages
  useEffect(() => {
    if (!isInitializing) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isInitializing]);

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
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        
        // The very first line contains our metadata
        if (isFirstChunk && chunk.includes("__METADATA__:")) {
            const lines = chunk.split("\n");
            const metaLine = lines.find(l => l.startsWith("__METADATA__:"));
            if (metaLine) {
                try {
                    const metadata = JSON.parse(metaLine.replace("__METADATA__:", ""));
                    sources = metadata.sources;
                } catch (e) {
                    console.error("Metadata parse error", e);
                }
                // Keep everything else in the chunk as content (preserving newlines)
                chunk = lines.filter(l => !l.startsWith("__METADATA__:")).join("\n");
            }
            isFirstChunk = false;
        }

        fullContent += chunk;

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
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, { role: "assistant", content: "Connection Error. Please check backend." }]
      } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisionSend = async (message: string, base64: string) => {
    if (!activeSessionId || !user) return;

    // 1. Add User Message (Text + Image indicator)
    const userMsg: Message = { role: "user", content: `📸 [Image Attached] ${message}` };
    
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      lastUpdated: Date.now()
    } : s));
    
    setIsLoading(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiBaseUrl}/chat/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, image_base64: base64 }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Vision Error");

      // --- SIMULATED TYPING EFFECT ---
      const fullAnswer = data.answer;
      let displayedAnswer = "";
      
      const aiMsg: Message = {
        role: "assistant",
        content: "",
        sources: [],
      };

      // Add empty message first
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, aiMsg]
      } : s));

      // Type it out word by word for a "Human-like" feel
      const words = fullAnswer.split(" ");
      for (let i = 0; i < words.length; i++) {
        displayedAnswer += (i === 0 ? "" : " ") + words[i];
        
        // Update the last message in the session
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => 
            idx === s.messages.length - 1 ? { ...m, content: displayedAnswer } : m
          )
        } : s));

        // Random delay to make it look natural (10ms to 40ms)
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
      }

      // Final save to DB
      await setDoc(doc(db, "users", user.uid, "sessions", activeSessionId), {
        messages: [...messages, userMsg, { ...aiMsg, content: fullAnswer }],
        lastUpdated: Date.now()
      }, { merge: true });

    } catch (error) {
      console.error("Vision Error:", error);
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, { role: "assistant", content: "Vision Analysis failed. Check backend logs." }]
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
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[9999] bg-[#05070a] flex flex-col items-center justify-center backdrop-blur-3xl"
          >
            <div className="relative">
              {/* Outer Glows */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -inset-10 bg-blue-500/20 blur-[60px] rounded-full"
              />
              
              <motion.div className="relative flex flex-col items-center">
                {/* Brand Logo / Icon */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 p-[2px] shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-8">
                  <div className="w-full h-full rounded-[22px] bg-[#05070a] flex items-center justify-center">
                    <Scale className="w-10 h-10 text-blue-400" />
                  </div>
                </div>

                <div className="text-center h-16">
                  <motion.h2 className="text-2xl font-bold tracking-tight mb-2">Nyaya-Pro AI</motion.h2>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-blue-400/80 text-sm font-medium tracking-wide"
                    >
                      {LOADING_MESSAGES[loadingMsgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
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
          <ChatInput 
            onSend={handleSendMessage} 
            onVisionSend={handleVisionSend}
            disabled={isLoading} 
          />
        </div>
      </div>
    </ChatLayout>
    </div>
  );
}
