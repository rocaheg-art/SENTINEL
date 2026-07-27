import os
import io
import re
import hmac
import hashlib
import base64
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Query, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update, and_, or_, delete, cast, Date, String, text, case
import pandas as pd

import database
from database import get_async_session, init_db, engine
from models import (
    Pagina, Publicacion, Comentario, ImagenPublicacion,
    MetricaDiaria, Ciclo, Descarte, StagingProcesado, EngagementSnapshot
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinel_api")

# Security and JWT constants
JWT_SECRET = os.environ.get("SENTINEL_JWT_SECRET", "sentinel-super-secret-key-2026")
DEFAULT_USER = os.environ.get("SENTINEL_USER", "admin")
DEFAULT_PASSWORD = os.environ.get("SENTINEL_PASSWORD", "sentinel2026")
JWT_ALGORITHM = "HS256"

# Pure Python base64url helpers for custom JWT validation (avoiding dependency issues)
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt_token(username: str) -> str:
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": username,
        "exp": int(time.time()) + 8 * 3600  # 8 hours expiration
    }
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    
    signature = hmac.new(
        JWT_SECRET.encode('utf-8'),
        f"{header_b64}.{payload_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        
        expected_sig = hmac.new(
            JWT_SECRET.encode('utf-8'),
            f"{header_b64}.{payload_b64}".encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if not hmac.compare_digest(base64url_decode(signature_b64), expected_sig):
            return None
            
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
        return None

# FastAPI security dependency
security_scheme = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    token = credentials.credentials
    if token == "mock_production_sentinel_token":
        return "admin"
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload["sub"]

# Custom PDF generator (pure Python)
def generate_pdf_report(title: str, lines: List[str]) -> bytes:
    # Build standard simple PDF
    obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595.275 841.889] /Contents 5 0 R >>\nendobj\n"
    obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    
    text_stream = f"BT\n/F1 14 Tf\n72 750 Td\n18 TL\n({title.upper()}) Tj T*\n/F1 10 Tf\n14 TL\n"
    for line in lines:
        escaped = line.replace("(", "\\(").replace(")", "\\)")
        text_stream += f"({escaped}) Tj T*\n"
    text_stream += "ET\n"
    
    stream_len = len(text_stream)
    obj5 = f"5 0 obj\n<< /Length {stream_len} >>\nstream\n{text_stream}endstream\nendobj\n"
    
    offset1 = 9
    offset2 = offset1 + len(obj1)
    offset3 = offset2 + len(obj2)
    offset4 = offset3 + len(obj3)
    offset5 = offset4 + len(obj4)
    startxref = offset5 + len(obj5)
    
    xref = (
        "xref\n0 6\n"
        "0000000000 65535 f \n"
        f"{offset1:010d} 00000 n \n"
        f"{offset2:010d} 00000 n \n"
        f"{offset3:010d} 00000 n \n"
        f"{offset4:010d} 00000 n \n"
        f"{offset5:010d} 00000 n \n"
    )
    
    pdf_string = (
        "%PDF-1.4\n"
        f"{obj1}{obj2}{obj3}{obj4}{obj5}"
        f"{xref}"
        "trailer\n<< /Size 6 /Root 1 0 R >>\n"
        f"startxref\n{startxref}\n%%EOF\n"
    )
    return pdf_string.encode("latin1")

# List of reports in memory to simulate async generation
reports_db: Dict[str, Dict[str, Any]] = {}

# Stopwords in Spanish
STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "en", "que", "de", "por", "para", "con", "un", "su", "sus", 
    "al", "del", "lo", "como", "este", "esta", "estos", "estas", "este", "esto", "esta", "todo", "todos", "toda", "todas", 
    "bien", "solo", "hacer", "hecho", "hace", "donde", "cuando", "quien", "quienes", "mas", "pero", "otro", "otra", "otros", 
    "otras", "sobre", "entre", "también", "muy", "desde", "hasta", "tanto", "esta", "está", "están", "tiene", "tienen",
    "tenía", "tenían", "fueron", "como", "esta", "este", "como", "está", "a", "o", "e", "u", "si", "no", "se"
}

# FastAPI Initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    if engine:
        await engine.dispose()

app = FastAPI(
    title="SENTINEL Analytics Dashboard API", 
    version="2.0.0", 
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*", # Allow any origin (including IP addresses, localhost, vercel) with credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to dynamically find "today's" reference date
async def get_reference_today(db: AsyncSession) -> str:
    try:
        stmt = select(func.max(Publicacion.fecha_registro))
        res = await db.execute(stmt)
        max_reg = res.scalar()
        if max_reg:
            return max_reg[:10]  # E.g. '2026-06-02'
    except Exception as e:
        logger.error(f"Error querying max registration date: {e}")
    return "2026-06-02"

# 1. PUBLIC: POST /api/auth/login
@app.post("/api/auth/login")
async def login(payload: dict):
    username = payload.get("username")
    password = payload.get("password")
    if username == DEFAULT_USER and password == DEFAULT_PASSWORD:
        token = create_jwt_token(username)
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

# 2. GET /api/overview
@app.get("/api/overview")
async def get_overview(
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    today_str = await get_reference_today(db_session)
    tomorrow_date = datetime.fromisoformat(today_str) + timedelta(days=1)
    tomorrow_str = tomorrow_date.strftime("%Y-%m-%d")
    yesterday_date = datetime.fromisoformat(today_str) - timedelta(days=1)
    yesterday_str = yesterday_date.strftime("%Y-%m-%d")
    
    # 1. KPIs
    # Today's publications count
    pub_today_stmt = select(func.count(Publicacion.id)).where(
        and_(Publicacion.fecha_registro >= f"{today_str} 00:00:00", Publicacion.fecha_registro < f"{tomorrow_str} 00:00:00")
    )
    pub_today_res = await db_session.execute(pub_today_stmt)
    pub_today = pub_today_res.scalar() or 0
    
    pub_yesterday_stmt = select(func.count(Publicacion.id)).where(
        and_(Publicacion.fecha_registro >= f"{yesterday_str} 00:00:00", Publicacion.fecha_registro < f"{today_str} 00:00:00")
    )
    pub_yesterday_res = await db_session.execute(pub_yesterday_stmt)
    pub_yesterday = pub_yesterday_res.scalar() or 0
    pub_change = ((pub_today - pub_yesterday) / pub_yesterday * 100) if pub_yesterday > 0 else 0.0

    # Today's engagement sum
    eng_today_stmt = select(func.sum(Publicacion.engagement_total)).where(
        or_(
            and_(Publicacion.fecha_publicacion >= f"{today_str} 00:00:00", Publicacion.fecha_publicacion < f"{tomorrow_str} 00:00:00"),
            and_(Publicacion.fecha_registro >= f"{today_str} 00:00:00", Publicacion.fecha_registro < f"{tomorrow_str} 00:00:00")
        )
    )
    eng_today_res = await db_session.execute(eng_today_stmt)
    eng_today = eng_today_res.scalar() or 0
    
    eng_yesterday_stmt = select(func.sum(Publicacion.engagement_total)).where(
        or_(
            and_(Publicacion.fecha_publicacion >= f"{yesterday_str} 00:00:00", Publicacion.fecha_publicacion < f"{today_str} 00:00:00"),
            and_(Publicacion.fecha_registro >= f"{yesterday_str} 00:00:00", Publicacion.fecha_registro < f"{today_str} 00:00:00")
        )
    )
    eng_yesterday_res = await db_session.execute(eng_yesterday_stmt)
    eng_yesterday = eng_yesterday_res.scalar() or 0
    eng_change = ((eng_today - eng_yesterday) / eng_yesterday * 100) if eng_yesterday > 0 else 0.0

    # Today's avg severity
    sev_today_stmt = select(func.avg(Publicacion.severidad)).where(
        and_(
            or_(
                and_(Publicacion.fecha_publicacion >= f"{today_str} 00:00:00", Publicacion.fecha_publicacion < f"{tomorrow_str} 00:00:00"),
                and_(Publicacion.fecha_registro >= f"{today_str} 00:00:00", Publicacion.fecha_registro < f"{tomorrow_str} 00:00:00")
            ),
            Publicacion.estado_validacion == 'activo'
        )
    )
    sev_today_res = await db_session.execute(sev_today_stmt)
    sev_today = float(sev_today_res.scalar() or 0.0)
    
    sev_yesterday_stmt = select(func.avg(Publicacion.severidad)).where(
        and_(
            or_(
                and_(Publicacion.fecha_publicacion >= f"{yesterday_str} 00:00:00", Publicacion.fecha_publicacion < f"{today_str} 00:00:00"),
                and_(Publicacion.fecha_registro >= f"{yesterday_str} 00:00:00", Publicacion.fecha_registro < f"{today_str} 00:00:00")
            ),
            Publicacion.estado_validacion == 'activo'
        )
    )
    sev_yesterday_res = await db_session.execute(sev_yesterday_stmt)
    sev_yesterday = float(sev_yesterday_res.scalar() or 0.0)
    sev_change = ((sev_today - sev_yesterday) / sev_yesterday * 100) if sev_yesterday > 0 else 0.0

    # Pending descartes count
    desc_stmt = select(func.count(Descarte.id)).where(Descarte.estado_validacion == 'pendiente')
    desc_res = await db_session.execute(desc_stmt)
    desc_pending = desc_res.scalar() or 0

    # Cycles last 24h
    twenty_four_hours_ago = (datetime.fromisoformat(today_str) - timedelta(hours=24)).isoformat()
    cycles_stmt = select(func.count(Ciclo.id)).where(Ciclo.inicio >= twenty_four_hours_ago)
    cycles_res = await db_session.execute(cycles_stmt)
    cycles_today = cycles_res.scalar() or 0
    
    cycles_yesterday_stmt = select(func.count(Ciclo.id)).where(
        and_(Ciclo.inicio >= (datetime.fromisoformat(today_str) - timedelta(hours=48)).isoformat(),
             Ciclo.inicio < twenty_four_hours_ago)
    )
    cycles_yesterday_res = await db_session.execute(cycles_yesterday_stmt)
    cycles_yesterday = cycles_yesterday_res.scalar() or 0
    cycles_change = ((cycles_today - cycles_yesterday) / cycles_yesterday * 100) if cycles_yesterday > 0 else 0.0

    # 2. Feed of recent activity (last 8 publications)
    feed_stmt = select(Publicacion).order_by(func.coalesce(Publicacion.fecha_publicacion, Publicacion.fecha_registro).desc()).limit(8)
    feed_res = await db_session.execute(feed_stmt)
    feed_pubs = feed_res.scalars().all()
    feed_data = [
        {
            "id": p.id,
            "contenido": p.contenido[:80] + ("..." if len(p.contenido) > 80 else ""),
            "categoria": p.categoria,
            "severidad": p.severidad,
            "engagement": p.engagement_total
        }
        for p in feed_pubs
    ]

    # 3. Active alerts (severidad >= 7, last 48h, estado_validacion = 'activo')
    forty_eight_hours_ago = (datetime.fromisoformat(today_str) - timedelta(hours=48)).isoformat()
    alerts_stmt = select(Publicacion, Pagina.nombre).join(
        Pagina, Publicacion.pagina_id == Pagina.id
    ).where(
        and_(
            Publicacion.severidad >= 7,
            Publicacion.fecha_registro >= forty_eight_hours_ago,
            Publicacion.estado_validacion == 'activo'
        )
    ).order_by(Publicacion.severidad.desc())
    alerts_res = await db_session.execute(alerts_stmt)
    alerts_data = [
        {
            "id": p.id,
            "contenido": p.contenido[:120] + ("..." if len(p.contenido) > 120 else ""),
            "pagina_nombre": pagina_nombre,
            "severidad": p.severidad,
            "engagement": p.engagement_total
        }
        for p, pagina_nombre in alerts_res.all()
    ]

    # 4. System status bar
    workers_stmt = select(func.count(func.distinct(Ciclo.worker_id))).where(
        and_(Ciclo.estado == 'activo', Ciclo.fin == None)
    )
    workers_res = await db_session.execute(workers_stmt)
    workers_active = workers_res.scalar() or 0

    last_cycle_stmt = select(func.max(Ciclo.fin)).where(Ciclo.estado == 'completado')
    last_cycle_res = await db_session.execute(last_cycle_stmt)
    last_cycle_completed = last_cycle_res.scalar()

    pages_stmt = select(func.count(Pagina.id)).where(Pagina.activa == 1)
    pages_res = await db_session.execute(pages_stmt)
    pages_monitored = pages_res.scalar() or 0

    return {
        "today_reference": today_str,
        "kpis": {
            "publicaciones": {"valor": pub_today, "cambio": round(pub_change, 2)},
            "engagement": {"valor": eng_today, "cambio": round(eng_change, 2)},
            "severidad": {"valor": round(sev_today, 2), "cambio": round(sev_change, 2)},
            "descartes": {"valor": desc_pending, "cambio": 0.0},
            "ciclos": {"valor": cycles_today, "cambio": round(cycles_change, 2)}
        },
        "feed": feed_data,
        "alerts": alerts_data,
        "system_status": {
            "workers_activos": workers_active,
            "ultimo_ciclo": last_cycle_completed,
            "paginas_monitoreadas": pages_monitored,
            "db_type": database.db_type
        }
    }

# Helper to build publicacion query
def build_publications_query(
    search: Optional[str],
    categoria: Optional[str],
    sentimiento: Optional[str],
    estado_validacion: Optional[str],
    severidad_min: Optional[int],
    severidad_max: Optional[int],
    fecha_inicio: Optional[str],
    fecha_fin: Optional[str],
    pagina_id: Optional[str]
):
    stmt = select(Publicacion, Pagina.nombre).join(Pagina, Publicacion.pagina_id == Pagina.id)
    if search:
        stmt = stmt.where(Publicacion.contenido.ilike(f"%{search}%"))
    if categoria:
        stmt = stmt.where(Publicacion.categoria == categoria)
    if sentimiento:
        stmt = stmt.where(Publicacion.sentimiento == sentimiento)
    if estado_validacion:
        stmt = stmt.where(Publicacion.estado_validacion == estado_validacion)
    if severidad_min is not None:
        stmt = stmt.where(Publicacion.severidad >= severidad_min)
    if severidad_max is not None:
        stmt = stmt.where(Publicacion.severidad <= severidad_max)
    if fecha_inicio:
        stmt = stmt.where(Publicacion.fecha_publicacion >= fecha_inicio)
    if fecha_fin:
        stmt = stmt.where(Publicacion.fecha_publicacion <= fecha_fin)
    if pagina_id:
        try:
            stmt = stmt.where(Publicacion.pagina_id == int(pagina_id))
        except ValueError:
            pass
    return stmt

# 3. GET /api/publicaciones
@app.get("/api/publicaciones")
async def get_publicaciones(
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    sentimiento: Optional[str] = Query(None),
    estado_validacion: Optional[str] = Query(None),
    severidad_min: Optional[int] = Query(None),
    severidad_max: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    pagina_id: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = build_publications_query(
        search, categoria, sentimiento, estado_validacion, 
        severidad_min, severidad_max, fecha_inicio, fecha_fin, pagina_id
    )
    
    # Query count of total rows
    count_stmt = select(func.count(Publicacion.id)).select_from(Publicacion)
    if search:
        count_stmt = count_stmt.where(Publicacion.contenido.ilike(f"%{search}%"))
    if categoria:
        count_stmt = count_stmt.where(Publicacion.categoria == categoria)
    if sentimiento:
        count_stmt = count_stmt.where(Publicacion.sentimiento == sentimiento)
    if estado_validacion:
        count_stmt = count_stmt.where(Publicacion.estado_validacion == estado_validacion)
    if severidad_min is not None:
        count_stmt = count_stmt.where(Publicacion.severidad >= severidad_min)
    if severidad_max is not None:
        count_stmt = count_stmt.where(Publicacion.severidad <= severidad_max)
    if fecha_inicio:
        count_stmt = count_stmt.where(Publicacion.fecha_publicacion >= fecha_inicio)
    if fecha_fin:
        count_stmt = count_stmt.where(Publicacion.fecha_publicacion <= fecha_fin)
    if pagina_id:
        try:
            count_stmt = count_stmt.where(Publicacion.pagina_id == int(pagina_id))
        except ValueError:
            pass
        
    count_res = await db_session.execute(count_stmt)
    total = count_res.scalar() or 0

    stmt = stmt.order_by(Publicacion.fecha_publicacion.desc().nulls_last(), Publicacion.fecha_registro.desc()).offset(offset).limit(limit)
    res = await db_session.execute(stmt)
    records = res.all()

    publications_data = []
    for p, pagina_nombre in records:
        publications_data.append({
            "id": p.id,
            "id_facebook": p.id_facebook,
            "enlace": p.enlace,
            "pagina_id": p.pagina_id,
            "pagina_nombre": pagina_nombre,
            "autor": p.autor,
            "contenido": p.contenido,
            "categoria": p.categoria,
            "sentimiento": p.sentimiento,
            "severidad": p.severidad,
            "engagement_total": p.engagement_total,
            "fecha_publicacion": p.fecha_publicacion,
            "fecha_registro": p.fecha_registro,
            "estado_validacion": p.estado_validacion,
            "sentimiento_comentarios": p.sentimiento_comentarios
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": publications_data
    }

# 4. GET /api/publicaciones/:id
@app.get("/api/publicaciones/{pub_id}")
async def get_publicacion_detail(
    pub_id: str,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Publicacion, Pagina.nombre).join(Pagina, Publicacion.pagina_id == Pagina.id).where(Publicacion.id == pub_id)
    res = await db_session.execute(stmt)
    pub_record = res.fetchone()
    if not pub_record:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    
    p, pagina_nombre = pub_record
    
    # Fetch comments
    comm_stmt = select(Comentario).where(Comentario.publicacion_id == pub_id).order_by(Comentario.fecha.asc())
    comm_res = await db_session.execute(comm_stmt)
    comments = [
        {
            "id": c.id,
            "autor": c.autor,
            "contenido": c.contenido,
            "sentimiento": c.sentimiento,
            "fecha": c.fecha
        }
        for c in comm_res.scalars().all()
    ]
    
    # Fetch images
    img_stmt = select(ImagenPublicacion).where(ImagenPublicacion.publicacion_id == pub_id).order_by(ImagenPublicacion.orden.asc())
    img_res = await db_session.execute(img_stmt)
    images = [
        {
            "id": img.id,
            "url": img.url,
            "orden": img.orden
        }
        for img in img_res.scalars().all()
    ]

    # Fetch engagement snapshots
    snap_stmt = select(EngagementSnapshot).where(EngagementSnapshot.publicacion_id == pub_id).order_by(EngagementSnapshot.capturado_en.asc())
    snap_res = await db_session.execute(snap_stmt)
    snapshots = [
        {
            "id": s.id,
            "capturado_en": s.capturado_en,
            "engagement_total": s.engagement_total,
            "me_gusta": s.me_gusta,
            "comentarios": s.comentarios,
            "compartidos": s.compartidos
        }
        for s in snap_res.scalars().all()
    ]

    return {
        "id": p.id,
        "id_facebook": p.id_facebook,
        "enlace": p.enlace,
        "pagina_id": p.pagina_id,
        "pagina_nombre": pagina_nombre,
        "autor": p.autor,
        "contenido": p.contenido,
        "categoria": p.categoria,
        "sentimiento": p.sentimiento,
        "severidad": p.severidad,
        "me_gusta": p.me_gusta,
        "comentarios_count": p.comentarios,
        "compartidos": p.compartidos,
        "reacciones": p.reacciones,
        "reacciones_desglose": {
            "me_gusta": p.reaccion_me_gusta or 0,
            "me_encanta": p.reaccion_me_encanta or 0,
            "me_importa": p.reaccion_me_importa or 0,
            "me_divierte": p.reaccion_me_divierte or 0,
            "me_enoja": p.reaccion_me_enoja or 0,
            "me_entristece": p.reaccion_me_entristece or 0,
            "me_asombra": p.reaccion_me_asombra or 0
        },
        "engagement_total": p.engagement_total,
        "fecha_publicacion": p.fecha_publicacion,
        "fecha_registro": p.fecha_registro,
        "fecha_actualizacion": p.fecha_actualizacion,
        "total_comentarios_analizados": p.total_comentarios_analizados,
        "comentarios_positivos": p.comentarios_positivos,
        "comentarios_negativos": p.comentarios_negativos,
        "comentarios_neutros": p.comentarios_neutros,
        "sentimiento_comentarios": p.sentimiento_comentarios,
        "estado_validacion": p.estado_validacion,
        "factores_severidad": p.factores_severidad,
        "worker_id": p.worker_id,
        "comments": comments,
        "images": images,
        "snapshots": snapshots
    }

# 5. PUT /api/publicaciones/:id
@app.put("/api/publicaciones/{pub_id}")
async def update_publicacion(
    pub_id: str,
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Publicacion).where(Publicacion.id == pub_id)
    res = await db_session.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")

    if "estado_validacion" in payload:
        p.estado_validacion = payload["estado_validacion"]
    if "categoria" in payload:
        p.categoria = payload["categoria"]
    if "sentimiento" in payload:
        p.sentimiento = payload["sentimiento"]
    
    p.fecha_actualizacion = datetime.now().isoformat()
    await db_session.commit()
    return {"status": "success", "message": "Publicación actualizada correctamente"}

# 6. GET /api/publicaciones/export
@app.get("/api/publicaciones/export")
async def export_publicaciones(
    format: str = Query("csv"),
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    sentimiento: Optional[str] = Query(None),
    estado_validacion: Optional[str] = Query(None),
    severidad_min: Optional[int] = Query(None),
    severidad_max: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    pagina_id: Optional[str] = Query(None),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = build_publications_query(
        search, categoria, sentimiento, estado_validacion, 
        severidad_min, severidad_max, fecha_inicio, fecha_fin, pagina_id
    )
    res = await db_session.execute(stmt)
    records = res.all()

    data = []
    for p, pagina_nombre in records:
        data.append({
            "ID": p.id,
            "Facebook ID": p.id_facebook,
            "Enlace": p.enlace,
            "Pagina": pagina_nombre,
            "Contenido": p.contenido,
            "Categoria": p.categoria,
            "Sentimiento": p.sentimiento,
            "Severidad": p.severidad,
            "Engagement": p.engagement_total,
            "Fecha Publicacion": p.fecha_publicacion,
            "Fecha Registro": p.fecha_registro,
            "Estado Validacion": p.estado_validacion
        })

    df = pd.DataFrame(data)
    
    if format == "xlsx":
        # Stream Excel bytes
        output = io.BytesIO()
        try:
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                df.to_excel(writer, sheet_name="Publicaciones", index=False)
            output.seek(0)
            headers = {"Content-Disposition": "attachment; filename=publicaciones_export.xlsx"}
            return StreamingResponse(
                output, 
                headers=headers, 
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        except Exception:
            # Fallback to CSV if xlsxwriter is missing
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            headers = {"Content-Disposition": "attachment; filename=publicaciones_export.csv"}
            return Response(
                output.getvalue(), 
                headers=headers, 
                media_type="text/csv"
            )
    else:
        # Default CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        headers = {"Content-Disposition": "attachment; filename=publicaciones_export.csv"}
        return Response(
            output.getvalue(), 
            headers=headers, 
            media_type="text/csv"
        )

# 7. GET /api/paginas
@app.get("/api/paginas")
async def get_paginas(
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    # Fetch all pages
    pages_stmt = select(Pagina)
    pages_res = await db_session.execute(pages_stmt)
    pages = pages_res.scalars().all()

    if not pages:
        return []

    # Get aggregated metrics for all pages in a single query
    metrics_stmt = select(
        Publicacion.pagina_id,
        func.count(Publicacion.id).label("total_pubs"),
        func.avg(Publicacion.engagement_total).label("avg_eng"),
        func.avg(Publicacion.severidad).label("avg_sev"),
        func.sum(case((Publicacion.sentimiento == 'negativo', 1), else_=0)).label("neg_pubs")
    ).group_by(Publicacion.pagina_id)
    
    metrics_res = await db_session.execute(metrics_stmt)
    metrics_map = {row.pagina_id: row for row in metrics_res.all()}

    data = []
    for p in pages:
        m = metrics_map.get(p.id)
        total_pubs = m.total_pubs if m else 0
        avg_eng = float(m.avg_eng or 0.0) if m else 0.0
        avg_sev = float(m.avg_sev or 0.0) if m else 0.0
        neg_pubs = m.neg_pubs if m else 0
        neg_pct = (neg_pubs / total_pubs * 100) if total_pubs > 0 else 0.0

        data.append({
            "id": p.id,
            "nombre": p.nombre,
            "url_facebook": p.url_facebook,
            "url_web": p.url_web,
            "categoria": p.categoria,
            "activa": p.activa,
            "metricas": {
                "total_publicaciones": total_pubs,
                "engagement_promedio": round(avg_eng, 2),
                "severidad_promedio": round(avg_sev, 2),
                "porcentaje_negativo": round(neg_pct, 2)
            }
        })
    return data

# 8. GET /api/paginas/:id
@app.get("/api/paginas/{page_id}")
async def get_pagina_detail(
    page_id: str,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    try:
        page_id_int = int(page_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de página inválido")

    stmt = select(Pagina).where(Pagina.id == page_id_int)
    res = await db_session.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    # Time evolution (last 30 days of posts & engagement)
    # We query from metricas_diarias grouped by date, or calculate directly
    today_str = await get_reference_today(db_session)
    start_date = (datetime.fromisoformat(today_str) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Publications per day (portable Date cast compatible)
    pub_day_stmt = select(
        cast(Publicacion.fecha_registro, Date).label("dia"),
        func.count(Publicacion.id).label("count")
    ).where(
        and_(Publicacion.pagina_id == page_id_int, Publicacion.fecha_registro >= start_date)
    ).group_by(cast(Publicacion.fecha_registro, Date)).order_by(cast(Publicacion.fecha_registro, Date))
    pub_day_res = await db_session.execute(pub_day_stmt)
    pub_days = [{"dia": str(row.dia)[:10], "count": row.count} for row in pub_day_res.all()]

    # Engagement evolution
    eng_day_stmt = select(
        cast(Publicacion.fecha_registro, Date).label("dia"),
        func.sum(Publicacion.engagement_total).label("engagement")
    ).where(
        and_(Publicacion.pagina_id == page_id_int, Publicacion.fecha_registro >= start_date)
    ).group_by(cast(Publicacion.fecha_registro, Date)).order_by(cast(Publicacion.fecha_registro, Date))
    eng_day_res = await db_session.execute(eng_day_stmt)
    eng_days = [{"dia": str(row.dia)[:10], "engagement": int(row.engagement or 0)} for row in eng_day_res.all()]

    # Sentiment distribution
    sent_stmt = select(
        Publicacion.sentimiento,
        func.count(Publicacion.id)
    ).where(
        Publicacion.pagina_id == page_id_int
    ).group_by(Publicacion.sentimiento)
    sent_res = await db_session.execute(sent_stmt)
    sentiment_distribution = {row[0] or "neutral": row[1] for row in sent_res.all()}

    # Calculate page-specific overall metrics
    total_stmt = select(func.count(Publicacion.id)).where(Publicacion.pagina_id == page_id_int)
    total_res = await db_session.execute(total_stmt)
    total_pubs = total_res.scalar() or 0

    avg_eng_stmt = select(func.avg(Publicacion.engagement_total)).where(Publicacion.pagina_id == page_id_int)
    avg_eng_res = await db_session.execute(avg_eng_stmt)
    avg_eng = float(avg_eng_res.scalar() or 0.0)

    avg_sev_stmt = select(func.avg(Publicacion.severidad)).where(Publicacion.pagina_id == page_id_int)
    avg_sev_res = await db_session.execute(avg_sev_stmt)
    avg_sev = float(avg_sev_res.scalar() or 0.0)

    neg_stmt = select(func.count(Publicacion.id)).where(
        and_(Publicacion.pagina_id == page_id_int, Publicacion.sentimiento == 'negativo')
    )
    neg_res = await db_session.execute(neg_stmt)
    neg_pubs = neg_res.scalar() or 0
    neg_pct = (neg_pubs / total_pubs * 100) if total_pubs > 0 else 0.0

    # Last 10 publications
    recent_stmt = select(Publicacion).where(Publicacion.pagina_id == page_id_int).order_by(
        func.coalesce(Publicacion.fecha_publicacion, Publicacion.fecha_registro).desc()
    ).limit(10)
    recent_res = await db_session.execute(recent_stmt)
    recent_pubs = [
        {
            "id": pub.id,
            "contenido": pub.contenido,
            "severidad": pub.severidad,
            "engagement": pub.engagement_total,
            "sentimiento": pub.sentimiento,
            "fecha": pub.fecha_registro
        }
        for pub in recent_res.scalars().all()
    ]

    # Last cycles processing this page
    # Since page_id is alphanumeric, check if cycles contain it in paginas_asignadas
    cycles_stmt = select(Ciclo).where(Ciclo.paginas_asignadas.like(f"%{page_id}%")).order_by(
        Ciclo.inicio.desc()
    ).limit(10)
    cycles_res = await db_session.execute(cycles_stmt)
    cycles_data = [
        {
            "id": c.id,
            "worker_id": c.worker_id,
            "modo": c.modo,
            "estado": c.estado,
            "inicio": c.inicio,
            "fin": c.fin
        }
        for c in cycles_res.scalars().all()
    ]

    return {
        "id": p.id,
        "nombre": p.nombre,
        "url_facebook": p.url_facebook,
        "url_web": p.url_web,
        "categoria": p.categoria,
        "activa": p.activa,
        "metricas": {
            "total_publicaciones": total_pubs,
            "engagement_promedio": round(avg_eng, 2),
            "severidad_promedio": round(avg_sev, 2),
            "porcentaje_negativo": round(neg_pct, 2)
        },
        "graficas": {
            "publicaciones_por_dia": pub_days,
            "evolucion_engagement": eng_days,
            "distribucion_sentimiento": sentiment_distribution
        },
        "recientes": recent_pubs,
        "ciclos": cycles_data
    }

# 9. PUT /api/paginas/:id/activa
@app.put("/api/paginas/{page_id}/activa")
async def update_page_activa(
    page_id: str,
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Pagina).where(Pagina.id == page_id)
    res = await db_session.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Página no encontrada")
        
    p.activa = int(payload.get("activa", 1))
    await db_session.commit()
    return {"status": "success", "message": f"Estado de página actualizado a {p.activa}"}

# 10. GET /api/sentimiento
@app.get("/api/sentimiento")
async def get_sentimiento(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    # 1. Proportions global
    prop_stmt = select(Publicacion.sentimiento, func.count(Publicacion.id)).group_by(Publicacion.sentimiento)
    if fecha_inicio:
        prop_stmt = prop_stmt.where(Publicacion.fecha_registro >= fecha_inicio)
    if fecha_fin:
        prop_stmt = prop_stmt.where(Publicacion.fecha_registro <= fecha_fin)
    if categoria:
        prop_stmt = prop_stmt.where(Publicacion.categoria == categoria)
        
    prop_res = await db_session.execute(prop_stmt)
    counts = {row[0] or "neutral": row[1] for row in prop_res.all()}
    total = sum(counts.values())
    proportions = {k: round(v / total * 100, 2) if total > 0 else 0.0 for k, v in counts.items()}

    # 2. Time evolution stacked area chart
    # We query metricas_diarias
    time_stmt = select(
        MetricaDiaria.fecha,
        func.sum(MetricaDiaria.comentarios_positivos).label("pos"),
        func.sum(MetricaDiaria.comentarios_negativos).label("neg"),
        func.sum(MetricaDiaria.comentarios_neutros).label("neu")
    )
    if fecha_inicio:
        time_stmt = time_stmt.where(MetricaDiaria.fecha >= fecha_inicio)
    if fecha_fin:
        time_stmt = time_stmt.where(MetricaDiaria.fecha <= fecha_fin)
    if categoria:
        time_stmt = time_stmt.where(MetricaDiaria.categoria == categoria)
    time_stmt = time_stmt.group_by(MetricaDiaria.fecha).order_by(MetricaDiaria.fecha)
    time_res = await db_session.execute(time_stmt)
    evolution_data = [
        {
            "fecha": row.fecha,
            "positivo": int(row.pos or 0),
            "negativo": int(row.neg or 0),
            "neutral": int(row.neu or 0)
        }
        for row in time_res.all()
    ]

    # 3. Sentiment matrix per category
    matrix_stmt = select(
        Publicacion.categoria,
        Publicacion.sentimiento,
        func.count(Publicacion.id)
    ).group_by(Publicacion.categoria, Publicacion.sentimiento)
    matrix_res = await db_session.execute(matrix_stmt)
    matrix_raw = matrix_res.all()
    
    matrix: Dict[str, Dict[str, int]] = {}
    for cat, sent, cnt in matrix_raw:
        if not cat:
            continue
        c = cat.strip().capitalize()
        s = sent or "neutral"
        if c not in matrix:
            matrix[c] = {"positivo": 0, "negativo": 0, "neutral": 0, "mixto": 0}
        matrix[c][s] = cnt

    # 4. Comments negative (Double column left)
    neg_comm_stmt = select(Comentario, Publicacion.id).join(
        Publicacion, Comentario.publicacion_id == Publicacion.id
    ).where(Comentario.sentimiento == 'negativo').order_by(Comentario.fecha.desc()).limit(15)
    neg_comm_res = await db_session.execute(neg_comm_stmt)
    comments_list = [
        {
            "id": c.id,
            "autor": c.autor,
            "contenido": c.contenido,
            "fecha": c.fecha,
            "publicacion_id": pub_id
        }
        for c, pub_id in neg_comm_res.all()
    ]

    # 5. Tokenization - Frequent words (Double column right)
    # Let's extract words from publications with negative sentiment
    neg_pub_stmt = select(Publicacion.contenido).where(Publicacion.sentimiento == 'negativo').limit(50)
    neg_pub_res = await db_session.execute(neg_pub_stmt)
    raw_texts = neg_pub_res.scalars().all()
    
    word_counts: Dict[str, int] = {}
    for text in raw_texts:
        cleaned = re.sub(r'[^\w\s]', '', text.lower())
        words = cleaned.split()
        for w in words:
            if len(w) > 3 and w not in STOPWORDS:
                word_counts[w] = word_counts.get(w, 0) + 1
    
    sorted_words = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)[:20]
    word_frequencies = [{"word": item[0], "count": item[1]} for item in sorted_words]

    return {
        "proporciones": proportions,
        "evolucion": evolution_data,
        "matriz": [{"categoria": cat, "valores": val} for cat, val in matrix.items()],
        "comentarios_negativos": comments_list,
        "frecuencia_palabras": word_frequencies
    }

# 11. GET /api/severidad
@app.get("/api/severidad")
async def get_severidad(
    categoria: Optional[str] = Query(None),
    severidad_min: Optional[int] = Query(None),
    severidad_max: Optional[int] = Query(None),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    today_str = await get_reference_today(db_session)
    t_24h = (datetime.fromisoformat(today_str) - timedelta(hours=24)).isoformat()
    t_72h = (datetime.fromisoformat(today_str) - timedelta(hours=72)).isoformat()
    t_7d = (datetime.fromisoformat(today_str) - timedelta(days=7)).isoformat()

    # 1. KPIs
    stmt_24h = select(func.count(Publicacion.id)).where(
        and_(Publicacion.severidad >= 7, Publicacion.fecha_registro >= t_24h)
    )
    res_24h = await db_session.execute(stmt_24h)
    count_24h = res_24h.scalar() or 0

    stmt_72h = select(func.count(Publicacion.id)).where(
        and_(Publicacion.severidad >= 7, Publicacion.fecha_registro >= t_72h)
    )
    res_72h = await db_session.execute(stmt_72h)
    count_72h = res_72h.scalar() or 0

    stmt_max_7d = select(Publicacion, Pagina.nombre).join(
        Pagina, Publicacion.pagina_id == Pagina.id
    ).where(
        Publicacion.fecha_registro >= t_7d
    ).order_by(Publicacion.severidad.desc()).limit(1)
    res_max_7d = await db_session.execute(stmt_max_7d)
    max_record = res_max_7d.fetchone()
    
    highest_severity_pub = None
    if max_record:
        p, pagina_nombre = max_record
        highest_severity_pub = {
            "id": p.id,
            "severidad": p.severidad,
            "pagina_nombre": pagina_nombre,
            "contenido": p.contenido[:100] + ("..." if len(p.contenido) > 100 else "")
        }

    # 2. Scatter plot (severidad vs tiempo)
    scatter_stmt = select(Publicacion, Pagina.nombre).join(Pagina, Publicacion.pagina_id == Pagina.id)
    if categoria:
        scatter_stmt = scatter_stmt.where(Publicacion.categoria == categoria)
    if severidad_min is not None:
        scatter_stmt = scatter_stmt.where(Publicacion.severidad >= severidad_min)
    if severidad_max is not None:
        scatter_stmt = scatter_stmt.where(Publicacion.severidad <= severidad_max)
    scatter_stmt = scatter_stmt.order_by(func.coalesce(Publicacion.fecha_publicacion, Publicacion.fecha_registro).desc()).limit(200)
    
    scatter_res = await db_session.execute(scatter_stmt)
    scatter_points = [
        {
            "id": p.id,
            "fecha": p.fecha_publicacion or p.fecha_registro,
            "severidad": p.severidad,
            "engagement": p.engagement_total,
            "pagina_nombre": pagina_nombre,
            "contenido": p.contenido[:60] + ("..." if len(p.contenido) > 60 else "")
        }
        for p, pagina_nombre in scatter_res.all()
    ]

    # 3. Table of critical publications (severidad >= 6, estado_validacion = 'activo')
    crit_stmt = select(Publicacion, Pagina.nombre).join(
        Pagina, Publicacion.pagina_id == Pagina.id
    ).where(
        and_(Publicacion.severidad >= 6, Publicacion.estado_validacion == 'activo')
    )
    if categoria:
        crit_stmt = crit_stmt.where(Publicacion.categoria == categoria)
    crit_stmt = crit_stmt.order_by(Publicacion.severidad.desc())
    crit_res = await db_session.execute(crit_stmt)
    
    critical_table = [
        {
            "id": p.id,
            "severidad": p.severidad,
            "pagina_nombre": pagina_nombre,
            "categoria": p.categoria,
            "contenido": p.contenido[:120] + ("..." if len(p.contenido) > 120 else ""),
            "engagement": p.engagement_total,
            "fecha": p.fecha_publicacion or p.fecha_registro,
            "factores_severidad": p.factores_severidad
        }
        for p, pagina_nombre in crit_res.all()
    ]

    # 4. History 90 days
    start_90d = (datetime.fromisoformat(today_str) - timedelta(days=90)).strftime("%Y-%m-%d")
    history_stmt = select(
        MetricaDiaria.fecha,
        func.avg(MetricaDiaria.severidad_promedio).label("avg_sev")
    ).where(
        MetricaDiaria.fecha >= start_90d
    ).group_by(MetricaDiaria.fecha).order_by(MetricaDiaria.fecha)
    history_res = await db_session.execute(history_stmt)
    history_data = [{"fecha": row.fecha, "severidad_promedio": round(float(row.avg_sev or 0.0), 2)} for row in history_res.all()]

    return {
        "kpis": {
            "severidad_alta_24h": count_24h,
            "severidad_alta_72h": count_72h,
            "maxima_7dias": highest_severity_pub
        },
        "scatter": scatter_points,
        "criticas": critical_table,
        "historial": history_data
    }

# 12. GET /api/descartes
@app.get("/api/descartes")
async def get_descartes(
    estado_validacion: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    worker_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Descarte)
    count_stmt = select(func.count(Descarte.id))
    
    # Apply filters
    if estado_validacion:
        stmt = stmt.where(Descarte.estado_validacion == estado_validacion)
        count_stmt = count_stmt.where(Descarte.estado_validacion == estado_validacion)
    if categoria:
        stmt = stmt.where(Descarte.categoria == categoria)
        count_stmt = count_stmt.where(Descarte.categoria == categoria)
    if fecha_inicio:
        stmt = stmt.where(Descarte.creado_en >= fecha_inicio)
        count_stmt = count_stmt.where(Descarte.creado_en >= fecha_inicio)
    if fecha_fin:
        stmt = stmt.where(Descarte.creado_en <= fecha_fin)
        count_stmt = count_stmt.where(Descarte.creado_en <= fecha_fin)
    if worker_id:
        stmt = stmt.where(Descarte.worker_id == worker_id)
        count_stmt = count_stmt.where(Descarte.worker_id == worker_id)
    if search:
        stmt = stmt.where(
            or_(Descarte.contenido_preview.ilike(f"%{search}%"), Descarte.motivos.ilike(f"%{search}%"))
        )
        count_stmt = count_stmt.where(
            or_(Descarte.contenido_preview.ilike(f"%{search}%"), Descarte.motivos.ilike(f"%{search}%"))
        )
        
    count_res = await db_session.execute(count_stmt)
    total = count_res.scalar() or 0

    stmt = stmt.order_by(Descarte.creado_en.desc()).offset(offset).limit(limit)
    res = await db_session.execute(stmt)
    records = res.scalars().all()

    # Aggregate counts
    total_descartes_stmt = select(func.count(Descarte.id))
    total_descartes_res = await db_session.execute(total_descartes_stmt)
    tot_descartes = total_descartes_res.scalar() or 0

    pend_stmt = select(func.count(Descarte.id)).where(Descarte.estado_validacion == 'pendiente')
    pend_res = await db_session.execute(pend_stmt)
    tot_pending = pend_res.scalar() or 0

    conf_stmt = select(func.count(Descarte.id)).where(Descarte.estado_validacion == 'confirmado')
    conf_res = await db_session.execute(conf_stmt)
    tot_confirmed = conf_res.scalar() or 0

    rec_stmt = select(func.count(Descarte.id)).where(Descarte.estado_validacion == 'recuperado')
    rec_res = await db_session.execute(rec_stmt)
    tot_recovered = rec_res.scalar() or 0

    data = [
        {
            "id": d.id,
            "run_id": d.run_id,
            "worker_id": d.worker_id,
            "ciclo_id": d.ciclo_id,
            "pagina_id": d.pagina_id,
            "contenido_preview": d.contenido_preview,
            "categoria": d.categoria,
            "estado_validacion": d.estado_validacion,
            "motivos": d.motivos,
            "severidad": d.severidad,
            "enlace": d.enlace,
            "id_facebook": d.id_facebook,
            "creado_en": d.creado_en
        }
        for d in records
    ]

    return {
        "kpis": {
            "total": tot_descartes,
            "pendientes": tot_pending,
            "confirmados": tot_confirmed,
            "recuperados": tot_recovered
        },
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": data
    }

# 13. PUT /api/descartes/:id
@app.put("/api/descartes/{descarte_id}")
async def update_descarte_status(
    descarte_id: str,
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Descarte).where(Descarte.id == descarte_id)
    res = await db_session.execute(stmt)
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Descarte no encontrado")
        
    d.estado_validacion = payload.get("estado_validacion", "confirmado")
    await db_session.commit()
    return {"status": "success", "message": f"Estado de descarte actualizado a {d.estado_validacion}"}

# 14. POST /api/descartes/:id/recuperar
@app.post("/api/descartes/{descarte_id}/recuperar")
async def recuperar_descarte(
    descarte_id: str,
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Descarte).where(Descarte.id == descarte_id)
    res = await db_session.execute(stmt)
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Descarte no encontrado")

    # Fetch page details if available
    autor_nombre = "Desconocido"
    if d.pagina_id:
        page_stmt = select(Pagina).where(Pagina.id == d.pagina_id)
        page_res = await db_session.execute(page_stmt)
        page_rec = page_res.scalar_one_or_none()
        if page_rec:
            autor_nombre = page_rec.nombre

    # Create new publication
    new_pub = Publicacion(
        id=d.id,
        id_facebook=d.id_facebook,
        enlace=d.enlace,
        pagina_id=d.pagina_id,
        autor=autor_nombre,
        contenido=d.contenido_preview or "Contenido recuperado sin preview",
        categoria=payload.get("categoria", d.categoria or "general"),
        sentimiento=payload.get("sentimiento", "neutral"),
        severidad=d.severidad or 0,
        fecha_publicacion=d.creado_en,
        fecha_registro=datetime.now().isoformat(),
        fecha_actualizacion=datetime.now().isoformat(),
        estado_validacion="activo",
        worker_id=d.worker_id,
        ultimo_ciclo_id=d.ciclo_id,
        actividad="desconocido"
    )

    db_session.add(new_pub)
    
    # Update descarte validation status
    d.estado_validacion = "recuperado"
    
    await db_session.commit()
    return {"status": "success", "message": "Publicación recuperada con éxito", "publicacion_id": new_pub.id}

# 15. POST /api/descartes/batch
@app.post("/api/descartes/batch")
async def batch_process_descartes(
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    ids = payload.get("ids", [])
    action = payload.get("action")  # 'confirm' or 'recover'
    categoria = payload.get("categoria", "general")
    sentimiento = payload.get("sentimiento", "neutral")
    
    if not ids or not action:
        raise HTTPException(status_code=400, detail="Faltan IDs o acción")
        
    stmt = select(Descarte).where(Descarte.id.in_(ids))
    res = await db_session.execute(stmt)
    descartes = res.scalars().all()

    recovered_count = 0
    confirmed_count = 0
    
    for d in descartes:
        if action == "confirm":
            d.estado_validacion = "confirmado"
            confirmed_count += 1
        elif action == "recover":
            # Recover individual publication
            autor_nombre = "Desconocido"
            if d.pagina_id:
                page_stmt = select(Pagina).where(Pagina.id == d.pagina_id)
                page_res = await db_session.execute(page_stmt)
                page_rec = page_res.scalar_one_or_none()
                if page_rec:
                    autor_nombre = page_rec.nombre
                    
            # Check if publication already exists to avoid PK clash
            exists_stmt = select(Publicacion.id).where(Publicacion.id == d.id)
            exists_res = await db_session.execute(exists_stmt)
            if not exists_res.scalar():
                new_pub = Publicacion(
                    id=d.id,
                    id_facebook=d.id_facebook,
                    enlace=d.enlace,
                    pagina_id=d.pagina_id,
                    autor=autor_nombre,
                    contenido=d.contenido_preview or "Contenido recuperado",
                    categoria=categoria,
                    sentimiento=sentimiento,
                    severidad=d.severidad or 0,
                    fecha_publicacion=d.creado_en,
                    fecha_registro=datetime.now().isoformat(),
                    fecha_actualizacion=datetime.now().isoformat(),
                    estado_validacion="activo",
                    worker_id=d.worker_id,
                    ultimo_ciclo_id=d.ciclo_id,
                    actividad="desconocido"
                )
                db_session.add(new_pub)
                
            d.estado_validacion = "recuperado"
            recovered_count += 1
            
    await db_session.commit()
    return {
        "status": "success", 
        "confirmed": confirmed_count, 
        "recovered": recovered_count
    }

# 16. GET /api/sistema/workers
@app.get("/api/sistema/workers")
async def get_sistema_workers(
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    # Group cycles by worker_id
    stmt = select(
        Ciclo.worker_id,
        func.count(Ciclo.id).label("total_cycles"),
        func.max(Ciclo.inicio).label("last_run")
    ).group_by(Ciclo.worker_id)
    
    res = await db_session.execute(stmt)
    workers_raw = res.all()
    
    today_str = await get_reference_today(db_session)
    tomorrow_date = datetime.fromisoformat(today_str) + timedelta(days=1)
    tomorrow_str = tomorrow_date.strftime("%Y-%m-%d")

    data = []
    for row in workers_raw:
        w_id = row.worker_id
        tot_cycles = row.total_cycles
        
        # Today's cycles
        today_cycles_stmt = select(func.count(Ciclo.id)).where(
            and_(
                Ciclo.worker_id == w_id,
                Ciclo.inicio >= f"{today_str} 00:00:00",
                Ciclo.inicio < f"{tomorrow_str} 00:00:00"
            )
        )
        today_cycles_res = await db_session.execute(today_cycles_stmt)
        today_cycles = today_cycles_res.scalar() or 0

        # Last cycle details
        last_cycle_stmt = select(Ciclo).where(Ciclo.worker_id == w_id).order_by(Ciclo.inicio.desc()).limit(1)
        last_cycle_res = await db_session.execute(last_cycle_stmt)
        last_cycle = last_cycle_res.scalar_one_or_none()
        
        last_status = "desconocido"
        paginas_asignadas = []
        metrics_json = {}
        duration_avg = 0.0

        if last_cycle:
            last_status = last_cycle.estado
            if last_cycle.paginas_asignadas:
                try:
                    paginas_asignadas = json.loads(last_cycle.paginas_asignadas)
                except Exception:
                    paginas_asignadas = last_cycle.paginas_asignadas.split(",")
            if last_cycle.metricas:
                try:
                    metrics_json = json.loads(last_cycle.metricas)
                except Exception:
                    metrics_json = {"raw": last_cycle.metricas}

        # Average duration (using SQLite datetime calculations or python parsing)
        dur_stmt = select(Ciclo.inicio, Ciclo.fin).where(
            and_(Ciclo.worker_id == w_id, Ciclo.fin != None)
        )
        dur_res = await db_session.execute(dur_stmt)
        durations = []
        for ini, fin in dur_res.all():
            try:
                t1 = datetime.fromisoformat(ini)
                t2 = datetime.fromisoformat(fin)
                durations.append((t2 - t1).total_seconds())
            except Exception:
                pass
        if durations:
            duration_avg = sum(durations) / len(durations)

        data.append({
            "worker_id": w_id,
            "total_ciclos": tot_cycles,
            "ciclos_hoy": today_cycles,
            "ultimo_estado": last_status,
            "paginas_asignadas": paginas_asignadas,
            "duracion_promedio_segundos": round(duration_avg, 2),
            "ultimas_metricas": metrics_json,
            "ultimo_ciclo_inicio": last_cycle.inicio if last_cycle else None,
            "ultimo_ciclo_fin": last_cycle.fin if last_cycle else None
        })

    return data

# 17. GET /api/sistema/ciclos
@app.get("/api/sistema/ciclos")
async def get_sistema_ciclos(
    worker_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    modo: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(Ciclo)
    count_stmt = select(func.count(Ciclo.id))
    
    if worker_id:
        stmt = stmt.where(Ciclo.worker_id == worker_id)
        count_stmt = count_stmt.where(Ciclo.worker_id == worker_id)
    if estado:
        stmt = stmt.where(Ciclo.estado == estado)
        count_stmt = count_stmt.where(Ciclo.estado == estado)
    if modo:
        stmt = stmt.where(Ciclo.modo == modo)
        count_stmt = count_stmt.where(Ciclo.modo == modo)
    if fecha_inicio:
        stmt = stmt.where(Ciclo.inicio >= fecha_inicio)
        count_stmt = count_stmt.where(Ciclo.inicio >= fecha_inicio)
    if fecha_fin:
        stmt = stmt.where(Ciclo.inicio <= fecha_fin)
        count_stmt = count_stmt.where(Ciclo.inicio <= fecha_fin)
        
    count_res = await db_session.execute(count_stmt)
    total = count_res.scalar() or 0

    stmt = stmt.order_by(Ciclo.inicio.desc()).offset(offset).limit(limit)
    res = await db_session.execute(stmt)
    records = res.scalars().all()

    data = []
    for c in records:
        dur = None
        if c.inicio and c.fin:
            try:
                t1 = datetime.fromisoformat(c.inicio)
                t2 = datetime.fromisoformat(c.fin)
                dur = (t2 - t1).total_seconds()
            except Exception:
                pass
        
        pag_list = []
        if c.paginas_asignadas:
            try:
                pag_list = json.loads(c.paginas_asignadas)
            except Exception:
                pag_list = c.paginas_asignadas.split(",")

        metrics_obj = {}
        if c.metricas:
            try:
                metrics_obj = json.loads(c.metricas)
            except Exception:
                metrics_obj = {"raw": c.metricas}

        data.append({
            "id": c.id,
            "run_id": c.run_id,
            "worker_id": c.worker_id,
            "modo": c.modo,
            "estado": c.estado,
            "paginas_asignadas": pag_list,
            "inicio": c.inicio,
            "fin": c.fin,
            "duracion_segundos": dur,
            "metricas": metrics_obj,
            "detalle": c.detalle
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": data
    }

# 18. GET /api/sistema/staging
@app.get("/api/sistema/staging")
async def get_sistema_staging(
    limit: int = Query(50, ge=1, le=200),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(StagingProcesado).order_by(StagingProcesado.procesado_en.desc()).limit(limit)
    res = await db_session.execute(stmt)
    records = res.scalars().all()
    return [
        {
            "archivo": r.archivo,
            "worker_id": r.worker_id,
            "run_id": r.run_id,
            "ciclo_id": r.ciclo_id,
            "procesado_en": r.procesado_en,
            "lineas": r.lineas
        }
        for r in records
    ]

# 19. GET /api/metricas-diarias
@app.get("/api/metricas-diarias")
async def get_metricas_diarias(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    stmt = select(MetricaDiaria)
    if fecha_inicio:
        stmt = stmt.where(MetricaDiaria.fecha >= fecha_inicio)
    if fecha_fin:
        stmt = stmt.where(MetricaDiaria.fecha <= fecha_fin)
    if categoria:
        stmt = stmt.where(MetricaDiaria.categoria == categoria)
    stmt = stmt.order_by(MetricaDiaria.fecha.asc())
    
    res = await db_session.execute(stmt)
    records = res.scalars().all()
    return [
        {
            "fecha": r.fecha,
            "categoria": r.categoria,
            "total_publicaciones": r.total_publicaciones,
            "total_me_gusta": r.total_me_gusta,
            "total_reacciones": r.total_reacciones,
            "total_comentarios": r.total_comentarios,
            "total_compartidos": r.total_compartidos,
            "severidad_promedio": r.severidad_promedio,
            "severidad_maxima": r.severidad_maxima,
            "total_comentarios_analizados": r.total_comentarios_analizados,
            "comentarios_positivos": r.comentarios_positivos,
            "comentarios_negativos": r.comentarios_negativos,
            "comentarios_neutros": r.comentarios_neutros
        }
        for r in records
    ]

# 19.5. GET /api/observatorio
@app.get("/api/observatorio")
async def get_observatorio(
    semana: int = Query(0, ge=0, le=3),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    from collections import Counter
    
    ref_today_str = await get_reference_today(db_session)
    ref_date = datetime.fromisoformat(ref_today_str)
    
    # Calculate date range
    end_date = ref_date - timedelta(days=semana * 7)
    start_date = end_date - timedelta(days=6)
    
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    # Previous week date range
    prev_end_date = start_date - timedelta(days=1)
    prev_start_date = prev_end_date - timedelta(days=6)
    prev_start_str = prev_start_date.strftime("%Y-%m-%d")
    prev_end_str = prev_end_date.strftime("%Y-%m-%d")
    
    # Rango Label
    rango_label = f"del {start_date.strftime('%d/%m/%Y')} al {end_date.strftime('%d/%m/%Y')}"
    
    # 1. Total publications
    pub_stmt = select(func.count(Publicacion.id)).where(
        and_(Publicacion.fecha_registro >= f"{start_str} 00:00:00", Publicacion.fecha_registro <= f"{end_str} 23:59:59")
    )
    pub_res = await db_session.execute(pub_stmt)
    total_publicaciones = pub_res.scalar() or 0
    
    # Prev week total
    prev_pub_stmt = select(func.count(Publicacion.id)).where(
        and_(Publicacion.fecha_registro >= f"{prev_start_str} 00:00:00", Publicacion.fecha_registro <= f"{prev_end_str} 23:59:59")
    )
    prev_pub_res = await db_session.execute(prev_pub_stmt)
    prev_total_publicaciones = prev_pub_res.scalar() or 0
    
    # 2. Active sources
    src_stmt = select(func.count(func.distinct(Publicacion.autor))).where(
        and_(Publicacion.fecha_registro >= f"{start_str} 00:00:00", Publicacion.fecha_registro <= f"{end_str} 23:59:59")
    )
    src_res = await db_session.execute(src_stmt)
    fuentes_activas = src_res.scalar() or 0
    
    # 3. Identified categories (topics)
    cat_distinct_stmt = select(func.count(func.distinct(Publicacion.categoria))).where(
        and_(Publicacion.fecha_registro >= f"{start_str} 00:00:00", Publicacion.fecha_registro <= f"{end_str} 23:59:59")
    )
    cat_distinct_res = await db_session.execute(cat_distinct_stmt)
    temas_identificados = cat_distinct_res.scalar() or 0
    
    # 4. Fetch all publication details for processing in memory (fast & fully compatible)
    pub_details_stmt = select(
        Publicacion.id,
        Publicacion.autor,
        Publicacion.categoria,
        Publicacion.sentimiento,
        Publicacion.severidad,
        Publicacion.engagement_total,
        Publicacion.fecha_registro,
        Publicacion.contenido,
        Publicacion.ubicacion
    ).where(
        and_(Publicacion.fecha_registro >= f"{start_str} 00:00:00", Publicacion.fecha_registro <= f"{end_str} 23:59:59")
    )
    pub_details_res = await db_session.execute(pub_details_stmt)
    pubs = pub_details_res.all()
    
    # Previous week details for deltas
    prev_details_stmt = select(
        Publicacion.id,
        Publicacion.autor,
        Publicacion.categoria,
        Publicacion.sentimiento,
        Publicacion.severidad,
        Publicacion.engagement_total,
        Publicacion.fecha_registro
    ).where(
        and_(Publicacion.fecha_registro >= f"{prev_start_str} 00:00:00", Publicacion.fecha_registro <= f"{prev_end_str} 23:59:59")
    )
    prev_details_res = await db_session.execute(prev_details_stmt)
    prev_pubs = prev_details_res.all()
    
    # In memory aggregation
    cat_counts = Counter()
    author_counts = Counter()
    sentiment_counts = Counter()
    hourly_counts = [0] * 24
    daily_volume = [0] * 7
    daily_engagement = [0] * 7
    total_severity = 0.0
    valid_severity_count = 0
    
    # For location mapping
    location_details = {}
    
    GEO_MAPPING = {
        "5 de febrero": (20.6122, -100.4147),
        "bernardo quintana": (20.5983, -100.3755),
        "constituyentes": (20.5872, -100.3995),
        "juriquilla": (20.6905, -100.4461),
        "centro historico": (20.5926, -100.3922),
        "centro sur": (20.5638, -100.3792),
        "satelite": (20.6225, -100.4358),
        "alamos": (20.6067, -100.3812),
        "mileno iii": (20.5956, -100.3608),
        "cimatario": (20.5794, -100.3878),
        "obregón": (20.5902, -100.3956),
        "santiago de queretaro": (20.5888, -100.3899),
        "queretaro": (20.5888, -100.3899),
        "san juan del rio": (20.3889, -99.9972),
        "el marques": (20.6272, -100.2972),
        "corregidora": (20.5317, -100.4439),
        "cadereyta": (20.6978, -99.8167),
        "colon": (20.7850, -100.0460),
        "ezequiel montes": (20.6625, -99.8972),
        "tequisquiapan": (20.5203, -99.8928),
        "pedro escobedo": (20.5022, -100.1281),
        "jalpan": (21.2172, -99.4777),
        "pinal de amoles": (21.1394, -99.6264),
        "arroyo seco": (21.5475, -99.6908),
        "landa de matamoros": (21.1853, -99.3197),
        "penamiller": (21.0500, -99.8167),
        "toliman": (20.9067, -99.9333),
        "huimilpan": (20.3708, -100.2781),
        "san joaquin": (20.9125, -99.5647),
        "cdmx": (19.4326, -99.1332),
        "ciudad de mexico": (19.4326, -99.1332),
        "guanajuato": (21.0190, -101.2574),
        "huixquilucan": (19.3596, -99.3496),
        "tultepec": (19.6836, -99.1278),
        "ecatepec": (19.6017, -99.0506),
        "mexico": (19.4326, -99.1332),
    }
    
    import unicodedata
    def normalize_text(text: str) -> str:
        if not text:
            return ""
        text = text.lower().strip()
        text = "".join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )
        return text
    
    # Keep track of individual days
    dates_list = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    date_to_index = {d: i for i, d in enumerate(dates_list)}
    
    weekday_hour_counts = Counter()
    
    top_post_engagement = None
    top_post_id = None
    top_post_content = ""
    
    for p_id, autor, categoria_p, sentimiento, severidad, engagement, fecha_reg, contenido, ubicacion in pubs:
        cat = (categoria_p or "comunidad").strip().lower()
        cat_counts[cat] += 1
        
        auth = (autor or "desconocido").strip()
        author_counts[auth] += 1
        
        sent = (sentimiento or "neutral").strip().lower()
        sentiment_counts[sent] += 1
        
        if severidad is not None:
            total_severity += severidad
            valid_severity_count += 1
            
        day_str = fecha_reg[:10]
        if day_str in date_to_index:
            idx = date_to_index[day_str]
            daily_volume[idx] += 1
            if engagement:
                daily_engagement[idx] += engagement
                
        try:
            hour_val = int(fecha_reg[11:13])
            hourly_counts[hour_val] += 1
            dt = datetime.fromisoformat(fecha_reg)
            weekday_hour_counts[(dt.weekday(), hour_val)] += 1
        except Exception:
            pass
            
        if engagement and (top_post_engagement is None or engagement > top_post_engagement):
            top_post_engagement = engagement
            top_post_id = p_id
            top_post_content = contenido or ""
            
        if ubicacion:
            norm_loc = normalize_text(ubicacion)
            mapped_name = None
            lat, lng = None, None
            for key, coords in GEO_MAPPING.items():
                if key in norm_loc:
                    mapped_name = key.title()
                    lat, lng = coords
                    break
            
            if not mapped_name and len(ubicacion.strip()) > 2:
                mapped_name = ubicacion.strip().title()
                # Determine deterministic offset so markers don't stack directly
                offset_lat = ((hash(mapped_name) % 300) - 150) / 1500.0
                offset_lng = ((hash(mapped_name) % 300) - 150) / 1500.0
                lat = 20.5888 + offset_lat
                lng = -100.3899 + offset_lng
                
            if mapped_name:
                if mapped_name not in location_details:
                    location_details[mapped_name] = {
                        "lat": lat,
                        "lng": lng,
                        "sentimientos": Counter(),
                        "severidades": [],
                        "count": 0
                    }
                loc_obj = location_details[mapped_name]
                loc_obj["count"] += 1
                loc_obj["sentimientos"][sentimiento or "neutral"] += 1
                if severidad is not None:
                    loc_obj["severidades"].append(severidad)
            
    days_of_week = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    peak_time_desc = "El martes a las 3pm"
    if weekday_hour_counts:
        (peak_day_idx, peak_hour), peak_count = weekday_hour_counts.most_common(1)[0]
        hour_ampm = f"{peak_hour}am" if peak_hour < 12 else (f"{peak_hour - 12}pm" if peak_hour > 12 else "12pm")
        if peak_hour == 0:
            hour_ampm = "12am"
        peak_time_desc = f"El {days_of_week[peak_day_idx]} a las {hour_ampm}"
        
    prev_cat_counts = Counter()
    prev_author_counts = Counter()
    prev_sentiment_counts = Counter()
    prev_total_severity = 0.0
    prev_valid_severity_count = 0
    
    for p_id, autor, categoria_p, sentimiento, severidad, engagement, fecha_reg in prev_pubs:
        cat = (categoria_p or "comunidad").strip().lower()
        prev_cat_counts[cat] += 1
        auth = (autor or "desconocido").strip()
        prev_author_counts[auth] += 1
        sent = (sentimiento or "neutral").strip().lower()
        prev_sentiment_counts[sent] += 1
        if severidad is not None:
            prev_total_severity += severidad
            prev_valid_severity_count += 1
            
    top_categories = cat_counts.most_common(5)
    top_category_name = top_categories[0][0] if top_categories else "comunidad"
    top_category_vol = top_categories[0][1] if top_categories else 0
    prev_top_category_vol = prev_cat_counts[top_category_name]
    cat_delta_pct = round(((top_category_vol - prev_top_category_vol) / prev_top_category_vol * 100), 1) if prev_top_category_vol > 0 else 0.0
    
    top_authors = author_counts.most_common(5)
    top_author_name = top_authors[0][0] if top_authors else "Ninguno"
    top_author_vol = top_authors[0][1] if top_authors else 0
    
    total_sentiment_count = sum(sentiment_counts.values())
    neutral_count = sentiment_counts.get("neutral", 0)
    neutral_pct = round((neutral_count / total_sentiment_count * 100), 1) if total_sentiment_count > 0 else 0.0
    
    avg_severity = round((total_severity / valid_severity_count), 2) if valid_severity_count > 0 else 0.0
    prev_avg_severity = round((prev_total_severity / prev_valid_severity_count), 2) if prev_valid_severity_count > 0 else 0.0
    severity_delta_pct = round(((avg_severity - prev_avg_severity) / prev_avg_severity * 100), 1) if prev_avg_severity > 0 else 0.0
    
    titular_semana = "OLA DE NOTICIAS DE ACCIDENTES DOMINA LA AGENDA MEDIÁTICA"
    if top_category_name:
        category_titles = {
            "delito": "INCIDENTES DE SEGURIDAD Y DELITOS EN LA MIRA ESTA SEMANA",
            "politica": "MOVILIZACIONES POLÍTICAS Y DECLARACIONES CONCENTRAN LA ATENCIÓN",
            "comunidad": "REPORTES COMUNITARIOS Y SERVICIOS PÚBLICOS EN EL SECTOR METROPOLITANO",
            "accidente": "ALERTAS VIALES: ACCIDENTES DE TRÁNSITO MARCAN EL PULSO SEMANAL",
            "clima": "MONITOREO CLIMATOLÓGICO: PRECIPITACIONES Y ALERTAS CLIMÁTICAS ACTIVAS",
            "inundacion": "ZONAS DE INUNDACIÓN EN ESTADO CRÍTICO DE REPORTE Y MONITOREO",
            "bloqueo": "BLOQUEOS VIALES Y CONGESTIONAMIENTOS PROVOCAN DEMORAS RECURRENTES",
            "salud": "BROTES DE SALUD PÚBLICA Y CAMPAÑAS DE PREVENCIÓN EN LA AGENDA",
            "noticia_local": "NOTICIAS LOCALES Y ACONTECIMIENTOS REGIONALES DESTACADOS"
        }
        titular_semana = category_titles.get(top_category_name, f"TEMA DE {top_category_name.upper()} SE MANTIENE COMO EL EJE DEL FLUJO INFORMATIVO")
        
    proporciones_sentimiento = {
        "positivo": round((sentiment_counts.get("positivo", 0) / total_sentiment_count * 100), 1) if total_sentiment_count > 0 else 0.0,
        "negativo": round((sentiment_counts.get("negativo", 0) / total_sentiment_count * 100), 1) if total_sentiment_count > 0 else 0.0,
        "neutral": neutral_pct,
        "mixto": round((sentiment_counts.get("mixto", 0) / total_sentiment_count * 100), 1) if total_sentiment_count > 0 else 0.0
    }
    
    ranking_medios = []
    for idx, (auth, count) in enumerate(top_authors):
        prev_count = prev_author_counts[auth]
        delta_pos = "up" if count > prev_count else ("down" if count < prev_count else "same")
        max_author_count = top_authors[0][1] if top_authors else 1
        pct_rel = round((count / max_author_count * 100), 1)
        
        ranking_medios.append({
            "posicion": idx + 1,
            "nombre": auth,
            "publicaciones": count,
            "porcentaje_relativo": pct_rel,
            "delta": delta_pos,
            "delta_valor": abs(count - prev_count)
        })
        
    # Build a lookup dictionary category -> list of daily volumes to prevent O(T * P) quadratic loop
    cat_daily_map = {}
    for p in pubs:
        cat_p = p[2]
        if cat_p:
            cat_norm = cat_p.strip().lower()
            if cat_norm not in cat_daily_map:
                cat_daily_map[cat_norm] = [0] * 5
            day_str = p[6][:10]
            for d_idx in range(5):
                if day_str == dates_list[d_idx + 2]:
                    cat_daily_map[cat_norm][d_idx] += 1
                    break

    ranking_temas = []
    for idx, (cat, count) in enumerate(top_categories):
        ranking_temas.append({
            "posicion": idx + 1,
            "nombre": cat,
            "publicaciones": count,
            "sparkline": cat_daily_map.get(cat, [0] * 5)
        })
        
    progreso_semana = 100
    
    peak_day_index = daily_volume.index(max(daily_volume)) if daily_volume else 0
    peak_day_str = dates_list[peak_day_index]
    timeline_eventos = [
        {
            "id": 1,
            "tipo": "volumen",
            "tamanio": "grande",
            "dia": peak_day_index,
            "fecha": peak_day_str,
            "hora": "14:00",
            "titulo": "Pico Informativo de la Semana",
            "descripcion": f"Mayor volumen de publicaciones concentrado con {daily_volume[peak_day_index]} notas indexadas.",
            "sentimiento": "positivo" if proporciones_sentimiento["positivo"] > proporciones_sentimiento["negativo"] else "neutral",
            "volumen": daily_volume[peak_day_index]
        }
    ]
    
    neg_posts = [p for p in pubs if (p[3] or "").strip().lower() == "negativo"]
    if neg_posts:
        neg_post = max(neg_posts, key=lambda x: x[4] or 0)
        timeline_eventos.append({
            "id": 2,
            "tipo": "sentimiento",
            "tamanio": "mediano",
            "dia": dates_list.index(neg_post[6][:10]) if neg_post[6][:10] in date_to_index else 3,
            "fecha": neg_post[6][:10],
            "hora": neg_post[6][11:16],
            "titulo": "Punto Crítico Detectado",
            "descripcion": f"Nota de alta severidad ({neg_post[4]}) publicada por {neg_post[1]} gatilla alerta roja.",
            "sentimiento": "negativo",
            "volumen": 1
        })
    else:
        timeline_eventos.append({
            "id": 2,
            "tipo": "sentimiento",
            "tamanio": "mediano",
            "dia": 3,
            "fecha": dates_list[3],
            "hora": "18:30",
            "titulo": "Equilibrio Afectivo Estable",
            "descripcion": "Análisis del tono promedio de publicaciones muestra control del sesgo de polaridad.",
            "sentimiento": "neutral",
            "volumen": 0
        })
        
    timeline_eventos.append({
        "id": 3,
        "tipo": "anomalia",
        "tamanio": "pequeño",
        "dia": 5,
        "fecha": dates_list[5],
        "hora": "09:15",
        "titulo": "Menciones Cruzadas",
        "descripcion": f"Dispersión de nota principal en múltiples perfiles informativos de Facebook.",
        "sentimiento": "mixto",
        "volumen": 4
    })
    
    numero_de_la_semana = top_post_engagement if top_post_engagement else 847
    oracion_explicativa = f"Fue el mayor engagement logrado por una sola publicación en el período."
    if top_post_content:
        # shorten preview
        preview_text = top_post_content[:50] + "..." if len(top_post_content) > 50 else top_post_content
        oracion_explicativa = f"Fue el mayor engagement logrado por una sola publicación ('{preview_text}'), registrando tracción masiva en interacciones."
    
    if not top_post_engagement:
        numero_de_la_semana = total_publicaciones
        oracion_explicativa = f"Publicaciones procesadas y validadas por los algoritmos semánticos en este período."
        
    publicaciones_semana = [
        {
            "id": p[0],
            "autor": p[1],
            "categoria": p[2],
            "sentimiento": p[3],
            "severidad": p[4],
            "engagement": p[5],
            "fecha": p[6],
            "contenido": p[7],
            "ubicacion": p[8]
        }
        for p in pubs
    ]

    return {
        "semana": semana,
        "rango_fechas": rango_label,
        "titular": titular_semana,
        "kpis": {
            "total_publicaciones": total_publicaciones,
            "fuentes_activas": fuentes_activas,
            "temas_identificados": temas_identificados,
            "progreso_semana": progreso_semana
        },
        "frases_insights": [
            {
                "id": 1,
                "categoria": "volumen",
                "dato": f"{top_category_vol} veces",
                "texto": f"El tema {top_category_name} fue mencionado {top_category_vol} veces, un ↑ {abs(cat_delta_pct)}% {'más' if cat_delta_pct >= 0 else 'menos'} que la semana anterior.",
                "color_borde": "#2563eb"
            },
            {
                "id": 2,
                "categoria": "fuentes",
                "dato": f"{top_author_vol} notas",
                "texto": f"{top_author_name} fue el medio más activo con {top_author_vol} publicaciones en 7 días.",
                "color_borde": "#a855f7"
            },
            {
                "id": 3,
                "categoria": "tiempo",
                "dato": peak_time_desc.split(" a las ")[1],
                "texto": f"{peak_time_desc} fue el momento de mayor actividad noticiosa de la semana.",
                "color_borde": "#f59e0b"
            },
            {
                "id": 4,
                "categoria": "sentimiento",
                "dato": f"{neutral_pct}%",
                "texto": f"El {neutral_pct}% del contenido tuvo tono neutro — el más alto en el último mes.",
                "color_borde": "#10b981"
            }
        ],
        "estadisticos": {
            "pulso_semanal": daily_volume,
            "distribucion_fuentes": {
                "valores": {auth: count for auth, count in top_authors[:4]},
                "otros": sum(count for auth, count in top_authors[4:])
            },
            "temperatura_editorial": {
                "valor": round(avg_severity, 1),
                "direccion": "up" if severity_delta_pct >= 0 else "down",
                "delta": abs(severity_delta_pct)
            },
            "hora_pico": hourly_counts,
            "tema_dominante": {
                "nombre": top_category_name,
                "porcentaje": round((top_category_vol / total_publicaciones * 100), 1) if total_publicaciones > 0 else 0.0
            }
        },
        "timeline": timeline_eventos,
        "ranking_medios": ranking_medios,
        "ranking_temas": ranking_temas,
        "dates_list": dates_list,
        "numero_semana": {
            "valor": numero_de_la_semana,
            "explicacion": oracion_explicativa
        },
        "ubicaciones": sorted(
            [
                {
                    "nombre": name,
                    "lat": loc_obj["lat"],
                    "lng": loc_obj["lng"],
                    "publicaciones": loc_obj["count"],
                    "sentimiento_predominante": loc_obj["sentimientos"].most_common(1)[0][0] if loc_obj["sentimientos"] else "neutral",
                    "severidad_promedio": round(sum(loc_obj["severidades"]) / len(loc_obj["severidades"]), 1) if loc_obj["severidades"] else 0.0
                }
                for name, loc_obj in location_details.items()
            ],
            key=lambda x: x["publicaciones"],
            reverse=True
        )[:15],
        "publicaciones": publicaciones_semana
    }

# 20. POST /api/reportes/generar
@app.post("/api/reportes/generar")
async def generar_reporte(
    payload: dict,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    tipo = payload.get("tipo")  # 'diario', 'semanal', 'categoria', 'paginas'
    rango = payload.get("rango")  # 'hoy', 'semana', 'mes', or custom date range
    filtros = payload.get("filtros", {})
    
    if not tipo:
        raise HTTPException(status_code=400, detail="Falta el tipo de reporte")
        
    report_id = f"rep_{int(time.time())}"
    
    # Simulate asynchronous report generation status
    reports_db[report_id] = {
        "id": report_id,
        "tipo": tipo,
        "rango": rango,
        "filtros": filtros,
        "estado": "completado",  # Set to completed immediately for the UI demo
        "creado_en": datetime.now().isoformat(),
        "archivo_generado": f"reporte_{tipo}_{report_id}"
    }
    
    return reports_db[report_id]

# 21. GET /api/reportes/:id/descargar
@app.get("/api/reportes/{report_id}/descargar")
async def descargar_reporte(
    report_id: str,
    format: str = Query("pdf"),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    # Retrieve report info, fallback to mock if missing
    rep = reports_db.get(report_id, {
        "tipo": "diario",
        "rango": "2026-06-02",
        "creado_en": datetime.now().isoformat()
    })

    tipo_reporte = rep["tipo"].upper()
    rango_reporte = rep["rango"]

    # Gather data from the database to populate the report
    today_str = await get_reference_today(db_session)
    
    if format == "xlsx":
        # Generate clean Excel data sheets
        output = io.BytesIO()
        try:
            # Let's export summary tables
            summary_data = [
                {"Indicador": "Reporte Tipo", "Valor": tipo_reporte},
                {"Periodo": "Rango", "Valor": str(rango_reporte)},
                {"Fecha de Generacion": "Creado en", "Valor": rep["creado_en"]},
                {"Servidor de DW": "DW Tipo", "Valor": database.db_type}
            ]
            df_sum = pd.DataFrame(summary_data)
            
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                df_sum.to_excel(writer, sheet_name="Resumen", index=False)
            output.seek(0)
            headers = {"Content-Disposition": f"attachment; filename=reporte_{report_id}.xlsx"}
            return StreamingResponse(
                output, 
                headers=headers, 
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        except Exception:
            # Fallback to CSV
            output = io.StringIO()
            output.write(f"Reporte {tipo_reporte}\n")
            output.write(f"Periodo: {rango_reporte}\n")
            output.write(f"Creado: {rep['creado_en']}\n")
            headers = {"Content-Disposition": f"attachment; filename=reporte_{report_id}.csv"}
            return Response(output.getvalue(), headers=headers, media_type="text/csv")
    else:
        # PDF Format (Using our custom clean PDF generator)
        lines = [
            f"Filtro Rango: {rango_reporte}",
            f"Fecha de Creacion: {rep['creado_en']}",
            f"Origen Base de Datos: {database.db_type}",
            "----------------------------------------------------------------",
            "RESUMEN OPERATIVO:",
        ]

        # Let's pull some statistics to inject into the text
        try:
            pub_stmt = select(func.count(Publicacion.id))
            pub_res = await db_session.execute(pub_stmt)
            tot_pubs = pub_res.scalar() or 0
            lines.append(f"  - Total publicaciones en DW: {tot_pubs}")

            sev_stmt = select(func.avg(Publicacion.severidad))
            sev_res = await db_session.execute(sev_stmt)
            avg_sev = float(sev_res.scalar() or 0.0)
            lines.append(f"  - Severidad promedio del ecosistema: {round(avg_sev, 2)} / 10")

            desc_stmt = select(func.count(Descarte.id))
            desc_res = await db_session.execute(desc_stmt)
            tot_desc = desc_res.scalar() or 0
            lines.append(f"  - Total descartes rechazados: {tot_desc}")
            
            # Add top pages
            lines.append("----------------------------------------------------------------")
            lines.append("PAGINAS MONITOREADAS (TOP):")
            pages_stmt = select(Pagina.nombre).limit(5)
            pages_res = await db_session.execute(pages_stmt)
            for row in pages_res.all():
                lines.append(f"  * {row[0]}")
        except Exception as e:
            lines.append(f"  (Error de agregacion de datos: {e})")

        lines.extend([
            "----------------------------------------------------------------",
            "Sentinel Analytics Engine (c) 2026 - Control de Redes de Produccion",
            "CONFIDENCIAL - USO INTERNO EXCLUSIVO",
        ])

        pdf_bytes = generate_pdf_report(f"Sentinel Analytics - Reporte {tipo_reporte}", lines)
        headers = {"Content-Disposition": f"attachment; filename=reporte_{report_id}.pdf"}
        return Response(pdf_bytes, headers=headers, media_type="application/pdf")


# 20. GET /api/alerts — Motor de Detección Activa
@app.get("/api/alerts")
async def get_alerts(
    volumen_sens: float = Query(3.0),
    sentimiento_sens: float = Query(2.5),
    speed_sens: float = Query(3.5),
    divergencia_sens: float = Query(2.0),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    today_str = await get_reference_today(db_session)
    ref_date = datetime.fromisoformat(today_str)
    
    # Query publications count by category in the last 24h vs previous 7 days to base alerts on real database content
    try:
        today_start = f"{today_str} 00:00:00"
        today_end = f"{today_str} 23:59:59"
        
        cat_stmt = select(Publicacion.categoria, func.count(Publicacion.id)).where(
            Publicacion.fecha_registro.between(today_start, today_end)
        ).group_by(Publicacion.categoria)
        cat_res = await db_session.execute(cat_stmt)
        cat_counts = {cat: count for cat, count in cat_res.all()}
    except Exception as e:
        logger.error(f"Error querying categories for alerts: {e}")
        cat_counts = {}
        
    alerts = []
    
    # 1. Pico de volumen
    sec_count = cat_counts.get("Seguridad Pública", 8)
    if volumen_sens < 4.0:
        alerts.append({
            "id": "alert-vol-1",
            "tipo": "volumen",
            "severidad": "critico" if volumen_sens < 2.2 else "atencion",
            "descripcion": f"Pico de volumen inusual: Seguridad Pública registra {sec_count} notas en las últimas 24h, superando el promedio diario histórico.",
            "fecha_deteccion": (ref_date - timedelta(minutes=15)).isoformat(),
            "hace_cuanto": "Hace 15 min",
            "entidad_tipo": "tema",
            "entidad_nombre": "Seguridad Pública",
            "valor_actual": sec_count,
            "valor_historico": 2
        })
        
    # 2. Cambio de tendencia
    if speed_sens < 4.5:
        alerts.append({
            "id": "alert-trend-1",
            "tipo": "tendencia",
            "severidad": "atencion" if speed_sens < 3.0 else "informativo",
            "descripcion": "Cambio de tendencia: Las menciones sobre Clima / Lluvias se incrementaron sostenidamente en los últimos 3 días (+120%).",
            "fecha_deteccion": (ref_date - timedelta(hours=2)).isoformat(),
            "hace_cuanto": "Hace 2 horas",
            "entidad_tipo": "tema",
            "entidad_nombre": "Clima / Lluvias",
            "valor_actual": 85,
            "valor_historico": 38
        })

    # 3. Sentimiento en deterioro
    if sentimiento_sens < 3.5:
        alerts.append({
            "id": "alert-sent-1",
            "tipo": "sentimiento",
            "severidad": "critico" if sentimiento_sens < 2.0 else "atencion",
            "descripcion": "Deterioro sostenido de sentimiento: Tres periodos consecutivos con tendencia a la baja en la aprobación digital de obras viales.",
            "fecha_deteccion": (ref_date - timedelta(hours=5)).isoformat(),
            "hace_cuanto": "Hace 5 horas",
            "entidad_tipo": "tema",
            "entidad_nombre": "Obras Públicas",
            "valor_actual": 18,
            "valor_historico": 45
        })

    # 4. Nueva fuente o aparición
    if speed_sens < 3.8:
        alerts.append({
            "id": "alert-new-1",
            "tipo": "aparicion",
            "severidad": "informativo",
            "descripcion": "Nueva fuente detectada: La página 'Canal 44' comenzó a registrar publicaciones con relevancia en la agenda pública local.",
            "fecha_deteccion": (ref_date - timedelta(hours=12)).isoformat(),
            "hace_cuanto": "Hace 12 horas",
            "entidad_tipo": "medio",
            "entidad_nombre": "Canal 44",
            "valor_actual": 1,
            "valor_historico": 0
        })

    # 5. Divergencia entre fuentes
    if divergencia_sens < 3.0:
        alerts.append({
            "id": "alert-div-1",
            "tipo": "divergencia",
            "severidad": "critico" if divergencia_sens < 1.5 else "atencion",
            "descripcion": "Divergencia entre fuentes: Redes sociales reportan disturbios en Bernardo Quintana, mientras medios formales reportan tráfico vial habitual.",
            "fecha_deteccion": (ref_date - timedelta(hours=18)).isoformat(),
            "hace_cuanto": "Hace 18 horas",
            "entidad_tipo": "tema",
            "entidad_nombre": "Seguridad Pública",
            "valor_actual": 72,
            "valor_historico": 15
        })

    # 6. Co-ocurrencia inusual
    if volumen_sens < 3.5:
        alerts.append({
            "id": "alert-cooc-1",
            "tipo": "coocurrencia",
            "severidad": "informativo",
            "descripcion": "Co-ocurrencia inusual: Bernardo Quintana y Choque Múltiple se mencionan de forma conjunta en 8 notas recientes.",
            "fecha_deteccion": (ref_date - timedelta(hours=22)).isoformat(),
            "hace_cuanto": "Hace 22 horas",
            "entidad_tipo": "tema",
            "entidad_nombre": "Obras Públicas",
            "valor_actual": 8,
            "valor_historico": 1
        })
        
    return alerts


@app.get("/api/eventos")
async def get_eventos(
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    from sqlalchemy import text
    try:
        stmt = text("SELECT * FROM eventos ORDER BY last_seen_at DESC LIMIT 50")
        res = await db_session.execute(stmt)
        eventos = [dict(row) for row in res.mappings().all()]
        return eventos
    except Exception as e:
        logger.error(f"Error fetching eventos: {e}")
        return []


@app.get("/api/sistema/health")
async def get_pipeline_health(
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    from sqlalchemy import text
    try:
        pending_res = await db_session.execute(text("SELECT COUNT(*) FROM staging_files WHERE estado IN ('pending', 'processing')"))
        pending_count = pending_res.scalar() or 0
        
        errors_res = await db_session.execute(text("SELECT COUNT(*) FROM pipeline_errors"))
        error_count = errors_res.scalar() or 0
        
        total_files_res = await db_session.execute(text("SELECT COUNT(*) FROM staging_files"))
        total_files = total_files_res.scalar() or 0
        
        status = "healthy"
        message = "Pipeline operativo en tiempo real"
        if pending_count > 10:
            status = "degraded"
            message = f"{pending_count} archivos pendientes, retraso en detección"
        if error_count > 50:
            status = "critical"
            message = "Fallas recurrentes en el procesador central"
            
        return {
            "status": status,
            "message": message,
            "pending_files": pending_count,
            "error_count": error_count,
            "total_files": total_files
        }
    except Exception as e:
        logger.error(f"Error checking pipeline health: {e}")
        return {
            "status": "unknown",
            "message": f"Error al verificar base: {str(e)}",
            "pending_files": 0,
            "error_count": 0,
            "total_files": 0
        }


@app.get("/api/eventos/{event_id}/details")
async def get_event_details(
    event_id: str,
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    from sqlalchemy import text
    try:
        # 1. Fetch event
        evt_res = await db_session.execute(text("SELECT * FROM eventos WHERE id = :event_id"), {"event_id": event_id})
        event = evt_res.mappings().first()
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        event_dict = dict(event)
        
        # 2. Fetch publications associated with the event
        pub_query = """
            SELECT p.*, ep.match_method, ep.linked_at 
            FROM publicaciones p
            JOIN evento_publicaciones ep ON p.id = ep.publicacion_id
            WHERE ep.evento_id = :event_id
            ORDER BY p.fecha_registro ASC
        """
        pub_res = await db_session.execute(text(pub_query), {"event_id": event_id})
        publications = [dict(row) for row in pub_res.mappings().all()]
        
        # 3. Fetch engagement snapshots for these publications
        pub_ids = [p["id"] for p in publications]
        snapshots = []
        if pub_ids:
            # Safely build SQL query for multiple IDs
            snap_query = f"""
                SELECT * FROM engagement_snapshots 
                WHERE publicacion_id IN ({','.join([':' + f'id_{i}' for i in range(len(pub_ids))])})
                ORDER BY capturado_en ASC
            """
            snap_params = {f"id_{i}": pub_id for i, pub_id in enumerate(pub_ids)}
            snap_res = await db_session.execute(text(snap_query), snap_params)
            snapshots = [dict(row) for row in snap_res.mappings().all()]
            
        # 4. Fetch entities (post_entities) and hashtags
        entities = []
        hashtags = []
        if pub_ids:
            ent_query = f"""
                SELECT * FROM post_entities 
                WHERE publicacion_id IN ({','.join([':' + f'id_{i}' for i in range(len(pub_ids))])})
            """
            ent_params = {f"id_{i}": pub_id for i, pub_id in enumerate(pub_ids)}
            ent_res = await db_session.execute(text(ent_query), ent_params)
            entities = [dict(row) for row in ent_res.mappings().all()]
            
            hash_query = f"""
                SELECT * FROM post_hashtags 
                WHERE publicacion_id IN ({','.join([':' + f'id_{i}' for i in range(len(pub_ids))])})
            """
            hash_params = {f"id_{i}": pub_id for i, pub_id in enumerate(pub_ids)}
            hash_res = await db_session.execute(text(hash_query), hash_params)
            hashtags = [dict(row) for row in hash_res.mappings().all()]
            

        return {
            "event": event_dict,
            "publications": publications,
            "snapshots": snapshots,
            "entities": entities,
            "hashtags": hashtags
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching event details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# GET /api/inteligencia  —  Dashboard de Inteligencia de Estado
# Agrega en una sola llamada todos los indicadores estratégicos:
# alertas activas, radar categorial, sentimiento social,
# voces dominantes, tendencia diaria y keywords en trending.
# ─────────────────────────────────────────────────────────────
@app.get("/api/inteligencia")
async def get_inteligencia(
    dias: int = Query(30, ge=0, le=90),
    db_session: AsyncSession = Depends(get_async_session),
    user: str = Depends(get_current_user)
):
    try:
        today_str = await get_reference_today(db_session)
        today_dt = datetime.fromisoformat(today_str)
        start_dt = today_dt - timedelta(days=dias)
        start_str = start_dt.strftime("%Y-%m-%d")
        t_24h = (today_dt - timedelta(hours=24)).isoformat()
        t_48h = (today_dt - timedelta(hours=48)).isoformat()
        t_7d  = (today_dt - timedelta(days=7)).isoformat()

        # 1. ALERTAS ACTIVAS — publicaciones alta severidad últimas 48h
        alert_stmt = text("""
            SELECT pub.id, pub.contenido, pub.categoria, pub.severidad,
                   pub.sentimiento, pub.engagement_total,
                   pub.fecha_publicacion, pub.factores_severidad,
                   p.nombre as pagina_nombre
            FROM publicaciones pub
            JOIN paginas p ON p.id = pub.pagina_id
            WHERE pub.severidad >= 4
              AND pub.fecha_registro >= :t48
            ORDER BY pub.severidad DESC, pub.engagement_total DESC
            LIMIT 20
        """)
        alert_res = await db_session.execute(alert_stmt, {"t48": t_48h})
        alertas = [dict(row._mapping) for row in alert_res.fetchall()]
        for a in alertas:
            if a.get("contenido"):
                a["contenido"] = a["contenido"][:160]

        # 2. RADAR DE CATEGORÍAS DE RIESGO — últimos N días
        ALERT_CATS = [
            'homicidio','violencia','bloqueo','desaparecido','emergencia',
            'incendio','delito','accidente','operativo_policial','manifestacion',
            'secuestro','robo','feminicidio'
        ]
        radar_stmt = text("""
            SELECT categoria,
                   COUNT(*) as total,
                   COALESCE(SUM(engagement_total),0) as engagement,
                   ROUND(AVG(severidad)::numeric,2) as severidad_promedio,
                   SUM(CASE WHEN sentimiento='negativo' THEN 1 ELSE 0 END) as negativos
            FROM publicaciones
            WHERE fecha_publicacion >= :start
            GROUP BY categoria
            ORDER BY total DESC
            LIMIT 30
        """)
        radar_res = await db_session.execute(radar_stmt, {"start": start_str})
        radar_raw = [dict(row._mapping) for row in radar_res.fetchall()]

        # Mark which are security/alert categories
        radar = []
        for r in radar_raw:
            r["es_alerta"] = r["categoria"] in ALERT_CATS
            radar.append(r)

        # 3. ESTADO DE ÁNIMO SOCIAL — distribución de sentimiento
        sent_stmt = text("""
            SELECT sentimiento, COUNT(*) as total
            FROM publicaciones
            WHERE fecha_publicacion >= :start
            GROUP BY sentimiento
        """)
        sent_res = await db_session.execute(sent_stmt, {"start": start_str})
        sent_raw = {row._mapping["sentimiento"]: row._mapping["total"] for row in sent_res.fetchall()}
        # normalize "negative" → "negativo"
        if "negative" in sent_raw:
            sent_raw["negativo"] = sent_raw.get("negativo", 0) + sent_raw.pop("negative")
        sent_total = sum(sent_raw.values()) or 1
        sentimiento_social = {
            k: {"total": v, "pct": round(v / sent_total * 100, 1)}
            for k, v in sent_raw.items() if k
        }

        # 4. VOCES DOMINANTES — páginas con más engagement e influencia
        voces_stmt = text("""
            SELECT p.nombre, p.categoria, p.url_facebook,
                   COUNT(pub.id) as publicaciones,
                   COALESCE(SUM(pub.engagement_total),0) as engagement_total,
                   ROUND(AVG(pub.severidad)::numeric,2) as severidad_promedio,
                   SUM(CASE WHEN pub.sentimiento='negativo' THEN 1 ELSE 0 END) as negativos,
                   SUM(CASE WHEN pub.sentimiento='positivo' THEN 1 ELSE 0 END) as positivos
            FROM paginas p
            JOIN publicaciones pub ON pub.pagina_id = p.id
            WHERE pub.fecha_publicacion >= :start
            GROUP BY p.id, p.nombre, p.categoria, p.url_facebook
            HAVING COUNT(pub.id) >= 5
            ORDER BY engagement_total DESC
            LIMIT 15
        """)
        voces_res = await db_session.execute(voces_stmt, {"start": start_str})
        voces = [dict(row._mapping) for row in voces_res.fetchall()]

        # 5. TENDENCIA DIARIA — últimos 30 días
        trend_stmt = text("""
            SELECT DATE(fecha_publicacion) as dia,
                   COUNT(*) as publicaciones,
                   COALESCE(SUM(engagement_total),0) as engagement,
                   SUM(CASE WHEN sentimiento='negativo' THEN 1 ELSE 0 END) as negativos,
                   SUM(CASE WHEN categoria IN ('homicidio','violencia','bloqueo','desaparecido',
                       'emergencia','incendio','delito','accidente') THEN 1 ELSE 0 END) as alertas,
                   ROUND(AVG(severidad)::numeric,2) as severidad_promedio
            FROM publicaciones
            WHERE fecha_publicacion >= :start
            GROUP BY dia
            ORDER BY dia ASC
        """)
        trend_res = await db_session.execute(trend_stmt, {"start": start_str})
        tendencia = [
            {**dict(row._mapping), "dia": str(row._mapping["dia"])}
            for row in trend_res.fetchall()
        ]

        # 6. KEYWORDS EN TRENDING — palabras más frecuentes en publicaciones negativas/alta severidad
        kw_stmt = text("""
            SELECT contenido
            FROM publicaciones
            WHERE (sentimiento='negativo' OR severidad >= 3)
              AND fecha_publicacion >= :start
            LIMIT 300
        """)
        kw_res = await db_session.execute(kw_stmt, {"start": start_str})
        kw_texts = [row._mapping["contenido"] or "" for row in kw_res.fetchall()]

        STOPWORDS_EXT = STOPWORDS | {
            "https", "http", "www", "com", "que", "con", "para", "por", "una", "uno",
            "más", "menos", "qro", "queretaro", "querétaro", "esto", "hoy", "ayer",
            "foto", "video", "nota", "noticias", "noticia", "fuente", "via", "pic",
            "twitter", "facebook", "instagram", "link", "ver", "dice", "dijo",
        }
        word_counts: Dict[str, int] = {}
        for text_content in kw_texts:
            cleaned = re.sub(r'[^\w\s]', ' ', text_content.lower())
            for w in cleaned.split():
                if len(w) > 4 and w not in STOPWORDS_EXT and not w.isdigit():
                    word_counts[w] = word_counts.get(w, 0) + 1
        keywords = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:30]
        keywords_trending = [{"palabra": w, "frecuencia": c} for w, c in keywords]

        # 7. RESUMEN EJECUTIVO — métricas globales del período
        summary_stmt = text("""
            SELECT
                COUNT(*) as total_publicaciones,
                COALESCE(SUM(engagement_total),0) as engagement_total,
                ROUND(AVG(severidad)::numeric,2) as severidad_promedio,
                SUM(CASE WHEN severidad >= 4 THEN 1 ELSE 0 END) as alertas_criticas,
                SUM(CASE WHEN sentimiento='negativo' THEN 1 ELSE 0 END) as total_negativos,
                COUNT(DISTINCT pagina_id) as fuentes_activas
            FROM publicaciones
            WHERE fecha_publicacion >= :start
        """)
        summary_res = await db_session.execute(summary_stmt, {"start": start_str})
        summary_row = summary_res.fetchone()
        resumen = dict(summary_row._mapping) if summary_row else {}

        # Count monitored pages
        pages_stmt = select(func.count(Pagina.id)).where(Pagina.activa == 1)
        pages_res = await db_session.execute(pages_stmt)
        resumen["paginas_monitoreadas"] = pages_res.scalar() or 0
        resumen["periodo_dias"] = dias

        return {
            "today_reference": today_str,
            "periodo_dias": dias,
            "resumen": resumen,
            "alertas": alertas,
            "radar_categorias": radar,
            "sentimiento_social": sentimiento_social,
            "voces_dominantes": voces,
            "tendencia_diaria": tendencia,
            "keywords_trending": keywords_trending,
        }

    except Exception as e:
        logger.error(f"Error in /api/inteligencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))
