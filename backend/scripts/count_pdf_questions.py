import sys
from pathlib import Path
import pypdf
import re

base = Path("d:/Aptitude/Aptitude Pdf's")
all_pdfs = sorted(list(base.rglob("*.pdf")))
total_pages = 0
total_images = 0
estimated_questions = 0

print(f"[*] Total PDF files in 'Aptitude Pdf\'s': {len(all_pdfs)}")

company_stats = {}
for p in all_pdfs:
    rel = p.relative_to(base)
    company = rel.parts[0] if len(rel.parts) > 1 else "Other"
    if company not in company_stats:
        company_stats[company] = {"files": 0, "pages": 0, "images": 0, "q_estimate": 0}
    try:
        reader = pypdf.PdfReader(str(p))
        num_pages = len(reader.pages)
        img_count = sum(len(pg.images) for pg in reader.pages)
        
        # Count occurrences of question patterns (e.g. Q1., 1), Question 1, etc.)
        doc_q_count = 0
        for pg in reader.pages:
            txt = pg.extract_text() or ""
            # Match question numbers like "Q.1", "Q1.", "1.", "1)" at line start
            matches = re.findall(r"(?:^|\n)\s*(?:Q\.?\s*\d+|\d+[\.\)])\s+", txt)
            doc_q_count += len(matches)
        
        company_stats[company]["files"] += 1
        company_stats[company]["pages"] += num_pages
        company_stats[company]["images"] += img_count
        company_stats[company]["q_estimate"] += doc_q_count
        total_pages += num_pages
        total_images += img_count
        estimated_questions += doc_q_count
    except Exception as e:
        print(f"[!] Error reading {p.name}: {e}")

print("\n=== COMPANY-WISE INVENTORY IN YOUR PDF FOLDER ===")
for comp, s in company_stats.items():
    print(f"• {comp:15}: {s['files']} PDF(s) | {s['pages']:4} Pages | ~{s['q_estimate']:4} Text Questions | {s['images']:3} Diagrams/Photos")

print(f"\n[+] GRAND TOTAL ACROSS ALL COMPANY FOLDERS:")
print(f"    - Total Documents:         {len(all_pdfs)} files (plus HTML & TXT files)")
print(f"    - Total Pages:             {total_pages} pages")
print(f"    - Estimated Questions:     ~{estimated_questions} questions!")
print(f"    - Embedded Diagrams/Photos:{total_images} images")

