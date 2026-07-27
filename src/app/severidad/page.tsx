"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  getSeverity, 
  getPublication, 
  updatePublication, 
  SeverityResponse, 
  PublicationDetail 
} from "@/lib/api";
import { 
  AlertTriangle, 
  Calendar, 
  RefreshCw,
  TrendingUp,
  X,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Share2,
  CheckCircle,
  Eye,
  CornerUpRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  ScatterChart, Scatter, ZAxis,
  LineChart, Line, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";

export default function SeveridadPage() {
  const router = useRouter();
  
  // Filters
  const [categoria, setCategoria] = useState("");
  const [severidadMin, setSeveridadMin] = useState<number | "">("");
  const [severidadMax, setSeveridadMax] = useState<number | "">("");
  
  // Data
  const [data, setData] = useState<SeverityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Sorting table
  const [sortField, setSortField] = useState<"severidad" | "engagement" | "fecha">("severidad");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Drawer
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState("");
  const [editingSentiment, setEditingSentiment] = useState("");
  const [editingValidation, setEditingValidation] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadSeverityData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const filters = {
        categoria: categoria || undefined,
        severidad_min: severidadMin !== "" ? Number(severidadMin) : undefined,
        severidad_max: severidadMax !== "" ? Number(severidadMax) : undefined
      };
      const res = await getSeverity(filters);
      setData(res);
    } catch (err) {
      console.error("Error loading severity data:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadSeverityData();
  }, [categoria, severidadMin, severidadMax]);

  // Drawer detail fetcher
  useEffect(() => {
    if (!selectedPubId) {
      setDetail(null);
      setDrawerOpen(false);
      return;
    }

    const loadDetail = async () => {
      setLoadingDetail(true);
      setDrawerOpen(true);
      try {
        const res = await getPublication(selectedPubId);
        setDetail(res);
        setEditingCategory(res.categoria);
        setEditingSentiment(res.sentimiento);
        setEditingValidation(res.estado_validacion);
      } catch (err) {
        console.error("Error loading publication detail:", err);
        setSelectedPubId(null);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedPubId]);

  const handleUpdatePublication = async () => {
    if (!selectedPubId || !detail) return;
    setSavingAction(true);
    try {
      await updatePublication(selectedPubId, {
        categoria: editingCategory,
        sentimiento: editingSentiment,
        estado_validacion: editingValidation
      });
      loadSeverityData(false);
      const updated = await getPublication(selectedPubId);
      setDetail(updated);
    } catch (err) {
      console.error("Error updating publication details:", err);
    } finally {
      setSavingAction(false);
    }
  };

  const handleQuickMarkReviewed = async (pubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updatePublication(pubId, { estado_validacion: "revisado" });
      loadSeverityData(false);
    } catch (err) {
      console.error("Error setting validation state:", err);
    }
  };

  // Sort critical list
  const sortedCritical = useMemo(() => {
    if (!data) return [];
    let list = [...data.criticas];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === "fecha") {
        valA = new Date(a.fecha).getTime();
        valB = new Date(b.fecha).getTime();
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [data, sortField, sortDirection]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d0d0d] font-mono text-xs text-gray-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span>Compilando alertas de severidad y criticidad...</span>
      </div>
    );
  }

  // Categories list
  const CATEGORIES = ["delito", "politica", "comunidad", "accidente", "clima", "inundacion", "bloqueo", "salud", "noticia_local"];

  // Custom Scatter Tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-[#141414] border border-[#2b2b2b] p-3 rounded-lg text-xs space-y-1 font-sans">
          <p className="font-bold text-white">{p.pagina_nombre}</p>
          <p className="text-gray-400 truncate max-w-[200px]">{p.contenido}</p>
          <p className="text-gray-500 font-mono">
            SEV: <strong className="text-red-400">{p.severidad}</strong> | Eng: <strong className="text-white">{p.engagement}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  const getSeverityBadgeColor = (sev: number) => {
    if (sev <= 3) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (sev <= 6) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const getSentimentColor = (sent: string | null) => {
    const s = sent?.toUpperCase();
    if (s === "POSITIVO") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (s === "NEGATIVO") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-zinc-400 bg-zinc-800 border-zinc-700";
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      
      {/* Main Panel */}
      <div className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">MONITOREO DE CRITICIDAD Y RIESGO</h1>
            <p className="text-xs text-gray-400 mt-1">Detección de brotes de crisis mediáticas e incidentes de severidad alta.</p>
          </div>
          <button
            onClick={() => loadSeverityData()}
            className="p-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Top Severity KPIs Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
          <div className="card-intelligence p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500">SEV Alta (Últimas 24h)</p>
              <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
                {data.kpis.severidad_alta_24h}
              </p>
            </div>
          </div>

          <div className="card-intelligence p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500">SEV Alta (Últimas 72h)</p>
              <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
                {data.kpis.severidad_alta_72h}
              </p>
            </div>
          </div>

          <div className="card-intelligence p-5 flex flex-col justify-between text-xs">
            <span className="text-[10px] font-bold uppercase text-gray-500">Mayor Severidad Semanal (Últimos 7 días)</span>
            {data.kpis.maxima_7dias ? (
              <div 
                onClick={() => setSelectedPubId(data.kpis.maxima_7dias!.id)}
                className="mt-2 group cursor-pointer"
              >
                <div className="flex justify-between font-bold text-red-400">
                  <span className="truncate max-w-[120px]">{data.kpis.maxima_7dias.pagina_nombre}</span>
                  <span className="font-mono">SEV: {data.kpis.maxima_7dias.severidad}</span>
                </div>
                <p className="text-gray-400 mt-1 italic group-hover:text-white truncate">
                  "{data.kpis.maxima_7dias.contenido}"
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic mt-2">Sin registros de severidad alta en la semana.</p>
            )}
          </div>
        </div>

        {/* 2. Scatter Plot: Severity vs Time */}
        <div className="card-intelligence p-5 flex flex-col h-[320px] select-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Dispersión de Alertas Críticas</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">Eje X: Tiempo | Eje Y: Severidad (0-10) | Tamaño: Engagement</p>
            </div>

            {/* Category Selector */}
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg text-xs font-bold text-gray-300 py-1 px-2.5 focus:outline-none focus:border-blue-500 capitalize"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-h-0">
            {mounted && data.scatter.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="fecha" 
                    type="category"
                    stroke="#4b5563" 
                    fontSize={8} 
                    tickFormatter={(val) => val ? val.slice(5, 10) : ""}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    dataKey="severidad" 
                    type="number"
                    domain={[0, 10]} 
                    stroke="#4b5563" 
                    fontSize={8} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <ZAxis 
                    dataKey="engagement" 
                    range={[20, 200]} 
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  <Scatter 
                    name="Severity Alert" 
                    data={data.scatter} 
                    fill="#ef4444"
                    onClick={(node: any) => setSelectedPubId(node.id)}
                    className="cursor-pointer"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] font-mono text-gray-500">Sin datos de alertas para graficar.</div>
            )}
          </div>
        </div>

        {/* 3. Table of Active Critical Publications (severidad >= 6) */}
        <div className="card-intelligence p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
            Bandeja de Publicaciones Críticas Activas (SEV &ge; 6)
          </h2>

          <div className="overflow-x-auto border border-[#1f1f1f] rounded-xl select-none">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-[#141414] border-b border-[#1f1f1f] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4 text-center cursor-pointer hover:text-white" onClick={() => { setSortField("severidad"); setSortDirection(sortDirection === "asc" ? "desc" : "asc"); }}>
                    SEV
                  </th>
                  <th className="py-3 px-4">Página</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Contenido</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-white" onClick={() => { setSortField("engagement"); setSortDirection(sortDirection === "asc" ? "desc" : "asc"); }}>
                    Engagement
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => { setSortField("fecha"); setSortDirection(sortDirection === "asc" ? "desc" : "asc"); }}>
                    Fecha
                  </th>
                  <th className="py-3 px-4">Factores</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {sortedCritical.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-xs text-gray-500 italic">
                      Sin registros críticos pendientes de validación.
                    </td>
                  </tr>
                ) : (
                  sortedCritical.map((pub) => (
                    <tr
                      key={pub.id}
                      onClick={() => setSelectedPubId(pub.id)}
                      className="hover:bg-[#181818] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border font-mono ${getSeverityBadgeColor(pub.severidad)}`}>
                          {pub.severidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-bold max-w-[120px] truncate">{pub.pagina_nombre}</td>
                      <td className="py-3 px-4 text-blue-400 capitalize">{pub.categoria}</td>
                      <td className="py-3 px-4 text-gray-400 truncate max-w-[200px] group-hover:text-gray-250 transition-colors">
                        {pub.contenido}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-350">{pub.engagement.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono">{pub.fecha ? pub.fecha.slice(0, 10) : "--"}</td>
                      <td className="py-3 px-4 text-[10px] text-gray-500 italic truncate max-w-[150px]">{pub.factores_severidad || "--"}</td>
                      
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleQuickMarkReviewed(pub.id, e)}
                            className="p-1 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 text-emerald-500 rounded-lg cursor-pointer transition-colors"
                            title="Validar / Marcar Revisada"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedPubId(pub.id)}
                            className="p-1 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 text-blue-500 rounded-lg cursor-pointer transition-colors"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. History 90 Days Line Chart */}
        <div className="card-intelligence p-5 flex flex-col h-[280px] select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Tendencia de Severidad del Ecosistema (90 días)
          </h2>
          <div className="flex-1 min-h-0">
            {mounted && data.historial.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.historial} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis 
                    dataKey="fecha" 
                    stroke="#4b5563" 
                    fontSize={8} 
                    tickFormatter={(val) => val ? val.slice(5) : ""}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis stroke="#4b5563" fontSize={8} />
                  <Tooltip contentStyle={{ background: "#141414", border: "1px solid #2b2b2b", fontSize: "10px" }} />
                  <Line type="monotone" dataKey="severidad_promedio" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] font-mono text-gray-500">Sin datos de tendencia históricos</div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Right Drawer detailed view */}
      {drawerOpen && (
        <div className="w-[500px] border-l border-[#1f1f1f] bg-[#141414] h-full flex flex-col z-20 shrink-0 shadow-2xl animate-slideInRight select-none">
          
          <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between bg-[#181818]">
            <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
              Análisis de Alerta Crítica
            </span>
            <button
              onClick={() => setSelectedPubId(null)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {loadingDetail || !detail ? (
              <div className="h-full flex flex-col items-center justify-center font-mono text-xs text-gray-500 gap-3">
                <span className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span>Extrayendo factores de riesgo...</span>
              </div>
            ) : (
              <>
                {/* Content */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 font-mono">
                    <span>Incidente</span>
                    {detail.enlace && (
                      <a href={detail.enlace} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1">
                        Facebook
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="bg-[#0d0d0d] p-4 border border-[#1f1f1f] rounded-xl">
                    <p className="text-xs text-gray-250 leading-relaxed whitespace-pre-wrap">{detail.contenido}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#0d0d0d]/40 p-3.5 border border-[#1f1f1f] rounded-xl font-medium">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Página de Origen</p>
                      <p className="text-white font-bold mt-0.5 truncate">{detail.pagina_nombre}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Fecha de Registro</p>
                      <p className="text-gray-300 mt-0.5">{detail.fecha_registro}</p>
                    </div>
                  </div>
                </div>

                {/* Severity Thermostat */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Severidad & Criticidad</span>
                  
                  <div className="bg-[#0d0d0d] p-4 border border-[#1f1f1f] rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                      <span>Nivel de Criticidad:</span>
                      <strong className="text-white font-mono">{detail.severidad} / 10</strong>
                    </div>
                    <div className="w-full bg-zinc-850 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="bg-red-500 h-full rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        style={{ width: `${detail.severidad * 10}%` }}
                      />
                    </div>
                    {detail.factores_severidad && (
                      <div className="pt-2 text-[10px] text-gray-400 font-medium">
                        <p className="font-bold text-gray-500 uppercase tracking-wider">Factores de Riesgo Parseados (JSON):</p>
                        <p className="mt-1 leading-relaxed italic">{detail.factores_severidad}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Engagement */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Engagement Relacionado</span>
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-bold">
                    <div className="bg-[#0d0d0d] border border-[#1f1f1f] p-2.5 rounded-xl">
                      <p className="text-[9px] font-bold uppercase text-gray-500">Likes</p>
                      <p className="text-sm font-bold text-white mt-1 font-mono">{detail.me_gusta}</p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1f1f1f] p-2.5 rounded-xl">
                      <p className="text-[9px] font-bold uppercase text-gray-500">Comentarios</p>
                      <p className="text-sm font-bold text-white mt-1 font-mono">{detail.comentarios_count}</p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1f1f1f] p-2.5 rounded-xl">
                      <p className="text-[9px] font-bold uppercase text-gray-500">Shares</p>
                      <p className="text-sm font-bold text-white mt-1 font-mono">{detail.compartidos}</p>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Comentarios Recientes</span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {detail.comments.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No hay comentarios capturados.</p>
                    ) : (
                      detail.comments.map((c) => (
                        <div key={c.id} className="p-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-300">{c.autor || "Anónimo"}</span>
                            <span className={`text-[8px] font-bold uppercase px-1 rounded border font-mono ${getSentimentColor(c.sentimiento)}`}>
                              {c.sentimiento || "neutral"}
                            </span>
                          </div>
                          <p className="text-gray-400 font-medium">{c.contenido}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="space-y-3 border-t border-[#1f1f1f] pt-5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider">Acciones Resolutivas</span>
                  
                  <div className="space-y-3 bg-[#0d0d0d] border border-[#1f1f1f] p-4 rounded-xl text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 font-sans">
                        Estado de Revisión
                      </label>
                      <select
                        value={editingValidation}
                        onChange={(e) => setEditingValidation(e.target.value)}
                        className="w-full bg-[#141414] border border-[#2b2b2b] rounded-lg py-1.5 px-3.5 text-xs text-white focus:outline-none"
                      >
                        <option value="activo">Activo (Alerta Roja)</option>
                        <option value="inactivo">Inactivo (Archivar/Ocultar)</option>
                        <option value="revisado">Revisado (Validado/Cerrado)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleUpdatePublication}
                      disabled={savingAction}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      {savingAction ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aplicar Estado
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
