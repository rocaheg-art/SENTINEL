/* SENTINEL - SQL Server final compatible con aplicación Flask estilo Eli
Generado desde el catálogo completo (209 filas) y registros categorizados (182 fuentes).
Usuario web inicial: admin@sentinel.local / admin123
*/
IF DB_ID(N'SENTINEL_DB') IS NULL CREATE DATABASE SENTINEL_DB;
GO
USE SENTINEL_DB;
GO
IF OBJECT_ID(N'dbo.spEliminarFuente', N'P') IS NOT NULL DROP PROCEDURE dbo.spEliminarFuente;
IF OBJECT_ID(N'dbo.spActualizarFuente', N'P') IS NOT NULL DROP PROCEDURE dbo.spActualizarFuente;
IF OBJECT_ID(N'dbo.spObtenerFuente', N'P') IS NOT NULL DROP PROCEDURE dbo.spObtenerFuente;
IF OBJECT_ID(N'dbo.spListarFuentes', N'P') IS NOT NULL DROP PROCEDURE dbo.spListarFuentes;
IF OBJECT_ID(N'dbo.spCrearFuente', N'P') IS NOT NULL DROP PROCEDURE dbo.spCrearFuente;
GO
IF OBJECT_ID(N'dbo.vw_equipo2_urls', N'V') IS NOT NULL DROP VIEW dbo.vw_equipo2_urls;
IF OBJECT_ID(N'dbo.vw_resumen_validacion', N'V') IS NOT NULL DROP VIEW dbo.vw_resumen_validacion;
IF OBJECT_ID(N'dbo.vw_resumen_categorias', N'V') IS NOT NULL DROP VIEW dbo.vw_resumen_categorias;
IF OBJECT_ID(N'dbo.vw_fuentes_detalle', N'V') IS NOT NULL DROP VIEW dbo.vw_fuentes_detalle;
GO
IF OBJECT_ID(N'dbo.alertas', N'U') IS NOT NULL DROP TABLE dbo.alertas;
IF OBJECT_ID(N'dbo.eventos_detectados', N'U') IS NOT NULL DROP TABLE dbo.eventos_detectados;
IF OBJECT_ID(N'dbo.publicaciones', N'U') IS NOT NULL DROP TABLE dbo.publicaciones;
IF OBJECT_ID(N'dbo.fuentes', N'U') IS NOT NULL DROP TABLE dbo.fuentes;
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NOT NULL DROP TABLE dbo.usuarios;
IF OBJECT_ID(N'dbo.usuarios_captura', N'U') IS NOT NULL DROP TABLE dbo.usuarios_captura;
IF OBJECT_ID(N'dbo.ubicaciones', N'U') IS NOT NULL DROP TABLE dbo.ubicaciones;
IF OBJECT_ID(N'dbo.categorias', N'U') IS NOT NULL DROP TABLE dbo.categorias;
GO
CREATE TABLE dbo.categorias (
    id_categoria INT IDENTITY(1,1) PRIMARY KEY,
    nombre_categoria NVARCHAR(150) NOT NULL,
    descripcion NVARCHAR(MAX) NULL,
    id_padre INT NULL,
    nivel TINYINT NOT NULL,
    codigo NVARCHAR(30) NULL,
    activa BIT NOT NULL CONSTRAINT DF_categorias_activa DEFAULT 1,
    fecha_creacion DATETIME2 NOT NULL CONSTRAINT DF_categorias_fecha DEFAULT SYSDATETIME(),
    CONSTRAINT FK_categorias_padre FOREIGN KEY (id_padre) REFERENCES dbo.categorias(id_categoria),
    CONSTRAINT CK_categorias_nivel CHECK (nivel IN (1,2,3))
);
GO
CREATE UNIQUE INDEX UX_categorias_raiz ON dbo.categorias(nombre_categoria) WHERE id_padre IS NULL;
GO
CREATE UNIQUE INDEX UX_categorias_nombre_padre ON dbo.categorias(nombre_categoria, id_padre) WHERE id_padre IS NOT NULL;
GO
CREATE TABLE dbo.ubicaciones (
    id_ubicacion INT IDENTITY(1,1) PRIMARY KEY,
    municipio NVARCHAR(100) NULL,
    estado NVARCHAR(100) NULL,
    pais NVARCHAR(100) NOT NULL CONSTRAINT DF_ubicaciones_pais DEFAULT N'México',
    CONSTRAINT UX_ubicaciones UNIQUE (municipio, estado, pais)
);
GO
CREATE TABLE dbo.usuarios_captura (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre_usuario NVARCHAR(100) NOT NULL UNIQUE,
    activo BIT NOT NULL CONSTRAINT DF_usuarios_captura_activo DEFAULT 1,
    fecha_creacion DATETIME2 NOT NULL CONSTRAINT DF_usuarios_captura_fecha DEFAULT SYSDATETIME()
);
GO
CREATE TABLE dbo.usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT 1,
    creado_en DATETIME2 NOT NULL CONSTRAINT DF_usuarios_creado DEFAULT SYSDATETIME()
);
GO
CREATE TABLE dbo.fuentes (
    id_fuente INT IDENTITY(1,1) PRIMARY KEY,
    id_original INT NULL,
    sitio NVARCHAR(255) NOT NULL,
    url_web NVARCHAR(500) NULL,
    url_facebook NVARCHAR(500) NOT NULL,
    tipo_fuente NVARCHAR(100) NULL,
    id_categoria INT NOT NULL,
    id_ubicacion INT NULL,
    id_usuario INT NULL,
    enlace_valido NVARCHAR(20) NOT NULL CONSTRAINT DF_fuentes_enlace DEFAULT N'Pendiente',
    pagina_activa NVARCHAR(20) NOT NULL CONSTRAINT DF_fuentes_activa DEFAULT N'Pendiente',
    duplicado NVARCHAR(20) NOT NULL CONSTRAINT DF_fuentes_dup DEFAULT N'No',
    estado_validacion NVARCHAR(50) NOT NULL CONSTRAINT DF_fuentes_validacion DEFAULT N'Pendiente',
    observaciones NVARCHAR(MAX) NULL,
    activo_sistema BIT NOT NULL CONSTRAINT DF_fuentes_activo_sistema DEFAULT 1,
    fecha_registro DATETIME2 NOT NULL CONSTRAINT DF_fuentes_fecha DEFAULT SYSDATETIME(),
    fecha_actualizacion DATETIME2 NULL,
    CONSTRAINT FK_fuentes_categoria FOREIGN KEY (id_categoria) REFERENCES dbo.categorias(id_categoria),
    CONSTRAINT FK_fuentes_ubicacion FOREIGN KEY (id_ubicacion) REFERENCES dbo.ubicaciones(id_ubicacion),
    CONSTRAINT FK_fuentes_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios_captura(id_usuario)
);
GO
CREATE INDEX IX_fuentes_url_facebook ON dbo.fuentes(url_facebook);
GO
CREATE INDEX IX_fuentes_categoria ON dbo.fuentes(id_categoria);
GO
CREATE INDEX IX_fuentes_estado_validacion ON dbo.fuentes(estado_validacion);
GO
CREATE TABLE dbo.publicaciones (
    id_publicacion INT IDENTITY(1,1) PRIMARY KEY,
    id_fuente INT NOT NULL,
    texto_publicacion NVARCHAR(MAX) NULL,
    url_publicacion NVARCHAR(700) NULL,
    fecha_publicacion DATETIME2 NULL,
    fecha_extraccion DATETIME2 NOT NULL CONSTRAINT DF_publicaciones_fecha DEFAULT SYSDATETIME(),
    CONSTRAINT FK_publicaciones_fuentes FOREIGN KEY (id_fuente) REFERENCES dbo.fuentes(id_fuente)
);
GO
CREATE TABLE dbo.eventos_detectados (
    id_evento INT IDENTITY(1,1) PRIMARY KEY,
    id_publicacion INT NOT NULL,
    tipo_evento NVARCHAR(120) NULL,
    nivel_severidad NVARCHAR(50) NULL,
    descripcion_evento NVARCHAR(MAX) NULL,
    ubicacion_detectada NVARCHAR(250) NULL,
    fecha_deteccion DATETIME2 NOT NULL CONSTRAINT DF_eventos_fecha DEFAULT SYSDATETIME(),
    CONSTRAINT FK_eventos_publicaciones FOREIGN KEY (id_publicacion) REFERENCES dbo.publicaciones(id_publicacion)
);
GO
CREATE TABLE dbo.alertas (
    id_alerta INT IDENTITY(1,1) PRIMARY KEY,
    id_evento INT NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(MAX) NULL,
    estado_alerta NVARCHAR(50) NOT NULL CONSTRAINT DF_alertas_estado DEFAULT N'Nueva',
    fecha_alerta DATETIME2 NOT NULL CONSTRAINT DF_alertas_fecha DEFAULT SYSDATETIME(),
    CONSTRAINT FK_alertas_eventos FOREIGN KEY (id_evento) REFERENCES dbo.eventos_detectados(id_evento)
);
GO


/* CATEGORÍAS */
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Gobierno', N'Categoría raíz SENTINEL.', NULL, 1, N'1');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Medio Informativo', N'Categoría raíz SENTINEL.', NULL, 1, N'2');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Comunidad', N'Categoría raíz SENTINEL.', NULL, 1, N'3');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Figura Pública', N'Categoría raíz SENTINEL.', NULL, 1, N'4');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Emergencias y Rescate', N'Categoría raíz SENTINEL.', NULL, 1, N'5');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Servicios Públicos y Movilidad', N'Categoría raíz SENTINEL.', NULL, 1, N'6');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Organizaciones y Sociedad Civil', N'Categoría raíz SENTINEL.', NULL, 1, N'7');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Empresa / Negocio', N'Categoría raíz SENTINEL.', NULL, 1, N'8');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Educación y Salud', N'Categoría raíz SENTINEL.', NULL, 1, N'9');
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) VALUES (N'Otro / Sin Clasificar', N'Categoría raíz SENTINEL.', NULL, 1, N'10');
GO
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Poder Ejecutivo', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.1' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Poder Legislativo', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.2' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Poder Judicial', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.3' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Seguridad Pública', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.4' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Justicia y Órganos Autónomos', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.5' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Protección Civil', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.6' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Dependencias Gubernamentales', N'Subcategoría SENTINEL.', id_categoria, 2, N'1.7' FROM dbo.categorias WHERE nombre_categoria=N'Gobierno' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Portal Digital', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.1' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Periódico', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.2' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Radio', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.3' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Televisión', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.4' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Blog / Página Independiente', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.5' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Plataforma Multimedia', N'Subcategoría SENTINEL.', id_categoria, 2, N'2.6' FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Grupos Comunitarios', N'Subcategoría SENTINEL.', id_categoria, 2, N'3.1' FROM dbo.categorias WHERE nombre_categoria=N'Comunidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Denuncias Ciudadanas', N'Subcategoría SENTINEL.', id_categoria, 2, N'3.2' FROM dbo.categorias WHERE nombre_categoria=N'Comunidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Ayuda Ciudadana', N'Subcategoría SENTINEL.', id_categoria, 2, N'3.3' FROM dbo.categorias WHERE nombre_categoria=N'Comunidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Figura Política', N'Subcategoría SENTINEL.', id_categoria, 2, N'4.1' FROM dbo.categorias WHERE nombre_categoria=N'Figura Pública' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunicador / Periodista', N'Subcategoría SENTINEL.', id_categoria, 2, N'4.2' FROM dbo.categorias WHERE nombre_categoria=N'Figura Pública' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Líder Social', N'Subcategoría SENTINEL.', id_categoria, 2, N'4.3' FROM dbo.categorias WHERE nombre_categoria=N'Figura Pública' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cuerpos de Emergencia', N'Subcategoría SENTINEL.', id_categoria, 2, N'5.1' FROM dbo.categorias WHERE nombre_categoria=N'Emergencias y Rescate' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertas y Riesgos', N'Subcategoría SENTINEL.', id_categoria, 2, N'5.2' FROM dbo.categorias WHERE nombre_categoria=N'Emergencias y Rescate' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Salud de Emergencia', N'Subcategoría SENTINEL.', id_categoria, 2, N'5.3' FROM dbo.categorias WHERE nombre_categoria=N'Emergencias y Rescate' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Movilidad y Transporte', N'Subcategoría SENTINEL.', id_categoria, 2, N'6.1' FROM dbo.categorias WHERE nombre_categoria=N'Servicios Públicos y Movilidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios Públicos', N'Subcategoría SENTINEL.', id_categoria, 2, N'6.2' FROM dbo.categorias WHERE nombre_categoria=N'Servicios Públicos y Movilidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Infraestructura Urbana', N'Subcategoría SENTINEL.', id_categoria, 2, N'6.3' FROM dbo.categorias WHERE nombre_categoria=N'Servicios Públicos y Movilidad' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Asociación Civil', N'Subcategoría SENTINEL.', id_categoria, 2, N'7.1' FROM dbo.categorias WHERE nombre_categoria=N'Organizaciones y Sociedad Civil' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colectivos', N'Subcategoría SENTINEL.', id_categoria, 2, N'7.2' FROM dbo.categorias WHERE nombre_categoria=N'Organizaciones y Sociedad Civil' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Instituciones de Apoyo', N'Subcategoría SENTINEL.', id_categoria, 2, N'7.3' FROM dbo.categorias WHERE nombre_categoria=N'Organizaciones y Sociedad Civil' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Medio Privado', N'Subcategoría SENTINEL.', id_categoria, 2, N'8.1' FROM dbo.categorias WHERE nombre_categoria=N'Empresa / Negocio' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios Privados', N'Subcategoría SENTINEL.', id_categoria, 2, N'8.2' FROM dbo.categorias WHERE nombre_categoria=N'Empresa / Negocio' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Negocio Local', N'Subcategoría SENTINEL.', id_categoria, 2, N'8.3' FROM dbo.categorias WHERE nombre_categoria=N'Empresa / Negocio' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Educación', N'Subcategoría SENTINEL.', id_categoria, 2, N'9.1' FROM dbo.categorias WHERE nombre_categoria=N'Educación y Salud' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Salud', N'Subcategoría SENTINEL.', id_categoria, 2, N'9.2' FROM dbo.categorias WHERE nombre_categoria=N'Educación y Salud' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Pendiente de revisión', N'Subcategoría SENTINEL.', id_categoria, 2, N'10.1' FROM dbo.categorias WHERE nombre_categoria=N'Otro / Sin Clasificar' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'No relevante', N'Subcategoría SENTINEL.', id_categoria, 2, N'10.2' FROM dbo.categorias WHERE nombre_categoria=N'Otro / Sin Clasificar' AND id_padre IS NULL;
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sin subcategoría', N'Subcategoría SENTINEL.', id_categoria, 2, NULL FROM dbo.categorias WHERE nombre_categoria=N'Medio Informativo' AND id_padre IS NULL;
GO
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Gobierno Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Gobierno Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Ayuntamiento', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Secretaría Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Secretaría Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Dependencia Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Dependencia Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Dirección Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Delegación', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Coordinación Administrativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.10' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Organismo Descentralizado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.11' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Instituto Público', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.12' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sistema DIF', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.13' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Unidad Administrativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.1.14' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Congreso del Estado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cámara Legislativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Diputado Local', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Diputado Federal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Senador', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comisión Legislativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Grupo Parlamentario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Mesa Directiva Legislativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Junta de Coordinación Política', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Órgano Técnico Legislativo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.2.10' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Legislativo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tribunal Superior de Justicia', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Juzgado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Consejo de la Judicatura', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sala Judicial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tribunal Especializado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Centro de Justicia Alternativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Escuela Judicial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Archivo Judicial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunicación Social Judicial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.3.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Judicial';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Policía Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Policía Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Guardia Nacional', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Seguridad Vial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tránsito Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Centro de Monitoreo / C5 / C4', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Secretaría de Seguridad Pública', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Dirección de Seguridad Pública', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Unidad de Prevención del Delito', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.4.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Fiscalía', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Defensoría Pública', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Derechos Humanos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Instituto Electoral', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tribunal Electoral', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Transparencia', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Auditoría Superior', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sistema Penitenciario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Procuraduría', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comisión Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.10' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Órgano Autónomo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.5.11' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Protección Civil Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Protección Civil Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Gestión de Riesgos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Prevención de Desastres', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertamiento Preventivo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Atención de Emergencias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Unidad Municipal de Protección Civil', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.6.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Salud', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Educación', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Obras Públicas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Movilidad', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Desarrollo Social', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios Públicos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Medio Ambiente', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Turismo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.8' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cultura', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.9' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunicación Social', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.10' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Desarrollo Económico', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.11' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Finanzas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.12' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Administración', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.13' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Contraloría', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.14' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Planeación', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.15' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Juventud', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.16' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Mujeres', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.17' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Deporte', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'1.7.18' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Dependencias Gubernamentales';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Noticias Locales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Noticias Estatales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Nota Roja', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Política', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tráfico', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunidad', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Noticias Generales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.1.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Digital', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Impreso', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Híbrido', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Radio Noticias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Radio Comunitaria', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Radio Comercial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tráfico en Vivo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Entrevistas / Programas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.3.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Noticiero', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Canal Local', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Canal Estatal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Reporteros', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Transmisiones en Vivo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cortes Informativos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.4.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Periodismo Independiente', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.5.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Blog / Página Independiente';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Opinión', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.5.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Blog / Página Independiente';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Análisis', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.5.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Blog / Página Independiente';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunitario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.5.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Blog / Página Independiente';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Transmisiones en Vivo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.6.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Plataforma Multimedia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Video Noticias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.6.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Plataforma Multimedia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cobertura en Tiempo Real', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.6.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Plataforma Multimedia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Contenido Digital', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'2.6.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Plataforma Multimedia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colonos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Vecinos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Información Local', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunidad Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunidad por Colonia', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Seguridad', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios Públicos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Quejas / Reportes', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tráfico', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Personas Desaparecidas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Mascotas Perdidas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Emergencias Ciudadanas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.2.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Apoyo Social', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Donaciones', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Búsqueda de Personas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Búsqueda de Mascotas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Apoyo Comunitario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Reportes Solidarios', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'3.3.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Ayuda Ciudadana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Gobernador', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Presidente Municipal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Regidor', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Diputado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Senador', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Funcionario Público', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Secretario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.1.7' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Reportero', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Periodista Independiente', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Conductor de Noticias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Analista Político', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Creador de Contenido Informativo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.2.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Activista', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Líder Social';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Representante Comunitario', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Líder Social';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Líder Vecinal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Líder Social';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Vocero Ciudadano', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'4.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Líder Social';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Bomberos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Cuerpos de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cruz Roja', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Cuerpos de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Paramédicos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Cuerpos de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Rescate Urbano', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Cuerpos de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Rescate Animal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Cuerpos de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertas Climáticas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Alertas y Riesgos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertas Viales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Alertas y Riesgos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertas de Seguridad', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Alertas y Riesgos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alertas Comunitarias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Alertas y Riesgos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Ambulancias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Atención Prehospitalaria', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Hospitales de Emergencia', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Campañas de Salud Urgente', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'5.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud de Emergencia';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Transporte Público', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Movilidad y Transporte';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Movilidad Urbana', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Movilidad y Transporte';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Tránsito', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Movilidad y Transporte';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Rutas y Vialidades', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Movilidad y Transporte';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Obras Viales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Movilidad y Transporte';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Agua', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Energía Eléctrica', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Alumbrado Público', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Recolección de Basura', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Bacheo', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Drenaje', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.2.6' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Públicos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Obras Públicas', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Infraestructura Urbana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Mantenimiento Urbano', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Infraestructura Urbana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Cierres Viales', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Infraestructura Urbana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Reparaciones', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Infraestructura Urbana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Proyectos Urbanos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'6.3.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Servicios Públicos y Movilidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Infraestructura Urbana';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Apoyo Social', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Derechos Humanos', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Seguridad Ciudadana', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Medio Ambiente', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Salud Comunitaria', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.1.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colectivo Vecinal', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Colectivos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colectivo de Búsqueda', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Colectivos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colectivo Ambiental', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Colectivos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Colectivo Social', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Colectivos';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Fundaciones', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Instituciones de Apoyo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Organizaciones Comunitarias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Instituciones de Apoyo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Grupos de Voluntariado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'7.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Instituciones de Apoyo';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Agencia de Noticias', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Medio Privado';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Productora Informativa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Medio Privado';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comunicación Digital', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Medio Privado';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Seguridad Privada', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Privados';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Transporte Privado', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Privados';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios de Salud', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Privados';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicios de Emergencia Privada', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Servicios Privados';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Comercio Local', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.3.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Negocio Local';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Plaza Comercial', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.3.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Negocio Local';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Servicio Local', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.3.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Negocio Local';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Empresa Regional', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'8.3.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Negocio Local';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Universidad', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Educación';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Escuela', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Educación';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Instituto', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Educación';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Centro de Capacitación', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.1.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Educación';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Hospital', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Clínica', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Secretaría de Salud', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Campañas de Salud', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Centro de Atención Médica', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'9.2.5' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Educación y Salud' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Salud';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sin clasificar', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.1.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Pendiente de revisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Requiere validación', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.1.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Pendiente de revisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Fuente dudosa', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.1.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Pendiente de revisión';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Página inactiva', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.2.1' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'No relevante';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Página duplicada', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.2.2' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'No relevante';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Página fuera del alcance', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.2.3' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'No relevante';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Página sin contenido útil', N'Tipo específico SENTINEL.', c2.id_categoria, 3, N'10.2.4' FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Otro / Sin Clasificar' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'No relevante';
INSERT INTO dbo.categorias (nombre_categoria, descripcion, id_padre, nivel, codigo) SELECT N'Sin tipo específico', N'Tipo específico SENTINEL.', c2.id_categoria, 3, NULL FROM dbo.categorias c1 JOIN dbo.categorias c2 ON c2.id_padre=c1.id_categoria WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría';
GO

/* USUARIOS Y UBICACIONES */
INSERT INTO dbo.usuarios_captura (nombre_usuario) VALUES (N'Mauricio');
INSERT INTO dbo.usuarios (nombre, email, password_hash, activo) VALUES (N'Administrador', N'admin@sentinel.local', N'$2b$12$AsIdVlhRPhsBeASkH2YC0uU1KmZyU7DBf83Morh9bu2y5ZdWAv1je', 1);
GO
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Corregidora', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Querétaro', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Pedro Escobedo', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Amealco de Bonfil', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Jalpan de Serra', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'San Juan del Río', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'El Marqués', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Cadereyta de Montes', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Colón', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Ezequiel Montes', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Huimilpan', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Landa de Matamoros', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Peñamiller', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'San Joaquín', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Tolimán', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Arroyo Seco', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Pinal de Amoles', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Tequisquiapan', N'Querétaro', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Querétaro', N'Guanajuato', N'México');
INSERT INTO dbo.ubicaciones (municipio, estado, pais) VALUES (N'Otro', N'Ciudad de Mexico', N'México');
GO

/* FUENTES */
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 1, N'AlertaQro Noticias Queretaro', N'http://www.alertaqronoticias.com/', N'https://www.facebook.com/alertaqro?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Corregidora',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 2, N'Criptica Noticias Queretaro', N'http://www.criptica.com.mx/', N'https://www.facebook.com/CripticaNoticias/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 3, N'Noticias Queretaro', N'https://noticiasdequeretaro.com.mx/', N'https://www.facebook.com/noticiasdeqro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 4, N'Alerta Informativa', N'http://www.alertaqronoticias.com/', N'https://www.facebook.com/profile.php?id=100063767697033&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 5, N'Diario de Queretaro', N'https://www.oem.com.mx/diariodequeretaro/', N'https://www.facebook.com/DiarioQro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 6, N'El Universal Queretaro', N'http://www.eluniversalqueretaro.mx/', N'https://www.facebook.com/ElUniversalQueretaro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 7, N'Fiscalia General de Queretaro', N'http://fiscaliageneralqro.gob.mx/', N'https://www.facebook.com/fiscaliaqro/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Justicia y Órganos Autónomos' AND c3.nombre_categoria=N'Fiscalía';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 8, N'POES Querétaro', NULL, N'https://www.facebook.com/poesqro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 9, N'Pulso Pedro Escobedo', N'instagram.com/pulsopedroescobedo', N'https://www.facebook.com/pulsopedroescobedo/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pedro Escobedo',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 10, N'amealco.MX', N'https://amealco.mx/', N'https://www.facebook.com/amealcoMX/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Amealco de Bonfil',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 11, N'Informamte Serrano', NULL, N'https://www.facebook.com/profile.php?id=61565956828332&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Jalpan de Serra',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 12, N'La Voz Del Pueblo Querétaro', N'http://www.lavozdelpuebloqro.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 13, N'Mala Vida Radio', N'https://malavidaqro.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico' AND c3.nombre_categoria=N'Híbrido';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 14, N'Querétaro Extra', N'http://extraqueretaro.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 15, N'Amanecer Querétaro', N'http://www.amanecerqro.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 16, N'Noticias San Juan del Río', NULL, N'https://www.facebook.com/groups/489847842526167/about', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 17, N'QuerétaroNoticias.com', N'https://www.queretaronoticias.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 18, N'Radio Televisión Querétaro', N'http://www.rtq.mx/', N'https://www.facebook.com/rtqqueretaro/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 19, N'l Universal Querétaro', N'http://www.eluniversalqueretaro.mx/', N'https://www.facebook.com/ElUniversalQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 20, N'AD Queretaro', N'https://aldialogo.mx/', N'https://www.facebook.com/ADQueretaroMX/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 21, N'Denuncias Públicas Querétaro', NULL, N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas' AND c3.nombre_categoria=N'Quejas / Reportes';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 22, N'Noticias del pueblito', N'https://noticiaselpueblito.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 23, N'Reporte Queretaro', N'http://www.ciudadypoder.mx/', N'https://www.facebook.com/ReporteQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 24, N'TV Azteca Querétaro', N'https://www.aztecaqueretaro.com/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión' AND c3.nombre_categoria=N'Noticiero';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 25, N'Quadratín Querétaro', NULL, N'https://www.facebook.com/queretaroquadratin', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 26, N'Crónica Regional', N'https://www.cronicaregional.com.mx/', N'https://www.facebook.com/profile.php?id=61566823675631&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 27, N'La Diferrencia Atrévete A Leernos', N'http://www.ladiferenciaperiodico.jimdo.com/', N'https://www.facebook.com/Ladiferenciaperiodico/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 28, N'Tráfico real y noticias autopista México Querétaro:', NULL, N'https://www.facebook.com/groups/769252450196527/about', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Denuncias Ciudadanas' AND c3.nombre_categoria=N'Quejas / Reportes';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 29, N'Noticias Querétaro', NULL, N'https://www.facebook.com/profile.php?id=61585727610941&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Corregidora',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 30, N'Círculo Noticias Querétaro', N'http://circulonoticias.com/', N'https://www.facebook.com/CNqueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 31, N'Querétaro NOTICIAS DE ÚLTIMA HORA', NULL, N'https://www.facebook.com/groups/queretaronoticiasdeultimahora/about', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 32, N'24 Queretaro Noticias', N'https://24queretaronoticias.com/', N'https://www.facebook.com/24NoticiasQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 33, N'El Blog de Porter', N'https://elblogdeporter.com/', N'https://www.facebook.com/elblogdeporter/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 34, N'El Sol de San Juan del Río', N'https://oem.com.mx/elsoldesanjuandelrio/', N'https://www.facebook.com/ElSolDeSanJuan/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 35, N'El Conspirador', N'http://www.elconspirador.com.mx/', N'https://www.facebook.com/ConspiradorMx/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 36, N'Expreso de Queretaro', N'http://expresoqueretaro.com/', N'https://www.facebook.com/profile.php?id=100064393401223&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 37, N'Rotativo de Queretaro', N'http://www.rotativo.com.mx/', N'https://www.facebook.com/RotativoQueretaro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 38, N'Queretarock Noticias', NULL, N'https://www.facebook.com/QueretarockNoticias/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 39, N'Gobierno del Estado de Querétaro', N'http://www.queretaro.gob.mx/', N'https://www.facebook.com/GobQro/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 40, N'Plaza de Armas Querétaro', N'http://www.plazadearmas.com.mx/', N'https://www.facebook.com/PlazaDeArmasQro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico' AND c3.nombre_categoria=N'Digital';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 41, N'Poder Ciudadano Radio', N'https://poderciudadanoradio.com/category/noticias/', N'https://www.facebook.com/poderciudadanoradio/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 42, N'Somos de Querétaro', NULL, N'https://www.facebook.com/profile.php?id=61568072700408&sk=about&locale=es_LA', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 43, N'San Pedro Ahuacatlan Noticias', NULL, N'https://www.facebook.com/sanpedroahuacatlannoticias/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 44, N'ALMomento Noticias', N'https://almomento-noticias.com/', N'https://www.facebook.com/AlMomentoQueretaro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 45, N'Diario de Querétaro', N'https://www.oem.com.mx/diariodequeretaro/', N'https://www.facebook.com/DiarioQro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico' AND c3.nombre_categoria=N'Híbrido';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 46, N'El Periódico de Querétaro', N'http://www.elperiodico.mx/', N'https://www.facebook.com/elperiodicoqro/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico' AND c3.nombre_categoria=N'Híbrido';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 47, N'Vigía Digital Querétaro', N'http://www.vigiadigitalqro.com/', N'https://www.facebook.com/vigiadigitalqro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 48, N'San Juan Al Día', NULL, N'https://www.facebook.com/profile.php?id=61567618131464&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 49, N'Qué hay San Juan', NULL, N'https://www.facebook.com/profile.php?id=61584623193241&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 50, N'Acontecer Querétaro', N'ttp://www.acontecerqueretaro.com/', N'https://www.facebook.com/AcontecerQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 51, N'Mauricio Kuri', N'http://mauriciokuri.com/', N'https://www.facebook.com/MauricioKuriGonzalez/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Gobernador';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 52, N'Reqronexion', N'http://www.reqronexion.com/', N'https://www.facebook.com/reqronexion/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 53, N'Pomares MX', NULL, N'https://www.facebook.com/pomaresoficial/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Conductor de Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 54, N'SIN Reservas Qro', N'http://sinreservasqueretaro.wordpress.com/', N'https://www.facebook.com/sinreservasqueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 55, N'FeliFer Macias', NULL, N'https://www.facebook.com/FeliferMaciasO/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 56, N'Roberto Cabreara Valencia', NULL, N'https://www.facebook.com/robertocabrerav/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 57, N'Rodrigo Monsalvo', NULL, N'https://www.facebook.com/RodrigoMonsalvoC/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'El Marqués',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 58, N'Josué "Chepe" Guerrero Trápala', NULL, N'https://www.facebook.com/ChepeGro?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Corregidora',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 59, N'Óscar Adrián Pérez', NULL, N'https://www.facebook.com/oscarperezmartinezoficial/?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Amealco de Bonfil',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 60, N'Miguel Martínez Peñaloza', NULL, N'https://www.facebook.com/MiguelMartinezPenalozaa/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Cadereyta de Montes',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Diputado';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 61, N'Gaspar Trueba', NULL, N'https://www.facebook.com/GasparTrueba5/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Colón',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 62, N'Iván Reséndiz Ramírez', NULL, N'https://www.facebook.com/IvanRsndzRmrz/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Ezequiel Montes',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 63, N'Jairo Morales', NULL, N'https://www.facebook.com/jairomoralesmtz/?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Huimilpan',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 64, N'Rubén Hernández', NULL, N'https://www.facebook.com/p/Rub%C3%A9n-Hern%C3%A1ndez-61551688837412/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Jalpan de Serra',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 65, N'Yunuen Benítez Maldonado', NULL, N'https://www.facebook.com/yuni.benitez/photos', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Landa de Matamoros',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 66, N'Beto Nava', NULL, N'https://www.facebook.com/betonavacz/photos?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pedro Escobedo',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 67, N'Municipio de Peñamiller', N'http://www.penamillerqro.gob.mx/', N'www.facebook.com/MunicipioDePenamillerQro/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Peñamiller',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo' AND c3.nombre_categoria=N'Ayuntamiento';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 68, N'Ana Karen Jimenez', NULL, N'https://www.facebook.com/nena.jimenez.52/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Peñamiller',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Funcionario Público';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 69, N'Carlos Manuel Ledesma Robles', NULL, N'https://www.facebook.com/CarlosManuelLedesmaRobleSj/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Joaquín',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 70, N'Héctor Magaña Renteria', NULL, N'https://www.facebook.com/maganarenteria', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Senador';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 71, N'Alejo Sánchez de Santiago', NULL, N'https://www.facebook.com/TuTienesElPoderalexito/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tolimán',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 72, N'Fernando Sánchez Gil', NULL, N'https://www.facebook.com/fernando.sanchezgil1/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Arroyo Seco',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 73, N'Lupita Rmz Plaza', NULL, N'https://www.facebook.com/LupitaRPlaza/', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pinal de Amoles',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Presidente Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 74, N'ADN Informativo Querétaro', N'http://www.adninformativo.com/', N'https://www.facebook.com/ADNQro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 75, N'Desde El Marqués', N'http://www.circulonoticias.com/', N'https://www.facebook.com/DesdeElMarques/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'El Marqués',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 76, N'Secretaria de DesarrolloSocial Queretaro', N'http://www.queretaro.gob.mx/', N'https://www.facebook.com/Sedesoq/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Organizaciones y Sociedad Civil' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Asociación Civil' AND c3.nombre_categoria=N'Apoyo Social';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 77, N'Queretanews', N'https://queretanews.com/', N'https://www.facebook.com/Queretanews', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 78, N'Conciencia Querétaro', NULL, N'https://www.facebook.com/QueretanoActivo/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 79, N'Noticias y Política de San Juan', NULL, N'https://www.facebook.com/profile.php?id=61581336364050a', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 80, N'Actores y escenarios', NULL, N'https://www.facebook.com/profile.php?id=61581336364050a', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 81, N'Premier Noticias Querétaro', N'https://www.premiernoticiasqro.com/', N'https://www.facebook.com/Queretaronoticia/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 82, N'Canal 10 Chichimequillas Noticias', N'https://www.canal10chichimequillas.com/', N'https://www.facebook.com/Canal10ChichimequillasNews/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'El Marqués',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 83, N'Secretaría de Seguridad Pública Municipal de El Marqués', N'http://www.elmarques.gob.mx/', N'https://www.facebook.com/SSPyTMElMarques/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'El Marqués',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Secretaría de Seguridad Pública';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 84, N'Pensador Queretano', N'http://pensadorqueretano.com/', N'https://www.facebook.com/pensadorqueretano/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Periodista Independiente';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 85, N'Voz Y Testimonio Oficial', N'http://vozytestimimonio.com/', N'https://www.facebook.com/VozyTestimonioOficial', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Periodista Independiente';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 86, N'RadarNews Qro', N'http://www.radarnews.mx/', N'https://www.facebook.com/radarnews1075/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 87, N'CódigoQro', N'https://s.mtrbio.com/codigoqro', N'https://www.facebook.com/CodigoQro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Periódico' AND c3.nombre_categoria=N'Híbrido';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 88, N'24 Querétaro Noticias', N'https://24queretaronoticias.com/', N'https://www.facebook.com/24NoticiasQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 89, N'Asícede Querétaro', N'http://www.asisucedequeretaro.mx/', N'https://www.facebook.com/AsiSucedeQro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 90, N'Despierta Tequis', NULL, N'https://www.facebook.com/DespiertaTequis/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tequisquiapan',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 91, N'Noticias Tolimán Oficial', N'http://WwwNoticiastoliman.com.gt/', N'https://www.facebook.com/profile.php?id=61561587265883&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tolimán',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 92, N'Hecho en San Juan del Rio', NULL, N'https://www.facebook.com/hechoensjr/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 93, N'Noticias Ezequiel Montes', NULL, N'https://www.facebook.com/profile.php?id=100069272275285&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Ezequiel Montes',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 94, N'El Observador De Querétaro', N'https://elobservadordequeretaro.com.mx/', N'https://www.facebook.com/ElObservadorDeQro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 95, N'Lorehna Vega', N'http://twitter.com/lorehnavega', N'https://www.facebook.com/Lorehnavega/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Conductor de Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 96, N'AlMomento Noticias', N'https://almomento-noticias.com/', N'https://www.facebook.com/AlMomentoQueretaro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 97, N'Alertas Municipio De Querétaro', NULL, N'https://www.facebook.com/groups/725672975800833/about?locale=es_LA', N'Comunitaria', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Comunidad Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 98, N'Waldo Maya', NULL, N'https://www.facebook.com/WaldoMayaOlguin/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Reportero';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 99, N'Tiempo Santa Rosa Jáuregui', N'http://www.tiemposrj.com.mx/', N'https://www.facebook.com/tiemposantarosajauregui/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 100, N'Meganoticias Querétaro', N'http://www.meganoticias.mx/', N'https://www.facebook.com/meganoticiasqro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión' AND c3.nombre_categoria=N'Canal Estatal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 101, N'Bitácora Diario', N'http://www.bitacoradiario.com/', N'https://www.facebook.com/BitacoraDiario/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Empresa / Negocio' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Medio Privado' AND c3.nombre_categoria=N'Agencia de Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 102, N'Noticias Corregidora', NULL, N'https://www.facebook.com/noticiascorregidora', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 103, N'Queretaro informado', NULL, N'https://www.facebook.com/groups/Qro.inf/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 104, N'Mala Vida Radio', N'https://malavidaqro.com/', N'https://www.facebook.com/MalaVidaQro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 105, N'Periódico en Línea', NULL, N'https://www.facebook.com/groups/Qro.inf/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 106, N'Desqbre Querétaro Noticias', NULL, N'https://www.facebook.com/informateqro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 107, N'Secretaría de Seguridad Pública Municipal de Querétaro', N'https://sspmqueretaro.com/', N'https://www.facebook.com/sspmqueretaro/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Secretaría de Seguridad Pública';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 108, N'Pérez Rendón María Martina', N'https://seseq.gob.mx/', N'https://www.facebook.com/MartinaPerezRendon/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Secretario';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 109, N'Valeria Martínez', NULL, N'https://www.facebook.com/profile.php?id=61571731835358&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Cadereyta de Montes',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Figura Política' AND c3.nombre_categoria=N'Regidor';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 110, N'Periódico El Mosquito', N'http://www.periodicoelmosquito.com/', N'https://www.facebook.com/periodicoelmosquito/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 111, N'Querétaro información y noticias', N'NA', N'https://www.facebook.com/groups/169941606805535/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 112, N'Alertas de seguridad San Juan  del rio y Tequisquiapan', NULL, N'https://www.facebook.com/groups/192977135383769', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 113, N'N + 57', NULL, N'https://www.facebook.com/profile.php?id=100088606042923&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Guanajuato',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 114, N'ADN40Mx', N'ADN40Mx', N'https://www.facebook.com/adnnoticiasmx/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 115, N'Seguridad Publica Corregidora', N'https://corregidora.gob.mx/portal/', N'https://corregidora.gob.mx/portal/', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Requiere revisión', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 116, N'Milenio Televisión', N'https://www.milenio.com/mileniotv', N'https://www.facebook.com/mileniotelevision/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Televisión' AND c3.nombre_categoria=N'Noticiero';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 117, N'CNN en Español', N'http://cnnespanol.cnn.com/', N'https://www.facebook.com/CNNee/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 118, N'Municipio de Corregidora', N'http://www.corregidora.gob.mx/', N'https://www.facebook.com/mpiocorregidora/about', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Corregidora',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 119, N'NMás', N'https://www.nmas.com.mx/', N'https://www.facebook.com/nmas.com.mx/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 120, N'QueretaroNoticias.com', N'https://www.queretaronoticias.com/', N'https://www.facebook.com/profile.php?id=61555462623054&sk=about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 121, N'Voces Al Aire', NULL, N'https://www.facebook.com/vocesalaire0411/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Otro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Ciudad de Mexico',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 122, N'Diario La Razón', N'http://www.razon.com.mx/', N'https://www.facebook.com/larazondemexico/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 123, N'Protección Civil Pinal de Amoles', N'http://www.pinaldeamoles.gob.mx/', N'https://www.facebook.com/profile.php?id=100086557633537&sk=about&locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pinal de Amoles',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 124, N'Seguridad Pública Pinal de Amoles', N'https://pinaldeamoles.gob.mx/', N'https://www.facebook.com/profile.php?id=61570651115626&sk=about&locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Secretaría de Seguridad Pública';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 125, N'Informante Serrano', NULL, N'https://www.facebook.com/profile.php?id=61565956828332&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 126, N'Que todo Querétaro Se Entere', N'http://www.quetodoqroseentere.com/', N'https://www.facebook.com/QueretaroEnterado/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 127, N'Radio Fórmula', N'https://www.radioformula.com.mx/', N'www.facebook.com/RadioFormulaMX/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 128, N'Imagen Radio', N'http://www.imagenradio.com.mx/', N'https://www.facebook.com/ImagenRadio/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Otro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Ciudad de Mexico',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 129, N'Secretaría de Seguridad y Protección Ciudadana de Colón', NULL, N'https://www.facebook.com/policiaColon/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Colón',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Secretaría de Seguridad Pública';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 130, N'Radio UAQ 89.5 FM', N'https://estaciones.uaq.mx/public/cu', N'https://www.facebook.com/RadioUAQ', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 131, N'SSPM de Pedro Escobedo', N'https://pedroescobedo.gob.mx/', N'https://www.facebook.com/SSPMPedroEscobedo/about?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pedro Escobedo',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Secretaría de Seguridad Pública';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 132, N'Imagen Querétaro', N'http://www.imagenqueretaro.mx/', N'https://www.facebook.com/imagenqueretaro94.7/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 133, N'RR Noticias', N'https://rrnoticias.mx/', N'https://www.facebook.com/rrnoticiasqro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 134, N'Radio Fórmula Querétaro', N'ttps://www.radioformula.com.mx/queretaro/', N'https://www.facebook.com/RadioFormulaQueretaro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 135, N'Inqro', N'http://www.inqro.tv/', N'https://www.facebook.com/inqro/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 136, N'Informe Queretano  (IQ Noticias)', N'http://informequeretano.com/', N'https://www.facebook.com/informequeretano/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 137, N'Tequisquiapan Noticias', NULL, N'https://www.facebook.com/profile.php?id=100077646686796&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tequisquiapan',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 138, N'Querétaro Comunicado', NULL, N'https://www.facebook.com/profile.php?id=61584274693562', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 139, N'Radar 107.5 Querétaro', N'https://www.radarfm.mx/', N'https://www.facebook.com/RadarQueretaro107.5', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 140, N'Municipio de Jalpan de Serra', N'http://jalpan.gob.mx/', N'https://www.facebook.com/JalpandeSerraMagico?locale=es_LA', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Jalpan de Serra',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Poder Ejecutivo' AND c3.nombre_categoria=N'Ayuntamiento';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 141, N'Protección Civil El Marqués', N'https://elmarques.gob.mx/proteccion-civil/', N'https://www.facebook.com/profile.php?id=100067304901267', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'El Marqués',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 142, N'Noticias de Queret', N'https://queretanews.com/', N'https://www.facebook.com/Queretanews?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 143, N'Sacar los hechos que quiero', NULL, N'https://www.facebook.com/Tirandofactosqro?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 144, N'Acceso Querétaro', NULL, N'https://www.facebook.com/profile.php?id=100076950018997&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 145, N'Protección Civil Amealco', N'http://amealco.gob.mx/', N'https://www.facebook.com/profile.php?id=61572115984504', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Amealco de Bonfil',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 146, N'Declaración de Protección Civil de Querétaro', N'https://www.proteccioncivilqro.gob.mx/', N'https://www.facebook.com/pcivilqro', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Estatal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 147, N'Protección Civil Corregidora', NULL, N'https://www.facebook.com/profile.php?id=100064653283992', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Requiere revisión', N'Link repetidos'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 148, N'Conoce más Pedro Escobedo Querétaro y sus alrededores.', N'http://www.conocemaspe.mx/', N'https://www.facebook.com/profile.php?id=61571961067774&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pedro Escobedo',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 149, N'Protección Civil Arroyo Seco, Qro.', NULL, N'https://www.facebook.com/profile.php?id=100087138235251', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Arroyo Seco',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 150, N'Cqcias', N'https://cias.gob.mx/', N'https://www.facebook.com/cqcias/', N'Privada', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Seguridad Pública' AND c3.nombre_categoria=N'Centro de Monitoreo / C5 / C4';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 151, N'Coordinación Estatal de Protección Civil de Querétaro', N'https://www.proteccioncivilqro.gob.mx/', N'https://www.facebook.com/pcivilqro', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Estatal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 152, N'Protección Civil SJR', NULL, N'https://www.facebook.com/profile.php?id=61573447187249', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'San Juan del Río',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 153, N'Protección Civil Tequisquiapan', NULL, N'https://www.facebook.com/profile.php?id=61566819129145', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tequisquiapan',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 154, N'Protección CIVIL Tolimán QRO', NULL, N'https://www.facebook.com/profile.php?id=61557014603949', N'Oficial', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tolimán',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Gobierno' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Protección Civil' AND c3.nombre_categoria=N'Protección Civil Municipal';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 155, N'Pomares MX', NULL, N'https://www.facebook.com/pomaresoficial/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Conductor de Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 156, N'Miguel Angel Alvarez Vargas', N'https://linktr.ee/malvarezvargas', N'https://www.facebook.com/malvarezv/?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Creador de Contenido Informativo';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 157, N'Querétaro 24/7', N'http://www.queretaro24-7.com/', N'https://www.facebook.com/Queretaro24.7', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 158, N'Amealco Al Día', NULL, N'https://www.facebook.com/groups/1650549139462448/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Amealco de Bonfil',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 159, N'Reporte Querétaro', N'http://www.ciudadypoder.mx/', N'https://www.facebook.com/ReporteQueretaro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 160, N'Radar News Última Hora', NULL, N'https://www.facebook.com/RadarNewsNoticieros/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 161, N'Querétaro Informado.', NULL, N'https://www.facebook.com/groups/Qro.inf/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 162, N'La Neta Noticias Queretaro', NULL, N'https://www.facebook.com/LaNetaNoticiasQueretaro?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 163, N'Códice Informativo', N'https://www.codiceinformativo.com/', N'https://www.facebook.com/codiceinformativo/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 164, N'Pedro Escobedo Noticias', NULL, N'https://www.facebook.com/profile.php?id=61561670571203&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Pedro Escobedo',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 165, N'Alertas de seguridad San Juan del rio y Tequisquiapan', NULL, N'https://www.facebook.com/groups/192977135383769/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 166, N'Noticias Querétaro! 24/7', NULL, N'https://www.facebook.com/groups/597137593784904/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 167, N'Noticias de Querétaro Sin Censura', NULL, N'https://www.facebook.com/groups/819400862592152/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Comunidad' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Grupos Comunitarios' AND c3.nombre_categoria=N'Información Local';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 168, N'Centro Informativo Qro', N'https://www.cinoticiasmx.com/', N'https://www.facebook.com/CINoticiasQro/about?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 169, N'CQ Noticias', N'http://www.cqnoticias.com/', N'https://www.facebook.com/profile.php?id=61568163730901&sk=about&locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 170, N'Tequisquiapan vive', NULL, N'https://www.facebook.com/TequisquiapanVive', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Tequisquiapan',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 171, N'Corregidora al Dia', NULL, N'https://www.facebook.com/CorregidoraAlDia', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Pendiente', N'Pendiente', N'Enlace inválido', N'Enlace no valido'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Corregidora',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 172, N'Qué Pasa en Querétaro', NULL, N'https://www.facebook.com/QuePasaEnQueretaro', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 173, N'Así Sucede Querétaro', N'asisucede.com.mx', N'https://www.facebook.com/AsiSucedeQro/aboutt', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Radio' AND c3.nombre_categoria=N'Radio Noticias';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 174, N'Panorama Queretano', N'panoramaqueretano.com', N'https://www.facebook.com/PanoramaQueretano', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 175, N'Soy Querétaro', N'soyqro.com', N'https://www.facebook.com/SoyQro', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Locales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 176, N'Periódico El Pueblito', NULL, N'https://www.facebook.com/PeriodicoElPueblito', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Estatales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 177, N'UAQ Sin Censura.', NULL, N'https://www.facebook.com/uaqsincensura', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Periodista Independiente';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 178, N'Ayudas carrillo', NULL, N'https://www.facebook.com/profile.php?id=61555354179910', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Emergencias y Rescate' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Alertas y Riesgos' AND c3.nombre_categoria=N'Alertas Viales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 179, N'Rockd Media', NULL, N'https://www.facebook.com/RockdMedia', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Periodista Independiente';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 180, N'Yoheme Pomares', NULL, N'https://www.facebook.com/pomaresoficial/about', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'Sí', N'Duplicado', N'Duplicado'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Sin subcategoría' AND c3.nombre_categoria=N'Sin tipo específico';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 181, N'Querétaro Network TV QNTV', N'http://queretaronetwork.tv/', N'https://www.facebook.com/QroNTV?locale=es_LA', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Medio Informativo' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Portal Digital' AND c3.nombre_categoria=N'Noticias Generales';
INSERT INTO dbo.fuentes (id_original, sitio, url_web, url_facebook, tipo_fuente, id_categoria, id_ubicacion, id_usuario, enlace_valido, pagina_activa, duplicado, estado_validacion, observaciones)
SELECT 182, N'Alejandro Villalvazo', NULL, N'https://www.facebook.com/profile.php?id=100044421636694', N'Medio', c3.id_categoria, ub.id_ubicacion, uc.id_usuario,
       N'Sí', N'Sí', N'No', N'Aprobado', N'ninguna'
FROM dbo.categorias c1
JOIN dbo.categorias c2 ON c2.id_padre = c1.id_categoria
JOIN dbo.categorias c3 ON c3.id_padre = c2.id_categoria
LEFT JOIN dbo.ubicaciones ub ON ISNULL(ub.municipio,N'')=ISNULL(N'Querétaro',N'') AND ISNULL(ub.estado,N'')=ISNULL(N'Querétaro',N'') AND ub.pais=N'México'
LEFT JOIN dbo.usuarios_captura uc ON uc.nombre_usuario=N'Mauricio'
WHERE c1.nombre_categoria=N'Figura Pública' AND c1.id_padre IS NULL AND c2.nombre_categoria=N'Comunicador / Periodista' AND c3.nombre_categoria=N'Periodista Independiente';
GO

CREATE VIEW dbo.vw_fuentes_detalle AS
SELECT f.id_fuente, f.id_original, f.sitio, f.url_web, f.url_facebook, f.tipo_fuente,
       CASE WHEN c.nivel=1 THEN c.nombre_categoria WHEN c.nivel=2 THEN cpadre.nombre_categoria WHEN c.nivel=3 THEN craiz.nombre_categoria END AS categoria_raiz,
       CASE WHEN c.nivel=1 THEN NULL WHEN c.nivel=2 THEN c.nombre_categoria WHEN c.nivel=3 THEN cpadre.nombre_categoria END AS subcategoria,
       CASE WHEN c.nivel=3 THEN c.nombre_categoria ELSE NULL END AS tipo_especifico,
       c.id_categoria,
       CASE WHEN c.nivel=1 THEN c.id_categoria WHEN c.nivel=2 THEN cpadre.id_categoria WHEN c.nivel=3 THEN craiz.id_categoria END AS id_categoria_raiz,
       CASE WHEN c.nivel=2 THEN c.id_categoria WHEN c.nivel=3 THEN cpadre.id_categoria ELSE NULL END AS id_subcategoria,
       CASE WHEN c.nivel=3 THEN c.id_categoria ELSE NULL END AS id_tipo_especifico,
       ub.municipio, ub.estado, ub.pais, f.enlace_valido, f.pagina_activa, f.duplicado, f.estado_validacion, f.observaciones,
       uc.nombre_usuario AS agregado_por, f.fecha_registro, f.fecha_actualizacion, f.activo_sistema
FROM dbo.fuentes f
JOIN dbo.categorias c ON c.id_categoria=f.id_categoria
LEFT JOIN dbo.categorias cpadre ON cpadre.id_categoria=c.id_padre
LEFT JOIN dbo.categorias craiz ON craiz.id_categoria=cpadre.id_padre
LEFT JOIN dbo.ubicaciones ub ON ub.id_ubicacion=f.id_ubicacion
LEFT JOIN dbo.usuarios_captura uc ON uc.id_usuario=f.id_usuario;
GO
CREATE VIEW dbo.vw_resumen_categorias AS
SELECT categoria_raiz AS nombre, COUNT(*) AS total FROM dbo.vw_fuentes_detalle WHERE activo_sistema=1 GROUP BY categoria_raiz;
GO
CREATE VIEW dbo.vw_resumen_validacion AS
SELECT estado_validacion, COUNT(*) AS total FROM dbo.fuentes WHERE activo_sistema=1 GROUP BY estado_validacion;
GO
CREATE VIEW dbo.vw_equipo2_urls AS
SELECT url_facebook FROM dbo.fuentes
WHERE activo_sistema=1 AND url_facebook IS NOT NULL AND LTRIM(RTRIM(url_facebook))<>N''
  AND estado_validacion IN (N'Aprobado', N'Validado', N'validado')
  AND enlace_valido IN (N'Sí', N'Si', N'1', N'Validado')
  AND pagina_activa IN (N'Sí', N'Si', N'1', N'Activa');
GO
CREATE PROCEDURE dbo.spCrearFuente
    @sitio NVARCHAR(255), @url_web NVARCHAR(500)=NULL, @url_facebook NVARCHAR(500), @tipo_fuente NVARCHAR(100)=NULL,
    @id_categoria INT, @municipio NVARCHAR(100)=NULL, @estado NVARCHAR(100)=N'Querétaro', @pais NVARCHAR(100)=N'México',
    @enlace_valido NVARCHAR(20)=N'Sí', @pagina_activa NVARCHAR(20)=N'Sí', @duplicado NVARCHAR(20)=N'No',
    @estado_validacion NVARCHAR(50)=N'Pendiente', @observaciones NVARCHAR(MAX)=NULL, @agregado_por NVARCHAR(100)=N'Sistema'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_ubicacion INT, @id_usuario INT;
    IF EXISTS (SELECT 1 FROM dbo.fuentes WHERE url_facebook=@url_facebook AND activo_sistema=1)
    BEGIN RAISERROR(N'Esa URL de Facebook ya está registrada en el sistema.',16,1); RETURN; END
    SELECT @id_ubicacion=id_ubicacion FROM dbo.ubicaciones WHERE ISNULL(municipio,N'')=ISNULL(@municipio,N'') AND ISNULL(estado,N'')=ISNULL(@estado,N'') AND pais=@pais;
    IF @id_ubicacion IS NULL BEGIN INSERT INTO dbo.ubicaciones(municipio,estado,pais) VALUES(@municipio,@estado,@pais); SET @id_ubicacion=SCOPE_IDENTITY(); END
    SELECT @id_usuario=id_usuario FROM dbo.usuarios_captura WHERE nombre_usuario=@agregado_por;
    IF @id_usuario IS NULL BEGIN INSERT INTO dbo.usuarios_captura(nombre_usuario) VALUES(@agregado_por); SET @id_usuario=SCOPE_IDENTITY(); END
    INSERT INTO dbo.fuentes(sitio,url_web,url_facebook,tipo_fuente,id_categoria,id_ubicacion,id_usuario,enlace_valido,pagina_activa,duplicado,estado_validacion,observaciones)
    VALUES(@sitio,@url_web,@url_facebook,@tipo_fuente,@id_categoria,@id_ubicacion,@id_usuario,@enlace_valido,@pagina_activa,@duplicado,@estado_validacion,@observaciones);
    SELECT SCOPE_IDENTITY() AS id_fuente;
END
GO
CREATE PROCEDURE dbo.spActualizarFuente
    @id_fuente INT, @sitio NVARCHAR(255), @url_web NVARCHAR(500)=NULL, @url_facebook NVARCHAR(500), @tipo_fuente NVARCHAR(100)=NULL,
    @id_categoria INT, @municipio NVARCHAR(100)=NULL, @estado NVARCHAR(100)=N'Querétaro', @pais NVARCHAR(100)=N'México',
    @enlace_valido NVARCHAR(20)=N'Sí', @pagina_activa NVARCHAR(20)=N'Sí', @duplicado NVARCHAR(20)=N'No',
    @estado_validacion NVARCHAR(50)=N'Pendiente', @observaciones NVARCHAR(MAX)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id_ubicacion INT;
    IF EXISTS (SELECT 1 FROM dbo.fuentes WHERE url_facebook=@url_facebook AND id_fuente<>@id_fuente AND activo_sistema=1)
    BEGIN RAISERROR(N'Esa URL de Facebook ya está registrada en otro registro.',16,1); RETURN; END
    SELECT @id_ubicacion=id_ubicacion FROM dbo.ubicaciones WHERE ISNULL(municipio,N'')=ISNULL(@municipio,N'') AND ISNULL(estado,N'')=ISNULL(@estado,N'') AND pais=@pais;
    IF @id_ubicacion IS NULL BEGIN INSERT INTO dbo.ubicaciones(municipio,estado,pais) VALUES(@municipio,@estado,@pais); SET @id_ubicacion=SCOPE_IDENTITY(); END
    UPDATE dbo.fuentes SET sitio=@sitio, url_web=@url_web, url_facebook=@url_facebook, tipo_fuente=@tipo_fuente, id_categoria=@id_categoria,
        id_ubicacion=@id_ubicacion, enlace_valido=@enlace_valido, pagina_activa=@pagina_activa, duplicado=@duplicado,
        estado_validacion=@estado_validacion, observaciones=@observaciones, fecha_actualizacion=SYSDATETIME()
    WHERE id_fuente=@id_fuente;
END
GO
CREATE PROCEDURE dbo.spEliminarFuente @id_fuente INT AS BEGIN SET NOCOUNT ON; UPDATE dbo.fuentes SET activo_sistema=0, fecha_actualizacion=SYSDATETIME() WHERE id_fuente=@id_fuente; END
GO
CREATE PROCEDURE dbo.spObtenerFuente @id_fuente INT AS BEGIN SET NOCOUNT ON; SELECT * FROM dbo.vw_fuentes_detalle WHERE id_fuente=@id_fuente; END
GO
CREATE PROCEDURE dbo.spListarFuentes @q NVARCHAR(255)=NULL AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.vw_fuentes_detalle
    WHERE activo_sistema=1 AND (@q IS NULL OR @q=N'' OR sitio LIKE N'%'+@q+N'%' OR categoria_raiz LIKE N'%'+@q+N'%' OR municipio LIKE N'%'+@q+N'%' OR tipo_fuente LIKE N'%'+@q+N'%')
    ORDER BY sitio;
END
GO
SELECT COUNT(*) AS total_fuentes FROM dbo.fuentes;
SELECT COUNT(*) AS total_categorias FROM dbo.categorias;
SELECT TOP 20 * FROM dbo.vw_fuentes_detalle ORDER BY id_fuente;
GO
