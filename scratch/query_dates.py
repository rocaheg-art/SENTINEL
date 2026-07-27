import asyncio
from sqlalchemy.future import select
from sqlalchemy import func, Table, MetaData
import sys
sys.path.append("/Users/robertohernandez/Documents/Sentinel/web/backend")
import database
from database import get_async_session, init_db
from models import Publicacion, Ciclo

async def run():
    await init_db()
    async for session in get_async_session():
        res = await session.execute(select(
            func.min(Publicacion.fecha_publicacion),
            func.max(Publicacion.fecha_publicacion),
            func.min(Publicacion.fecha_registro),
            func.max(Publicacion.fecha_registro)
        ))
        min_pub, max_pub, min_reg, max_reg = res.fetchone()
        print(f"Pub dates: {min_pub} to {max_pub}")
        print(f"Reg dates: {min_reg} to {max_reg}")
        
        # Check cycles
        cycle_res = await session.execute(select(func.count(Ciclo.id)))
        cycle_count = cycle_res.scalar()
        print(f"Total cycles: {cycle_count}")
        
        # Reflected query for descartes
        metadata = MetaData()
        async with database.engine.connect() as conn:
            await conn.run_sync(metadata.reflect)
        if "descartes" in metadata.tables:
            descartes_table = metadata.tables["descartes"]
            desc_res = await session.execute(select(func.count(descartes_table.c.id)))
            print(f"Total descartes: {desc_res.scalar()}")
        else:
            print("Descartes table not found in reflected metadata")

if __name__ == "__main__":
    asyncio.run(run())
