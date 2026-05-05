import React, { useState, useRef, useEffect } from "react";
import { PlusCircle, MessageSquare, Scale, Settings, User, LogOut, Shield, Info, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  lastUpdated: number;
}

interface SidebarProps {
  className?: string;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSessionSelect: (sessionId: string) => void;
}

export function Sidebar({ 
  className, 
  sessions, 
  activeSessionId, 
  onNewSession, 
  onSessionSelect 
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col h-full", className)}>
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
          <Scale className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Nyaya-Pro
          </h1>
          <p className="text-xs text-white/50">Legal AI Assistant</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button 
          onClick={onNewSession}
          className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 transition-all duration-200 group"
        >
          <PlusCircle className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">New Session</span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">
          Recent Cases
        </div>
        
        {sessions.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-xs text-white/20">No active cases yet.</p>
          </div>
        ) : (
          sessions
            .sort((a, b) => b.lastUpdated - a.lastUpdated)
            .map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                  activeSessionId === session.id 
                    ? "bg-blue-500/10 text-blue-100 border border-blue-500/20" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <MessageSquare className={cn("w-4 h-4", activeSessionId === session.id ? "text-blue-400" : "text-white/40")} />
                <span className="text-sm truncate">{session.title}</span>
              </button>
            ))
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/5 space-y-4 relative" ref={settingsRef}>
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200",
              showSettings ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </div>
            <ChevronUp className={cn("w-4 h-4 transition-transform duration-200", showSettings ? "rotate-0" : "rotate-180")} />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2 w-full bg-[#16181D] border border-white/10 rounded-2xl shadow-2xl p-2 backdrop-blur-xl z-50"
              >
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 py-2">
                  Preferences
                </div>
                <Link href="/about" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors">
                  <Info className="w-4 h-4 text-blue-400" />
                  System Info
                </Link>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors text-left">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Privacy Rules
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Active Account</p>
                <p className="text-xs text-white/80 truncate font-medium">
                  {user.email}
                </p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all duration-200"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
