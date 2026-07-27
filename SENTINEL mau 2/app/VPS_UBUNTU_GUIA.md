# Guía rápida para subir SENTINEL al VPS Ubuntu

## 1. Instalar paquetes base

```bash
apt update && apt upgrade -y
apt install -y curl wget gnupg software-properties-common unzip python3 python3-venv python3-pip nginx
```

## 2. Instalar SQL Server + ODBC

Instala SQL Server para Ubuntu según la versión del sistema. Después verifica:

```bash
systemctl status mssql-server --no-pager
```

Instala ODBC y sqlcmd:

```bash
curl https://packages.microsoft.com/keys/microsoft.asc | tee /etc/apt/trusted.gpg.d/microsoft.asc
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list > /etc/apt/sources.list.d/mssql-release.list
apt update
ACCEPT_EULA=Y apt install -y msodbcsql18 mssql-tools18 unixodbc-dev
```

## 3. Crear la base de datos

Sube el script:

```bash
scp SENTINEL_DB_SQLServer_Completo_Final.sql root@IP_DEL_VPS:/root/
```

Ejecuta:

```bash
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'TU_PASSWORD_SA' -C -i /root/SENTINEL_DB_SQLServer_Completo_Final.sql
```

Verifica:

```bash
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'TU_PASSWORD_SA' -C -Q "USE SENTINEL_DB; SELECT TOP 10 * FROM dbo.vw_fuentes_detalle;"
```

## 4. Subir la aplicación

```bash
mkdir -p /opt/sentinel
unzip SENTINEL_Final_SQLServer_Eli_Compatible.zip -d /opt/sentinel
cd /opt/sentinel/SENTINEL_Final_SQLServer_Eli_Compatible
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Variables de entorno:

```bash
export SQLSERVER_SERVER=localhost
export SQLSERVER_DATABASE=SENTINEL_DB
export SQLSERVER_TRUSTED_CONNECTION=no
export SQLSERVER_USER=sa
export SQLSERVER_PASSWORD='TU_PASSWORD_SA'
export SQLSERVER_DRIVER='ODBC Driver 18 for SQL Server'
export SQLSERVER_ENCRYPT=yes
export SQLSERVER_TRUST_CERT=yes
```

Prueba:

```bash
python app.py
```

Abre:

```text
http://IP_DEL_VPS:5000
```

## 5. Servicio con Gunicorn

```bash
nano /etc/systemd/system/sentinel.service
```

Contenido:

```ini
[Unit]
Description=SENTINEL Flask App
After=network.target mssql-server.service

[Service]
WorkingDirectory=/opt/sentinel/SENTINEL_Final_SQLServer_Eli_Compatible
Environment="SQLSERVER_DRIVER=ODBC Driver 18 for SQL Server"
Environment="SQLSERVER_SERVER=localhost"
Environment="SQLSERVER_DATABASE=SENTINEL_DB"
Environment="SQLSERVER_TRUSTED_CONNECTION=no"
Environment="SQLSERVER_USER=sa"
Environment="SQLSERVER_PASSWORD=TU_PASSWORD_SA"
Environment="SQLSERVER_ENCRYPT=yes"
Environment="SQLSERVER_TRUST_CERT=yes"
Environment="SECRET_KEY=cambia_esta_clave"
ExecStart=/opt/sentinel/SENTINEL_Final_SQLServer_Eli_Compatible/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Activa:

```bash
systemctl daemon-reload
systemctl enable sentinel
systemctl start sentinel
systemctl status sentinel --no-pager
```

## 6. Nginx

```bash
nano /etc/nginx/sites-available/sentinel
```

```nginx
server {
    listen 80;
    server_name IP_DEL_VPS;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/sentinel /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
ufw allow 80/tcp
```
