import os
from typing import List, Dict
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.config import settings

class PineconeUploader:
    def __init__(self):
        # 1. Initialize Pinecone
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = self.pc.Index(settings.INDEX_NAME)
        self.namespace = settings.NAMESPACE
        
        # 2. Load the Embedding Model (Optimized for Memory)
        print(f"📦 Loading embedding model: {settings.EMBEDDING_MODEL}...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
        print("✅ Model loaded.")

    def upsert_chunks(self, chunks: List[Dict]):
        """
        Embeds chunks and uploads to Pinecone in batches.
        """
        if not chunks:
            return

        print(f"🧪 Embedding {len(chunks)} chunks...")
        
        # Extract texts to embed
        texts = [c["embedding_text"] for c in chunks]
        
        # Generate Embeddings
        embeddings = self.model.encode(texts, convert_to_numpy=True).tolist()
        
        # Prepare vectors for Pinecone
        vectors = []
        for i, chunk in enumerate(chunks):
            vectors.append({
                "id": chunk["id"],
                "values": embeddings[i],
                "metadata": chunk["metadata"]
            })
        
        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i : i + batch_size]
            self.index.upsert(vectors=batch, namespace=self.namespace)
            
        print(f"✅ Successfully upserted {len(vectors)} vectors to Pinecone.")
