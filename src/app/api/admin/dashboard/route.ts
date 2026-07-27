import { NextResponse } from "next/server";
import { MOCK_FUENTES } from "@/lib/mockDb";

const MAU_BASE = process.env.SENTINEL_MAU_URL || "http://127.0.0.1:5001";

export async function GET() {
  try {
    const res = await fetch(`${MAU_BASE}/api/dashboard`, { next: { revalidate: 10 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Vercel / Offline Fallback from Mauricio's local db snapshot
    return NextResponse.json({
      total_fuentes: MOCK_FUENTES.length,
      total_categorias: 256,
      total_usuarios: 1,
      por_categoria: [
        { nombre: "Medio Informativo", total: MOCK_FUENTES.length }
      ],
      ultimos: MOCK_FUENTES,
      por_usuario: [
        { nombre: "Mauricio", total: MOCK_FUENTES.length }
      ]
    });
  }
}
