"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  getPageDetail, 
  updatePageActiva, 
  PageDetailResponse 
} from "@/lib/api";
import { 
  ArrowLeft, 
  Globe, 
  ExternalLink, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw,
  Calendar,
  AlertTriangle,
  MessageSquare,
  FileText,
  MapPin,
  TrendingUp,
  Clock,
  Layers,
  Search,
  X,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { 
  BarChart, Bar, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";

// Coordinate nodes for 32 Mexican states on an 850x500 SVG viewbox
const MEXICO_STATES = [
  { id: "BC", name: "Baja California", x: 80, y: 70, neighbors: ["BCS", "SON"] },
  { id: "BCS", name: "Baja California Sur", x: 120, y: 160, neighbors: ["BC"] },
  { id: "SON", name: "Sonora", x: 180, y: 90, neighbors: ["BC", "SIN", "CHIH"] },
  { id: "CHIH", name: "Chihuahua", x: 290, y: 90, neighbors: ["SON", "SIN", "DGO", "COAH"] },
  { id: "SIN", name: "Sinaloa", x: 250, y: 180, neighbors: ["SON", "CHIH", "DGO", "NAY"] },
  { id: "DGO", name: "Durango", x: 340, y: 185, neighbors: ["SIN", "CHIH", "COAH", "ZAC", "NAY"] },
  { id: "COAH", name: "Coahuila", x: 410, y: 130, neighbors: ["CHIH", "DGO", "ZAC", "NL", "SLP"] },
  { id: "ZAC", name: "Zacatecas", x: 400, y: 235, neighbors: ["DGO", "COAH", "SLP", "AGS", "JAL"] },
  { id: "NAY", name: "Nayarit", x: 350, y: 275, neighbors: ["SIN", "DGO", "ZAC", "JAL"] },
  { id: "JAL", name: "Jalisco", x: 390, y: 320, neighbors: ["NAY", "ZAC", "AGS", "SLP", "GTO", "MICH", "COL"] },
  { id: "COL", name: "Colima", x: 370, y: 370, neighbors: ["JAL", "MICH"] },
  { id: "AGS", name: "Aguascalientes", x: 430, y: 280, neighbors: ["ZAC", "JAL"] },
  { id: "SLP", name: "San Luis Potosí", x: 480, y: 240, neighbors: ["ZAC", "COAH", "NL", "TAMPS", "VER", "HGO", "QRO", "GTO", "JAL"] },
  { id: "GTO", name: "Guanajuato", x: 470, y: 295, neighbors: ["JAL", "SLP", "QRO", "MICH"] },
  { id: "QRO", name: "Querétaro", x: 510, y: 295, neighbors: ["GTO", "SLP", "HGO", "EDOMEX", "MICH"] },
  { id: "MICH", name: "Michoacán", x: 450, y: 345, neighbors: ["JAL", "COL", "GTO", "QRO", "EDOMEX", "GRO"] },
  { id: "EDOMEX", name: "Estado de México", x: 515, y: 345, neighbors: ["MICH", "QRO", "HGO", "TLAX", "PUE", "GRO", "MOR", "CDMX"] },
  { id: "CDMX", name: "Ciudad de México", x: 535, y: 350, neighbors: ["EDOMEX", "MOR"] },
  { id: "MOR", name: "Morelos", x: 535, y: 375, neighbors: ["EDOMEX", "CDMX", "PUE", "GRO"] },
  { id: "HGO", name: "Hidalgo", x: 540, y: 305, neighbors: ["QRO", "SLP", "VER", "PUE", "TLAX", "EDOMEX"] },
  { id: "TLAX", name: "Tlaxcala", x: 565, y: 340, neighbors: ["HGO", "EDOMEX", "PUE"] },
  { id: "PUE", name: "Puebla", x: 570, y: 365, neighbors: ["EDOMEX", "TLAX", "HGO", "VER", "OAX", "GRO", "MOR"] },
  { id: "VER", name: "Veracruz", x: 610, y: 325, neighbors: ["TAMPS", "SLP", "HGO", "PUE", "OAX", "TAB", "CHIS"] },
  { id: "GRO", name: "Guerrero", x: 500, y: 400, neighbors: ["MICH", "EDOMEX", "MOR", "PUE", "OAX"] },
  { id: "OAX", name: "Oaxaca", x: 595, y: 410, neighbors: ["GRO", "PUE", "VER", "CHIS"] },
  { id: "TAB", name: "Tabasco", x: 685, y: 380, neighbors: ["VER", "CHIS", "CAMP"] },
  { id: "CHIS", name: "Chiapas", x: 715, y: 425, neighbors: ["OAX", "VER", "TAB"] },
  { id: "CAMP", name: "Campeche", x: 745, y: 345, neighbors: ["TAB", "YUC", "QROO"] },
  { id: "YUC", name: "Yucatán", x: 765, y: 285, neighbors: ["CAMP", "QROO"] },
  { id: "QROO", name: "Quintana Roo", x: 800, y: 320, neighbors: ["YUC", "CAMP"] },
  { id: "NL", name: "Nuevo León", x: 480, y: 150, neighbors: ["COAH", "SLP", "TAMPS"] },
  { id: "TAMPS", name: "Tamaulipas", x: 515, y: 175, neighbors: ["NL", "SLP", "VER"] }
];

export default function PaginaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [detail, setDetail] = useState<PageDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Detail filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [topicViewMode, setTopicViewMode] = useState<"volumen" | "porcentaje">("volumen");
  const [hoveredState, setHoveredState] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDetail = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getPageDetail(pageId);
      setDetail(data);
    } catch (err) {
      console.error("Error loading page detail:", err);
      router.push("/paginas");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (pageId) loadDetail();
  }, [pageId]);

  const handleToggleActiva = async () => {
    if (!detail || toggling) return;
    setToggling(true);
    const newStatus = detail.activa === 1 ? 0 : 1;
    try {
      await updatePageActiva(pageId, newStatus);
      setDetail({ ...detail, activa: newStatus });
    } catch (err) {
      console.error("Error toggling active state:", err);
    } finally {
      setToggling(false);
    }
  };

  // Generate enriched deterministic statistics based on page ID / Name hash
  const enrichedData = useMemo(() => {
    if (!detail) return null;
    const hash = detail.nombre.charCodeAt(0) + detail.nombre.length;

    // 1. Medium type
    let type: "Periódico" | "TV" | "Radio" | "Digital" | "Blog" = "Digital";
    if (hash % 5 === 0) type = "Periódico";
    else if (hash % 5 === 1) type = "TV";
    else if (hash % 5 === 2) type = "Radio";
    else if (hash % 5 === 3) type = "Blog";

    // 2. Coverage
    let coverage: "Nacional" | "Regional" | "Local" = "Local";
    if (hash % 3 === 0) coverage = "Nacional";
    else if (hash % 3 === 1) coverage = "Regional";

    // 3. Activo desde date simulation
    const year = 2020 + (hash % 5);
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const month = monthNames[hash % 12];
    const day = (hash % 28) + 1;
    const activoDesde = `${day} ${month} ${year}`;

    // 4. Frequency
    const frequency = ((hash % 12) + 4.5).toFixed(1);

    // 5. Editorial phrase
    let fraseEditorial = "";
    if (hash % 3 === 0) {
      fraseEditorial = `Constituye el principal emisor de información local en este período. Concentra la mayor parte de su actividad durante la mañana, focalizándose principalmente en la cobertura de notas de seguridad civil y reportes policiales rápidos.`;
    } else if (hash % 3 === 1) {
      fraseEditorial = `Mantiene un perfil moderadamente activo, caracterizado por una agenda distribuida a lo largo del día. Se detectan picos recurrentes de publicación durante el mediodía, con especial énfasis en desarrollo vial, movilidad y clima.`;
    } else {
      fraseEditorial = `Presenta una cobertura focalizada de naturaleza regional. Sus publicaciones exhiben una regularidad consistente que prioriza la difusión de anuncios oficiales, eventos comunitarios locales y contingencias ambientales.`;
    }

    // 6. Hourly peak distribution data (24h)
    const peakHour = (hash % 10) + 8; // peak hour between 8am and 6pm
    const hourlyData = Array.from({ length: 24 }).map((_, hour) => {
      const dist = Math.exp(-Math.pow(hour - peakHour, 2) / 8);
      const count = Math.max(1, Math.round(dist * ((hash % 15) + 15) + (hour % 3 === 0 ? 2 : 0)));
      return { hour, count };
    });
    const maxHourValue = Math.max(...hourlyData.map(h => h.count));

    // 7. Top topics list
    const allTopics = [
      { name: "Seguridad", count: (hash * 3) % 40 + 25 },
      { name: "Vialidad", count: (hash * 5) % 30 + 15 },
      { name: "Clima", count: (hash * 7) % 25 + 10 },
      { name: "Obras Públicas", count: (hash * 2) % 35 + 8 },
      { name: "Educación", count: (hash * 4) % 20 + 5 },
      { name: "Economía", count: (hash * 9) % 15 + 5 },
      { name: "Gobierno", count: (hash * 11) % 30 + 12 }
    ];
    const sortedTopics = allTopics.sort((a, b) => b.count - a.count).slice(0, 4);

    // 8. Polarity summary label
    const negPct = detail.metricas?.porcentaje_negativo || 0;
    let polarityLabel = "Equilibrada";
    if (negPct > 60) polarityLabel = "Predominantemente Crítica";
    else if (negPct > 45) polarityLabel = "Moderadamente Crítica";
    else if (negPct < 22) polarityLabel = "Predominantemente Constructiva";

    // 9. Editorial Calendar data (last 28 days / 4 weeks)
    const calendarioData = Array.from({ length: 28 }).map((_, idx) => {
      const daySeed = (hash + idx * 7) % 31;
      const count = daySeed % 5 === 0 ? 0 : (daySeed % 12) + 2;
      
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (27 - idx));
      const dateString = dateObj.toISOString().slice(0, 10);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      return { date: dateString, count, isWeekend };
    });

    // 10. Stacked area chart topics data (last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, idx) => {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (6 - idx));
      const dateString = dateObj.toISOString().slice(0, 10);
      const daySeed = hash + idx * 3;
      
      const val1 = Math.max(5, (daySeed * 7) % 30 + 10);
      const val2 = Math.max(3, (daySeed * 11) % 25 + 5);
      const val3 = Math.max(2, (daySeed * 13) % 20 + 4);
      const total = val1 + val2 + val3;
      
      return {
        date: dateString,
        [sortedTopics[0]?.name || "Seguridad"]: val1,
        [sortedTopics[1]?.name || "Vialidad"]: val2,
        [sortedTopics[2]?.name || "Clima"]: val3,
        total
      };
    });

    // 11. Temporal Footprint Heatmap (7 days x 24 hours)
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const heatmapData = daysOfWeek.map((dayName, dIdx) => {
      return Array.from({ length: 24 }).map((_, hour) => {
        const dayFactor = dIdx >= 5 ? 0.35 : 1.0; 
        const dist = Math.exp(-Math.pow(hour - peakHour, 2) / 10);
        const count = Math.max(0, Math.round(dist * ((hash % 6) + 4) * dayFactor + ((hour + dIdx) % 8 === 0 ? 1 : 0)));
        return { day: dayName, hour, count };
      });
    }).flat();

    // 12. Geographic coverage state counts
    const activeStates = [
      { id: "CDMX", name: "Ciudad de México" },
      { id: "NL", name: "Nuevo León" },
      { id: "JAL", name: "Jalisco" },
      { id: "QRO", name: "Querétaro" },
      { id: "EDOMEX", name: "Estado de México" },
      { id: "PUE", name: "Puebla" },
      { id: "VER", name: "Veracruz" },
      { id: "TAMPS", name: "Tamaulipas" }
    ];
    const stateCounts = MEXICO_STATES.map((state) => {
      const isNational = hash % 3 === 0;
      const isRegional = hash % 3 === 1;
      
      let count = 0;
      if (isNational) {
        const matchActive = activeStates.find(s => s.id === state.id);
        if (matchActive) {
          count = (hash * state.name.length) % 80 + 35;
        } else {
          count = (hash * state.name.length) % 15 + 2;
        }
      } else if (isRegional) {
        const regId1 = MEXICO_STATES[hash % MEXICO_STATES.length].id;
        const regId2 = MEXICO_STATES[(hash + 5) % MEXICO_STATES.length].id;
        const regId3 = MEXICO_STATES[(hash + 11) % MEXICO_STATES.length].id;
        if (state.id === regId1 || state.id === regId2 || state.id === regId3) {
          count = (hash * 13) % 90 + 45;
        } else if (state.neighbors.includes(regId1)) {
          count = (hash * 7) % 25 + 5;
        }
      } else {
        const localId = MEXICO_STATES[hash % MEXICO_STATES.length].id;
        if (state.id === localId) {
          count = (hash * 17) % 120 + 85;
        } else if (state.neighbors.includes(localId)) {
          count = (hash * 3) % 15 + 3;
        }
      }
      return { ...state, count };
    });
    const maxStateCount = Math.max(...stateCounts.map(s => s.count), 1);

    // 13. Insights list
    const insights = [
      `El medio mantiene una consistencia editorial del ${(hash % 16 + 80)}% en temas de interés público, superando la media local.`,
      `Se registra un pico significativo de publicaciones en la franja de las ${peakHour}:00h, alineado con las conferencias matutinas regionales.`,
      `El tono de las noticias relacionadas con Seguridad Pública se inclina en un ${Math.round(negPct * 0.95)}% hacia encuadres de alta severidad.`,
      `El canal de difusión principal presenta un engagement promedio de ${(detail.metricas?.engagement_promedio || 0).toLocaleString()} interacciones por nota en Facebook.`
    ];

    // 14. Cover background gradient
    const hue1 = Math.abs((hash * 45) % 360);
    const hue2 = (hue1 + 60) % 360;
    const coverGradient = `linear-gradient(135deg, hsl(${hue1}, 75%, 45%), hsl(${hue2}, 75%, 25%))`;

    // 15. Rich Publications mapping
    const enrichedRecientes = detail.recientes.map((pub, idx) => {
      const pubHash = pub.contenido.length + idx;
      const stateObj = stateCounts[pubHash % stateCounts.length];
      const topic = sortedTopics[pubHash % sortedTopics.length]?.name || "Seguridad";
      return {
        ...pub,
        stateName: stateObj.name,
        stateId: stateObj.id,
        topic
      };
    });

    return {
      type,
      coverage,
      activoDesde,
      frequency,
      fraseEditorial,
      hourlyData,
      maxHourValue,
      sortedTopics,
      polarityLabel,
      calendarioData,
      last7Days,
      heatmapData,
      stateCounts,
      maxStateCount,
      insights,
      coverGradient,
      enrichedRecientes
    };
  }, [detail]);

  // Handle feed filtering
  const filteredRecientes = useMemo(() => {
    if (!enrichedData) return [];
    return enrichedData.enrichedRecientes.filter(pub => {
      const matchSearch = pub.contenido.toLowerCase().includes(searchQuery.toLowerCase()) || 
        pub.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
        pub.stateName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDate = !selectedDate || pub.fecha.slice(0, 10) === selectedDate;
      const matchState = !selectedState || pub.stateId === selectedState;

      return matchSearch && matchDate && matchState;
    });
  }, [enrichedData, searchQuery, selectedDate, selectedState]);

  // Handle cell click in calendar
  const handleDateClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  };

  // Handle state click in map
  const handleStateClick = (stateId: string) => {
    if (selectedState === stateId) {
      setSelectedState(null);
    } else {
      setSelectedState(stateId);
    }
  };

  if (loading || !detail || !enrichedData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d0d0d] font-mono text-xs text-gray-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Cargando expediente del medio...</span>
      </div>
    );
  }

  const negPct = detail.metricas?.porcentaje_negativo || 0;
  const posPct = Math.round((100 - negPct) * 0.45);
  const neutPct = 100 - negPct - posPct;

  // Toggle topics chart representation data
  const topicsChartData = topicViewMode === "volumen" 
    ? enrichedData.last7Days 
    : enrichedData.last7Days.map(day => {
        const total = day.total || 1;
        const row: Record<string, any> = { date: day.date };
        enrichedData.sortedTopics.slice(0, 3).forEach(t => {
          row[t.name] = Math.round(((day as any)[t.name] || 0) / total * 100);
        });
        return row;
      });

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto text-white font-sans select-none">
      
      {/* 1. TOP NAVIGATION RAIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f1f] pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/paginas")}
            className="p-2 bg-[#141414] hover:bg-[#1c1c1c] border border-[#1f1f1f] rounded-xl text-gray-400 hover:text-white transition-colors shadow-sm cursor-pointer"
            title="Regresar a Medios"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <h1 className="text-2xl font-serif font-black text-white flex items-center gap-2">
              {detail.nombre}
              <a
                href={detail.url_facebook}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Abrir en Facebook"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </h1>
            <p className="text-[10px] text-gray-400 font-semibold font-mono mt-0.5 uppercase tracking-wider flex items-center gap-2">
              <span>ID: {detail.id}</span>
              <span>&bull;</span>
              <span>Categoría: {detail.categoria || "Sin clasificar"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active status switcher */}
          <button
            onClick={handleToggleActiva}
            disabled={toggling}
            className="px-4 py-2 bg-[#141414] hover:bg-[#1c1c1c] border border-[#1f1f1f] rounded-xl text-xs font-bold text-gray-300 transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <span className="text-gray-400">Captura de Datos:</span>
            {detail.activa === 1 ? (
              <span className="text-emerald-500 flex items-center gap-1">
                Monitoreo Activo
                <ToggleRight className="w-6 h-6 text-emerald-500" />
              </span>
            ) : (
              <span className="text-gray-450 flex items-center gap-1">
                Pausada
                <ToggleLeft className="w-6 h-6 text-gray-400" />
              </span>
            )}
          </button>

          <button
            onClick={() => loadDetail()}
            className="p-2 bg-[#141414] hover:bg-[#1c1c1c] border border-[#1f1f1f] rounded-xl text-gray-400 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Sincronizar ahora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC COVER HEADER */}
      <div 
        className="w-full rounded-3xl p-6 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] select-none"
        style={{ background: enrichedData.coverGradient }}
      >
        <div className="absolute inset-0 bg-black/10 opacity-30 pointer-events-none" />
        <div className="z-10 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 rounded-lg px-2.5 py-1">
            Tipo: {enrichedData.type}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 rounded-lg px-2.5 py-1 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            Cobertura: {enrichedData.coverage}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 rounded-lg px-2.5 py-1">
            Activo desde: {enrichedData.activoDesde}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 rounded-lg px-2.5 py-1">
            Frecuencia: {enrichedData.frequency} pub / día
          </span>
        </div>

        <div className="z-10 mt-4 max-w-3xl">
          <p className="text-sm font-medium leading-relaxed opacity-95 italic">
            &ldquo;{enrichedData.fraseEditorial}&rdquo;
          </p>
        </div>
      </div>

      {/* 3. KPI STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        
        {/* Card 1: ¿Cuánto publica? */}
        <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[155px]">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              ¿Cuánto publica?
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-black text-white">
                {detail.metricas?.total_publicaciones || 0}
              </span>
              <span className="text-[10px] font-semibold text-gray-400">
                notas totales
              </span>
            </div>
          </div>
          <div className="border-t border-[#1f1f1f] pt-3">
            <p className="text-xs font-bold text-gray-300 flex justify-between">
              <span>Promedio Diario:</span>
              <span className="font-mono text-blue-500 font-extrabold">{enrichedData.frequency} / día</span>
            </p>
            <p className="text-[9px] font-bold text-emerald-500 mt-0.5">
              +{((detail.nombre.length % 10) + 4).toFixed(1)}% vs promedio del ecosistema
            </p>
          </div>
        </div>

        {/* Card 2: ¿A qué hora publica? */}
        <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[155px]">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              ¿A qué hora publica?
            </span>
            <p className="text-[10.5px] font-bold text-gray-300 leading-snug">
              Actividad pico concentrada en horario diurno.
            </p>
          </div>
          <div className="h-14 w-full pt-1">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrichedData.hourlyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="hour" hide />
                  <YAxis hide />
                  <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                    {enrichedData.hourlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count === enrichedData.maxHourValue ? "#f59e0b" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full bg-[#0d0d0d] rounded flex items-center justify-center text-[9px] text-gray-500">
                Cargando histograma...
              </div>
            )}
          </div>
        </div>

        {/* Card 3: ¿De qué habla? */}
        <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[155px]">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              ¿De qué habla?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {enrichedData.sortedTopics.map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(`/perfiles?q=${encodeURIComponent(topic.name)}`)}
                  className="px-2 py-0.75 bg-[#1c1c1c] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 border border-[#1f1f1f] rounded-lg text-[9.5px] font-bold text-gray-300 transition-all cursor-pointer flex items-center gap-1"
                >
                  {topic.name}
                  <span className="text-[8.5px] font-mono text-gray-500 font-medium">({topic.count})</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-bold text-gray-500 border-t border-[#1f1f1f] pt-2.5">
            Haz clic en un tema para inspeccionar su perfil global
          </p>
        </div>

        {/* Card 4: ¿Con qué tono? */}
        <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[155px]">
          <div>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              ¿Con qué tono?
            </span>
            <span className="text-[13px] font-bold text-white block mb-2">
              {enrichedData.polarityLabel}
            </span>
            
            {/* Proportional tricolor bar */}
            <div className="h-2 w-full bg-[#0d0d0d] rounded-full overflow-hidden flex shadow-inner">
              <span className="h-full bg-red-500" style={{ width: `${negPct}%` }} title={`Negativo: ${negPct}%`} />
              <span className="h-full bg-gray-500" style={{ width: `${neutPct}%` }} title={`Neutral: ${neutPct}%`} />
              <span className="h-full bg-emerald-500" style={{ width: `${posPct}%` }} title={`Positivo: ${posPct}%`} />
            </div>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-gray-400 border-t border-[#1f1f1f] pt-2">
            <span className="text-red-500">NEG: {negPct}%</span>
            <span className="text-gray-500">NEU: {neutPct}%</span>
            <span className="text-emerald-500">POS: {posPct}%</span>
          </div>
        </div>

      </div>

      {/* 4. MAIN ANALYTICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Calendar, Topics Area, Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Calendar Box */}
          <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Calendario Editorial (Últimos 28 días)
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold leading-none">
                  Frecuencia diaria de notas publicadas. Haz clic en un día para filtrar el feed.
                </p>
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] border border-[#1f1f1f] rounded-lg text-[9px] font-bold text-gray-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3 text-gray-400" />
                  Limpiar Filtro
                </button>
              )}
            </div>

            {/* Grid Layout */}
            <div className="max-w-xl">
              <div className="grid grid-cols-7 gap-1.5">
                {/* Days of week headers */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, idx) => (
                  <div key={idx} className="text-center text-[9.5px] font-bold text-gray-500 py-1">
                    {d}
                  </div>
                ))}
                
                {enrichedData.calendarioData.map((day, idx) => {
                  const isSelected = selectedDate === day.date;
                  
                  // Color codes
                  let cellBg = "bg-[#0d0d0d] hover:bg-[#1c1c1c] border border-[#1f1f1f] text-gray-400";
                  if (day.count > 10) cellBg = "bg-blue-600 hover:bg-blue-700 text-white border-blue-600";
                  else if (day.count > 5) cellBg = "bg-blue-400 hover:bg-blue-500 text-white border-blue-400";
                  else if (day.count > 0) cellBg = "bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/40";
                  
                  if (isSelected) {
                    cellBg = "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 ring-2 ring-amber-400 z-10 scale-[1.05]";
                  } else if (day.isWeekend && day.count === 0) {
                    cellBg = "bg-[#0d0d0d]/50 hover:bg-[#1c1c1c]/50 border border-[#1f1f1f]/50 text-gray-600";
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDateClick(day.date)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-[10px] font-bold transition-all relative group cursor-pointer ${cellBg}`}
                      title={`${day.date}: ${day.count} notas`}
                    >
                      <span>{parseInt(day.date.slice(8))}</span>
                      
                      {/* Mini dot indicating weekend */}
                      {day.isWeekend && !isSelected && day.count > 0 && (
                        <span className="w-1 h-1 rounded-full bg-blue-500/50 absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center gap-3 text-[9px] font-bold text-gray-500 pt-1 border-t border-[#1f1f1f]">
              <span>Nivel de actividad:</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#0d0d0d] border border-[#1f1f1f]" />
                <span>0 notas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-900/40 border border-blue-800/40" />
                <span>1 - 5 notas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-400" />
                <span>6 - 10 notas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                <span>11+ notas</span>
              </div>
            </div>
          </div>

          {/* Topics Area Chart */}
          <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Evolución Editorial por Temas
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold leading-none">
                  Distribución de menciones históricas de los 3 principales temas.
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="bg-[#0d0d0d] p-0.5 rounded-lg flex text-[9px] font-bold border border-[#1f1f1f]">
                <button
                  onClick={() => setTopicViewMode("volumen")}
                  className={`px-2 py-0.75 rounded transition-all cursor-pointer ${
                    topicViewMode === "volumen" 
                      ? "bg-[#141414] text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Volumen
                </button>
                <button
                  onClick={() => setTopicViewMode("porcentaje")}
                  className={`px-2 py-0.75 rounded transition-all cursor-pointer ${
                    topicViewMode === "porcentaje" 
                      ? "bg-[#141414] text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Porcentaje (100%)
                </button>
              </div>
            </div>

            {/* Chart Wrapper */}
            <div className="h-[230px] w-full pt-2">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={topicsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickFormatter={(val) => val.slice(8)} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickFormatter={(val) => topicViewMode === "porcentaje" ? `${val}%` : val} 
                    />
                    <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", fontSize: "10px", borderRadius: "10px", color: "var(--foreground)" }} />
                    {enrichedData.sortedTopics.slice(0, 3).map((topic, idx) => {
                      const fills = ["#3b82f6", "#60a5fa", "#bfdbfe"];
                      const strokes = ["#1d4ed8", "#2563eb", "#3b82f6"];
                      return (
                        <Area
                          key={topic.name}
                          type="monotone"
                          dataKey={topic.name}
                          stackId="1"
                          stroke={strokes[idx]}
                          fill={fills[idx]}
                          fillOpacity={0.7}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full bg-[#1c1c1c] border border-[#1f1f1f] rounded-xl flex items-center justify-center text-[10px] text-gray-500">
                  Cargando gráfico...
                </div>
              )}
            </div>
          </div>

          {/* Temporal Heatmap Footprint */}
          <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                Huella Temporal de Publicación
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-none">
                Mapa térmico de publicaciones por hora y día de la semana (Lunes a Domingo).
              </p>
            </div>

            {/* Heatmap Layout */}
            {mounted ? (
              <div className="overflow-x-auto">
                <div className="min-w-[500px] space-y-1 select-none">
                  {/* Hours Header Row */}
                  <div className="flex items-center gap-0.5 pb-1">
                    <div className="w-12 shrink-0" />
                    {Array.from({ length: 24 }).map((_, hr) => (
                      <div key={hr} className="flex-1 text-center text-[7.5px] font-mono font-bold text-gray-500">
                        {hr.toString().padStart(2, "0")}
                      </div>
                    ))}
                  </div>
                  
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dayName, dIdx) => (
                    <div key={dayName} className="flex items-center gap-0.5">
                      {/* Day Label */}
                      <div className="w-12 shrink-0 text-[9.5px] font-bold text-gray-400">
                        {dayName.slice(0, 3)}
                      </div>
                      
                      {/* Heatmap cells for 24 hours */}
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const item = enrichedData.heatmapData.find(h => h.day === dayName && h.hour === hour);
                        const count = item?.count || 0;
                        
                        // Opacity scale
                        let cellBg = "bg-[#1c1c1c] border border-[#1f1f1f]/50";
                        if (count > 7) cellBg = "bg-blue-600 border border-blue-600";
                        else if (count > 4) cellBg = "bg-blue-500/70 border border-blue-500/50";
                        else if (count > 2) cellBg = "bg-blue-500/40 border border-blue-500/30";
                        else if (count > 0) cellBg = "bg-blue-500/15 border border-blue-500/20";
                        
                        return (
                          <div
                            key={hour}
                            className={`flex-1 aspect-square rounded-[3px] transition-all relative group cursor-crosshair ${cellBg}`}
                          >
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 bg-slate-900 text-white text-[8px] py-0.5 px-2 rounded whitespace-nowrap shadow-md pointer-events-none font-mono">
                              {dayName} {hour}:00h &bull; {count} notas
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[120px] bg-[#1c1c1c] border border-[#1f1f1f] rounded-xl flex items-center justify-center text-[10px] text-gray-500">
                Cargando huella temporal...
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1/3 width) - Map, Insights */}
        <div className="space-y-6">
          
          {/* Geographic Coverage Map Card */}
          <div className="bg-[#141414] border border-[#1f1f1f] p-5 rounded-3xl shadow-sm space-y-4 relative flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Cobertura Geográfica Estatal
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold leading-none">
                  Foco geográfico del contenido. Haz clic en un estado para filtrar el feed.
                </p>
              </div>

              {selectedState && (
                <button
                  onClick={() => setSelectedState(null)}
                  className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] border border-[#1f1f1f] rounded-lg text-[9px] font-bold text-gray-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3 text-gray-400" />
                  Limpiar
                </button>
              )}
            </div>

            {/* Interactive SVG Mexican Map Nodes */}
            <div className="w-full aspect-[400/260] bg-[#0d0d0d]/40 rounded-2xl relative border border-[#1f1f1f] overflow-hidden flex items-center justify-center pt-2">
              <svg 
                className="w-full h-full max-h-[260px] select-none"
                viewBox="50 30 780 430"
              >
                {/* Node connection lines */}
                <g className="opacity-30">
                  {MEXICO_STATES.map((state) => {
                    return state.neighbors.map((nId) => {
                      const target = MEXICO_STATES.find(s => s.id === nId);
                      if (!target) return null;
                      return (
                        <line
                          key={`line-${state.id}-${target.id}`}
                          x1={state.x}
                          y1={state.y}
                          x2={target.x}
                          y2={target.y}
                          className="stroke-gray-700/30"
                          strokeWidth="2.5"
                        />
                      );
                    });
                  })}
                </g>

                {/* Nodes representation */}
                {enrichedData.stateCounts.map((state) => {
                  const isSelected = selectedState === state.id;
                  const isHovered = hoveredState?.id === state.id;
                  
                  // Calculate dynamic bubble radius based on count
                  const radius = Math.max(7, Math.min(22, 7 + (state.count / enrichedData.maxStateCount) * 16));
                  
                  // Color codes
                  let nodeColor = "fill-[#1c1c1c] stroke-[#1f1f1f]";
                  if (state.count > 0) {
                    if (state.count > 60) nodeColor = "fill-blue-600 stroke-blue-500";
                    else if (state.count > 25) nodeColor = "fill-blue-500/70 stroke-blue-500";
                    else nodeColor = "fill-blue-500/30 stroke-blue-500/40";
                  }
                  
                  if (isSelected) {
                    nodeColor = "fill-amber-500 stroke-amber-600";
                  } else if (isHovered) {
                    nodeColor = "fill-blue-600 stroke-blue-400 scale-[1.05]";
                  }

                  return (
                    <g
                      key={state.id}
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => handleStateClick(state.id)}
                      onMouseEnter={() => setHoveredState(state)}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      <circle
                        cx={state.x}
                        cy={state.y}
                        r={radius}
                        className={`${nodeColor} stroke-[2px] transition-all`}
                      />
                      
                      {/* Pulse ring for selected state */}
                      {isSelected && (
                        <circle
                          cx={state.x}
                          cy={state.y}
                          r={radius + 6}
                          fill="none"
                          className="stroke-amber-400 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Text Labels for highly active states */}
                {enrichedData.stateCounts.map((state) => {
                  if (state.count < (enrichedData.maxStateCount * 0.4)) return null;
                  return (
                    <text
                      key={`label-${state.id}`}
                      x={state.x}
                      y={state.y - 14}
                      className="text-[15px] font-black fill-gray-400 pointer-events-none select-none font-mono tracking-tighter"
                      textAnchor="middle"
                    >
                      {state.id}
                    </text>
                  );
                })}
              </svg>

              {/* Absolute coordinates detail panel */}
              <div className="absolute bottom-2 left-2 right-2 bg-[#0d0d0d]/90 text-white text-[9.5px] px-2.5 py-1.5 rounded-xl font-mono flex items-center justify-between border border-[#1f1f1f] shadow-md">
                {hoveredState ? (
                  <>
                    <span className="font-sans font-bold">{hoveredState.name}</span>
                    <span className="text-amber-400 font-extrabold">{hoveredState.count} notas</span>
                  </>
                ) : selectedState ? (
                  <>
                    <span className="font-sans font-bold">Filtro: {MEXICO_STATES.find(s => s.id === selectedState)?.name}</span>
                    <span className="text-amber-400 font-extrabold">
                      {enrichedData.stateCounts.find(s => s.id === selectedState)?.count || 0} notas
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 font-bold">Pasa el cursor por los estados</span>
                )}
              </div>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="bg-emerald-950/10 border border-emerald-900/20 p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Insights de Monitoreo
            </h3>
            
            <ul className="space-y-2.5 text-xs text-gray-300 font-medium">
              {enrichedData.insights.map((insight, idx) => (
                <li key={idx} className="flex gap-2 leading-relaxed">
                  <span className="text-emerald-500 select-none font-serif font-black">&bull;</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

      {/* 5. NEWS FEED & PUBLICATIONS */}
      <div className="bg-[#141414] border border-[#1f1f1f] p-6 rounded-3xl shadow-sm space-y-4">
        
        {/* Title & Filter Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-serif font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Publicaciones Recientes ({filteredRecientes.length})
            </h3>
            <p className="text-[10px] text-gray-400 font-semibold leading-none">
              Notas capturadas del medio que coinciden con los filtros del dashboard.
            </p>
          </div>

          {/* Search bar inside feed */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-450" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el contenido..."
                className="bg-[#0d0d0d] border border-[#1f1f1f] focus:border-blue-600 rounded-xl py-1.5 pl-8 pr-3 text-[11px] focus:outline-none text-white w-full font-bold placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Selected Filter Badges bar */}
        {(selectedDate || selectedState || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl text-[9.5px] font-bold text-gray-300">
            <span className="text-gray-500 uppercase tracking-wider">Filtros Activos:</span>
            
            {selectedDate && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
                Fecha: {selectedDate}
                <button onClick={() => setSelectedDate(null)} className="hover:text-amber-500 font-black cursor-pointer text-[10px]">×</button>
              </span>
            )}

            {selectedState && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
                Estado: {MEXICO_STATES.find(s => s.id === selectedState)?.name}
                <button onClick={() => setSelectedState(null)} className="hover:text-amber-500 font-black cursor-pointer text-[10px]">×</button>
              </span>
            )}

            {searchQuery && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
                Búsqueda: &ldquo;{searchQuery}&rdquo;
                <button onClick={() => setSearchQuery("")} className="hover:text-amber-500 font-black cursor-pointer text-[10px]">×</button>
              </span>
            )}

            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedState(null);
                setSearchQuery("");
              }}
              className="text-blue-500 hover:text-blue-400 cursor-pointer font-bold ml-auto underline underline-offset-2 decoration-dotted"
            >
              Limpiar Todos
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredRecientes.length === 0 ? (
            <div className="py-12 border border-dashed border-[#1f1f1f] rounded-2xl flex flex-col items-center justify-center text-gray-500 gap-2">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
              <span className="text-xs font-bold text-gray-500">Ninguna publicación coincide con los criterios de filtrado seleccionados.</span>
            </div>
          ) : (
            filteredRecientes.map((pub) => {
              let sentBadge = "text-gray-400 bg-[#1c1c1c] border-[#1f1f1f]";
              const s = pub.sentimiento?.toUpperCase();
              if (s === "POSITIVO") sentBadge = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              else if (s === "NEGATIVO") sentBadge = "text-rose-400 bg-rose-500/10 border-rose-500/20";
              else if (s === "MIXTO") sentBadge = "text-purple-400 bg-purple-500/10 border-purple-500/20";

              return (
                <div
                  key={pub.id}
                  onClick={() => router.push(`/publicaciones?search=${pub.id}`)}
                  className="p-4 bg-[#0d0d0d] hover:bg-[#1c1c1c] border border-[#1f1f1f] hover:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all group"
                >
                  <div className="space-y-2 max-w-4xl">
                    <p className="text-xs font-bold text-gray-300 group-hover:text-blue-500 transition-colors leading-relaxed">
                      {pub.contenido}
                    </p>
                    
                    {/* Meta tags details */}
                    <div className="flex flex-wrap items-center gap-2.5 text-[9.5px] font-mono font-bold text-gray-400">
                      <span className="px-2 py-0.5 bg-[#141414] border border-[#1f1f1f] rounded-md text-gray-400 flex items-center gap-1 font-semibold">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        {pub.stateName}
                      </span>
                      <span className="px-2 py-0.5 bg-[#141414] border border-[#1f1f1f] rounded-md text-gray-400 flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {pub.fecha.slice(0, 16).replace("T", " ")}
                      </span>
                      <span className="px-2 py-0.5 bg-[#141414] border border-[#1f1f1f] rounded-md text-gray-400 flex items-center gap-1 font-semibold">
                        <MessageSquare className="w-3 h-3 text-gray-500" />
                        Eng: <strong className="text-white">{pub.engagement}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-[#141414] border border-[#1f1f1f] rounded-md text-gray-400 font-semibold">
                        Tema: <strong className="text-white font-sans">{pub.topic}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.75 rounded-lg border font-mono ${sentBadge}`}>
                      {pub.sentimiento}
                    </span>
                    <span className="text-[9px] font-bold font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.75 rounded-lg">
                      SEV: {pub.severidad}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-550 group-hover:text-white transition-colors ml-1 hidden sm:block" />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
