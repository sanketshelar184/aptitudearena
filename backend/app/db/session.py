import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


settings = get_settings()


def create_db_engine():
    db_url = settings.database_url

    if "postgresql" in db_url:
        try:
            # Check if PostgreSQL is reachable within 2 seconds
            test_eng = create_engine(db_url, connect_args={"connect_timeout": 2}, pool_pre_ping=True)
            with test_eng.connect():
                pass
            return test_eng
        except Exception as e:
            logger.warning(
                f"PostgreSQL at {db_url} is unreachable ({type(e).__name__}). "
                "Seamlessly falling back to local SQLite database (sqlite:///./aptitude.db)."
            )
            db_url = "sqlite:///./aptitude.db"

    connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
    eng = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
    if "sqlite" in db_url:
        Base.metadata.create_all(eng)
    return eng


engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
