"""
Nyaya-Pro — Multi-Source Legal Retriever
==========================================
Pipeline: condense → rewrite → classify → embed → Pinecone filter → rerank → deduplicate
"""
from groq import Groq
from app.config import settings
from app.query_rewriter import LegalQueryRewriter
from app.classifier import LegalQueryClassifier
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from flashrank import Ranker, RerankRequest
from typing import List, Dict, Any


class LegalRetriever:

    def __init__(self):
        self.client     = Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = settings.LLM_MODEL

        print("Loading embedding model...")
        self.embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)

        pc         = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = pc.Index(settings.INDEX_NAME)

        print("Loading re-ranker...")
        self.ranker = Ranker()

        self.rewriter   = LegalQueryRewriter()
        self.classifier = LegalQueryClassifier()
        print("✅ LegalRetriever ready.")

    def condense_query(self, query: str, history: List[Any] = None) -> str:
        if not history or len(history) == 0:
            return query
        chat_context = ""
        for msg in history[-3:]:
            chat_context += f"{msg.role.upper()}: {msg.content}\n"
        prompt = (
            f"Rewrite this follow-up as a complete standalone legal question by resolving any pronouns or references using the chat history.\n"
            f"Do NOT add extra details or assume facts that are not explicitly in the follow-up.\n\n"
            f"History:\n{chat_context}\nFollow-up: {query}\n\nOutput ONLY the rewritten question."
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
            print(f"⚠️  condense_query failed ({e}), using original.")
            return query

    def rerank(self, original_query: str, matches: List[Dict]) -> List[Dict]:
        if not matches:
            return []
        passages = [
            {"id": m["id"], "text": m["metadata"].get("text", ""), "metadata": m["metadata"]}
            for m in matches
            if m["metadata"].get("text", "").strip()
        ]
        if not passages:
            return []
        results = self.ranker.rerank(RerankRequest(query=original_query, passages=passages))
        # Remove strict threshold to avoid dropping valid results for command-like queries.
        # Just return the re-ranked list, sorted by score.
        return results

    def _deduplicate(self, results: List[Dict]) -> List[Dict]:
        seen, unique = set(), []
        for r in results:
            snippet = r.get("metadata", {}).get("text", "")[:80].strip()
            if snippet and snippet not in seen:
                seen.add(snippet)
                r["score"] = float(r.get("score", 0))
                unique.append(r)
        return unique

    def retrieve(self, raw_query: str, history: List[Any] = None, top_k: int = 50) -> List[Dict]:
        print(f"\n{'─'*50}\n📥 Query: {raw_query}")

        condensed    = self.condense_query(raw_query, history)
        rewritten    = self.rewriter.rewrite(condensed)
        source_codes = self.classifier.classify(rewritten)
        
        if not source_codes:
            print("👋 Greeting/Non-legal query detected. Bypassing retrieval.")
            return []

        query_vector = self.embed_model.encode(rewritten).tolist()

        raw_results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=settings.NAMESPACE,
            filter={"source_code": {"$in": source_codes}}
        )
        matches = raw_results.get("matches", [])
        print(f"📊 Pinecone: {len(matches)} candidates from {source_codes}")

        if not matches:
            print("⚠️  No matches found. Retrying without filter...")
            raw_results = self.index.query(
                vector=query_vector, top_k=top_k,
                include_metadata=True, namespace=settings.NAMESPACE,
            )
            matches = raw_results.get("matches", [])

        reranked = self.rerank(raw_query, matches)
        final    = self._deduplicate(reranked)[:8]

        print(f"✅ Returning {len(final)} results\n{'─'*50}\n")
        return final
