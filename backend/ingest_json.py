"""
Nyaya-Pro — JSON Ingestion CLI
================================
Ingests structured legal JSON files into Pinecone.

Usage:
  python ingest_json.py --all              # ingest all 4 sources
  python ingest_json.py --source BNS       # ingest one source
  python ingest_json.py --all --clear      # wipe + re-ingest all
"""
import sys
import os
import argparse

# Make sure app/ is importable when run from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.ingestion.json_ingestor import JsonIngestor
from app.ingestion.uploader import PineconeUploader
from pinecone import Pinecone


def parse_args():
    parser = argparse.ArgumentParser(description="Nyaya-Pro JSON Ingestion Pipeline")
    parser.add_argument("--source", type=str, choices=["CONSTITUTION", "BNS", "BNSS", "CPC"])
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--clear", action="store_true")
    return parser.parse_args()


def clear_namespace():
    """
    Deletes all vectors in the legal_corpus namespace.
    Safely handles the case where namespace doesn't exist yet (fresh index).
    """
    print(f"\n⚠️  Clearing namespace: '{settings.NAMESPACE}'...")
    try:
        pc    = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.INDEX_NAME)
        index.delete(delete_all=True, namespace=settings.NAMESPACE)
        print("✅ Namespace cleared.\n")
    except Exception as e:
        if "Namespace not found" in str(e) or "404" in str(e):
            print("ℹ️  Namespace doesn't exist yet — nothing to clear. Continuing...\n")
        else:
            raise  # re-raise unexpected errors



def run_ingestion(source_codes: list, clear: bool = False):
    if clear:
        clear_namespace()

    ingestor = JsonIngestor()
    uploader = PineconeUploader()
    grand_total = 0

    for source_code in source_codes:
        chunks = ingestor.process_source(source_code)
        if not chunks:
            print(f"⚠️  No chunks for {source_code}, skipping.")
            continue
        print(f"\n📤 Uploading {len(chunks)} chunks for {source_code}...")
        uploader.upsert_chunks(chunks)
        grand_total += len(chunks)

    print(f"\n{'='*50}")
    print(f"🎉 INGESTION COMPLETE — {grand_total} total vectors")
    print(f"   Namespace : {settings.NAMESPACE}")
    print(f"   Index     : {settings.INDEX_NAME}")
    print(f"{'='*50}\n")


def main():
    args = parse_args()
    if not args.all and not args.source:
        print("❌ Specify --all or --source <CODE>")
        print("   python ingest_json.py --all")
        print("   python ingest_json.py --source BNS")
        return
    source_codes = settings.SOURCE_CODES if args.all else [args.source]
    run_ingestion(source_codes, clear=args.clear)


if __name__ == "__main__":
    main()
