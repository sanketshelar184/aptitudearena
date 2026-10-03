import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "aptitude.db"

def clean_and_reclassify():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Load categories and topics maps
    cur.execute("SELECT id, name FROM categories")
    cat_by_name = {row[1]: row[0] for row in cur.fetchall()}

    cur.execute("SELECT id, name, category_id FROM topics")
    topics_list = cur.fetchall()
    topic_by_cat_and_name = {(row[2], row[1]): row[0] for row in topics_list}

    print(f"[*] Categories available: {list(cat_by_name.keys())}")

    # -------------------------------------------------------------
    # 1. PURGE IRRELEVANT JUNK / META QUESTIONS
    # -------------------------------------------------------------
    junk_patterns = [
        r"placement pattern",
        r"written test structure",
        r"which book is specifically recommended",
        r"marking scheme specified for the",
        r"score vs correct questions table",
        r"strategy does the author suggest for handling the strict time limits",
        r"interview preparation advice in the text",
        r"how many.*topics are included in the aptitude reasoning test",
        r"how many different topics are included in",
    ]

    cur.execute("SELECT id, question_text FROM questions")
    all_q = cur.fetchall()
    junk_ids = []

    for qid, qt in all_q:
        # Also remove defective Venn diagram image question without premises:
        if qid == "39e08c0aa5d749cfb84e652df8b36eff":
            junk_ids.append((qid, "Defective Venn diagram with answer spoiled and missing premises"))
            continue

        for pat in junk_patterns:
            if re.search(pat, qt, re.IGNORECASE):
                junk_ids.append((qid, qt[:80]))
                break

    print(f"[*] Found {len(junk_ids)} junk/meta questions to delete:")
    for jid, reason in junk_ids:
        print(f"    - Deleting {jid}: {reason}")
        cur.execute("DELETE FROM test_answers WHERE question_id = ?", (jid,))
        cur.execute("DELETE FROM questions WHERE id = ?", (jid,))

    conn.commit()
    print(f"[OK] Deleted {len(junk_ids)} irrelevant/defective questions.")

    # -------------------------------------------------------------
    # 2. STRIP CLUNKY SYLLABUS / PLACEMENT PREFIXES
    # -------------------------------------------------------------
    cur.execute("SELECT id, question_text FROM questions")
    cleaned_prefixes = 0
    prefix_patterns = [
        (r"^Based on Wipro's Applied Mathematics syllabus \(Time, Speed and Distance\),\s*", ""),
        (r"^Based on Wipro's Engineering Mathematics syllabus \(Permutation and Combinations\),\s*", ""),
        (r"^Based on standard Wipro placement paper topics for Basic Mathematics,\s*", ""),
        (r"^Based on the syllabus for Basic Mathematics in Wipro placement papers,\s*", ""),
        (r"^In the context of Wipro Verbal English grammar syllabus \(Subject-Verb Agreement\),\s*", ""),
        (r"^Referring to Wipro's Logical Reasoning syllabus under Inductive Reasoning,\s*", ""),
        (r"^Based on the standard synonym pairs typically tested in TCS placement papers,\s*", ""),
        (r"^Find the synonym of the word 'Cargo' as given in the TCS placement paper context\.", "Find the synonym of the word 'Cargo'."),
        (r"^Choose the correct synonym for 'Baffle' based on the provided text\.", "Choose the correct synonym for 'Baffle'."),
        (r"^Based on the technical subjects mentioned for IT placement papers like MBT/TCS,\s*", ""),
        (r"^Based on standard TCS behavioral and situational judgment assessment patterns,\s*", ""),
    ]

    for qid, qt in cur.fetchall():
        new_text = qt
        for pat, repl in prefix_patterns:
            new_text = re.sub(pat, repl, new_text, flags=re.IGNORECASE)
        # Capitalize first letter if it was lowercased after strip
        if new_text and new_text[0].islower():
            new_text = new_text[0].upper() + new_text[1:]
        if new_text != qt:
            cur.execute("UPDATE questions SET question_text = ? WHERE id = ?", (new_text, qid))
            cleaned_prefixes += 1

    conn.commit()
    print(f"[OK] Cleaned clunky prefixes from {cleaned_prefixes} questions.")

    # -------------------------------------------------------------
    # 3. RECLASSIFY QUESTIONS TO PROPER TOPICS WITHIN THEIR CATEGORY
    # -------------------------------------------------------------
    cur.execute("""
        SELECT q.id, q.question_text, c.name, t.name, q.explanation 
        FROM questions q 
        JOIN categories c ON q.category_id = c.id 
        JOIN topics t ON q.topic_id = t.id
    """)
    rows = cur.fetchall()

    reclassified_count = 0

    for qid, qt, cat_name, top_name, exp in rows:
        q_lower = (qt + " " + (exp or "")).lower()
        new_topic = None

        # --- A. LOGICAL REASONING ---
        if cat_name == "Logical Reasoning":
            if any(w in q_lower for w in ["north", "south", "east", "west", "towards left", "towards right", "km towards", "m towards"]):
                new_topic = "Direction Sense"
            elif any(w in q_lower for w in ["all the ", "some ", "no ", "conclusion", "syllogism", "statements:"]):
                new_topic = "Syllogisms"
            elif any(w in q_lower for w in ["brother", "sister", "mother", "father", "son", "daughter", "widower", "uncle", "aunt", "grandmother", "cousin"]):
                new_topic = "Blood Relations"
            elif any(w in q_lower for w in ["figure", "cube", "cubelets", "different from the rest", "odd-one-out", "matrix", "diagram", "watch"]):
                new_topic = "Visual & Non-Verbal Reasoning"
            elif any(w in q_lower for w in ["coded language", "coded as", "stands for", "written as", "coding"]):
                new_topic = "Coding-Decoding"
            elif any(w in q_lower for w in ["next number in the series", "missing number in the given series", "number series", "missing term in the"]):
                if re.search(r"[a-z],\s*[a-z],\s*", q_lower):
                    new_topic = "Alphabet Series"
                else:
                    new_topic = "Number Series"
            elif any(w in q_lower for w in ["alphabetical letter series", "alphabet series", "repeating letters"]):
                new_topic = "Alphabet Series"
            elif any(w in q_lower for w in ["shorter than", "taller than", "tallest", "sitting around", "circular table", "row"]):
                new_topic = "Seating Arrangement"
            elif any(w in q_lower for w in ["statement", "conditional statement", "argument", "premise"]):
                new_topic = "Statement & Conclusion"
            else:
                # Default for deductive riddles, cryptarithmetic, tournament, murder cases, etc.
                new_topic = "Puzzles"

        # --- B. VERBAL ABILITY ---
        elif cat_name == "Verbal Ability":
            if any(w in q_lower for w in ["synonym", "same meaning", "similar in meaning"]):
                new_topic = "Synonyms"
            elif any(w in q_lower for w in ["antonym", "opposite in meaning"]):
                new_topic = "Antonyms"
            elif any(w in q_lower for w in ["fill in the blank", "____", "blank ("]):
                new_topic = "Fill in the Blanks"
            elif any(w in q_lower for w in ["correct sentence", "error", "grammatical", "spot the error"]):
                new_topic = "Sentence Correction"
            elif any(w in q_lower for w in ["passage", "author", "according to the passage", "survey conducted"]):
                new_topic = "Reading Comprehension"
            else:
                new_topic = "Vocabulary"

        # --- C. TECHNICAL CS/IT ---
        elif cat_name == "Technical CS/IT":
            if any(w in q_lower for w in ["binary tree", "data structure", "fifo", "stack", "queue", "linked list", "array", "graph", "hash"]):
                new_topic = "Data Structures"
            elif any(w in q_lower for w in ["c language", "c++", "printf", "sizeof", "loop", "variable", "function", "pointer", "syntax"]):
                new_topic = "C & C++ Programming"
            elif any(w in q_lower for w in ["oops", "polymorphism", "inheritance", "class", "virtual function", "encapsulation"]):
                new_topic = "OOPs Concepts"
            elif any(w in q_lower for w in ["operating system", "run level", "process", "thread", "unix", "linux", "deadlock"]):
                new_topic = "Operating Systems"
            elif any(w in q_lower for w in ["dbms", "normalization", "sql", "table", "dependency"]):
                new_topic = "DBMS & SQL"
            elif any(w in q_lower for w in ["network", "packet", "protocol", "tcp", "ip", "osi"]):
                new_topic = "Computer Networks"
            else:
                new_topic = "C & C++ Programming"

        # --- D. QUANTITATIVE APTITUDE ---
        elif cat_name == "Quantitative Aptitude":
            if top_name == "Number System":
                if any(w in q_lower for w in ["speed", "km/h", "train", "distance", "covers", "walking"]):
                    new_topic = "Time Speed Distance"
                elif any(w in q_lower for w in ["percent", "% of", "percentage"]):
                    new_topic = "Percentage"
                elif any(w in q_lower for w in ["profit", "loss", "cost price", "selling price", "discount", "marked price"]):
                    new_topic = "Profit & Loss"
                elif any(w in q_lower for w in ["ratio", "proportion", "divided in the ratio"]):
                    new_topic = "Ratio & Proportion"
                elif any(w in q_lower for w in ["days to complete", "work together", "pipes", "tank", "cistern"]):
                    new_topic = "Time & Work"
                elif any(w in q_lower for w in ["compound interest"]):
                    new_topic = "Compound Interest"
                elif any(w in q_lower for w in ["simple interest"]):
                    new_topic = "Simple Interest"
                elif any(w in q_lower for w in ["probability", "dice", "cards", "balls are drawn"]):
                    new_topic = "Probability"
                elif any(w in q_lower for w in ["chart", "table detailing", "pie-chart", "production of product"]):
                    new_topic = "Data Interpretation"
                else:
                    new_topic = "Number System"

        # Update if a valid topic in this category was identified
        if new_topic and new_topic != top_name:
            cat_id = cat_by_name[cat_name]
            target_topic_id = topic_by_cat_and_name.get((cat_id, new_topic))
            if target_topic_id:
                cur.execute("UPDATE questions SET topic_id = ? WHERE id = ?", (target_topic_id, qid))
                reclassified_count += 1

    conn.commit()
    print(f"[OK] Reclassified {reclassified_count} questions into correct category topics.")

    # Verify no cross-category mismatches remain
    cur.execute("""
        SELECT count(*) 
        FROM questions q
        JOIN categories c ON q.category_id = c.id
        JOIN topics t ON q.topic_id = t.id
        WHERE q.category_id != t.category_id
    """)
    mismatches_left = cur.fetchone()[0]
    print(f"[*] Cross-category mismatches remaining: {mismatches_left}")

    # Print final topic distribution
    print("\n--- UPDATED TOPIC DISTRIBUTION ---")
    cur.execute("""
        SELECT c.name, t.name, count(q.id)
        FROM categories c
        JOIN topics t ON t.category_id = c.id
        LEFT JOIN questions q ON q.topic_id = t.id
        GROUP BY c.name, t.name
        HAVING count(q.id) > 0
        ORDER BY c.name, count(q.id) DESC
    """)
    for r in cur.fetchall():
        print(f"  {r[0]:<22} | {r[1]:<32} | {r[2]} questions")

    cur.execute("SELECT count(*) FROM questions")
    total_q = cur.fetchone()[0]
    print(f"\n[*] Total clean questions in database: {total_q}")

    conn.close()

if __name__ == "__main__":
    clean_and_reclassify()
