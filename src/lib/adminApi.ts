// Client-side library for the Administración section (SENTINEL MAU 2 integration)
// These functions call the Next.js API routes that proxy to the Flask SENTINEL MAU 2 app.

export interface Fuente {
  id: number;
  nombre: string;
  url_facebook: string;
  url_web?: string | null;
  municipio?: string | null;
  estado?: string | null;
  pais?: string | null;
  tipo_fuente?: string | null;
  enlace_valido?: number | string;
  pagina_activa?: number | string;
  duplicado?: number | string;
  estado_validacion?: string;
  categoria_raiz?: string | null;
  subcategoria?: string | null;
  tipo_especifico?: string | null;
  agregado_por?: string | null;
  creado_en?: string | null;
  categoria_id?: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  id_padre?: number | null;
  nivel: number;
}

export interface AdminDashboard {
  total_fuentes: number;
  total_categorias: number;
  total_usuarios: number;
  por_categoria: { nombre: string; total: number }[];
  ultimos: Fuente[];
  por_usuario: { nombre: string; total: number }[];
}

export interface AdminApiError {
  error: string;
  message?: string;
}

const ADMIN_BASE = "/api/admin";

async function handleRes<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `Error ${res.status}`);
  return data as T;
}

export async function adminGetFuentes(q?: string): Promise<{ fuentes: Fuente[]; total: number } | AdminApiError> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`${ADMIN_BASE}/fuentes${params}`);
  return res.json();
}

export async function adminCreateFuente(payload: Partial<Fuente>): Promise<{ success: boolean; id?: number } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/fuentes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function adminUpdateFuente(id: number, payload: Partial<Fuente>): Promise<{ success: boolean } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/fuentes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function adminDeleteFuente(id: number): Promise<{ success: boolean } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/fuentes/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function adminGetCategorias(): Promise<{ nivel1: Categoria[]; nivel2: Categoria[]; nivel3: Categoria[] } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/categorias`);
  return res.json();
}

export async function adminGetDashboard(): Promise<AdminDashboard | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/dashboard`);
  return res.json();
}

export async function adminCreateCategoria(payload: { nombre: string; nivel: number; id_padre?: number | null; descripcion?: string; palabras_clave?: string }): Promise<{ success: boolean; codigo?: string } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/categorias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function adminUpdateCategoria(id: number, payload: { nombre: string; nivel: number; id_padre?: number | null; descripcion?: string; palabras_clave?: string }): Promise<{ success: boolean; codigo?: string } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/categorias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function adminDeleteCategoria(id: number): Promise<{ success: boolean; message?: string } | AdminApiError> {
  const res = await fetch(`${ADMIN_BASE}/categorias/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export function isAdminError(res: unknown): res is AdminApiError {
  return typeof res === "object" && res !== null && "error" in res;
}
