import { NextRequest, NextResponse } from "next/server";

// VPS Backend URL (HTTP is fine here since server-to-server calls bypass Chrome Mixed Content block)
const VPS_BACKEND = "http://217.77.2.96";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

export async function DELETE(req: NextRequest) {
  return handleProxy(req);
}

export async function PATCH(req: NextRequest) {
  return handleProxy(req);
}

async function handleProxy(req: NextRequest) {
  // Extract path following /api/vps-proxy (e.g. /api/auth/login)
  const { pathname, search } = req.nextUrl;
  const path = pathname.replace(/^\/api\/vps-proxy/, "");
  
  // El VPS corre Nginx en el puerto 80 para redirigir peticiones a la API.
  const targetUrl = `http://217.77.2.96/api${path}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Avoid passing host and other standard headers that might break the request
    if (!["host", "connection", "referer", "origin"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  let body: any = null;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      body = await req.text();
    } catch {
      // Body is empty or couldn't be parsed
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store"
    });

    const data = await response.text();
    
    // Set headers to pass down status and content-type correctly
    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "vps_error", message: error.message || "Error communicating with the backend VPS." },
      { status: 502 }
    );
  }
}
