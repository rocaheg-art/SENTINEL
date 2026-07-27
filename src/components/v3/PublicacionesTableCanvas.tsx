"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getPublications, 
  getPublication, 
  updatePublication, 
  getPages, 
  getExportUrl,
  Publication, 
  PublicationDetail, 
  FacebookPage 
} from "@/lib/api";
import { 
  Search, 
  Filter, 
  X, 
  Download, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  ThumbsUp,
  MessageSquare, 
  Share2, 
  Eye, 
  Settings,
  MoreVertical,
  CheckCircle,
  FileSpreadsheet,
  BookOpen,
  Link2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function PublicacionesTableCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams ? searchParams.get("id") : null;

  // Filters State
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sentimiento, setSentimiento] = useState("");
  const [estadoValidacion, setEstadoValidacion] = useState("activo");
  const [severidadMin, setSeveridadMin] = useState<number | "">("");
  const [severidadMax, setSeveridadMax] = useState<number | "">("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [paginaId, setPaginaId] = useState("");
  
  // Paging
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const [total, setTotal] = useState(0);
  
  // Data State
  const [publications, setPublications] = useState<Publication[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail Drawer State
  const [selectedPubId, setSelectedPubId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<PublicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!!initialId);
  const [related, setRelated] = useState<Publication[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Category Override state in Drawer
  const [editingCategory, setEditingCategory] = useState("");
  const [editingSentiment, setEditingSentiment] = useState("");
  const [editingValidation, setEditingValidation] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  // Debouncing search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0); // Reset page on search
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  // Load pages list on mount
  useEffect(() => {
    const loadPages = async () => {
      try {
        const pageList = await getPages();
        setPages(pageList);
      } catch (err) {
        console.error("Error loading pages:", err);
      }
    };
    loadPages();
  }, []);

  // Fetch publications based on active filters and pagination
  useEffect(() => {
    const loadPublications = async () => {
      setLoading(true);
      try {
        const filters = {
          limit,
          offset,
          search: debouncedSearch.trim() || undefined,
          categoria: categoria || undefined,
          sentimiento: sentimiento || undefined,
          estado_validacion: estadoValidacion || undefined,
          severidad_min: severidadMin !== "" ? severidadMin : undefined,
          severidad_max: severidadMax !== "" ? severidadMax : undefined,
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          pagina_id: paginaId || undefined
        };
        const res = await getPublications(filters);
        setPublications(res.data);
        setTotal(res.total);
      } catch (err) {
        console.error("Error loading publications:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPublications();
  }, [offset, debouncedSearch, categoria, sentimiento, estadoValidacion, severidadMin, severidadMax, fechaInicio, fechaFin, paginaId]);

  // Load details, comments, related publications when selectedPubId changes
  useEffect(() => {
    if (!selectedPubId) {
      setDetail(null);
      setRelated([]);
      return;
    }
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const data = await getPublication(selectedPubId);
        setDetail(data);
        setEditingCategory(data.categoria || "");
        setEditingSentiment(data.sentimiento || "");
        setEditingValidation(data.estado_validacion || "activo");

        // Fetch related coverage of the same category
        setLoadingRelated(true);
        try {
          const relData = await getPublications({
            categoria: data.categoria,
            limit: 4
          });
          setRelated(relData.data.filter(p => p.id !== selectedPubId));
        } catch (err) {
          console.error("Error loading related publications:", err);
        } finally {
          setLoadingRelated(false);
        }
      } catch (err) {
        console.error("Error loading publication detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedPubId]);

  // Handle URL ID updates dynamically
  useEffect(() => {
    const urlId = searchParams ? searchParams.get("id") : null;
    if (urlId) {
      setSelectedPubId(urlId);
      setDrawerOpen(true);
    }
  }, [searchParams]);

  // Save manual validation modifications
  const handleSaveChanges = async () => {
    if (!selectedPubId || !detail) return;
    setSavingAction(true);
    try {
      await updatePublication(selectedPubId, {
        categoria: editingCategory,
        sentimiento: editingSentiment,
        estado_validacion: editingValidation
      });
      // Refresh details and list
      const updatedDetail = await getPublication(selectedPubId);
      setDetail(updatedDetail);
      // Update item in local list array to avoid full refetch
      setPublications(prev => prev.map(p => p.id === selectedPubId ? {
        ...p,
        categoria: editingCategory,
        sentimiento: editingSentiment,
        estado_validacion: editingValidation
      } : p));
    } catch (err) {
      console.error("Failed to update publication:", err);
    } finally {
      setSavingAction(false);
    }
  };

  // Helper colors
  const getSeverityBadgeColor = (sev: number) => {
    if (sev >= 4) return "text-critical bg-critical/10 border-critical/20";
    if (sev >= 2.5) return "text-attention bg-attention/10 border-attention/20";
    return "text-accent-blue bg-accent-blue/10 border-accent-blue/20";
  };

  const getSentimentBadgeColor = (sent: string) => {
    if (sent === "positivo") return "bg-ok/10 text-ok border-ok/20";
    if (sent === "negativo") return "bg-critical/10 text-critical border-critical/20";
    return "bg-attention/10 text-attention border-attention/20";
  };

  const formatRelativeTime = (timeStr: string) => {
    if (!timeStr) return "Desconocido";

    // PostgreSQL devuelve fechas sin zona horaria (ej: "2026-07-15T20:00:00")
    // El navegador las interpreta como hora LOCAL, no UTC, haciéndolas parecer 6h en el futuro.
    // Forzamos UTC añadiendo 'Z' si no tiene sufijo de zona horaria.
    const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(timeStr)
      ? timeStr
      : timeStr.replace(" ", "T") + "Z";

    const date = new Date(normalized);
    if (isNaN(date.getTime())) return "Fecha inválida";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMs < 0) return "Hace un momento";
    if (diffMins < 1) return "Hace un momento";
    if (diffMins === 1) return "Hace 1 minuto";
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours === 1) return "Hace 1 hora";
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return "Hace 1 día";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffWeeks === 1) return "Hace 1 semana";
    if (diffWeeks < 5) return `Hace ${diffWeeks} semanas`;
    if (diffMonths === 1) return "Hace 1 mes";
    if (diffMonths < 12) return `Hace ${diffMonths} meses`;
    return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  };



  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count++;
    if (categoria) count++;
    if (sentimiento) count++;
    if (estadoValidacion !== "activo") count++;
    if (severidadMin !== "") count++;
    if (severidadMax !== "") count++;
    if (fechaInicio) count++;
    if (fechaFin) count++;
    if (paginaId) count++;
    return count;
  }, [debouncedSearch, categoria, sentimiento, estadoValidacion, severidadMin, severidadMax, fechaInicio, fechaFin, paginaId]);

  const clearAllFilters = () => {
    setSearch("");
    setCategoria("");
    setSentimiento("");
    setEstadoValidacion("activo");
    setSeveridadMin("");
    setSeveridadMax("");
    setFechaInicio("");
    setFechaFin("");
    setPaginaId("");
    setOffset(0);
  };

  const handleExport = () => {
    const url = getExportUrl({
      search: debouncedSearch || undefined,
      categoria: categoria || undefined,
      sentimiento: sentimiento || undefined,
      estado_validacion: estadoValidacion || undefined,
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined
    }, "xlsx");
    window.open(url, "_blank");
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const CATEGORIES = [
    "delito", "politica", "comunidad", "accidente", "clima", 
    "inundacion", "bloqueo", "salud", "noticia_local"
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground select-none font-sans">
      
      {/* Main List Area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto min-w-0">
        
        {/* Header section */}
        <div className="flex items-center justify-between border-b border-card-border pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">Explorador</h1>
            <p className="text-xs text-text-muted mt-1">Explora, filtra, valida y analiza la ingesta de noticias del estado en tiempo real.</p>
          </div>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-card-bg hover:bg-card-border/20 border border-card-border rounded-xl text-foreground font-bold flex items-center gap-2 cursor-pointer transition-all text-xs"
          >
            <Download className="w-4 h-4 text-accent-blue" />
            Exportar Registros
          </button>
        </div>

        {/* Filters Bento Box */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por contenido, autor o tema..."
                className="w-full bg-background border border-card-border rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:border-accent-blue placeholder:text-text-muted"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoria}
                onChange={(e) => { setCategoria(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none focus:border-accent-blue capitalize"
              >
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            {/* Sentiment Filter */}
            <div>
              <select
                value={sentimiento}
                onChange={(e) => { setSentimiento(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none focus:border-accent-blue"
              >
                <option value="">Todos los sentimientos</option>
                <option value="positivo">Positivo</option>
                <option value="negativo">Negativo</option>
                <option value="neutral">Neutral</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            
            {/* Validation State Filter */}
            <div>
              <select
                value={estadoValidacion}
                onChange={(e) => { setEstadoValidacion(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none focus:border-accent-blue"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo (Oculto)</option>
                <option value="revisado">Revisado (Validado)</option>
              </select>
            </div>

            {/* Page / Source Filter */}
            <div>
              <select
                value={paginaId}
                onChange={(e) => { setPaginaId(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none focus:border-accent-blue capitalize"
              >
                <option value="">Todos los medios</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.nombre}</option>
                ))}
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => { setFechaInicio(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none"
              />
              <span className="text-text-muted text-xs font-bold">-</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => { setFechaFin(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-card-border rounded-xl py-2 px-3 text-xs font-bold text-foreground focus:outline-none"
              />
            </div>

          </div>

          {/* Active Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-card-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mr-1">Filtros Activos:</span>
                {debouncedSearch && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    Búsqueda: {debouncedSearch}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} />
                  </span>
                )}
                {categoria && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 capitalize">
                    Categoría: {categoria.replace("_", " ")}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoria("")} />
                  </span>
                )}
                {sentimiento && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 capitalize">
                    Sentimiento: {sentimiento}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSentimiento("")} />
                  </span>
                )}
                {estadoValidacion !== "activo" && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 capitalize">
                    Estado: {estadoValidacion}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setEstadoValidacion("activo")} />
                  </span>
                )}
                {paginaId && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    Medio: {pages.find(p => p.id.toString() === paginaId.toString())?.nombre || paginaId}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setPaginaId("")} />
                  </span>
                )}
                {(fechaInicio || fechaFin) && (
                  <span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    Período: {fechaInicio || "Inicio"} - {fechaFin || "Fin"}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => { setFechaInicio(""); setFechaFin(""); }} />
                  </span>
                )}
              </div>
              <button 
                onClick={clearAllFilters}
                className="text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                Limpiar todo
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Table view list */}
        <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center font-sans text-xs text-text-muted gap-3">
              <span className="w-5 h-5 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
              <span>Consultando base de publicaciones en tiempo real...</span>
            </div>
          ) : publications.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-muted italic">
              No se encontraron publicaciones con las condiciones de filtrado seleccionadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border text-[10px] font-bold uppercase tracking-wider text-text-muted bg-background/50 select-none">
                    <th className="py-3.5 px-4 w-[8%] text-center">SEV</th>
                    <th className="py-3.5 px-4 w-[18%]">Página / Autor</th>
                    <th className="py-3.5 px-4 w-[15%]">Categoría</th>
                    <th className="py-3.5 px-4">Contenido</th>
                    <th className="py-3.5 px-4 w-[12%] text-right">Engagement</th>
                    <th className="py-3.5 px-4 w-[12%]">Publicación</th>
                    <th className="py-3.5 px-4 w-[10%] text-center">Sentimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-xs selection:bg-accent-blue/15">
                  {publications.map((pub) => (
                    <tr
                      key={pub.id}
                      onClick={() => { setSelectedPubId(pub.id); setDrawerOpen(true); }}
                      className={`hover:bg-card-border/10 cursor-pointer transition-colors group ${
                        selectedPubId === pub.id ? "bg-card-border/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border font-mono ${getSeverityBadgeColor(pub.severidad)}`}>
                          {pub.severidad}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-accent-blue transition-colors truncate max-w-[170px]">
                        {pub.pagina_nombre || pub.autor}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-accent-blue bg-accent-blue/5 border border-accent-blue/10 px-2 py-0.5 rounded-lg capitalize">
                          {pub.categoria.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-muted truncate max-w-[350px] group-hover:text-foreground transition-colors font-medium">
                        {pub.contenido}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-foreground font-bold">
                        {pub.engagement_total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-text-muted font-medium">
                        {formatRelativeTime(pub.fecha_publicacion || pub.fecha_registro)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-mono ${getSentimentBadgeColor(pub.sentimiento)}`}>
                          {pub.sentimiento || "neutral"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-card-border pt-4 select-none">
          <p className="text-[10px] font-mono text-text-muted font-bold">
            Mostrando registros <strong className="text-foreground">{offset + 1}</strong> - <strong className="text-foreground">{Math.min(offset + limit, total)}</strong> de <strong className="text-foreground">{total}</strong>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-1.5 bg-card-bg hover:bg-card-border/20 border border-card-border rounded-xl text-text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-card-bg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-mono font-bold text-text-muted">
              Pág. {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-1.5 bg-card-bg hover:bg-card-border/20 border border-card-border rounded-xl text-text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-card-bg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

           {/* Sliding Detail Drawer Panel */}
      {drawerOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fadeIn"
            onClick={() => { setSelectedPubId(null); setDrawerOpen(false); }}
          ></div>
          <aside className="fixed top-0 right-0 bottom-0 w-[490px] bg-card-bg border-l border-card-border rounded-l-[32px] shadow-2xl z-50 flex flex-col animate-slideRight select-none">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-card-border flex items-center justify-between bg-card-bg shrink-0 rounded-tl-[32px]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-blue" />
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Lector Detallado
                </span>
              </div>
              <button
                onClick={() => { setSelectedPubId(null); setDrawerOpen(false); }}
                className="p-1.5 hover:bg-card-border/40 rounded-xl text-text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {loadingDetail || !detail ? (
                <div className="h-full flex flex-col items-center justify-center font-sans text-xs text-text-muted gap-3">
                  <span className="w-4 h-4 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                  <span>Analizando registro de interés...</span>
                </div>
              ) : (
                <>
                  {/* General Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase font-bold ${getSentimentBadgeColor(detail.sentimiento)}`}>
                          {detail.sentimiento || "neutral"}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase font-bold ${getSeverityBadgeColor(detail.severidad)}`}>
                          Severidad: {detail.severidad}
                        </span>
                      </div>
                      {detail.enlace && (
                        <a
                          href={detail.enlace}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] font-bold text-accent-blue hover:underline flex items-center gap-1"
                        >
                          Ver en Facebook
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="bg-background p-5 border border-card-border rounded-3xl shadow-sm min-h-[120px] max-h-[220px] overflow-y-auto">
                      <p className="text-xs text-foreground leading-relaxed select-text selection:bg-accent-blue/15 whitespace-pre-wrap">
                        {detail.contenido}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Meta Info */}
                      <div className="space-y-1.5 text-[10.5px] bg-background/40 p-4 border border-card-border rounded-3xl font-bold">
                        <div>
                          <p className="text-[7.5px] uppercase text-text-muted tracking-wider">Página / Autor</p>
                          <p className="text-foreground truncate">{detail.pagina_nombre || detail.autor}</p>
                        </div>
                        <div>
                          <p className="text-[7.5px] uppercase text-text-muted tracking-wider">Publicación</p>
                          <p className="text-foreground truncate">{detail.fecha_publicacion || detail.fecha_registro}</p>
                        </div>
                      </div>

                      {/* Reactions */}
                      <div className="grid grid-cols-3 gap-1 bg-background/40 p-4 border border-card-border rounded-3xl text-center items-center">
                        <div className="flex flex-col justify-center">
                          <span className="text-[7.5px] font-bold text-text-muted uppercase">Likes</span>
                          <span className="text-xs font-extrabold text-foreground mt-0.5">{detail.me_gusta || 0}</span>
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[7.5px] font-bold text-text-muted uppercase">Comments</span>
                          <span className="text-xs font-extrabold text-foreground mt-0.5">{detail.comentarios_count || 0}</span>
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-[7.5px] font-bold text-text-muted uppercase">Shares</span>
                          <span className="text-xs font-extrabold text-foreground mt-0.5">{detail.compartidos || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exploración Completa Action Button (Ahora al final de la nota) */}
                  <button 
                    onClick={() => router.push(`/publicaciones/${detail.id}`)}
                    className="w-full py-3.5 bg-gradient-to-r from-accent-blue to-indigo-600 hover:from-accent-blue/90 hover:to-indigo-600/90 text-white rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer shadow-lg hover:shadow-accent-blue/20 flex items-center justify-center gap-2 border border-accent-blue/20"
                  >
                    <Settings className="w-4 h-4" />
                    Ver Hilo de Correlación Completo
                  </button>

                  {/* Related Coverage (Limited to 2 items max) */}
                  {related.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-accent-blue" />
                        <span className="text-[9px] font-bold text-text-muted uppercase font-mono tracking-wider">Cobertura de Medios</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {related.slice(0, 2).map(rel => (
                          <div 
                            key={rel.id}
                            onClick={() => setSelectedPubId(rel.id)}
                            className="p-3 bg-background hover:bg-card-border/10 border border-card-border rounded-2xl cursor-pointer transition-colors space-y-0.5"
                          >
                            <div className="flex justify-between items-center text-[7.5px] font-mono text-text-muted">
                              <span className="font-bold text-foreground truncate max-w-[80px]">{rel.pagina_nombre}</span>
                              <span>{formatRelativeTime(rel.fecha_publicacion || rel.fecha_registro)}</span>
                            </div>
                            <p className="text-[9.5px] text-text-muted leading-relaxed line-clamp-1 italic">
                              "{rel.contenido}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analytical Controls */}
                  <div className="space-y-3 pt-3 border-t border-card-border">
                    <div className="space-y-3 bg-background p-4 border border-card-border rounded-3xl shadow-sm">
                      <span className="text-[9px] font-bold text-text-muted uppercase font-mono tracking-wider">Acciones de Validación</span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] font-bold text-text-muted uppercase tracking-wide mb-1 font-sans">
                            Estado
                          </label>
                          <select
                            value={editingValidation}
                            onChange={(e) => setEditingValidation(e.target.value)}
                            className="w-full bg-card-bg border border-card-border rounded-xl py-1 px-2 text-[10px] text-foreground focus:outline-none"
                          >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Ocultar</option>
                            <option value="revisado">Validado</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-text-muted uppercase tracking-wide mb-1 font-sans">
                            Categoría
                          </label>
                          <select
                            value={editingCategory}
                            onChange={(e) => setEditingCategory(e.target.value)}
                            className="w-full bg-card-bg border border-card-border rounded-xl py-1 px-2 text-[10px] text-foreground focus:outline-none capitalize"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-text-muted uppercase tracking-wide mb-1 font-sans">
                            Sentimiento
                          </label>
                          <select
                            value={editingSentiment}
                            onChange={(e) => setEditingSentiment(e.target.value)}
                            className="w-full bg-card-bg border border-card-border rounded-xl py-1 px-2 text-[10px] text-foreground focus:outline-none"
                          >
                            <option value="positivo">positivo</option>
                            <option value="negativo">negativo</option>
                            <option value="neutral">neutral</option>
                            <option value="mixto">mixto</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveChanges}
                        disabled={savingAction}
                        className="w-full py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white rounded-xl text-[10.5px] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
                      >
                        {savingAction ? (
                          <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Guardar Cambios
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </aside>
        </>
      )}

    </div>
  );
}
