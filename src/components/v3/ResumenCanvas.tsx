"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useV3Context } from "@/context/V3Context";
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Search, 
  User, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  Check,
  Flame,
  Volume2,
  Newspaper,
  FileText,
  X,
  Sparkles,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Bubble physics types
interface ThemeBubble {
  id: string;
  title: string;
  count: number;
  prevCount: number;
  sentiment: "positivo" | "neutral" | "negativo";
  color: string;
  phrase: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

// Custom Counter Hook for Stat Hero & metrics
function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800; // 800ms duration per V5 specifications
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <>{count.toLocaleString()}</>;
}

export default function ResumenCanvas() {
  const router = useRouter();
  const { timePreset, setTimePreset, pushBreadcrumb, sourceWeight } = useV3Context();
  
  // Local state
  const [chartMetric, setChartMetric] = useState<"Volumen" | "Sentimiento">("Volumen");
  const [activeEmisorToggle, setActiveEmisorToggle] = useState<"Prioridades" | "Medios">("Prioridades");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hasAnomalies, setHasAnomalies] = useState(true);

  // Canvas Refs & States for Bouncing Bubbles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 220 });
  const bubblesRef = useRef<ThemeBubble[]>([]);
  const [hoveredBubble, setHoveredBubble] = useState<ThemeBubble | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Calculate sentiment & volume stats based on slider and time range
  const sentimentStats = useMemo(() => {
    if (sourceWeight === 0) { // Facebook/Instagram
      return { rojo: 42, gris: 38, verde: 20, termValue: 25, word: "Tenso" };
    } else if (sourceWeight === 100) { // Medios formales
      return { rojo: 18, gris: 57, verde: 25, termValue: 50, word: "Neutro" };
    } else { // Todo
      return { rojo: 28, gris: 52, verde: 20, termValue: 68, word: "Activo" };
    }
  }, [sourceWeight]);

  // Bubbles data generator
  const initialBubbles = useMemo((): ThemeBubble[] => {
    const mult = timePreset === "Hoy" ? 1 : timePreset === "7D" ? 6 : 24;
    return [
      {
        id: "b-1",
        title: "Seguridad Pública",
        count: Math.round(180 * mult),
        prevCount: Math.round(150 * mult),
        sentiment: "negativo",
        color: "#DC2626", // Semántico crítico
        phrase: "Presencia policial en Bernardo Quintana tras reporte de detonaciones.",
        x: 150, y: 120, vx: 0.5, vy: -0.3, radius: 0
      },
      {
        id: "b-2",
        title: "Servicios CEA",
        count: Math.round(140 * mult),
        prevCount: Math.round(160 * mult),
        sentiment: "neutral",
        color: "#D97706", // Semántico atención
        phrase: "Falta de suministro de agua potable afecta a Juriquilla por segundo día.",
        x: 250, y: 150, vx: -0.4, vy: 0.5, radius: 0
      },
      {
        id: "b-3",
        title: "Vialidad / Lluvias",
        count: Math.round(120 * mult),
        prevCount: Math.round(110 * mult),
        sentiment: "negativo",
        color: "#DC2626",
        phrase: "Encharcamientos severos afectan vialidades del sur de la ciudad.",
        x: 120, y: 180, vx: 0.6, vy: 0.3, radius: 0
      },
      {
        id: "b-4",
        title: "Obras Públicas",
        count: Math.round(220 * mult),
        prevCount: Math.round(210 * mult),
        sentiment: "neutral",
        color: "#2563EB", // Semántico informativo
        phrase: "Apertura de carriles laterales en Bernardo Quintana agiliza flujo vial.",
        x: 320, y: 90, vx: -0.3, vy: -0.4, radius: 0
      },
      {
        id: "b-5",
        title: "Salud y Educación",
        count: Math.round(90 * mult),
        prevCount: Math.round(95 * mult),
        sentiment: "positivo",
        color: "#059669", // Semántico resuelto
        phrase: "Secundarias públicas reciben equipamiento técnico y apoyos.",
        x: 400, y: 130, vx: 0.4, vy: 0.4, radius: 0
      },
      {
        id: "b-6",
        title: "Comunidad / Eventos",
        count: Math.round(120 * mult),
        prevCount: Math.round(80 * mult),
        sentiment: "positivo",
        color: "#059669",
        phrase: "Inauguran nueva ciclovía y parque deportivo en Corregidora.",
        x: 280, y: 160, vx: -0.5, vy: -0.5, radius: 0
      }
    ];
  }, [timePreset]);

  // Handle Resize of canvas parent container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        setCanvasSize({
          width: canvas.parentElement.clientWidth,
          height: canvas.parentElement.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Physics animation loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxCount = Math.max(...initialBubbles.map(b => b.count), 1);

    bubblesRef.current = initialBubbles.map((item) => {
      const existing = bubblesRef.current.find(b => b.id === item.id);
      const targetRadius = 35 + (item.count / maxCount) * 35; // Bolder radius scaling
      return {
        ...item,
        radius: targetRadius,
        x: existing ? existing.x : item.x,
        y: existing ? existing.y : item.y,
        vx: existing ? existing.vx : item.vx,
        vy: existing ? existing.vy : item.vy
      };
    });

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      const bubbles = bubblesRef.current;

      bubbles.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;

        // Wall collisions
        if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -1; }
        if (b.x + b.radius > canvasSize.width) { b.x = canvasSize.width - b.radius; b.vx *= -1; }
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -1; }
        if (b.y + b.radius > canvasSize.height) { b.y = canvasSize.height - b.radius; b.vy *= -1; }

        // Bubble collisions
        bubbles.forEach((other) => {
          if (b.id === other.id) return;
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = b.radius + other.radius;

          if (dist < minDist) {
            const overlap = minDist - dist;
            // Push apart slightly to prevent sticking
            const pushX = (dx / dist) * overlap * 0.5;
            const pushY = (dy / dist) * overlap * 0.5;
            b.x -= pushX;
            b.y -= pushY;
            other.x += pushX;
            other.y += pushY;

            // Swapping velocities
            const tempVx = b.vx;
            const tempVy = b.vy;
            b.vx = other.vx;
            b.vy = other.vy;
            other.vx = tempVx;
            other.vy = tempVy;
          }
        });

        // Drawing bubble
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `${b.color}14`; // 8% opacity fill matching dashboard layout guidelines
        ctx.fill();

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = hoveredBubble?.id === b.id ? 2.5 : 1.25;
        ctx.globalAlpha = 0.8;
        ctx.stroke();

        // Canvas descriptive texts
        ctx.globalAlpha = 1.0;
        const isLightMode = typeof document !== "undefined" && document.body.classList.contains("light");
        ctx.fillStyle = isLightMode ? "#1E293B" : "#f0f6fc";
        ctx.font = "bold 10px var(--font-sans), sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textY = b.radius > 45 ? b.y - 6 : b.y;
        ctx.fillText(b.title.split(" ")[0], b.x, textY);

        if (b.radius > 45) {
          ctx.font = "bold 9px var(--font-mono), monospace";
          ctx.fillStyle = b.color;
          ctx.fillText(`${b.count} nts`, b.x, b.y + 8);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [canvasSize, initialBubbles, hoveredBubble]);

  // Canvas mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Check if mouse is over any bubble
    const hit = bubblesRef.current.find((b) => {
      const dx = b.x - x;
      const dy = b.y - y;
      return Math.sqrt(dx * dx + dy * dy) < b.radius;
    });

    setHoveredBubble(hit || null);
  };

  const handleCanvasClick = () => {
    if (hoveredBubble) {
      addSessionLog(`Navegación: Explorando perfil de tema: ${hoveredBubble.title}`);
      pushBreadcrumb("Explorar", "/explorar");
      router.push("/explorar");
    }
  };

  const addSessionLog = (msg: string) => {
    console.log(msg);
  };

  const podiumData = useMemo(() => {
    if (activeEmisorToggle === "Medios") {
      return {
        top3: [
          { name: "RR Noticias Qro", count: 185, height: "h-[80px]", border: "border-blue-900/40 bg-blue-950/10 text-blue-400" },
          { name: "Diario de Querétaro", count: 240, height: "h-[110px]", border: "border-indigo-900/40 bg-indigo-950/10 text-indigo-400" },
          { name: "El Sol de San Juan", count: 122, height: "h-[65px]", border: "border-cyan-900/40 bg-cyan-950/10 text-cyan-400" }
        ],
        ranks: [
          { name: "Alerta Qro", count: 98 },
          { name: "Plaza de Armas", count: 85 },
          { name: "Presencia Universitaria", count: 72 },
          { name: "La Sombra de Arteaga", count: 54 },
          { name: "Quadratín Querétaro", count: 48 }
        ]
      };
    } else {
      return {
        top3: [
          { name: "Vialidad Bernardo Q.", count: 180, height: "h-[80px]", border: "border-red-900/40 bg-red-950/10 text-red-400" },
          { name: "Seguridad Ciudadana", count: 240, height: "h-[110px]", border: "border-amber-900/40 bg-amber-950/10 text-amber-400" },
          { name: "CEA Querétaro", count: 130, height: "h-[65px]", border: "border-blue-900/40 bg-blue-950/10 text-blue-400" }
        ],
        ranks: [
          { name: "El Marqués al Día", count: 112 },
          { name: "San Juan del Río Foros", count: 85 },
          { name: "Tránsito Bernardo Quintana", count: 79 },
          { name: "Protección Civil Qro", count: 68 },
          { name: "Alerta Vial Corregidora", count: 52 }
        ]
      };
    }
  }, [activeEmisorToggle]);

  // Block 4 Evolution Chart Dataset
  const evolutionChartData = useMemo(() => {
    if (chartMetric === "Volumen") {
      return [
        { day: "Lun", current: 30, prev: 28, marker: false },
        { day: "Mar", current: 45, prev: 32, marker: false },
        { day: "Mié", current: 85, prev: 40, marker: true, markerLabel: "Pico inusual", markerColor: "#D97706" },
        { day: "Jue", current: 50, prev: 42, marker: false },
        { day: "Vie", current: 60, prev: 38, marker: false },
        { day: "Sáb", current: 15, prev: 20, marker: true, markerLabel: "Día tranquilo", markerColor: "#8b949e" },
        { day: "Dom", current: 25, prev: 18, marker: false }
      ];
    } else {
      return [
        { day: "Lun", current: 55, prev: 50, marker: false },
        { day: "Mar", current: 52, prev: 55, marker: false },
        { day: "Mié", current: 30, prev: 54, marker: true, markerLabel: "Tensión alta", markerColor: "#DC2626" },
        { day: "Jue", current: 48, prev: 58, marker: false },
        { day: "Vie", current: 62, prev: 56, marker: false },
        { day: "Sáb", current: 68, prev: 58, marker: false },
        { day: "Dom", current: 65, prev: 60, marker: false }
      ];
    }
  }, [chartMetric]);

  const yAxisTicks = chartMetric === "Volumen" 
    ? (timePreset === "Hoy" ? [5, 15, 25] : timePreset === "30D" ? [100, 300, 500] : [15, 50, 85])
    : [30, 52, 70];

  const formatYAxisTick = (val: number) => {
    if (chartMetric === "Volumen") {
      if (timePreset === "Hoy") {
        if (val === 5) return "Bajo";
        if (val === 15) return "Medio";
        return "Alto";
      }
      if (timePreset === "30D") {
        if (val === 100) return "Bajo";
        if (val === 300) return "Medio";
        return "Alto";
      }
      if (val === 15) return "Bajo";
      if (val === 50) return "Medio";
      return "Alto";
    } else {
      if (val === 30) return "Crítico";
      if (val === 52) return "Neutro";
      return "Estable";
    }
  };

  const getCategoryColor = (cat: string) => {
    if (cat === "delito" || cat === "bloqueo") return "text-white bg-critical";
    if (cat === "corte_agua") return "text-white bg-attention";
    return "text-white bg-info";
  };

  const scoredEventsList = useMemo(() => {
    return [
      { id: "e-1", title: "Enfrentamiento armado en Bernardo Quintana", categoria: "delito", fuentes_count: 5, post_count: 14, ubicacion: "Querétaro Centro", severity: 5, engagement: 820 },
      { id: "e-2", title: "Corte de agua prolongado en Juriquilla", categoria: "corte_agua", fuentes_count: 3, post_count: 8, ubicacion: "Juriquilla", severity: 3, engagement: 420 },
      { id: "e-3", title: "Bloqueo vial de manifestantes en 5 de Febrero", categoria: "bloqueo", fuentes_count: 4, post_count: 9, ubicacion: "Carrillo Puerto", severity: 4, engagement: 560 }
    ].map(evt => {
      const score = (evt.severity * 0.4) + (Math.log10(evt.engagement) * 0.3) + (evt.fuentes_count * 0.3);
      const riskPercent = Math.min(100, Math.round(score * 18));
      return { ...evt, riskPercent };
    }).sort((a,b) => b.riskPercent - a.riskPercent);
  }, []);

  return (
    <div className="flex-1 p-6 space-y-8 bg-background text-foreground overflow-y-auto font-sans select-none">
      
      {/* SECCIÓN 1: Stat Hero Alert Band (Row of 3 cards of col-span-4) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Card 1: Critical Stats */}
        <div className="col-span-12 lg:col-span-4 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex justify-between items-start transition-all duration-300 hover:scale-[1.01]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase block">Alertas Críticas</span>
              </div>
              <p className="text-[12px] text-text-muted mt-2 font-medium leading-relaxed pr-2">
                Eventos prioritarios de alto impacto detectados hoy en el canal de seguridad.
              </p>
            </div>
            <span className="text-[10px] text-text-muted font-mono mt-4 block">Total eventos críticos</span>
          </div>

          <div className="flex items-baseline gap-1 text-critical select-none shrink-0">
            <span className="text-[72px] font-extrabold leading-none tracking-tighter text-foreground">
              <AnimatedCounter value={9} />
            </span>
            <span className="text-xs font-bold font-mono flex items-center gap-0.5">
              ↗ +2%
            </span>
          </div>
        </div>

        {/* Card 2: Attention Stats */}
        <div className="col-span-12 lg:col-span-4 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex justify-between items-start transition-all duration-300 hover:scale-[1.01]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-attention" />
                <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase block">Bajo Vigilancia</span>
              </div>
              <p className="text-[12px] text-text-muted mt-2 font-medium leading-relaxed pr-2">
                Temas de servicios públicos e inconformidad civil moderada en seguimiento.
              </p>
            </div>
            <span className="text-[10px] text-text-muted font-mono mt-4 block">Fuentes bajo alerta</span>
          </div>

          <div className="flex items-baseline gap-1 text-attention select-none shrink-0">
            <span className="text-[72px] font-extrabold leading-none tracking-tighter text-foreground">
              <AnimatedCounter value={11} />
            </span>
            <span className="text-xs font-bold font-mono flex items-center gap-0.5">
              ↗ +5%
            </span>
          </div>
        </div>

        {/* Card 3: Informative Stats */}
        <div className="col-span-12 lg:col-span-4 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex justify-between items-start transition-all duration-300 hover:scale-[1.01]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-accent-blue" />
                <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase block">Agenda Informativa</span>
              </div>
              <p className="text-[12px] text-text-muted mt-2 font-medium leading-relaxed pr-2">
                Notas y agenda gubernamental sin señales de riesgo asociadas.
              </p>
            </div>
            <span className="text-[10px] text-text-muted font-mono mt-4 block">Registros generales</span>
          </div>

          <div className="flex items-baseline gap-1 text-accent-blue select-none shrink-0">
            <span className="text-[72px] font-extrabold leading-none tracking-tighter text-foreground">
              <AnimatedCounter value={30} />
            </span>
            <span className="text-xs font-bold font-mono flex items-center gap-0.5 text-text-muted">
              ↘ -3%
            </span>
          </div>
        </div>

      </div>

      {/* SECCIÓN 2: Síntesis Editorial + Canvas (Row 2: col-span-4 and col-span-8) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Card 4: Síntesis Editorial & Termómetro (col-span-4) */}
        <div className="col-span-12 lg:col-span-4 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase block mb-3">SÍNTESIS EDITORIAL</span>
            <p className="text-[20px] font-medium leading-tight text-foreground pr-2 font-serif italic">
              {timePreset === "Hoy" 
                ? "“Hoy se observa un volumen inusual de agendas viales detonadas por reportes de seguridad en arterias clave de la ciudad.”"
                : timePreset === "7D" 
                ? "“Una semana marcada por repuntes recurrentes en reportes de fallas eléctricas de la CEA y suspensiones preventivas.”"
                : "“A lo largo del mes, la conversación se ha concentrado de manera sostenida en infraestructura y movilidad.”"
              }
            </p>
          </div>

          <div className="border-t border-card-border pt-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-[10px] font-mono text-text-muted font-bold block uppercase">TERMÓMETRO</span>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground mt-1 block">
                  Pulso: {sentimentStats.word}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-text-muted">Tono General</span>
            </div>

            <div className="h-2 w-full bg-card-border/30 rounded-full overflow-hidden border border-card-border relative">
              <div 
                className="h-full bg-gradient-to-r from-critical via-attention to-ok transition-all duration-700" 
                style={{ width: `${sentimentStats.termValue}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 5: Canvas "¿De qué se habla hoy?" (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col min-h-[360px] relative">
          <div className="flex justify-between items-center mb-3 select-none">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Conceptos Emergentes e Impacto</h2>
              <p className="text-[10.5px] text-text-muted mt-0.5">El tamaño representa el volumen de notas vinculadas. Haz clic para explorar detalles.</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-0.5 rounded-full border border-accent-blue/20">
              Preset: {timePreset === "Hoy" ? "Hoy" : timePreset === "7D" ? "7 días" : "30 días"}
            </span>
          </div>

          <div className="flex-1 bg-card-border/10 rounded-xl border border-card-border flex items-center justify-center p-2 min-h-[220px] relative overflow-hidden">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              className="w-full h-full max-h-[220px]"
              style={{ display: "block" }}
            />

            {hoveredBubble && (
              <div
                className="absolute z-35 bg-card-bg border border-card-border rounded-xl shadow-2xl p-4 w-64 text-xs flex flex-col gap-2.5 transition-all duration-150 text-foreground backdrop-blur-md"
                style={{
                  left: Math.min(canvasSize.width - 270, Math.max(10, mousePos.x - 120)),
                  top: Math.min(canvasSize.height - 140, Math.max(10, mousePos.y - 140))
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground text-[13px]">{hoveredBubble.title}</span>
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: hoveredBubble.color }} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 border-y border-card-border py-1.5 font-mono text-[9.5px] text-text-muted">
                  <div>
                    <p className="text-text-muted">Total Notas:</p>
                    <p className="font-bold text-foreground">{hoveredBubble.count} notas</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Tono Promedio:</p>
                    <p className="font-bold uppercase" style={{ color: hoveredBubble.color }}>{hoveredBubble.sentiment}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-accent-blue">Sintagma destacado:</span>
                  <p className="text-text-muted italic mt-0.5 leading-snug">
                    "{hoveredBubble.phrase}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECCIÓN 3: Anomalías e Evolución (Row 3: col-span-4 and col-span-8) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Card 6: Alertas de Acción (col-span-4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <AnimatePresence mode="wait">
            {hasAnomalies ? (
              <motion.div
                key="abnormal"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card-bg border border-card-border p-6 rounded-2xl flex flex-col justify-between flex-grow shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-card-border pb-2">
                    <h2 className="text-[10px] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-critical" />
                      Alertas de Acción
                    </h2>
                    <button 
                      onClick={() => setHasAnomalies(false)}
                      className="text-[10px] font-bold text-critical hover:underline cursor-pointer"
                    >
                      Descartar
                    </button>
                  </div>
                  
                  <div className="space-y-3 mt-2 pr-1">
                    {scoredEventsList.map((alert) => (
                      <div 
                        key={alert.id}
                        className="flex justify-between items-center p-3 bg-card-border/20 border border-card-border rounded-xl"
                      >
                        <div className="flex gap-2 items-center min-w-0">
                          <span className="text-xs shrink-0">🚨</span>
                          <p className="text-[11.5px] font-semibold text-foreground leading-snug truncate max-w-[150px]">
                            {alert.title}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedEventId(alert.id)}
                          className="px-2.5 py-1 bg-card-border/60 hover:bg-card-border text-foreground text-[9.5px] font-bold rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          Indagar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-card-border pt-3 text-[10px] text-text-muted font-mono">
                  Detección de anomalías en curso
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                className="bg-card-bg border border-card-border px-6 rounded-2xl h-[70px] flex items-center justify-between shadow-sm cursor-pointer"
                onClick={() => setHasAnomalies(true)}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-ok">Sin anomalías críticas</span>
                <span className="text-[10px] underline text-ok">Simular</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 7: Evolution Area Chart (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 bg-card-bg border border-card-border rounded-2xl p-6 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-5">
            <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase">EVOLUCIÓN EN EL TIEMPO</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setChartMetric("Volumen")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${chartMetric === "Volumen" ? "bg-accent-blue border-accent-blue text-white shadow-sm" : "border-card-border text-text-muted hover:text-foreground"}`}
              >
                Volumen
              </button>
              <button 
                onClick={() => setChartMetric("Sentimiento")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${chartMetric === "Sentimiento" ? "bg-accent-blue border-accent-blue text-white shadow-sm" : "border-card-border text-text-muted hover:text-foreground"}`}
              >
                Sentimiento
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-[180px] bg-card-border/10 p-3 rounded-xl border border-card-border">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionChartData} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" style={{ fontSize: "10px" }} />
                <YAxis ticks={yAxisTicks} tickFormatter={formatYAxisTick} stroke="var(--text-muted)" style={{ fontSize: "10px" }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", fontSize: "11px", color: "var(--foreground)" }} />
                <Area type="monotone" dataKey="current" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECCIÓN 4: Focos de Investigación + Conceptos (Row 4: col-span-6 and col-span-6) */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Focos / Métricas Card (col-span-6) */}
        <div className="col-span-12 lg:col-span-6 bg-card-bg border border-card-border rounded-2xl p-6 flex flex-col justify-between min-h-[300px] shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                {activeEmisorToggle === "Prioridades" ? "Focos de Investigación" : "Métricas de Medios"}
              </h2>
              
              <div className="flex items-center bg-card-border/30 border border-card-border rounded-lg p-0.5 gap-0.5 text-[9px] font-bold select-none">
                {["Prioridades", "Medios"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActiveEmisorToggle(mode as any)}
                    className={`px-3 py-1 rounded transition-all cursor-pointer ${
                      activeEmisorToggle === mode 
                        ? "bg-accent-blue text-white shadow-sm" 
                        : "text-text-muted hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {activeEmisorToggle === "Prioridades" ? (
              <div className="space-y-3.5 pt-2">
                {scoredEventsList.map(evt => (
                  <div 
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className="p-3 bg-card-border/20 border border-card-border rounded-xl flex justify-between items-center cursor-pointer hover:border-accent-blue transition-all"
                  >
                    <div className="space-y-1">
                      <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${getCategoryColor(evt.categoria)}`}>
                        {evt.categoria}
                      </span>
                      <p className="text-xs font-bold text-foreground mt-1">{evt.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-accent-blue block">📢 {evt.fuentes_count} Fuentes</span>
                      <span className="text-[8.5px] font-mono text-text-muted block">{evt.post_count} notas totales</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-2 select-none">
                {podiumData.ranks.map((em, idx) => (
                  <div key={em.name} className="flex justify-between items-center text-[11px] font-mono py-1 border-b border-card-border">
                    <span className="text-text-muted">{idx + 1}. {em.name}</span>
                    <span className="text-foreground font-bold">{em.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conceptos Emergentes Card (col-span-6) */}
        <div className="col-span-12 lg:col-span-6 bg-card-bg border border-card-border rounded-2xl p-6 flex flex-col min-h-[300px] justify-between shadow-sm">
          <div>
            <h2 className="text-[10px] font-bold tracking-wider text-text-muted uppercase mb-2">💬 La Voz del Pueblo</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Palabras clave con mayor frecuencia en la conversación pública de Querétaro.</p>
            
            <div className="flex flex-wrap gap-2.5 mt-4 select-none">
              <span className="bg-critical/10 border border-critical/20 px-3 py-1 rounded-xl text-critical font-bold text-[11px] opacity-100 animate-pulse">Inseguridad</span>
              <span className="bg-accent-blue/10 border border-accent-blue/20 px-3 py-1 rounded-xl text-accent-blue font-bold text-[11px] opacity-90">Falta luz</span>
              <span className="bg-ok/10 border border-ok/20 px-3 py-1 rounded-xl text-ok font-bold text-[10.5px] opacity-80">Caos vial</span>
              <span className="bg-card-border/30 border border-card-border px-3 py-1 rounded-xl text-text-muted text-[10px] opacity-60">Apagones</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-card-border pt-4 select-none">
            <span className="text-[10px] font-bold text-text-muted uppercase">Sentiment Split (Medios vs Población)</span>
            <div className="h-3 w-full bg-card-border/30 rounded-full overflow-hidden flex border border-card-border">
              <div className="bg-critical h-full" style={{ width: "80%" }} title="80% Población Inconforme" />
              <div className="bg-accent-blue h-full" style={{ width: "20%" }} title="20% Medio Postura Neutral" />
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN 5: Tarjeta de Correlación (Ancho Completo, Máximo 3 por vista, estilo analista editorial) */}
      <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-2xl p-6 shadow-sm flex items-start gap-4">
        <div className="p-2 bg-accent-blue rounded-xl text-white">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-wider text-accent-blue uppercase block">INSIGHT DE CORRELACIÓN DE INTELIGENCIA</span>
          <p className="text-[15px] font-medium text-foreground leading-relaxed mt-1 font-serif italic">
            “El incremento en la frecuencia de reportes viales y anomalías en Av. 5 de Febrero muestra una correlación del 92% con las protestas locales registradas en redes ciudadanas durante las últimas 48 horas.”
          </p>
        </div>
      </div>

      {/* DRAWER DESPLEGABLE DERECHO (Investigación Forense con Diagrama de Red de Enlaces) */}
      <AnimatePresence>
        {selectedEventId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedEventId(null)}
          >
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-[45%] max-w-[500px] h-full bg-card-bg border-l border-card-border shadow-2xl flex flex-col overflow-hidden text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="p-4 border-b border-card-border flex justify-between items-center select-none bg-card-bg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-bold uppercase text-accent-blue tracking-wider">Drawer de Indagación</span>
                </div>
                <button 
                  onClick={() => setSelectedEventId(null)}
                  className="p-1.5 hover:bg-card-border/50 rounded-lg text-text-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="space-y-1 border-b border-card-border pb-4">
                  <span className="text-[10px] font-bold text-critical uppercase tracking-widest">INDAGACIÓN TÁCTICA</span>
                  <div className="flex justify-between items-end">
                    <h2 className="text-sm font-bold text-foreground leading-none">Análisis del Evento</h2>
                    <span className="text-[10.5px] font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20 font-bold shrink-0">
                      {selectedEventId === "e-1" ? "14 Notas" : selectedEventId === "e-2" ? "8 Notas" : "9 Notas"} en total
                    </span>
                  </div>
                </div>

                {/* Tactical advisory: what to look at */}
                <div className="bg-accent-blue/10 border border-accent-blue/20 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[10.5px] font-bold text-accent-blue uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-blue animate-pulse" />
                    ¿En qué fijarse? (Diagnóstico)
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {selectedEventId === "e-1" ? (
                      "⚠️ Posible enfrentamiento armado reportado en Bernardo Quintana. Con 5 fuentes independientes y 820 de engagement, la veracidad es muy alta. Prestar atención a reportes de lesionados y cierres de carriles centrales."
                    ) : selectedEventId === "e-2" ? (
                      "💧 Corte de agua prolongado en Juriquilla. Hay 3 fuentes reportando desabasto de la CEA y 420 reacciones. Monitorear si la indignación vecinal escala a convocatorias de cierre vial."
                    ) : selectedEventId === "e-3" ? (
                      "🚧 Bloqueo vial por manifestantes en Av. 5 de Febrero. Mapeado en Carrillo Puerto con 560 de engagement. Sugerencia: Validar si afecta el carril confinado de Qrobús y rutas alternas."
                    ) : (
                      "🔍 Evento bajo vigilancia activa. Revisar volumen de réplicas en redes y comprobar discrepancia de sentimiento en comentarios antes de alertar."
                    )}
                  </p>
                </div>

                {/* Visual confirmation dots block */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted block">Confirmación de Fuentes</span>
                  <div className="flex gap-2 items-center bg-card-border/20 border border-card-border p-3 rounded-xl">
                    {/* Confirmation Bar: circular dots one per source. Confirmed green fill, pending outline. Max 10. */}
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span 
                        key={s} 
                        className={`w-2.5 h-2.5 rounded-full ${s <= 3 ? "bg-ok" : "border border-ok"}`}
                        title={s <= 3 ? "Fuente confirmada" : "Confirmación pendiente"} 
                      />
                    ))}
                    <span className="text-[10px] font-mono text-text-muted ml-2">3 de 5 confirmadas</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted block">🛠️ Red de Coincidencia de Algoritmo</span>
                    <span className="text-[8.5px] bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded font-mono font-bold">Confianza: 92%</span>
                  </div>
                  
                  <div className="bg-card-border/20 border border-card-border rounded-2xl p-3.5 space-y-3">
                    {/* Visual Link Node */}
                    <div className="h-24 w-full bg-background rounded-xl flex items-center justify-center relative overflow-hidden border border-card-border">
                      <svg className="w-48 h-full" viewBox="0 0 100 40">
                        <line x1="50" y1="20" x2="20" y2="10" stroke="var(--accent-blue)" strokeWidth="0.8" />
                        <line x1="50" y1="20" x2="32" y2="30" stroke="var(--accent-blue)" strokeWidth="0.8" />
                        <line x1="50" y1="20" x2="80" y2="10" stroke="var(--attention)" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
                        <line x1="50" y1="20" x2="68" y2="30" stroke="var(--attention)" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
                        
                        <circle cx="50" cy="20" r="3" fill="var(--critical)" />
                        <circle cx="50" cy="20" r="6" stroke="var(--critical)" strokeWidth="0.5" fill="none" className="animate-ping" style={{ transformOrigin: '50px 20px' }} />
                        
                        <circle cx="20" cy="10" r="2" fill="var(--accent-blue)" />
                        <circle cx="32" cy="30" r="2" fill="var(--accent-blue)" />
                        <circle cx="80" cy="10" r="2" fill="var(--attention)" />
                        <circle cx="68" cy="30" r="2" fill="var(--attention)" />
                      </svg>
                    </div>

                    {/* Dynamic Explanatory List of Linked Publications */}
                    <div className="space-y-3.5 border-t border-card-border pt-3">
                      <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
                        <span>Notas Relacionadas por el Algoritmo</span>
                        <span>Criterio de Vínculo</span>
                      </div>
                      
                      {selectedEventId && (selectedEventId === "e-1" ? [
                        { source: "Diario Qro", match: "95% Semántica (IA)", reason: "Coincidencia conceptual en el reporte de detonaciones y patrullas", snippet: "Detonaciones de arma de fuego reportadas en carriles de Bernardo Quintana...", tagColor: "text-accent-blue bg-accent-blue/10", link: "/publicaciones?id=1799467241460772" },
                        { source: "Plaza de Armas", match: "90% Semántica (IA)", reason: "Descripción idéntica del fuerte despliegue policial", snippet: "Reportan detonaciones y despliegue policial en Quintana...", tagColor: "text-accent-blue bg-accent-blue/10", link: "/publicaciones?id=1799467241460772" },
                        { source: "Facebook Qro", match: "Coincidencia Hashtag", reason: "Uso común de la etiqueta ciudadana #AlertaQro", snippet: "Reporte de detonaciones en Bernardo Quintana #AlertaQro #Precaución", tagColor: "text-attention bg-attention/10", link: "/publicaciones?id=1799467241460772" }
                      ] : selectedEventId === "e-2" ? [
                        { source: "Diario Qro", match: "95% Semántica (IA)", reason: "Coincidencia temática en fallas de suministro y reclamo vecinal", snippet: "Vecinos de Juriquilla denuncian la falta de servicio de agua potable...", tagColor: "text-accent-blue bg-accent-blue/10", link: "/publicaciones?id=1799769178097245" },
                        { source: "Facebook Qro", match: "Coincidencia Hashtag", reason: "Uso común de la etiqueta ciudadana #SinAguaQro", snippet: "#SinAguaQro exigimos respuesta de la CEA, llevamos 2 días sin servicio...", tagColor: "text-attention bg-attention/10", link: "/publicaciones?id=1799769178097245" }
                      ] : [
                        { source: "Plaza de Armas", match: "95% Semántica (IA)", reason: "Coincidencia temática en cierre vial de manifestantes", snippet: "Manifestantes bloquean carriles de Av. 5 de Febrero a la altura de Carrillo...", tagColor: "text-accent-blue bg-accent-blue/10", link: "/publicaciones?id=1799442508129912" },
                        { source: "Facebook Qro", match: "Coincidencia Hashtag", reason: "Uso común de la etiqueta de tráfico #5deFebrero", snippet: "Tráfico detenido totalmente en 5 de Febrero por manifestantes #5deFebrero...", tagColor: "text-attention bg-attention/10", link: "/publicaciones?id=1799441554796674" }
                      ]).map((pub, idx) => (
                        <div key={idx} className="p-3 bg-background border border-card-border rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${pub.match.includes("Semántica") ? "bg-accent-blue" : "bg-attention"}`} />
                              {pub.source}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] ${pub.tagColor}`}>
                              {pub.match}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-text-muted italic">
                            "{pub.snippet}"
                          </p>

                          <div className="flex justify-between items-center text-[9.5px] border-t border-card-border pt-1.5">
                            <span className="text-text-muted">
                              <strong className="text-text-muted">Vínculo:</strong> {pub.reason}
                            </span>
                            <button
                              onClick={() => {
                                pushBreadcrumb("Publicaciones", pub.link);
                                router.push(pub.link);
                              }}
                              className="text-accent-blue hover:underline flex items-center gap-1 cursor-pointer shrink-0 font-bold ml-2"
                            >
                              Ver Nota <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 select-none border-t border-card-border pt-4">
                  <h3 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Métricas de Reacción</h3>
                  <div className="space-y-2 bg-card-border/20 border border-card-border p-4 rounded-xl text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[9.5px]">
                        <span>Me Gusta</span>
                        <span className="text-accent-blue font-bold">420</span>
                      </div>
                      <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-card-border">
                        <div className="bg-accent-blue h-full" style={{ width: "65%" }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[9.5px]">
                        <span>Comentarios</span>
                        <span className="text-accent-blue font-bold">180</span>
                      </div>
                      <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-card-border">
                        <div className="bg-accent-blue h-full" style={{ width: "45%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-card-border flex justify-end items-center bg-card-bg select-none">
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="px-5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                >
                  Cerrar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
