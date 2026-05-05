"""
Nyaya-Pro — Centralized Configuration
======================================
Loads environment variables and defines project-wide constants.
"""

from dataclasses import field
import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load .env BEFORE anything reads from the environment
load_dotenv()


@dataclass
class Settings:
    """All project settings in one place."""

    # API Keys (from .env)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")

    # Pinecone
    INDEX_NAME: str = "nyaya-pro"
    NAMESPACE: str = "legal_corpus"
    SOURCE_CODES: list = field(default_factory=lambda: ["CONSTITUTION", "BNS", "BNSS", "CPC"])
    JSON_FILES: dict = field(default_factory=lambda: {
    "CONSTITUTION": "constitution_chunks.json",
    "BNS":          "bns_chunks.json",
    "BNSS":         "bnss_chunks.json",
    "CPC":          "cpc_chunks.json",
    })
    JSON_DATA_DIR: str = "data"

    # Embedding Model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # LLM
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE: float = 0.1

    # Chunking
    CHILD_CHUNK_SIZE: int = 800        # tokens per child chunk
    CHILD_CHUNK_OVERLAP: int = 150  
    MAX_SECTION_CHARS: int = 800


# Singleton — import this everywhere
settings = Settings()
