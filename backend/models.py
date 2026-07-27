from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Text, Double, PrimaryKeyConstraint

class Base(DeclarativeBase):
    pass

class Pagina(Base):
    __tablename__ = "paginas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    url_facebook: Mapped[str] = mapped_column(Text, nullable=False)
    url_web: Mapped[str] = mapped_column(Text, nullable=True)
    categoria: Mapped[str] = mapped_column(Text, nullable=True)
    activa: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class Publicacion(Base):
    __tablename__ = "publicaciones"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    id_facebook: Mapped[str] = mapped_column(Text, nullable=True)
    enlace: Mapped[str] = mapped_column(Text, nullable=True)
    pagina_id: Mapped[int] = mapped_column(Integer, nullable=True)
    autor: Mapped[str] = mapped_column(Text, nullable=True)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    etiqueta: Mapped[str] = mapped_column(Text, nullable=True)
    sentimiento: Mapped[str] = mapped_column(Text, nullable=True)
    severidad: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    me_gusta: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    compartidos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reacciones: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_gusta: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_encanta: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_importa: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_divierte: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_enoja: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_entristece: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    reaccion_me_asombra: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    engagement_total: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    ubicacion: Mapped[str] = mapped_column(Text, nullable=True)
    actividad: Mapped[str] = mapped_column(String(255), default="desconocido", nullable=False)
    fecha_publicacion: Mapped[str] = mapped_column(Text, nullable=True)
    fecha_registro: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_actualizacion: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_ultima_revision: Mapped[str] = mapped_column(Text, nullable=True)
    total_comentarios_analizados: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_positivos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_negativos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_neutros: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    sentimiento_comentarios: Mapped[str] = mapped_column(String(255), default="neutral", nullable=True)
    estado_validacion: Mapped[str] = mapped_column(String(255), default="activo", nullable=False)
    factores_severidad: Mapped[str] = mapped_column(Text, nullable=True)
    worker_id: Mapped[str] = mapped_column(Text, nullable=True)
    ultimo_ciclo_id: Mapped[int] = mapped_column(Integer, nullable=True)


class Comentario(Base):
    __tablename__ = "comentarios"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    publicacion_id: Mapped[str] = mapped_column(String(255), nullable=False)
    autor: Mapped[str] = mapped_column(Text, nullable=True)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    sentimiento: Mapped[str] = mapped_column(Text, nullable=True)
    fecha: Mapped[str] = mapped_column(Text, nullable=False)


class ImagenPublicacion(Base):
    __tablename__ = "imagenes_publicacion"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    publicacion_id: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=True)



class MetricaDiaria(Base):
    __tablename__ = "metricas_diarias"
    __table_args__ = (
        PrimaryKeyConstraint("fecha", "categoria"),
    )
    
    fecha: Mapped[str] = mapped_column(String(255))
    categoria: Mapped[str] = mapped_column(String(255))
    total_publicaciones: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    total_me_gusta: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    total_reacciones: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    total_comentarios: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    total_compartidos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    severidad_promedio: Mapped[float] = mapped_column(Double, default=0.0, nullable=True)
    severidad_maxima: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    total_comentarios_analizados: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_positivos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_negativos: Mapped[int] = mapped_column(Integer, default=0, nullable=True)
    comentarios_neutros: Mapped[int] = mapped_column(Integer, default=0, nullable=True)


class Ciclo(Base):
    __tablename__ = "ciclos"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=False)
    worker_id: Mapped[str] = mapped_column(Text, nullable=False)
    modo: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(Text, nullable=False)
    paginas_asignadas: Mapped[str] = mapped_column(Text, nullable=True)
    inicio: Mapped[str] = mapped_column(Text, nullable=False)
    fin: Mapped[str] = mapped_column(Text, nullable=True)
    metricas: Mapped[str] = mapped_column(Text, nullable=True)
    detalle: Mapped[str] = mapped_column(Text, nullable=True)


class Descarte(Base):
    __tablename__ = "descartes"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, nullable=True)
    worker_id: Mapped[str] = mapped_column(Text, nullable=False)
    ciclo_id: Mapped[int] = mapped_column(Integer, nullable=True)
    pagina_id: Mapped[int] = mapped_column(Integer, nullable=True)
    contenido_preview: Mapped[str] = mapped_column(Text, nullable=True)
    categoria: Mapped[str] = mapped_column(Text, nullable=True)
    estado_validacion: Mapped[str] = mapped_column(String(255), default="pendiente", nullable=False)
    motivos: Mapped[str] = mapped_column(Text, nullable=False)
    severidad: Mapped[int] = mapped_column(Integer, nullable=True)
    enlace: Mapped[str] = mapped_column(Text, nullable=True)
    id_facebook: Mapped[str] = mapped_column(Text, nullable=True)
    creado_en: Mapped[str] = mapped_column(Text, nullable=False)


class StagingProcesado(Base):
    __tablename__ = "staging_procesado"
    
    archivo: Mapped[str] = mapped_column(String(255), primary_key=True)
    worker_id: Mapped[str] = mapped_column(Text, nullable=False)
    run_id: Mapped[str] = mapped_column(Text, nullable=True)
    ciclo_id: Mapped[int] = mapped_column(Integer, nullable=True)
    procesado_en: Mapped[str] = mapped_column(Text, nullable=False)
    lineas: Mapped[int] = mapped_column(Integer, nullable=True)


class EngagementSnapshot(Base):
    __tablename__ = "engagement_snapshots"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    publicacion_id: Mapped[str] = mapped_column(String(255), nullable=False)
    ciclo_id: Mapped[int] = mapped_column(Integer, nullable=True)
    worker_id: Mapped[str] = mapped_column(Text, nullable=False)
    me_gusta: Mapped[int] = mapped_column(Integer, nullable=True)
    comentarios: Mapped[int] = mapped_column(Integer, nullable=True)
    compartidos: Mapped[int] = mapped_column(Integer, nullable=True)
    reacciones: Mapped[int] = mapped_column(Integer, nullable=True)
    engagement_total: Mapped[int] = mapped_column(Integer, nullable=True)
    capturado_en: Mapped[str] = mapped_column(Text, nullable=False)

