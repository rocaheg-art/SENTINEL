"use client";

import React, { useState } from "react";
import { useV3Context } from "@/context/V3Context";
import { 
  Flame, 
  Tv, 
  UserCheck, 
  AlertOctagon, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  X, 
  Smile, 
  Meh, 
  Frown, 
  ExternalLink,
  MessageSquare,
  Share2,
  ThumbsUp,
  BarChart2,
  LineChart as LineIcon
} from "lucide-react";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

// Card interface definitions
interface MatrixCard {
  id: string;
  type: "tema" | "canal" | "figura" | "anomalia";
  title: string;
  subtitle: string;
  metric: string;
  trend: "up" | "down" | "stable";
  sentiment: "positivo" | "neutral" | "negativo";
  severity: number;
  healthIndex?: number; // 0-100 for figures/channels
  radarData?: { axis: string; A: number }[];
  barData?: { name: string; value: number }[];
  description: string;
  details: {
    volumenTotal: number;
    engagement: number;
    picoFecha: string;
    mencionesClave: string[];
    resumen: string;
  };
}

const TEMAS_HOT: MatrixCard[] = [
  {
    id: "t1",
    type: "tema",
    title: "Inundaciones en Zona Centro",
    subtitle: "Lluvias y drenaje colapsado",
    metric: "310 menciones",
    trend: "up",
    sentiment: "negativo",
    severity: 8.2,
    radarData: [
      { axis: "Volumen", A: 90 },
      { axis: "Severidad", A: 85 },
      { axis: "Velocidad", A: 95 }
    ],
    description: "Crisis recurrente por inundaciones repentinas en el centro histórico y zonas residenciales de Querétaro.",
    details: {
      volumenTotal: 1240,
      engagement: 14500,
      picoFecha: "2026-06-22 18:30",
      mencionesClave: [
        "Inundaciones severas en el puente de carrillo puerto.",
        "Drenaje colapsa en Av. 5 de Febrero afectando la vialidad principal.",
        "Vecinos exigen plan pluvial ante pérdidas materiales constantes."
      ],
      resumen: "El aumento constante de lluvias ha puesto a prueba la infraestructura urbana de la capital, generando enojo masivo en canales sociales. La velocidad de propagación es crítica."
    }
  },
  {
    id: "t2",
    type: "tema",
    title: "Bloqueos México-Querétaro",
    subtitle: "Manifestación y accidentes viales",
    metric: "185 menciones",
    trend: "up",
    sentiment: "negativo",
    severity: 7.8,
    radarData: [
      { axis: "Volumen", A: 75 },
      { axis: "Severidad", A: 80 },
      { axis: "Velocidad", A: 70 }
    ],
    description: "Retrasos masivos y cierres intermitentes en la principal arteria federal de conexión comercial.",
    details: {
      volumenTotal: 890,
      engagement: 22400,
      picoFecha: "2026-06-21 07:15",
      mencionesClave: [
        "Accidente múltiple paraliza carril de alta velocidad rumbo a CDMX.",
        "Bloqueo vecinal a la altura de San Juan del Río genera filas de 15km.",
        "Autoridades federales tardan 3 horas en desviar el tráfico pesado."
      ],
      resumen: "Las quejas por la inseguridad vial y el retraso comercial en esta carretera forman un eje de descontento continuo en medios de comunicación locales y redes sociales."
    }
  },
  {
    id: "t3",
    type: "tema",
    title: "Reforma de Transporte Qrobús",
    subtitle: "Cambio de rutas e inconformidad",
    metric: "122 menciones",
    trend: "stable",
    sentiment: "neutral",
    severity: 5.4,
    radarData: [
      { axis: "Volumen", A: 60 },
      { axis: "Severidad", A: 50 },
      { axis: "Velocidad", A: 45 }
    ],
    description: "Monitoreo de la transición en el sistema de transporte público urbano y el impacto en usuarios.",
    details: {
      volumenTotal: 520,
      engagement: 6800,
      picoFecha: "2026-06-19 14:00",
      mencionesClave: [
        "Nuevas unidades del Qrobús entran en operación en corregidora.",
        "Usuarios reportan esperas de 40 minutos en las horas pico.",
        "Voceros aseguran que las rutas se estabilizarán esta semana."
      ],
      resumen: "El debate digital gira en torno a la eficiencia técnica de las nuevas rutas frente a la experiencia real de los pasajeros, mostrando una polaridad predominantemente neutral."
    }
  }
];

const CANALES_ACTIVOS: MatrixCard[] = [
  {
    id: "c1",
    type: "canal",
    title: "RR Noticias Qro",
    subtitle: "Página de Facebook y Radio",
    metric: "45 posts/día",
    trend: "up",
    sentiment: "neutral",
    severity: 6.1,
    healthIndex: 88,
    barData: [
      { name: "Lun", value: 38 },
      { name: "Mar", value: 42 },
      { name: "Mié", value: 48 },
      { name: "Jue", value: 35 },
      { name: "Vie", value: 52 },
      { name: "Sáb", value: 30 },
      { name: "Dom", value: 25 }
    ],
    description: "Medio de comunicación líder en cobertura vial y reportes de seguridad ciudadana en tiempo real.",
    details: {
      volumenTotal: 270,
      engagement: 38200,
      picoFecha: "2026-06-22 09:00",
      mencionesClave: [
        "RR Noticias transmite en vivo el colapso vial en Bernardo Quintana.",
        "Reportajes especiales sobre la infraestructura de Querétaro.",
        "Entrevistas exclusivas con funcionarios de seguridad vial."
      ],
      resumen: "Medio centralizador del pulso de la ciudad. Su engagement creció debido a la transmisión expedita de alertas climáticas y viales en vivo."
    }
  },
  {
    id: "c2",
    type: "canal",
    title: "Alerta Vial Querétaro",
    subtitle: "Comunidad ciudadana digital",
    metric: "62 reportes/día",
    trend: "up",
    sentiment: "negativo",
    severity: 7.9,
    healthIndex: 94,
    barData: [
      { name: "Lun", value: 45 },
      { name: "Mar", value: 58 },
      { name: "Mié", value: 72 },
      { name: "Jue", value: 61 },
      { name: "Vie", value: 80 },
      { name: "Sáb", value: 40 },
      { name: "Dom", value: 35 }
    ],
    description: "Canal colaborativo donde ciudadanos reportan accidentes, baches, bloqueos y robos locales.",
    details: {
      volumenTotal: 391,
      engagement: 89000,
      picoFecha: "2026-06-22 19:15",
      mencionesClave: [
        "Alerta de semáforos apagados en Constituyentes y Tecnológico.",
        "Reportes ciudadanos por robo de autopartes en Juriquilla.",
        "Alerta por choque por alcance sobre Avenida de la Luz."
      ],
      resumen: "Este canal opera como la red de sensores más rápida de la ciudad. Registra picos masivos de interacción y enojo cuando la respuesta gubernamental a los incidentes es lenta."
    }
  }
];

const FIGURAS_MENCIONADAS: MatrixCard[] = [
  {
    id: "f1",
    type: "figura",
    title: "Mauricio Kuri",
    subtitle: "Gobernador del Estado",
    metric: "78 menciones directas",
    trend: "stable",
    sentiment: "neutral",
    severity: 5.6,
    healthIndex: 72,
    radarData: [
      { axis: "Volumen", A: 85 },
      { axis: "Severidad", A: 55 },
      { axis: "Velocidad", A: 60 }
    ],
    description: "Monitoreo de reputación e interacción digital respecto a las obras e iniciativas estatales.",
    details: {
      volumenTotal: 340,
      engagement: 18600,
      picoFecha: "2026-06-20 11:30",
      mencionesClave: [
        "Gobernador Mauricio Kuri inspecciona avance del dren pluvial centro.",
        "Críticas por retrasos pero aprobación por reuniones con comités vecinales.",
        "Anuncio de fondos para apoyo social por afectación de inundaciones."
      ],
      resumen: "El gobernador mantiene un balance de sentimiento estable gracias a la oportuna respuesta física en zonas afectadas, amortiguando las críticas masivas al sistema de drenaje."
    }
  },
  {
    id: "f2",
    type: "figura",
    title: "Luis Nava",
    subtitle: "Presidente Municipal Qro",
    metric: "45 menciones directas",
    trend: "down",
    sentiment: "negativo",
    severity: 6.8,
    healthIndex: 64,
    radarData: [
      { axis: "Volumen", A: 70 },
      { axis: "Severidad", A: 72 },
      { axis: "Velocidad", A: 65 }
    ],
    description: "Evaluación de la percepción ciudadana sobre servicios públicos, recolección y bacheo urbano.",
    details: {
      volumenTotal: 185,
      engagement: 11400,
      picoFecha: "2026-06-22 08:30",
      mencionesClave: [
        "Exigen al alcalde Luis Nava solución inmediata a baches en avenidas principales.",
        "Anuncio de reencarpetado vial en colonias del norte.",
        "Denuncias por alumbrado inactivo en zonas aledañas al estadio."
      ],
      resumen: "El sentimiento negativo hacia el presidente municipal creció debido al deterioro de vialidades tras el temporal de lluvias, centralizando la exigencia de bacheo emergente."
    }
  }
];

const ANOMALIAS_RECIENTES: MatrixCard[] = [
  {
    id: "a1",
    type: "anomalia",
    title: "Pico de Severidad en Corregidora",
    subtitle: "Desviación estándar de +4.2 sigmas",
    metric: "Detector Automático",
    trend: "up",
    sentiment: "negativo",
    severity: 9.1,
    description: "Detección inusual de reportes de alta criticidad en un lapso concentrado de 90 minutos.",
    details: {
      volumenTotal: 92,
      engagement: 41200,
      picoFecha: "2026-06-23 10:15",
      mencionesClave: [
        "Mega fuga de agua potable colapsa carril en El Jacal.",
        "Accidente trágico de motocicleta reportado en libramiento sur poniente.",
        "Inundación repentina en colonias bajas por desborde de canal de desagüe."
      ],
      resumen: "La acumulación atípica de tres eventos de alta gravedad disparó las alarmas del sistema Sentinel en el municipio de Corregidora, marcando una criticidad superior al promedio diario."
    }
  },
  {
    id: "a2",
    type: "anomalia",
    title: "Volumen Anómalo en San Juan del Río",
    subtitle: "Incremento repentino del +280%",
    metric: "Detector Automático",
    trend: "up",
    sentiment: "negativo",
    severity: 8.5,
    description: "Alerta estadística por incremento súbito de publicaciones locales sobre seguridad.",
    details: {
      volumenTotal: 110,
      engagement: 29000,
      picoFecha: "2026-06-22 21:00",
      mencionesClave: [
        "Fuerte despliegue policíaco por asalto a sucursal bancaria.",
        "Reportes vecinales de detonaciones de arma de fuego en zona oriente.",
        "Operativo de fuerzas federales mantiene tensión vial en el centro."
      ],
      resumen: "Un asalto violento y la posterior respuesta militar causaron un estallido conversacional atípico, saturando los feeds de noticias y foros de Facebook del municipio."
    }
  }
];

export default function IntelligenceMatrixCanvas() {
  const { addSessionLog } = useV3Context();
  const [expandedCard, setExpandedCard] = useState<MatrixCard | null>(null);

  const handleCardClick = (card: MatrixCard) => {
    setExpandedCard(card);
    addSessionLog(`Matriz: Detalle expandido para '${card.title}'`);
  };

  const closeExpandedCard = () => {
    if (expandedCard) {
      addSessionLog(`Matriz: Detalle cerrado para '${expandedCard.title}'`);
      setExpandedCard(null);
    }
  };

  // Render tiny micro-charts directly on cards
  const renderMicroRadar = (data?: { axis: string; A: number }[]) => {
    if (!data) return null;
    return (
      <div className="w-16 h-16 opacity-75 shrink-0 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#262626" />
            <Radar dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderMicroBars = (data?: { name: string; value: number }[]) => {
    if (!data) return null;
    return (
      <div className="w-16 h-10 shrink-0 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <Bar dataKey="value" fill="#2563eb" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const getSentimentIcon = (sent: string) => {
    if (sent === "positivo") return <Smile className="w-3.5 h-3.5 text-green-500" />;
    if (sent === "negativo") return <Frown className="w-3.5 h-3.5 text-red-500" />;
    return <Meh className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto select-none relative min-h-0">
      
      {/* Title */}
      <div className="border-b border-[#1f1f1f] pb-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-blue-500" />
          MATRIZ DE CORRELACIÓN DE INTELIGENCIA
        </h1>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Interrelaciones entre los temas, canales, figuras públicas y anomalías críticas del territorio. Haz clic en las tarjetas para expandir el perfil analítico.
        </p>
      </div>

      {/* MATRIX GRID ROWS */}
      <div className="flex-1 space-y-6 min-h-0">
        
        {/* ROW 1: Temas Calientes */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">Temas Calientes (Tendencias)</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin max-w-full">
            {TEMAS_HOT.map((card) => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="w-80 shrink-0 bg-[#141414] hover:bg-[#181818] border border-[#1f1f1f] hover:border-blue-600/50 p-4 rounded-2xl cursor-pointer transition-all duration-300 flex justify-between items-center group shadow-md"
              >
                <div className="space-y-2 max-w-[70%]">
                  <span className="text-[8px] font-bold font-mono tracking-widest text-orange-400 bg-orange-950/20 border border-orange-900/30 px-1.5 py-0.25 rounded uppercase">Tendencia</span>
                  <h3 className="text-xs font-bold text-gray-200 group-hover:text-white truncate transition-colors">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">{card.metric}</span>
                    <span className="text-gray-650 font-mono text-[9px]">&bull;</span>
                    <span className="text-[9.5px] font-bold font-mono text-red-500">SEV: {card.severity}</span>
                  </div>
                </div>
                {renderMicroRadar(card.radarData)}
              </div>
            ))}
          </div>
        </section>

        {/* ROW 2: Canales Activos */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Tv className="w-4 h-4 text-blue-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">Canales e Informadores Activos</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin max-w-full">
            {CANALES_ACTIVOS.map((card) => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="w-80 shrink-0 bg-[#141414] hover:bg-[#181818] border border-[#1f1f1f] hover:border-blue-600/50 p-4 rounded-2xl cursor-pointer transition-all duration-300 flex justify-between items-center group shadow-md"
              >
                <div className="space-y-2 max-w-[70%]">
                  <span className="text-[8px] font-bold font-mono tracking-widest text-blue-400 bg-blue-950/20 border border-blue-900/30 px-1.5 py-0.25 rounded uppercase">Fuentes</span>
                  <h3 className="text-xs font-bold text-gray-200 group-hover:text-white truncate transition-colors">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">{card.metric}</span>
                    <span className="text-gray-650 font-mono text-[9px]">&bull;</span>
                    <span className="text-[9.5px] font-bold font-mono text-emerald-400">Index: {card.healthIndex}</span>
                  </div>
                </div>
                {renderMicroBars(card.barData)}
              </div>
            ))}
          </div>
        </section>

        {/* ROW 3: Figuras Mencionadas */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">Figuras Públicas Mencionadas</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin max-w-full">
            {FIGURAS_MENCIONADAS.map((card) => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="w-80 shrink-0 bg-[#141414] hover:bg-[#181818] border border-[#1f1f1f] hover:border-blue-600/50 p-4 rounded-2xl cursor-pointer transition-all duration-300 flex justify-between items-center group shadow-md"
              >
                <div className="space-y-2 max-w-[70%]">
                  <span className="text-[8px] font-bold font-mono tracking-widest text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.25 rounded uppercase">Personajes</span>
                  <h3 className="text-xs font-bold text-gray-200 group-hover:text-white truncate transition-colors">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">{card.metric}</span>
                    <span className="text-gray-650 font-mono text-[9px]">&bull;</span>
                    <span className="text-[9.5px] font-bold font-mono text-blue-400">SEV: {card.severity}</span>
                  </div>
                </div>
                {renderMicroRadar(card.radarData)}
              </div>
            ))}
          </div>
        </section>

        {/* ROW 4: Anomalías Recientes */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">Alertas Operativas / Anomalías</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin max-w-full">
            {ANOMALIAS_RECIENTES.map((card) => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="w-80 shrink-0 bg-[#1f1414]/90 border border-red-900/20 hover:border-red-650 p-4 rounded-2xl cursor-pointer transition-all duration-300 flex justify-between items-center group shadow-md"
              >
                <div className="space-y-2 max-w-[85%]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-550 animate-ping" />
                    <span className="text-[8px] font-bold font-mono tracking-widest text-red-400 bg-red-950/20 border border-red-900/30 px-1.5 py-0.25 rounded uppercase">ANOMALÍA</span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate transition-colors">{card.title}</h3>
                  <p className="text-[10.5px] text-red-300 font-mono">{card.subtitle}</p>
                </div>
                <AlertOctagon className="w-6 h-6 text-red-550 shrink-0 opacity-70" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* EXPAND-IN-PLACE OVERLAY DRAWER (70% Canvas focus) */}
      {expandedCard && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn text-xs overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1f1f1f] flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold font-mono uppercase tracking-widest bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2.5 py-0.5 rounded-lg">
                    {expandedCard.type.toUpperCase()}
                  </span>
                  {getSentimentIcon(expandedCard.sentiment)}
                </div>
                <h2 className="text-base font-bold text-white">{expandedCard.title}</h2>
                <p className="text-[10px] text-gray-500 font-mono">{expandedCard.subtitle}</p>
              </div>

              <button 
                onClick={closeExpandedCard}
                className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2b2b2b] flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Drawer Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Grid: Details (7 cols) */}
              <div className="md:col-span-7 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#1f1f1f] pb-1">Descripción Táctica</h3>
                  <p className="text-gray-300 leading-relaxed text-xs">{expandedCard.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0d0d0d] p-3 rounded-xl border border-slate-900">
                    <p className="text-[8px] font-bold text-gray-500 uppercase font-sans">Volumen Histórico</p>
                    <p className="text-sm font-bold text-white font-mono mt-1">{expandedCard.details.volumenTotal}</p>
                  </div>
                  <div className="bg-[#0d0d0d] p-3 rounded-xl border border-slate-900">
                    <p className="text-[8px] font-bold text-gray-500 uppercase font-sans">Engagement</p>
                    <p className="text-sm font-bold text-white font-mono mt-1">{expandedCard.details.engagement.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#0d0d0d] p-3 rounded-xl border border-slate-900">
                    <p className="text-[8px] font-bold text-gray-500 uppercase font-sans">Criticidad Promedio</p>
                    <p className="text-sm font-bold text-red-500 font-mono mt-1">{expandedCard.severity} / 10</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#1f1f1f] pb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    Publicaciones Causantes / Relevantes
                  </h3>
                  <div className="space-y-2">
                    {expandedCard.details.mencionesClave.map((text, idx) => (
                      <div key={idx} className="p-3 bg-[#0d0d0d] border border-slate-900 rounded-xl leading-relaxed text-gray-300 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Grid: Metrics / Visualizer (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Micro Analysis Chart depending on card type */}
                <div className="bg-[#0d0d0d] border border-slate-900 p-4 rounded-2xl flex flex-col h-56 justify-between">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Resumen de Métricas Operativas</p>
                  
                  <div className="flex-1 min-h-0 flex items-center justify-center mt-2">
                    {expandedCard.radarData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={expandedCard.radarData}>
                          <PolarGrid stroke="#1f1f1f" />
                          <PolarAngleAxis dataKey="axis" stroke="#94a3b8" fontSize={9} />
                          <Radar name={expandedCard.title} dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : expandedCard.barData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expandedCard.barData}>
                          <XAxis dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} />
                          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      // Fallback simple line trend representation
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { name: "0", val: 3 }, { name: "1", val: 5 }, { name: "2", val: 12 }, { name: "3", val: 8 }, { name: "4", val: 18 }
                        ]}>
                          <Line type="monotone" dataKey="val" stroke="#ef4444" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#1f1f1f] pb-1">Conclusión e Insights</h3>
                  <div className="p-3.5 bg-blue-950/15 border border-blue-900/20 text-gray-300 rounded-xl leading-relaxed">
                    {expandedCard.details.resumen}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#0d0d0d] p-3.5 rounded-xl border border-slate-900 font-mono text-[10.5px]">
                  <span className="text-gray-500">Último Reporte:</span>
                  <span className="text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    {expandedCard.details.picoFecha}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
