import asyncio
from minio import Minio
from sqlalchemy.future import select
from database import get_async_session, init_db
from models import Publicacion

async def find_matches():
    await init_db()
    
    # 1. Connect to MinIO and list all post IDs
    endpoint = "10.16.3.122:9002"
    access_key = "sentinel_minio"
    secret_key = "sentinel_minio_secret"
    bucket_name = "sentinel-media"
    
    client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)
    objects = client.list_objects(bucket_name, prefix="facebook/posts/", recursive=True)
    
    post_ids = set()
    # Path is facebook/posts/{post_id}/filename
    for obj in objects:
        parts = obj.object_name.split('/')
        if len(parts) >= 4:
            post_id = parts[2]
            post_ids.add(post_id)
            
    print(f"Total unique post IDs found in MinIO: {len(post_ids)}")
    if not post_ids:
        print("No post IDs found in MinIO prefix 'facebook/posts/'")
        return
        
    print(f"Sample post IDs from MinIO: {list(post_ids)[:10]}")
    
    # 2. Query the database for matches
    async for session in get_async_session():
        stmt = select(Publicacion).where(Publicacion.id_facebook.in_(list(post_ids)))
        res = await session.execute(stmt)
        matched_pubs = res.scalars().all()
        
        print(f"Total matching publications in DB: {len(matched_pubs)}")
        for p in matched_pubs[:15]:
            print(f"Match - ID: {p.id} | id_facebook: {p.id_facebook} | content: {p.contenido[:50]}...")

if __name__ == "__main__":
    asyncio.run(find_matches())
