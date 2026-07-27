import asyncio
from sqlalchemy.future import select
from sqlalchemy import func
from database import get_async_session, init_db, db_type
from models import Publicacion

async def test_conn():
    print("Initializing DB...")
    await init_db()
    print(f"Connected to database type: {db_type}")
    
    async for session in get_async_session():
        # Query total publications count
        total_stmt = select(func.count(Publicacion.id))
        total_res = await session.execute(total_stmt)
        total_count = total_res.scalar()
        print(f"Total publications: {total_count}")
        
        # Query categories
        cat_stmt = select(Publicacion.categoria, func.count(Publicacion.id)).group_by(Publicacion.categoria)
        cat_res = await session.execute(cat_stmt)
        print("\n=== CATEGORIES ===")
        for cat, count in cat_res.all():
            print(f"  - '{cat}': {count}")
            
        # Query authors
        auth_stmt = select(Publicacion.autor, func.count(Publicacion.id)).group_by(Publicacion.autor)
        auth_res = await session.execute(auth_stmt)
        print("\n=== AUTHORS ===")
        for auth, count in auth_res.all():
            print(f"  - '{auth}': {count}")

if __name__ == "__main__":
    asyncio.run(test_conn())

