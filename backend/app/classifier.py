"""
Nyaya-Pro — Legal Query Classifier
=====================================
Routes a legal query to the relevant source codes (BNS, BNSS, CPC, CONSTITUTION).
Prevents irrelevant sources from polluting search results.
"""
import json
from groq import Groq
from app.config import settings


class LegalQueryClassifier:

    DOMAIN_DESCRIPTIONS = {
        "BNS": (
            "Bharatiya Nyaya Sanhita 2023 — criminal offences and punishments. "
            "Covers: murder, theft, assault, rape, fraud, cheating, dacoity, "
            "sedition, defamation, criminal intimidation. Replaces the old IPC."
        ),
        "BNSS": (
            "Bharatiya Nagarik Suraksha Sanhita 2023 — criminal procedure. "
            "Covers: FIR registration, police powers, arrest with/without warrant, "
            "bail, remand, cognizable/non-cognizable offences, trials, evidence, "
            "chargesheet, summons. Replaces the old CrPC."
        ),
        "CPC": (
            "Code of Civil Procedure 1908 — civil court procedure. "
            "Covers: civil suits, plaint, written statement, summons, injunction, "
            "decree, execution, appeal, revision, property disputes, civil rights enforcement."
        ),
        "CONSTITUTION": (
            "Constitution of India 1950 — supreme law of the land. "
            "Covers: fundamental rights (Articles 12-35), directive principles, "
            "citizenship, Parliament, President, judiciary, federalism, elections, "
            "emergency provisions, constitutional amendments."
        ),
    }

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model  = settings.LLM_MODEL

    def _build_prompt(self, query: str) -> str:
        domains_text = "\n".join(
            f"- {code}: {desc}"
            for code, desc in self.DOMAIN_DESCRIPTIONS.items()
        )
        return f"""You are a legal routing expert for Indian law.
Given a legal query, return ONLY the JSON array of relevant legal codes to search.

Available legal codes:
{domains_text}

Classification rules:
1. Crime definition or punishment question → always include BNS
2. Arrest, bail, FIR, trial procedure → always include BNSS
3. Civil suit, court process, decree, injunction → always include CPC
4. Fundamental rights, constitutional provisions, government powers → always include CONSTITUTION
5. If the answer spans multiple codes, include all relevant ones
6. IF the query is a simple greeting (e.g. "hi", "hello", "good morning") or clearly NOT a legal question, return an empty array: []
7. If it IS a legal query but completely unclear which code, return all four

Query: "{query}"

Respond with ONLY a valid JSON array. Examples:
[]
["BNS"]
["BNS", "BNSS"]
["CONSTITUTION"]
["BNS", "BNSS", "CONSTITUTION"]"""

    def classify(self, query: str) -> list:
        """Returns list of source codes relevant to the query. Fallback: all 4 codes."""
        if not query or not query.strip():
            return settings.SOURCE_CODES

        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": self._build_prompt(query)}],
                model=self.model,
                temperature=0.0,
                max_tokens=50,
            )
            raw   = response.choices[0].message.content.strip()
            start = raw.find("[")
            end   = raw.rfind("]") + 1
            if start == -1 or end == 0:
                raise ValueError(f"No JSON array in: {raw}")

            codes = json.loads(raw[start:end])
            
            # If classifier explicitly returns empty, it means it's a greeting/non-legal
            if not codes and "[]" in raw:
                print("👋 Greeting/Non-legal query detected.")
                return []

            valid = [c for c in codes if c in settings.SOURCE_CODES]

            if not valid:
                print("⚠️  No valid codes from classifier. Using all sources.")
                return settings.SOURCE_CODES

            print(f"🗂️  Sources selected: {valid}")
            return valid

        except Exception as e:
            print(f"⚠️  Classification failed ({e}). Using all sources.")
            return settings.SOURCE_CODES
