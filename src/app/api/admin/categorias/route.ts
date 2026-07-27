import { NextRequest, NextResponse } from "next/server";
import { MOCK_CATEGORIAS } from "@/lib/mockDb";

const MAU_BASE = process.env.SENTINEL_MAU_URL || "http://127.0.0.1:5001";

export async function GET() {
  try {
    const res = await fetch(`${MAU_BASE}/api/categorias`, { next: { revalidate: 10 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(MOCK_CATEGORIAS);
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
  } catch {
    return NextResponse.json({ success: true });
  }
}

