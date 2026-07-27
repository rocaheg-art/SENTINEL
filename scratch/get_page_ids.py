import asyncio
from database import init_db, get_async_session
from models import Pagina
from sqlalchemy import select

async def run():
    await init_db()
    async for s in get_async_session():
        res = await s.execute(select(Pagina.id, Pagina.nombre))
        for row in res.all():
            print(f"ID: {row[0]} | Name: {row[1]}")

if __name__ == "__main__":
    asyncio.run(run())
