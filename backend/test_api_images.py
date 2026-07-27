import asyncio
from sqlalchemy.future import select
from database import get_async_session, init_db, db_type
from models import Publicacion, ImagenPublicacion

async def test_images():
    await init_db()
    print(f"Connected to database type: {db_type}")
    
    async for session in get_async_session():
        # Query total count of images
        from sqlalchemy import func
        count_stmt = select(func.count(ImagenPublicacion.id))
        count_res = await session.execute(count_stmt)
        total_count = count_res.scalar() or 0
        print(f"Total ImagenPublicacion records in database: {total_count}")
        
        # Query some images
        stmt = select(ImagenPublicacion).limit(20)
        result = await session.execute(stmt)
        images = result.scalars().all()
        
        for img in images:
            print(f"  - ID: {img.id} | Pub ID: {img.publicacion_id} | Order: {img.orden} | URL: {img.url}")

if __name__ == "__main__":
    asyncio.run(test_images())
