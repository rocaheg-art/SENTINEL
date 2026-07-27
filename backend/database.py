import os
import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.sql import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel_db")

class Settings(BaseSettings):
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "sentinel_analytics"
    DB_SSL: bool = False
    SQLITE_DB_PATH: str = "../sentinel_analytics.db"
    USE_FALLBACK_SQLITE: bool = True

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Build connection strings
pg_url = f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
mysql_url = f"mysql+aiomysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

# Resolve the absolute path for SQLite
sqlite_absolute_path = Path(__file__).parent / settings.SQLITE_DB_PATH
sqlite_url = f"sqlite+aiosqlite:///{sqlite_absolute_path.resolve()}"

# Initialize engine variables
engine = None
async_session_maker = None
db_type = "UNKNOWN"

async def init_db():
    global engine, async_session_maker, db_type
    
    # Try PostgreSQL first
    try:
        logger.info(f"Attempting to connect to PostgreSQL at {settings.DB_HOST}:{settings.DB_PORT}...")
        connect_args = {}
        if settings.DB_SSL:
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ctx
            logger.info("Enabling SSL context for PostgreSQL.")
            
        temp_engine = create_async_engine(pg_url, echo=False, connect_args=connect_args)
        async with temp_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        from models import Base
        async with temp_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        engine = temp_engine
        db_type = "POSTGRES"
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as pg_err:
        logger.warning(f"PostgreSQL connection failed: {pg_err}. Trying MySQL...")
        # Try MySQL
        try:
            temp_engine = create_async_engine(mysql_url, echo=False)
            async with temp_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            from models import Base
            async with temp_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            engine = temp_engine
            db_type = "MYSQL"
            logger.info("Successfully connected to MySQL database.")
        except Exception as mysql_err:
            logger.warning(f"MySQL connection failed: {mysql_err}")
            if settings.USE_FALLBACK_SQLITE:
                logger.info(f"Falling back to SQLite database at {sqlite_absolute_path.resolve()}...")
                temp_engine = create_async_engine(sqlite_url, echo=False)
                from models import Base
                async with temp_engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                engine = temp_engine
                db_type = "SQLITE"
            else:
                raise mysql_err

    async_session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

async def get_async_session():
    global async_session_maker
    if async_session_maker is None:
        await init_db()
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
