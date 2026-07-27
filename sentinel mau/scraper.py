import requests
import MySQLdb
import time

API_KEY       = 'AIzaSyDBxYixOopiQBtxJJzxFH9dP-ySTUMrDAw'
SEARCH_ENGINE_ID = 'c3a66b07227eb406c'

DB_CONFIG = {
    'host':    'localhost',
    'user':    'root',
    'passwd':  '12345678',  
    'db':      'sentinel',
    'charset': 'utf8mb4'
}

BUSQUEDAS = [
    'pagina facebook gobierno queretaro',
    'pagina facebook noticias queretaro',
    'pagina facebook seguridad queretaro',
    'pagina facebook municipal queretaro',
    'pagina facebook policia queretaro',
    'pagina facebook periodico queretaro',
    'pagina facebook radio queretaro',
    'pagina facebook television queretaro',
]

CATEGORIAS = {
    'gobierno':   3,
    'municipal':  3,
    'policia':    3,
    'noticias':   5,
    'periodico':  8,
    'radio':      9,
    'television': 10,
    'medios':     5,
}

def conectar_bd():
    return MySQLdb.connect(**DB_CONFIG)

def url_ya_existe(cursor, url):
    cursor.execute("SELECT id FROM paginas WHERE url_facebook = %s", (url,))
    return cursor.fetchone() is not None

def detectar_categoria(texto):
    texto = texto.lower()
    for palabra, cat_id in CATEGORIAS.items():
        if palabra in texto:
            return cat_id
    return 5

def limpiar_url(url):
    url = url.split('?')[0].rstrip('/')
    if 'facebook.com' not in url:
        return None
    partes_invalidas = ['/posts/', '/videos/', '/photos/',
                        '/events/', '/groups/', '/watch']
    for parte in partes_invalidas:
        if parte in url:
            return None
    return url

def obtener_nombre(url, titulo):
    if titulo and len(titulo) > 3:
        return titulo[:200]
    partes = url.rstrip('/').split('/')
    nombre = partes[-1].replace('-', ' ').replace('.', ' ').title()
    return nombre if nombre else 'Sin nombre'

def buscar_en_google(query):
    resultados = []
    try:
        url = 'https://www.googleapis.com/customsearch/v1'
        params = {
            'key': API_KEY,
            'cx':  SEARCH_ENGINE_ID,
            'q':   query,
            'num': 10,
            'siteSearch': 'facebook.com',
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()

        if 'items' in data:
            for item in data['items']:
                url_fb  = limpiar_url(item.get('link', ''))
                titulo  = item.get('title', '')
                if url_fb:
                    resultados.append((url_fb, titulo))
        elif 'error' in data:
            print(f"  Error API: {data['error']['message']}")
    except Exception as e:
        print(f"  Error: {e}")
    return resultados

def ejecutar_scraper():
    print("=" * 55)
    print("  SENTINEL — Scraper con Google Custom Search API")
    print("=" * 55)

    conn   = conectar_bd()
    cursor = conn.cursor()

    total_nuevas     = 0
    total_duplicadas = 0

    for i, query in enumerate(BUSQUEDAS):
        print(f"\n🔍 Buscando: {query}")
        resultados = buscar_en_google(query)
        print(f"   Encontrados: {len(resultados)} resultados")

        for url_fb, titulo in resultados:
            if url_ya_existe(cursor, url_fb):
                print(f"   ⚠  Duplicada: {url_fb}")
                total_duplicadas += 1
                continue

            nombre     = obtener_nombre(url_fb, titulo)
            categoria  = detectar_categoria(query + ' ' + nombre)

            try:
                cursor.execute("""
                    INSERT INTO paginas (nombre, url_facebook, categoria_id, agregado_por)
                    VALUES (%s, %s, %s, 1)
                """, (nombre, url_fb, categoria))
                conn.commit()
                print(f"   ✅ Registrada: {nombre}")
                total_nuevas += 1
            except Exception as e:
                conn.rollback()
                print(f"   ❌ Error: {e}")

        if i < len(BUSQUEDAS) - 1:
            print(f"   ⏳ Esperando 2 segundos...")
            time.sleep(2)

    cursor.close()
    conn.close()

    print("\n" + "=" * 55)
    print(f"  ✅ Nuevas registradas : {total_nuevas}")
    print(f"  ⚠  Duplicadas omitidas: {total_duplicadas}")
    print("=" * 55)

if __name__ == '__main__':
    ejecutar_scraper()