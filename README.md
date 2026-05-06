# ⚖️ Nyaya-Pro: Agentic Legal RAG Assistant (v2.0)

Nyaya-Pro is a production-grade, multimodal AI assistant designed to navigate the complexities of the Indian Legal System. Optimized for high-performance retrieval and low-memory environments, it provides instant, cited answers from the Constitution of India, Bharatiya Nyaya Sanhita (BNS), and more.

![Nyaya-Pro Dashboard](https://raw.githubusercontent.com/man101jha/nyaya-pro/main/preview.png)

## 🌟 Key Features

### 🎙️ Multimodal Intelligence
- **Voice Mode**: Real-time dictation with **Hinglish (Hindi + English)** support using the Web Speech API.
- **Vision Mode**: Analyze legal notices, contracts, and evidence photos directly via **Llama-4-Scout** multimodal processing.
- **Contextual Awareness**: Intelligent follow-up handling that distinguishes between new topics and deep-dives.

### 🔍 Advanced RAG Pipeline
- **Exact-Match Boosting**: Specialized regex-driven retrieval that prioritizes exact Article and Section numbers (e.g., "Art 75", "Sec 101").
- **Smart Query Rewriting**: Casual queries are transformed into formal legal terminology for higher Pinecone accuracy.
- **Legal Guardrails**: Vision analysis is strictly filtered to legal documents and evidence only.

### ⚡ Production Performance
- **Memory Optimized**: Runs on **512MB RAM** (Render Free Tier) using `all-MiniLM-L6-v2` (384-dim) embeddings.
- **CPU-Only Deployment**: Forced CPU-only PyTorch installation to reduce build size by over 2GB.
- **Lazy Initialization**: Smart warmup sequence that lazy-loads models only when the user enters the chat.
- **High-Fidelity Streaming**: Custom `TextDecoder` pipeline with a human-like typewriter effect.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: FastAPI (Python), Groq (Llama 3/4), Pinecone Vector DB.
- **Database**: Firebase Auth & Firestore for session management.
- **Models**: 
  - Text: `llama-3.3-70b-versatile`
  - Vision: `meta-llama/llama-4-scout-17b-16e-instruct`
  - Embeddings: `all-MiniLM-L6-v2` (CPU-Optimized)

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create a `.env` file in the backend:
```env
GROQ_API_KEY=your_key
PINECONE_API_KEY=your_key
INDEX_NAME=nyaya-pro
NAMESPACE=legal-data
```

## ⚖️ Legal Disclaimer
Nyaya-Pro AI provides information based on processed legal documents. It is an assistant, not a replacement for professional legal counsel. Always verify important constitutional references.

---
Built with ❤️ for the Indian Legal Community by [Mangesh Jha](https://github.com/man101jha)
