"""Company-Wise Question & Diagram Ingestion Pipeline with Gemini Vision Clarity Verification.

Processes campus placement materials from 'Aptitude Pdf\'s/' for:
- Infosys
- TCS
- Wipro
- Tech Mahindra

Quality Rules:
1. Photos / Diagrams must be sharp, clear, and relevant (problem figures, charts, geometry, sequences).
2. Blurry, low-res, corrupt, or decorative logos/watermarks are rejected.
3. If a question depends on an unreadable diagram, it is SKIPPED and logged in the audit report.
4. Questions are extracted across EASY, MEDIUM, and HARD difficulty levels.
5. Saves all accepted diagrams to backend/static/uploads/questions/
6. Generates backend/data/ingestion_report.json and displays a final audit report.
"""

import os
import io
import re
import json
import time
import uuid
import base64
import hashlib
import sqlite3
import requests
from pathlib import Path
from PIL import Image
import pypdf
import docx
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "aptitude.db"
STATIC_UPLOADS = BASE_DIR / "backend" / "static" / "uploads" / "questions"
REPORT_PATH = BASE_DIR / "backend" / "data" / "ingestion_report.json"

STATIC_UPLOADS.mkdir(parents=True, exist_ok=True)
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_gemini_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise ValueError("GEMINI_API_KEY not found in .env")


def get_db_taxonomy():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM categories")
    categories = {row[1].lower(): row[0] for row in cur.fetchall()}

    cur.execute("SELECT id, name, category_id FROM topics")
    topics = {}
    for tid, tname, cid in cur.fetchall():
        topics[tname.lower()] = (tid, cid)
    conn.close()
    return categories, topics


def call_gemini_api(payload: dict, api_key: str, timeout: int = 60) -> dict | None:
    models = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(2):
            try:
                res = requests.post(url, json=payload, timeout=timeout)
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = text.strip()
                    if clean_json.startswith("```"):
                        clean_json = re.sub(r"^```[a-zA-Z]*\n", "", clean_json)
                        clean_json = re.sub(r"\n```$", "", clean_json)
                    return json.loads(clean_json.strip())
                elif res.status_code == 429:
                    print(f" [{model} 429 - trying next model]...", end="", flush=True)
                    break
                else:
                    print(f" [{model} Error {res.status_code}: {res.text[:100]}]...", end="", flush=True)
                    time.sleep(2)
            except requests.exceptions.Timeout:
                print(f" [{model} Timeout - retrying]...", end="", flush=True)
                time.sleep(2)
            except Exception as e:
                print(f" [Request Error: {e}]...", end="", flush=True)
                time.sleep(1)
    return None


def verify_and_extract_visual_question(img_bytes: bytes, page_text: str, api_key: str) -> dict | None:
    """Uses Gemini 2.5 Flash Vision to inspect diagram clarity and extract question."""
    try:
        pil_img = Image.open(io.BytesIO(img_bytes))
    except Exception:
        return {"status": "NOT_A_DIAGRAM", "reason": "Corrupt image bytes"}

    w, h = pil_img.size
    if w < 120 or h < 80 or len(img_bytes) < 2500:
        return {"status": "NOT_A_DIAGRAM", "reason": "Image too small or low resolution"}

    # Resize large images for fast network transmission
    if max(w, h) > 1000:
        scale = 1000.0 / max(w, h)
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        prepared_bytes = buf.getvalue()
        mime_type = "image/png"
    else:
        prepared_bytes = img_bytes
        img_format = pil_img.format or "PNG"
        mime_type = "image/jpeg" if img_format.upper() in ("JPG", "JPEG") else "image/png"

    b64_data = base64.b64encode(prepared_bytes).decode("utf-8")

    prompt = f"""You are an automated campus placement exam parser.
Inspect the attached image and the surrounding page text:
---
{page_text[:1500]}
---

Evaluate the image according to these rules:
1. Is this a genuine, legible problem diagram, sequence of figures, geometric chart, or technical schematic?
   - If it is a website logo, header watermark, decorative banner, or blank box, set "status": "NOT_A_DIAGRAM".
   - If it is a problem figure, but too blurry, unreadable, cut off, or corrupt to solve, set "status": "REJECTED_UNCLEAR".
   - If it is a clear, sharp, readable question diagram, set "status": "ACCEPTED_CLEAR".

2. If "ACCEPTED_CLEAR", extract the question that refers to this figure:
   - "question_text": Clean question stem.
   - "option_a", "option_b", "option_c", "option_d": 4 multiple-choice options.
   - "correct_answer": "A", "B", "C", or "D".
   - "difficulty": "EASY", "MEDIUM", or "HARD".
   - "category_name": One of ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Technical CS/IT"].
   - "topic_name": Specific topic (e.g. "Visual & Non-Verbal Reasoning", "Data Interpretation", "Geometry", "Puzzles").
   - "explanation": Step-by-step reasoning and why the correct figure/choice wins.

Return ONLY valid JSON:
{{
  "status": "ACCEPTED_CLEAR" | "REJECTED_UNCLEAR" | "NOT_A_DIAGRAM",
  "reason": "Brief reason if rejected or not a diagram",
  "question": {{ ... }} or null
}}
"""
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": b64_data}}
            ]
        }]
    }
    return call_gemini_api(payload, api_key, timeout=60)


def extract_text_questions_batch(text_chunk: str, api_key: str, company: str, filename: str) -> list[dict]:
    prompt = f"""You are an expert technical interviewer and placement paper creator for {company}.
Extract 3 to 5 high-quality, solvable multiple-choice placement questions from this raw text across different difficulty levels (EASY, MEDIUM, and HARD):
---
{text_chunk[:3000]}
---

Rules:
1. Only extract complete, well-formed questions with clear options A, B, C, D.
2. If a question is incomplete, broken, or refers to a missing diagram that is not in the text, DO NOT return it.
3. Classify difficulty accurately as "EASY", "MEDIUM", or "HARD".
4. For each valid question, return:
   - "question_text": Clear question text.
   - "option_a", "option_b", "option_c", "option_d": 4 options.
   - "correct_answer": "A", "B", "C", or "D".
   - "difficulty": "EASY", "MEDIUM", or "HARD".
   - "category_name": Exactly one of ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Technical CS/IT"].
   - "topic_name": Matching topic (e.g. "Time & Work", "Coding-Decoding", "C & C++ Programming", "Reading Comprehension").
   - "explanation": Step-by-step solution with a campus placement exam tip.

Return ONLY a valid JSON array of question objects.
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    res = call_gemini_api(payload, api_key, timeout=60)
    return res if isinstance(res, list) else []


def main():
    api_key = load_gemini_api_key()
    print(f"[*] Loaded Gemini API Key: {api_key[:6]}...{api_key[-4:]}")

    categories, topics = get_db_taxonomy()
    default_cat_id = categories.get("quantitative aptitude", list(categories.values())[0])

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT LOWER(TRIM(question_text)) FROM questions")
    existing_questions = {row[0] for row in cur.fetchall()}
    print(f"[*] Currently {len(existing_questions)} existing questions in database.")

    # Load previous report if exists to resume
    report = {
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "companies_scanned": ["Infosys", "TCS", "Wipro", "Tech Mahindra"],
        "added_questions": [],
        "skipped_questions": [],
        "summary": {}
    }
    if REPORT_PATH.exists():
        try:
            with open(REPORT_PATH, "r", encoding="utf-8") as rf:
                prev_report = json.load(rf)
                report["added_questions"] = prev_report.get("added_questions", [])
                report["skipped_questions"] = prev_report.get("skipped_questions", [])
                print(f"[*] Resuming with {len(report['added_questions'])} previously recorded additions.")
        except Exception:
            pass

    seen_image_hashes: dict[str, dict] = {}

    company_dirs = {
        "Infosys": BASE_DIR / "Aptitude Pdf's" / "Infosys",
        "TCS": BASE_DIR / "Aptitude Pdf's" / "TCS",
        "Wipro": BASE_DIR / "Aptitude Pdf's" / "Wipro",
        "Tech Mahindra": BASE_DIR / "Aptitude Pdf's" / "Tech Mahindra",
    }

    for company, comp_path in company_dirs.items():
        if not comp_path.exists():
            continue

        print(f"\n=======================================================")
        print(f"[*] Scanning Company Materials: {company}")
        print(f"[*] Path: {comp_path}")
        print(f"=======================================================")

        all_doc_files = sorted(list(comp_path.rglob("*")))
        valid_files = [f for f in all_doc_files if f.is_file() and f.suffix.lower() in (".pdf", ".docx", ".htm", ".html", ".txt")]
        print(f"[*] Found {len(valid_files)} document(s) for {company}")

        for doc_file in valid_files:
            filename = doc_file.name
            ext = doc_file.suffix.lower()
            print(f"\n--- Checking File: {filename} ({ext.upper()}) ---")

            # --- A. PDF PROCESSING (Images + Text) ---
            if ext == ".pdf":
                try:
                    reader = pypdf.PdfReader(str(doc_file))
                except Exception as e:
                    print(f"[!] Could not open {filename}: {e}")
                    report["skipped_questions"].append({
                        "company": company,
                        "file": filename,
                        "page": "all",
                        "reason": f"PDF reading error: {str(e)}",
                        "snippet": filename
                    })
                    continue

                # 1. Scan Pages with Images (Visual Questions & Diagrams)
                for page_num, page in enumerate(reader.pages, start=1):
                    if len(page.images) == 0:
                        continue
                    page_text = page.extract_text() or ""
                    for img_idx, img_obj in enumerate(page.images):
                        try:
                            img_bytes = img_obj.data
                        except Exception:
                            continue

                        img_hash = hashlib.md5(img_bytes).hexdigest()
                        if img_hash in seen_image_hashes:
                            result = seen_image_hashes[img_hash]
                            if result.get("status") != "ACCEPTED_CLEAR":
                                continue
                        else:
                            print(f" -> Inspecting Page {page_num} image {img_obj.name}...", end="", flush=True)
                            result = verify_and_extract_visual_question(img_bytes, page_text, api_key)
                            if result:
                                seen_image_hashes[img_hash] = result
                            time.sleep(4.0)

                        if not result:
                            print(" [Skipped - no response]")
                            continue

                        status = result.get("status")
                        if status == "ACCEPTED_CLEAR" and result.get("question"):
                            q_data = result["question"]
                            q_text = q_data.get("question_text", "").strip()
                            if not q_text or q_text.lower() in existing_questions:
                                print(" [Already exists in DB]")
                                continue

                            # Save sharp diagram to static uploads folder
                            img_filename = f"{company.lower()}_{uuid.uuid4().hex[:8]}.png"
                            saved_img_path = STATIC_UPLOADS / img_filename
                            with open(saved_img_path, "wb") as f:
                                f.write(img_bytes)

                            image_url = f"/static/uploads/questions/{img_filename}"
                            print(f" [ACCEPTED DIAGRAM: {img_filename}]")

                            cat_name = q_data.get("category_name", "Logical Reasoning").lower()
                            cat_id = categories.get(cat_name, categories.get("logical reasoning", default_cat_id))

                            top_name = q_data.get("topic_name", "Visual & Non-Verbal Reasoning").lower()
                            top_id = topics.get(top_name, (topics.get("visual & non-verbal reasoning", (list(topics.values())[0]))))[0]

                            q_diff = (q_data.get("difficulty") or "MEDIUM").upper()
                            if q_diff not in ("EASY", "MEDIUM", "HARD"):
                                q_diff = "MEDIUM"

                            q_id = uuid.uuid4().hex
                            cur.execute(
                                """INSERT INTO questions (
                                    id, question_text, option_a, option_b, option_c, option_d,
                                    correct_answer, explanation, category_id, topic_id, difficulty,
                                    estimated_time_seconds, is_premium, is_active, source,
                                    image_url, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, datetime('now'), datetime('now'))""",
                                (
                                    q_id,
                                    q_text,
                                    q_data.get("option_a", "Option A"),
                                    q_data.get("option_b", "Option B"),
                                    q_data.get("option_c", "Option C"),
                                    q_data.get("option_d", "Option D"),
                                    q_data.get("correct_answer", "A")[:1].upper(),
                                    q_data.get("explanation", "See visual reasoning step-by-step."),
                                    cat_id,
                                    top_id,
                                    q_diff,
                                    50,
                                    f"{company} Placement Paper",
                                    image_url
                                )
                            )
                            conn.commit()
                            existing_questions.add(q_text.lower())

                            report["added_questions"].append({
                                "id": q_id,
                                "company": company,
                                "file": filename,
                                "page": page_num,
                                "question_text": q_text[:120] + "...",
                                "has_image": True,
                                "image_url": image_url,
                                "difficulty": q_diff,
                                "topic": q_data.get("topic_name", "Visual & Non-Verbal Reasoning")
                            })

                        elif status == "REJECTED_UNCLEAR":
                            reason = result.get("reason", "Diagram is unreadable or blurry for exam use")
                            print(f" [REJECTED UNCLEAR DIAGRAM: {reason}]")
                            report["skipped_questions"].append({
                                "company": company,
                                "file": filename,
                                "page": page_num,
                                "reason": f"Photo/Diagram rejected: {reason}",
                                "snippet": page_text[:120].strip() or f"{filename} Page {page_num}"
                            })

                        elif status == "NOT_A_DIAGRAM":
                            reason = result.get("reason", "Header, logo, or decorative banner")
                            print(f" [Skipped: {reason}]")

                # 2. Extract Text Questions from Page Chunks
                total_pgs = len(reader.pages)
                sample_step = max(1, total_pgs // 4)
                for start_pg in range(0, min(total_pgs, 30), sample_step):
                    chunk_text = ""
                    for p in reader.pages[start_pg:start_pg + 3]:
                        chunk_text += (p.extract_text() or "") + "\n\n"

                    if len(chunk_text.strip()) > 350 and any(k in chunk_text.lower() for k in ["?", "option", "(a)", "(b)", "ans", "question", "select"]):
                        print(f" -> Extracting questions from {filename} (pg {start_pg+1}-{min(start_pg+3, total_pgs)})...", end="", flush=True)
                        text_qs = extract_text_questions_batch(chunk_text, api_key, company, filename)
                        time.sleep(4.0)

                        added_count = 0
                        for item in text_qs:
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
                            added_count += 1
                            report["added_questions"].append({
                                "id": q_id,
                                "company": company,
                                "file": filename,
                                "page": f"{start_pg+1}",
                                "question_text": q_text[:120] + "...",
                                "has_image": False,
                                "image_url": None,
                                "difficulty": q_diff,
                                "topic": item.get("topic_name", "General")
                            })
                        print(f" [Added {added_count} new questions]")

            # --- B. DOCX PROCESSING ---
            elif ext == ".docx":
                try:
                    doc = docx.Document(str(doc_file))
                    doc_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                    if len(doc_text) > 300:
                        print(f" -> Extracting DOCX questions from {filename}...", end="", flush=True)
                        text_qs = extract_text_questions_batch(doc_text[:3500], api_key, company, filename)
                        time.sleep(4.0)
                        added_count = 0
                        for item in text_qs:
                            q_text = item.get("question_text", "").strip()
                            if not q_text or q_text.lower() in existing_questions:
                                continue
                            cat_name = (item.get("category_name") or "Logical Reasoning").lower()
                            cat_id = categories.get(cat_name, default_cat_id)
                            top_id = list(topics.values())[0][0]
                            q_diff = (item.get("difficulty") or "MEDIUM").upper()
                            q_id = uuid.uuid4().hex
                            cur.execute(
                                """INSERT INTO questions (
                                    id, question_text, option_a, option_b, option_c, option_d,
                                    correct_answer, explanation, category_id, topic_id, difficulty,
                                    estimated_time_seconds, is_premium, is_active, source,
                                    image_url, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, NULL, datetime('now'), datetime('now'))""",
                                (
                                    q_id, q_text,
                                    item.get("option_a", "Option A"), item.get("option_b", "Option B"),
                                    item.get("option_c", "Option C"), item.get("option_d", "Option D"),
                                    item.get("correct_answer", "A")[:1].upper(),
                                    item.get("explanation", "Step-by-step placement solution."),
                                    cat_id, top_id, q_diff, 45, f"{company} DOCX - {filename}"
                                )
                            )
                            conn.commit()
                            existing_questions.add(q_text.lower())
                            added_count += 1
                            report["added_questions"].append({
                                "id": q_id, "company": company, "file": filename, "page": "docx",
                                "question_text": q_text[:120] + "...", "has_image": False,
                                "image_url": None, "difficulty": q_diff, "topic": item.get("topic_name", "General")
                            })
                        print(f" [Added {added_count} new questions]")
                except Exception as e:
                    print(f"[!] DOCX Error {filename}: {e}")

            # --- C. HTML / TXT PROCESSING ---
            elif ext in (".htm", ".html", ".txt"):
                try:
                    with open(doc_file, "r", encoding="utf-8", errors="ignore") as fp:
                        raw = fp.read()
                    text_content = BeautifulSoup(raw, "html.parser").get_text() if ext in (".htm", ".html") else raw
                    if len(text_content.strip()) > 300:
                        print(f" -> Extracting text questions from {filename}...", end="", flush=True)
                        text_qs = extract_text_questions_batch(text_content[:3500], api_key, company, filename)
                        time.sleep(4.0)
                        added_count = 0
                        for item in text_qs:
                            q_text = item.get("question_text", "").strip()
                            if not q_text or q_text.lower() in existing_questions:
                                continue
                            cat_name = (item.get("category_name") or "Technical CS/IT").lower()
                            cat_id = categories.get(cat_name, default_cat_id)
                            top_id = list(topics.values())[0][0]
                            q_diff = (item.get("difficulty") or "MEDIUM").upper()
                            q_id = uuid.uuid4().hex
                            cur.execute(
                                """INSERT INTO questions (
                                    id, question_text, option_a, option_b, option_c, option_d,
                                    correct_answer, explanation, category_id, topic_id, difficulty,
                                    estimated_time_seconds, is_premium, is_active, source,
                                    image_url, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, NULL, datetime('now'), datetime('now'))""",
                                (
                                    q_id, q_text,
                                    item.get("option_a", "Option A"), item.get("option_b", "Option B"),
                                    item.get("option_c", "Option C"), item.get("option_d", "Option D"),
                                    item.get("correct_answer", "A")[:1].upper(),
                                    item.get("explanation", "Step-by-step placement solution."),
                                    cat_id, top_id, q_diff, 45, f"{company} - {filename}"
                                )
                            )
                            conn.commit()
                            existing_questions.add(q_text.lower())
                            added_count += 1
                            report["added_questions"].append({
                                "id": q_id, "company": company, "file": filename, "page": ext[1:],
                                "question_text": q_text[:120] + "...", "has_image": False,
                                "image_url": None, "difficulty": q_diff, "topic": item.get("topic_name", "General")
                            })
                        print(f" [Added {added_count} new questions]")
                except Exception as e:
                    print(f"[!] File Error {filename}: {e}")

            # Checkpoint save after every file
            with open(REPORT_PATH, "w", encoding="utf-8") as rf:
                json.dump(report, rf, indent=2)

    conn.close()

    # Final summary statistics
    report["completed_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    report["total_added"] = len(report["added_questions"])
    report["total_with_diagrams"] = sum(1 for q in report["added_questions"] if q["has_image"])
    report["total_skipped"] = len(report["skipped_questions"])
    diff_counts = {}
    for q in report["added_questions"]:
        d = q.get("difficulty", "MEDIUM")
        diff_counts[d] = diff_counts.get(d, 0) + 1
    report["difficulty_breakdown"] = diff_counts

    with open(REPORT_PATH, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print("\n=======================================================")
    print("                INGESTION AUDIT REPORT                 ")
    print("=======================================================")
    print(f"Total Questions Added: {report['total_added']}")
    print(f" - With Verified Diagrams: {report['total_with_diagrams']}")
    print(f" - Text-Only Questions:    {report['total_added'] - report['total_with_diagrams']}")
    print(f"Difficulty Breakdown:      EASY: {diff_counts.get('EASY', 0)} | MEDIUM: {diff_counts.get('MEDIUM', 0)} | HARD: {diff_counts.get('HARD', 0)}")
    print(f"Total Skipped Questions / Unclear Images: {report['total_skipped']}")
    print(f"Detailed JSON audit saved to: {REPORT_PATH}")
    print("=======================================================\n")

    if report["skipped_questions"]:
        print("--- SKIPPED QUESTIONS LOG (Sample) ---")
        for s in report["skipped_questions"][:20]:
            print(f"[{s['company']}] File: {s['file']} (Pg {s['page']}) -> Reason: {s['reason']}")


if __name__ == "__main__":
    main()
