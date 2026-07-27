import asyncio
from sqlalchemy.future import select
from database import get_async_session, init_db
from models import Publicacion

async def check():
    await init_db()
    async for session in get_async_session():
        # Query 15 publications
        stmt = select(Publicacion).limit(15)
        res = await session.execute(stmt)
        pubs = res.scalars().all()
        
        print("SAMPLE PUBLICATIONS IN DB:")
        for p in pubs:
            print(f"ID: {p.id} | id_facebook: {p.id_facebook} | enlace: {p.enlace}")

if __name__ == "__main__":
    asyncio.run(check())
