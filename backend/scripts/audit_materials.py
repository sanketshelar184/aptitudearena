from pathlib import Path
import pypdf

base = Path("Aptitude Pdf's")
total_docs = 0
total_pdf_pages = 0

for comp in ["Infosys", "TCS", "Wipro", "Tech Mahindra"]:
    cpath = base / comp
    files = list(cpath.rglob("*"))
    doc_files = [f for f in files if f.is_file() and f.suffix.lower() in (".pdf", ".docx", ".htm", ".html", ".txt")]
    print(f"\n=== {comp}: {len(doc_files)} documents ===", flush=True)
    total_docs += len(doc_files)
    for f in doc_files:
        pg_info = ""
        if f.suffix.lower() == ".pdf":
            try:
                reader = pypdf.PdfReader(str(f))
                num_pg = len(reader.pages)
                total_pdf_pages += num_pg
                pg_info = f"({num_pg} pages)"
            except Exception as e:
                pg_info = f"(PDF error: {e})"
        else:
            pg_info = f"({f.stat().st_size} bytes)"
        print(f"  - {f.name} {pg_info}", flush=True)

print(f"\nTOTAL DOCUMENTS: {total_docs}", flush=True)
print(f"TOTAL PDF PAGES: {total_pdf_pages}", flush=True)

