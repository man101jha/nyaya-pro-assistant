import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    models = client.models.list()
    print("\n--- Available Groq Models ---")
    for model in models.data:
        if "vision" in model.id.lower():
            print(f"✅ VISION MODEL: {model.id}")
        else:
            print(f"   Model: {model.id}")
except Exception as e:
    print(f"Error: {e}")
