import os,json,uuid
from typing import List,Dict,Any,Optional
from app.config import settings

class JsonIngestor:
    def __init__(self):
        self.base_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        self.data_dir=os.path.join(self.base_dir,settings.JSON_DATA_DIR)
    def load_json(self, source_code: str) -> List[Dict]:
        """Loads and returns raw records from a JSON file for the given source code.
        Returns empty list if file not found."""
        filename = settings.JSON_FILES.get(source_code)
        if not filename:
          print(f"❌ No JSON file configured for source: {source_code}")
          return []
        file_path = os.path.join(self.data_dir, filename)
        if not os.path.exists(file_path):
          print(f"❌ File not found: {file_path}")
          return []
        with open(file_path, "r", encoding="utf-8") as f:
          data = json.load(f)
        # Handle both list format and dict-with-items format
        if isinstance(data, list):
          records = data
        elif isinstance(data, dict):
          # Some JSONs wrap records under a key like {"items": [...]}
          records = data.get("items", data.get("sections", data.get("articles", [])))
        else:
          records = []
        print(f"✅ Loaded {len(records)} records from {filename}")
        return records
    def _extract_location(self,record:Dict,source_code:str)->Dict:
        """
        Extracts section/article number and title from the location field.
    Handles naming differences between Constitution (article_*) and others (section_*).
        """
        loc = record.get("location", {})
        if source_code == "CONSTITUTION":
           number = str(loc.get("article_number", loc.get("section_number", "?")))
           title  = loc.get("article_title",  loc.get("section_title", ""))
        else:
           number = str(loc.get("section_number", "?"))
           title  = loc.get("section_title", "")
        return {
        "section_number":  number,
        "section_title":   title or "",
        "chapter_number":  loc.get("chapter_number", ""),
        "chapter_title":   loc.get("chapter_title",  ""),
         }
    

    def normalize_record(self, record: Dict, source_code: str) -> Optional[Dict]:
      """
      Converts one raw JSON record into a flat, Pinecone-ready dict.
      Returns None if the record has no usable text (skipped).
      """
      source_info = record.get("source", {})
      content     = record.get("content", {})
      meta        = record.get("metadata", {})

      # --- Text fields ---
      raw_text = content.get("text", "").strip()
      if not raw_text:
        return None   # skip empty records

      # Use the pre-crafted embedding_text if available, else fall back to raw text
      embedding_text = meta.get("embedding_text", "").strip() or raw_text

      # --- Location ---
      location = self._extract_location(record, source_code)

      # --- Keywords: Pinecone requires string, not list ---
      keywords = meta.get("keywords", [])
      keywords_str = ", ".join(keywords) if isinstance(keywords, list) else str(keywords)

      # --- Punishment clause (BNS/BNSS specific, safe to be empty for others) ---
      punishment = content.get("punishment_clause", "") or ""

      return {
        "id":             record.get("id", str(uuid.uuid4())),
        "embedding_text": embedding_text,   # what gets embedded
        "raw_text":       raw_text,         # full section text stored in metadata
        "metadata": {
            # Source identity
            "source_code":       source_code,
            "source_full":       source_info.get("act", source_code),
            "year":              int(source_info.get("year", 0)),

            # Location
            "section_number":    location["section_number"],
            "section_title":     location["section_title"],
            "chapter_number":    location["chapter_number"],
            "chapter_title":     location["chapter_title"],

            # Content
            "text":              raw_text,
            "keywords":          keywords_str,
            "punishment_clause": punishment,
            "has_punishment":    bool(punishment),
            "chunk_type":        meta.get("chunk_type", "section"),
          }
      }
    def chunk_record(self, normalized: Dict) -> List[Dict]:
      """
      If the section text is short enough, returns it as a single chunk.
      If it's too long, splits it into overlapping sub-chunks.
      Each chunk gets its own unique ID and a chunk_index in metadata.
      """
      text = normalized["raw_text"]
      base_id   = normalized["id"]
      base_meta = normalized["metadata"].copy()

      # Short section → keep as single atomic chunk (no splitting)
      if len(text) <= settings.MAX_SECTION_CHARS:
        base_meta["chunk_index"] = 0
        base_meta["total_chunks"] = 1
        return [{
            "id":             base_id,
            "embedding_text": normalized["embedding_text"],
            "metadata":       base_meta,
        }]

      # Long section → split into overlapping chunks
      chunks = []
      start  = 0
      idx    = 0
      size   = settings.CHILD_CHUNK_SIZE
      overlap = settings.CHILD_CHUNK_OVERLAP

      while start < len(text):
        end        = start + size
        chunk_text = text[start:end]

        # Prepend section header to every sub-chunk so context is preserved
        header = (
            f"{base_meta['source_code']} §{base_meta['section_number']} "
            f"— {base_meta['section_title']} | "
        )
        chunk_embedding_text = header + chunk_text

        chunk_meta = base_meta.copy()
        chunk_meta["text"]         = chunk_text
        chunk_meta["chunk_index"]  = idx
        chunk_meta["is_partial"]   = True   # flag: this is a fragment of a larger section

        chunks.append({
            "id":             f"{base_id}-chunk-{idx}",
            "embedding_text": chunk_embedding_text,
            "metadata":       chunk_meta,
        })

        if end >= len(text):
            break
        start += (size - overlap)
        idx   += 1

      # Stamp total_chunks on all after we know the count
      for c in chunks:
        c["metadata"]["total_chunks"] = len(chunks)

      print(f"  ⚠️  Long section {base_id} split into {len(chunks)} chunks")
      return chunks
    def process_source(self, source_code: str) -> List[Dict]:
      """
      Full pipeline for one source:
      load JSON → normalize each record → chunk → return flat list of Pinecone-ready dicts.
      """
      print(f"\n{'='*50}")
      print(f"Processing: {source_code}")
      print(f"{'='*50}")

      records = self.load_json(source_code)
      if not records:
        return []

      all_chunks = []
      skipped    = 0

      for record in records:
        normalized = self.normalize_record(record, source_code)
        if normalized is None:
            skipped += 1
            continue
        chunks = self.chunk_record(normalized)
        all_chunks.extend(chunks)

      print(f"✅ {source_code}: {len(records)} records → {len(all_chunks)} chunks ({skipped} skipped)")
      return all_chunks





