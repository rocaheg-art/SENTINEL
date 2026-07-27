"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert, TrendingUp, TrendingDown, Minus,
  Flame, AlertTriangle, Eye, Radio,
  Users, Globe, Activity, Zap,
  RefreshCw, ChevronRight, ExternalLink,
  BarChart3, MessageCircle, Hash,
  MapPin, Clock, ArrowUpRight, ArrowDownRight,
  Siren, Target, Brain, Waves
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Alerta {
  id: string;
  contenido: string;
  categoria: string;
  severidad: number;
  sentimiento: string;
  engagement_total: number;
  fecha_publicacion: string;
  pagina_nombre: string;
  factores_severidad?: string;
}

interface RadarCategoria {
  categoria: string;
  total: number;
  engagement: number;
  severidad_promedio: number;
  negativos: number;
  es_alerta: boolean;
}

interface SentimientoData {
  [key: string]: { total: number; pct: number };
}

interface VozDominante {
  nombre: string;
  categoria: string;
  url_facebook: string;
  publicaciones: number;
  engagement_total: number;
  severidad_promedio: number;
  negativos: number;
  positivos: number;
}

interface TendenciaDia {
  dia: string;
  publicaciones: number;
  engagement: number;
  negativos: number;
  alertas: number;
  severidad_promedio: number;
}

interface Keyword {
  palabra: string;
  frecuencia: number;
}

interface Resumen {
  total_publicaciones: number;
  engagement_total: number;
  severidad_promedio: number;
  alertas_criticas: number;
  total_negativos: number;
  fuentes_activas: number;
  paginas_monitoreadas: number;
  periodo_dias: number;
}

interface IntelData {
  today_reference: string;
  periodo_dias: number;
  resumen: Resumen;
  alertas: Alerta[];
  radar_categorias: RadarCategoria[];
  sentimiento_social: SentimientoData;
  voces_dominantes: VozDominante[];
  tendencia_diaria: TendenciaDia[];
  keywords_trending: Keyword[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("onrender.com") || hostname.includes("vercel.app") || hostname.includes("sentinel-web")) {
      return "https://217.77.2.96";
    }
    return `http://${hostname}:8000`;
  }
  return "http://localhost:8000";
};

const API_BASE = getApiBase();

const CATEGORIA_LABELS: Record<string, string> = {
  homicidio: "Homicidio", violencia: "Violencia", bloqueo: "Bloqueo",
  desaparecido: "Desaparecidos", emergencia: "Emergencia", incendio: "Incendio",
  delito: "Delito", accidente: "Accidente", operativo_policial: "Operativo",
  manifestacion: "Manifestación", gobierno: "Gobierno", politica: "Política",
  trafico: "Tráfico", sin_clasificar: "Sin clasificar", deportes: "Deportes",
  educacion: "Educación", comunidad: "Comunidad", espectaculo: "Espectáculo",
};

const CAT_ICON: Record<string, string> = {
  homicidio: "💀", violencia: "⚔️", bloqueo: "🚧", desaparecido: "🔍",
  emergencia: "🚨", incendio: "🔥", delito: "🚓", accidente: "🚗",
  operativo_policial: "👮", manifestacion: "✊", gobierno: "🏛️",
  politica: "🗳️", trafico: "🚦", educacion: "📚", comunidad: "🏘️",
};

const ALERT_COLOR: Record<string, string> = {
  homicidio: "text-red-400 bg-red-500/10 border-red-500/30",
  violencia: "text-red-400 bg-red-500/10 border-red-500/30",
  desaparecido: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  bloqueo: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  incendio: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  emergencia: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  delito: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  accidente: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  operativo_policial: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

function sevColor(s: number) {
  if (s >= 5) return "text-red-400";
  if (s >= 4) return "text-orange-400";
  if (s >= 3) return "text-yellow-400";
  return "text-text-muted";
}

function sevBg(s: number) {
  if (s >= 5) return "bg-red-500/20 border-red-500/40";
  if (s >= 4) return "bg-orange-500/20 border-orange-500/40";
  if (s >= 3) return "bg-yellow-500/20 border-yellow-500/40";
  return "bg-card-border/20 border-card-border";
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(s: string) {
  if (!s) return "—";
  try {
    // Normalizar a UTC si no tiene zona horaria (viene de PostgreSQL sin 'Z')
    const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(s) ? s : s.replace(" ", "T") + "Z";
    return new Date(normalized).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
}


// ─── Inline mini bar chart ────────────────────────────────────────────────────
function SparkBar({ data, valueKey, colorClass = "bg-accent-blue" }: {
  data: Record<string, number>[];
  valueKey: string;
  colorClass?: string;
}) {
  const values = data.map(d => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {values.slice(-20).map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          className={`w-1.5 ${colorClass} rounded-t-sm opacity-70 hover:opacity-100 transition-opacity`}
          title={String(v)}
        />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function IntelPage() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dias, setDias] = useState(30);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Get auth token
  useEffect(() => {
    const stored = localStorage.getItem("sentinel_token") ||
      sessionStorage.getItem("sentinel_token");
    if (stored) setToken(stored);
    else {
      // try to auto-login
      fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "sentinel2026" })
      }).then(r => r.json()).then(d => {
        if (d.access_token) {
          sessionStorage.setItem("sentinel_token", d.access_token);
          setToken(d.access_token);
        }
      }).catch(() => setError("No se pudo autenticar con el backend"));
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/inteligencia?dias=${dias}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [token, dias]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived computed ──────────────────────────────────────────────────────
  const sentTotal = data ? Object.values(data.sentimiento_social).reduce((a, b) => a + b.total, 0) : 0;
  const sentNeg = data?.sentimiento_social?.negativo?.pct || 0;
  const sentPos = data?.sentimiento_social?.positivo?.pct || 0;
  const moodScore = Math.round(sentPos - sentNeg); // -100 to +100

  const alertCats = data?.radar_categorias.filter(c => c.es_alerta) || [];
  const maxAlertTotal = Math.max(...alertCats.map(c => c.total), 1);

  const topKeywords = data?.keywords_trending.slice(0, 25) || [];
  const maxKwFreq = Math.max(...topKeywords.map(k => k.frecuencia), 1);

  const tendencia = data?.tendencia_diaria || [];

  // ── Estado operativo ──────────────────────────────────────────────────────
  const nivelAlerta = (data?.resumen.alertas_criticas || 0) > 20 ? "CRÍTICO"
    : (data?.resumen.alertas_criticas || 0) > 5 ? "ELEVADO"
    : (data?.resumen.alertas_criticas || 0) > 0 ? "MODERADO"
    : "NORMAL";
  const nivelColor = nivelAlerta === "CRÍTICO" ? "text-red-400 bg-red-500/10 border-red-500/30"
    : nivelAlerta === "ELEVADO" ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
    : nivelAlerta === "MODERADO" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
    : "text-ok bg-ok/10 border-ok/30";

  if (!token && !loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-critical mx-auto" />
        <p className="text-sm font-bold">Sin autenticación</p>
        <p className="text-xs text-text-muted">Accede primero desde el dashboard principal</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold">
          Ir al inicio
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-card-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-foreground tracking-tight">
              SENTINEL · Centro de Inteligencia de Estado
            </h1>
            <p className="text-[9px] text-text-muted font-mono uppercase tracking-widest">
              Querétaro · {data?.today_reference || "—"} · {data?.resumen.paginas_monitoreadas || 0} fuentes activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Nivel de alerta */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-wider ${nivelColor}`}>
            <Siren className="w-3 h-3 animate-pulse" />
            NIVEL {nivelAlerta}
          </div>
          {/* Período */}
          <select
            value={dias}
            onChange={e => setDias(Number(e.target.value))}
            className="bg-card-bg border border-card-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none cursor-pointer"
          >
            <option value={0}>Hoy</option>
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="w-8 h-8 rounded-xl border border-card-border flex items-center justify-center text-text-muted hover:text-foreground hover:bg-card-border/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {lastUpdate && (
            <span className="text-[9px] text-text-muted font-mono">
              {lastUpdate.toLocaleTimeString("es-MX")}
            </span>
          )}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {error && (
          <div className="bg-critical/10 border border-critical/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-critical shrink-0" />
            <p className="text-xs font-bold text-critical">{error}</p>
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
            <p className="text-xs text-text-muted">Analizando {dias === 0 ? "los datos de hoy" : `${dias} días de datos`}...</p>
          </div>
        )}

        {data && (
          <>
            {/* ─── ROW 1: KPIs ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Publicaciones", value: fmtNum(data.resumen.total_publicaciones), icon: Globe, color: "text-accent-blue", sub: dias === 0 ? "hoy" : `últimos ${dias}d` },
                { label: "Engagement", value: fmtNum(data.resumen.engagement_total), icon: Waves, color: "text-purple-400", sub: "interacciones totales" },
                { label: "Alertas críticas", value: String(data.resumen.alertas_criticas), icon: Flame, color: "text-red-400", sub: "severidad ≥ 4" },
                { label: "Tono negativo", value: `${sentNeg}%`, icon: TrendingDown, color: "text-orange-400", sub: "del período" },
                { label: "Fuentes monitoreadas", value: String(data.resumen.fuentes_activas), icon: Radio, color: "text-ok", sub: "activas en período" },
                { label: "Severidad media", value: String(data.resumen.severidad_promedio), icon: Target, color: "text-attention", sub: "escala 0–10" },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-card-bg border border-card-border rounded-2xl p-4 space-y-2">
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                    <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                    <div>
                      <p className="text-[10px] font-bold text-foreground">{kpi.label}</p>
                      <p className="text-[9px] text-text-muted">{kpi.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── ROW 2: Estado de ánimo + Tendencia ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Termómetro social */}
              <div className="lg:col-span-3 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    Estado de ánimo social
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">Sentimiento de la ciudadanía</p>
                </div>

                {/* Mood score */}
                <div className="text-center py-2">
                  <div className={`text-4xl font-black ${moodScore > 10 ? "text-ok" : moodScore < -10 ? "text-critical" : "text-attention"}`}>
                    {moodScore > 0 ? "+" : ""}{moodScore}
                  </div>
                  <p className="text-[9px] text-text-muted mt-1">
                    {moodScore > 20 ? "Clima social favorable" : moodScore > 0 ? "Clima moderado" : moodScore > -20 ? "Tensión social" : "Alta conflictividad"}
                  </p>
                </div>

                {/* Sentiment bars */}
                <div className="space-y-2.5">
                  {[
                    { key: "positivo", label: "Positivo", color: "bg-ok" },
                    { key: "neutral", label: "Neutral", color: "bg-accent-blue" },
                    { key: "negativo", label: "Negativo", color: "bg-critical" },
                  ].map(s => {
                    const d = data.sentimiento_social[s.key];
                    const pct = d?.pct || 0;
                    return (
                      <div key={s.key}>
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-text-muted font-semibold">{s.label}</span>
                          <span className="font-black text-foreground">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-card-border rounded-full overflow-hidden">
                          <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-card-border">
                  <p className="text-[9px] text-text-muted">
                    Total analizado: <span className="font-bold text-foreground">{fmtNum(sentTotal)}</span> publicaciones
                  </p>
                </div>
              </div>

              {/* Tendencia diaria */}
              <div className="lg:col-span-9 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent-blue" />
                      Actividad diaria del estado
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5">Publicaciones · Negatividad · Alertas de seguridad</p>
                  </div>
                </div>

                {/* SVG Chart */}
                {tendencia.length > 0 && (
                  <div className="relative h-36">
                    <svg viewBox={`0 0 ${tendencia.length * 18} 100`} className="w-full h-full" preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map(y => (
                        <line key={y} x1={0} y1={y} x2={tendencia.length * 18} y2={y}
                          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                      ))}

                      {(() => {
                        const maxPubs = Math.max(...tendencia.map(d => d.publicaciones), 1);
                        const maxEng = Math.max(...tendencia.map(d => d.engagement), 1);

                        // Engagement area
                        const engPts = tendencia.map((d, i) => `${i * 18 + 9},${100 - (d.engagement / maxEng) * 90}`).join(" ");
                        const engArea = `M 0,100 ${tendencia.map((d, i) => `L ${i * 18 + 9},${100 - (d.engagement / maxEng) * 90}`).join(" ")} L ${(tendencia.length - 1) * 18 + 9},100 Z`;

                        // Pubs line
                        const pubsPts = tendencia.map((d, i) => `${i * 18 + 9},${100 - (d.publicaciones / maxPubs) * 90}`).join(" ");

                        return (
                          <>
                            <path d={engArea} fill="rgba(88,166,255,0.08)" />
                            <polyline points={engPts} fill="none" stroke="rgba(88,166,255,0.5)" strokeWidth="1" />
                            <polyline points={pubsPts} fill="none" stroke="rgba(63,185,80,0.8)" strokeWidth="1.5" />

                            {/* Alert spikes */}
                            {tendencia.map((d, i) => d.alertas > 0 && (
                              <rect key={i}
                                x={i * 18 + 6}
                                y={100 - (d.alertas / Math.max(...tendencia.map(x => x.alertas), 1)) * 80}
                                width="6"
                                height={(d.alertas / Math.max(...tendencia.map(x => x.alertas), 1)) * 80}
                                fill="rgba(248,81,73,0.5)"
                                rx="1"
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Legend */}
                    <div className="absolute bottom-0 right-0 flex items-center gap-4 text-[9px] text-text-muted">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-ok inline-block rounded" />Publicaciones</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-blue/50 inline-block rounded" />Engagement</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-critical/50 inline-block rounded-sm" />Alertas</span>
                    </div>
                  </div>
                )}

                {/* Summary row */}
                <div className="grid grid-cols-4 gap-3 pt-2 border-t border-card-border">
                  {[
                    { label: "Día más activo", value: tendencia.length > 0 ? tendencia.reduce((a, b) => a.publicaciones > b.publicaciones ? a : b).dia : "—" },
                    { label: "Pico de alertas", value: tendencia.length > 0 ? String(Math.max(...tendencia.map(d => d.alertas))) : "0" },
                    { label: "Mayor negatividad", value: tendencia.length > 0 ? `${tendencia.reduce((a, b) => a.negativos > b.negativos ? a : b).dia}` : "—" },
                    { label: "Tendencia 7d", value: tendencia.length >= 7 ? (() => {
                        const last7 = tendencia.slice(-7).reduce((a, b) => a + b.negativos, 0);
                        const prev7 = tendencia.slice(-14, -7).reduce((a, b) => a + b.negativos, 0);
                        const diff = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
                        return diff > 0 ? `↑${diff}%` : diff < 0 ? `↓${Math.abs(diff)}%` : "Estable";
                      })() : "—" },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[9px] text-text-muted">{s.label}</p>
                      <p className="text-xs font-black text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── ROW 3: Alertas activas + Radar ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Alertas activas */}
              <div className="lg:col-span-7 bg-card-bg border border-card-border rounded-[28px] overflow-hidden">
                <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Siren className="w-4 h-4 text-red-400 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Alertas activas — últimas 48h</p>
                      <p className="text-[9px] text-text-muted">Publicaciones con severidad ≥ 4, ordenadas por impacto</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md">
                    {data.alertas.length} activas
                  </span>
                </div>

                {data.alertas.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-ok/10 border border-ok/20 flex items-center justify-center mx-auto mb-2">
                      <ShieldAlert className="w-5 h-5 text-ok" />
                    </div>
                    <p className="text-xs font-bold text-foreground">Sin alertas críticas</p>
                    <p className="text-[10px] text-text-muted mt-1">No se detectaron eventos de alta severidad en las últimas 48h</p>
                  </div>
                ) : (
                  <div className="divide-y divide-card-border max-h-80 overflow-y-auto">
                    {data.alertas.slice(0, 10).map(a => (
                      <div key={a.id} className="px-5 py-3.5 hover:bg-card-border/10 transition-colors">
                        <div className="flex items-start gap-3">
                          {/* Severity badge */}
                          <div className={`shrink-0 w-9 h-9 rounded-xl border flex flex-col items-center justify-center ${sevBg(a.severidad)}`}>
                            <span className={`text-xs font-black ${sevColor(a.severidad)}`}>{a.severidad}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${ALERT_COLOR[a.categoria] || "text-text-muted border-card-border bg-card-border/20"}`}>
                                {CAT_ICON[a.categoria] || "📌"} {CATEGORIA_LABELS[a.categoria] || a.categoria}
                              </span>
                              <span className="text-[9px] text-text-muted">{a.pagina_nombre}</span>
                              <span className="text-[9px] text-text-muted ml-auto">{fmtDate(a.fecha_publicacion)}</span>
                            </div>
                            <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">{a.contenido}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[9px] text-text-muted">
                              <span className="flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />{fmtNum(a.engagement_total)} engagement
                              </span>
                              {a.sentimiento === "negativo" && (
                                <span className="text-critical flex items-center gap-1">
                                  <TrendingDown className="w-2.5 h-2.5" /> Negativo
                                </span>
                              )}
                            </div>
                          </div>
                          <Link
                            href={`/publicaciones/${a.id}`}
                            className="shrink-0 w-7 h-7 rounded-lg bg-card-border/20 border border-card-border flex items-center justify-center text-text-muted hover:text-accent-blue hover:border-accent-blue/30 transition-all"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Radar de riesgo */}
              <div className="lg:col-span-5 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-3">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    Radar de riesgo por categoría
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">Volumen de eventos en el período</p>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {alertCats.slice(0, 10).map(c => {
                    const pct = Math.round((c.total / maxAlertTotal) * 100);
                    const colors = ALERT_COLOR[c.categoria];
                    return (
                      <div key={c.categoria} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-4">{CAT_ICON[c.categoria] || "⚠️"}</span>
                          <span className="text-[10px] text-text-muted flex-1">{CATEGORIA_LABELS[c.categoria] || c.categoria}</span>
                          <span className="text-[9px] font-black text-foreground">{c.total}</span>
                          <span className="text-[9px] text-text-muted w-12 text-right">sev {c.severidad_promedio}</span>
                        </div>
                        <div className="h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              c.categoria === "homicidio" || c.categoria === "violencia" ? "bg-red-500" :
                              c.categoria === "incendio" || c.categoria === "desaparecido" ? "bg-orange-500" :
                              c.categoria === "bloqueo" || c.categoria === "accidente" ? "bg-yellow-500" :
                              "bg-accent-blue"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 border-t border-card-border">
                  <Link href="/severidad" className="text-[9px] text-accent-blue hover:text-accent-blue/80 flex items-center gap-1 font-bold">
                    Ver análisis completo de severidad <ArrowUpRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>

            </div>

            {/* ─── ROW 4: Voces dominantes + Keywords ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Voces dominantes */}
              <div className="lg:col-span-7 bg-card-bg border border-card-border rounded-[28px] overflow-hidden">
                <div className="px-5 py-4 border-b border-card-border">
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Voces con mayor influencia
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">Fuentes que más impacto generan en la opinión pública</p>
                </div>
                <div className="divide-y divide-card-border">
                  {data.voces_dominantes.slice(0, 8).map((v, i) => {
                    const negPct = v.publicaciones > 0 ? Math.round((v.negativos / v.publicaciones) * 100) : 0;
                    return (
                      <div key={v.nombre} className="px-5 py-3 flex items-center gap-3 hover:bg-card-border/10 transition-colors">
                        <span className="text-[10px] font-black text-text-muted w-5 shrink-0">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a href={v.url_facebook} target="_blank" rel="noreferrer"
                              className="text-xs font-bold text-foreground hover:text-accent-blue truncate flex items-center gap-1 transition-colors">
                              {v.nombre}
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[9px] text-text-muted">{v.publicaciones} pubs</span>
                            <span className="text-[9px] text-purple-400 font-bold">{fmtNum(v.engagement_total)} eng</span>
                            {negPct > 40 && (
                              <span className="text-[9px] text-critical">⚠ {negPct}% neg</span>
                            )}
                          </div>
                        </div>
                        {/* Engagement bar */}
                        <div className="w-20 shrink-0">
                          <div className="h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, (v.engagement_total / (data.voces_dominantes[0]?.engagement_total || 1)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[8px] text-text-muted mt-0.5 text-right">sev {v.severidad_promedio}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-5 py-3 border-t border-card-border">
                  <Link href="/paginas" className="text-[9px] text-accent-blue hover:text-accent-blue/80 flex items-center gap-1 font-bold">
                    Análisis completo de páginas <ArrowUpRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>

              {/* Keywords en trending */}
              <div className="lg:col-span-5 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4 text-attention" />
                    Temas en tendencia
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">Palabras clave en contenido negativo y de alta severidad</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topKeywords.map(kw => {
                    const size = 0.75 + (kw.frecuencia / maxKwFreq) * 0.6;
                    const opacity = 0.5 + (kw.frecuencia / maxKwFreq) * 0.5;
                    return (
                      <span
                        key={kw.palabra}
                        style={{ fontSize: `${size * 11}px`, opacity }}
                        className="px-2 py-1 bg-attention/10 border border-attention/20 rounded-lg font-bold text-attention cursor-default hover:bg-attention/20 transition-colors"
                        title={`${kw.frecuencia} ocurrencias`}
                      >
                        {kw.palabra}
                      </span>
                    );
                  })}
                </div>
                <div className="pt-3 border-t border-card-border">
                  <Link href="/sentimiento" className="text-[9px] text-accent-blue hover:text-accent-blue/80 flex items-center gap-1 font-bold">
                    Análisis de sentimiento completo <ArrowUpRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>

            </div>

            {/* ─── ROW 5: Tabla exploratoria de radar completo ──────────── */}
            <div className="bg-card-bg border border-card-border rounded-[28px] overflow-hidden">
              <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent-blue" />
                    Mapa completo de categorías
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5">Todas las categorías detectadas — ordenadas por volumen</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-card-border">
                      {["Categoría", "Publicaciones", "Engagement", "Tono negativo", "Severidad prom.", "¿Alerta?"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border/50">
                    {data.radar_categorias.map(c => {
                      const negPct = c.total > 0 ? Math.round((c.negativos / c.total) * 100) : 0;
                      return (
                        <tr key={c.categoria} className={`hover:bg-card-border/10 transition-colors ${c.es_alerta ? "bg-red-500/5" : ""}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span>{CAT_ICON[c.categoria] || "📌"}</span>
                              <span className="font-semibold text-foreground">{CATEGORIA_LABELS[c.categoria] || c.categoria}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-foreground">{c.total.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-purple-400 font-bold">{fmtNum(Number(c.engagement))}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                                <div className="h-full bg-critical rounded-full" style={{ width: `${negPct}%` }} />
                              </div>
                              <span className={`text-[9px] font-bold ${negPct > 50 ? "text-critical" : negPct > 25 ? "text-attention" : "text-text-muted"}`}>
                                {negPct}%
                              </span>
                            </div>
                          </td>
                          <td className={`px-4 py-2.5 font-black ${sevColor(Number(c.severidad_promedio))}`}>
                            {c.severidad_promedio}
                          </td>
                          <td className="px-4 py-2.5">
                            {c.es_alerta ? (
                              <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-bold">⚠ ALERTA</span>
                            ) : (
                              <span className="text-[8px] text-text-muted">Normal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
