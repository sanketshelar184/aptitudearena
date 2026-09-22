"""Deep Question Extractor for untouched pages in large company placement files.
Scans pages 30+ and dense question blocks across Infosys, TCS, Wipro, and Tech Mahindra materials.
"""

import re
import time
import uuid
import json
import sqlite3
import requests
from pathlib import Path
import pypdf

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "aptitude.db"
REPORT_PATH = BASE_DIR / "backend" / "data" / "ingestion_report.json"

import sys
sys.path.insert(0, str(BASE_DIR))
from backend.scripts.ingest_company_materials import load_gemini_api_key, call_gemini_api, get_db_taxonomy

def extract_text_questions(text_chunk: str, api_key: str, company: str, filename: str) -> list[dict]:
    prompt = f"""You are an expert technical interviewer and placement test creator for {company}.
Extract 3 to 5 clear, solvable multiple-choice placement questions from this raw text across difficulty levels (EASY, MEDIUM, and HARD):
---
{text_chunk[:3200]}
---

Rules:
1. Only extract complete questions with 4 options: A, B, C, D.
2. If a question depends on an unattached missing diagram or is incomplete, skip it.
3. Classify difficulty accurately as "EASY", "MEDIUM", or "HARD".
4. For each question, return:
   - "question_text": Clear question text.
   - "option_a", "option_b", "option_c", "option_d": 4 multiple-choice options.
   - "correct_answer": "A", "B", "C", or "D".
   - "difficulty": "EASY", "MEDIUM", or "HARD".
   - "category_name": Exactly one of ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Technical CS/IT"].
   - "topic_name": Specific topic (e.g. "Time & Work", "Percentages", "Syllogisms", "Reading Comprehension", "Data Structures").
   - "explanation": Step-by-step reasoning.

Return ONLY a valid JSON array of question objects.
"""
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    res = call_gemini_api(payload, api_key, timeout=60)
    return res if isinstance(res, list) else []

def main():
    api_key = load_gemini_api_key()
    categories, topics = get_db_taxonomy()
    default_cat_id = categories.get("quantitative aptitude", list(categories.values())[0])

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT LOWER(TRIM(question_text)) FROM questions")
    existing_questions = {row[0] for row in cur.fetchall()}
    initial_count = len(existing_questions)
    print(f"[*] Starting deep extraction. Currently {initial_count} questions in DB.", flush=True)

    # List of high-yield multi-page placement PDFs
    target_files = [
        # TCS
        ("TCS", BASE_DIR / "Aptitude Pdf's" / "TCS" / "(www.entrance-exam.net)-451 sample Questions(TCS).doc.pdf", 25, 46, 3),
        # Infosys
        ("Infosys", BASE_DIR / "Aptitude Pdf's" / "Infosys" / "Copy of Infosys Materials.docx.pdf", 25, 120, 8),
        ("Infosys", BASE_DIR / "Aptitude Pdf's" / "Infosys" / "Copy of Infosys Paid Material Pro_3 (1).pdf", 25, 120, 8),
        ("Infosys", BASE_DIR / "Aptitude Pdf's" / "Infosys" / "Copy of infosys-10th march and 11th march-latest (1).docx.pdf", 25, 60, 5),
        # Wipro
        ("Wipro", BASE_DIR / "Aptitude Pdf's" / "Wipro" / "PI Pro Paid Wipro Quants-1.pdf", 25, 100, 8),
        ("Wipro", BASE_DIR / "Aptitude Pdf's" / "Wipro" / "PI Pro Paid Wipro English-1.pdf", 25, 100, 8),
        ("Wipro", BASE_DIR / "Aptitude Pdf's" / "Wipro" / "5_6183688909696794685.pdf", 25, 100, 8),
        ("Wipro", BASE_DIR / "Aptitude Pdf's" / "Wipro" / "wipro (1).pdf", 25, 100, 8),
    ]

    total_added = 0
    report_additions = []

    for company, file_path, start_min, end_max, step in target_files:
        if not file_path.exists():
            continue

        filename = file_path.name
        print(f"\n=======================================================", flush=True)
        print(f"[*] Deep Scanning: {company} -> {filename}", flush=True)
        print(f"=======================================================", flush=True)

        try:
            reader = pypdf.PdfReader(str(file_path))
            total_pgs = len(reader.pages)
        except Exception as e:
            print(f"[!] Error opening {filename}: {e}", flush=True)
            continue

        actual_end = min(total_pgs, end_max)
        for pno in range(start_min, actual_end, step):
            chunk_text = ""
            for p in reader.pages[pno:min(pno + 3, actual_end)]:
                chunk_text += (p.extract_text() or "") + "\n\n"

            has_questions = any(k in chunk_text.lower() for k in ["option", "ans", "answer", "select", "(a)", "(b)", "?", "question"])
            if len(chunk_text.strip()) > 300 and has_questions:
                print(f" -> Extracting {company} {filename} (pg {pno+1}-{min(pno+3, actual_end)})...", end="", flush=True)
                qs = extract_text_questions(chunk_text, api_key, company, filename)
                time.sleep(3.5)

                added_in_chunk = 0
                for item in qs:
                    q_text = item.get("question_text", "").strip()
                    if not q_text or q_text.lower() in existing_questions:
                        continue

                    cat_name = (item.get("category_name") or "Quantitative Aptitude").lower()
                    cat_id = categories.get(cat_name, default_cat_id)

                    top_name = (item.get("topic_name") or "General").lower()
                    top_match = topics.get(top_name)
                    top_id = top_match[0] if top_match else list(topics.values())[0][0]

                    q_diff = (item.get("difficulty") or "MEDIUM").upper()
                    if q_diff not in ("EASY", "MEDIUM", "HARD"):
                        q_diff = "MEDIUM"

                    q_id = uuid.uuid4().hex
                    cur.execute(
                        """INSERT INTO questions (
                            id, question_text, option_a, option_b, option_c, option_d,
                            correct_answer, explanation, category_id, topic_id, difficulty,
                            estimated_time_seconds, is_premium, is_active, source,
                            image_url, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, NULL, datetime('now'), datetime('now'))""",
                        (
                            q_id,
                            q_text,
                            item.get("option_a", "Option A"),
                            item.get("option_b", "Option B"),
                            item.get("option_c", "Option C"),
                            item.get("option_d", "Option D"),
                            item.get("correct_answer", "A")[:1].upper(),
                            item.get("explanation", "Step-by-step placement solution."),
                            cat_id,
                            top_id,
                            q_diff,
                            45,
                            f"{company} - {filename}",
                        )
                    )
                    conn.commit()
                    existing_questions.add(q_text.lower())
                    added_in_chunk += 1
                    total_added += 1

                    report_additions.append({
                        "id": q_id,
                        "company": company,
                        "file": filename,
                        "page": f"{pno+1}",
                        "question_text": q_text[:120] + "...",
                        "has_image": False,
                        "image_url": None,
                        "difficulty": q_diff,
                        "topic": item.get("topic_name", "General")
                    })
                print(f" [Added {added_in_chunk} new questions]", flush=True)

    # Append to report
    if REPORT_PATH.exists():
        try:
            with open(REPORT_PATH, "r", encoding="utf-8") as rf:
                prev = json.load(rf)
            prev.setdefault("added_questions", []).extend(report_additions)
            with open(REPORT_PATH, "w", encoding="utf-8") as wf:
                json.dump(prev, wf, indent=2)
        except Exception:
            pass

    cur.execute("SELECT count(*) FROM questions")
    final_count = cur.fetchone()[0]
    conn.close()

    print("\n=======================================================", flush=True)
    print(f"[*] Deep Extraction Complete!", flush=True)
    print(f"[*] New Questions Added in this run: {total_added}", flush=True)
    print(f"[*] Total Questions in DB now: {final_count}", flush=True)
    print("=======================================================", flush=True)

if __name__ == "__main__":
    main()
