# Nyaya-Pro: Agentic Legal RAG Assistant ⚖️🤖

Nyaya-Pro is a high-performance, production-grade legal research assistant designed to navigate the complexities of the Indian Legal System. It leverages **Agentic Retrieval-Augmented Generation (RAG)** to provide precise, cited, and hallucination-free answers from multiple legal sources.

---

## 🚀 Overview
Nyaya-Pro transforms how legal professionals and citizens interact with the law. Instead of searching through thousands of pages of PDF documents, users can query a unified AI interface that understands context, identifies the relevant legal act, and retrieves the exact provision needed.

### Key Features
- **Multi-Source Intelligence**: Seamlessly queries the Constitution of India, BNS (Bharatiya Nyaya Sanhita), BNSS, and CPC.
- **Agentic Routing**: Uses a `LegalQueryClassifier` to determine the intent of a query and route it to the correct legal namespace.
- **Verified Citations**: Every answer includes "Verified Source" chips that link directly to the relevant Article or Section.
- **Premium UI/UX**: A modern, glassmorphic dark-mode interface built with Next.js, Tailwind CSS, and Framer Motion.
- **Cloud Persistence**: Real-time chat history synchronization across devices using Firebase Firestore.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Glassmorphic design principles.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth transitions and interactive elements.
- **Icons**: [Lucide React](https://lucide.dev/).
- **Auth & DB**: [Firebase](https://firebase.google.com/) (Authentication & Firestore).

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous Python).
- **LLM Engine**: [Groq](https://groq.com/) (Llama 3 / Mixtral) for ultra-fast inference.
- **Vector Database**: [Pinecone](https://www.pinecone.io/) for high-scale similarity search.
- **Embeddings**: `BAAI/bge-small-en-v1.5` (Local inference for privacy and speed).

---

## 🧠 Core Concepts: RAG & Vector DB

### What is RAG?
**Retrieval-Augmented Generation (RAG)** is an architecture used to optimize the output of a Large Language Model (LLM) by referencing an external, authoritative knowledge base before generating a response. 

**In Nyaya-Pro, RAG works as follows:**
1. **Retrieve**: When you ask a question, the system searches the legal database for the most relevant sections.
2. **Augment**: These sections are injected into the LLM's prompt as "ground truth" context.
3. **Generate**: The LLM synthesizes an answer based *only* on the provided context, ensuring legal accuracy and preventing hallucinations.

### Why use a Vector Database (Pinecone)?
Traditional databases search for exact keywords. Legal language is nuanced; a user might ask about "punishment for theft" while the law mentions "penalties for larceny."

**Vector Databases** solve this by:
- **Semantic Search**: Converting text into high-dimensional vectors (mathematical representations of meaning).
- **Namespace Isolation**: We use Pinecone namespaces (e.g., `bns`, `constitution`) to isolate different legal acts, allowing our Agentic Router to target specific laws with 100% precision.

---

## 🔧 Architecture & Optimization
- **Sliding Window Context**: The backend maintains a memory of the last 4 messages to ensure conversational continuity without overwhelming the LLM with token noise.
- **Query Classification**: Every query is first analyzed by a `LegalQueryClassifier`. If the user simply says "Hello," the system bypasses the expensive Vector Search entirely, responding instantly with zero latency.
- **Cross-Encoder Verification**: The system uses a cross-encoder to re-rank search results, ensuring that only the most mathematically relevant legal provisions are used to form the answer.

---

## 🚀 Deployment (Monorepo)

This project is designed to be deployed as a monorepo.

### Backend (Render)
1. **Root Directory**: `backend`
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
4. **Env Vars**: `GROQ_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`.

### Frontend (Vercel)
1. **Root Directory**: `frontend`
2. **Framework**: Next.js
3. **Env Vars**: `NEXT_PUBLIC_API_URL` (Points to Render URL), Firebase Config keys.

---

## 👨‍💻 Developer
**Mangesh Jha**  
Full Stack Developer & AI Architect  
- [GitHub](https://github.com/man101jha)
- [LinkedIn](https://www.linkedin.com/in/mangesh-jha/)
- [Portfolio](https://mangesh-jha.vercel.app/)

---

## 📜 License
This project is for educational and professional legal research assistance purposes. Always verify AI-generated legal advice with a certified legal professional.
