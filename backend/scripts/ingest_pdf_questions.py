"""PDF Question Ingestion and AI Pedagogical Explanation Engine.

Extracts questions from placement papers (PDFs) in Aptitude Pdf's,
solves and enriches them with Gemini 2.5 Flash, assigns campus difficulty
(EASY / MEDIUM / HARD) and taxonomy (Quantitative, Logical, Verbal, Technical CS/IT),
and saves them to backend/data/ingested_questions.json and database.

Respects Gemini Free Tier:
- Max 5 questions per prompt
- 4-second delay between requests (~12-14 RPM)
- Auto-retries with backoff on 429 quota limits
- Checkpointing ensures zero progress loss
"""

import argparse
import glob
import json
import os
import re
import sys
import time
from pathlib import Path
import requests
from pypdf import PdfReader

# System prompt for Gemini 2.5 Flash
SYSTEM_PROMPT = """You are an expert technical interviewer and senior placement educator for Indian campus recruitments (TCS NQT / Prime, Infosys, Cognizant, Wipro, Amazon).

Given raw questions extracted from placement papers:
1. Standardize and clean the question text. Format any code snippets cleanly.
2. Extract or generate 4 plausible multiple-choice options: option_a, option_b, option_c, option_d.
3. Solve the question and determine the single correct option: correct_answer ('A', 'B', 'C', or 'D').
4. Assign an accurate difficulty ('EASY', 'MEDIUM', or 'HARD') based on campus placement standards:
   - EASY: Direct formulas, basic definitions, simple 1-step arithmetic or basic syntax.
   - MEDIUM: Multi-step calculations, tricky pointers/memory rules, relative speed, work & time.
   - HARD: Advanced edge cases, recursion, complex time/work systems, probability puzzles.
5. Assign category_name to exactly one of:
   ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Technical CS/IT']
6. Assign a specific topic_name:
   - For Technical CS/IT: 'C & C++ Programming', 'OOPs Concepts', 'Pointers & Memory', 'DBMS & SQL', 'Data Structures', 'Operating Systems'
   - For Quantitative: 'Time & Work', 'Time Speed Distance', 'Percentage', 'Profit & Loss', 'Probability', 'Number System', 'Ratio & Proportion', 'Averages'
   - For Logical: 'Coding-Decoding', 'Number Series', 'Blood Relations', 'Puzzles', 'Direction Sense', 'Syllogisms'
   - For Verbal: 'Vocabulary & Synonyms', 'Sentence Correction', 'Grammar', 'Reading Comprehension'
7. Generate a comprehensive pedagogical explanation with:
   - Core Concept Tested
   - Step-by-Step Calculation or Code Execution Trace
   - Option Elimination: Why other options are incorrect
   - Campus Placement Tip: Shortcut or memory rule for exams

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "A",
    "difficulty": "EASY",
    "category_name": "Technical CS/IT",
    "topic_name": "C & C++ Programming",
    "explanation": "..."
  }
]
No markdown backticks, no wrapping text outside JSON.
"""


def load_gemini_api_key() -> str:
    """Finds GEMINI_API_KEY from environment or .env files."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()

    search_paths = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for env_file in search_paths:
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise ValueError("GEMINI_API_KEY not found in environment or .env file.")


def extract_text_from_pdf(pdf_path: str) -> str:
    """Reads all pages from a PDF and returns clean joined text."""
    reader = PdfReader(pdf_path)
    text_chunks = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_chunks.append(page_text)
    return "\n\n".join(text_chunks)


def split_into_question_chunks(raw_text: str, questions_per_chunk: int = 4) -> list[str]:
    """Splits raw PDF text into manageable question chunks for Gemini batching."""
    lines = raw_text.splitlines()
    question_blocks = []
    current_block = []

    # Regex detecting start of questions: e.g. "1.", "2)", "Q1.", "43."
    q_start_pattern = re.compile(r"^\s*(?:Q\.?\s*)?(\d{1,4})[\.\)]\s+", re.IGNORECASE)

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Check if line looks like beginning of a new question
        if q_start_pattern.match(stripped) and current_block:
            question_blocks.append("\n".join(current_block))
            current_block = [stripped]
        else:
            current_block.append(stripped)

    if current_block:
        question_blocks.append("\n".join(current_block))

    # If regex split failed to find numbered questions, fallback to page/paragraph chunking
    if len(question_blocks) < 2:
        words = raw_text.split()
        chunk_size = 400
        question_blocks = [
            " ".join(words[i : i + chunk_size]) for i in range(0, len(words), chunk_size)
        ]

    # Batch question blocks
    batched = []
    for i in range(0, len(question_blocks), questions_per_chunk):
        batch = "\n\n---\n\n".join(question_blocks[i : i + questions_per_chunk])
        batched.append(batch)

    return batched


def call_gemini_batch(api_key: str, chunk_text: str, max_retries: int = 3) -> list[dict]:
    """Calls Gemini 2.5 Flash to parse, solve, and explain questions."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{SYSTEM_PROMPT}\n\nRAW QUESTIONS TO PROCESS:\n{chunk_text}"}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        },
    }

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(url, json=payload, timeout=45)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Remove markdown fences if model returned them
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed = json.loads(raw_text.strip())
                if isinstance(parsed, list):
                    return parsed
                elif isinstance(parsed, dict) and "questions" in parsed:
                    return parsed["questions"]
                return [parsed]
            elif resp.status_code == 429:
                wait_sec = 25 * attempt
                print(f"  [429 Rate Limit] Pausing {wait_sec}s before retry {attempt}/{max_retries}...")
                time.sleep(wait_sec)
            else:
                print(f"  [API Error {resp.status_code}]: {resp.text[:200]}")
                time.sleep(5)
        except Exception as e:
            print(f"  [Request Exception]: {e}")
            time.sleep(5)

    return []


def load_existing_catalog(output_path: Path) -> list[dict]:
    """Loads existing questions from the JSON catalog."""
    if output_path.exists():
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_catalog(output_path: Path, questions: list[dict]):
    """Safely saves questions to output JSON."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    temp_path.replace(output_path)


def main():
    parser = argparse.ArgumentParser(description="Ingest questions from placement PDFs using Gemini AI")
    parser.add_argument("--pdf-pattern", default=r"d:\Aptitude\Aptitude Pdf*/**/*.pdf", help="Glob pattern for PDFs")
    parser.add_argument("--max-batches", type=int, default=None, help="Limit number of batches to process")
    parser.add_argument("--batch-size", type=int, default=4, help="Questions per Gemini request")
    parser.add_argument("--delay", type=float, default=4.0, help="Seconds delay between requests (Free tier safety)")
    args = parser.parse_args()

    api_key = load_gemini_api_key()
    print(f"[*] Loaded Gemini API Key: {api_key[:6]}...{api_key[-4:]}")

    catalog_path = Path(__file__).resolve().parent.parent / "data" / "ingested_questions.json"
    catalog = load_existing_catalog(catalog_path)
    existing_texts = {q["question_text"].strip().lower() for q in catalog if "question_text" in q}
    print(f"[*] Found {len(catalog)} previously ingested questions in {catalog_path}")

    # Find matching PDFs
    pdf_files = glob.glob(args.pdf_pattern, recursive=True)
    if not pdf_files:
        print(f"[!] No PDFs found matching: {args.pdf_pattern}")
        return

    print(f"[*] Found {len(pdf_files)} PDF file(s) to process:")
    for p in pdf_files:
        print(f"    - {Path(p).name}")

    total_added = 0
    batches_processed = 0

    for pdf_path in pdf_files:
        filename = Path(pdf_path).name
        print(f"\n=======================================================")
        print(f"[*] Processing: {filename}")
        print(f"=======================================================")

        try:
            full_text = extract_text_from_pdf(pdf_path)
        except Exception as e:
            print(f"[!] Failed to read {filename}: {e}")
            continue

        if not full_text.strip():
            print(f"[!] PDF is empty or text unextractable: {filename}")
            continue

        batches = split_into_question_chunks(full_text, questions_per_chunk=args.batch_size)
        print(f"[*] Split into {len(batches)} batches (approx {len(batches) * args.batch_size} raw questions)")

        for b_idx, batch_chunk in enumerate(batches, start=1):
            if args.max_batches and batches_processed >= args.max_batches:
                print(f"[*] Reached --max-batches limit ({args.max_batches}). Stopping.")
                break

            print(f" -> Batch {b_idx}/{len(batches)} ({len(batch_chunk.splitlines())} lines)...", end="", flush=True)
            extracted = call_gemini_batch(api_key, batch_chunk)

            added_in_batch = 0
            for item in extracted:
                q_text = item.get("question_text", "").strip()
                if not q_text:
                    continue

                norm_key = q_text.lower()
                if norm_key in existing_texts:
                    continue

                # Clean fields
                item["source"] = filename
                item["correct_answer"] = item.get("correct_answer", "A").upper()[:1]
                if item["correct_answer"] not in {"A", "B", "C", "D"}:
                    item["correct_answer"] = "A"

                item["difficulty"] = item.get("difficulty", "MEDIUM").upper()
                if item["difficulty"] not in {"EASY", "MEDIUM", "HARD"}:
                    item["difficulty"] = "MEDIUM"

                catalog.append(item)
                existing_texts.add(norm_key)
                added_in_batch += 1

            total_added += added_in_batch
            batches_processed += 1
            print(f" Extracted: {len(extracted)}, New Added: {added_in_batch} (Total: {len(catalog)})")

            # Checkpoint save immediately
            save_catalog(catalog_path, catalog)

            # Free tier throttling
            time.sleep(args.delay)

        if args.max_batches and batches_processed >= args.max_batches:
            break

    print("\n=======================================================")
    print(f"[SUCCESS] Ingestion completed!")
    print(f"[*] New questions added: {total_added}")
    print(f"[*] Total catalog size: {len(catalog)} questions")
    print(f"[*] Catalog saved at: {catalog_path}")
    print("=======================================================")


if __name__ == "__main__":
    main()

