from minio import Minio
import urllib3

def test_minio():
    access_key = "sentinel_minio"
    secret_key = "sentinel_minio_secret"
    endpoint = "10.16.3.122:9002"
    bucket_name = "sentinel-media"
    
    print(f"Connecting to MinIO S3 API at {endpoint}...")
    try:
        client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False
        )
        
        # 1. List objects and get the first one to test access
        objects = client.list_objects(bucket_name, recursive=True)
        first_obj = None
        for obj in objects:
            first_obj = obj
            break
            
        if not first_obj:
            print("No objects found in sentinel-media bucket!")
            return
            
        print(f"Testing public access for object: {first_obj.object_name}")
        
        # Construct public URL
        public_url = f"http://10.16.3.122:9002/{bucket_name}/{first_obj.object_name}"
        print(f"Public URL: {public_url}")
        
        import requests
        res = requests.get(public_url)
        print(f"Anonymous GET response code: {res.status_code}")
        
        if res.status_code == 200:
            print("Bucket sentinel-media is already PUBLIC!")
        else:
            print("Bucket sentinel-media is PRIVATE. Setting policy to public read...")
            # Set bucket policy to public read
            # Policy JSON for read-only access to all anonymous users
            import json
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }
                ]
            }
            client.set_bucket_policy(bucket_name, json.dumps(policy))
            print("Bucket policy set to public read successfully!")
            
            # Re-test access
            res2 = requests.get(public_url)
            print(f"Re-test anonymous GET response code: {res2.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_minio()
