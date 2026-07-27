import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sentinel_clave_secreta_2026')
    SQLSERVER_DRIVER = os.environ.get('SQLSERVER_DRIVER', 'ODBC Driver 18 for SQL Server')
    SQLSERVER_SERVER = os.environ.get('SQLSERVER_SERVER', r'.\sqlexpress2026')
    SQLSERVER_DATABASE = os.environ.get('SQLSERVER_DATABASE', 'SENTINEL_DB')
    SQLSERVER_TRUSTED_CONNECTION = os.environ.get('SQLSERVER_TRUSTED_CONNECTION', 'yes')
    SQLSERVER_USER = os.environ.get('SQLSERVER_USER', 'sa')
    SQLSERVER_PASSWORD = os.environ.get('SQLSERVER_PASSWORD', '')
    SQLSERVER_ENCRYPT = os.environ.get('SQLSERVER_ENCRYPT', 'yes')
    SQLSERVER_TRUST_CERT = os.environ.get('SQLSERVER_TRUST_CERT', 'yes')
    EQUIPO2_API_TOKEN = os.environ.get('EQUIPO2_API_TOKEN', '')
