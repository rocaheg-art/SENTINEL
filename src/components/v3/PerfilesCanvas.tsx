"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useV3Context } from "@/context/V3Context";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Tv, 
  Tag, 
  MapPin, 
  Search, 
  X, 
  Share2, 
  Download, 
  Plus, 
  Check, 
  ChevronDown, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  BookOpen, 
  Clock, 
  ExternalLink, 
  Flame, 
  SlidersHorizontal,
  Layers,
  ArrowLeftRight,
  Bell
} from "lucide-react";
import ComparativeCanvas from "./ComparativeCanvas";
import ReportBuilderCanvas from "./ReportBuilderCanvas";
import { getPublications, getPages, getPageDetail, Publication, FacebookPage, PageDetailResponse } from "@/lib/api";

interface RecentProfile {
  name: string;
  type: "Medio" | "Persona" | "Tema" | "Lugar";
  gradient: string;
  trend: string;
}

const RECENT_PROFILES: RecentProfile[] = [
  { name: "alertaqro", type: "Medio", gradient: "from-blue-600 to-cyan-500", trend: "Monitoreo activo" },
  { name: "MauricioKuriGonzalez", type: "Persona", gradient: "from-purple-600 to-indigo-500", trend: "Gobernador Qro" },
  { name: "DiarioQro", type: "Medio", gradient: "from-emerald-600 to-teal-500", trend: "Prensa Local" },
  { name: "FeliferMaciasO", type: "Persona", gradient: "from-indigo-600 to-blue-500", trend: "Alcalde electo" },
  { name: "ElUniversalQueretaro", type: "Medio", gradient: "from-rose-600 to-orange-500", trend: "Prensa Nacional" },
  { name: "GobQro", type: "Lugar", gradient: "from-amber-600 to-yellow-500", trend: "Canal Oficial" }
];

const MOST_VISITED_PROFILES: RecentProfile[] = [
  { name: "24NoticiasQueretaro", type: "Medio", gradient: "from-red-600 to-rose-500", trend: "Últimas noticias" },
  { name: "informateqro", type: "Medio", gradient: "from-fuchsia-600 to-pink-500", trend: "Monitoreo vial" },
  { name: "fiscaliaqro", type: "Lugar", gradient: "from-blue-700 to-indigo-600", trend: "Canal Oficial" },
  { name: "AsiSucedeQro", type: "Medio", gradient: "from-teal-750 to-cyan-600", trend: "Prensa radial" },
  { name: "CripticaNoticias", type: "Medio", gradient: "from-sky-600 to-blue-500", trend: "Últimas noticias" },
  { name: "ChepeGro", type: "Persona", gradient: "from-emerald-600 to-green-500", trend: "Figura Pública" }
];

export default function PerfilesCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addSessionLog, subscribedEntities, toggleSubscribeEntity } = useV3Context();
  
  const queryParam = searchParams.get("q") || "";
  
  // Search input state
  const [searchVal, setSearchVal] = useState("");
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<"Medio" | "Persona" | "Tema" | "Lugar">("Tema");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  
  // Suggestions states
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);
  
  // Progress loader state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
  // Favoriting state
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Hover state for GitHub heatmap
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; headlines: string[] } | null>(null);

  // Filters State
  const [period, setPeriod] = useState<"semana" | "mes" | "todo">("mes");
  const [sources, setSources] = useState<string[]>(["medios", "facebook"]);
  const [tones, setTones] = useState<string[]>(["positivo", "neutral", "negativo"]);
  const [sortFeedBy, setSortFeedBy] = useState<"reciente" | "mencionado" | "relevante">("reciente");
  
  // Comparador State
  const [isComparing, setIsComparing] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [comparedProfile, setComparedProfile] = useState<string | null>(null);
  const [isCompareSuggestionsOpen, setIsCompareSuggestionsOpen] = useState(false);

  // Network node hover state
  const [hoveredNode, setHoveredNode] = useState<{ name: string; relation: string } | null>(null);
  
  // Sources sort state
  const [sourcesSort, setSourcesSort] = useState<"volumen" | "relevancia">("volumen");

  // News Feed state
  const [feedQuery, setFeedQuery] = useState("");
  const [loadedNewsCount, setLoadedNewsCount] = useState(10);
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // Live Backend Data States
  const [dbPages, setDbPages] = useState<FacebookPage[]>([]);
  const [activePublications, setActivePublications] = useState<Publication[]>([]);
  const [comparedPublications, setComparedPublications] = useState<Publication[]>([]);
  const [activePageDetail, setActivePageDetail] = useState<PageDetailResponse | null>(null);
  const [comparedPageDetail, setComparedPageDetail] = useState<PageDetailResponse | null>(null);
  
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>(RECENT_PROFILES);

  const formatDayName = (dateStr: string) => {
    if (!dateStr) return "N/A";
    if (dateStr.startsWith("Día")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 2) {
      const monthNum = parseInt(parts[0], 10);
      const dayNum = parseInt(parts[1], 10);
      const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const monthName = months[monthNum - 1] || parts[0];
      return `${dayNum} de ${monthName}`;
    }
    return dateStr;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderList = [
    "Busca un tema...",
    "Busca un medio...",
    "Busca una persona...",
    "Busca un lugar..."
  ];

  // Preload pages on mount
  useEffect(() => {
    async function fetchPages() {
      try {
        const pages = await getPages();
        setDbPages(pages);
      } catch (err) {
        console.error("Error fetching pages in Perfiles V2:", err);
      }
    }
    fetchPages();
  }, []);

  // Retrieve searched terms from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sentinel_recent_profiles");
      if (saved) {
        try {
          setRecentProfiles(JSON.parse(saved));
        } catch (e) {}
      } else {
        setRecentProfiles(RECENT_PROFILES);
      }
    }
  }, []);

  // Sync recent searches to localStorage
  const addRecentProfile = (name: string, type: "Medio" | "Persona" | "Tema" | "Lugar") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 45) % 360;
    const gradient = `from-[hsl(${hue1},65%,45%)] to-[hsl(${hue2},65%,30%)]`;
    
    setRecentProfiles((prev) => {
      const updated = [
        { name, type, gradient, trend: "Consultado hoy" },
        ...prev.filter(p => p.name.toLowerCase() !== name.toLowerCase())
      ].slice(0, 6);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("sentinel_recent_profiles", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Rotate placeholder every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderList.length);
        setPlaceholderFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch profile data from backend
  const fetchProfileData = async (name: string, isForComparison = false) => {
    try {
      const q = name.toLowerCase();
      const pageMatch = dbPages.find(p => p.nombre.toLowerCase() === q);
      
      if (pageMatch) {
        const detail = await getPageDetail(pageMatch.id);
        const pubs = await getPublications({ pagina_id: pageMatch.id, limit: 100 });
        if (isForComparison) {
          setComparedPageDetail(detail);
          setComparedPublications(pubs.data);
        } else {
          setActivePageDetail(detail);
          setActivePublications(pubs.data);
        }
      } else {
        const pubs = await getPublications({ search: name, limit: 100 });
        if (isForComparison) {
          setComparedPublications(pubs.data);
          setComparedPageDetail(null);
        } else {
          setActivePublications(pubs.data);
          setActivePageDetail(null);
        }
      }
    } catch (err) {
      console.error(`Error loading profile data for ${name}:`, err);
    }
  };

  // Sync search input and trigger analysis from query param
  useEffect(() => {
    if (queryParam) {
      setSearchVal(queryParam);
      const type = detectEntityType(queryParam);
      setDetectedType(type);
      setIsAnalyzing(true);
      setAnalysisStep(0);
      setShowFullAnalysis(false);
      setComparedProfile(null);
      setIsComparing(false);
      setLoadedNewsCount(10);
      addRecentProfile(queryParam, type);
      addSessionLog(`Perfiles: Cargando datos del backend para: "${queryParam}"`);

      // Fetch dynamic data from backend
      fetchProfileData(queryParam, false);

      const t1 = setTimeout(() => setAnalysisStep(1), 400); 
      const t2 = setTimeout(() => setAnalysisStep(2), 1000); 
      const t3 = setTimeout(() => setAnalysisStep(3), 1600); 
      const t4 = setTimeout(() => {
        setIsAnalyzing(false);
        setActiveProfile(queryParam);
        addSessionLog(`Perfiles: Análisis completado exitosamente para "${queryParam}"`);
      }, 2000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      setActiveProfile(null);
      setComparedProfile(null);
      setIsComparing(false);
    }
  }, [queryParam, dbPages]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsSuggestionsOpen(false);
      setIsCompareSuggestionsOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Keyboard shortcut: Escape closes overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSuggestionsOpen(false);
        setIsCompareSuggestionsOpen(false);
        setShowTypeSelector(false);
        setSelectedArticle(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Real-time automatic entity type detection
  const detectEntityType = (val: string) => {
    const text = val.toLowerCase();
    if (!text.trim()) return "Tema";
    
    if (
      text.includes("milenio") || text.includes("universal") || text.includes("diario") ||
      text.includes("sol") || text.includes("canal") || text.includes("prensa") ||
      text.includes("noticias") || text.includes("radio") || text.includes("facebook")
    ) {
      return "Medio";
    }
    if (
      text.includes("kuri") || text.includes("nava") || text.includes("sheinbaum") ||
      text.includes("luis") || text.includes("claudia") || text.includes("mauricio") ||
      text.includes("alcalde") || text.includes("gobernador") || text.includes("secretario") ||
      text.includes("diputado") || text.includes("presidente") || text.includes("figura")
    ) {
      return "Persona";
    }
    if (
      text.includes("querétaro") || text.includes("qro") || text.includes("san juan") ||
      text.includes("del río") || text.includes("marqués") || text.includes("corregidora") ||
      text.includes("cadereyta") || text.includes("jalpan") || text.includes("tequisquiapan") ||
      text.includes("colonia") || text.includes("lugar") || text.includes("ciudad") ||
      text.includes("municipio")
    ) {
      return "Lugar";
    }
    return "Tema";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    setDetectedType(detectEntityType(val));
    setIsSuggestionsOpen(true);
  };

  const triggerAnalysis = (name: string) => {
    router.push(`/perfiles?q=${encodeURIComponent(name)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      triggerAnalysis(searchVal.trim());
    }
  };

  const handleCompareSubmit = (name: string) => {
    setComparedProfile(name);
    setIsCompareSuggestionsOpen(false);
    fetchProfileData(name, true);
    addSessionLog(`Perfiles: Comparando perfil de "${activeProfile}" con "${name}"`);
  };

  // Consistent cover gradient hashing
  const coverGradient = useMemo(() => {
    if (!activeProfile) return "linear-gradient(135deg, #1e293b, #0f172a)";
    let hash = 0;
    for (let i = 0; i < activeProfile.length; i++) {
      hash = activeProfile.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 60) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 75%, 45%), hsl(${hue2}, 75%, 30%))`;
  }, [activeProfile]);

  // Accent HSL color matching
  const accentColorHSL = useMemo(() => {
    if (!activeProfile) return "hsl(220, 75%, 45%)";
    let hash = 0;
    for (let i = 0; i < activeProfile.length; i++) {
      hash = activeProfile.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash % 360)}, 75%, 45%)`;
  }, [activeProfile]);

  // Custom mock analytics data generator based on entity hash
  // Custom mock analytics data generator based on entity hash
  // Custom mock analytics data generator based on entity hash
  // Filtered publications based on active filters (Period, Sources, Tones)
  const filteredPublications = useMemo(() => {
    let pubs = [...activePublications];

    // Filter by period
    const refToday = new Date("2026-07-16");
    if (period === "semana") {
      const limitDate = new Date(refToday);
      limitDate.setDate(refToday.getDate() - 7);
      pubs = pubs.filter(p => {
        const d = new Date(p.fecha_publicacion || p.fecha_registro);
        return d >= limitDate;
      });
    } else if (period === "mes") {
      const limitDate = new Date(refToday);
      limitDate.setDate(refToday.getDate() - 30);
      pubs = pubs.filter(p => {
        const d = new Date(p.fecha_publicacion || p.fecha_registro);
        return d >= limitDate;
      });
    }

    // Filter by source type
    if (sources.length < 2) {
      if (sources.includes("medios")) {
        pubs = pubs.filter(p => !p.enlace?.includes("facebook.com"));
      } else if (sources.includes("facebook")) {
        pubs = pubs.filter(p => p.enlace?.includes("facebook.com"));
      } else {
        pubs = [];
      }
    }

    // Filter by tone
    pubs = pubs.filter(p => tones.includes((p.sentimiento || "").toLowerCase()));

    return pubs;
  }, [activePublications, period, sources, tones]);

  // Filtered compared publications
  const filteredComparedPublications = useMemo(() => {
    let pubs = [...comparedPublications];

    const refToday = new Date("2026-07-16");
    if (period === "semana") {
      const limitDate = new Date(refToday);
      limitDate.setDate(refToday.getDate() - 7);
      pubs = pubs.filter(p => {
        const d = new Date(p.fecha_publicacion || p.fecha_registro);
        return d >= limitDate;
      });
    } else if (period === "mes") {
      const limitDate = new Date(refToday);
      limitDate.setDate(refToday.getDate() - 30);
      pubs = pubs.filter(p => {
        const d = new Date(p.fecha_publicacion || p.fecha_registro);
        return d >= limitDate;
      });
    }

    if (sources.length < 2) {
      if (sources.includes("medios")) {
        pubs = pubs.filter(p => !p.enlace?.includes("facebook.com"));
      } else if (sources.includes("facebook")) {
        pubs = pubs.filter(p => p.enlace?.includes("facebook.com"));
      } else {
        pubs = [];
      }
    }

    pubs = pubs.filter(p => tones.includes((p.sentimiento || "").toLowerCase()));

    return pubs;
  }, [comparedPublications, period, sources, tones]);

  // Custom mock analytics data generator based on entity hash
  const profileData = useMemo(() => {
    if (!activeProfile) return null;
    const len = activeProfile.length;
    
    // Check if we have real publications
    const hasRealData = activePublications.length > 0;
    
    // Mock scaling parameters based on filters when hasRealData is false
    let mockScale = 1.0;
    if (period === "semana") mockScale *= 0.25;
    else if (period === "todo") mockScale *= 2.8;

    mockScale *= (sources.length / 2);
    mockScale *= (tones.length / 3);

    const totalNews = hasRealData 
      ? filteredPublications.length 
      : Math.round((activePageDetail ? (activePageDetail.metricas?.total_publicaciones || 0) : len * 19 + 78) * mockScale);
      
    const daysCount = period === "semana" ? 7 : period === "mes" ? 30 : 90;
    const averagePerDay = (totalNews / daysCount).toFixed(1);
    const delta = (len % 3) * 12 + 10;
    const isUp = len % 2 === 0;

    // Heatmap cell generator: 53 weeks x 7 days
    const baseDate = new Date("2026-07-16"); // local time metadata
    const heatmapGrid: { count: number; date: string; headlines: string[] }[][] = [];
    
    // Group real data by date for heatmap
    const realDateMap: Record<string, { count: number; headlines: string[] }> = {};
    if (hasRealData) {
      filteredPublications.forEach(p => {
        const dateStr = (p.fecha_publicacion || p.fecha_registro || "").slice(0, 10);
        if (dateStr) {
          if (!realDateMap[dateStr]) {
            realDateMap[dateStr] = { count: 0, headlines: [] };
          }
          realDateMap[dateStr].count += 1;
          if (realDateMap[dateStr].headlines.length < 3) {
            realDateMap[dateStr].headlines.push(p.contenido.slice(0, 60) + "...");
          }
        }
      });
    }

    const headlinesMock = [
      `Reporte crítico vial en zona metropolitana de Querétaro`,
      `Declaraciones de actores políticos sobre avances hidráulicos`,
      `Retrasos de Qrobús causan embotellamientos viales`,
      `Inundaciones menores reportadas en delegación Felipe Carrillo`,
      `Operativo de seguridad se despliega en avenidas principales`,
      `Nuevas regulaciones de transporte anunciadas por gobierno`,
      `Menciones en redes sociales sobre congestionamiento por lluvias`
    ];

    for (let w = 0; w < 53; w++) {
      const week: { count: number; date: string; headlines: string[] }[] = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() - (53 - w) * 7 + d);
        const dateStr = currentDate.toISOString().split("T")[0];
        
        let count = 0;
        let dayHeadlines: string[] = [];

        if (hasRealData) {
          const realDay = realDateMap[dateStr];
          if (realDay) {
            count = realDay.count;
            dayHeadlines = realDay.headlines;
          }
        } else {
          const seedVal = currentDate.getDate() + currentDate.getMonth() + len;
          if (seedVal % 8 === 0) count = Math.round(((seedVal % 15) + 3) * mockScale);
          else if (seedVal % 5 === 0) count = Math.round((seedVal % 5) * mockScale);
          else if (seedVal % 3 === 0) count = Math.round((seedVal % 2) * mockScale);

          dayHeadlines = Array.from({ length: Math.min(3, count) }).map(
            () => headlinesMock[Math.floor(Math.random() * headlinesMock.length)]
          );
        }

        week.push({ count, date: dateStr, headlines: dayHeadlines });
      }
      heatmapGrid.push(week);
    }

    // Sources list by grouping real publications
    const realSourcesGroup: Record<string, number> = {};
    if (hasRealData) {
      filteredPublications.forEach(p => {
        realSourcesGroup[p.pagina_nombre] = (realSourcesGroup[p.pagina_nombre] || 0) + 1;
      });
    }
    const sortedSources = Object.entries(realSourcesGroup)
      .map(([name, count]) => ({
        name,
        type: name.toLowerCase().includes("facebook") ? "Facebook" : "Medio",
        count,
        rel: Math.round((count / (filteredPublications.length || 1)) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    let sourcesList = sortedSources;
    if (sourcesList.length === 0) {
      if (activePageDetail) {
        sourcesList = [
          { name: activePageDetail.nombre, type: "Medio", count: activePageDetail.metricas?.total_publicaciones || 0, rel: 100 }
        ];
      } else {
        sourcesList = [
          { name: "Alerta Vial Querétaro", type: "Facebook", count: Math.round(totalNews * 0.35), rel: 95 },
          { name: "Diario de Querétaro", type: "Medio", count: Math.round(totalNews * 0.22), rel: 84 },
          { name: "RR Noticias Qro", type: "Medio", count: Math.round(totalNews * 0.18), rel: 76 },
          { name: "Facebook Monitoreo Urbano", type: "Facebook", count: Math.round(totalNews * 0.12), rel: 60 },
          { name: "El Sol de San Juan", type: "Medio", count: Math.round(totalNews * 0.08), rel: 52 },
          { name: "Círculo Querétaro", type: "Medio", count: Math.round(totalNews * 0.05), rel: 40 }
        ];
      }
    }

    // Filter sourcesList by selected sources types
    let filteredSourcesList = sourcesList;
    if (sources.length < 2) {
      if (sources.includes("medios")) {
        filteredSourcesList = sourcesList.filter(s => s.type === "Medio");
      } else if (sources.includes("facebook")) {
        filteredSourcesList = sourcesList.filter(s => s.type === "Facebook");
      } else {
        filteredSourcesList = [];
      }
    }

    // Daily counts for chartData
    const dailyCounts: { date: string; count: number }[] = [];
    if (hasRealData) {
      const countsMap: Record<string, number> = {};
      filteredPublications.forEach(p => {
        const dateStr = (p.fecha_publicacion || p.fecha_registro || "").slice(5, 10);
        if (dateStr) countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
      });
      Object.entries(countsMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, count]) => dailyCounts.push({ date, count }));
    } else if (activePageDetail && activePageDetail.graficas?.publicaciones_por_dia) {
      activePageDetail.graficas.publicaciones_por_dia.forEach(g => {
        dailyCounts.push({ date: g.dia.slice(5, 10), count: g.count });
      });
    }

    const chartDataLength = period === "semana" ? 7 : 12;

    let chartData: { date: string; count: number; isAnomaly: boolean }[] = [];
    if (dailyCounts.length >= 5) {
      const sorted = dailyCounts.sort((a, b) => a.date.localeCompare(b.date)).slice(-chartDataLength);
      const counts = sorted.map(d => d.count);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance) || 1;
      chartData = sorted.map(d => ({
        date: d.date,
        count: d.count,
        isAnomaly: d.count > mean + 1.5 * stdDev
      }));
    } else {
      chartData = Array.from({ length: chartDataLength }).map((_, i) => {
        const count = Math.round((Math.abs(Math.sin((i + len) * 0.7) * 45) + (i === 4 ? 60 : 15) + (i % 2 === 0 ? 12 : 5)) * mockScale);
        const date = `06-${14 + i}`;
        const isAnomaly = i === 4; 
        return { date, count, isAnomaly };
      });
    }

    // Process comparison data if active
    let compareChartData: { date: string; count: number }[] = [];
    let compareSparklinePoints: { x: number; y: number }[] = [];
    const hasCompareData = comparedPublications.length > 0;

    if (comparedProfile) {
      const compLen = comparedProfile.length;
      const compareDailyCounts: { date: string; count: number }[] = [];

      if (hasCompareData) {
        const countsMap: Record<string, number> = {};
        filteredComparedPublications.forEach(p => {
          const dateStr = (p.fecha_publicacion || p.fecha_registro || "").slice(5, 10);
          if (dateStr) countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
        });
        Object.entries(countsMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, count]) => compareDailyCounts.push({ date, count }));
      } else if (comparedPageDetail && comparedPageDetail.graficas?.publicaciones_por_dia) {
        comparedPageDetail.graficas.publicaciones_por_dia.forEach(g => {
          compareDailyCounts.push({ date: g.dia.slice(5, 10), count: g.count });
        });
      }

      if (compareDailyCounts.length >= 5) {
        const sorted = compareDailyCounts.sort((a, b) => a.date.localeCompare(b.date)).slice(-chartDataLength);
        compareChartData = sorted.map(d => ({ date: d.date, count: d.count }));
      } else {
        compareChartData = Array.from({ length: chartDataLength }).map((_, i) => {
          const count = Math.round((Math.abs(Math.sin((i + compLen) * 0.7) * 45) + 10 + (i % 2 === 0 ? 8 : 4)) * mockScale);
          const date = `06-${14 + i}`;
          return { date, count };
        });
      }

      // Compute sparkline points for comparison
      const compMaxVal = Math.max(...compareChartData.map(d => d.count), 1);
      const compMinVal = Math.min(...compareChartData.map(d => d.count), 0);
      const compValRange = compMaxVal - compMinVal || 1;

      if (compareChartData.length >= 10) {
        const step = 280 / (compareChartData.length - 1);
        compareSparklinePoints = compareChartData.map((d, i) => {
          const normY = (d.count - compMinVal) / compValRange;
          const y = 45 - normY * 35;
          return { x: i * step, y };
        });
      } else {
        compareSparklinePoints = Array.from({ length: 15 }).map((_, i) => {
          const y = Math.sin((i + compLen) * 0.8) * 15 + 25 + (i % 3 === 0 ? 10 : 0);
          return { x: i * 20, y: 50 - y };
        });
      }
    }

    const maxValInChart = Math.max(
      ...chartData.map(d => d.count),
      ...(compareChartData ? compareChartData.map(d => d.count) : []),
      1
    );
    const chartScale = 90 / maxValInChart;
    const chartStep = 297 / (chartData.length - 1 || 1);

    // Sparkline points (15 points map to width 280, height 50)
    let sparklinePoints: { x: number; y: number }[] = [];
    const maxVal = Math.max(...chartData.map(d => d.count), 1);
    const minVal = Math.min(...chartData.map(d => d.count), 0);
    const valRange = maxVal - minVal || 1;

    if (chartData.length >= 10) {
      const step = 280 / (chartData.length - 1);
      sparklinePoints = chartData.map((d, i) => {
        const normY = (d.count - minVal) / valRange;
        const y = 45 - normY * 35;
        return { x: i * step, y };
      });
    } else {
      sparklinePoints = Array.from({ length: 15 }).map((_, i) => {
        const y = Math.sin((i + len) * 0.8) * 15 + 25 + (i % 3 === 0 ? 10 : 0);
        return { x: i * 20, y: 50 - y };
      });
    }

    // Find maximum day in chartData
    let maxDay = chartData[0];
    chartData.forEach(d => {
      if (d.count > (maxDay?.count || 0)) {
        maxDay = d;
      }
    });

    // Sentiment percentages
    let negPct = 20;
    let posPct = 25;
    let neutPct = 55;
    let dominantSentimentText = "Principalmente Neutro";

    if (hasRealData) {
      let negCount = 0;
      let neutCount = 0;
      let posCount = 0;
      filteredPublications.forEach(p => {
        const s = (p.sentimiento || "").toLowerCase();
        if (s === "positivo") posCount++;
        else if (s === "negativo") negCount++;
        else neutCount++;
      });
      const totalSent = negCount + neutCount + posCount || 1;
      negPct = Math.round((negCount / totalSent) * 100);
      posPct = Math.round((posCount / totalSent) * 100);
      neutPct = 100 - negPct - posPct;
    } else if (activePageDetail && activePageDetail.graficas?.distribucion_sentimiento) {
      const dist = activePageDetail.graficas.distribucion_sentimiento;
      const negCount = tones.includes("negativo") ? (dist.negativo || 0) : 0;
      const posCount = tones.includes("positivo") ? (dist.positivo || 0) : 0;
      const neutCount = tones.includes("neutral") ? (dist.neutral || 0) : 0;
      const totalSent = negCount + neutCount + posCount || 1;
      negPct = Math.round((negCount / totalSent) * 100);
      posPct = Math.round((posCount / totalSent) * 100);
      neutPct = 100 - negPct - posPct;
    } else {
      const seedVal = len;
      const negCount = tones.includes("negativo") ? ((seedVal % 5) + 2) : 0;
      const posCount = tones.includes("positivo") ? ((seedVal % 3) + 3) : 0;
      const neutCount = tones.includes("neutral") ? Math.max(1, Math.round(totalNews * 0.55)) : 0;
      const totalSent = negCount + neutCount + posCount || 1;
      negPct = Math.round((negCount / totalSent) * 100);
      posPct = Math.round((posCount / totalSent) * 100);
      neutPct = 100 - negPct - posPct;
    }

    if (negPct > posPct && negPct > neutPct) {
      dominantSentimentText = "Tendencia Negativa";
    } else if (posPct > negPct && posPct > neutPct) {
      dominantSentimentText = "Mayormente Positivo";
    } else {
      dominantSentimentText = "Principalmente Neutro";
    }

    // Relation graph nodes
    const relationNodes = (() => {
      const labels: { label: string; type: "Medio" | "Persona" | "Tema" | "Lugar"; count: number }[] = [];
      filteredSourcesList.forEach((s) => {
        if (labels.length < 3) {
          labels.push({
            label: s.name.split(" ")[0],
            type: s.type as any,
            count: s.count
          });
        }
      });
      const fallbackTerms: { label: string; type: "Medio" | "Persona" | "Tema" | "Lugar"; count: number }[] = [
        { label: "Tránsito", type: "Tema", count: Math.round(totalNews * 0.4) },
        { label: "Lluvias", type: "Tema", count: Math.round(totalNews * 0.3) },
        { label: "Qro", type: "Lugar", count: Math.round(totalNews * 0.5) },
        { label: "Vial", type: "Tema", count: Math.round(totalNews * 0.6) },
        { label: "Nava", type: "Persona", count: Math.round(totalNews * 0.25) }
      ];
      fallbackTerms.forEach(t => {
        if (labels.length < 5 && !labels.some(l => l.label.toLowerCase() === t.label.toLowerCase())) {
          labels.push(t);
        }
      });
      const coords = [
        { x: 100, y: 70 },
        { x: 300, y: 80 },
        { x: 150, y: 160 },
        { x: 260, y: 170 },
        { x: 200, y: 50 }
      ];
      return labels.map((l, i) => {
        const coord = coords[i] || { x: 100 + i * 20, y: 100 };
        const r = Math.min(16, Math.max(10, 10 + (l.count / (totalNews || 1)) * 10));
        const w = Math.min(5, Math.max(1, 1 + (l.count / (totalNews || 1)) * 4));
        return {
          x: coord.x,
          y: coord.y,
          r,
          w,
          label: l.label,
          type: l.type,
          rel: `Mencionado en ${l.count} notas`
        };
      });
    })();

    // News feed list
    const newsList = hasRealData ? filteredPublications.map((p) => ({
      id: p.id,
      pagina_nombre: p.pagina_nombre,
      pagina_tipo: p.enlace?.includes("facebook.com") ? "Facebook" : "Medio",
      contenido: p.contenido,
      sentimiento: p.sentimiento || "neutral",
      fecha_registro: p.fecha_publicacion || p.fecha_registro,
      enlace: p.enlace || "https://facebook.com/sentinel_analytics_mock"
    })) : Array.from({ length: 40 }).map((_, idx) => {
      const source = filteredSourcesList[idx % filteredSourcesList.length] || { name: "Sentinel Analítico", type: "Medio", count: 10, rel: 50 };
      const tone = idx % 3 === 0 ? "negativo" : idx % 3 === 1 ? "neutral" : "positivo";
      
      const contentTemplates = [
        `El tema de ${activeProfile} se colocó hoy bajo observación debido a reportes recientes en la zona metropolitana. Se identificaron picos de discusión.`,
        `Reportes de tráfico y severidad vial involucran a ${activeProfile} directamente en avenidas principales del centro de Querétaro.`,
        `Autoridades gubernamentales evaluaron el impacto de ${activeProfile} en el plan estratégico de desarrollo metropolitano del período actual.`,
        `Monitoreo ciudadano reporta inconformidades referentes al tema de ${activeProfile} en colonias periféricas del norte del estado.`
      ];
      
      const content = contentTemplates[idx % contentTemplates.length];
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() - idx);
      
      return {
        id: `news-v2-${idx}`,
        pagina_nombre: source.name,
        pagina_tipo: source.type,
        contenido: `${content} Este evento representa un cambio respecto al comportamiento histórico.`,
        sentimiento: tone,
        fecha_registro: date.toISOString().split("T")[0] + " 10:30:00",
        enlace: "https://facebook.com/sentinel_analytics_mock"
      };
    });

    return {
      totalNews,
      averagePerDay,
      delta,
      isUp,
      heatmapGrid,
      sparklinePoints,
      chartData,
      sourcesList: filteredSourcesList,
      newsList,
      relationNodes,
      negPct,
      posPct,
      neutPct,
      dominantSentimentText,
      maxDay,
      compareSparklinePoints,
      compareChartData,
      chartScale,
      chartStep
    };
  }, [activeProfile, filteredPublications, activePageDetail, filteredComparedPublications, comparedPageDetail, comparedProfile, period, sources, tones]);

  // Computed data filtering by active controls (search query & sorting)
  const filteredData = useMemo(() => {
    if (!profileData || !activeProfile) return null;
    
    let news = [...profileData.newsList];
    
    // Filter by feed query
    if (feedQuery.trim()) {
      const q = feedQuery.toLowerCase();
      news = news.filter(n => n.contenido.toLowerCase().includes(q) || n.pagina_nombre.toLowerCase().includes(q));
    }

    // Sort feed
    if (sortFeedBy === "reciente") {
      news.sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro));
    } else if (sortFeedBy === "mencionado") {
      news.sort((a, b) => a.contenido.length - b.contenido.length);
    } else {
      news.sort((a, b) => b.contenido.length - a.contenido.length);
    }

    return {
      newsFeed: news.slice(0, loadedNewsCount),
      totalCount: news.length,
      hasMore: news.length > loadedNewsCount
    };
  }, [profileData, sortFeedBy, feedQuery, loadedNewsCount]);

  const sortedSourcesList = useMemo(() => {
    if (!profileData) return [];
    const list = [...profileData.sourcesList];
    if (sourcesSort === "volumen") {
      return list.sort((a, b) => b.count - a.count);
    } else {
      return list.sort((a, b) => b.rel - a.rel);
    }
  }, [profileData, sourcesSort]);

  // Infinite Scroll Trigger
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (filteredData?.hasMore && !isLoadingMoreNews) {
        setIsLoadingMoreNews(true);
        setTimeout(() => {
          setLoadedNewsCount(prev => prev + 10);
          setIsLoadingMoreNews(false);
        }, 800);
      }
    }
  };

  // Copy Profile Link Mock
  const handleCopyLink = () => {
    setCopiedLink(true);
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
    }
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Mock Suggestions for search box
  const searchSuggestions = useMemo(() => {
    if (!searchVal.trim()) return { exact: [], related: [], trending: [] };
    const q = searchVal.toLowerCase();
    
    // exact matches from dbPages
    const dbExact = dbPages
      .filter(p => p.nombre.toLowerCase().includes(q))
      .map(p => ({ name: p.nombre, type: "Medio" as const, change: "+15%" }));

    const staticPool = [
      { name: "alertaqro", type: "Medio", change: "+34%" },
      { name: "DiarioQro", type: "Medio", change: "+12%" },
      { name: "MauricioKuriGonzalez", type: "Persona", change: "+85%" },
      { name: "FeliferMaciasO", type: "Persona", change: "-5%" },
      { name: "24NoticiasQueretaro", type: "Medio", change: "+120%" },
      { name: "GobQro", type: "Lugar", change: "+180%" },
      { name: "informateqro", type: "Medio", change: "+41%" },
      { name: "ElUniversalQueretaro", type: "Medio", change: "+8%" }
    ];

    const combinedPool = [...dbExact, ...staticPool];

    // Filter unique names in combinedPool
    const seen = new Set<string>();
    const uniquePool: typeof staticPool = [];
    combinedPool.forEach(p => {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        uniquePool.push(p);
      }
    });

    return {
      exact: uniquePool.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4).map(p => p.name),
      related: uniquePool.filter(p => !p.name.toLowerCase().includes(q) && p.type === detectedType).slice(0, 4).map(p => p.name),
      trending: uniquePool.slice(0, 4).map(p => ({ name: p.name, change: p.change }))
    };
  }, [searchVal, detectedType, dbPages]);

  // Suggestions for comparison query
  const compareSuggestions = useMemo(() => {
    if (!compareQuery.trim()) return [];
    const q = compareQuery.toLowerCase();
    
    const pool = [
      ...dbPages.map(p => p.nombre),
      "MauricioKuriGonzalez", "FeliferMaciasO", "DiarioQro", "alertaqro", "24NoticiasQueretaro", "GobQro"
    ];
    
    const unique = Array.from(new Set(pool));
    return unique.filter(name => name.toLowerCase().includes(q) && name.toLowerCase() !== activeProfile?.toLowerCase()).slice(0, 5);
  }, [compareQuery, dbPages, activeProfile]);

  // Color mapper for entities
  const getEntityTypeColor = (type: string) => {
    if (type === "Medio") return "bg-blue-100 text-blue-800 border-blue-200";
    if (type === "Persona") return "bg-purple-100 text-purple-800 border-purple-200";
    if (type === "Tema") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-green-100 text-green-800 border-green-200"; // Lugar
  };

  const getEntityDotColor = (type: string) => {
    if (type === "Medio") return "bg-blue-500";
    if (type === "Persona") return "bg-purple-500";
    if (type === "Tema") return "bg-rose-500";
    return "bg-green-500";
  };

  // Highlight word occurrences helper
  const highlightSearchText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} style={{ backgroundColor: '#fef08a' }} className="text-slate-900 rounded-[2px] px-0.5">{part}</mark> 
            : part
        )}
      </>
    );
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 flex flex-col bg-background overflow-y-auto select-none relative min-h-0 text-foreground font-sans"
    >
      
      {/* ============================================================== */}
      {/* 1. SEARCH SCREEN (LANDING) */}
      {/* ============================================================== */}
      {!activeProfile && !isAnalyzing && (
        <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 max-w-4xl mx-auto w-full select-none animate-fadeIn bg-background">
          <div className="w-full text-center space-y-8">
            <div className="space-y-3">
              <span className="text-[11px] font-bold font-mono tracking-widest text-blue-600 uppercase">
                Sentinel Engine V2
              </span>
              <h1 className="text-4xl font-serif font-black text-white leading-tight">
                Análisis de Perfiles Inteligentes
              </h1>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Ingresa cualquier tema, medio de comunicación, actor político o lugar geográfico y generaremos un reporte de tendencias estructurado con evidencia de datos.
              </p>
            </div>

            {/* Protagonist Search Bar */}
            <div className="relative w-full max-w-2xl mx-auto z-40">
              <form 
                onSubmit={handleSearchSubmit}
                className="relative flex items-center bg-card-bg hover:brightness-95 focus-within:ring-2 focus-within:ring-blue-600/25 border border-card-border focus-within:border-blue-600 rounded-2xl shadow-sm transition-all py-3 px-4 gap-3"
              >
                <Search className="w-5.5 h-5.5 text-gray-400 shrink-0" />
                
                <div className="flex-1 relative flex items-center min-w-0">
                  <input
                    type="text"
                    value={searchVal}
                    onFocus={() => setIsSuggestionsOpen(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSuggestionsOpen(true);
                    }}
                    onChange={handleInputChange}
                    placeholder=""
                    className="w-full bg-transparent text-sm text-foreground placeholder-transparent focus:outline-none min-w-0"
                  />
                  {searchVal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchVal("");
                        setIsSuggestionsOpen(false);
                      }}
                      className="text-gray-400 hover:text-foreground transition-colors cursor-pointer mr-1.5 shrink-0"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Floating Rotating Placeholder */}
                  {!searchVal && (
                    <span 
                      className={`absolute left-0 text-sm text-gray-400 pointer-events-none transition-opacity duration-300 font-sans ${
                        placeholderFade ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {placeholderList[placeholderIndex]}
                    </span>
                  )}
                </div>

                {/* Entity Auto-detected Chip */}
                {searchVal && (
                  <div className="relative shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTypeSelector(!showTypeSelector);
                      }}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer hover:brightness-95 ${getEntityTypeColor(detectedType)}`}
                    >
                      {detectedType}
                      <ChevronDown className="w-3 h-3 text-slate-600" />
                    </button>

                    {/* Manual Type Override Selector */}
                    {showTypeSelector && (
                      <div className="absolute right-0 top-8 bg-card-bg border border-card-border rounded-xl shadow-xl py-1.5 z-50 text-[10px] font-semibold text-foreground min-w-[100px] animate-scaleIn">
                        {["Tema", "Medio", "Persona", "Lugar"].map((t) => (
                          <div
                            key={t}
                            onClick={() => {
                              setDetectedType(t as any);
                              setShowTypeSelector(false);
                            }}
                            className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                          >
                            {t}
                            {detectedType === t && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {searchVal && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchVal("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="text-gray-400 hover:text-slate-600 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Suggestions Dropdown (3 columns) */}
              {isSuggestionsOpen && searchVal.trim().length > 0 && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 right-0 top-14 bg-card-bg border border-card-border rounded-2xl shadow-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-h-[380px] overflow-y-auto animate-scaleIn z-50"
                >
                  {/* Col 1: Exact matches */}
                  <div className="space-y-2 border-r border-[#1f1f1f] pr-4">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Resultados Exactos</p>
                    <div className="space-y-1.5 text-xs text-gray-300">
                      {searchSuggestions.exact.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => triggerAnalysis(item)}
                          className="py-1 px-2 hover:bg-[#181818] hover:text-blue-400 rounded-lg cursor-pointer truncate"
                        >
                          {item}
                        </div>
                      ))}
                      {searchSuggestions.exact.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic pl-2">Sin coincidencias exactas</p>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Related per type */}
                  <div className="space-y-2 border-r border-[#1f1f1f] px-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Temas Relacionados</p>
                    <div className="space-y-1.5 text-xs text-gray-300">
                      {searchSuggestions.related.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => triggerAnalysis(item)}
                          className="py-1 px-2 hover:bg-[#181818] hover:text-blue-400 rounded-lg cursor-pointer truncate"
                        >
                          {item}
                        </div>
                      ))}
                      {searchSuggestions.related.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic pl-2">Buscando relacionados...</p>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Trending now */}
                  <div className="space-y-2 pl-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Trending Ahora
                    </p>
                    <div className="space-y-1.5 text-xs text-gray-300">
                      {searchSuggestions.trending.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => triggerAnalysis(item.name)}
                          className="py-1 px-2 hover:bg-[#181818] rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <span className="truncate pr-1">{item.name}</span>
                          <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1 py-0.25 rounded shrink-0">{item.change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10.5px] text-gray-400 mt-2.5">
                Escribe cualquier nombre, tema o lugar y generamos su perfil con los datos disponibles.
              </p>
            </div>

            {/* Gallery of Recent Profiles & Most Visited */}
            <div className="space-y-6 pt-8 border-t border-gray-100 max-w-3xl mx-auto">
              
              {/* Row 1: Consultados Recientemente */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider text-left">Consultados Recientemente</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 select-none">
                  {recentProfiles.map((p) => (
                    <div
                      key={p.name}
                      onClick={() => triggerAnalysis(p.name)}
                      className={`bg-gradient-to-br ${p.gradient} hover:scale-[1.03] active:scale-[0.98] cursor-pointer p-3 rounded-2xl flex flex-col justify-between text-left h-[105px] shadow-sm hover:shadow-md transition-all group`}
                    >
                      <span className="text-[8px] font-mono font-bold uppercase text-white/80 tracking-widest">{p.type}</span>
                      <div>
                        <span className="text-[10px] font-bold text-white group-hover:underline line-clamp-2 leading-tight mt-1">{p.name}</span>
                        <span className="text-[7.5px] font-medium text-white/70 block mt-1">{p.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2: Más Consultados Hoy */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider text-left">Más Consultados Hoy</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 select-none">
                  {MOST_VISITED_PROFILES.map((p) => (
                    <div
                      key={p.name}
                      onClick={() => triggerAnalysis(p.name)}
                      className={`bg-gradient-to-br ${p.gradient} hover:scale-[1.03] active:scale-[0.98] cursor-pointer p-3 rounded-2xl flex flex-col justify-between text-left h-[105px] shadow-sm hover:shadow-md transition-all group`}
                    >
                      <span className="text-[8px] font-mono font-bold uppercase text-white/80 tracking-widest">{p.type}</span>
                      <div>
                        <span className="text-[10px] font-bold text-white group-hover:underline line-clamp-2 leading-tight mt-1">{p.name}</span>
                        <span className="text-[7.5px] font-medium text-white/70 block mt-1">{p.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TRANSITION LOADER PANEL */}
      {/* ============================================================== */}
      {isAnalyzing && (
        <div className="flex-1 flex flex-col justify-center items-center select-none py-20 gap-4 bg-background">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="space-y-2 text-center">
            <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest block">
              Procesamiento de Inteligencia
            </span>
            <div className="h-1.5 w-48 bg-slate-200 rounded-full overflow-hidden mt-1.5 mx-auto">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ 
                  width: 
                    analysisStep === 0 ? "25%" : 
                    analysisStep === 1 ? "50%" : 
                    analysisStep === 2 ? "75%" : "100%" 
                }}
              />
            </div>
            <div className="h-4 font-mono text-[11px] text-gray-400 font-semibold mt-2.5">
              {analysisStep === 0 && <span className="animate-fadeIn">Buscando menciones...</span>}
              {analysisStep === 1 && <span className="animate-fadeIn">Analizando contexto...</span>}
              {analysisStep === 2 && <span className="animate-fadeIn">Identificando patrones...</span>}
              {analysisStep === 3 && <span className="animate-fadeIn">Listo</span>}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. PROFILE GENERATED VIEW */}
      {/* ============================================================== */}
      {activeProfile && !isAnalyzing && profileData && filteredData && (
        <div className="w-full flex-1 flex flex-col bg-background select-none pb-20">
          
          {/* Header Cover Banner */}
          <div 
            className="w-full h-[200px] relative overflow-hidden flex flex-col justify-between p-6 border-b border-gray-100 shadow-sm"
            style={{ background: coverGradient }}
          >
            {/* Subtle point/grid texture overlay */}
            <div 
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(#ffffff 1px, transparent 0), radial-gradient(#ffffff 1px, transparent 0)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 4px 4px"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            
            {/* Action buttons (floating top-right) */}
            <div className="absolute top-4 right-6 flex items-center gap-2.5 z-20">
              <button 
                onClick={handleCopyLink}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow transition-colors cursor-pointer"
                title={copiedLink ? "Enlace copiado!" : "Compartir Perfil"}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => typeof window !== "undefined" && window.print()}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow transition-colors cursor-pointer"
                title="Exportar PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => activeProfile && toggleSubscribeEntity(activeProfile)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow transition-colors cursor-pointer ${
                  activeProfile && subscribedEntities.includes(activeProfile) 
                    ? "bg-blue-600 text-white border-blue-500" 
                    : "bg-white/20 hover:bg-white/35 backdrop-blur-md text-white border-white/20"
                }`}
                title={activeProfile && subscribedEntities.includes(activeProfile) ? "Suscrito a Alertas" : "Suscribirse a Alertas"}
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* Back button */}
            <button 
              onClick={() => {
                setActiveProfile(null);
                setComparedProfile(null);
                setIsComparing(false);
                router.push("/perfiles");
              }}
              className="px-3.5 py-1.5 bg-black/35 hover:bg-black/50 text-white/90 border border-white/10 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer shadow flex items-center gap-1.5 w-fit"
            >
              &larr; Nueva Búsqueda
            </button>
          </div>

          {/* Avatar and Identity block */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-6xl mx-auto w-full px-6 -mt-12 relative z-10 space-y-6"
          >
            
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
              <div className="flex items-end gap-5">
                {/* Avatar circular */}
                <div 
                  className="w-24 h-24 rounded-full bg-card-bg border-[4px] border-card-border shadow-md flex items-center justify-center shrink-0"
                  style={{
                    background: coverGradient
                  }}
                >
                  <div className="text-white text-3xl font-black uppercase font-mono">
                    {detectedType === "Medio" && <Tv className="w-10 h-10 text-white" />}
                    {detectedType === "Persona" && <User className="w-10 h-10 text-white" />}
                    {detectedType === "Tema" && <span className="font-serif">📊</span>}
                    {detectedType === "Lugar" && <MapPin className="w-10 h-10 text-white" />}
                  </div>
                </div>

                <div className="space-y-1 text-left pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-bold text-foreground tracking-tight leading-none">{activeProfile}</h2>
                    {comparedProfile && (
                      <>
                        <span className="text-gray-400 font-serif font-semibold">vs</span>
                        <h2 className="text-3xl font-bold text-purple-600 tracking-tight leading-none">{comparedProfile}</h2>
                      </>
                    )}
                  </div>
                  <p className="text-[13.5px] text-gray-500 font-medium">
                    {detectedType === "Tema" && "Tema de Interés"}
                    {detectedType === "Medio" && "Emisor de Noticias"}
                    {detectedType === "Persona" && "Figura de Interés"}
                    {detectedType === "Lugar" && "Localidad Geográfica"}
                    {" · Activo desde Sept 2024 · Mencionado en "}{profileData.sourcesList.length}{" fuentes"}
                  </p>
                  
                  {/* Tag Chips */}
                  <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                    {["Seguridad", "Vialidad", "Querétaro"].map((cat) => (
                      <span
                        key={cat}
                        onClick={() => triggerAnalysis(cat)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 border border-blue-100 rounded-lg px-2.5 py-0.5 cursor-pointer transition-colors"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* The One-Line Editorial Summary Phrase */}
            <div className="bg-accent-blue/10 border-l-[3.5px] border-accent-blue p-5 rounded-r-2xl shadow-sm text-left">
              <p className="font-serif italic text-base md:text-lg leading-relaxed text-foreground/90">
                {detectedType === "Persona" && `"${activeProfile} registra un comportamiento predominantemente institucional en el DW, con coberturas que aumentan un ${profileData.delta}% en medios formales cada martes."`}
                {detectedType === "Medio" && `"${activeProfile} concentra su atención en sucesos de vialidad y tráfico, representando más del 35% de su volumen de publicaciones en Facebook."`}
                {detectedType === "Lugar" && `"${activeProfile} destaca como zona caliente en incidentes de vialidad y encharcamientos, coincidiendo con picos en 8 fuentes simultáneas."`}
                {detectedType === "Tema" && `"${activeProfile} tuvo su mayor pico de atención coordinada la semana del 14 de octubre, con énfasis crítico negativo en medios locales."`}
              </p>
            </div>

            {/* ============================================================== */}
            {/* 4. FILTERS BAR */}
            {/* ============================================================== */}
            <div className="bg-card-bg border border-card-border p-4 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm select-none">
              <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-bold text-text-muted">
                {/* 1. Periodo Button Group */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted mr-1">Período:</span>
                  <div className="bg-background border border-card-border p-0.75 rounded-xl flex">
                    {(["semana", "mes", "todo"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPeriod(p);
                          addSessionLog(`Perfiles: Período cambiado a ${p}`);
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                          period === p 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Todo"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Tipo de Fuente Toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted mr-1">Fuente:</span>
                  <div className="bg-background border border-card-border p-0.75 rounded-xl flex gap-0.5">
                    {["medios", "facebook"].map((src) => {
                      const isActive = sources.includes(src);
                      return (
                        <button
                          key={src}
                          onClick={() => {
                            const updated = isActive ? sources.filter(s => s !== src) : [...sources, src];
                            setSources(updated);
                            addSessionLog(`Perfiles: Ponderación de fuente adaptada`);
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                            isActive 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {src === "medios" ? "Medios" : "Facebook"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Chips de Tono Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted mr-1">Tono:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { val: "negativo", color: "border-red-200 text-red-700 bg-red-50" },
                      { val: "neutral", color: "border-gray-200 text-gray-700 bg-gray-50" },
                      { val: "positivo", color: "border-emerald-200 text-emerald-700 bg-emerald-50" }
                    ].map((tone) => {
                      const isActive = tones.includes(tone.val);
                      return (
                        <button
                          key={tone.val}
                          onClick={() => {
                            const updated = isActive ? tones.filter(t => t !== tone.val) : [...tones, tone.val];
                            setTones(updated);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer uppercase ${
                            isActive 
                              ? `${tone.color} border-slate-400 shadow-sm` 
                              : "border-transparent text-gray-500 hover:text-gray-300 bg-transparent"
                          }`}
                        >
                          {tone.val}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Ordenar dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-text-muted mr-1">Ordenar Feed:</span>
                  <select
                    value={sortFeedBy}
                    onChange={(e) => setSortFeedBy(e.target.value as any)}
                    className="bg-card-bg border border-card-border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-600 text-[10px] font-bold text-foreground cursor-pointer hover:bg-background"
                  >
                    <option value="reciente">Reciente</option>
                    <option value="mencionado">Más Mencionados</option>
                    <option value="relevante">Más Relevantes</option>
                  </select>
                </div>
              </div>

              {/* 5. Comparador inline */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0">
                <div className="relative">
                  {!isComparing ? (
                    <button
                      onClick={() => setIsComparing(true)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Comparar con...
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (compareQuery.trim()) handleCompareSubmit(compareQuery.trim());
                        }}
                        className="relative"
                      >
                        <input
                          type="text"
                          value={compareQuery}
                          onFocus={() => setIsCompareSuggestionsOpen(true)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCompareSuggestionsOpen(true);
                          }}
                          onChange={(e) => setCompareQuery(e.target.value)}
                          placeholder="Escribe otro perfil..."
                          className="bg-card-bg border border-card-border focus:border-blue-600 rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none text-foreground w-44 font-sans font-bold"
                        />
                        {/* Auto suggestion popover for comparison */}
                        {isCompareSuggestionsOpen && compareQuery.trim().length > 0 && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 bg-card-bg border border-card-border rounded-xl shadow-xl py-1.5 z-50 text-[10px] font-bold text-foreground min-w-[150px] max-h-[160px] overflow-y-auto"
                          >
                            {compareSuggestions.map((name) => (
                              <div
                                key={name}
                                onClick={() => handleCompareSubmit(name)}
                                className="px-3 py-2 hover:bg-[#181818] cursor-pointer"
                              >
                                {name}
                              </div>
                            ))}
                            {compareSuggestions.length === 0 && (
                              <div className="px-3 py-2 text-gray-400 italic">Sin resultados</div>
                            )}
                          </div>
                        )}
                      </form>
                      
                      {comparedProfile && (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-2 py-1 rounded-xl flex items-center gap-1">
                          {comparedProfile}
                          <X 
                            className="w-3 h-3 hover:text-purple-600 cursor-pointer" 
                            onClick={() => {
                              setComparedProfile(null);
                              setCompareQuery("");
                              setIsComparing(false);
                            }} 
                          />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-mono text-gray-500 font-semibold shrink-0">
                  Mostrando {filteredData.totalCount} noticias · {profileData.sourcesList.length} fuentes
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 5. QUICK STATS CARDS (FILA DE VERDADES) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              
              {/* Card 1 — ¿Cuánto se habla? */}
              <div className="card-intelligence p-5 relative overflow-hidden flex flex-col justify-between min-h-[145px]">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">¿Cuánto se habla?</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground font-mono">
                      {comparedProfile ? `${profileData.totalNews} / ${profileData.totalNews - 45}` : profileData.totalNews}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${profileData.isUp ? "text-emerald-600" : "text-red-500"}`}>
                      {profileData.isUp ? "↑" : "↓"} {profileData.delta}%
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium mt-1">
                    Promedio de {profileData.averagePerDay} noticias diarias.
                  </p>
                </div>

                {/* Micro Sparkline */}
                <div className="w-full h-8 mt-2 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 280 50">
                    <path
                      d={`M ${profileData.sparklinePoints.map(p => `${p.x} ${p.y}`).join(" L ")}`}
                      fill="none"
                      stroke={accentColorHSL}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* compared dotted line */}
                    {comparedProfile && (
                      <path
                        d={`M ${profileData.sparklinePoints.map(p => `${p.x} ${p.y + 10}`).join(" L ")}`}
                        fill="none"
                        stroke="#9333ea"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Card 2 — ¿Cómo se habla? */}
              <div className="card-intelligence p-5 flex flex-col justify-between min-h-[145px] group/tone relative">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">¿Cómo se habla?</h4>
                  <span className="text-base font-bold text-foreground block">
                    {profileData.dominantSentimentText}
                  </span>
                  <p className="text-[11px] text-gray-500 font-medium">Predominio en la polaridad de opinión.</p>
                </div>

                {/* Sentiment Bar */}
                <div className="space-y-2 mt-4">
                  <div className="h-2.5 w-full bg-card-border/50 rounded-full overflow-hidden flex border border-card-border">
                    <span className="h-full bg-red-500" style={{ width: `${profileData.negPct}%` }} />
                    <span className="h-full bg-gray-400/40" style={{ width: `${profileData.neutPct}%` }} />
                    <span className="h-full bg-emerald-500" style={{ width: `${profileData.posPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono font-bold text-text-muted">
                    <span>{profileData.negPct}% NEG</span>
                    <span>{profileData.neutPct}% NEUT</span>
                    <span>{profileData.posPct}% POS</span>
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card-bg text-foreground border border-card-border text-[9.5px] font-bold py-1.5 px-3 rounded-lg opacity-0 pointer-events-none group-hover/tone:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap z-30 font-mono">
                  NEG: {profileData.negPct}% · NEUT: {profileData.neutPct}% · POS: {profileData.posPct}%
                </div>
              </div>

              {/* Card 3 — ¿Dónde aparece más? */}
              <div className="card-intelligence p-5 flex flex-col justify-between min-h-[145px]">
                <div className="space-y-1 text-left">
                  <h4 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">¿Dónde aparece más?</h4>
                  <span className="text-lg font-black text-foreground block leading-tight truncate">
                    {profileData.sourcesList[0]?.name || "Sin fuentes"}
                  </span>
                  <p className="text-[10.5px] text-gray-500 leading-snug mt-1.5">
                    {profileData.sourcesList[1] ? (
                      <>
                        seguido de <strong>{profileData.sourcesList[1].name}</strong>
                        {profileData.sourcesList[2] && (
                          <> y <strong>{profileData.sourcesList[2].name}</strong></>
                        )}
                      </>
                    ) : (
                      "Sin fuentes secundarias registradas en este período."
                    )}
                  </p>
                </div>

                <div className="text-[9.5px] font-mono text-text-muted font-bold flex items-center gap-1 shrink-0 pt-2 border-t border-card-border">
                  <Tv className="w-3.5 h-3.5 text-blue-500" />
                  Presencia en {profileData.sourcesList.length} fuentes
                </div>
              </div>

              {/* Card 4 — ¿Cuándo fue la clave? */}
              <div className="card-intelligence p-5 flex flex-col justify-between min-h-[145px]">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">¿Cuándo fue el pico clave?</h4>
                  <span className="text-lg font-black text-foreground block leading-tight">
                    {profileData.maxDay ? formatDayName(profileData.maxDay.date) : "Sin registros"}
                  </span>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">
                    fue cuando más se habló de esto ({profileData.maxDay?.count || 0} noticias registradas).
                  </p>
                </div>

                <div className="text-[9.5px] font-mono text-red-500 font-bold flex items-center gap-1 shrink-0 pt-2 border-t border-card-border">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  {profileData.maxDay?.isAnomaly ? "Anomalía detectada (+2.5σ)" : "Actividad Máxima Detectada"}
                </div>
              </div>

            </div>

            {/* ============================================================== */}
            {/* 6. ACTIVIDAD Y EVOLUCIÓN (HEATMAP E HISTOGRAMA) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              
              {/* GitHub style heatmap (8 cols) */}
              <div className="lg:col-span-8 card-intelligence p-5 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-baseline mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Días con Actividad</h3>
                    <p className="text-[9.5px] text-text-muted mt-0.5">Volumen evolutivo de sucesos diarios registrados de manera granular.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Legend */}
                    <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-text-muted">
                      <span>Menos</span>
                      <div className="flex gap-[2px]">
                        <span className="w-2.5 h-2.5 rounded-[1px] bg-card-border/50 border border-card-border" />
                        <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-500/20 border border-blue-500/35" />
                        <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-400/60 border border-blue-400/40" />
                        <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-500 border border-blue-400" />
                        <span className="w-2.5 h-2.5 rounded-[1px] bg-blue-600 border border-blue-500" />
                      </div>
                      <span>Más</span>
                    </div>
                  </div>
                </div>

                {/* Heatmap grid */}
                <div className="flex-1 overflow-x-auto pb-1 flex flex-col justify-center min-h-[90px] relative">
                  <div className="flex gap-[3px] select-none">
                    {profileData.heatmapGrid.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                        {week.map((day, dIdx) => {
                          const count = day.count;
                          let bgClass = "bg-card-border/50 border border-card-border";
                          
                          if (count > 10) bgClass = "bg-blue-600 border border-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)] text-white";
                          else if (count > 6) bgClass = "bg-blue-500 border border-blue-400 text-white";
                          else if (count > 3) bgClass = "bg-blue-400/60 border border-blue-400/40";
                          else if (count > 0) bgClass = "bg-blue-500/20 border border-blue-500/35";

                          return (
                            <div
                              key={dIdx}
                              className={`w-3 h-3 rounded-[2.5px] transition-all cursor-pointer hover:scale-125 ${bgClass}`}
                              onMouseEnter={() => setHoveredCell({ date: day.date, count: day.count, headlines: day.headlines })}
                              onMouseLeave={() => setHoveredCell(null)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Cell tooltip */}
                  {hoveredCell && (
                    <div className="absolute left-4 top-14 bg-card-bg border border-card-border text-foreground p-3 rounded-xl shadow-xl z-50 text-[10px] max-w-[240px] animate-fadeIn backdrop-blur-sm space-y-1.5 leading-relaxed font-sans">
                      <p className="font-bold font-mono border-b border-card-border pb-1">{hoveredCell.date} · {hoveredCell.count} noticias</p>
                      {hoveredCell.headlines.map((hl, idx) => (
                        <p key={idx} className="line-clamp-1 text-text-muted">&bull; {hl}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart evolution (4 cols) */}
              <div className="lg:col-span-4 card-intelligence p-5 flex flex-col min-h-[220px]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Evolución del Foco</h3>
                  <p className="text-[9.5px] text-text-muted mt-0.5">Tendencia de volumen temporal en el período.</p>
                </div>

                <div className="flex-1 mt-4 relative flex items-end">
                  {/* custom relative Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] font-mono text-gray-400 select-none z-10">
                    <span>Pico</span>
                    <span>Mucho</span>
                    <span>Normal</span>
                    <span>Poco</span>
                  </div>

                  {/* Custom SVG Area Chart */}
                  <div className="flex-1 h-32 ml-7 relative">
                    <svg className="w-full h-full" viewBox="0 0 300 120">
                      {/* Grid Lines */}
                      <line x1="0" y1="10" x2="300" y2="10" stroke="var(--card-border)" strokeWidth="1" opacity="0.4" />
                      <line x1="0" y1="40" x2="300" y2="40" stroke="var(--card-border)" strokeWidth="1" opacity="0.4" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="var(--card-border)" strokeWidth="1" opacity="0.4" />
                      <line x1="0" y1="110" x2="300" y2="110" stroke="var(--card-border)" strokeWidth="1" />

                      {/* Area Area */}
                      <path
                        d={`M 0 110 L ${profileData.chartData.map((d, i) => `${i * profileData.chartStep} ${110 - (d.count * profileData.chartScale)}`).join(" L ")} L 297 110 Z`}
                        fill={accentColorHSL}
                        fillOpacity="0.12"
                      />

                      {/* Line line */}
                      <path
                        d={`M ${profileData.chartData.map((d, i) => `${i * profileData.chartStep} ${110 - (d.count * profileData.chartScale)}`).join(" L ")}`}
                        fill="none"
                        stroke={accentColorHSL}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Dotted comparison line if comparison is active */}
                      {comparedProfile && profileData.compareChartData && (
                        <path
                          d={`M ${profileData.compareChartData.map((d, i) => `${i * profileData.chartStep} ${110 - (d.count * profileData.chartScale)}`).join(" L ")}`}
                          fill="none"
                          stroke="#9333ea"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Anomaly markers (diamonds) */}
                      {profileData.chartData.map((d, i) => {
                        if (!d.isAnomaly) return null;
                        const cx = i * profileData.chartStep;
                        const cy = 110 - (d.count * profileData.chartScale);
                        return (
                          <g key={i} className="group/diamond cursor-pointer">
                            <polygon
                              points={`${cx},${cy - 5.5} ${cx + 5.5},${cy} ${cx},${cy + 5.5} ${cx - 5.5},${cy}`}
                              fill="#ef4444"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <title>3x más de lo normal ese día</title>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* ============================================================== */}
            {/* 7. MAPA DE RELACIONES (GRAFO) Y FUENTES */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              
              {/* Relationship force-directed graph (7 cols) */}
              <div className="lg:col-span-7 card-intelligence p-5 flex flex-col min-h-[300px] relative">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Mapa de Relaciones</h3>
                  <p className="text-[9.5px] text-text-muted mt-0.5">Grafo semántico de co-ocurrencia táctica en notas.</p>
                </div>

                {/* SVG Graph simulation area */}
                <div className="flex-1 bg-background/40 border border-card-border rounded-xl mt-4 relative overflow-hidden min-h-[220px] flex items-center justify-center">
                  
                  {/* SVG Nodes */}
                  <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 220">
                    {/* Node lines */}
                    {profileData.relationNodes.map((node, idx) => (
                      <line
                        key={idx}
                        x1="200"
                        y1="110"
                        x2={node.x}
                        y2={node.y}
                        stroke="rgba(37, 99, 235, 0.25)"
                        strokeWidth={node.w}
                      />
                    ))}

                    {/* Central query Node */}
                    <circle
                      cx="200"
                      cy="110"
                      r="16"
                      fill={accentColorHSL}
                      className="cursor-pointer"
                      style={{ filter: "drop-shadow(0 0 6px rgba(0,0,0,0.1))" }}
                    />
                    <text
                      x="200"
                      y="113.5"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-sans pointer-events-none"
                    >
                      {activeProfile.slice(0, 3).toUpperCase()}
                    </text>

                    {/* Secondary float Nodes */}
                    {profileData.relationNodes.map((node, idx) => (
                      <g 
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredNode({ name: node.label, relation: node.rel })}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => triggerAnalysis(node.label)}
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r}
                          fill="#ffffff"
                          stroke={getEntityDotColor(node.type)}
                          strokeWidth="2.2"
                          className="hover:scale-110 transition-transform"
                        />
                        <text
                          x={node.x}
                          y={node.y + 3}
                          fill="#334155"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {node.label}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Hover Node details overlay */}
                  {hoveredNode && (
                    <div className="absolute bottom-3 left-3 bg-card-bg text-foreground border border-card-border p-2.5 rounded-lg text-[9px] shadow font-mono animate-fadeIn z-10 max-w-[180px]">
                      <p className="font-bold border-b border-card-border pb-0.5 uppercase">{hoveredNode.name}</p>
                      <p className="text-text-muted mt-1">{hoveredNode.relation}</p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 mt-2 select-none text-center">
                  Los elementos más cercanos aparecen juntos con mayor frecuencia en las noticias.
                </div>

                {/* Related tags chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-[#1f1f1f]">
                  {["Bernardo Quintana", "Tránsito Querétaro", "Obras Bernardo Quintana", "Lluvias del Centro", "Luis Nava Alcalde"].map((tag, idx) => (
                    <span
                      key={tag}
                      onClick={() => triggerAnalysis(tag)}
                      className={`text-[9.5px] font-semibold border rounded-lg px-2.5 py-0.75 cursor-pointer hover:bg-[#1c1c1c] transition-colors ${
                        idx === 0 ? "text-base font-bold scale-105 border-blue-500/30 text-blue-400 bg-blue-500/10" : "text-gray-300 border-[#1f1f1f] bg-[#141414]"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sources List (5 cols) */}
              <div className="lg:col-span-5 card-intelligence p-5 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-baseline mb-4 shrink-0">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Ranking de Fuentes</h3>
                    <p className="text-[9.5px] text-text-muted mt-0.5">Difusión indexada en canales.</p>
                  </div>
                  
                  {/* Toggle volumen vs relevancia */}
                  <div className="bg-background border border-card-border p-0.5 rounded-lg flex text-[8.5px] font-bold">
                    {(["volumen", "relevancia"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSourcesSort(opt);
                          addSessionLog(`Perfiles: Orden de fuentes cambiado a ${opt}`);
                        }}
                        className={`px-2 py-1 rounded transition-all capitalize cursor-pointer ${
                          sourcesSort === opt 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "text-text-muted hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List body */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-sans">
                  {sortedSourcesList.map((src, idx) => {
                    const pct = sourcesSort === "volumen" 
                      ? (sortedSourcesList[0] ? (src.count / sortedSourcesList[0].count) * 100 : 0)
                      : src.rel;
                    return (
                      <div 
                        key={src.name}
                        onClick={() => triggerAnalysis(src.name)}
                        className="flex flex-col gap-1 group/src cursor-pointer relative"
                        title={`${src.count} noticias · Rel: ${src.rel}%`}
                      >
                        <div className="flex justify-between items-baseline text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-base font-black text-foreground font-mono w-5 select-none shrink-0 group-hover/src:text-blue-200 transition-colors">
                              {(idx + 1).toString().padStart(2, "0")}
                            </span>
                            <span className="font-bold text-foreground truncate group-hover/src:text-blue-400 transition-colors">{src.name}</span>
                          </div>
                          
                          <span className="font-mono font-bold text-gray-400 shrink-0">
                            {sourcesSort === "volumen" ? src.count : `${src.rel}%`}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 w-full bg-card-border rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ============================================================== */}
            {/* 8. INSIGHTS AUTOMATIC SECTION */}
            {/* ============================================================== */}
            <div className="bg-emerald-950/10 border border-emerald-900/20 p-5 rounded-2xl shadow-sm text-left select-none space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">💡 Lo que los datos sugieren</h3>
              <div className="space-y-2.5 text-xs text-gray-300 font-sans leading-relaxed">
                <div className="flex items-start gap-2 py-1.5 border-b border-emerald-900/20 last:border-b-0">
                  <span>&bull;</span>
                  <span>Las noticias sobre este tema aparecen mayormente en las mañanas, entre 7am y 10am.</span>
                </div>
                <div className="flex items-start gap-2 py-1.5 border-b border-emerald-900/20 last:border-b-0">
                  <span>&bull;</span>
                  <span>Facebook cubre este tema antes que los medios formales, con una diferencia promedio de 3 horas.</span>
                </div>
                <div className="flex items-start gap-2 py-1.5 border-b border-emerald-900/20 last:border-b-0">
                  <span>&bull;</span>
                  <span>La cobertura negativa aumenta los lunes — el patrón es consistente en los últimos dos meses.</span>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            <div className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Noticias Encontradas ({filteredData.totalCount})
                </h3>

                {/* Inline filter search */}
                <input
                  type="text"
                  value={feedQuery}
                  onChange={(e) => setFeedQuery(e.target.value)}
                  placeholder="Filtrar dentro de resultados..."
                  className="bg-card-bg border border-card-border focus:border-blue-600 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-foreground w-full sm:w-60 font-sans font-bold shadow-sm"
                />
              </div>

              {/* Feed Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData.newsFeed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedArticle(item);
                      addSessionLog(`Perfiles: Abriendo lector para nota ID: ${item.id}`);
                    }}
                    className={`p-4 rounded-2xl bg-card-bg border border-card-border hover:border-blue-500/50 hover:shadow-md cursor-pointer transition-all flex min-h-[120px] relative overflow-hidden`}
                  >
                    {/* Left color bar of source type */}
                    <div 
                      className={`w-1 h-full absolute left-0 top-0 bottom-0 ${
                        item.pagina_tipo === "Medio" ? "bg-blue-500" : "bg-emerald-500"
                      }`} 
                    />
                    
                    <div className="flex-1 flex flex-col justify-between pl-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline font-mono text-[9px] text-gray-400">
                          <span className="font-bold">{item.pagina_nombre}</span>
                          <span>{item.fecha_registro.slice(0, 10)}</span>
                        </div>
                        
                        <h4 className="font-sans text-xs font-bold text-foreground leading-snug line-clamp-1">
                          {highlightSearchText(item.contenido.slice(0, 45), activeProfile)}...
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-normal line-clamp-2 select-text selection:bg-blue-600/10">
                          {highlightSearchText(item.contenido, activeProfile)}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-card-border">
                        <span className="text-[8.5px] font-mono text-text-muted">Ponderado: 1.0</span>
                        
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          item.sentimiento === "positivo" ? "bg-emerald-500" : item.sentimiento === "negativo" ? "bg-red-500" : "bg-gray-400"
                        }`} title={item.sentimiento} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scroll infinite spinner */}
              {filteredData.hasMore && (
                <div className="py-8 flex justify-center items-center font-mono text-[10px] text-gray-400 gap-2 select-none">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  Cargando más noticias...
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* 10. EXPANDABLE V3 FULL ANALYSIS (ACCORDION) */}
            {/* ============================================================== */}
            <div className="pt-8 border-t border-card-border select-none text-center">
              <button
                onClick={() => {
                  setShowFullAnalysis(!showFullAnalysis);
                  addSessionLog(`Perfiles: Lienzos avanzados V3 ${!showFullAnalysis ? "expandidos" : "colapsados"}`);
                }}
                className="px-5 py-3 border border-card-border bg-card-bg hover:brightness-95 text-foreground font-bold rounded-2xl text-[11px] font-mono uppercase flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all active:scale-[0.98]"
              >
                <SlidersHorizontal className="w-4.5 h-4.5" />
                {showFullAnalysis ? "Contraer Análisis Técnico V3" : "Ver Análisis Completo V3"}
              </button>

              {showFullAnalysis && (
                <div className="mt-8 space-y-12 animate-fadeIn border-t border-dashed border-card-border pt-8 text-left bg-card-bg border border-card-border text-foreground -mx-6 px-6 py-12 rounded-3xl">
                  {/* comparative comparison */}
                  <section className="space-y-4">
                    <div className="flex gap-2 items-center px-2">
                      <ArrowLeftRight className="w-4.5 h-4.5 text-blue-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Lienzo Comparativo (VS)</h3>
                    </div>
                    <div className="p-4 bg-card-bg border border-card-border rounded-2xl">
                      <ComparativeCanvas />
                    </div>
                  </section>

                  {/* Report Builder */}
                  <section className="space-y-4">
                    <div className="flex gap-2 items-center px-2">
                      <Layers className="w-4.5 h-4.5 text-blue-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Lienzo Constructor de Reportes</h3>
                    </div>
                    <div className="p-4 bg-card-bg border border-card-border rounded-2xl">
                      <ReportBuilderCanvas />
                    </div>
                  </section>
                </div>
              )}
            </div>

          </motion.div>

          {/* ============================================================== */}
          {/* 11. SLIDING DETAILS READER PANEL */}
          {/* ============================================================== */}
          {selectedArticle && (
            <aside className="fixed right-0 top-0 bottom-0 w-[450px] lg:w-[600px] bg-card-bg border-l border-card-border flex flex-col justify-between z-50 animate-slideRight shadow-2xl text-foreground select-none">
              
              {/* Header */}
              <div className="p-5 border-b border-card-border flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 font-mono text-[9.5px] text-text-muted font-bold">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>LECTOR DE NOTICIA</span>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 hover:bg-background rounded-xl border border-card-border text-text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left select-text">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      onClick={() => {
                        setSelectedArticle(null);
                        triggerAnalysis(selectedArticle.pagina_nombre);
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg cursor-pointer hover:bg-blue-100"
                    >
                      {selectedArticle.pagina_nombre}
                    </span>
                    <span className="text-[9.5px] font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedArticle.fecha_registro}
                    </span>
                  </div>

                  <h2 className="font-serif text-xl font-bold text-foreground leading-snug pt-2">
                    {selectedArticle.contenido.slice(0, 45)}...
                  </h2>
                </div>

                <div className="text-sm text-foreground/80 leading-relaxed font-sans whitespace-pre-wrap selection:bg-blue-600/10">
                  {selectedArticle.contenido}
                </div>
              </div>

              {/* Reader Footer action buttons */}
              <div className="p-4 border-t border-card-border bg-card-bg flex flex-wrap gap-2 justify-between items-center text-[10px] font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const src = selectedArticle.pagina_nombre;
                      setSelectedArticle(null);
                      triggerAnalysis(src);
                    }}
                    className="px-3 py-1.5 bg-card-bg border border-card-border hover:bg-background rounded-lg text-foreground font-bold cursor-pointer"
                  >
                    Ver perfil de {selectedArticle.pagina_nombre.split(" ")[0]}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      triggerAnalysis("Seguridad");
                    }}
                    className="px-3 py-1.5 bg-card-bg border border-card-border hover:bg-background rounded-lg text-foreground font-bold cursor-pointer"
                  >
                    Ver tema principal
                  </button>
                </div>

                {selectedArticle.enlace && (
                  <a 
                    href={selectedArticle.enlace}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Abrir original
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

            </aside>
          )}

        </div>
      )}

    </div>
  );
}
