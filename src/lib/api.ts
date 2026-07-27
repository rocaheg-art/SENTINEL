const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Replica local connection behavior on Vercel:
    // If accessing remotely via sentinel-web-bay.vercel.app, it dynamically resolves
    // to the visitor's relative hostname or fallback ip at port 8000.
    if (hostname.includes("vercel.app") || hostname.includes("sentinel-web")) {
      // Connect to the public domain or tunnel at port 8000
      return `http://${hostname}:8000`;
    }
    return `http://${hostname}:8000`;
  }
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();

// Helper for JWT authentication headers
export function getAuthHeaders(): HeadersInit {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sentinel_token");
    if (token) {
      return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
    }
  }
  return {
    "Content-Type": "application/json"
  };
}

// Interfaces
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface KPIItem {
  valor: number;
  cambio: number;
}

export interface OverviewResponse {
  today_reference: string;
  kpis: {
    publicaciones: KPIItem;
    engagement: KPIItem;
    severidad: KPIItem;
    descartes: KPIItem;
    ciclos: KPIItem;
  };
  feed: {
    id: string;
    contenido: string;
    categoria: string;
    severidad: number;
    engagement: number;
  }[];
  alerts: {
    id: string;
    contenido: string;
    pagina_nombre: string;
    severidad: number;
    engagement: number;
  }[];
  system_status: {
    workers_activos: number;
    ultimo_ciclo: string | null;
    paginas_monitoreadas: number;
    db_type?: string;
  };
}

export interface Publication {
  id: string;
  id_facebook: string;
  enlace: string;
  pagina_id: number;
  pagina_nombre: string;
  autor: string;
  contenido: string;
  categoria: string;
  sentimiento: string;
  severidad: number;
  engagement_total: number;
  fecha_publicacion: string | null;
  fecha_registro: string;
  estado_validacion: string;
  sentimiento_comentarios: string;
}

export interface PaginatedPublications {
  total: number;
  offset: number;
  limit: number;
  data: Publication[];
}

export interface Snapshot {
  id: string;
  capturado_en: string;
  engagement_total: number;
  me_gusta: number;
  comentarios: number;
  compartidos: number;
}

export interface PublicationDetail extends Publication {
  me_gusta: number;
  comentarios_count: number;
  compartidos: number;
  reacciones: number;
  reacciones_desglose: {
    me_gusta: number;
    me_encanta: number;
    me_importa: number;
    me_divierte: number;
    me_enoja: number;
    me_entristece: number;
    me_asombra: number;
  };
  fecha_actualizacion: string;
  total_comentarios_analizados: number;
  comentarios_positivos: number;
  comentarios_negativos: number;
  comentarios_neutros: number;
  factores_severidad: string | null;
  worker_id: string | null;
  comments: {
    id: string;
    autor: string | null;
    contenido: string;
    sentimiento: string | null;
    fecha: string;
  }[];
  images: {
    id: string;
    url: string;
    orden: number;
  }[];
  snapshots: Snapshot[];
}

export interface PageMetrics {
  total_publicaciones: number;
  engagement_promedio: number;
  severidad_promedio: number;
  porcentaje_negativo: number;
}

export interface FacebookPage {
  id: string;
  nombre: string;
  url_facebook: string;
  url_web: string | null;
  categoria: string | null;
  activa: number;
  metricas: PageMetrics;
}

export interface PageDetailResponse extends FacebookPage {
  graficas: {
    publicaciones_por_dia: { dia: string; count: number }[];
    evolucion_engagement: { dia: string; engagement: number }[];
    distribucion_sentimiento: Record<string, number>;
  };
  recientes: {
    id: string;
    contenido: string;
    severidad: number;
    engagement: number;
    sentimiento: string;
    fecha: string;
  }[];
  ciclos: {
    id: string;
    worker_id: string;
    modo: string;
    estado: string;
    inicio: string;
    fin: string | null;
  }[];
}

export interface SentimentResponse {
  proporciones: Record<string, number>;
  evolucion: {
    fecha: string;
    positivo: number;
    negativo: number;
    neutral: number;
  }[];
  matriz: {
    categoria: string;
    valores: Record<string, number>;
  }[];
  comentarios_negativos: {
    id: string;
    autor: string | null;
    contenido: string;
    fecha: string;
    publicacion_id: string;
  }[];
  frecuencia_palabras: {
    word: string;
    count: number;
  }[];
}

export interface SeverityResponse {
  kpis: {
    severidad_alta_24h: number;
    severidad_alta_72h: number;
    maxima_7dias: {
      id: string;
      severidad: number;
      pagina_nombre: string;
      contenido: string;
    } | null;
  };
  scatter: {
    id: string;
    fecha: string;
    severidad: number;
    engagement: number;
    pagina_nombre: string;
    contenido: string;
  }[];
  criticas: {
    id: string;
    severidad: number;
    pagina_nombre: string;
    categoria: string;
    contenido: string;
    engagement: number;
    fecha: string;
    factores_severidad: string | null;
  }[];
  historial: {
    fecha: string;
    severidad_promedio: number;
  }[];
}

export interface DescarteItem {
  id: string;
  run_id: string | null;
  worker_id: string;
  ciclo_id: number | null;
  pagina_id: number | null;
  contenido_preview: string | null;
  categoria: string | null;
  estado_validacion: string;
  motivos: string;
  severidad: number | null;
  enlace: string | null;
  id_facebook: string | null;
  creado_en: string;
}

export interface DescartesResponse {
  kpis: {
    total: number;
    pendientes: number;
    confirmados: number;
    recuperados: number;
  };
  total: number;
  offset: number;
  limit: number;
  data: DescarteItem[];
}

export interface WorkerSystemStats {
  worker_id: string;
  total_ciclos: number;
  ciclos_hoy: number;
  ultimo_estado: string;
  paginas_asignadas: string[];
  duracion_promedio_segundos: number;
  ultimas_metricas: Record<string, any>;
  ultimo_ciclo_inicio: string | null;
  ultimo_ciclo_fin: string | null;
}

export interface CycleItem {
  id: string;
  run_id: string;
  worker_id: string;
  modo: string;
  estado: string;
  paginas_asignadas: string[];
  inicio: string;
  fin: string | null;
  duracion_segundos: number | null;
  metricas: Record<string, any>;
  detalle: string | null;
}

export interface StagingItem {
  archivo: string;
  worker_id: string;
  run_id: string | null;
  ciclo_id: number | null;
  procesado_en: string;
  lineas: number | null;
}

export interface MetricaDiariaItem {
  fecha: string;
  categoria: string;
  total_publicaciones: number;
  total_me_gusta: number;
  total_reacciones: number;
  total_comentarios: number;
  total_compartidos: number;
  severidad_promedio: number;
  severidad_maxima: number;
  total_comentarios_analizados: number;
  comentarios_positivos: number;
  comentarios_negativos: number;
  comentarios_neutros: number;
}

export interface GeneratedReport {
  id: string;
  tipo: string;
  rango: string;
  filtros: Record<string, any>;
  estado: string;
  creado_en: string;
  archivo_generado: string;
}

// API Functions
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("sentinel_token");
        window.dispatchEvent(new Event("sentinel_auth_failed"));
      }
    }
    const errorText = await res.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      parsedError = { detail: errorText || "Unknown API Error" };
    }
    throw new Error(parsedError.detail || `HTTP Error ${res.status}`);
  }
  return res.json();
}

export async function login(payload: Record<string, string>): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse<LoginResponse>(res);
}

export async function getOverview(): Promise<OverviewResponse> {
  const res = await fetch(`${API_BASE_URL}/api/overview`, {
    headers: getAuthHeaders()
  });
  return handleResponse<OverviewResponse>(res);
}

export interface PublicationFilters {
  search?: string;
  categoria?: string;
  sentimiento?: string;
  estado_validacion?: string;
  severidad_min?: number;
  severidad_max?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  pagina_id?: string;
  offset?: number;
  limit?: number;
}

export async function getPublications(filters: PublicationFilters): Promise<PaginatedPublications> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.append(key, val.toString());
    }
  });
  const res = await fetch(`${API_BASE_URL}/api/publicaciones?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<PaginatedPublications>(res);
}

export async function getPublication(pubId: string): Promise<PublicationDetail> {
  const res = await fetch(`${API_BASE_URL}/api/publicaciones/${pubId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<PublicationDetail>(res);
}

export async function updatePublication(pubId: string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/publicaciones/${pubId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse<any>(res);
}

export function getExportUrl(filters: PublicationFilters, format: "csv" | "xlsx"): string {
  const params = new URLSearchParams();
  params.append("format", format);
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.append(key, val.toString());
    }
  });
  return `${API_BASE_URL}/api/publicaciones/export?${params.toString()}`;
}

export async function getPages(): Promise<FacebookPage[]> {
  const res = await fetch(`${API_BASE_URL}/api/paginas`, {
    headers: getAuthHeaders()
  });
  return handleResponse<FacebookPage[]>(res);
}

export async function getPageDetail(pageId: string): Promise<PageDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/api/paginas/${pageId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<PageDetailResponse>(res);
}

export async function updatePageActiva(pageId: string, activa: number): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/paginas/${pageId}/activa`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ activa })
  });
  return handleResponse<any>(res);
}

export async function getSentiment(filters: { fecha_inicio?: string; fecha_fin?: string; categoria?: string }): Promise<SentimentResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${API_BASE_URL}/api/sentimiento?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<SentimentResponse>(res);
}

export async function getSeverity(filters: { categoria?: string; severidad_min?: number; severidad_max?: number }): Promise<SeverityResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.append(key, val.toString());
    }
  });
  const res = await fetch(`${API_BASE_URL}/api/severidad?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<SeverityResponse>(res);
}

export interface DescarteFilters {
  estado_validacion?: string;
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  worker_id?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export async function getDescartes(filters: DescarteFilters): Promise<DescartesResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.append(key, val.toString());
    }
  });
  const res = await fetch(`${API_BASE_URL}/api/descartes?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<DescartesResponse>(res);
}

export async function updateDescarteStatus(descarteId: string, estado_validacion: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/descartes/${descarteId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ estado_validacion })
  });
  return handleResponse<any>(res);
}

export async function recuperarDescarte(descarteId: string, payload: { categoria: string; sentimiento: string }): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/descartes/${descarteId}/recuperar`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse<any>(res);
}

export async function batchProcessDescartes(payload: { ids: string[]; action: "confirm" | "recover"; categoria?: string; sentimiento?: string }): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/descartes/batch`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse<any>(res);
}

export async function getSistemaWorkers(): Promise<WorkerSystemStats[]> {
  const res = await fetch(`${API_BASE_URL}/api/sistema/workers`, {
    headers: getAuthHeaders()
  });
  return handleResponse<WorkerSystemStats[]>(res);
}

export interface CycleFilters {
  worker_id?: string;
  estado?: string;
  modo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  offset?: number;
  limit?: number;
}

export async function getSistemaCiclos(filters: CycleFilters): Promise<{ total: number; offset: number; limit: number; data: CycleItem[] }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.append(key, val.toString());
    }
  });
  const res = await fetch(`${API_BASE_URL}/api/sistema/ciclos?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<{ total: number; offset: number; limit: number; data: CycleItem[] }>(res);
}

export async function getSistemaStaging(): Promise<StagingItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/sistema/staging`, {
    headers: getAuthHeaders()
  });
  return handleResponse<StagingItem[]>(res);
}

export async function getMetricasDiarias(filters: { fecha_inicio?: string; fecha_fin?: string; categoria?: string }): Promise<MetricaDiariaItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${API_BASE_URL}/api/metricas-diarias?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<MetricaDiariaItem[]>(res);
}

export async function generarReporte(payload: { tipo: string; rango: string; filtros?: Record<string, any> }): Promise<GeneratedReport> {
  const res = await fetch(`${API_BASE_URL}/api/reportes/generar`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse<GeneratedReport>(res);
}

export function getReportDownloadUrl(reportId: string, format: "pdf" | "xlsx"): string {
  const token = typeof window !== "undefined" ? localStorage.getItem("sentinel_token") : "";
  return `${API_BASE_URL}/api/reportes/${reportId}/descargar?format=${format}&token=${token}`;
}

export interface ObservatorioInsight {
  id: number;
  categoria: string;
  dato: string;
  texto: string;
  color_borde: string;
}

export interface ObservatorioTimelineEvent {
  id: number;
  tipo: string;
  tamanio: string;
  dia: number;
  fecha: string;
  hora: string;
  titulo: string;
  descripcion: string;
  sentimiento: string;
  volumen: number;
}

export interface ObservatorioResponse {
  semana: number;
  rango_fechas: string;
  titular: string;
  kpis: {
    total_publicaciones: number;
    fuentes_activas: number;
    temas_identificados: number;
    progreso_semana: number;
  };
  frases_insights: ObservatorioInsight[];
  estadisticos: {
    pulso_semanal: number[];
    distribucion_fuentes: {
      valores: Record<string, number>;
      otros: number;
    };
    temperatura_editorial: {
      valor: number;
      direccion: "up" | "down";
      delta: number;
    };
    hora_pico: number[];
    tema_dominante: {
      nombre: string;
      porcentaje: number;
    };
  };
  timeline: ObservatorioTimelineEvent[];
  ranking_medios: {
    posicion: number;
    nombre: string;
    publicaciones: number;
    porcentaje_relativo: number;
    delta: "up" | "down" | "same";
    delta_valor: number;
  }[];
  ranking_temas: {
    posicion: number;
    nombre: string;
    publicaciones: number;
    sparkline: number[];
  }[];
  dates_list: string[];
  numero_semana: {
    valor: number;
    explicacion: string;
  };
  ubicaciones: {
    nombre: string;
    lat: number;
    lng: number;
    publicaciones: number;
    sentimiento_predominante: string;
    severidad_promedio: number;
  }[];
  publicaciones: {
    id: string;
    autor: string;
    categoria: string;
    sentimiento: string;
    severidad: number;
    engagement: number;
    fecha: string;
    contenido: string;
    ubicacion?: string;
  }[];
}

export async function getObservatorio(semana: number): Promise<ObservatorioResponse> {
  const res = await fetch(`${API_BASE_URL}/api/observatorio?semana=${semana}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<ObservatorioResponse>(res);
}

export interface AlertItem {
  id: string;
  tipo: 'volumen' | 'tendencia' | 'sentimiento' | 'aparicion' | 'divergencia' | 'coocurrencia';
  severidad: 'critico' | 'atencion' | 'informativo';
  descripcion: string;
  fecha_deteccion: string;
  hace_cuanto: string;
  entidad_tipo: 'tema' | 'medio' | 'persona';
  entidad_nombre: string;
  valor_actual: number;
  valor_historico: number;
}

export async function getAlerts(filters: {
  volumen_sens?: number;
  sentimiento_sens?: number;
  speed_sens?: number;
  divergencia_sens?: number;
}): Promise<AlertItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      params.append(key, val.toString());
    }
  });
  const res = await fetch(`${API_BASE_URL}/api/alerts?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<AlertItem[]>(res);
}

export interface EventItem {
  id: string;
  categoria: string;
  titulo: string;
  ubicacion: string;
  estado: string;
  severidad_max: number;
  first_seen_at: string;
  last_seen_at: string;
  post_count: number;
  fuentes_count: number;
  paginas_ids: string;
  enlaces: string;
  creado_en: string;
  actualizado_en: string;
  ultimo_ciclo_id: number;
}

export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  message: string;
  pending_files: number;
  error_count: number;
  total_files: number;
}

export interface EventDetails {
  event: EventItem;
  publications: any[];
  snapshots: any[];
  entities: any[];
  hashtags: any[];
}

export async function getEventos(): Promise<EventItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/eventos`, {
    headers: getAuthHeaders()
  });
  return handleResponse<EventItem[]>(res);
}

export async function getPipelineHealth(): Promise<PipelineHealth> {
  const res = await fetch(`${API_BASE_URL}/api/sistema/health`, {
    headers: getAuthHeaders()
  });
  return handleResponse<PipelineHealth>(res);
}

export async function getEventDetails(eventId: string): Promise<EventDetails> {
  const res = await fetch(`${API_BASE_URL}/api/eventos/${eventId}/details`, {
    headers: getAuthHeaders()
  });
  return handleResponse<EventDetails>(res);
}

