import React, { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { Scale, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export interface Source {
  article_number?: string;
  article_title?: string;
  text: string;
  metadata?: {
    article_number?: string;
    article_title?: string;
    text?: string;
  };
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSourceClick: (content: string) => void;
  onSend: (content: string) => void;
}

const SUGGESTIONS = [
  { label: "Fundamental Rights", query: "What are the Fundamental Rights in India?" },
  { label: "BNS vs IPC", query: "Explain the main differences between BNS and IPC." },
  { label: "Civil Lawsuit", query: "How to file a civil lawsuit in India under CPC?" },
];

export function ChatWindow({ messages, isLoading, onSourceClick, onSend }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth no-scrollbar" ref={scrollRef}>
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(59,130,246,0.15)]"
          >
            <Scale className="w-10 h-10 text-blue-400" />
          </motion.div>
          <motion.h3 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-white mb-4 tracking-tight"
          >
            Hello, how can I help you today?
          </motion.h3>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 max-w-md mb-12 text-lg font-medium leading-relaxed"
          >
            I am your advanced AI legal assistant. Ask me anything about the Indian legal system.
          </motion.p>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl"
          >
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => onSend(s.query)}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300 text-left relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-widest">{s.label}</div>
                <div className="text-sm text-white/60 group-hover:text-white/90 transition-colors leading-relaxed">{s.query}</div>
              </button>
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
              onSourceClick={onSourceClick}
              // Only animate the very last assistant message if it just arrived
              animate={msg.role === "assistant" && idx === messages.length - 1}
            />
          ))}

          {isLoading && (
            <div className="flex w-full gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-md flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-blue-400 rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
