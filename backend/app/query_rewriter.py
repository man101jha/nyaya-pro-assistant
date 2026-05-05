from groq import Groq
from app.config import settings

class LegalQueryRewriter:
    """
     Transforms vague, colloquial user queries into precise legal search queries
    using formal Indian legal terminology. This dramatically improves vector
    retrieval quality by aligning query vocabulary with how laws are written.

    """
    SYSTEM_PROMPT = """You are a legal query transformation expert specializing in Indian law.
Your job is to rewrite a user's casual question into a precise legal search query.

Definitions:
- BNS = Bharatiya Nyaya Sanhita (criminal offences/punishments)
- BNSS = Bharatiya Nagarik Suraksha Sanhita (criminal procedure/arrest/bail)
- CPC = Code of Civil Procedure (civil suits/courts)

Rules:
- Use correct Indian legal terminology (e.g. "culpable homicide", "cognizable offence", "res judicata", "decree", "bail", "FIR")
- If the query mentions BNS, BNSS, or CPC, KEEP the exact abbreviation or expand to the correct definition above. Do NOT invent other expansions.
- If the query is about crime/punishment, use BNS terminology
- If the query is about procedure/arrest/bail/trial, use BNSS terminology  
- If the query is about civil suits/courts/decrees, use CPC terminology
- If the query is about rights/government/constitution, use Constitutional terminology
- Preserve the original intent completely — do NOT add assumptions or extra topics
- Output ONLY the rewritten query string, nothing else, no explanation
- Keep it under 80 words"""
    def __init__(self):
      self.client=Groq(api_key=settings.GROQ_API_KEY)
      self.model=settings.LLM_MODEL

    def rewrite(self, query: str) -> str:
        """
        Takes a raw user query (vague/colloquial) and returns a formal
        legal search query aligned with how Indian laws are written.

        Falls back to the original query if the LLM call fails,
        so retrieval always continues even if rewriting errors out.

        Args:
            query: raw user input e.g. "what is rule for murder punishment"

        Returns:
            rewritten: e.g. "Legal punishment for culpable homicide amounting
                        to murder under Bharatiya Nyaya Sanhita, including
                        death penalty and life imprisonment provisions"
        """
        if not query or not query.strip():
            return query  # nothing to rewrite

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user",   "content": f"Rewrite this query: {query}"}
                ],
                model=self.model,
                temperature=0.1,   # low temp = deterministic, focused output
                max_tokens=150,    # rewritten query should be short
            )
            rewritten = response.choices[0].message.content.strip()

            # Validate: if LLM returned empty or too short, use original
            if not rewritten or len(rewritten) < 5:
                return query

            print(f"🔍 Query rewritten:\n   Original : {query}\n   Rewritten: {rewritten}\n")
            return rewritten

        except Exception as e:
            # Never let a rewrite failure break the retrieval pipeline
            print(f"⚠️  Query rewrite failed ({e}), using original query.")
            return query
