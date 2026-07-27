# SENTINEL Web SQL Server — versión final estilo Eli

Esta versión conserva el estilo y las funciones del trabajo de Eli, pero cambia la conexión a la base formal `SENTINEL_DB` en SQL Server.

## Funciones incluidas

- Login y logout.
- Listado de páginas/fuentes.
- Búsqueda por nombre, categoría, municipio o tipo de fuente.
- Agregar fuente.
- Editar fuente.
- Eliminar fuente.
- Dashboard.
- Jerarquía de categorías.
- Página de arquitectura.
- Exportar CSV completo.
- Scraper con Google Custom Search adaptado a SQL Server.

## Funciones agregadas para Equipo 2

El segundo equipo mencionó que necesita acceder a la URL de Facebook en formato CSV o JSON. Por eso se agregaron tres salidas:

- `/exportar/equipo2.csv`
- `/exportar/equipo2.json`
- `/api/equipo2/fuentes`

Estas rutas entregan únicamente el atributo:

```text
url_facebook
```

La vista usada para esto es:

```sql
dbo.vw_equipo2_urls
```

Esa vista filtra fuentes activas, aprobadas, con enlace válido y página activa.

## Base de datos

Archivo principal:

```text
SENTINEL_DB_SQLServer_Completo_Final.sql
```

Ese script crea:

- `SENTINEL_DB`
- `categorias`
- `ubicaciones`
- `usuarios_captura`
- `usuarios`
- `fuentes`
- `publicaciones`
- `eventos_detectados`
- `alertas`
- `vw_fuentes_detalle`
- `vw_resumen_categorias`
- `vw_resumen_validacion`
- `vw_equipo2_urls`
- procedimientos CRUD para fuentes

Usuario inicial:

```text
Correo: admin@sentinel.local
Contraseña: admin123
```

## Ejecución local en Windows

1. Ejecuta `SENTINEL_DB_SQLServer_Completo_Final.sql` en SSMS.
2. Revisa `config.py`.

Para tu caso local normalmente queda así:

```python
SQLSERVER_SERVER = r'.\sqlexpress2026'
SQLSERVER_DATABASE = 'SENTINEL_DB'
SQLSERVER_TRUSTED_CONNECTION = 'yes'
```

3. Crea entorno virtual:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

4. Abre:

```text
http://127.0.0.1:5000
```

## Ejecución en VPS Ubuntu

En Ubuntu normalmente se usa login SQL Server con `sa` u otro usuario SQL. No se usa Trusted Connection.

Variables recomendadas:

```bash
export SQLSERVER_SERVER=localhost
export SQLSERVER_DATABASE=SENTINEL_DB
export SQLSERVER_TRUSTED_CONNECTION=no
export SQLSERVER_USER=sa
export SQLSERVER_PASSWORD='TU_PASSWORD_SA'
export SQLSERVER_DRIVER='ODBC Driver 18 for SQL Server'
export SQLSERVER_ENCRYPT=yes
export SQLSERVER_TRUST_CERT=yes
export SECRET_KEY='cambia_esta_clave'
```

Instalación:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Producción

Para producción se recomienda:

```text
Navegador -> Nginx -> Gunicorn -> Flask -> SQL Server -> SENTINEL_DB
```

No se recomienda exponer SQL Server directamente a internet.
