import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TypingText } from "./TypingText";
import { SourcesList, Source } from "./SourcesList";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  onSourceClick: (content: string) => void;
  animate?: boolean;
}

export function MessageBubble({ role, content, sources, onSourceClick, animate = false }: MessageBubbleProps) {
  const [isTypingComplete, setIsTypingComplete] = useState(!animate);
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[85%] md:max-w-[80%] rounded-3xl p-6 transition-all duration-300",
          isUser
            ? "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-white rounded-tr-sm shadow-[0_10px_30px_rgba(59,130,246,0.2)] border border-white/10"
            : "bg-white/5 border border-white/10 text-white/90 backdrop-blur-xl rounded-tl-sm shadow-2xl hover:bg-white/[0.07]"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 opacity-80">Nyaya-Pro AI</span>
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
          </div>
        )}
        <div className="text-sm markdown-body">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-blue-100" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4 text-blue-50" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-4 text-blue-50" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3 text-blue-50" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && (
          <SourcesList sources={sources} onSourceClick={onSourceClick} />
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-white/70" />
        </div>
      )}
    </motion.div>
  );
}
