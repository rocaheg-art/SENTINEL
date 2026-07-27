import { NextRequest, NextResponse } from "next/server";

const MAU_BASE = process.env.SENTINEL_MAU_URL || "http://127.0.0.1:5001";

export async function GET() {
  try {
    const res = await fetch(`${MAU_BASE}/api/categorias`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "mau_offline", message: err.message || "No se pudo obtener las categorías de la base de datos." },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${MAU_BASE}/api/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "mau_offline", message: err.message || "No se pudo registrar la categoría." },
      { status: 503 }
    );
  }
}

