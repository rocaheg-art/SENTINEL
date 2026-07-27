import os
import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.sql import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel_db")

class Settings(BaseSettings):
    # Default to cloud PostgreSQL values to avoid local configuration overrides in cloud environments
    DB_HOST: str = "89.117.148.156"
    DB_PORT: int = 5433
    DB_USER: str = "sentinel"
    DB_PASSWORD: str = "sentinel_local"
    DB_NAME: str = "sentinel"
    DB_SSL: bool = False

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Force strict production PostgreSQL connection string
pg_url = f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

engine = None
async_session_maker = None
db_type = "POSTGRES"

async def init_db():
    global engine, async_session_maker
    
    logger.info(f"Connecting strictly to production PostgreSQL database at {settings.DB_HOST}:{settings.DB_PORT}...")
    connect_args = {}
    if settings.DB_SSL:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx
        logger.info("Enabling SSL context for PostgreSQL.")
        
    try:
        temp_engine = create_async_engine(
            pg_url, 
            echo=False, 
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=15,
            max_overflow=25
        )
        # Test connection strictly. If it fails, raise the exception immediately.
        async with temp_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        from models import Base
        async with temp_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        engine = temp_engine
        logger.info("Strict database initialization complete. Connected to cloud PostgreSQL.")
    except Exception as e:
        logger.error(f"FATAL: Failed to connect to cloud PostgreSQL database: {e}")
        raise e

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
