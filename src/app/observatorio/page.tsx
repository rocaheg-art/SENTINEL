"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  getObservatorio, 
  getAlerts,
  AlertItem,
  ObservatorioResponse, 
  ObservatorioInsight,
  ObservatorioTimelineEvent 
} from "@/lib/api";
import { useV3Context } from "@/context/V3Context";
import { Bell } from "lucide-react";
import { 
  Compass, 
  ArrowRight, 
  RefreshCw, 
  FileDown, 
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Map as MapIcon,
  AlertTriangle,
  Info,
  Activity,
  Layers,
  Search,
  Filter,
  Eye,
  MessageSquare,
  ThumbsUp,
  Share2,
  SlidersHorizontal
} from "lucide-react";
import { 
  AreaChart, Area, 
  BarChart, Bar,
  PieChart, Pie, Cell, 
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const LeafletObservatorioMap = dynamic(() => import("@/components/v3/LeafletObservatorioMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-muted">
      Iniciando geoposicionador de crónicas...
    </div>
  ),
});

export default function ObservatorioPage() {
  const router = useRouter();
  const [semana, setSemana] = useState<number>(0);
  const [data, setData] = useState<ObservatorioResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [livePolling, setLivePolling] = useState<boolean>(false);
  const [flip, setFlip] = useState<boolean>(false);
  const { sensitivityUmbrales } = useV3Context();
  const [weeklyAlerts, setWeeklyAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const fetchWeeklyAlerts = async () => {
      try {
        const data = await getAlerts({
          volumen_sens: sensitivityUmbrales.volume,
          sentimiento_sens: sensitivityUmbrales.sentiment,
          speed_sens: sensitivityUmbrales.speed,
          divergencia_sens: sensitivityUmbrales.divergence
        });
        setWeeklyAlerts(data);
      } catch (err) {
        console.error("Error fetching weekly alerts:", err);
      }
    };
    fetchWeeklyAlerts();
  }, [sensitivityUmbrales]);
  
  // Interactive Drill-Down Filters (De lo grande a lo particular)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [activeSentimentFilter, setActiveSentimentFilter] = useState<string | null>(null);
  const [activeDayFilter, setActiveDayFilter] = useState<string | null>(null);
  const [activeLocationFilter, setActiveLocationFilter] = useState<string | null>(null);
  const [activeAuthorFilter, setActiveAuthorFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleLimit, setVisibleLimit] = useState<number>(30);
  
  // Selection States
  const [selectedInsight, setSelectedInsight] = useState<ObservatorioInsight | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<any | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<any | null>(null);
  const [clickedLocation, setClickedLocation] = useState<any | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<string>("temporal"); // temporal, tematica, horaria

  // Timeline dragging state
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const getWeekdayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T12:00:00");
      const days = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
      return days[d.getDay()];
    } catch {
      return "";
    }
  };

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getObservatorio(semana);
      setData(res);
      setFlip(true);
      setTimeout(() => setFlip(false), 600);
    } catch (err) {
      console.error("Error loading observatorio:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Reset filters and selections when period changes
    clearAllFilters();
  }, [semana]);

  // Live polling effect
  useEffect(() => {
    if (!livePolling) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [livePolling, semana]);

  // Timeline drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 1.8;
    timelineRef.current.scrollLeft = scrollLeft - walk;
  };

  // Clear filters
  const clearAllFilters = () => {
    setActiveCategoryFilter(null);
    setActiveSentimentFilter(null);
    setActiveDayFilter(null);
    setActiveLocationFilter(null);
    setActiveAuthorFilter(null);
    setSearchQuery("");
    setClickedLocation(null);
    setHoveredLocation(null);
    setVisibleLimit(30);
  };

  // Export to PDF
  const handleExportPDF = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background font-mono text-xs text-text-muted gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span>Sincronizando crónicas editoriales y estructurando análisis estadísticos...</span>
      </div>
    );
  }

  // Sparkline/Pulse data mapping
  const pulseChartData = data.dates_list.map((day, idx) => ({
    fecha: day,
    dia: getWeekdayName(day),
    volumen: data.estadisticos.pulso_semanal[idx] || 0,
  }));

  // Categories chart data
  const categoriesChartData = data.ranking_temas.map(t => ({
    name: t.nombre.replace("_", " "),
    menciones: t.publicaciones,
    rawName: t.nombre
  }));

  // Sentiment breakdown data
  const sentimentDistribution = Object.entries(data.estadisticos.distribucion_fuentes.valores).map(([name, value]) => ({
    name,
    value
  }));
  const totalSentiments = sentimentDistribution.reduce((acc, curr) => acc + curr.value, 0);

  // Mapeamos los sentimientos reales para el PieChart
  const realSentimentDistribution = [
    { name: "Positivo", value: data.publicaciones.filter(p => p.sentimiento?.toLowerCase() === "positivo").length },
    { name: "Negativo", value: data.publicaciones.filter(p => p.sentimiento?.toLowerCase() === "negativo").length },
    { name: "Neutral", value: data.publicaciones.filter(p => p.sentimiento?.toLowerCase() === "neutral").length },
    { name: "Mixto", value: data.publicaciones.filter(p => p.sentimiento?.toLowerCase() === "mixto").length },
  ].filter(s => s.value > 0);

  const SENTIMENT_COLORS = {
    positivo: "#10b981",
    negativo: "#ef4444",
    neutral: "#64748b",
    mixto: "#a855f7"
  };

  const DONUT_COLORS = ["#3b82f6", "#06b6d4", "#a855f7", "#10b981", "#475569"];

  // Hourly curve
  const hourlyCurveData = data.estadisticos.hora_pico.map((val, idx) => ({
    hora: `${idx}h`,
    volumen: val
  }));

  // Geographic coordinates mapping
  const minLat = 19.0;
  const maxLat = 21.8;
  const minLng = -101.5;
  const maxLng = -98.8;

  const getXY = (lat: number, lng: number) => {
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 800;
    const y = (1.0 - (clampedLat - minLat) / (maxLat - minLat)) * 480;
    return { x, y };
  };

  // Custom Inline SVG Sparkline for topics ranking
  const renderInlineSparkline = (points: number[]) => {
    if (!points || points.length === 0) return null;
    const maxVal = Math.max(...points) || 1;
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    const width = 85;
    const height = 24;
    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - minVal) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(" ");
    
    return (
      <svg width={width} height={height} className="overflow-visible shrink-0 select-none">
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  // Sentiment CSS/styles
  const getSentimentStyle = (sent: string) => {
    const s = sent.toLowerCase();
    if (s === "negativo") return "text-red-400 bg-red-950/30 border border-red-900/50";
    if (s === "positivo") return "text-emerald-400 bg-emerald-950/30 border border-emerald-900/50";
    if (s === "mixto") return "text-purple-400 bg-purple-950/30 border border-purple-900/50";
    return "text-slate-400 bg-slate-800/40 border border-slate-700/50";
  };

  const getSentimentDotColor = (sent: string) => {
    const s = sent.toLowerCase();
    if (s === "negativo") return "#ef4444";
    if (s === "positivo") return "#10b981";
    if (s === "mixto") return "#a855f7";
    return "#64748b";
  };

  // Filter Publications client-side (De lo grande a lo particular)
  const filteredPublications = data.publicaciones.filter((pub) => {
    if (activeCategoryFilter && pub.categoria.toLowerCase() !== activeCategoryFilter.toLowerCase()) {
      return false;
    }
    if (activeSentimentFilter && pub.sentimiento.toLowerCase() !== activeSentimentFilter.toLowerCase()) {
      return false;
    }
    if (activeDayFilter && pub.fecha.slice(0, 10) !== activeDayFilter) {
      return false;
    }
    if (activeAuthorFilter && pub.autor !== activeAuthorFilter) {
      return false;
    }
    if (activeLocationFilter) {
      const normUbi = pub.ubicacion ? pub.ubicacion.toLowerCase() : "";
      if (!normUbi.includes(activeLocationFilter.toLowerCase())) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const contentMatch = pub.contenido.toLowerCase().includes(q);
      const authorMatch = pub.autor.toLowerCase().includes(q);
      const locationMatch = pub.ubicacion && pub.ubicacion.toLowerCase().includes(q);
      if (!contentMatch && !authorMatch && !locationMatch) {
        return false;
      }
    }
    return true;
  });

  const getTimelineEventColor = (tipo: string) => {
    if (tipo === "volumen") return "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]";
    if (tipo === "sentimiento") return "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]";
    return "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]";
  };

  const getTimelineEventSize = (tamanio: string) => {
    if (tamanio === "grande") return "w-6 h-6 -mt-3";
    if (tamanio === "mediano") return "w-5 h-5 -mt-2.5";
    return "w-4 h-4 -mt-2";
  };

  const activeLoc = hoveredLocation || clickedLocation;

  return (
    <div className="flex-1 bg-background overflow-y-auto font-sans-editorial text-foreground relative pb-20">
      
      {/* Top Sticky Header */}
      <div className="px-8 py-5 flex flex-col lg:flex-row items-center justify-between border-b border-card-border select-none bg-card-bg sticky top-0 z-40 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-550 flex items-center justify-center shadow-lg shadow-blue-500/5">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground font-sans">OBSERVATORIO DE INTELIGENCIA</h1>
            <p className="text-[10px] text-blue-650 font-bold uppercase tracking-widest mt-0.5">Auditoría Semanal de Tendencias e Incidentes</p>
          </div>
        </div>

        {/* Navigation & Live Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector */}
          <div className="flex items-center gap-1 bg-card-bg p-1 rounded-xl border border-card-border">
            <button 
              onClick={() => setSemana(Math.min(3, semana + 1))}
              disabled={semana === 3}
              className="p-1.5 hover:bg-background disabled:opacity-30 rounded-lg transition-all cursor-pointer text-text-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSemana(0)}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-sans transition-all ${
                semana === 0 ? "bg-blue-600 text-white" : "text-text-muted hover:text-foreground"
              }`}
            >
              Esta sem.
            </button>
            <button 
              onClick={() => setSemana(1)}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-sans transition-all ${
                semana === 1 ? "bg-blue-600 text-white" : "text-text-muted hover:text-foreground"
              }`}
            >
              Sem. pasada
            </button>
            <button 
              onClick={() => setSemana(Math.max(0, semana - 1))}
              disabled={semana === 0}
              className="p-1.5 hover:bg-background disabled:opacity-30 rounded-lg transition-all cursor-pointer text-text-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Live Toggle */}
          <button 
            onClick={() => setLivePolling(!livePolling)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-sans flex items-center gap-1.5 transition-all ${
              livePolling 
                ? "bg-green-500/10 border-green-500/30 text-green-600 animate-pulse" 
                : "bg-card-bg border-card-border text-text-muted hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${livePolling ? "bg-green-500" : "bg-gray-400"}`} />
            Live
          </button>

          {/* PDF Trigger */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-1.5 bg-card-bg border border-card-border hover:bg-background rounded-xl text-xs font-bold text-text-muted hover:text-foreground transition-colors cursor-pointer flex items-center gap-2"
          >
            <FileDown className="w-4 h-4 text-red-500" />
            PDF
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="p-8 space-y-8 max-w-[1500px] mx-auto print-full-width">
        
        {/* 1. Hero Summary Header */}
        <div className="min-h-[260px] bg-card-bg rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden shadow-sm border border-card-border select-none animate-fade-up">
          <div className="absolute inset-0 bg-[radial-gradient(var(--card-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-35" />
          <div className="z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full font-sans">
              Narrativa Editorial del Período
            </span>
            <h2 className="text-3xl md:text-5xl font-serif-editorial text-foreground tracking-tight mt-6 leading-tight max-w-[90%]">
              {data.titular}
            </h2>
            <p className="text-xs font-light text-text-muted mt-3 font-sans-editorial">
              Auditoría consolidada del periodo <strong className="text-blue-600">{data.rango_fechas}</strong>
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 z-10 border-t border-card-border pt-5 mt-4">
            <div className="flex flex-col gap-2 w-full md:max-w-xs">
              <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider font-sans">
                <span>Progreso de Auditoría</span>
                <span>{data.kpis.progreso_semana}%</span>
              </div>
              <div className="w-full bg-background h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${data.kpis.progreso_semana}%` }} 
                />
              </div>
            </div>

            <div className="flex items-center gap-6 text-foreground text-xs font-mono font-bold">
              <div>
                <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider block font-sans">Artículos Totales</span>
                <span className="text-xl font-bold mt-0.5 text-blue-600 block font-sans">{data.kpis.total_publicaciones}</span>
              </div>
              <div className="h-6 w-[1px] bg-card-border" />
              <div>
                <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider block font-sans">Canales Activos</span>
                <span className="text-xl font-bold mt-0.5 text-blue-600 block font-sans">{data.kpis.fuentes_activas}</span>
              </div>
              <div className="h-6 w-[1px] bg-card-border" />
              <div>
                <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider block font-sans">Temas Clave</span>
                <span className="text-xl font-bold mt-0.5 text-blue-600 block font-sans">{data.kpis.temas_identificados}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Insight cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.frases_insights.map((insight, idx) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className="observatorio-card p-5 h-[180px] flex flex-col justify-between cursor-pointer group bg-card-bg border border-card-border hover:border-blue-500/50 rounded-2xl relative overflow-hidden shadow-sm"
              style={{ 
                borderLeftWidth: "4px", 
                borderLeftColor: insight.color_borde,
                animationDelay: `${idx * 50}ms`
              }}
            >
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-muted font-sans">
                  Resumen de {insight.categoria}
                </span>
                <p className="text-xs font-semibold text-foreground/80 leading-relaxed mt-3 pr-2 font-sans-editorial">
                  {insight.texto}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: insight.color_borde }}>
                  {insight.dato}
                </span>
                <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-sans">
                  Ver detalle
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Grand Statistics & Analysis Module (Interactive Drill-down Controls) */}
        <div className="card-intelligence p-6 bg-card-bg border border-card-border rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-card-border pb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-blue-500" />
                ANÁLISIS ESTADÍSTICO INTERACTIVO (DRILL-DOWN)
              </h2>
              <p className="text-[10px] text-text-muted mt-1">Haz clic en las barras, líneas o sectores para filtrar las publicaciones y profundizar en el origen de los datos.</p>
            </div>

            {/* Tab controls */}
            <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-card-border">
              <button 
                onClick={() => setActiveChartTab("temporal")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${
                  activeChartTab === "temporal" ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
              >
                Volumen y Pulso
              </button>
              <button 
                onClick={() => setActiveChartTab("tematica")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${
                  activeChartTab === "tematica" ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
              >
                Temas y Canales
              </button>
              <button 
                onClick={() => setActiveChartTab("horaria")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all ${
                  activeChartTab === "horaria" ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
              >
                Picos Horarios
              </button>
            </div>
          </div>

          {/* Grand Chart Display */}
          <div className="h-[320px] w-full bg-background border border-card-border rounded-2xl p-4 relative">
            {activeChartTab === "temporal" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={pulseChartData} 
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedDay = state.activePayload[0].payload.fecha;
                      setActiveDayFilter(activeDayFilter === clickedDay ? null : clickedDay);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="colorVolumen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                  <XAxis 
                    dataKey="dia" 
                    stroke="#475569" 
                    style={{ fontSize: "10px", fontFamily: "monospace" }} 
                  />
                  <YAxis 
                    stroke="#475569" 
                    style={{ fontSize: "10px", fontFamily: "monospace" }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff", fontSize: "10px" }}
                    labelFormatter={(label, payload) => payload[0] ? `Fecha: ${payload[0].payload.fecha}` : label}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volumen" 
                    name="Publicaciones"
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorVolumen)"
                    activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeChartTab === "tematica" && (
              <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full gap-4">
                {/* Categories bar chart */}
                <div className="h-full w-full relative">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Menciones por Categoría (Clic para filtrar)</p>
                  <ResponsiveContainer width="100%" height="88%">
                    <BarChart 
                      data={categoriesChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const catName = state.activePayload[0].payload.rawName;
                          setActiveCategoryFilter(activeCategoryFilter === catName ? null : catName);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                      <XAxis type="number" stroke="#475569" style={{ fontSize: "9px" }} />
                      <YAxis dataKey="name" type="category" stroke="#475569" style={{ fontSize: "9px" }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff", fontSize: "9px" }} />
                      <Bar dataKey="menciones" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {categoriesChartData.map((entry, index) => {
                          const isSelected = activeCategoryFilter?.toLowerCase() === entry.rawName.toLowerCase();
                          return <Cell key={`cell-${index}`} fill={isSelected ? "#a855f7" : "#2563eb"} className="cursor-pointer" />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Sentiment Pie chart */}
                <div className="h-full w-full relative flex flex-col items-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2 self-start">Temperatura de Canales / Sentiment (Clic para filtrar)</p>
                  <div className="flex-1 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={realSentimentDistribution}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(entry: any) => {
                            const sentName = entry.name.toLowerCase();
                            setActiveSentimentFilter(activeSentimentFilter === sentName ? null : sentName);
                          }}
                        >
                          {realSentimentDistribution.map((entry, index) => {
                            const isSelected = activeSentimentFilter?.toLowerCase() === entry.name.toLowerCase();
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name.toLowerCase() === "positivo" ? "#10b981" : (entry.name.toLowerCase() === "negativo" ? "#ef4444" : (entry.name.toLowerCase() === "mixto" ? "#a855f7" : "#64748b"))} 
                                stroke={isSelected ? "#fff" : "none"}
                                strokeWidth={2}
                                className="cursor-pointer focus:outline-none"
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff", fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Overlay legend */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-gray-500 space-y-1">
                      {realSentimentDistribution.map((item, idx) => {
                        const isSelected = activeSentimentFilter?.toLowerCase() === item.name.toLowerCase();
                        const itemColor = item.name.toLowerCase() === "positivo" ? "#10b981" : (item.name.toLowerCase() === "negativo" ? "#ef4444" : (item.name.toLowerCase() === "mixto" ? "#a855f7" : "#64748b"));
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setActiveSentimentFilter(activeSentimentFilter === item.name.toLowerCase() ? null : item.name.toLowerCase())}
                            className={`flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-all ${
                              isSelected ? "bg-slate-850 text-white border border-slate-700" : "hover:text-gray-300"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                            <span className="truncate max-w-[80px]">{item.name}:</span>
                            <span className="text-white ml-auto">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeChartTab === "horaria" && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyCurveData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                  <XAxis dataKey="hora" stroke="#475569" style={{ fontSize: "10px" }} />
                  <YAxis stroke="#475569" style={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff", fontSize: "10px" }} />
                  <Line 
                    type="monotone" 
                    dataKey="volumen" 
                    name="Flujo horario"
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: "#b45309", strokeWidth: 1.5, fill: "#f59e0b" }}
                    activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 4. Geographic Concentration Map & Locations List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 select-none">
          <div className="lg:col-span-2 card-intelligence p-6 flex flex-col bg-card-bg border border-card-border rounded-2xl relative min-h-[520px] overflow-hidden shadow-sm">
            <div className="flex justify-between items-start mb-4 z-10">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-blue-500" />
                  MAPA DE CONCENTRACIÓN Y AFECTACIÓN GEOGRÁFICA
                </h2>
                <p className="text-[10px] text-text-muted mt-1">Haz clic en un marcador para filtrar los reportes de la zona y analizar la severidad particular.</p>
              </div>
              {activeLocationFilter && (
                <button 
                  onClick={() => setActiveLocationFilter(null)}
                  className="px-2.5 py-1 bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-[9px] font-bold font-sans flex items-center gap-1 cursor-pointer hover:bg-red-900/20"
                >
                  Quitar filtro mapa <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Map Canvas */}
            <div className="flex-1 bg-background border border-card-border rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[440px]">
              <LeafletObservatorioMap
                locations={data.ubicaciones}
                activeLocationFilter={activeLocationFilter}
                onLocationClick={(locName) => {
                  setActiveLocationFilter(locName);
                  if (locName) {
                    const matched = data.ubicaciones.find(l => l.nombre.toLowerCase() === locName.toLowerCase());
                    setClickedLocation(matched || null);
                  } else {
                    setClickedLocation(null);
                  }
                }}
                onHoverLocation={(loc) => {
                  setHoveredLocation(loc);
                }}
              />

              {/* Connected map detailed card */}
              {activeLoc && (
                <div className="absolute bottom-4 left-4 right-4 bg-card-bg border border-card-border p-4 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-scaleIn text-xs z-[400]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-505 animate-pulse" />
                      <span className="font-bold text-sm text-foreground">{activeLoc.nombre}</span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed font-sans">
                      Se registraron <strong className="text-foreground">{activeLoc.publicaciones} notas</strong> en este cuadrante. Haz clic para filtrar los reportes en el explorador inferior.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider text-text-muted block">Severidad</span>
                      <span className="font-bold font-mono text-foreground text-base block">{activeLoc.severidad_promedio}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-card-border" />
                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider text-text-muted block">Sentimiento</span>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 capitalize ${getSentimentStyle(activeLoc.sentimiento_predominante)}`}>
                        {activeLoc.sentimiento_predominante}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel points of interest */}
          <div className="card-intelligence p-6 flex flex-col bg-card-bg border border-card-border rounded-2xl min-h-[520px] justify-between shadow-sm">
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2 select-none">
                <MapPin className="w-4.5 h-4.5 text-blue-500" />
                PUNTOS CRÍTICOS (FILTRADO GEOGRÁFICO)
              </h3>
              
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[400px] scrollbar-thin">
                {data.ubicaciones.map((loc) => {
                  const isSelected = activeLocationFilter?.toLowerCase() === loc.nombre.toLowerCase();
                  const dotColor = getSentimentDotColor(loc.sentimiento_predominante);

                  return (
                    <div
                      key={loc.nombre}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-3 ${
                        isSelected 
                          ? "bg-blue-500/10 border-blue-500/40 shadow-sm" 
                          : "bg-card-bg border-card-border hover:brightness-95"
                      }`}
                      onClick={() => {
                        const newFilter = activeLocationFilter === loc.nombre ? null : loc.nombre;
                        setActiveLocationFilter(newFilter);
                        setClickedLocation(newFilter ? loc : null);
                      }}
                      onMouseEnter={() => setHoveredLocation(loc)}
                      onMouseLeave={() => setHoveredLocation(null)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className="text-xs font-bold truncate text-foreground block">{loc.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[8.5px] font-mono text-text-muted">
                          <span>Vol: <strong className="text-foreground">{loc.publicaciones}</strong></span>
                          <span>&bull;</span>
                          <span>Sev: <strong className="text-foreground">{loc.severidad_promedio}</strong></span>
                        </div>
                      </div>
                      <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded capitalize ${getSentimentStyle(loc.sentimiento_predominante)}`}>
                        {loc.sentimiento_predominante}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Draggable Timeline */}
        <div className="card-intelligence p-6 flex flex-col select-none relative overflow-hidden bg-card-bg border border-card-border rounded-2xl shadow-sm">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-blue-500" />
              CRÓNICA EDITORIAL Y HITOS DESTACADOS
            </h2>
            <p className="text-[10px] text-text-muted mt-1">(Arrastra horizontalmente para navegar. Haz clic en un evento destacado para ver detalles)</p>
          </div>

          <div 
            ref={timelineRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="observatorio-timeline-scroll relative flex items-center min-h-[150px] border border-card-border rounded-2xl bg-background cursor-grab active:cursor-grabbing p-6 select-none overflow-x-auto"
          >
            <div className="absolute inset-x-0 bottom-4 flex justify-between px-16 text-[9px] font-mono font-bold text-text-muted pointer-events-none min-w-[1400px]">
              {data.dates_list.map((d, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-text-muted">{getWeekdayName(d)}</span>
                  <span className="text-[8px] mt-0.5">{d.slice(8)}/{d.slice(5, 7)}</span>
                </div>
              ))}
            </div>

            <div className="absolute left-16 right-16 top-1/2 h-[2px] bg-card-border -translate-y-1/2 pointer-events-none min-w-[1268px]" />

            <div className="absolute left-16 right-16 inset-y-0 relative w-full h-full min-w-[1268px]">
              {data.timeline.map((event) => {
                const pctX = (event.dia / 6) * 100;
                return (
                  <div
                    key={event.id}
                    className="absolute top-1/2 group z-10"
                    style={{ left: `${pctX}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className={`rounded-full cursor-pointer transition-transform duration-300 hover:scale-125 border border-black ${getTimelineEventSize(event.tamanio)} ${getTimelineEventColor(event.tipo)}`} />
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-60 bg-card-bg border border-card-border text-foreground rounded-xl shadow-2xl p-4 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100 z-50 text-xs">
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card-bg border-r border-b border-card-border rotate-45" />
                      <div className="flex items-center justify-between text-[8px] font-mono font-bold text-text-muted border-b border-card-border pb-2 mb-2">
                        <span>{event.fecha} &bull; {event.hora}</span>
                        <span className="uppercase text-blue-600">{event.tipo}</span>
                      </div>
                      <h4 className="font-bold text-foreground text-xs leading-tight">{event.titulo}</h4>
                      <p className="text-[10px] text-text-muted leading-relaxed mt-2">{event.descripcion}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-card-border text-[9px] font-mono font-bold">
                        <span className="text-text-muted">Muestras: {event.volumen}</span>
                        <span className={`px-1.5 py-0.25 rounded uppercase ${
                          event.sentimiento === "negativo" ? "text-red-400 border border-red-950 bg-red-950/20" : "text-emerald-400 border border-emerald-950 bg-emerald-950/20"
                        }`}>
                          {event.sentimiento}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Columns: Medios Activos & Temas Sparklines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Medios */}
          <div className="card-intelligence p-6 flex flex-col bg-card-bg border border-card-border rounded-2xl justify-between shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-6 select-none flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              MEDIOS DE COMUNICACIÓN MÁS ACTIVOS (CLIC PARA FILTRAR)
            </h2>
            <div className="space-y-4">
              {data.ranking_medios.map((media) => {
                const isSelected = activeAuthorFilter === media.nombre;
                return (
                  <div 
                    key={media.posicion} 
                    onClick={() => setActiveAuthorFilter(activeAuthorFilter === media.nombre ? null : media.nombre)}
                    className={`flex items-center gap-4 relative group p-2 rounded-xl transition-all cursor-pointer ${
                      isSelected ? "bg-blue-500/10 border border-blue-500/30" : "hover:brightness-95"
                    }`}
                  >
                    <span className="text-3xl font-serif-editorial text-card-border font-bold select-none shrink-0 w-8 text-center">{media.posicion}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline text-xs font-sans font-bold select-none mb-1">
                        <span className="text-foreground truncate pr-3">{media.nombre}</span>
                        <span className="font-mono text-text-muted text-[10px]">{media.publicaciones} notas</span>
                      </div>
                      <div className="w-full bg-background h-1.5 rounded-full overflow-hidden border border-card-border">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-700" style={{ width: `${media.porcentaje_relativo}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 w-16 text-right select-none">
                      {media.delta === "up" ? (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-mono">↑ +{media.delta_valor}</span>
                      ) : media.delta === "down" ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">↓ -{media.delta_valor}</span>
                      ) : (
                        <span className="text-[9px] font-bold text-text-muted bg-background px-2 py-0.5 rounded border border-card-border font-mono">--</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Temas with Sparkline */}
          <div className="card-intelligence p-6 flex flex-col bg-card-bg border border-card-border rounded-2xl justify-between shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-6 select-none flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              TEMAS MÁS COMENTADOS (CLIC PARA FILTRAR)
            </h2>
            <div className="space-y-4">
              {data.ranking_temas.map((tema) => {
                const isSelected = activeCategoryFilter?.toLowerCase() === tema.nombre.toLowerCase();
                return (
                  <div 
                    key={tema.posicion} 
                    onClick={() => setActiveCategoryFilter(activeCategoryFilter === tema.nombre ? null : tema.nombre)}
                    className={`flex items-center justify-between gap-4 p-2 rounded-xl transition-all cursor-pointer ${
                      isSelected ? "bg-blue-500/10 border border-blue-500/30" : "hover:brightness-95"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-[55%]">
                      <span className="text-3xl font-serif-editorial text-card-border font-bold select-none shrink-0 w-8 text-center">{tema.posicion}</span>
                      <div className="truncate min-w-0">
                        <span className="text-xs font-bold text-foreground block capitalize truncate">{tema.nombre.replace("_", " ")}</span>
                        <span className="text-[8px] font-bold font-mono uppercase text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.25 rounded inline-block mt-0.5">{tema.nombre}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center">{renderInlineSparkline(tema.sparkline)}</div>
                    <div className="text-right shrink-0 w-16 select-none">
                      <p className="text-[8px] uppercase font-bold text-text-muted">Muestras</p>
                      <p className="text-xs font-bold font-mono text-foreground mt-0.5">{tema.publicaciones}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen Semanal de Alertas (Conexión de lo inmediato con lo editorial) */}
        <div className="card-intelligence p-6 bg-card-bg border border-card-border rounded-2xl relative col-span-12 shadow-sm">
          <div className="flex justify-between items-center mb-5 select-none">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-blue-505" />
                Resumen Semanal de Alertas Activas
              </h2>
              <p className="text-[10px] text-text-muted mt-1">
                Recopilación retrospectiva de las alertas del período agrupadas por nivel de severidad.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Total: {weeklyAlerts.length} alertas
            </span>
          </div>

          {weeklyAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Critical alerts */}
              <div className="space-y-3.5 bg-red-50 border border-red-100 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-red-200/50 pb-2">
                  <span className="text-[10.5px] font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Críticas
                  </span>
                  <span className="text-[10px] font-mono text-red-650 font-black">
                    {weeklyAlerts.filter(a => a.severidad === 'critico').length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {weeklyAlerts.filter(a => a.severidad === 'critico').map((alert) => (
                    <div key={alert.id} className="text-xs border border-card-border bg-card-bg p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-[9px] text-text-muted">
                        <span className="font-bold uppercase text-red-600">{alert.tipo}</span>
                        <span>{alert.hace_cuanto}</span>
                      </div>
                      <p className="text-foreground leading-normal">{alert.descripcion}</p>
                    </div>
                  ))}
                  {weeklyAlerts.filter(a => a.severidad === 'critico').length === 0 && (
                    <p className="text-text-muted font-medium italic text-[11px] text-center py-4">Sin alertas críticas</p>
                  )}
                </div>
              </div>

              {/* Attention alerts */}
              <div className="space-y-3.5 bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                  <span className="text-[10.5px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                    Atención
                  </span>
                  <span className="text-[10px] font-mono text-amber-650 font-black">
                    {weeklyAlerts.filter(a => a.severidad === 'atencion').length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {weeklyAlerts.filter(a => a.severidad === 'atencion').map((alert) => (
                    <div key={alert.id} className="text-xs border border-card-border bg-card-bg p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-[9px] text-text-muted">
                        <span className="font-bold uppercase text-amber-600">{alert.tipo}</span>
                        <span>{alert.hace_cuanto}</span>
                      </div>
                      <p className="text-foreground leading-normal">{alert.descripcion}</p>
                    </div>
                  ))}
                  {weeklyAlerts.filter(a => a.severidad === 'atencion').length === 0 && (
                    <p className="text-text-muted font-medium italic text-[11px] text-center py-4">Sin alertas de atención</p>
                  )}
                </div>
              </div>

              {/* Informative alerts */}
              <div className="space-y-3.5 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-blue-200/50 pb-2">
                  <span className="text-[10.5px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    Informativas
                  </span>
                  <span className="text-[10px] font-mono text-blue-650 font-black">
                    {weeklyAlerts.filter(a => a.severidad === 'informativo').length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {weeklyAlerts.filter(a => a.severidad === 'informativo').map((alert) => (
                    <div key={alert.id} className="text-xs border border-card-border bg-card-bg p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-[9px] text-text-muted">
                        <span className="font-bold uppercase text-blue-600">{alert.tipo}</span>
                        <span>{alert.hace_cuanto}</span>
                      </div>
                      <p className="text-foreground leading-normal">{alert.descripcion}</p>
                    </div>
                  ))}
                  {weeklyAlerts.filter(a => a.severidad === 'informativo').length === 0 && (
                    <p className="text-text-muted font-medium italic text-[11px] text-center py-4">Sin alertas informativas</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-text-muted text-xs font-semibold select-none border border-dashed border-card-border rounded-xl">
              No se registraron anomalías ni alertas bajo la configuración de sensibilidad de este período.
            </div>
          )}
        </div>

        {/* 7. Drill-down Publications Explorer (De lo grande a lo particular) */}
        <div id="explorador-publicaciones" className="card-intelligence p-6 bg-card-bg border border-card-border rounded-2xl relative shadow-sm">
          
          {/* Header Controls */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-card-border pb-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
                EXPLORADOR DE NOTAS EN DETALLE (PRODUCTO DEL FILTRADO)
              </h2>
              <p className="text-[10px] text-text-muted mt-1">
                Visualizando <strong className="text-foreground">{filteredPublications.length}</strong> de {data.publicaciones.length} publicaciones del período.
              </p>
            </div>

            {/* Active Filters Display */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category tag filter indicator */}
              {activeCategoryFilter && (
                <span className="flex items-center gap-1.5 bg-blue-55 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-bold font-sans text-blue-700">
                  Tema: <strong className="capitalize text-blue-800">{activeCategoryFilter.replace("_", " ")}</strong>
                  <button onClick={() => setActiveCategoryFilter(null)} className="p-0.5 hover:bg-blue-200 rounded text-blue-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {/* Sentiment filter indicator */}
              {activeSentimentFilter && (
                <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full text-[10px] font-bold font-sans text-purple-700">
                  Sentimiento: <strong className="capitalize text-purple-800">{activeSentimentFilter}</strong>
                  <button onClick={() => setActiveSentimentFilter(null)} className="p-0.5 hover:bg-purple-200 rounded text-purple-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {/* Day filter indicator */}
              {activeDayFilter && (
                <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold font-sans text-amber-700">
                  Día: <strong className="font-mono text-amber-800">{activeDayFilter}</strong>
                  <button onClick={() => setActiveDayFilter(null)} className="p-0.5 hover:bg-amber-200 rounded text-amber-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {/* Location filter indicator */}
              {activeLocationFilter && (
                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold font-sans text-emerald-700">
                  Ubicación: <strong className="text-emerald-800">{activeLocationFilter}</strong>
                  <button onClick={() => { setActiveLocationFilter(null); setClickedLocation(null); }} className="p-0.5 hover:bg-emerald-200 rounded text-emerald-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {/* Author filter indicator */}
              {activeAuthorFilter && (
                <span className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 px-3 py-1 rounded-full text-[10px] font-bold font-sans text-pink-700">
                  Canal: <strong className="text-pink-800">{activeAuthorFilter}</strong>
                  <button onClick={() => setActiveAuthorFilter(null)} className="p-0.5 hover:bg-pink-200 rounded text-pink-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}

              {/* Reset trigger */}
              {(activeCategoryFilter || activeSentimentFilter || activeDayFilter || activeLocationFilter || activeAuthorFilter || searchQuery) && (
                <button 
                  onClick={clearAllFilters}
                  className="px-3 py-1 text-[10px] font-bold font-sans text-red-500 hover:text-white bg-red-50 border border-red-200 rounded-full cursor-pointer hover:bg-red-500 transition-all shadow-sm"
                >
                  Restaurar Filtros
                </button>
              )}

              {/* Search Bar */}
              <div className="relative ml-2 w-48 sm:w-64">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en contenido o medios..."
                  className="w-full bg-background border border-card-border hover:brightness-95 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3 py-1.5 pl-8 rounded-xl text-xs text-foreground placeholder-gray-500 focus:outline-none transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div 
            onScroll={(e) => {
              const target = e.currentTarget;
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
                if (visibleLimit < filteredPublications.length) {
                  setVisibleLimit((prev) => prev + 30);
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin"
          >
            {filteredPublications.length === 0 ? (
              <div className="col-span-full py-16 text-center text-gray-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
                <Info className="w-5 h-5 text-gray-600" />
                <span>No se encontraron publicaciones que coincidan con la combinación de filtros activa.</span>
              </div>
            ) : (
              filteredPublications.slice(0, visibleLimit).map((pub) => {
                const previewText = pub.contenido.length > 140 
                  ? pub.contenido.slice(0, 140) + "..." 
                  : pub.contenido;

                return (
                  <div
                    key={pub.id}
                    onClick={() => setSelectedPublication(pub)}
                    className="p-5 rounded-2xl bg-card-bg border border-card-border hover:border-blue-500/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[190px] group relative overflow-hidden shadow-sm"
                  >
                    <div>
                      {/* Top metadata tags */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-extrabold text-text-muted truncate max-w-[65%] font-sans">
                          {pub.autor}
                        </span>
                        <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded capitalize ${getSentimentStyle(pub.sentimiento)}`}>
                          {pub.sentimiento}
                        </span>
                      </div>

                      {/* Content preview */}
                      <p className="text-[11px] text-foreground/80 leading-relaxed font-sans line-clamp-3 group-hover:text-foreground transition-colors">
                        {previewText}
                      </p>
                    </div>

                    {/* Bottom Metadata Indicators */}
                    <div className="mt-4 border-t border-card-border pt-3 flex justify-between items-center text-[9px] font-mono text-text-muted">
                      <div className="flex items-center gap-3">
                        {pub.ubicacion && (
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[90px]">{pub.ubicacion}</span>
                          </span>
                        )}
                        <span className="capitalize px-1.5 py-0.25 bg-background rounded border border-card-border">{pub.categoria}</span>
                      </div>
                      
                      {/* Severity indicator */}
                      <div className="flex items-center gap-1.5">
                        <span>Sev: <strong>{pub.severidad}</strong></span>
                        <div className="w-12 bg-background h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${pub.severidad * 10}%`,
                              backgroundColor: pub.severidad > 6 ? "#ef4444" : (pub.severidad > 3 ? "#f59e0b" : "#10b981")
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {filteredPublications.length > visibleLimit && (
            <div className="text-center text-[10px] font-mono text-gray-500 mt-4 select-none animate-pulse">
              Desplázate hacia abajo para cargar más publicaciones ({visibleLimit} de {filteredPublications.length} mostradas)...
            </div>
          )}
        </div>

        {/* 8. Exceptional Metric Display */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-sm select-none animate-fade-up">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded border border-blue-100 font-sans">
            Métrica de Tracción Destacada
          </span>
          <h2 className="text-7xl md:text-8xl lg:text-9xl font-black font-mono tracking-tighter text-blue-600 filter drop-shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            {data.numero_semana.valor.toLocaleString()}
          </h2>
          <p className="text-base md:text-lg lg:text-xl font-light font-serif-editorial text-foreground italic max-w-4xl leading-relaxed">
            "{data.numero_semana.explicacion}"
          </p>
        </div>

      </div>

      {/* 9. Detailed Publication Drill-down Modal (Particular view) */}
      {selectedPublication && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-[640px] p-6 shadow-2xl space-y-5 select-none animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-card-border pb-3.5">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  Ficha de Publicación Completa
                </span>
                <h3 className="text-sm font-bold text-foreground font-sans mt-1">
                  ID: {selectedPublication.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPublication(null)}
                className="p-1 hover:bg-background rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5">
              {/* Main Content Text */}
              <div className="bg-background p-5 rounded-2xl border border-card-border max-h-[220px] overflow-y-auto scrollbar-thin text-[12px] text-foreground leading-relaxed font-sans font-medium">
                {selectedPublication.contenido}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans text-center">
                <div className="bg-card-bg border border-card-border p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted block uppercase font-bold">Severidad</span>
                  <span className={`text-base font-bold font-mono mt-1 block ${
                    selectedPublication.severidad > 6 ? "text-red-650" : (selectedPublication.severidad > 3 ? "text-amber-600" : "text-emerald-600")
                  }`}>
                    {selectedPublication.severidad} / 10
                  </span>
                </div>
                <div className="bg-card-bg border border-card-border p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted block uppercase font-bold">Sentimiento</span>
                  <span className={`text-xs font-bold font-mono capitalize mt-1.5 block text-foreground`}>
                    {selectedPublication.sentimiento}
                  </span>
                </div>
                <div className="bg-card-bg border border-card-border p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted block uppercase font-bold">Categoría</span>
                  <span className="text-xs font-bold font-mono capitalize mt-1.5 block text-blue-600">
                    {selectedPublication.categoria}
                  </span>
                </div>
                <div className="bg-card-bg border border-card-border p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted block uppercase font-bold">Engagement</span>
                  <span className="text-base font-bold font-mono mt-1 block text-foreground">
                    {selectedPublication.engagement.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Meta details */}
              <div className="bg-background p-4 border border-card-border rounded-xl space-y-2.5 font-mono text-[10px] text-text-muted">
                <div className="flex justify-between items-center">
                  <span>Autor/Canal:</span>
                  <strong className="text-foreground">{selectedPublication.autor}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Fecha de Registro:</span>
                  <strong className="text-foreground">{selectedPublication.fecha}</strong>
                </div>
                {selectedPublication.ubicacion && (
                  <div className="flex justify-between items-center">
                    <span>Ubicación Detectada:</span>
                    <strong className="text-blue-600">{selectedPublication.ubicacion}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-card-border gap-3">
              <button
                onClick={() => setSelectedPublication(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md shadow-blue-600/10"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Insight Modal Overlay */}
      {selectedInsight && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border rounded-2xl w-full max-w-[480px] p-6 shadow-2xl space-y-5 select-none animate-scaleIn text-xs">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Detalle del Insight Semanal
              </h3>
              <button 
                onClick={() => setSelectedInsight(null)}
                className="p-1 hover:bg-background rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div 
                className="p-4 rounded-xl text-foreground leading-relaxed font-semibold italic border-l-4"
                style={{ 
                  backgroundColor: `${selectedInsight.color_borde}08`, 
                  borderColor: selectedInsight.color_borde 
                }}
              >
                "{selectedInsight.texto}"
              </div>

              <div className="bg-background p-4 border border-card-border rounded-xl space-y-2 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Métrica Asociada</span>
                  <span className="text-lg font-bold font-mono tracking-tight" style={{ color: selectedInsight.color_borde }}>
                    {selectedInsight.dato}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wide">
                  <span>Dimensión Evaluada</span>
                  <span className="capitalize text-foreground font-semibold">{selectedInsight.categoria}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-card-border">
              <button
                onClick={() => setSelectedInsight(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
