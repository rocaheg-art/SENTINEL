import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("Authenticating...")
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "username": "admin",
        "password": "sentinel2026"
    }
    
    try:
        r = requests.post(login_url, json=login_payload)
        if r.status_code != 200:
            print(f"Login failed: {r.status_code} - {r.text}")
            return
        
        token = r.json().get("access_token")
        print("Login successful! Token acquired.")
    except Exception as e:
        print(f"Error during login: {e}")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        ("/api/overview", "GET", None),
        ("/api/publicaciones?limit=5", "GET", None),
        ("/api/paginas", "GET", None),
        ("/api/sentimiento", "GET", None),
        ("/api/severidad", "GET", None),
        ("/api/descartes?estado_validacion=pendiente", "GET", None),
        ("/api/sistema/workers", "GET", None),
        ("/api/sistema/ciclos?limit=5", "GET", None),
        ("/api/sistema/staging", "GET", None),
        ("/api/metricas-diarias", "GET", None),
        ("/api/observatorio", "GET", None)
    ]
    
    valid_pub_id = None
    valid_page_id = None
    
    # Run simple GET endpoints
    for path, method, payload in endpoints:
        url = f"{BASE_URL}{path}"
        print(f"\n--- Testing {method} {path} ---")
        try:
            res = requests.request(method, url, headers=headers, json=payload)
            print(f"Status Code: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                print("Response Keys:", list(data.keys()) if isinstance(data, dict) else (f"list of length {len(data)}" if isinstance(data, list) else type(data)))
                # Extract valid IDs for subsequent tests
                if path == "/api/paginas" and isinstance(data, list) and len(data) > 0:
                    valid_page_id = data[0].get("id")
                elif "/api/publicaciones" in path and isinstance(data, dict):
                    pub_list = data.get("data", [])
                    if len(pub_list) > 0:
                        valid_pub_id = pub_list[0].get("id")
            else:
                print(f"Error Response: {res.text[:300]}")
        except Exception as e:
            print(f"Request failed: {e}")
            
    # Test Detail Endpoints
    if valid_pub_id:
        path = f"/api/publicaciones/{valid_pub_id}"
        print(f"\n--- Testing GET {path} ---")
        try:
            res = requests.get(f"{BASE_URL}{path}", headers=headers)
            print(f"Status Code: {res.status_code}")
            if res.status_code != 200:
                print(f"Error Response: {res.text[:300]}")
        except Exception as e:
            print(f"Request failed: {e}")
    else:
        print("\nSkipping publication detail test (no valid pub id found).")
        
    if valid_page_id:
        path = f"/api/paginas/{valid_page_id}"
        print(f"\n--- Testing GET {path} ---")
        try:
            res = requests.get(f"{BASE_URL}{path}", headers=headers)
            print(f"Status Code: {res.status_code}")
            if res.status_code != 200:
                print(f"Error Response: {res.text[:300]}")
            else:
                # print keys to make sure "metricas" and "graficas" are there
                data = res.json()
                print("Response Keys:", list(data.keys()))
                if "metricas" in data:
                    print("  - Metricas:", data["metricas"])
                else:
                    print("  - WARNING: 'metricas' key NOT in page detail response!")
        except Exception as e:
            print(f"Request failed: {e}")
    else:
        print("\nSkipping page detail test (no valid page id found).")

if __name__ == "__main__":
    test_endpoints()
