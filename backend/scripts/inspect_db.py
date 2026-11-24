"""
Utility script to inspect the SQLite user database and ChromaDB vector store.
Run via: uv run python -m backend.scripts.inspect_db
"""
import sqlite3
from pathlib import Path

def inspect_users():
    """Inspect and display formatted table of all registered users in SQLite."""
    db_path = Path("data/documind_users.db")
    print("\n" + "=" * 70)
    print("  DOCUMIND USER ACCOUNTS DATABASE (SQLite)")
    print(f"  Location: {db_path.resolve()}")
    print("=" * 70)

    if not db_path.exists():
        print("  Database file not found yet. Start the server to initialize it.")
        return

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, email, name, role, created_at FROM users").fetchall()

    if not rows:
        print("  No users registered yet.")
        return

    print(f"  Total Registered Users: {len(rows)}\n")
    print(f"  {'ROLE':<8} | {'NAME':<20} | {'EMAIL':<30} | {'CREATED AT'}")
    print("  " + "-" * 75)
    for r in rows:
        role = r['role'].upper()
        name = r['name'][:18]
        email = r['email'][:28]
        created = r['created_at'][:19].replace('T', ' ')
        print(f"  {role:<8} | {name:<20} | {email:<30} | {created}")
    print("=" * 70)

def inspect_chromadb():
    """Inspect and display formatted table of all indexed documents and vector statistics in ChromaDB."""
    chroma_path = Path("chroma_db")
    print("\n" + "=" * 70)
    print("  DOCUMIND VECTOR DATABASE (ChromaDB)")
    print(f"  Location: {chroma_path.resolve()}")
    print("=" * 70)

    try:
        from backend.ingestion.vector_store import get_vector_store
        vs = get_vector_store()
        doc_count = vs.get_document_count()
        chunk_count = vs._collection.count()
        docs = vs.list_documents()

        print(f"  Total Indexed Documents: {doc_count}")
        print(f"  Total Vector Chunks:     {chunk_count}\n")
        if docs:
            print(f"  {'DOC ID':<34} | {'FILENAME':<24} | {'CHUNKS'}")
            print("  " + "-" * 70)
            for d in docs:
                doc_id = getattr(d, 'doc_id', str(d))
                filename = getattr(d, 'filename', 'unknown')
                total_chunks = getattr(d, 'total_chunks', 0)
                print(f"  {doc_id:<34} | {filename[:22]:<24} | {total_chunks}")
        else:
            print("  No documents uploaded yet. Upload via the web workspace.")
    except Exception as e:
        print(f"  Vector DB status: {e}")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    inspect_users()
    inspect_chromadb()
