import json
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.retriever import LegalRetriever
from app.generator import LegalGenerator

app = FastAPI(title="Nyaya-Pro API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []



class VisionRequest(BaseModel):
    image_base64: str
    message: str

retriever = LegalRetriever()
generator = LegalGenerator()

@app.get("/")
async def root():
    return {"message": "Nyaya-Pro API is live!"}

@app.get("/warmup")
async def warmup():
    """
    Triggers lazy loading of AI models so the first query is fast.
    """
    try:
        # Accessing the property triggers the lazy load
        _ = retriever.embed_model
        return {"status": "ready", "message": "AI models pre-loaded successfully."}
    except Exception as e:
        print(f"Warmup Error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/chat/vision")
async def chat_vision(request: VisionRequest):
    """
    Analyzes an image (Base64) using Llama-3.2-11b-vision.
    """
    try:
        # Use the Groq client from the generator for consistency
        client = generator.client 
        
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": (
                                "You are Nyaya-Pro AI, a specialized Indian legal expert. "
                                "Your task is to analyze this image ONLY if it is a legal document, a court notice, a contract, "
                                "or evidence related to a legal matter. \n\n"
                                "STRICT RULE: If the image is unrelated to law (e.g., a random personal photo, nature, a meme, etc.), "
                                "do NOT describe it. Instead, reply: 'I am a specialized legal assistant. I can only analyze legal documents, notices, or evidence.'\n\n"
                                f"User Question: {request.message}"
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{request.image_base64}",
                            },
                        },
                    ],
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.1,
            max_tokens=1024,
        )
        return {"answer": response.choices[0].message.content}
    except Exception as e:
        print(f"Vision Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        results = retriever.retrieve(request.message, request.history)
        answer  = generator.generate_answer(request.message, results, request.history)
        if "§" not in answer and "Art." not in answer:
            results = []
        return {"answer": answer, "sources": results}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming endpoint for modern typewriter effect.
    """
    try:
        # 1. Retrieve Sources
        results = retriever.retrieve(request.message, request.history)
        
        def event_generator():
            # Send metadata first
            yield f"__METADATA__:{json.dumps({'sources': results})}\n"
            
            # 2. Stream Answer tokens
            for token in generator.generate_answer_stream(request.message, results, request.history):
                if token:
                    yield token

        return StreamingResponse(event_generator(), media_type="text/plain")
        
    except Exception as e:
        print(f"Stream Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)