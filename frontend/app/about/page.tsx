"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Shield, BrainCircuit, ExternalLink, User } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#090A0F] text-white flex flex-col relative font-sans">
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[128px] opacity-30" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />

      <div className="p-8 relative z-10 max-w-5xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-16"
        >
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">About Nyaya-Pro</h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Nyaya-Pro is a next-generation AI legal assistant built to democratize access to Indian Law.
              By leveraging advanced Retrieval-Augmented Generation (RAG), it parses complex legal codes into
              understandable, actionable, and hallucination-free insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <BookOpen className="w-8 h-8 text-blue-400 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Multi-Source Intelligence</h3>
              <p className="text-white/50 leading-relaxed">
                Trained on the Constitution of India, BNS (Bharatiya Nyaya Sanhita), BNSS, and CPC. 
                Our AI cross-references multiple legal domains instantly to provide comprehensive answers.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <BrainCircuit className="w-8 h-8 text-purple-400 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Agentic Routing</h3>
              <p className="text-white/50 leading-relaxed">
                Instead of a blind search, our AI explicitly classifies your question and routes it 
                to the precise legal act required, drastically reducing noise and improving accuracy.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-emerald-400 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Zero Hallucinations</h3>
              <p className="text-white/50 leading-relaxed">
                Nyaya-Pro uses semantic cross-encoders to mathematically verify that the generated answer 
                is perfectly grounded in the retrieved legal text. If it doesn't know, it won't guess.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Meet the Developer</h2>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                <User className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">Mangesh Jha</h3>
                  <p className="text-white/50">Full Stack Developer & AI Enthusiast</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <a 
                    href="https://github.com/man101jha" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/mangesh-jha/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077B5]/10 hover:bg-[#0077B5]/20 border border-[#0077B5]/20 text-[#0077B5] transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    LinkedIn
                  </a>
                  <a 
                    href="https://mangesh-jha.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Portfolio
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl p-8 md:p-12 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Start your legal research today.</h2>
            <p className="text-white/60 mb-8 max-w-2xl">
              Create a free account to access the full power of the Nyaya-Pro Agentic Legal RAG system.
              Save your case history, search across multiple domains, and get precise citations.
            </p>
            <Link href="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-black font-medium transition-transform hover:scale-105">
              Create Free Account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
