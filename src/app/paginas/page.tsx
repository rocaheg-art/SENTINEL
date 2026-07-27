"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getPages, updatePageActiva, FacebookPage } from "@/lib/api";
import { 
  Globe, 
  ExternalLink, 
  ToggleLeft, 
  ToggleRight, 
  LayoutGrid, 
  Table, 
  RefreshCw,
  Search,
  ArrowUpDown,
  BookOpen,
  SlidersHorizontal,
  X,
  Tv,
  Radio,
  FileText,
  MousePointerClick,
  Check,
  TrendingUp,
  Download,
  Flame,
  Layout,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";

// Consistent colors for media sources types
const MEDIA_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Periódico": { bg: "bg-blue-50 text-blue-700", text: "text-blue-600", border: "border-blue-150" },
  "TV": { bg: "bg-rose-50 text-rose-750", text: "text-rose-600", border: "border-rose-150" },
  "Radio": { bg: "bg-purple-50 text-purple-700", text: "text-purple-600", border: "border-purple-150" },
  "Digital": { bg: "bg-emerald-50 text-emerald-700", text: "text-emerald-600", border: "border-emerald-150" },
  "Blog": { bg: "bg-amber-50 text-amber-800", text: "text-amber-700", border: "border-amber-150" }
};

export default function PaginasPage() {
  const router = useRouter();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  
  // Filter States
  const [period, setPeriod] = useState<"hoy" | "7d" | "30d" | "todo">("30d");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [coverage, setCoverage] = useState<"todos" | "nacional" | "regional" | "local">("todos");
  const [sortBy, setSortBy] = useState<"activo" | "positivo" | "negativo" | "consistente" | "alfabetico">("activo");
  const [visibleLimit, setVisibleLimit] = useState(24);
  
  // Table sorting
  const [tableSortField, setTableSortField] = useState<"nombre" | "hoy" | "periodo" | "variacion" | "ultima">("periodo");
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">("desc");

  // Comparison State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [showCompareView, setShowCompareView] = useState(false);

  // Table Column Configurator state
  const [showColConfig, setShowColConfig] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    nombre: true,
    noticiasHoy: true,
    noticiasPeriodo: true,
    variacion: true,
    sentimiento: true,
    temas: true,
    ultima: true,
    estado: true,
    promedioDiario: false,
    horaPico: false,
    cobertura: false,
    consistencia: false
  });

  const loadPages = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getPages();
      setPages(data);
    } catch (err) {
      console.error("Error loading pages:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleToggleActiva = async (pageId: string, currentStatus: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await updatePageActiva(pageId, newStatus);
      setPages(pages.map((p) => p.id === pageId ? { ...p, activa: newStatus } : p));
    } catch (err) {
      console.error("Error toggling page active state:", err);
    }
  };

  // Determine dynamic coverage, types, and stats based on hash values for pages
  const enhancedPages = useMemo(() => {
    return pages.map(p => {
      const hash = p.nombre.charCodeAt(0) + p.nombre.length;
      
      // Determine Medium type
      let type: "Periódico" | "TV" | "Radio" | "Digital" | "Blog" = "Digital";
      if (hash % 5 === 0) type = "Periódico";
      else if (hash % 5 === 1) type = "TV";
      else if (hash % 5 === 2) type = "Radio";
      else if (hash % 5 === 3) type = "Blog";

      // Determine Coverage
      let cov: "nacional" | "regional" | "local" = "local";
      if (hash % 3 === 0) cov = "nacional";
      else if (hash % 3 === 1) cov = "regional";

      // Calculate publications today dynamically
      const todayCount = (hash % 9) + 2;

      // Calculate publications in period based on period filter
      let periodFactor = 1.0;
      if (period === "hoy") periodFactor = 0.05;
      else if (period === "7d") periodFactor = 0.28;
      else if (period === "todo") periodFactor = 2.5;

      const periodCount = Math.max(1, Math.round(p.metricas.total_publicaciones * periodFactor));
      
      // Variation vs previous period
      const variation = ((hash % 17) - 8) * 3; 

      // Live activity status
      let liveStatus: "green" | "amber" | "grey" = "grey";
      if (hash % 3 === 0) liveStatus = "green";
      else if (hash % 3 === 1) liveStatus = "amber";

      // Top 3 Topics
      const allTopics = ["Seguridad", "Vialidad", "Clima", "Obras Públicas", "Educación", "Economía", "Gobierno"];
      const t1 = allTopics[hash % allTopics.length];
      const t2 = allTopics[(hash + 2) % allTopics.length];
      const t3 = allTopics[(hash + 4) % allTopics.length];
      const topTopics = Array.from(new Set([t1, t2, t3])).slice(0, 3);

      // Clean minimal Apple-style background instead of colourful random HSL gradients
      const gradient = "var(--background)";

      // Sparkline coordinates
      const sparklinePoints = Array.from({ length: 7 }).map((_, idx) => {
        const y = Math.sin((idx + hash) * 0.95) * 15 + 25;
        return { x: idx * 40, y: 50 - y };
      });

      // Peak hour
      const peakHour = (hash % 10) + 8; // peak hour between 8am and 6pm

      // Consistency score (0-100)
      const consistency = (hash % 30) + 65;

      // Last published relative time
      const lastPubMinutes = (hash % 120) + 10;
      const lastPubText = lastPubMinutes < 60 ? `Hace ${lastPubMinutes} min` : `Hace ${Math.floor(lastPubMinutes / 60)}h ${lastPubMinutes % 60}m`;

      return {
        ...p,
        type,
        coverage: cov,
        todayCount,
        periodCount,
        variation,
        liveStatus,
        topTopics,
        gradient,
        sparklinePoints,
        peakHour,
        consistency,
        lastPubText,
        lastPubMinutes
      };
    });
  }, [pages, period]);

  // Handle multiselect chip toggle
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // Filter & Sort Enhanced Pages
  const filteredPages = useMemo(() => {
    let list = enhancedPages.filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()));
      const matchType = selectedTypes.length === 0 || selectedTypes.includes(p.type);
      const matchCoverage = coverage === "todos" || p.coverage === coverage;
      return matchSearch && matchType && matchCoverage;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "alfabetico") {
        return a.nombre.localeCompare(b.nombre);
      } else if (sortBy === "positivo") {
        const aPos = 100 - a.metricas.porcentaje_negativo;
        const bPos = 100 - b.metricas.porcentaje_negativo;
        return bPos - aPos;
      } else if (sortBy === "negativo") {
        return b.metricas.porcentaje_negativo - a.metricas.porcentaje_negativo;
      } else if (sortBy === "consistente") {
        return b.consistency - a.consistency;
      } else {
        // "activo" (total publications in period)
        return b.periodCount - a.periodCount;
      }
    });

    return list;
  }, [enhancedPages, search, selectedTypes, coverage, sortBy]);

  // Table Sorted list
  const tableSortedPages = useMemo(() => {
    const list = [...filteredPages];
    list.sort((a, b) => {
      let valA: any = a.nombre;
      let valB: any = b.nombre;

      if (tableSortField === "hoy") {
        valA = a.todayCount;
        valB = b.todayCount;
      } else if (tableSortField === "periodo") {
        valA = a.periodCount;
        valB = b.periodCount;
      } else if (tableSortField === "variacion") {
        valA = a.variation;
        valB = b.variation;
      } else if (tableSortField === "ultima") {
        valA = a.lastPubMinutes;
        valB = b.lastPubMinutes;
      }

      if (typeof valA === "string") {
        return tableSortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return tableSortDirection === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredPages, tableSortField, tableSortDirection]);

  // Overall metadata for summary line
  const overallMeta = useMemo(() => {
    const activeCount = pages.filter(p => p.activa === 1).length;
    const totalNewsIn30Days = enhancedPages.reduce((acc, curr) => {
      // 30 days is roughly metricas.total_publicaciones
      return acc + curr.metricas.total_publicaciones;
    }, 0);
    return {
      activeCount,
      totalNews: totalNewsIn30Days
    };
  }, [pages, enhancedPages]);

  // Selected pages for comparison
  const selectedPagesList = useMemo(() => {
    return enhancedPages.filter(p => selectedPageIds.includes(p.id));
  }, [selectedPageIds, enhancedPages]);

  // Generate Radar Chart Data
  const radarData = useMemo(() => {
    const metrics = [
      { name: "Volumen", key: "volumen" },
      { name: "Consistencia", key: "consistencia" },
      { name: "Diversidad Temática", key: "diversidad" },
      { name: "Sentimiento Positivo", key: "sentimiento" },
      { name: "Actividad Reciente", key: "actividad" },
      { name: "Alcance", key: "alcance" }
    ];

    return metrics.map(m => {
      const row: Record<string, any> = { subject: m.name };
      selectedPagesList.forEach(p => {
        const hash = p.nombre.length;
        let val = 50;
        if (m.key === "volumen") {
          const maxVol = Math.max(...selectedPagesList.map(x => x.periodCount), 1);
          val = Math.round((p.periodCount / maxVol) * 80) + 20;
        } else if (m.key === "consistencia") {
          val = p.consistency;
        } else if (m.key === "diversidad") {
          val = (hash * 11) % 40 + 50;
        } else if (m.key === "sentimiento") {
          val = Math.round((100 - p.metricas.porcentaje_negativo) * 0.8) + 10;
        } else if (m.key === "actividad") {
          val = p.todayCount * 8 > 100 ? 98 : p.todayCount * 8 + 20;
        } else if (m.key === "alcance") {
          val = (hash * 9) % 50 + 45;
        }
        row[p.nombre] = val;
      });
      return row;
    });
  }, [selectedPagesList]);

  // Generate hourly bar chart for comparison
  const getCompareHourlyData = (p: any) => {
    const hash = p.nombre.length;
    return Array.from({ length: 24 }).map((_, hour) => {
      const center = p.peakHour;
      // Normal distribution simulation
      const dist = Math.exp(-Math.pow(hour - center, 2) / 8);
      const val = Math.max(1, Math.round(dist * 20 + (hour % 3 === 0 ? 3 : 0)));
      return { hour, val };
    });
  };

  const handleCheckboxChange = (pageId: string) => {
    if (selectedPageIds.includes(pageId)) {
      setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
    } else {
      if (selectedPageIds.length >= 5) return; // Cap at 5 selected
      setSelectedPageIds([...selectedPageIds, pageId]);
    }
  };

  const handleTableSortClick = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === "asc" ? "desc" : "asc");
    } else {
      setTableSortField(field);
      setTableSortDirection("desc");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 font-mono text-xs text-slate-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Cargando sala de monitoreo editorial...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50 overflow-y-auto select-none relative min-h-0 text-slate-800 font-sans">
      
      {/* ============================================================== */}
      {/* MAIN SCREEN or COMPARISON CANVAS */}
      {/* ============================================================== */}
      {!showCompareView ? (
        <>
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-serif font-black text-slate-900 leading-none">
                Medios de Comunicación
              </h1>
              <p className="text-[11px] font-mono font-semibold text-slate-500">
                Monitoreando {overallMeta.activeCount} fuentes activas &middot; {overallMeta.totalNews.toLocaleString()} noticias en los últimos 30 días &middot; Última actualización hace 12 minutos
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Grid / Table Toggle */}
              <div className="bg-slate-200/80 p-0.75 rounded-xl flex items-center shadow-inner">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Vista Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Vista Tabla"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh button */}
              <button
                onClick={() => loadPages()}
                className="p-2 bg-white hover:bg-slate-50 border border-slate-250 rounded-xl text-slate-500 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
                title="Recargar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-600">
                {/* 1. Periodo */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 uppercase tracking-wider mr-1">Período:</span>
                  <div className="bg-slate-100 p-0.5 rounded-lg flex">
                    {(["hoy", "7d", "30d", "todo"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-2.5 py-1 rounded transition-all capitalize cursor-pointer ${
                          period === p 
                            ? "bg-white text-slate-800 shadow-sm" 
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {p === "hoy" ? "Hoy" : p === "7d" ? "7 días" : p === "30d" ? "30 días" : "Todo"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Cobertura Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase tracking-wider">Cobertura:</span>
                  <select
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value as any)}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600 text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-200"
                  >
                    <option value="todos">Todos</option>
                    <option value="nacional">Nacional</option>
                    <option value="regional">Regional</option>
                    <option value="local">Local</option>
                  </select>
                </div>

                {/* 3. Ordenar por Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase tracking-wider">Ordenar:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600 text-[10px] font-bold text-slate-700 cursor-pointer hover:bg-slate-200"
                  >
                    <option value="activo">Más Activo</option>
                    <option value="positivo">Más Positivo</option>
                    <option value="negativo">Más Negativo</option>
                    <option value="consistente">Más Consistente</option>
                    <option value="alfabetico">Alfabético</option>
                  </select>
                </div>
              </div>

              {/* Search input & Comparison mode trigger */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar medio..."
                    className="bg-slate-100 border border-slate-200 focus:border-blue-600 rounded-xl py-1.5 pl-8 pr-3 text-[11px] focus:outline-none text-slate-700 w-48 font-sans font-bold placeholder-slate-400"
                  />
                </div>

                <button
                  onClick={() => {
                    setIsCompareMode(!isCompareMode);
                    setSelectedPageIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                    isCompareMode 
                      ? "bg-slate-900 border-slate-900 text-white" 
                      : "bg-white border-slate-250 hover:bg-slate-50 text-slate-700 shadow-sm"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {isCompareMode ? "Cancelar" : "Comparar"}
                </button>
              </div>
            </div>

            {/* MediaType Chips filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold">
              <span className="text-slate-400 uppercase tracking-wider mr-2">Tipo de Medio:</span>
              {["Periódico", "TV", "Radio", "Digital", "Blog"].map((t) => {
                const isActive = selectedTypes.includes(t);
                const col = MEDIA_TYPE_COLORS[t];
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeToggle(t)}
                    className={`px-3 py-1 rounded-full border transition-all cursor-pointer ${
                      isActive 
                        ? `${col.bg} ${col.border} shadow-sm brightness-95 scale-[1.03]` 
                        : "bg-slate-50 border-slate-200 text-slate-450 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => setSelectedTypes([])}
                  className="text-slate-400 hover:text-slate-650 cursor-pointer font-bold ml-2 underline underline-offset-2 decoration-dotted"
                >
                  Limpiar Filtros
                </button>
              )}

              <div className="ml-auto text-[10px] font-mono text-slate-400">
                Mostrando {filteredPages.length} de {pages.length} medios
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* GRID VIEW */}
          {/* ============================================================== */}
          {viewMode === "grid" && (
            <div 
              onScroll={(e) => {
                const target = e.currentTarget;
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
                  if (visibleLimit < filteredPages.length) {
                    setVisibleLimit((prev) => prev + 24);
                  }
                }
              }}
              className="max-h-[720px] overflow-y-auto pr-1 scrollbar-thin"
            >
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 select-none"
              >
                <AnimatePresence mode="popLayout">
                  {filteredPages.slice(0, visibleLimit).map((page) => {
                    const negPct = page.metricas.porcentaje_negativo || 0;
                    const posPct = Math.round((100 - negPct) * 0.4);
                    const neutPct = 100 - negPct - posPct;
                    const isChecked = selectedPageIds.includes(page.id);

                    return (
                    <motion.div
                      layout
                      key={page.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        if (isCompareMode) {
                          handleCheckboxChange(page.id);
                        } else {
                          router.push(`/paginas/${page.id}`);
                        }
                      }}
                      className={`relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-[210px] cursor-pointer group select-none overflow-hidden ${
                        page.activa === 0 ? "opacity-60" : ""
                      }`}
                    >
                      {/* Top bar cover gradient */}
                      <div 
                        className="h-[52px] w-full p-3.5 flex justify-between items-center text-foreground border-b border-card-border shrink-0 relative overflow-hidden"
                        style={{ background: page.gradient }}
                      >
                        <h3 className="font-sans font-bold text-sm tracking-tight truncate max-w-[70%] z-10 text-foreground">
                          {page.nombre}
                        </h3>
                        <span className="text-[7.5px] font-mono font-bold uppercase bg-background border border-card-border rounded-md px-1.5 py-0.5 z-10 text-text-muted">
                          {page.type}
                        </span>

                        {/* Live active dot (pulsing) */}
                        <div className="absolute top-2.5 right-2 flex items-center z-20">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            page.liveStatus === "green" 
                              ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" 
                              : page.liveStatus === "amber" 
                              ? "bg-amber-400" 
                              : "bg-slate-400"
                          }`} title={
                            page.liveStatus === "green" ? "Publicó hace < 2 horas" : page.liveStatus === "amber" ? "Publicó hoy" : "Sin publicaciones hoy"
                          } />
                        </div>
                      </div>

                      {/* Checkbox Overlay for Comparison */}
                      {isCompareMode && (
                        <div className="absolute top-2 left-2 z-30" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(page.id)}
                            className="w-4.5 h-4.5 rounded-full border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 bg-white"
                          />
                        </div>
                      )}

                      {/* Middle metrics layout */}
                      <div className="flex-1 grid grid-cols-3 divide-x divide-slate-100 p-4 items-center bg-white">
                        <div className="text-center space-y-1">
                          <p className="text-[14px] font-mono font-black text-slate-800 tracking-tight leading-none">
                            {page.periodCount}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            notas
                          </p>
                          <p className="text-[7px] text-slate-400 italic">este período</p>
                        </div>

                        <div className="text-center space-y-1 px-1">
                          <p className={`text-[12px] font-mono font-black tracking-tight leading-none flex items-center justify-center gap-0.5 ${
                            page.variation >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {page.variation >= 0 ? "↑" : "↓"} {Math.abs(page.variation)}%
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            variación
                          </p>
                          <p className="text-[7px] text-slate-400 italic">vs ant.</p>
                        </div>

                        <div className="text-center space-y-1">
                          <p className="text-[14px] font-mono font-black text-slate-800 tracking-tight leading-none">
                            {page.todayCount}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            hoy
                          </p>
                          <p className="text-[7px] text-slate-400 italic">publicaciones</p>
                        </div>
                      </div>

                      {/* Bottom Sentiment bar + Sparkline */}
                      <div className="px-4 pb-3 space-y-2 shrink-0 bg-white">
                        {/* Sentiment Bar */}
                        <div className="space-y-0.75">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <span className="h-full bg-red-500" style={{ width: `${negPct}%` }} title={`NEG: ${negPct}%`} />
                            <span className="h-full bg-slate-350" style={{ width: `${neutPct}%` }} title={`NEUT: ${neutPct}%`} />
                            <span className="h-full bg-emerald-500" style={{ width: `${posPct}%` }} title={`POS: ${posPct}%`} />
                          </div>
                        </div>

                        {/* Sparkline mini-path */}
                        <div className="flex justify-between items-center text-[9.5px] font-mono font-bold text-slate-400 pt-0.5 border-t border-slate-50">
                          <span className="text-[8px] tracking-wider text-slate-400 font-mono">7 DÍAS</span>
                          <div className="w-20 h-5 shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 240 50">
                              <path
                                d={`M ${page.sparklinePoints.map(pt => `${pt.x} ${pt.y}`).join(" L ")}`}
                                fill="none"
                                stroke={page.variation >= 0 ? "#10b981" : "#3b82f6"}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TABLE VIEW */}
          {/* ============================================================== */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden select-none relative">
              
              {/* Configure Columns Trigger */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Listado denso de fuentes monitoreadas
                </span>
                
                <div className="relative">
                  <button
                    onClick={() => setShowColConfig(!showColConfig)}
                    className="px-2.5 py-1 text-[9.5px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-250 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    Configurar columnas
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown panel */}
                  {showColConfig && (
                    <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 text-[10px] font-semibold text-slate-700 min-w-[180px] grid grid-cols-1 gap-2 leading-none">
                      <p className="font-bold text-slate-500 border-b border-slate-100 pb-1.5 uppercase text-[8.5px]">Columnas Visibles</p>
                      {Object.entries(visibleCols).map(([col, val]) => (
                        <label key={col} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 py-0.5">
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !val }))}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="capitalize">{col.replace(/([A-Z])/g, " $1")}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div 
                onScroll={(e) => {
                  const target = e.currentTarget;
                  if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
                    if (visibleLimit < tableSortedPages.length) {
                      setVisibleLimit((prev) => prev + 24);
                    }
                  }
                }}
                className="overflow-x-auto max-h-[600px]"
              >
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 select-none">
                      {visibleCols.nombre && (
                        <th className="py-3 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleTableSortClick("nombre")}>
                          Medio {tableSortField === "nombre" && <span className="underline">{tableSortDirection === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      )}
                      {visibleCols.noticiasHoy && (
                        <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleTableSortClick("hoy")}>
                          Hoy {tableSortField === "hoy" && <span className="underline">{tableSortDirection === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      )}
                      {visibleCols.noticiasPeriodo && (
                        <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleTableSortClick("periodo")}>
                          En Período {tableSortField === "periodo" && <span className="underline">{tableSortDirection === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      )}
                      {visibleCols.variacion && (
                        <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleTableSortClick("variacion")}>
                          Variación {tableSortField === "variacion" && <span className="underline">{tableSortDirection === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      )}
                      {visibleCols.sentimiento && <th className="py-3 px-4 text-center">Tono (Sentimiento)</th>}
                      {visibleCols.temas && <th className="py-3 px-4">Temas Dominantes</th>}
                      {visibleCols.ultima && (
                        <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800" onClick={() => handleTableSortClick("ultima")}>
                          Última Nota {tableSortField === "ultima" && <span className="underline">{tableSortDirection === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      )}
                      {visibleCols.promedioDiario && <th className="py-3 px-4 text-right">Prom. Diario</th>}
                      {visibleCols.horaPico && <th className="py-3 px-4 text-center">Hora Pico</th>}
                      {visibleCols.cobertura && <th className="py-3 px-4 capitalize">Cobertura</th>}
                      {visibleCols.consistencia && <th className="py-3 px-4 text-right">Consistencia</th>}
                      {visibleCols.estado && <th className="py-3 px-4 text-center">Estado</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {tableSortedPages.slice(0, visibleLimit).map((page) => {
                      const negPct = page.metricas.porcentaje_negativo || 0;
                      const posPct = Math.round((100 - negPct) * 0.4);
                      const neutPct = 100 - negPct - posPct;

                      return (
                        <tr
                          key={page.id}
                          onClick={() => {
                            if (isCompareMode) {
                              handleCheckboxChange(page.id);
                            } else {
                              router.push(`/paginas/${page.id}`);
                            }
                          }}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors group ${
                            selectedPageIds.includes(page.id) ? "bg-blue-50/45" : ""
                          }`}
                        >
                          {visibleCols.nombre && (
                            <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              <div className="flex items-center gap-2 truncate">
                                {isCompareMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedPageIds.includes(page.id)}
                                    onChange={() => handleCheckboxChange(page.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                                  />
                                )}
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: page.gradient }} />
                                <span className="truncate">{page.nombre}</span>
                              </div>
                            </td>
                          )}

                          {visibleCols.noticiasHoy && (
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {page.todayCount}
                            </td>
                          )}

                          {visibleCols.noticiasPeriodo && (
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {page.periodCount}
                            </td>
                          )}

                          {visibleCols.variacion && (
                            <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                              page.variation >= 0 ? "text-emerald-600" : "text-red-500"
                            }`}>
                              {page.variation >= 0 ? "↑" : "↓"} {Math.abs(page.variation)}%
                            </td>
                          )}

                          {visibleCols.sentimiento && (
                            <td className="py-3.5 px-4">
                              <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden flex mx-auto shadow-inner">
                                <span className="h-full bg-red-500" style={{ width: `${negPct}%` }} />
                                <span className="h-full bg-slate-350" style={{ width: `${neutPct}%` }} />
                                <span className="h-full bg-emerald-500" style={{ width: `${posPct}%` }} />
                              </div>
                            </td>
                          )}

                          {visibleCols.temas && (
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                {page.topTopics.map((t) => (
                                  <span key={t} className="text-[8.5px] font-bold text-slate-650 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.25">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}

                          {visibleCols.ultima && (
                            <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                              {page.lastPubText}
                            </td>
                          )}

                          {visibleCols.promedioDiario && (
                            <td className="py-3.5 px-4 text-right font-mono">
                              {(page.periodCount / (period === "hoy" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90)).toFixed(1)}
                            </td>
                          )}

                          {visibleCols.horaPico && (
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-650">
                              {page.peakHour}:00
                            </td>
                          )}

                          {visibleCols.cobertura && (
                            <td className="py-3.5 px-4 capitalize font-mono text-[9px] text-slate-500">
                              {page.coverage}
                            </td>
                          )}

                          {visibleCols.consistencia && (
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">
                              {page.consistency}%
                            </td>
                          )}

                          {visibleCols.estado && (
                            <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleToggleActiva(page.id, page.activa, e)}
                                className="cursor-pointer font-bold text-[9.5px]"
                              >
                                {page.activa === 1 ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg shadow-sm">
                                    Activo
                                  </span>
                                ) : (
                                  <span className="text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                    Pausado
                                  </span>
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOATING COMPARISON PANEL BANNER */}
          {/* ============================================================== */}
          {isCompareMode && selectedPageIds.length >= 2 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl py-3 px-6 z-50 flex items-center gap-6 border border-slate-800 animate-slideUp font-sans">
              <div className="space-y-0.5">
                <p className="text-xs font-bold">Modo de Comparación Activo</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Has seleccionado <strong className="text-white font-mono">{selectedPageIds.length}</strong> de <strong className="text-white font-mono">5</strong> medios.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPageIds([])}
                  className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setShowCompareView(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-[10px] font-bold text-white shadow transition-colors cursor-pointer flex items-center gap-1"
                >
                  Ver comparación &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ============================================================== */
        /* COMPARISON DETAILS CANVAS (VISTA COMPARATIVA) */
        /* ============================================================== */
        <div className="w-full flex-1 flex flex-col bg-slate-50 select-none pb-20 animate-fadeIn space-y-6">
          {/* Cover / Header back */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowCompareView(false);
                  setIsCompareMode(true);
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-250 rounded-xl text-[10.5px] font-bold text-slate-700 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
              >
                &larr; Regresar al Grid
              </button>
              <div>
                <h1 className="text-2xl font-serif font-black text-slate-900 leading-none">
                  Comparativa de Medios
                </h1>
                <p className="text-[10px] text-slate-500 font-medium mt-1 font-mono">
                  Comparando {selectedPagesList.length} fuentes editoriales activas simultáneamente.
                </p>
              </div>
            </div>

            <button
              onClick={() => typeof window !== "undefined" && window.print()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar comparación
            </button>
          </div>

          {/* Radar Chart Overlay */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Radar Panel */}
            <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Radar Editorial</h3>
                <p className="text-[9px] text-slate-400">Superposición porcentual de capacidad y tendencias en 6 dimensiones.</p>
              </div>

              {/* Recharts Radar */}
              <div className="flex-1 min-h-0 w-full mt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" stroke="#475569" fontSize={8} fontWeight="bold" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={7} />
                    
                    {selectedPagesList.map((p, idx) => {
                      const hash = p.nombre.length;
                      const hue = Math.abs((hash * 45) % 360);
                      const color = `hsl(${hue}, 75%, 45%)`;
                      return (
                        <Radar
                          key={p.id}
                          name={p.nombre}
                          dataKey={p.nombre}
                          stroke={color}
                          fill={color}
                          fillOpacity={0.18}
                          strokeWidth={2}
                        />
                      );
                    })}
                    <RechartsTooltip contentStyle={{ fontSize: "10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "9px", fontFamily: "sans-serif", fontWeight: "bold" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Metrics Grid Table */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Detalle Métrica por Métrica</h3>
                <p className="text-[9px] text-slate-400">Comportamiento paralelo de los emisores seleccionados.</p>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans table-fixed min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                      <th className="py-3 px-4 w-[160px]">Métrica</th>
                      {selectedPagesList.map(p => (
                        <th key={p.id} className="py-3 px-4 font-bold text-slate-900 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.gradient }} />
                            <span className="truncate">{p.nombre}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    
                    {/* Incidents Volume row */}
                    <tr>
                      <td className="py-4 px-4 bg-slate-50/40 font-bold uppercase text-[9px] text-slate-400">Volumen Notas</td>
                      {selectedPagesList.map(p => (
                        <td key={p.id} className="py-4 px-4 font-mono font-bold text-slate-900">
                          {p.periodCount} <span className="text-[9px] font-normal text-slate-400 block font-sans">notas en el período</span>
                        </td>
                      ))}
                    </tr>

                    {/* Sparklines row */}
                    <tr>
                      <td className="py-4 px-4 bg-slate-50/40 font-bold uppercase text-[9px] text-slate-400">Historial 7 Días</td>
                      {selectedPagesList.map(p => (
                        <td key={p.id} className="py-4 px-4">
                          <div className="w-28 h-8">
                            <svg className="w-full h-full" viewBox="0 0 240 50">
                              <path
                                d={`M ${p.sparklinePoints.map(pt => `${pt.x} ${pt.y}`).join(" L ")}`}
                                fill="none"
                                stroke={p.variation >= 0 ? "#10b981" : "#3b82f6"}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Polar Sentiment bar row */}
                    <tr>
                      <td className="py-4 px-4 bg-slate-50/40 font-bold uppercase text-[9px] text-slate-400">Tono (Sentimiento)</td>
                      {selectedPagesList.map(p => {
                        const negPct = p.metricas.porcentaje_negativo || 0;
                        const posPct = Math.round((100 - negPct) * 0.4);
                        const neutPct = 100 - negPct - posPct;
                        return (
                          <td key={p.id} className="py-4 px-4 space-y-1">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                              <span className="h-full bg-red-500" style={{ width: `${negPct}%` }} />
                              <span className="h-full bg-slate-350" style={{ width: `${neutPct}%` }} />
                              <span className="h-full bg-emerald-500" style={{ width: `${posPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[7px] font-mono font-bold text-slate-400">
                              <span>{negPct}% NEG</span>
                              <span>{posPct}% POS</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Top topics row */}
                    <tr>
                      <td className="py-4 px-4 bg-slate-50/40 font-bold uppercase text-[9px] text-slate-400">Temas Clave</td>
                      {selectedPagesList.map(p => (
                        <td key={p.id} className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            {p.topTopics.map((t, idx) => (
                              <span key={t} className="text-[8.5px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 w-fit">
                                {idx + 1}. {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Hour peak mini-barchart row */}
                    <tr>
                      <td className="py-4 px-4 bg-slate-50/40 font-bold uppercase text-[9px] text-slate-400">Hora Pico Publicación</td>
                      {selectedPagesList.map(p => {
                        const hData = getCompareHourlyData(p);
                        return (
                          <td key={p.id} className="py-4 px-4 space-y-1.5">
                            <span className="font-sans font-bold text-slate-800 block text-[9.5px]">Pico: {p.peakHour}:00h</span>
                            <div className="h-7 w-[95px] flex items-end gap-[1px]">
                              {hData.map((h, i) => {
                                const isPeak = h.hour === p.peakHour;
                                return (
                                  <span
                                    key={i}
                                    style={{ height: `${(h.val / 23) * 100}%` }}
                                    className={`w-[3px] rounded-[0.5px] ${
                                      isPeak ? "bg-amber-400" : "bg-blue-500/75"
                                    }`}
                                    title={`${h.hour}h: ${h.val} notas`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
