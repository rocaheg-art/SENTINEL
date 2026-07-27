import { NextRequest, NextResponse } from "next/server";
import { MOCK_FUENTES } from "@/lib/mockDb";

const MAU_BASE = process.env.SENTINEL_MAU_URL || "http://127.0.0.1:5001";

// Vercel/Offline Simulator Cache
let localFuentes = [...MOCK_FUENTES];

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase();
  try {
    const res = await fetch(`${MAU_BASE}/api/fuentes?q=${encodeURIComponent(q)}`, { next: { revalidate: 10 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    const filtered = localFuentes.filter(f => 
      f.nombre.toLowerCase().includes(q) || 
      (f.categoria_raiz || "").toLowerCase().includes(q) || 
      (f.municipio || "").toLowerCase().includes(q)
    );
    return NextResponse.json({ fuentes: filtered, total: filtered.length });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${MAU_BASE}/api/fuentes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    const newId = localFuentes.length + 1;
    const newFuente = {
      id: newId,
      nombre: body.nombre || "",
      url_facebook: body.url_facebook || "",
      url_web: body.url_web || null,
      municipio: body.municipio || "Querétaro",
      estado: body.estado || "Querétaro",
      pais: body.pais || "México",
      tipo_fuente: body.tipo_fuente || "Medio",
      enlace_valido: body.enlace_valido ?? 1,
      pagina_activa: body.pagina_activa ?? 1,
      duplicado: body.duplicado ?? 0,
      estado_validacion: body.estado_validacion || "Pendiente",
      categoria_raiz: "Medio Informativo",
      subcategoria: body.subcategoria || "",
      tipo_especifico: body.tipo_especifico || "",
      creado_en: new Date().toUTCString(),
      agregado_por: "Mauricio (Simulado)"
    };
    localFuentes.unshift(newFuente as any);
    return NextResponse.json({ success: true, id: newId });
  }
}
