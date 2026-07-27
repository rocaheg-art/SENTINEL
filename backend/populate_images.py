import asyncio
from minio import Minio
from sqlalchemy.future import select
from sqlalchemy import delete
from database import get_async_session, init_db
from models import Publicacion, ImagenPublicacion

async def run_populate():
    await init_db()
    
    # 1. Connect to MinIO and list all files in the sentinel-media bucket
    endpoint = "10.16.3.122:9002"
    access_key = "sentinel_minio"
    secret_key = "sentinel_minio_secret"
    bucket_name = "sentinel-media"
    
    print(f"Connecting to MinIO S3 API at {endpoint}...")
    client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=False)
    
    print("Listing files in bucket 'sentinel-media'...")
    objects = client.list_objects(bucket_name, prefix="facebook/posts/", recursive=True)
    
    # Map from id_facebook to list of object info
    # Each item: (object_name, order)
    fb_id_to_objects = {}
    total_objects = 0
    
    for obj in objects:
        parts = obj.object_name.split('/')
        # Expected path: facebook/posts/{id_facebook}/{filename}
        if len(parts) >= 4:
            fb_id = parts[2]
            filename = parts[3]
            
            # Determine order from prefix (e.g., "00_filename" -> 0, "01_filename" -> 1)
            order = 0
            if "_" in filename:
                prefix = filename.split("_")[0]
                try:
                    order = int(prefix)
                except ValueError:
                    pass
            
            if fb_id not in fb_id_to_objects:
                fb_id_to_objects[fb_id] = []
            
            fb_id_to_objects[fb_id].append((obj.object_name, order))
            total_objects += 1
            
    print(f"Found {total_objects} images across {len(fb_id_to_objects)} unique Facebook post folders in MinIO.")
    
    if not fb_id_to_objects:
        print("No images found to process!")
        return

    # 2. Query database for publications mapping
    async for session in get_async_session():
        # Clear existing ImagenPublicacion records
        print("Clearing existing records in 'imagenes_publicacion' table...")
        await session.execute(delete(ImagenPublicacion))
        await session.commit()
        
        # Query all publications to get an id_facebook -> id map
        print("Querying publications from database...")
        stmt = select(Publicacion.id, Publicacion.id_facebook)
        res = await session.execute(stmt)
        pubs = res.all()
        
        # Build map: id_facebook (str) -> publicacion_id (str)
        # Note: both could be strings or integers, we cast to string to be safe
        fb_id_to_pub_id = {}
        for pub_id, fb_id in pubs:
            if fb_id:
                fb_id_to_pub_id[str(fb_id)] = str(pub_id)
            if pub_id:
                fb_id_to_pub_id[str(pub_id)] = str(pub_id)  # Also map directly by id just in case
                
        print(f"Loaded {len(fb_id_to_pub_id)} publication IDs from DB.")
        
        # 3. Create ImagenPublicacion records
        inserted_count = 0
        skipped_count = 0
        
        for fb_id, items in fb_id_to_objects.items():
            pub_id = fb_id_to_pub_id.get(str(fb_id))
            if not pub_id:
                skipped_count += len(items)
                continue
                
            # Insert each image for this publication
            for obj_name, order in items:
                # Construct public URL
                public_url = f"http://{endpoint}/{bucket_name}/{obj_name}"
                
                img_record = ImagenPublicacion(
                    publicacion_id=pub_id,
                    url=public_url,
                    orden=order
                )
                session.add(img_record)
                inserted_count += 1
                
        print(f"Committing {inserted_count} new image records to database (skipped {skipped_count} unmatched files)...")
        await session.commit()
        print("Database population completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_populate())
