import React from "react";
import { Sidebar, ChatSession } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";

interface ChatLayoutProps {
  children: React.ReactNode;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSessionSelect: (sessionId: string) => void;
  isSidebarOpen?: boolean;
  onCloseSidebar?: () => void;
}

export function ChatLayout({ 
  children, 
  sessions, 
  activeSessionId, 
  onNewSession, 
  onSessionSelect,
  isSidebarOpen = false,
  onCloseSidebar
}: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-[#090A0F] text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[128px] opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[128px] opacity-50" />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block z-20 h-full relative shadow-2xl shadow-blue-900/10 border-r border-white/5">
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewSession={onNewSession}
          onSessionSelect={onSessionSelect}
        />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-2xl border-r border-white/10"
            >
              <Sidebar 
                sessions={sessions}
                activeSessionId={activeSessionId}
                onNewSession={onNewSession}
                onSessionSelect={onSessionSelect}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 h-full relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
        {children}
      </main>
    </div>
  );
}
