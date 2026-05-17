from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Use PostgreSQL in production/dev, SQLite as fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./freshfood.db")

# PostgreSQL requires different connect_args than SQLite
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        echo=os.getenv("DEBUG", "False") == "True",
        pool_size=20,
        max_overflow=0,
        pool_pre_ping=True,
    )
else:
    # SQLite fallback for compatibility
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("DEBUG", "False") == "True",
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to provide database session for each request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()