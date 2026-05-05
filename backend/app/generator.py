"""
Nyaya-Pro — Context-Aware Legal Answer Generator
==================================================
Dynamically adapts system prompt based on which legal sources
are present in the retrieved context. Generates grounded answers
with proper multi-source inline citations.
"""
from groq import Groq
from app.config import settings
from typing import List, Dict, Any


class LegalGenerator:

    SOURCE_LABELS = {
        "BNS":          "BNS (Bharatiya Nyaya Sanhita 2023)",
        "BNSS":         "BNSS (Bharatiya Nagarik Suraksha Sanhita 2023)",
        "CPC":          "CPC (Code of Civil Procedure 1908)",
        "CONSTITUTION": "Constitution of India 1950",
    }

    CITATION_PREFIX = {
        "BNS":          "BNS §",
        "BNSS":         "BNSS §",
        "CPC":          "CPC §",
        "CONSTITUTION": "Art.",
    }

    def __init__(self):
        self.client     = Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = settings.LLM_MODEL

    def _build_system_prompt(self, source_codes: List[str]) -> str:
        """
        Builds a dynamic system prompt based on the exact sources retrieved.
        Only mentions citation formats for codes actually present in context,
        preventing the LLM from hallucinating citations from absent sources.
        """
        base = """You are 'Nyaya-Pro', an expert AI legal assistant for Indian law.
Answer based EXCLUSIVELY on the legal sections provided — do not use outside knowledge.

Citation rules (MANDATORY):
- Cite inline after every legal point: (BNS §103), (BNSS §35), (CPC §9), (Art.21)
- If multiple sources apply, explain how they work together
- If the sections don't answer the question, say so clearly
- If the user's input is just a greeting (e.g., 'hi', 'hello'), IGNORE the provided legal sections entirely. Just reply politely and ask how you can help them with Indian law.
- USE MARKDOWN FORMATTING: Use **bold** for important legal terms, conditions, rights, and section names (e.g. **Right to Equality**, **cognizable offence**, **24 hours**).
- Use bullet points and headers (##) to structure your response beautifully.
- Write in plain English with short paragraphs or numbered points."""

        if source_codes:
            labels = [self.SOURCE_LABELS[c] for c in source_codes if c in self.SOURCE_LABELS]
            base += "\n\nActive sources:\n" + "\n".join(f"  • {l}" for l in labels)

        prefixes = [self.CITATION_PREFIX[c] for c in source_codes if c in self.CITATION_PREFIX]
        if prefixes:
            base += "\n\nCite using: " + ", ".join(f"{p}[number]" for p in prefixes)

        return base

    def _build_context(self, sources: List[Dict]) -> tuple:
        """
        Converts retrieved chunks into a formatted context block for the LLM.
        Returns (context_string, list_of_source_codes_present).
        """
        context      = ""
        source_codes = []

        for i, s in enumerate(sources):
            meta  = s.get("metadata", {})
            code  = meta.get("source_code", "UNKNOWN")
            sec   = meta.get("section_number", "?")
            title = meta.get("section_title", "")
            chap  = meta.get("chapter_title", "")
            text  = meta.get("text", "").strip()

            if not text:
                continue

            if code not in source_codes:
                source_codes.append(code)

            prefix     = self.CITATION_PREFIX.get(code, f"{code} §")
            title_part = f" — {title}" if title else ""
            chap_part  = f" | {chap}"  if chap  else ""

            context += (
                f"[{prefix}{sec}{title_part}{chap_part}]\n"
                f"{text}\n\n"
            )

        return context.strip(), source_codes

    def generate_answer(
        self,
        query: str,
        sources: List[Dict],
        history: List[Any] = None
    ) -> str:
        """
        Generates a grounded legal answer with inline citations.

        Args:
            query:   original raw user question
            sources: retrieved + re-ranked chunks from LegalRetriever
            history: conversation history for multi-turn context

        Returns:
            Plain-English legal answer string with inline citations.
        """
        if not sources:
            context, source_codes = "", []
        else:
            context, source_codes = self._build_context(sources)
            
        system_prompt = self._build_system_prompt(source_codes)

        messages = [{"role": "system", "content": system_prompt}]

        # Last 4 history turns for multi-turn awareness
        if history:
            for msg in history[-4:]:
                messages.append({"role": msg.role, "content": msg.content})

        messages.append({
            "role": "user",
            "content": f"Legal Sections:\n{context}\n\nQuestion: {query}"
        })

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model_name,
                temperature=0.1,
                max_tokens=1500,
                frequency_penalty=0.3,
            )
            return completion.choices[0].message.content.strip()

        except Exception as e:
            return f"Error generating answer: {str(e)}"
