import React, { useState, useRef, useEffect } from "react";
import { BadgeCheck, MoreVertical, Menu, Shield, Settings, Info, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export function ChatHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/20 backdrop-blur-md shrink-0 relative z-50">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-white/90">Legal Assistant</h2>
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
            Secure Backend Live
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-white/50 relative" ref={menuRef}>
        <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-white/30 mr-2">
          <Shield className="w-3 h-3" />
          Encrypted
        </div>
        
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "p-2 rounded-xl transition-all duration-200",
            showMenu ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
          )}
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-48 bg-[#16181D] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 backdrop-blur-xl"
            >
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 py-2">
                Menu
              </div>
              <Link href="/about" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors">
                <Info className="w-4 h-4" />
                About Nyaya-Pro
              </Link>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white/70 hover:text-white transition-colors text-left">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="h-px bg-white/5 my-2 mx-2" />
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm text-red-400 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
