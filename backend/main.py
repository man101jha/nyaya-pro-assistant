from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.retriever import LegalRetriever
from app.generator import LegalGenerator

app = FastAPI(title="Nyaya-Pro API")

# Enable CORS - Allow all origins for free tier deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

retriever = LegalRetriever()
generator = LegalGenerator()

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # retrieve() now handles condense + rewrite + classify internally
        results = retriever.retrieve(request.message, request.history)
        answer  = generator.generate_answer(request.message, results, request.history)
        
        # If the LLM didn't actually cite any sections (e.g. it was a greeting or off-topic),
        # do not send sources back to the frontend.
        if "§" not in answer and "Art." not in answer:
            results = []

        return {"answer": answer, "sources": results}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)