import { NextResponse } from "next/server";

const MAU_BASE = process.env.SENTINEL_MAU_URL || "http://127.0.0.1:5001";

export async function GET() {
  try {
    const res = await fetch(`${MAU_BASE}/api/dashboard`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "mau_offline", message: err.message || "No se pudo conectar con el motor de administración local." },
      { status: 503 }
    );
  }
}
