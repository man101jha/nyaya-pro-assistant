"""
Nyaya-Pro — Multi-Source Legal Retriever
==========================================
Pipeline: condense → rewrite → classify → embed → Pinecone filter → rerank → deduplicate
"""
from groq import Groq
from app.config import settings
from app.query_rewriter import LegalQueryRewriter
from app.classifier import LegalQueryClassifier
from pinecone import Pinecone
from typing import List, Dict, Any


class LegalRetriever:

    def __init__(self):
        self.client     = Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = settings.LLM_MODEL

        # Only embedding model is lazy-loaded (saves memory)
        self._embed_model = None

        pc         = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = pc.Index(settings.INDEX_NAME)

        self.rewriter   = LegalQueryRewriter()
        self.classifier = LegalQueryClassifier()
        print("✅ LegalRetriever initialized (Free-Tier Optimized).")

    @property
    def embed_model(self):
        if self._embed_model is None:
            print("📦 Loading embedding model (Lazy)...")
            from sentence_transformers import SentenceTransformer
            self._embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._embed_model

    def condense_query(self, query: str, history: List[Any] = None) -> str:
        if not history or len(history) == 0:
            return query
        
        # If the query is very short or a greeting, don't condense
        if len(query.split()) < 3:
            return query

        chat_context = ""
        for msg in history[-3:]:
            chat_context += f"{msg.role.upper()}: {msg.content}\n"
        
        prompt = (
            f"Given the chat history and a new follow-up question, determine if the follow-up is related to the history.\n"
            f"If it is RELATED, rewrite it as a standalone legal question.\n"
            f"If it is UNRELATED (a new topic or a greeting), return the follow-up exactly as is.\n\n"
            f"History:\n{chat_context}\nFollow-up: {query}\n\nOutput ONLY the result."
        )
        try:
            resp = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model_name,
                temperature=0.1,
                max_tokens=120,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            return query

    def _deduplicate(self, matches: List[Any]) -> List[Dict]:
        seen, unique = set(), []
        for m in matches:
            # Handle both dictionary and object formats from Pinecone
            if isinstance(m, dict):
                meta = m.get("metadata", {})
                score = m.get("score", 0)
                mid = m.get("id", "")
            else:
                meta = getattr(m, "metadata", {})
                score = getattr(m, "score", 0)
                mid = getattr(m, "id", "")

            snippet = meta.get("text", "")[:80].strip()
            if snippet and snippet not in seen:
                seen.add(snippet)
                # Ensure we return a PLAIN DICTIONARY to prevent FastAPI RecursionError
                unique.append({
                    "id": mid,
                    "score": float(score) if score else 0.0,
                    "metadata": dict(meta)
                })
        return unique

    def retrieve(self, raw_query: str, history: List[Any] = None, top_k: int = 15) -> List[Dict]:
        print(f"\n{'─'*50}\n📥 Query: {raw_query}")

        condensed    = self.condense_query(raw_query, history)
        rewritten    = self.rewriter.rewrite(condensed)
        source_codes = self.classifier.classify(rewritten)
        
        if not source_codes:
            print("👋 Greeting/Non-legal query detected. Bypassing retrieval.")
            return []

        # --- EXACT MATCH BOOSTING ---
        # Detect patterns like "Article 75" or "Section 101"
        import re
        id_match = re.search(r'(?:article|section|art|sec)\.?\s*(\d+[a-z]?)', raw_query.lower())
        exact_id = id_match.group(1).upper() if id_match else None

        query_vector = self.embed_model.encode(rewritten).tolist()
        
        # Prepare filter
        p_filter = {"source_code": {"$in": source_codes}}
        
        # 1. Semantic Search
        raw_results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=settings.NAMESPACE,
            filter=p_filter
        )
        matches = raw_results.get("matches", [])

        # 2. Exact Match Check (If user specified a number)
        if exact_id:
            print(f"🎯 Detected request for Section/Article: {exact_id}. Performing keyword boost...")
            exact_results = self.index.query(
                vector=[0.0] * settings.EMBEDDING_DIM, # dummy vector for metadata-only search
                top_k=5,
                include_metadata=True,
                namespace=settings.NAMESPACE,
                filter={
                    "source_code": {"$in": source_codes},
                    "section_number": exact_id
                }
            )
            exact_matches = exact_results.get("matches", [])
            # Prioritize exact matches at the top
            matches = exact_matches + [m for m in matches if m.get("id") not in [em.get("id") for em in exact_matches]]

        print(f"📊 Pinecone: {len(matches)} candidates from {source_codes}")

        if not matches:
            print("⚠️  No matches found. Retrying without filter...")
            raw_results = self.index.query(
                vector=query_vector, top_k=top_k,
                include_metadata=True, namespace=settings.NAMESPACE,
            )
            matches = raw_results.get("matches", [])

        # Deduplicate and take top 8
        final = self._deduplicate(matches)[:8]

        print(f"✅ Returning {len(final)} results\n{'─'*50}\n")
        return final
