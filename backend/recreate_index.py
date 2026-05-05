import os
import time
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "nyaya-pro"
DIMENSIONS = 384  # New dimensions for all-MiniLM-L6-v2
METRIC = "cosine"

def recreate_index():
    if not PINECONE_API_KEY:
        print("❌ Error: PINECONE_API_KEY not found in .env file.")
        return

    pc = Pinecone(api_key=PINECONE_API_KEY)

    # 1. Delete existing index if it exists
    print(f"Checking for existing index: '{INDEX_NAME}'...")
    if INDEX_NAME in [idx.name for idx in pc.list_indexes()]:
        print(f"⚠️  Deleting existing index '{INDEX_NAME}'...")
        pc.delete_index(INDEX_NAME)
        print("✅ Index deleted. Waiting for cleanup...")
        time.sleep(10) # Wait for Pinecone to fully clear the name
    else:
        print("ℹ️  Index doesn't exist yet. Skipping deletion.")

    # 2. Create new index
    print(f"🚀 Creating new index '{INDEX_NAME}' with {DIMENSIONS} dimensions...")
    try:
        pc.create_index(
            name=INDEX_NAME,
            dimension=DIMENSIONS,
            metric=METRIC,
            spec=ServerlessSpec(
                cloud='aws', 
                region='us-east-1' # Default for Pinecone free tier
            )
        )
        print("✅ Index created successfully!")
        print("\nNext Steps:")
        print("1. Run: python ingest_json.py --all")
    except Exception as e:
        print(f"❌ Error creating index: {e}")

if __name__ == "__main__":
    recreate_index()
