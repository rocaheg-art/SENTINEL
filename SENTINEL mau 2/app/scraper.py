import os
import time
import requests
import pyodbc
from config import Config

API_KEY = os.environ.get('GOOGLE_API_KEY', '')
SEARCH_ENGINE_ID = os.environ.get('GOOGLE_SEARCH_ENGINE_ID', '')

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

CATEGORIAS_CLAVE = {
    'gobierno': ('Gobierno', 'Poder Ejecutivo', 'Gobierno Estatal'),
    'municipal': ('Gobierno', 'Poder Ejecutivo', 'Gobierno Municipal'),
    'policia': ('Gobierno', 'Seguridad Pública', 'Policía Estatal'),
    'noticias': ('Medio Informativo', 'Portal Digital', 'Noticias Locales'),
    'periodico': ('Medio Informativo', 'Periódico', 'Digital'),
    'radio': ('Medio Informativo', 'Radio', 'Radio Noticias'),
    'television': ('Medio Informativo', 'Televisión', 'Canal Local'),
    'medios': ('Medio Informativo', 'Portal Digital', 'Noticias Generales'),
}


def connection_string():
    trusted = Config.SQLSERVER_TRUSTED_CONNECTION.lower() in ('yes', 'true', '1')
    parts = [f'DRIVER={{{Config.SQLSERVER_DRIVER}}}', f'SERVER={Config.SQLSERVER_SERVER}', f'DATABASE={Config.SQLSERVER_DATABASE}']
    if trusted:
        parts.append('Trusted_Connection=yes')
    else:
        parts.append(f'UID={Config.SQLSERVER_USER}')
        parts.append(f'PWD={Config.SQLSERVER_PASSWORD}')
    parts.append(f'Encrypt={Config.SQLSERVER_ENCRYPT}')
    parts.append(f'TrustServerCertificate={Config.SQLSERVER_TRUST_CERT}')
    return ';'.join(parts)


def conectar_bd():
    return pyodbc.connect(connection_string())


def limpiar_url(url):
    url = url.split('?')[0].rstrip('/')
    if 'facebook.com' not in url:
        return None
    for parte in ['/posts/', '/videos/', '/photos/', '/events/', '/groups/', '/watch']:
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
    if not API_KEY or not SEARCH_ENGINE_ID:
        raise RuntimeError('Faltan GOOGLE_API_KEY o GOOGLE_SEARCH_ENGINE_ID en variables de entorno.')
    url = 'https://www.googleapis.com/customsearch/v1'
    params = {'key': API_KEY, 'cx': SEARCH_ENGINE_ID, 'q': query, 'num': 10, 'siteSearch': 'facebook.com'}
    resp = requests.get(url, params=params, timeout=15)
    data = resp.json()
    resultados = []
    for item in data.get('items', []):
        url_fb = limpiar_url(item.get('link', ''))
        titulo = item.get('title', '')
        if url_fb:
            resultados.append((url_fb, titulo))
    if 'error' in data:
        print('Error API:', data['error'].get('message'))
    return resultados


def detectar_categoria(texto):
    texto = texto.lower()
    for palabra, triple in CATEGORIAS_CLAVE.items():
        if palabra in texto:
            return triple
    return ('Medio Informativo', 'Portal Digital', 'Noticias Generales')


def obtener_id_categoria(cursor, triple):
    raiz, sub, tipo = triple
    cursor.execute('''
        SELECT n3.id_categoria
        FROM dbo.categorias n1
        JOIN dbo.categorias n2 ON n2.id_padre = n1.id_categoria
        JOIN dbo.categorias n3 ON n3.id_padre = n2.id_categoria
        WHERE n1.nombre_categoria = ? AND n2.nombre_categoria = ? AND n3.nombre_categoria = ?
    ''', raiz, sub, tipo)
    row = cursor.fetchone()
    return row[0] if row else None


def url_ya_existe(cursor, url):
    cursor.execute('SELECT 1 FROM dbo.fuentes WHERE url_facebook = ? AND activo_sistema = 1', url)
    return cursor.fetchone() is not None


def ejecutar_scraper():
    print('=' * 55)
    print('  SENTINEL — Scraper Google Custom Search + SQL Server')
    print('=' * 55)
    conn = conectar_bd()
    cursor = conn.cursor()
    total_nuevas = 0
    total_duplicadas = 0
    for i, query in enumerate(BUSQUEDAS):
        print(f'\nBuscando: {query}')
        resultados = buscar_en_google(query)
        print(f'Encontrados: {len(resultados)} resultados')
        for url_fb, titulo in resultados:
            if url_ya_existe(cursor, url_fb):
                print(f'Duplicada: {url_fb}')
                total_duplicadas += 1
                continue
            nombre = obtener_nombre(url_fb, titulo)
            triple = detectar_categoria(query + ' ' + nombre)
            id_categoria = obtener_id_categoria(cursor, triple)
            if not id_categoria:
                print(f'Sin categoría válida para {nombre}: {triple}')
                continue
            try:
                cursor.execute('''
                    EXEC dbo.spCrearFuente
                        @sitio=?, @url_web=?, @url_facebook=?, @tipo_fuente=?, @id_categoria=?,
                        @municipio=?, @estado=?, @pais=?, @enlace_valido=?, @pagina_activa=?,
                        @duplicado=?, @estado_validacion=?, @observaciones=?, @agregado_por=?
                ''', nombre, None, url_fb, 'Medio', id_categoria, 'Querétaro', 'Querétaro', 'México', 'Sí', 'Sí', 'No', 'Pendiente', 'Registro generado por scraper', 'Scraper')
                conn.commit()
                print(f'Registrada: {nombre}')
                total_nuevas += 1
            except Exception as e:
                conn.rollback()
                print('Error:', e)
        if i < len(BUSQUEDAS) - 1:
            time.sleep(2)
    cursor.close()
    conn.close()
    print('=' * 55)
    print(f'Nuevas registradas : {total_nuevas}')
    print(f'Duplicadas omitidas: {total_duplicadas}')
    print('=' * 55)


if __name__ == '__main__':
    ejecutar_scraper()
