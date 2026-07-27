Paquete de entrega SENTINEL

Contenido:
1. app/
   Código fuente del sistema Flask desplegado en el VPS.

2. SENTINEL_DB_*.bak
   Respaldo completo de la base de datos SQL Server.

3. config_vps/
   Archivos de referencia para systemd y Nginx.
   Las contraseñas fueron reemplazadas por valores de ejemplo.

Notas:
- No se incluye el entorno virtual venv porque debe generarse nuevamente.
- No se incluye facebook_session.json por seguridad.
- Para ejecutar la app se debe instalar Python, crear venv e instalar requirements.txt.
- Para restaurar la base se debe usar SQL Server y restaurar el archivo .bak.
- El archivo sentinel.service.example debe editarse con las credenciales reales del servidor.
