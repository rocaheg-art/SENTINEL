"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useV3Context } from "@/context/V3Context";
import { getOverview, getPublications, Publication } from "@/lib/api";
import dynamic from "next/dynamic";

const LeafletMapWrapper = dynamic(() => import("./LeafletMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-slate-500">
      Cargando mapa dinámico...
    </div>
  ),
});
import { 
  MapPin, 
  Layers, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  ZoomIn, 
  ZoomOut,
  MapIcon,
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";

// Coordinate nodes for 32 Mexican states on an 800x480 SVG viewbox
export interface StateNode {
  id: string;
  name: string;
  x: number;
  y: number;
  neighbors: string[];
  cities: { name: string; lat: number; lng: number; x: number; y: number }[];
}

export const MEXICO_STATES: StateNode[] = [
  { id: "BC", name: "Baja California", x: 80, y: 70, neighbors: ["BCS", "SON"], cities: [{ name: "Tijuana", lat: 32.5, lng: -117.0, x: 70, y: 55 }, { name: "Mexicali", lat: 32.6, lng: -115.4, x: 100, y: 60 }, { name: "Ensenada", lat: 31.8, lng: -116.6, x: 75, y: 90 }] },
  { id: "BCS", name: "Baja California Sur", x: 120, y: 160, neighbors: ["BC"], cities: [{ name: "La Paz", lat: 24.1, lng: -110.3, x: 130, y: 170 }, { name: "Los Cabos", lat: 22.8, lng: -109.9, x: 135, y: 190 }] },
  { id: "SON", name: "Sonora", x: 180, y: 90, neighbors: ["BC", "SIN", "CHIH"], cities: [{ name: "Hermosillo", lat: 29.0, lng: -110.9, x: 175, y: 95 }, { name: "Nogales", lat: 31.3, lng: -110.9, x: 180, y: 70 }, { name: "Ciudad Obregón", lat: 27.4, lng: -109.9, x: 195, y: 120 }] },
  { id: "CHIH", name: "Chihuahua", x: 290, y: 90, neighbors: ["SON", "SIN", "DGO", "COAH"], cities: [{ name: "Chihuahua", lat: 28.6, lng: -106.0, x: 290, y: 95 }, { name: "Ciudad Juárez", lat: 31.7, lng: -106.4, x: 285, y: 50 }, { name: "Delicias", lat: 28.1, lng: -105.4, x: 310, y: 115 }] },
  { id: "SIN", name: "Sinaloa", x: 250, y: 180, neighbors: ["SON", "CHIH", "DGO", "NAY"], cities: [{ name: "Culiacán", lat: 24.8, lng: -107.3, x: 255, y: 180 }, { name: "Mazatlán", lat: 23.2, lng: -106.4, x: 270, y: 210 }, { name: "Los Mochis", lat: 25.7, lng: -108.9, x: 235, y: 155 }] },
  { id: "DGO", name: "Durango", x: 340, y: 185, neighbors: ["SIN", "CHIH", "COAH", "ZAC", "NAY"], cities: [{ name: "Durango Centro", lat: 24.0, lng: -104.6, x: 335, y: 190 }, { name: "Gómez Palacio", lat: 25.5, lng: -103.4, x: 360, y: 160 }] },
  { id: "COAH", name: "Coahuila", x: 410, y: 130, neighbors: ["CHIH", "DGO", "ZAC", "NL", "SLP"], cities: [{ name: "Saltillo", lat: 25.4, lng: -100.9, x: 430, y: 150 }, { name: "Torreón", lat: 25.5, lng: -103.4, x: 385, y: 145 }, { name: "Monclova", lat: 26.9, lng: -101.4, x: 420, y: 110 }] },
  { id: "ZAC", name: "Zacatecas", x: 400, y: 235, neighbors: ["DGO", "COAH", "SLP", "AGS", "JAL"], cities: [{ name: "Zacatecas Centro", lat: 22.7, lng: -102.5, x: 395, y: 240 }, { name: "Fresnillo", lat: 23.1, lng: -102.8, x: 385, y: 225 }] },
  { id: "NAY", name: "Nayarit", x: 350, y: 275, neighbors: ["SIN", "DGO", "ZAC", "JAL"], cities: [{ name: "Tepic", lat: 21.5, lng: -104.8, x: 345, y: 280 }, { name: "Bahía de Banderas", lat: 20.7, lng: -105.2, x: 335, y: 295 }] },
  { id: "JAL", name: "Jalisco", x: 390, y: 320, neighbors: ["NAY", "ZAC", "AGS", "SLP", "GTO", "MICH", "COL"], cities: [{ name: "Guadalajara", lat: 20.6, lng: -103.3, x: 395, y: 320 }, { name: "Puerto Vallarta", lat: 20.6, lng: -105.2, x: 350, y: 325 }, { name: "Zapopan", lat: 20.7, lng: -103.3, x: 390, y: 310 }] },
  { id: "COL", name: "Colima", x: 370, y: 370, neighbors: ["JAL", "MICH"], cities: [{ name: "Colima Centro", lat: 19.2, lng: -103.7, x: 370, y: 370 }, { name: "Manzanillo", lat: 19.0, lng: -104.3, x: 355, y: 380 }] },
  { id: "AGS", name: "Aguascalientes", x: 430, y: 280, neighbors: ["ZAC", "JAL"], cities: [{ name: "Aguascalientes Centro", lat: 21.8, lng: -102.2, x: 430, y: 280 }] },
  { id: "SLP", name: "San Luis Potosí", x: 480, y: 240, neighbors: ["ZAC", "COAH", "NL", "TAMPS", "VER", "HGO", "QRO", "GTO", "JAL"], cities: [{ name: "San Luis Potosí", lat: 22.1, lng: -100.9, x: 470, y: 245 }, { name: "Ciudad Valles", lat: 21.9, lng: -99.0, x: 505, y: 250 }, { name: "Matehuala", lat: 23.6, lng: -100.6, x: 475, y: 210 }] },
  { id: "GTO", name: "Guanajuato", x: 470, y: 295, neighbors: ["JAL", "SLP", "QRO", "MICH"], cities: [{ name: "León", lat: 21.1, lng: -101.6, x: 460, y: 295 }, { name: "Irapuato", lat: 20.6, lng: -101.3, x: 470, y: 305 }, { name: "Celaya", lat: 20.5, lng: -100.8, x: 480, y: 305 }] },
  { id: "QRO", name: "Querétaro", x: 510, y: 295, neighbors: ["GTO", "SLP", "HGO", "EDOMEX", "MICH"], cities: [{ name: "Querétaro Centro", lat: 20.5, lng: -100.3, x: 505, y: 300 }, { name: "San Juan del Río", lat: 20.3, lng: -99.9, x: 515, y: 310 }, { name: "El Marqués", lat: 20.6, lng: -100.2, x: 510, y: 295 }, { name: "Corregidora", lat: 20.5, lng: -100.4, x: 500, y: 305 }, { name: "Cadereyta", lat: 20.6, lng: -99.8, x: 520, y: 285 }, { name: "Jalpan", lat: 21.2, lng: -99.4, x: 525, y: 265 }] },
  { id: "MICH", name: "Michoacán", x: 450, y: 345, neighbors: ["JAL", "COL", "GTO", "QRO", "EDOMEX", "GRO"], cities: [{ name: "Morelia", lat: 19.7, lng: -101.1, x: 455, y: 345 }, { name: "Uruapan", lat: 19.4, lng: -102.0, x: 440, y: 355 }, { name: "Lázaro Cárdenas", lat: 17.9, lng: -102.2, x: 435, y: 385 }] },
  { id: "EDOMEX", name: "Estado de México", x: 515, y: 345, neighbors: ["MICH", "QRO", "HGO", "TLAX", "PUE", "GRO", "MOR", "CDMX"], cities: [{ name: "Toluca", lat: 19.2, lng: -99.6, x: 510, y: 350 }, { name: "Ecatepec", lat: 19.6, lng: -99.0, x: 525, y: 335 }, { name: "Naucalpan", lat: 19.4, lng: -99.2, x: 515, y: 340 }] },
  { id: "CDMX", name: "Ciudad de México", x: 535, y: 350, neighbors: ["EDOMEX", "MOR"], cities: [{ name: "Cuauhtémoc", lat: 19.4, lng: -99.1, x: 535, y: 348 }, { name: "Iztapalapa", lat: 19.3, lng: -99.0, x: 540, y: 352 }, { name: "Benito Juárez", lat: 19.3, lng: -99.1, x: 532, y: 351 }, { name: "Álvaro Obregón", lat: 19.3, lng: -99.2, x: 528, y: 353 }, { name: "Miguel Hidalgo", lat: 19.4, lng: -99.2, x: 530, y: 346 }] },
  { id: "MOR", name: "Morelos", x: 535, y: 375, neighbors: ["EDOMEX", "CDMX", "PUE", "GRO"], cities: [{ name: "Cuernavaca", lat: 18.9, lng: -99.2, x: 535, y: 375 }, { name: "Cuautla", lat: 18.8, lng: -98.9, x: 545, y: 380 }] },
  { id: "HGO", name: "Hidalgo", x: 540, y: 305, neighbors: ["QRO", "SLP", "VER", "PUE", "TLAX", "EDOMEX"], cities: [{ name: "Pachuca", lat: 20.1, lng: -98.7, x: 540, y: 305 }, { name: "Tulancingo", lat: 20.0, lng: -98.3, x: 550, y: 312 }] },
  { id: "TLAX", name: "Tlaxcala", x: 565, y: 340, neighbors: ["HGO", "EDOMEX", "PUE"], cities: [{ name: "Tlaxcala Centro", lat: 19.3, lng: -98.2, x: 565, y: 340 }] },
  { id: "PUE", name: "Puebla", x: 570, y: 365, neighbors: ["EDOMEX", "TLAX", "HGO", "VER", "OAX", "GRO", "MOR"], cities: [{ name: "Puebla Centro", lat: 19.0, lng: -98.2, x: 570, y: 365 }, { name: "Tehuacán", lat: 18.4, lng: -97.3, x: 585, y: 385 }] },
  { id: "VER", name: "Veracruz", x: 610, y: 325, neighbors: ["TAMPS", "SLP", "HGO", "PUE", "OAX", "TAB", "CHIS"], cities: [{ name: "Veracruz Puerto", lat: 19.1, lng: -96.1, x: 615, y: 330 }, { name: "Xalapa", lat: 19.5, lng: -96.9, x: 598, y: 325 }, { name: "Coatzacoalcos", lat: 18.1, lng: -94.5, x: 650, y: 375 }] },
  { id: "GRO", name: "Guerrero", x: 500, y: 400, neighbors: ["MICH", "EDOMEX", "MOR", "PUE", "OAX"], cities: [{ name: "Acapulco", lat: 16.8, lng: -99.9, x: 495, y: 410 }, { name: "Chilpancingo", lat: 17.5, lng: -99.5, x: 505, y: 395 }, { name: "Zihuatanejo", lat: 17.6, lng: -101.5, x: 460, y: 385 }] },
  { id: "OAX", name: "Oaxaca", x: 595, y: 410, neighbors: ["GRO", "PUE", "VER", "CHIS"], cities: [{ name: "Oaxaca de Juárez", lat: 17.0, lng: -96.7, x: 595, y: 410 }, { name: "Salina Cruz", lat: 16.1, lng: -95.2, x: 620, y: 430 }, { name: "Huatulco", lat: 15.7, lng: -96.1, x: 605, y: 440 }] },
  { id: "TAB", name: "Tabasco", x: 685, y: 380, neighbors: ["VER", "CHIS", "CAMP"], cities: [{ name: "Villahermosa", lat: 17.9, lng: -92.9, x: 685, y: 380 }, { name: "Cárdenas", lat: 17.9, lng: -93.3, x: 675, y: 382 }] },
  { id: "CHIS", name: "Chiapas", x: 715, y: 425, neighbors: ["OAX", "VER", "TAB"], cities: [{ name: "Tuxtla Gutiérrez", lat: 16.7, lng: -93.1, x: 710, y: 425 }, { name: "San Cristóbal", lat: 16.7, lng: -92.6, x: 725, y: 423 }, { name: "Tapachula", lat: 14.9, lng: -92.2, x: 735, y: 450 }] },
  { id: "CAMP", name: "Campeche", x: 745, y: 345, neighbors: ["TAB", "YUC", "QROO"], cities: [{ name: "Campeche Centro", lat: 19.8, lng: -90.5, x: 745, y: 345 }, { name: "Ciudad del Carmen", lat: 18.6, lng: -91.8, x: 718, y: 365 }] },
  { id: "YUC", name: "Yucatán", x: 765, y: 285, neighbors: ["CAMP", "QROO"], cities: [{ name: "Mérida", lat: 20.9, lng: -89.6, x: 765, y: 285 }, { name: "Valladolid", lat: 20.6, lng: -88.2, x: 785, y: 292 }] },
  { id: "QROO", name: "Quintana Roo", x: 800, y: 320, neighbors: ["YUC", "CAMP"], cities: [{ name: "Cancún", lat: 21.1, lng: -86.8, x: 815, y: 285 }, { name: "Playa del Carmen", lat: 20.6, lng: -87.0, x: 810, y: 300 }, { name: "Chetumal", lat: 18.5, lng: -88.3, x: 790, y: 350 }] },
  { id: "NL", name: "Nuevo León", x: 480, y: 150, neighbors: ["COAH", "SLP", "TAMPS"], cities: [{ name: "Monterrey", lat: 25.6, lng: -100.3, x: 480, y: 150 }, { name: "San Pedro", lat: 25.6, lng: -100.4, x: 472, y: 153 }, { name: "Apodaca", lat: 25.7, lng: -100.1, x: 490, y: 145 }, { name: "Guadalupe", lat: 25.6, lng: -100.2, x: 485, y: 152 }] },
  { id: "TAMPS", name: "Tamaulipas", x: 515, y: 175, neighbors: ["NL", "SLP", "VER"], cities: [{ name: "Tampico", lat: 22.2, lng: -97.8, x: 520, y: 235 }, { name: "Reynosa", lat: 26.0, lng: -98.2, x: 495, y: 135 }, { name: "Matamoros", lat: 25.8, lng: -97.5, x: 508, y: 140 }, { name: "Ciudad Victoria", lat: 23.7, lng: -99.1, x: 505, y: 185 }] }
];

export default function GlobalMapCanvas() {
  const { 
    dateRange, 
    geography, 
    setGeography, 
    selectedCategories,
    sourceWeight,
    pushBreadcrumb,
    breadcrumbs,
    setBreadcrumbs,
    addSessionLog
  } = useV3Context();

  const [activeLayers, setActiveLayers] = useState({
    calor: true,
    markers: true,
    flows: false
  });
  
  const [loading, setLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [zoomNode, setZoomNode] = useState<StateNode | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<StateNode | null>(null);
  const [hoveredCity, setHoveredCity] = useState<any>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Load initial statistics
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getOverview();
        setOverviewData(data);
      } catch (err) {
        console.error("Failed to load map overview data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateRange]);

  // Handle Zoom change based on state context selection
  useEffect(() => {
    if (geography.state) {
      const match = MEXICO_STATES.find(s => s.name.toLowerCase() === geography.state?.toLowerCase() || s.id.toLowerCase() === geography.state?.toLowerCase());
      if (match) {
        setZoomNode(match);
      }
    } else {
      setZoomNode(null);
      setSelectedCity(null);
    }
  }, [geography.state]);

  // Build state-based statistics based on API or mock database reference
  const stateStats = useMemo(() => {
    // Generate simulated/aggregated counts mapped to states
    const seed: Record<string, { count: number; severity: number; sentiment: string }> = {
      QRO: { count: 184, severity: 5.8, sentiment: "neutral" },
      NL: { count: 142, severity: 6.2, sentiment: "negativo" },
      CDMX: { count: 210, severity: 5.4, sentiment: "neutral" },
      JAL: { count: 98, severity: 5.9, sentiment: "negativo" },
      EDOMEX: { count: 115, severity: 6.4, sentiment: "negativo" },
      VER: { count: 68, severity: 5.1, sentiment: "neutral" },
      SON: { count: 54, severity: 4.8, sentiment: "positivo" },
      CHIH: { count: 72, severity: 5.7, sentiment: "neutral" },
      COAH: { count: 32, severity: 4.2, sentiment: "positivo" },
      TAMPS: { count: 88, severity: 6.8, sentiment: "negativo" },
      GRO: { count: 79, severity: 7.1, sentiment: "negativo" },
      PUE: { count: 61, severity: 5.0, sentiment: "neutral" },
      MICH: { count: 85, severity: 6.9, sentiment: "negativo" }
    };

    // Fill other states with low counts
    MEXICO_STATES.forEach(st => {
      if (!seed[st.id]) {
        // Pseudo-random but deterministic based on state code length
        const hash = st.name.length;
        seed[st.id] = {
          count: hash * 2 + 3,
          severity: 3.5 + (hash % 4),
          sentiment: hash % 3 === 0 ? "positivo" : hash % 3 === 1 ? "neutral" : "negativo"
        };
      }
    });

    return seed;
  }, []);

  // Total active incident volume filtered by categories
  const currentTotal = useMemo(() => {
    let tot = 0;
    Object.values(stateStats).forEach(s => tot += s.count);
    return tot;
  }, [stateStats]);

  // Rankings of states sorted by volume
  const rankedStates = useMemo(() => {
    return MEXICO_STATES.map(s => ({
      ...s,
      count: stateStats[s.id]?.count || 0,
      severity: stateStats[s.id]?.severity || 0,
      sentiment: stateStats[s.id]?.sentiment || "neutral"
    })).sort((a, b) => b.count - a.count);
  }, [stateStats]);

  // Category distribution data based on selection
  const categoryDistribution = useMemo(() => {
    // Category mapping counts
    return [
      { name: "Delitos", value: 34, color: "#f43f5e" },
      { name: "Vialidad / Bloqueos", value: 28, color: "#3b82f6" },
      { name: "Clima / Lluvias", value: 20, color: "#06b6d4" },
      { name: "Salud Pública", value: 12, color: "#10b981" },
      { name: "Otros", value: 6, color: "#8b5cf6" }
    ];
  }, []);

  // Trend data mapping
  const trendData = useMemo(() => {
    return [
      { day: "Lun", volumen: 180, severidad: 4.8 },
      { day: "Mar", volumen: 220, severidad: 5.2 },
      { day: "Mié", volumen: 280, severidad: 6.1 },
      { day: "Jue", volumen: 190, severidad: 5.0 },
      { day: "Vie", volumen: 240, severidad: 5.6 },
      { day: "Sáb", volumen: 310, severidad: 7.2 },
      { day: "Dom", volumen: 260, severidad: 6.4 }
    ];
  }, []);

  // State colors for SVG map coropleta scale
  const getStateColor = (id: string, isHovered = false) => {
    const stats = stateStats[id];
    if (!stats) return "rgba(15, 23, 42, 0.4)";
    const count = stats.count;

    // Scale color: Blue pale to cyan neon
    let baseColor = "rgba(30, 41, 59, 0.4)";
    let strokeColor = "rgba(59, 130, 246, 0.2)";

    if (count > 150) {
      baseColor = isHovered ? "rgba(147, 51, 234, 0.55)" : "rgba(147, 51, 234, 0.35)"; // Critical Purple-pink
    } else if (count > 90) {
      baseColor = isHovered ? "rgba(59, 130, 246, 0.6)" : "rgba(59, 130, 246, 0.4)"; // High Active Blue
    } else if (count > 40) {
      baseColor = isHovered ? "rgba(6, 182, 212, 0.5)" : "rgba(6, 182, 212, 0.3)"; // Medium Active Cyan
    } else {
      baseColor = isHovered ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)"; // Low Active Green
    }
    return baseColor;
  };

  const getStateGlowColor = (id: string) => {
    const stats = stateStats[id];
    if (!stats) return "#475569";
    if (stats.count > 150) return "#ef4444"; // Red/Crimson glow
    if (stats.count > 90) return "#3b82f6"; // Blue glow
    if (stats.count > 40) return "#06b6d4"; // Cyan glow
    return "#10b981"; // Green
  };

  const handleStateClick = (node: StateNode) => {
    setZoomNode(node);
    setSelectedCity(null);
    setGeography({
      country: "México",
      state: node.name,
      city: null
    });
    pushBreadcrumb(`Lienzo Global > ${node.name}`, `/?state=${node.id}`);
    addSessionLog(`Navegación: Zoom semántico en región ${node.name}`);
  };

  const handleCityClick = (cityName: string) => {
    setSelectedCity(cityName);
    setGeography({
      ...geography,
      city: cityName
    });
    addSessionLog(`Navegación: Filtrando incidentes específicos de ciudad: ${cityName}`);
  };

  const resetZoom = () => {
    setZoomNode(null);
    setSelectedCity(null);
    setGeography({
      country: "México",
      state: null,
      city: null
    });
    // Reset breadcrumbs to root
    setBreadcrumbs([{ label: "Lienzo Global", path: "/" }]);
    addSessionLog("Navegación: Retorno de zoom semántico a vista nacional");
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 bg-background select-none font-sans relative overflow-hidden text-foreground flex flex-col">
      
      {/* FULLSCREEN MAP VIEWPORT */}
      <div className="flex-1 w-full h-full relative">
        
        {/* Controls Overlay top bar (Floating top bar Apple style) */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[400] bg-card-bg/90 backdrop-blur-md border border-card-border p-4 rounded-2xl shadow-lg pointer-events-auto">
          <div>
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <MapIcon className="w-4.5 h-4.5 text-blue-505" />
              SALA DE CONTROL GEOGRÁFICO: REPÚBLICA MEXICANA
            </h1>
            <p className="text-[10px] text-text-muted mt-0.5 hidden sm:block">
              Visualizador dinámico de coropleta. Navega y haz clic en nodos para realizar zoom semántico.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Layers Toggles */}
            <div className="flex items-center bg-card-bg border border-card-border rounded-xl p-1 gap-1">
              <button 
                onClick={() => setActiveLayers(l => ({ ...l, calor: !l.calor }))}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                  activeLayers.calor ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
                title="Conmutar Capa de Calor"
              >
                Calor
              </button>
              <button 
                onClick={() => setActiveLayers(l => ({ ...l, markers: !l.markers }))}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                  activeLayers.markers ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
                title="Conmutar Incidentes Pulsantes"
              >
                Eventos
              </button>
              <button 
                onClick={() => setActiveLayers(l => ({ ...l, flows: !l.flows }))}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                  activeLayers.flows ? "bg-blue-600 text-white shadow-sm" : "text-text-muted hover:text-foreground"
                }`}
                title="Conmutar Curvas de Flujos"
              >
                Flujos
              </button>
            </div>

            {zoomNode && (
              <button 
                onClick={resetZoom}
                className="px-2.5 py-1 bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl text-[9px] font-bold font-mono flex items-center gap-1 cursor-pointer hover:bg-red-900/20 hover:scale-[1.02] transition-all"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                VISTA NACIONAL
              </button>
            )}
          </div>
        </div>

        {/* Semantical fullscreen map viewport container */}
        <div className="w-full h-full absolute inset-0 z-0">
          
          <LeafletMapWrapper
            geography={geography}
            stateStats={stateStats}
            selectedCity={selectedCity}
            activeLayers={activeLayers}
            onStateClick={handleStateClick}
            onCityClick={handleCityClick}
          />

          {/* Map Legend Overlay (Apple style, bottom-right) */}
          <div className="absolute bottom-4 right-4 bg-card-bg/90 backdrop-blur-md border border-card-border p-3.5 rounded-xl shadow-lg z-[400] text-[9px] space-y-1.5 select-none text-text-muted w-[145px] font-mono pointer-events-auto">
            <p className="font-bold text-foreground text-[9.5px] uppercase font-sans mb-1">Severidad Vial</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-purple-600/60 border border-purple-500/30" />
              <span>Alto / Crítico</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-blue-600/60 border border-blue-500/30" />
              <span>Medio / Activo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-cyan-600/60 border border-cyan-500/30" />
              <span>Bajo / Preventivo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600/40 border border-emerald-500/30" />
              <span>Mínimo</span>
            </div>
          </div>
        </div>

        {/* Selected Regional Context Card (Floating Apple style, bottom-left) */}
        {zoomNode && (
          <div className="absolute bottom-4 left-4 bg-card-bg/90 backdrop-blur-md border border-card-border p-4 rounded-xl flex items-center justify-between shadow-lg text-xs text-foreground z-[400] w-[320px] sm:w-[420px] pointer-events-auto">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-505 animate-pulse" />
                <span className="font-bold text-foreground truncate">{zoomNode.name}</span>
                {selectedCity && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="font-bold text-cyan-600 truncate">{selectedCity}</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-text-muted leading-tight">
                Cuadrante de {selectedCity ? `${selectedCity}, ${zoomNode.name}` : `Región ${zoomNode.name}`}. Se detectaron <strong className="text-foreground">{(stateStats[zoomNode.id]?.count || 0)} publicaciones</strong> activas.
              </p>
            </div>
            <div className="flex items-center gap-4 text-right shrink-0 pl-3">
              <div>
                <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Sev Prom</p>
                <p className="text-sm font-black text-foreground font-mono">
                  {(stateStats[zoomNode.id]?.severity || 0).toFixed(1)}/10
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Clima</p>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold inline-block mt-0.5 uppercase ${
                  stateStats[zoomNode.id]?.sentiment === "positivo" 
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : stateStats[zoomNode.id]?.sentiment === "negativo"
                    ? "bg-red-500/10 text-red-650 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}>
                  {stateStats[zoomNode.id]?.sentiment}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LATERAL PANEL - METRICS AS A FLOATING APPLE CARD (overlay on top of map, absolute positioning, top right, scrollable) */}
      <div className="absolute top-[88px] right-4 w-[360px] max-h-[calc(100vh-120px)] z-[400] p-5 flex flex-col space-y-4 bg-card-bg/90 backdrop-blur-md border border-card-border rounded-2xl shadow-xl overflow-y-auto pointer-events-auto scrollbar-thin">
        
        {/* Header/Title with Toggle */}
        <div className="flex items-center justify-between shrink-0 border-b border-card-border pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {zoomNode ? `Métricas: ${zoomNode.name}` : "Métricas Nacionales"}
            </h2>
            <p className="text-[9px] text-text-muted mt-0.5">Resumen de indicadores clave</p>
          </div>
          {isPanelExpanded && (
            <button
              onClick={() => setIsPanelExpanded(false)}
              className="px-2 py-1 bg-background border border-card-border hover:brightness-95 rounded-lg text-[9px] font-bold text-text-muted hover:text-foreground transition-all cursor-pointer uppercase tracking-wider animate-fade-in"
            >
              Contraer
            </button>
          )}
        </div>

        {!isPanelExpanded ? (
          /* Condensed View: 3 Keys */
          <div className="space-y-4 flex-1">
            {/* Key 1: Casos Semanales */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl select-none relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Casos Semanales
                </span>
                <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-md">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-foreground font-mono">
                  {zoomNode ? (stateStats[zoomNode.id]?.count || 0) : currentTotal}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +12.4% vs semana ant
                </span>
              </div>
            </div>

            {/* Key 2: Tema Dominante */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl select-none relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Tema Dominante
                </span>
                <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-md">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-lg font-bold text-foreground">
                  {zoomNode ? (zoomNode.id === "QRO" ? "Delitos de Tránsito" : "Vialidad / Bloqueos") : "Vialidad / Bloqueos"}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  28% de volumen
                </span>
              </div>
            </div>

            {/* Key 3: Tono/Sentimiento */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl select-none relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Polaridad de Tono
                </span>
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-md">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${
                  (zoomNode ? stateStats[zoomNode.id]?.sentiment : "neutral") === "positivo" 
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : (zoomNode ? stateStats[zoomNode.id]?.sentiment : "neutral") === "negativo"
                    ? "bg-red-500/10 text-red-650 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}>
                  {zoomNode ? stateStats[zoomNode.id]?.sentiment : "Neutral / Estable"}
                </span>
                <span className="text-[10px] text-text-muted">
                  Predominio en medios
                </span>
              </div>
            </div>

            {/* Ver Más Button */}
            <div className="pt-2">
              <button
                onClick={() => setIsPanelExpanded(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                Ver Análisis Completo
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded View: Full V3 Details */
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            {/* State / Incident Summary KPI */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl select-none relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-sm animate-fade-in">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {zoomNode ? `Incidencias: ${zoomNode.name}` : "Volumen Nacional Activo"}
                </span>
                <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-md">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black tracking-tight text-foreground font-mono">
                  {zoomNode ? (stateStats[zoomNode.id]?.count || 0) : currentTotal}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +12.4% vs semana ant
                </span>
              </div>
            </div>

            {/* Donut Chart - Category Distribution */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl flex flex-col min-h-[220px] shadow-sm animate-fade-in">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {zoomNode ? `Distribución Temática: ${zoomNode.name}` : "Distribución Temática Nacional"}
                </h2>
                <p className="text-[9px] text-text-muted mt-0.5">Clasificación temática de incidentes viales</p>
              </div>
              
              <div className="flex-1 flex items-center justify-between min-h-[140px] mt-2">
                <div className="w-[130px] h-[130px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          background: "var(--card-bg)",
                          border: "1px solid var(--card-border)",
                          borderRadius: "8px",
                          fontSize: "10px",
                          color: "var(--foreground)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-1.5 pl-6 font-mono text-[9px] text-text-muted">
                  {categoryDistribution.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-[130px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate text-foreground font-sans">{cat.name}</span>
                      </div>
                      <span className="text-foreground font-bold">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trend Sparklines Chart */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl flex flex-col min-h-[190px] shadow-sm animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Tendencia Temporal (7 Días)
                </h2>
                <p className="text-[9px] text-text-muted mt-0.5">Volumen diario y severidad de sucesos</p>
              </div>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolumen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      stroke="var(--card-border)" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="var(--card-border)" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                        fontSize: "10px",
                        fontFamily: "monospace"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="volumen" 
                      stroke="#2563eb" 
                      fillOpacity={1} 
                      fill="url(#colorVolumen)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* State ranking scrollable list */}
            <div className="card-intelligence p-5 bg-background border border-card-border rounded-xl flex flex-col flex-1 min-h-[220px] overflow-hidden shadow-sm animate-fade-in">
              <div className="mb-3 shrink-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Ranking Regional de Criticidad
                </h2>
                <p className="text-[9px] text-text-muted mt-0.5">Foco de incidentes ordenados por volumen</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {rankedStates.slice(0, 10).map((st, idx) => {
                  const isSelected = geography.state === st.name;
                  return (
                    <div 
                      key={st.id}
                      onClick={() => handleStateClick(st)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? "bg-blue-500/10 border-blue-600 shadow-sm"
                          : "bg-card-bg hover:brightness-95 border-card-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[10px] font-mono font-bold text-text-muted w-4">{idx + 1}</span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-foreground group-hover:text-blue-600 truncate">{st.name}</p>
                          <p className="text-[9px] text-text-muted font-mono mt-0.25">SEV: <span className="font-bold text-foreground">{st.severity.toFixed(1)}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-bold text-foreground">{st.count}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          st.count > 150 ? "bg-purple-500" : st.count > 90 ? "bg-blue-500" : "bg-cyan-500"
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
