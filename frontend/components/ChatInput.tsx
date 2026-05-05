import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div className="p-4 bg-transparent w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto relative group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 group-focus-within:opacity-40 transition-opacity blur" />
        <div className="relative bg-[#0F1117] border border-white/10 rounded-2xl flex items-end gap-2 p-2 focus-within:border-white/20 transition-colors">
          
          <div className="p-2 text-white/40">
            <Sparkles className="w-5 h-5" />
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Ask Nyaya-Pro a constitutional question..."
            className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 resize-none outline-none py-2.5 max-h-[150px] overflow-y-auto text-sm"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl transition-all duration-200 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
      <div className="text-center mt-3 text-[10px] text-white/30">
        AI can make mistakes. Verify important constitutional references.
      </div>
    </div>
  );
}
