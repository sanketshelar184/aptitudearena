import sqlite3
import uuid
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "aptitude.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT id, name FROM categories")
cats = {r[1].lower(): r[0] for r in cur.fetchall()}
quant_id = cats.get("quantitative aptitude")
logical_id = cats.get("logical reasoning")
verbal_id = cats.get("verbal ability")
tech_id = cats.get("technical cs/it")

new_tests = [
    (
        "TCS NQT Comprehensive Placement Sprint",
        "Calibrated 20-question TCS National Qualifier Test (NQT) practice test covering core numerical aptitude, reasoning logic, and verbal ability foundations.",
        20, 1200, None, "EASY", 0, 0, 10, 0.0, "PUBLISHED"
    ),
    (
        "TCS Advanced Quantitative & Coding Sprint",
        "Rigorous 20-question TCS Digital & Ninja advanced assessment featuring higher-order mathematical problem solving, algorithm tracing, and logical puzzles.",
        20, 1200, None, "HARD", 0, 1, 10, 0.25, "PUBLISHED"
    ),
    (
        "Infosys Quantitative & Analytical Placement Sprint",
        "20 questions covering Infosys standard campus test format: cryptographic arithmetic, data sufficiency, syllogisms, and speed quantitative problems.",
        20, 1200, logical_id, "MEDIUM", 0, 1, 10, 0.25, "PUBLISHED"
    ),
    (
        "Infosys Advanced Systems Engineer (DSE/SP) Mock",
        "Challenging 20-question placement sprint designed for Specialist Programmer and Digital Specialist Engineer roles at Infosys with advanced reasoning and CS/IT.",
        20, 1200, tech_id, "HARD", 0, 1, 10, 0.25, "PUBLISHED"
    ),
    (
        "Wipro Elite NLTH Placement Challenge",
        "Complete 20-question practice mock simulating Wipro Elite National Talent Hunt (NLTH) covering quantitative ability, logical deduction, and verbal patterns.",
        20, 1200, None, "MEDIUM", 0, 1, 10, 0.25, "PUBLISHED"
    ),
    (
        "Tech Mahindra Numerical & Analytical Sprint",
        "20 questions calibrated to Tech Mahindra placement papers covering numerical series, critical reasoning, and technical computer literacy.",
        20, 1200, quant_id, "MEDIUM", 0, 1, 10, 0.25, "PUBLISHED"
    ),
]

added = 0
for name, desc, q_count, dur, cat_id, diff, is_free, is_prem, price, neg_mark, status in new_tests:
    cur.execute("SELECT id FROM tests WHERE LOWER(name) = LOWER(?)", (name,))
    if cur.fetchone():
        print(f"[-] Already exists: {name}")
        continue
    t_id = uuid.uuid4().hex
    cur.execute(
        """INSERT INTO tests (
            id, name, description, question_count, duration_seconds, category_id,
            difficulty, is_free, is_premium, price_inr, negative_marking_ratio,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))""",
        (t_id, name, desc, q_count, dur, cat_id, diff, is_free, is_prem, price, neg_mark, status)
    )
    added += 1
    print(f"[+] Added Test: {name} ({diff})")

conn.commit()
cur.execute("SELECT count(*) FROM tests")
print(f"[*] Total tests in DB now: {cur.fetchone()[0]}")
conn.close()

