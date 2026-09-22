import os
import sys
import sqlite3
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.db.session import Base
from app.models.taxonomy import Category, Topic
from app.models.question import Question
from app.models.test import Test, TestQuestion
from app.models.user import User
from app.models.commerce import Product

SQLITE_PATH = Path(__file__).resolve().parent.parent / "aptitude.db"

def sync_database(target_db_url: str | None = None):
    settings = get_settings()
    db_url = target_db_url or settings.database_url
    if "sqlite" in db_url:
        print("[*] Target is already SQLite. Nothing to sync.")
        return

    print(f"[*] Connecting to Target Database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    target_engine = create_engine(db_url, pool_pre_ping=True)
    
    # Ensure tables exist
    print("[*] Ensuring all tables exist in target database...")
    Base.metadata.create_all(target_engine)
    TargetSession = sessionmaker(bind=target_engine)
    db = TargetSession()

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    cur = sqlite_conn.cursor()

    # 1. Sync Categories
    print("[*] Syncing Categories...")
    cur.execute("SELECT * FROM categories")
    for row in cur.fetchall():
        d = dict(row)
        existing = db.query(Category).filter_by(id=d["id"]).first()
        if not existing:
            cat = Category(**d)
            db.add(cat)
    db.commit()

    # 2. Sync Topics
    print("[*] Syncing Topics...")
    cur.execute("SELECT * FROM topics")
    for row in cur.fetchall():
        d = dict(row)
        existing = db.query(Topic).filter_by(id=d["id"]).first()
        if not existing:
            top = Topic(**d)
            db.add(top)
    db.commit()

    # 3. Sync Products
    print("[*] Syncing Products...")
    cur.execute("SELECT * FROM products")
    for row in cur.fetchall():
        d = dict(row)
        existing = db.query(Product).filter_by(id=d["id"]).first()
        if not existing:
            prod = Product(**d)
            db.add(prod)
    db.commit()

    # 4. Sync Admin Users
    print("[*] Syncing Users...")
    cur.execute("SELECT * FROM users")
    for row in cur.fetchall():
        d = dict(row)
        existing = db.query(User).filter_by(id=d["id"]).first()
        if not existing:
            usr = User(**d)
            db.add(usr)
    db.commit()

    # 5. Sync Tests
    print("[*] Syncing Tests...")
    cur.execute("SELECT * FROM tests")
    for row in cur.fetchall():
        d = dict(row)
        existing = db.query(Test).filter_by(id=d["id"]).first()
        if not existing:
            t = Test(**d)
            db.add(t)
    db.commit()

    # 6. Sync Questions (629 questions)
    print("[*] Syncing Questions...")
    cur.execute("SELECT * FROM questions")
    q_rows = cur.fetchall()
    added_q = 0
    for row in q_rows:
        d = dict(row)
        existing = db.query(Question).filter_by(id=d["id"]).first()
        if not existing:
            q = Question(**d)
            db.add(q)
            added_q += 1
            if added_q % 100 == 0:
                db.commit()
    db.commit()

    # Summary
    total_cats = db.query(func.count(Category.id)).scalar()
    total_topics = db.query(func.count(Topic.id)).scalar()
    total_tests = db.query(func.count(Test.id)).scalar()
    total_questions = db.query(func.count(Question.id)).scalar()

    print("==================================================")
    print(f"[OK] Database sync complete!")
    print(f"     Categories : {total_cats}")
    print(f"     Topics     : {total_topics}")
    print(f"     Tests      : {total_tests}")
    print(f"     Questions  : {total_questions}")
    print("==================================================")

    db.close()
    sqlite_conn.close()

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    sync_database(target)

