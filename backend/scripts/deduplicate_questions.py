import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "aptitude.db"

def deduplicate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id, question_text, explanation, image_url, length(explanation) FROM questions")
    rows = cur.fetchall()
    print(f"[*] Total questions before deduplication: {len(rows)}")

    # Group by normalized stem (first 45 alphanumeric characters)
    groups = {}
    for qid, qt, exp, img_url, explen in rows:
        stem = re.sub(r'[^a-zA-Z0-9]', '', qt.lower())[:45]
        # Ignore very short stems if any
        if len(stem) < 15:
            stem = qid
        groups.setdefault(stem, []).append({
            "id": qid,
            "text": qt,
            "explanation": exp,
            "image_url": img_url,
            "explen": explen or 0
        })

    merged_count = 0
    deleted_count = 0

    for stem, items in groups.items():
        if len(items) <= 1:
            continue

        # Pick canonical: prefer item with image, then longest explanation
        items.sort(key=lambda x: (1 if x["image_url"] else 0, x["explen"]), reverse=True)
        canonical = items[0]
        duplicates = items[1:]

        canon_id = canonical["id"]
        for dup in duplicates:
            dup_id = dup["id"]
            # If attempt already has canon_id, delete dup row from test_answers to avoid unique violation
            cur.execute("""
                DELETE FROM test_answers 
                WHERE question_id = ? 
                AND attempt_id IN (SELECT attempt_id FROM test_answers WHERE question_id = ?)
            """, (dup_id, canon_id))
            # Update remaining test_answers to canon_id
            cur.execute("UPDATE test_answers SET question_id = ? WHERE question_id = ?", (canon_id, dup_id))
            # Delete duplicate question
            cur.execute("DELETE FROM questions WHERE id = ?", (dup_id,))
            deleted_count += 1
        merged_count += 1

    conn.commit()

    cur.execute("SELECT count(*) FROM questions")
    final_count = cur.fetchone()[0]
    conn.close()

    print(f"[*] Merged {merged_count} duplicate question groups.")
    print(f"[*] Deleted {deleted_count} duplicate question entries.")
    print(f"[*] Total questions in DB now: {final_count}")

if __name__ == "__main__":
    deduplicate()

