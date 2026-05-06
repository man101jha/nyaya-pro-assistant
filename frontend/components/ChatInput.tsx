import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, MicOff, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceToText } from "../hooks/useVoiceToText";

interface ChatInputProps {
  onSend: (message: string) => void;
  onVisionSend?: (message: string, base64: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onVisionSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Hook
  const { isListening, transcript, lang, setLang, startListening, stopListening } = useVoiceToText();

  // Sync Voice Transcript to Input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large. Please use an image under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (disabled) return;

    if (selectedImage && onVisionSend) {
      const base64Data = selectedImage.split(",")[1];
      onVisionSend(input || "Analyze this legal document.", base64Data);
      setSelectedImage(null);
      setInput("");
    } else if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const toggleMic = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 w-full">
      {/* Image Preview Thumbnail */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-24 left-4 p-2 bg-[#0F1117] border border-white/10 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/5">
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-0 right-0 bg-black/60 p-1 text-white hover:bg-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <div className="pr-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Image Attached</p>
              <p className="text-xs text-white/50">Ready for Vision Analysis</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative bg-[#0F1117]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden focus-within:border-blue-500/50 transition-all group">
        <div className="flex items-end gap-2 p-3 min-h-[56px]">
          
          {/* Action Buttons Group */}
          <div className="flex items-center gap-1 mb-1">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en-IN' ? 'hi-IN' : 'en-IN')}
              className="text-[10px] font-black px-2 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase"
            >
              {lang === 'en-IN' ? 'EN' : 'HI'}
            </button>

            {/* Voice Mic */}
            <button
              type="button"
              onClick={toggleMic}
              disabled={disabled}
              className={`p-2.5 rounded-2xl transition-all ${
                isListening 
                  ? 'bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Image Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
            >
              <ImageIcon size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isListening ? "Listening..." : selectedImage ? "Ask about this image..." : "Ask Nyaya-Pro a legal question..."}
            className="flex-1 bg-transparent text-white/90 placeholder:text-white/20 resize-none outline-none py-2 max-h-[150px] overflow-y-auto text-sm leading-relaxed"
            rows={1}
            disabled={disabled}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || disabled}
            className={`p-2.5 rounded-2xl transition-all mb-0.5 ${
              input.trim() || selectedImage
                ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-100 hover:scale-105 active:scale-95"
                : "text-white/10 scale-95"
            }`}
          >
            <Send size={18} />
          </button>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles size={10} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] text-white/30 font-medium tracking-wide">
              {isListening ? "TRANSCRIBING VOICE" : selectedImage ? "IMAGE SELECTED" : "SECURE LEGAL AI"}
            </span>
          </div>
          <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">
            v2.0 Multimodal
          </span>
        </div>
      </div>
    </div>
  );
}
