import csv
import io

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import Difficulty
from app.models.taxonomy import Category, Topic
from app.schemas.admin import ImportErrorRow, ImportPreview, QuestionCreate

CSV_HEADERS = (
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
    "explanation",
    "category",
    "topic",
    "difficulty",
    "estimated_time_seconds",
    "is_premium",
    "source",
)

REQUIRED_HEADERS = (
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
    "explanation",
    "category",
    "topic",
    "difficulty",
    "estimated_time_seconds",
    "is_premium",
)


def csv_template() -> str:
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(CSV_HEADERS)
    writer.writerow([
        "What is 25% of 80?",
        "15",
        "20",
        "25",
        "30",
        "B",
        "25% of 80 is (25/100) * 80 = 20.",
        "Quantitative Aptitude",
        "Percentage",
        "EASY",
        "30",
        "false",
        "TCS NQT 2024",
    ])
    return stream.getvalue()


def _boolean(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    raise ValueError("is_premium must be true or false")


def validate_csv(content: bytes, db: Session) -> ImportPreview:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("CSV must be UTF-8 encoded") from error

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV file has no headers")

    present_headers = {h.strip() for h in reader.fieldnames if h}
    missing = sorted(set(CSV_HEADERS) - present_headers)
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")

    categories = {category.name.casefold(): category for category in db.scalars(select(Category)).all()}
    topics = {(topic.category_id, topic.name.casefold()): topic for topic in db.scalars(select(Topic)).all()}

    valid_rows: list[QuestionCreate] = []
    invalid_rows: list[ImportErrorRow] = []
    total_rows = 0

    for row_number, row in enumerate(reader, start=2):
        total_rows += 1
        errors: list[str] = []

        for header in REQUIRED_HEADERS:
            val = (row.get(header) or "").strip()
            if not val:
                errors.append(f"Missing {header}")

        raw_category = (row.get("category") or "").strip()
        category = categories.get(raw_category.casefold()) if raw_category else None
        if not category:
            errors.append(f"Unknown category '{raw_category}'")

        raw_topic = (row.get("topic") or "").strip()
        topic = topics.get((category.id, raw_topic.casefold())) if (category and raw_topic) else None
        if category and not topic:
            errors.append(f"Unknown topic '{raw_topic}' for category '{category.name}'")

        raw_diff = (row.get("difficulty") or "").strip().upper()
        diff = None
        if raw_diff:
            try:
                diff = Difficulty(raw_diff)
            except ValueError:
                errors.append(f"Invalid difficulty '{raw_diff}'. Must be EASY, MEDIUM, or HARD")

        time_secs = 30
        raw_time = (row.get("estimated_time_seconds") or "").strip()
        if raw_time:
            try:
                time_secs = int(raw_time)
                if time_secs < 5 or time_secs > 900:
                    errors.append("estimated_time_seconds must be between 5 and 900")
            except ValueError:
                errors.append("estimated_time_seconds must be an integer")

        is_prem = False
        raw_prem = (row.get("is_premium") or "").strip()
        if raw_prem:
            try:
                is_prem = _boolean(raw_prem)
            except ValueError as e:
                errors.append(str(e))

        raw_ans = (row.get("correct_answer") or "").strip().upper()
        if raw_ans and raw_ans not in {"A", "B", "C", "D"}:
            errors.append(f"Invalid correct_answer '{raw_ans}'. Must be A, B, C, or D")

        source_val = (row.get("source") or "").strip() or None

        payload: QuestionCreate | None = None
        if not errors:
            try:
                payload = QuestionCreate(
                    question_text=(row.get("question_text") or "").strip(),
                    option_a=(row.get("option_a") or "").strip(),
                    option_b=(row.get("option_b") or "").strip(),
                    option_c=(row.get("option_c") or "").strip(),
                    option_d=(row.get("option_d") or "").strip(),
                    correct_answer=raw_ans,
                    explanation=(row.get("explanation") or "").strip(),
                    category_id=category.id,
                    topic_id=topic.id,
                    difficulty=diff,
                    estimated_time_seconds=time_secs,
                    is_premium=is_prem,
                    source=source_val,
                )
            except (ValueError, TypeError) as error:
                errors.append(str(error))
                payload = None

        if errors:
            invalid_rows.append(ImportErrorRow(row=row_number, errors=errors))
        elif payload:
            valid_rows.append(payload)

    return ImportPreview(total_rows=total_rows, valid_rows=valid_rows, invalid_rows=invalid_rows)
