import React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export interface Source {
  article_number?: string;
  article_title?: string;
  text?: string;
  metadata?: {
    article_number?: string;
    article_title?: string;
    section_number?: string;
    section_title?: string;
    source_code?: string;
    category?: string;
    text?: string;
  };
}

interface SourcesListProps {
  sources: Source[];
  onSourceClick: (content: string) => void;
}

export function SourcesList({ sources, onSourceClick }: SourcesListProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 pt-4 border-t border-white/10"
    >
      <div className="flex items-center gap-2 mb-3 text-white/50">
        <BookOpen className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-wider font-bold">Verified Sources</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => {
          const meta = source.metadata || {};
          
          // Support both new (multi-source) and old (Constitution-only) metadata formats
          const code = meta.source_code || meta.category || "CONSTITUTION";
          const num = meta.section_number || meta.article_number || source.article_number || "";
          const title = meta.section_title || meta.article_title || source.article_title || "Provision";
          const text = meta.text || source.text || "";

          // Determine the correct prefix based on the legal code
          const shortPrefix = code === "CONSTITUTION" ? "Art." : "§";
          const longPrefix = code === "CONSTITUTION" ? "Article" : "Section";

          return (
            <div key={idx} className="group relative">
              <button 
                onClick={() => onSourceClick(`Explain ${longPrefix} ${num} of ${code} in detail.`)}
                className="relative overflow-hidden bg-white/5 border border-white/10 hover:border-blue-500/50 text-white/70 px-3 py-1.5 rounded-xl text-[11px] cursor-pointer transition-all duration-300 flex items-center gap-2 tracking-tight font-semibold hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-blue-500/5 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                <span className="text-blue-400 font-bold">[{code}]</span>
                <span className="text-white/80">{shortPrefix} {num}</span>
              </button>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-3 w-80 p-4 bg-[#0F1117] border border-white/10 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-50 backdrop-blur-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30">
                    <BookOpen className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wide">
                    {longPrefix} {num}
                  </div>
                </div>
                <div className="font-semibold text-white text-xs mb-2 leading-tight">
                  {title}
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed line-clamp-5 border-l-2 border-blue-500/30 pl-3">
                  {text}
                </p>
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-blue-400/70 font-medium">
                  Click to deep-dive into this provision →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
