"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useV3Context } from "@/context/V3Context";
import LoginOverlay from "@/components/LoginOverlay";
import { 
  Shield, 
  LayoutDashboard, 
  Compass, 
  AlertTriangle, 
  User, 
  Settings, 
  LogOut,
  X,
  Search,
  ChevronRight,
  Calendar,
  HelpCircle,
  Sun,
  Moon,
  Newspaper,
  ChevronLeft,
  BookOpen,
  Check,
  MapIcon,
  Bell,
  Volume2,
  TrendingUp
} from "lucide-react";
import { getAlerts, AlertItem } from "@/lib/api";

// Types for right sidebar live feed
interface LiveNewsItem {
  id: string;
  title: string;
  source: string;
  sourceType: "medios" | "facebook";
  sourceColor: string;
  timeAgo: string;
  timestamp: number;
  content: string;
}

const INITIAL_NEWS: LiveNewsItem[] = [
  { 
    id: "1622919929843680", 
    title: "Decomiso en Aeropuerto: Decomisan metanfetamina y marihuana", 
    source: "AsiSucedeQro", 
    sourceType: "medios", 
    sourceColor: "#a855f7", 
    timeAgo: "Hace 4 min", 
    timestamp: Date.now() - 4 * 60000,
    content: "💥📦✈Cae cargamento de dr0g4 en el Aeropuerto de #Querétaro; decomisan met4nf3t4min4, m4rihu4n4 y 7 mil 300 pastillas⚠️ ⬇"
  },
  { 
    id: "1471944451635407", 
    title: "Bancada de Movimiento Ciudadano presenta decálogo de acciones", 
    source: "DiarioQro", 
    sourceType: "medios", 
    sourceColor: "#3b82f6", 
    timeAgo: "Hace 8 min", 
    timestamp: Date.now() - 8 * 60000,
    content: "La bancada de Movimiento Ciudadano en el Congreso local presentó un decálogo de acciones que esperan sean contempladas e integradas en el documento a dictaminarse y votarse en la presente LXI Legislatura."
  },
  { 
    id: "1606315884830642", 
    title: "Carrillera de Sergio Arturo Venegas Alarcón", 
    source: "PlazaDeArmasQro", 
    sourceType: "medios", 
    sourceColor: "#10b981", 
    timeAgo: "Hace 12 min", 
    timestamp: Date.now() - 12 * 60000,
    content: "🔴 Enemigos cercanos del tercer tipo 🔺Explica Santiago su registro en línea y el viaje a Europa 🔺PAN conserva el liderato, dice Demoscopia/Digital 🔺Inician el lunes trabajos en puente ferroviario del BBQ"
  },
  { 
    id: "1325830703003747", 
    title: "Alerta vial: Presencia y desplazamiento de neblina", 
    source: "Protección Civil", 
    sourceType: "facebook", 
    sourceColor: "#ef4444", 
    timeAgo: "Hace 19 min", 
    timestamp: Date.now() - 19 * 60000,
    content: "Se registra presencia y desplazamiento de neblina sobre carreteras y caminos de la demarcación, lo que puede reducir la visibilidad al circular. Enciende tus luces, disminuye la velocidad y conduce con precaución. 🚗"
  },
  { 
    id: "980098227898502", 
    title: "Incendio de camioneta en la carretera México-Querétaro", 
    source: "Acceso Querétaro", 
    sourceType: "medios", 
    sourceColor: "#eab308", 
    timeAgo: "Hace 30 min", 
    timestamp: Date.now() - 30 * 60000,
    content: "🔥Esta mañana una camioneta se incendió mientras circulaba sobre la México Querétaro a la altura del Parque Industrial Bernardo Quintana, no se reportaron personas lesionadas."
  },
  { 
    id: "1610922997710755", 
    title: "Regreso a la normalidad del sistema Qrobus en El Cerrito", 
    source: "SoyQro", 
    sourceType: "medios", 
    sourceColor: "#06b6d4", 
    timeAgo: "Hace 45 min", 
    timestamp: Date.now() - 45 * 60000,
    content: "#queretaro | Anuncia Gerardo Cuanalo el regreso a la normalidad del sistema Qrobus en El Cerrito"
  }
];

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    dateRange,
    timePreset,
    setTimePreset,
    sourceWeight,
    setSourceWeight,
    clearAllFilters,
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    setIsSearchExpanded,
    breadcrumbs,
    pushBreadcrumb,
    isPresentationMode,
    setIsPresentationMode,
    scrapersStatus,
    sessionLogs,
    addSessionLog,
    sensitivityUmbrales,
    subscribedEntities,
    toggleSubscribeEntity,
    readAlertIds,
    markAlertAsRead
  } = useV3Context();

  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  // V5 Layout States
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState<"Todos" | "Medios" | "Facebook">("Todos");
  
  // Real-time news states
  const [newsFeed, setNewsFeed] = useState<LiveNewsItem[]>(INITIAL_NEWS);
  const [newNewsCount, setNewNewsCount] = useState(0);
  
  // Slide reader drawer states
  const [selectedNote, setSelectedNote] = useState<LiveNewsItem | null>(null);
  
  // Scroll tracking refs
  const feedScrollRef = useRef<HTMLDivElement>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
  const [alertsFilter, setAlertsFilter] = useState<'todos' | 'critico' | 'atencion' | 'informativo'>('todos');
  const [alertsReadFilter, setAlertsReadFilter] = useState<'todas' | 'no_leidas' | 'leidas'>('no_leidas');

  // Fetch alerts whenever sensitivities change
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchAlertsData = async () => {
      try {
        const data = await getAlerts({
          volumen_sens: sensitivityUmbrales.volume,
          sentimiento_sens: sensitivityUmbrales.sentiment,
          speed_sens: sensitivityUmbrales.speed,
          divergencia_sens: sensitivityUmbrales.divergence
        });
        setAlerts(data);
      } catch (err) {
        console.error("Error fetching alerts:", err);
      }
    };
    
    fetchAlertsData();
    // Poll every 30 seconds for fresh alerts
    const interval = setInterval(fetchAlertsData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sensitivityUmbrales]);

  // Command Rail Nav Items V5
  const RAIL_ITEMS = [
    { path: "/", icon: LayoutDashboard, label: "Resumen", desc: "Estado de todo de un vistazo", hoverContext: "Dashboard · Actualizado hoy" },
    { path: "/publicaciones", icon: Search, label: "Explorar", desc: "Buscador y lector de notas", hoverContext: "Explorar · 2,847 notas en 30D" },
    { path: "/mapa", icon: MapIcon, label: "Mapa", desc: "Sala de control geográfico", hoverContext: "Mapa · Sala de control nacional" },
    { path: "/perfiles", icon: User, label: "Perfiles", desc: "Zoom semántico e historias", hoverContext: "Perfiles · 3 con actividad inusual", hasBadge: true },
    { path: "/paginas", icon: Newspaper, label: "Medios", desc: "Sala de monitoreo editorial", hoverContext: "Medios · 18 activos hoy" },
    { path: "/observatorio", icon: Compass, label: "Observatorio", desc: "Resumen editorial semanal", hoverContext: "Observatorio · Resumen disponible", hasBadge: true },
    { path: "/sentinel-mau", icon: Settings, label: "Motores", desc: "Configuración de scrapers y fuentes", hoverContext: "Motores · Control de ingesta" }
  ];

  // Apply saved theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sentinel_theme") as "dark" | "light" | null;
      const activeTheme = savedTheme || "light";
      setTheme(activeTheme);
      
      if (activeTheme === "light") {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
        document.body.setAttribute("data-theme", "light");
      } else {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
        document.body.setAttribute("data-theme", "dark");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("sentinel_theme", nextTheme);
      if (nextTheme === "light") {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
        document.body.setAttribute("data-theme", "light");
      } else {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
        document.body.setAttribute("data-theme", "dark");
      }
    } catch (e) {
      console.error(e);
    }
    addSessionLog(`Sistema: Cambio a Modo ${nextTheme === "light" ? "Claro" : "Oscuro"}`);
  };

  // Auth gate check
  useEffect(() => {
    setIsMounted(true);
    try {
      const token = localStorage.getItem("sentinel_token");
      setIsAuthenticated(!!token);
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, []);

  useEffect(() => {
    const handleAuthFailure = () => setIsAuthenticated(false);
    window.addEventListener("sentinel_auth_failed", handleAuthFailure);
    return () => window.removeEventListener("sentinel_auth_failed", handleAuthFailure);
  }, []);

  // System time clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setCurrentTime(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulator for incoming news (breathing system)
  useEffect(() => {
    const interval = setInterval(() => {
      const titles = [
        "Protección Civil emite alerta naranja por lluvias severas en San Juan del Río",
        "Vecinos bloquean lateral de autopista 57 en protesta por corte de energía",
        "Policía Municipal frustra robo en comercio del Centro Histórico de Querétaro",
        "El Sol de Querétaro publica reportaje especial sobre movilidad urbana",
        "Querétaro reporta estabilidad económica e incremento de empleos industriales"
      ];
      const contents = [
        "Debido a una celda de tormenta estacionaria sobre la zona sur del estado, Protección Civil ha emitido una alerta naranja para el municipio de San Juan del Río. Se prevén encharcamientos severos y posible desbordamiento de drenes locales. Se invita a la población a resguardarse y reportar cualquier emergencia a la línea única del 911.",
        "Un grupo de aproximadamente 45 habitantes de la comunidad de El Colorado bloqueó de forma parcial la lateral de la carretera federal 57 en dirección a Querétaro. Exigen la restitución del servicio eléctrico tras sufrir apagones constantes en las últimas 72 horas. La Guardia Nacional resguarda la zona para canalizar el tráfico vehicular.",
        "Elementos de la Secretaría de Seguridad Pública Municipal detuvieron a dos sujetos en posesión de herramientas y mercancía sustraída ilegalmente de un establecimiento comercial de ropa ubicado sobre la calle Madero. Los detenidos fueron puestos a disposición de la Fiscalía General del Estado para determinar su situación jurídica.",
        "Una investigación publicada hoy destaca que los tiempos de traslado en la zona metropolitana se han incrementado un 25% en los últimos dos años. Especialistas sugieren acelerar la transición al transporte colectivo eléctrico e implementar sistemas inteligentes de semaforización en los principales cruces conflictivos.",
        "De acuerdo con cifras oficiales de la Secretaría de Desarrollo Sustentable, la actividad manufacturera y automotriz generó más de 4,000 nuevos empleos formales en el último trimestre. Esto consolida a Querétaro como uno de los líderes nacionales en atracción de inversión extranjera directa de alta tecnología."
      ];
      const sources = ["Protección Civil", "Facebook Vecinal", "Diario de Qro", "El Sol de Qro", "RR Noticias"];
      const types = ["facebook", "facebook", "medios", "medios", "medios"] as const;
      const colors = ["#ef4444", "#3b82f6", "#a855f7", "#06b6d4", "#10b981"];
      
      const randIdx = Math.floor(Math.random() * titles.length);
      const newNews: LiveNewsItem = {
        id: `news-${Date.now()}`,
        title: titles[randIdx],
        source: sources[randIdx],
        sourceType: types[randIdx],
        sourceColor: colors[randIdx],
        timeAgo: "Hace 1 min",
        timestamp: Date.now(),
        content: contents[randIdx]
      };

      // Add to feed
      setNewsFeed(prev => [newNews, ...prev]);

      // Handle scroll and new count badge
      const container = feedScrollRef.current;
      if (container) {
        const isAtTop = container.scrollTop < 25;
        if (!isAtTop) {
          setNewNewsCount(c => c + 1);
        } else {
          // Keep scrolled at top
          container.scrollTop = 0;
        }
      }
      
      addSessionLog(`Feed: Nota detectada en tiempo real: "${newNews.title}"`);
    }, 20000); // Ticks every 20 seconds

    return () => clearInterval(interval);
  }, [addSessionLog]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
          setIsSearchExpanded(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "?":
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          break;
        case "g":
          e.preventDefault();
          router.push("/");
          pushBreadcrumb("Resumen", "/");
          break;
        case "e":
          e.preventDefault();
          router.push("/publicaciones");
          pushBreadcrumb("Explorar", "/publicaciones");
          break;
        case "p":
          e.preventDefault();
          router.push("/perfiles");
          pushBreadcrumb("Perfiles", "/perfiles");
          break;
        case "o":
          e.preventDefault();
          router.push("/observatorio");
          pushBreadcrumb("Observatorio", "/observatorio");
          break;
        case "m":
          e.preventDefault();
          router.push("/paginas");
          pushBreadcrumb("Medios", "/paginas");
          break;
        case "f":
          e.preventDefault();
          setIsSearchExpanded(true);
          setTimeout(() => {
            const searchInput = document.getElementById("global-search-input");
            searchInput?.focus();
          }, 150);
          break;
        case "v":
          e.preventDefault();
          setIsPresentationMode(!isPresentationMode);
          break;
        case "escape":
          e.preventDefault();
          setShowShortcutsHelp(false);
          setShowConfig(false);
          setSelectedNote(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode, router, pushBreadcrumb, setIsPresentationMode, setIsSearchExpanded]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("sentinel_token");
    } catch (e) {}
    setIsAuthenticated(false);
    setShowConfig(false);
  };

  const handleScroll = () => {
    const container = feedScrollRef.current;
    if (!container) return;
    if (container.scrollTop < 10) {
      setNewNewsCount(0);
    }
  };

  const scrollToTop = () => {
    const container = feedScrollRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      setNewNewsCount(0);
    }
  };

  // Get search suggestions mock
  const getSearchSuggestions = () => {
    if (!searchQuery) return { noticias: [], perfiles: [], fuentes: [], temas: [] };
    const q = searchQuery.toLowerCase();
    
    const temasList = ["Delitos de Tránsito", "Seguridad Pública", "Bloqueos Viales", "Clima / Lluvias", "Incendios", "Salud Pública"];
    const fuentesList = ["El Sol de Querétaro", "RR Noticias", "Diario de Querétaro", "Facebook Monitoreo", "Alerta Vial"];
    const perfilesList = ["Claudia Sheinbaum", "Luis Nava", "Mauricio Kuri", "CEA Querétaro", "Milenio"];
    const noticiasList = [
      "Choque múltiple registrado en la Autopista México-Querétaro",
      "Inundaciones reportadas en Reforma Agraria por tormenta",
      "Detención preventiva por robo en la zona del Centro Histórico",
      "Bloqueo en la lateral de la autopista 57 por corte de luz"
    ];

    return {
      noticias: noticiasList.filter(n => n.toLowerCase().includes(q)).slice(0, 3),
      perfiles: perfilesList.filter(p => p.toLowerCase().includes(q)).slice(0, 3),
      fuentes: fuentesList.filter(f => f.toLowerCase().includes(q)).slice(0, 3),
      temas: temasList.filter(t => t.toLowerCase().includes(q)).slice(0, 3)
    };
  };

  const suggestions = getSearchSuggestions();
  const showSuggestions = searchQuery.length > 0;

  // Filtered live feed news
  const filteredNews = newsFeed.filter(item => {
    if (sidebarFilter === "Medios") return item.sourceType === "medios";
    if (sidebarFilter === "Facebook") return item.sourceType === "facebook";
    return true;
  });

  // Latency-based dynamic status indicator V5
  const getSystemStatus = () => {
    const lat = scrapersStatus.dbLatency;
    if (lat > 140) {
      return { color: "bg-red-500", text: "Sin actualización desde hace 2h", state: "error" };
    } else if (lat > 95) {
      return { color: "bg-amber-500", text: "Revisando fuentes...", state: "warning" };
    } else {
      return { color: "bg-green-500", text: "Actualizado hace 8 min", state: "normal" };
    }
  };

  const sysStatus = getSystemStatus();

  return (
    <div className={`h-screen w-screen bg-background text-foreground overflow-hidden flex flex-col font-sans select-none ${isPresentationMode ? "presentation-mode" : ""}`}>
      
      {/* 2px accent underline confirming source filtering */}
      {!isPresentationMode && (
        <div 
          className="absolute top-[54px] left-0 h-[2px] bg-accent-blue z-40 transition-all duration-500 ease-out" 
          style={{ 
            width: sourceWeight === 50 ? "0%" : "100%",
            opacity: sourceWeight === 50 ? 0 : 1
          }} 
        />
      )}

      {/* Zona E — Barra Superior V5 (56px) */}
      {!isPresentationMode && (
        <header className="h-[56px] bg-card-bg/85 backdrop-blur-xl border-b border-card-border px-6 flex items-center justify-between z-30 shrink-0 gap-4 relative">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-blue text-white shadow-sm hover:scale-[1.02] transition-all">
              <Shield className="h-4.5 w-4.5" />
            </Link>
            <span className="text-xs font-bold tracking-tight text-foreground font-sans uppercase">SENTINEL V5</span>
          </div>



          {/* Global Search and Mode controls */}
          <div className="flex items-center gap-4 shrink-0">
            
            {/* Tactical Search inline */}
            <div className="relative">
              <div className="relative">
                <input
                  id="global-search-input"
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchExpanded(true)}
                  onBlur={() => setTimeout(() => setIsSearchExpanded(false), 250)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscador global..."
                  className={`bg-card-bg/40 border border-card-border hover:border-card-border/80 focus:border-accent-blue px-3 py-1 pl-8 rounded-xl text-xs text-foreground focus:outline-none transition-all duration-300 ${
                    isSearchExpanded ? "w-[300px]" : "w-[160px]"
                  }`}
                />
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Suggestions overlay */}
              {isSearchExpanded && showSuggestions && (
                <div className="absolute top-9 right-0 bg-card-bg/95 border border-card-border rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-4 min-w-[360px] max-h-[300px] overflow-y-auto z-50 backdrop-blur-md">
                  <div className="space-y-1.5">
                    <p className="text-[8px] uppercase font-bold text-text-muted tracking-wider">Noticias / Temas</p>
                    {suggestions.noticias.map((item, idx) => (
                      <div key={idx} className="text-[10px] text-foreground/80 hover:text-foreground cursor-pointer truncate py-0.5" onClick={() => setSearchQuery(item)}>{item}</div>
                    ))}
                    {suggestions.temas.map((item, idx) => (
                      <div key={idx} className="text-[10px] text-accent-blue hover:text-accent-blue/80 cursor-pointer truncate py-0.5" onClick={() => setSearchQuery(item)}>{item}</div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] uppercase font-bold text-text-muted tracking-wider">Perfiles / Fuentes</p>
                    {suggestions.perfiles.map((item, idx) => (
                      <div key={idx} className="text-[10px] text-foreground/80 hover:text-foreground cursor-pointer truncate py-0.5" onClick={() => setSearchQuery(item)}>{item}</div>
                    ))}
                    {suggestions.fuentes.map((item, idx) => (
                      <div key={idx} className="text-[10px] text-purple-apple hover:text-purple-apple/80 cursor-pointer truncate py-0.5" onClick={() => setSearchQuery(item)}>{item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme & Shortcuts triggers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAlertsPanelOpen(true)}
                className="p-1.5 bg-card-bg hover:bg-card-border/50 border border-card-border rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors relative"
                title="Centro de Alertas"
              >
                <Bell className="w-3.5 h-3.5" />
                {alerts.filter(a => !readAlertIds.includes(a.id)).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-critical text-[8px] font-black text-white px-1 rounded-full animate-pulse border border-card-bg">
                    {alerts.filter(a => !readAlertIds.includes(a.id)).length}
                  </span>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className="p-1.5 bg-card-bg hover:bg-card-border/50 border border-card-border rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
                title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-attention" /> : <Moon className="w-3.5 h-3.5 text-accent-blue" />}
              </button>
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-1.5 bg-card-bg hover:bg-card-border/50 border border-card-border rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
                title="Atajos de teclado (?)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-5 w-[1px] bg-card-border" />

            {/* Status indicator V5 */}
            <div className="flex items-center gap-2 select-none" title={`Latencia: ${scrapersStatus.dbLatency}ms`}>
              <span className={`w-2 h-2 rounded-full ${sysStatus.color} animate-pulse`} />
              <span className="text-[11px] font-medium text-text-muted">{sysStatus.text}</span>
            </div>

            {/* Config menu */}
            <div className="relative">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-1.5 bg-card-bg hover:bg-card-border/50 border border-card-border rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              {showConfig && (
                <div className="absolute right-0 mt-2 w-44 bg-[#141414] border border-[#2b2b2b] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-1.5 border-b border-[#1f1f1f]">
                    <p className="text-[8.5px] font-bold uppercase text-gray-500">Sesión Táctica</p>
                    <p className="text-xs font-semibold text-white truncate mt-0.5">Analista General</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1a1a1a] text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer transition-colors font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>
      )}

      {/* Main Grid: Left Rail V5 + Main Canvas + Collapsible Right Sidebar V5 */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
        
        {/* Zona A — Sidebar Izquierdo (Command Rail, 60px) */}
        {!isPresentationMode && (
          <aside className="w-[60px] bg-card-bg/85 backdrop-blur-xl border-r border-card-border flex flex-col justify-between items-center py-4 z-40 select-none shrink-0 relative">
            <div className="flex flex-col items-center gap-6 w-full">
              
              {/* Logo / Home link */}
              <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-xl bg-card-border/30 border border-card-border hover:border-card-border/60 text-foreground shadow-sm hover:scale-[1.02] transition-all">
                <Shield className="h-5 w-5 text-accent-blue" />
              </Link>
              
              <div className="w-7 h-[1px] bg-card-border" />

              {/* Navigation Rail Buttons */}
              <nav className="flex flex-col gap-2.5 w-full items-center">
                {RAIL_ITEMS.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => addSessionLog(`Navegación: Cambio a ${item.label}`)}
                      className={`w-10 h-10 flex items-center justify-center transition-all duration-200 group relative rounded-lg ${
                        isActive
                          ? "text-accent-blue bg-card-border/20"
                          : "text-text-muted hover:text-foreground hover:bg-card-border/10"
                      }`}
                    >
                      {/* Active indicator: line on the left */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent-blue rounded-r" />
                      )}

                      <Icon className="h-5 w-5 shrink-0" />

                      {/* Small activity red dot if item has badge */}
                      {item.hasBadge && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-critical rounded-full border border-card-bg" />
                      )}
                      
                      {/* Premium Tooltip with quick context */}
                      <div className="absolute left-14 bg-card-bg/95 border border-card-border text-foreground text-xs py-2 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50 font-sans min-w-[160px] backdrop-blur-md">
                        <p className="font-bold">{item.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5 font-medium">{item.hoverContext}</p>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Scrapers Latency readout */}
            <div className="flex flex-col items-center gap-1.5 select-none pb-2">
              <span className="text-[8.5px] font-mono font-bold text-text-muted">{scrapersStatus.dbLatency}ms</span>
              <span className="w-2.5 h-2.5 rounded-full bg-ok animate-[pulse_2s_infinite]" title="Pipeline activo" />
            </div>
          </aside>
        )}

        {/* Center Main Canvas Container */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative">
          


          {/* Child pages content container */}
          <div className="flex-1 overflow-y-auto relative min-h-0">
            {children}
          </div>

          {/* Slide Lector completo Panel (Slides in from the right over the main canvas) */}
          {selectedNote && (
            <div className="absolute inset-0 bg-black/60 z-50 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedNote(null)}>
              <div 
                className="absolute top-0 right-0 h-full w-[480px] bg-[#141414] border-l border-[#1f1f1f] shadow-2xl p-6 flex flex-col justify-between z-50 animate-slideLeft overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-5">
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-400 font-mono">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNote.sourceColor }} />
                      {selectedNote.source}
                      <span className="text-gray-600">•</span>
                      {selectedNote.sourceType.toUpperCase()}
                    </span>
                    <button 
                      onClick={() => setSelectedNote(null)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-gray-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <h2 className="text-lg font-bold text-white leading-snug font-sans-editorial mb-3">
                    {selectedNote.title}
                  </h2>
                  
                  <div className="flex gap-2 text-[10px] text-gray-500 font-mono mb-6">
                    <span>Publicado: {selectedNote.timeAgo}</span>
                    <span>•</span>
                    <span>ID: {selectedNote.id}</span>
                  </div>

                  <div className="space-y-4 text-sm text-gray-300 leading-relaxed font-sans-editorial pr-1">
                    <p>{selectedNote.content}</p>
                    <p className="text-xs text-gray-500 italic mt-6 border-t border-[#1f1f1f] pt-4">
                      Sentinel AI Engine • Esta nota fue catalogada automáticamente. Los hipervínculos de temas y perfiles asociados pueden ser consultados en la sección de Explorar.
                    </p>
                  </div>
                </div>

                <div className="border-t border-card-border pt-4 mt-6 flex justify-end gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      router.push(`/publicaciones?id=${selectedNote.id}`);
                      setSelectedNote(null);
                    }}
                    className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Ver detalle completo de la noticia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* persistent alerts center panel */}
          {isAlertsPanelOpen && (
            <div className="absolute inset-0 bg-black/60 z-50 backdrop-blur-sm animate-fadeIn" onClick={() => setIsAlertsPanelOpen(false)}>
              <div 
                className="absolute top-0 right-0 h-full w-[460px] bg-[#141414] border-l border-[#1f1f1f] shadow-2xl p-6 flex flex-col z-50 animate-slideLeft overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Centro de Alertas</h2>
                  </div>
                  <button 
                    onClick={() => setIsAlertsPanelOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-gray-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Filters */}
                <div className="space-y-3 mb-4 shrink-0 text-xs">
                  {/* Severity Filter */}
                  <div className="flex items-center gap-1.5 bg-[#0d0d0d] p-1 border border-slate-850 rounded-xl">
                    {(['todos', 'critico', 'atencion', 'informativo'] as const).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setAlertsFilter(sev)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          alertsFilter === sev
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  {/* Read/Unread Filter */}
                  <div className="flex items-center gap-1.5 bg-[#0d0d0d] p-1 border border-slate-850 rounded-xl">
                    {(['todas', 'no_leidas', 'leidas'] as const).map((state) => (
                      <button
                        key={state}
                        onClick={() => setAlertsReadFilter(state)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          alertsReadFilter === state
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {state.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 min-h-0">
                  {alerts
                    .filter((alert) => {
                      if (alertsFilter !== 'todos' && alert.severidad !== alertsFilter) return false;
                      if (alertsReadFilter === 'no_leidas' && readAlertIds.includes(alert.id)) return false;
                      if (alertsReadFilter === 'leidas' && !readAlertIds.includes(alert.id)) return false;
                      return true;
                    })
                    .sort((a, b) => {
                      // Prioritize subscribed entities
                      const aSub = subscribedEntities.includes(a.entidad_nombre) ? 1 : 0;
                      const bSub = subscribedEntities.includes(b.entidad_nombre) ? 1 : 0;
                      if (aSub !== bSub) return bSub - aSub;
                      
                      // Next prioritize severity
                      const sevWeights = { critico: 3, atencion: 2, informativo: 1 };
                      return sevWeights[b.severidad] - sevWeights[a.severidad];
                    })
                    .map((alert) => {
                      const isSubscribed = subscribedEntities.includes(alert.entidad_nombre);
                      const isRead = readAlertIds.includes(alert.id);
                      
                      let sevColor = 'border-l-blue-500 text-blue-400 bg-blue-950/10 border-blue-900/20';
                      if (alert.severidad === 'critico') sevColor = 'border-l-red-500 text-red-400 bg-red-950/10 border-red-900/20';
                      if (alert.severidad === 'atencion') sevColor = 'border-l-amber-500 text-amber-400 bg-amber-950/10 border-amber-900/20';

                      return (
                        <div
                          key={alert.id}
                          className={`p-4 border border-l-4 rounded-xl flex flex-col gap-2 relative ${sevColor} ${
                            isSubscribed ? 'ring-1 ring-blue-500/30' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start select-none">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                              {alert.severidad === 'critico' && <AlertTriangle className="w-3.5 h-3.5" />}
                              <span>{alert.tipo} • {alert.severidad}</span>
                              {isSubscribed && (
                                <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.25 rounded text-[8px] tracking-normal">
                                  ★ Suscrito
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono">{alert.hace_cuanto}</span>
                          </div>
                          
                          <p className="text-xs text-gray-200 leading-relaxed font-medium">
                            {alert.descripcion}
                          </p>

                          <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-900 text-[10.5px]">
                            <button
                              onClick={() => {
                                if (isRead) {
                                  // Mark as unread: remove from array
                                  if (typeof window !== "undefined") {
                                    const next = readAlertIds.filter(id => id !== alert.id);
                                    localStorage.setItem("sentinel_read_alerts", JSON.stringify(next));
                                    window.dispatchEvent(new Event("storage")); // force update across context
                                  }
                                } else {
                                  markAlertAsRead(alert.id);
                                }
                              }}
                              className="text-gray-400 hover:text-white font-semibold transition-colors cursor-pointer"
                            >
                              {isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                            </button>

                            <button
                              onClick={() => {
                                markAlertAsRead(alert.id);
                                setIsAlertsPanelOpen(false);
                                pushBreadcrumb("Perfiles", `/perfiles?q=${encodeURIComponent(alert.entidad_nombre)}`);
                                router.push(`/perfiles?q=${encodeURIComponent(alert.entidad_nombre)}`);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Investigar
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {alerts.filter((alert) => {
                    if (alertsFilter !== 'todos' && alert.severidad !== alertsFilter) return false;
                    if (alertsReadFilter === 'no_leidas' && readAlertIds.includes(alert.id)) return false;
                    if (alertsReadFilter === 'leidas' && !readAlertIds.includes(alert.id)) return false;
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-xs font-semibold">
                      No hay alertas activas en esta categoría
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        
        {/* Presentation Mode close toggle */}
          {isPresentationMode && (
            <button 
              onClick={() => setIsPresentationMode(false)}
              className="absolute bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-2xl z-50 hover:bg-blue-700 transition-colors cursor-pointer"
              title="Salir de Modo Presentación"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          )}

          {!isMounted && (
            <div className="absolute inset-0 bg-[#0d0d0d] flex items-center justify-center font-mono text-xs text-slate-500 z-50">
              Cargando cuadrantes del sistema táctico...
            </div>
          )}

          {isMounted && !isAuthenticated && (
            <LoginOverlay onLoginSuccess={() => setIsAuthenticated(true)} />
          )}

        </main>

        {/* Zona D — Sidebar Derecho V5 (El Pulso, 300px, Colapsable) */}
        {!isPresentationMode && (
          <div className="flex z-35 shrink-0 relative">
            
            {/* Sidebar Collapse Toggle Handle */}
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="absolute top-1/2 -translate-y-1/2 -left-[14px] w-[14px] h-[48px] bg-card-bg hover:bg-card-border/60 border border-card-border border-r-0 rounded-l-md flex items-center justify-center text-text-muted hover:text-foreground cursor-pointer z-50 animate-fade-in"
              title={isRightSidebarOpen ? "Colapsar feed de noticias" : "Expandir feed de noticias"}
            >
              {isRightSidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Sidebar Body */}
            <aside 
              className={`bg-card-bg/85 backdrop-blur-xl border-l border-card-border h-full flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                isRightSidebarOpen ? "w-[300px] p-4.5" : "w-[0px] p-0 border-l-0"
              }`}
            >
              {isRightSidebarOpen && (
                <div className="flex-1 flex flex-col min-h-0 w-full relative">
                  
                  {/* Sidebar Header */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      Últimas noticias
                      <span className="w-1.5 h-1.5 rounded-full bg-ok animate-ping" />
                    </h3>
                    <span className="text-[9px] font-mono text-text-muted font-bold bg-card-border/40 px-2 py-0.5 rounded-md border border-card-border">
                      EN VIVO
                    </span>
                  </div>



                  {/* Scrollable Feed List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 relative min-h-0" ref={feedScrollRef} onScroll={handleScroll}>
                    
                    {/* Floating new news notification banner */}
                    {newNewsCount > 0 && (
                      <button
                        onClick={scrollToTop}
                        className="sticky top-0 left-0 right-0 mx-auto w-[180px] bg-accent-blue hover:bg-accent-blue/90 text-white text-[10px] font-bold py-1.5 px-3 rounded-full shadow-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer z-20 animate-bounce"
                      >
                        ↑ {newNewsCount} nuevas noticias
                      </button>
                    )}

                    {filteredNews.map((news) => (
                      <div
                        key={news.id}
                        onClick={() => {
                          setSelectedNote(news);
                          addSessionLog(`Lector: Abriendo nota en slider drawer: "${news.title}"`);
                        }}
                        className="p-3 bg-card-bg/40 hover:bg-card-border/20 border border-card-border rounded-xl cursor-pointer transition-all space-y-1.5 relative overflow-hidden group"
                        style={{
                          animation: "slideDownNews 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                        }}
                      >
                        {/* 3px Left source indicator bar */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-[3px] transition-all group-hover:w-[4px]" 
                          style={{ backgroundColor: news.sourceColor }}
                        />

                        <p className="text-[13px] font-semibold leading-snug text-foreground/90 group-hover:text-foreground transition-colors pl-1">
                          {news.title}
                        </p>
                        
                        <div className="flex justify-between items-center text-[9px] font-mono text-text-muted pl-1 select-none">
                          <span className="font-bold text-text-muted truncate max-w-[130px]">{news.source}</span>
                          <span className="shrink-0">{news.timeAgo}</span>
                        </div>
                      </div>
                    ))}

                    {filteredNews.length === 0 && (
                      <div className="text-center py-8 text-text-muted text-xs font-medium">
                        Sin publicaciones coincidentes
                      </div>
                    )}

                  </div>

                </div>
              )}
            </aside>
          </div>
        )}

      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowShortcutsHelp(false)}>
          <div 
            className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-[500px] p-6 shadow-2xl space-y-4 select-none animate-scaleIn text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-500" />
                Atajos de teclado globales
              </h3>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-[11px] text-gray-400 leading-relaxed">
              <div className="space-y-2">
                <p className="text-gray-300 font-sans font-bold border-b border-[#1f1f1f] pb-1">Navegación</p>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">G</kbd> <span>Resumen</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">E</kbd> <span>Explorar</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">P</kbd> <span>Perfiles</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">M</kbd> <span>Medios</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">O</kbd> <span>Observatorio</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-gray-300 font-sans font-bold border-b border-[#1f1f1f] pb-1">Controles</p>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">F</kbd> <span>Buscador Global</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">V</kbd> <span>Modo Presentación</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">Esc</kbd> <span>Cerrar paneles</span></div>
                <div className="flex justify-between"><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-bold">?</kbd> <span>Abrir ayuda</span></div>
              </div>
            </div>
            
            <p className="text-[9px] text-gray-500 text-center leading-relaxed pt-2 border-t border-[#1f1f1f] font-sans">
              Presiona cualquiera de los atajos desde cualquier sección del sistema para operar con agilidad.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
