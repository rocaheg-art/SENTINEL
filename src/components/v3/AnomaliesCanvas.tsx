"use client";

import React, { useState, useMemo } from "react";
import { useV3Context } from "@/context/V3Context";
import { 
  AlertTriangle, 
  Settings, 
  Clock, 
  TrendingUp, 
  Flame, 
  ShieldAlert, 
  ArrowUpRight,
  MessageSquare,
  Volume2,
  Frown,
  Activity,
  Sliders
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";

interface AnomalyEvent {
  id: string;
  subject: string;
  type: "volumen" | "sentimiento" | "velocidad";
  sigma: number;
  time: string;
  state: string;
  criticality: "alta" | "media" | "baja";
  description: string;
  timelineData: { time: string; value: number }[];
  causalPublications: {
    id: string;
    autor: string;
    contenido: string;
    engagement: number;
    severidad: number;
  }[];
}

const ANOMALIES_DATA: AnomalyEvent[] = [
  {
    id: "an-1",
    subject: "Bernardo Quintana Tránsito",
    type: "volumen",
    sigma: 4.8,
    time: "2026-06-23 10:15",
    state: "Querétaro",
    criticality: "alta",
    description: "Pico de volumen inusual de publicaciones reportando parálisis vial total debido a accidente múltiple y lluvia intensa.",
    timelineData: [
      { time: "06:00", value: 12 },
      { time: "07:00", value: 18 },
      { time: "08:00", value: 24 },
      { time: "09:00", value: 35 },
      { time: "10:00", value: 142 }, // Peak!
      { time: "11:00", value: 88 },
      { time: "12:00", value: 45 }
    ],
    causalPublications: [
      { id: "c-101", autor: "Alerta Vial Qro", contenido: "Fuerte accidente en Bernardo Quintana a la altura de Arcos. Tránsito detenido por completo rumbo al norte.", engagement: 8200, severidad: 8.5 },
      { id: "c-102", autor: "RR Noticias Qro", contenido: "Lluvia intensa causa encharcamientos severos bajo el paso a desnivel de Quintana. Evite la zona.", engagement: 6100, severidad: 7.2 },
      { id: "c-103", autor: "Protección Civil Qro", contenido: "Cuerpos de emergencia laborando en colisión Bernardo Quintana. Reduzca la velocidad.", engagement: 1400, severidad: 6.0 }
    ]
  },
  {
    id: "an-2",
    subject: "San Juan del Río Polaridad",
    type: "sentimiento",
    sigma: 3.8,
    time: "2026-06-22 21:00",
    state: "San Juan del Río",
    criticality: "alta",
    description: "Caída drástica en el índice de sentimiento promedio debido a reportes ciudadanos sobre asalto violento en el centro municipal.",
    timelineData: [
      { time: "17:00", value: 75 }, // Sentiment (positive/neutral index)
      { time: "18:00", value: 70 },
      { time: "19:00", value: 65 },
      { time: "20:00", value: 58 },
      { time: "21:00", value: 18 }, // Drop Peak!
      { time: "22:00", value: 32 },
      { time: "23:00", value: 45 }
    ],
    causalPublications: [
      { id: "c-201", autor: "El Sol de San Juan", contenido: "Sujetos armados asaltan establecimiento céntrico. Pánico entre los transeúntes. Intensa movilización.", engagement: 12400, severidad: 9.0 },
      { id: "c-202", autor: "Seguridad Pública SJR", contenido: "Operativo en marcha tras reporte de robo a comercio en la Col. Centro. Sin personas lesionadas.", engagement: 950, severidad: 5.0 }
    ]
  },
  {
    id: "an-3",
    subject: "Qrobús Frecuencia",
    type: "velocidad",
    sigma: 2.9,
    time: "2026-06-22 08:30",
    state: "Corregidora",
    criticality: "media",
    description: "Aumento veloz de menciones quejándose de tiempos de espera en las nuevas paradas troncales del Qrobús.",
    timelineData: [
      { time: "05:00", value: 5 },
      { time: "06:00", value: 12 },
      { time: "07:00", value: 18 },
      { time: "08:00", value: 65 }, // Peak
      { time: "09:00", value: 42 },
      { time: "10:00", value: 20 },
      { time: "11:00", value: 10 }
    ],
    causalPublications: [
      { id: "c-301", autor: "Comunidad Corregidora", contenido: "Llevamos más de 45 minutos esperando la ruta T01 en Balvanera. Es una burla el nuevo sistema.", engagement: 4500, severidad: 6.8 },
      { id: "c-302", autor: "Agencia de Movilidad", contenido: "Ajustando intervalos de paso en eje troncal Corregidora por contingencia de lluvia matutina.", engagement: 620, severidad: 4.5 }
    ]
  }
];

export default function AnomaliesCanvas() {
  const { sensitivityUmbrales, setSensitivityUmbrales, addSessionLog } = useV3Context();
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>("an-1");

  const selectedAnomaly = useMemo(() => {
    return ANOMALIES_DATA.find(a => a.id === selectedAnomalyId) || ANOMALIES_DATA[0];
  }, [selectedAnomalyId]);

  // Dynamically filter anomalies list based on threshold sliders
  const filteredAnomalies = useMemo(() => {
    return ANOMALIES_DATA.filter(an => {
      if (an.type === "volumen" && an.sigma < sensitivityUmbrales.volume) return false;
      if (an.type === "sentimiento" && an.sigma < sensitivityUmbrales.sentiment) return false;
      if (an.type === "velocidad" && an.sigma < sensitivityUmbrales.speed) return false;
      return true;
    });
  }, [sensitivityUmbrales]);

  const handleSelectAnomaly = (id: string) => {
    setSelectedAnomalyId(id);
    addSessionLog(`Anomalías: Visualizador enfocado en la alerta '${id}'`);
  };

  const handleThresholdChange = (key: "volume" | "sentiment" | "speed", val: number) => {
    const nextUmbrales = {
      ...sensitivityUmbrales,
      [key]: val
    };
    setSensitivityUmbrales(nextUmbrales);
    addSessionLog(`Configuración: Umbral de anomalía '${key}' ajustado a ${val.toFixed(1)} sigmas`);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto select-none relative min-h-0">
      
      {/* Title */}
      <div className="border-b border-[#1f1f1f] pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
            RADAR OPERATIVO DE ANOMALÍAS ESTADÍSTICAS
          </h1>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Detección automática de desviaciones estándar en los flujos de comunicación e incidentes de Querétaro.
          </p>
        </div>
      </div>

      {/* SENSITIVITY CONFIGURATOR DRAWER (Top Slider Header) */}
      <div className="bg-[#141414] border border-[#1f1f1f] p-4 rounded-2xl shadow-md space-y-3 shrink-0">
        <div className="flex items-center gap-1.5 border-b border-[#1f1f1f] pb-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-white">Configurador de Sensibilidad del Algoritmo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-400 font-semibold font-sans">
          {/* Slider 1: Volumen */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] font-bold">
              <span>Volumen de Notas</span>
              <span className="text-blue-400">{sensitivityUmbrales.volume.toFixed(1)} &sigma;</span>
            </div>
            <input 
              type="range"
              min="1.5"
              max="5.0"
              step="0.5"
              value={sensitivityUmbrales.volume}
              onChange={(e) => handleThresholdChange("volume", parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-900 h-1 rounded-lg cursor-pointer"
            />
            <p className="text-[8.5px] text-gray-500 font-mono">Ignora picos menores a {sensitivityUmbrales.volume.toFixed(1)} desviaciones estándar.</p>
          </div>

          {/* Slider 2: Sentimiento */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] font-bold">
              <span>Sentimiento Crítico</span>
              <span className="text-blue-400">{sensitivityUmbrales.sentiment.toFixed(1)} &sigma;</span>
            </div>
            <input 
              type="range"
              min="1.5"
              max="5.0"
              step="0.5"
              value={sensitivityUmbrales.sentiment}
              onChange={(e) => handleThresholdChange("sentiment", parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-900 h-1 rounded-lg cursor-pointer"
            />
            <p className="text-[8.5px] text-gray-500 font-mono">Ignora caídas de polaridad menores a {sensitivityUmbrales.sentiment.toFixed(1)} sigmas.</p>
          </div>

          {/* Slider 3: Velocidad */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] font-bold">
              <span>Velocidad de Difusión</span>
              <span className="text-blue-400">{sensitivityUmbrales.speed.toFixed(1)} &sigma;</span>
            </div>
            <input 
              type="range"
              min="1.5"
              max="5.0"
              step="0.5"
              value={sensitivityUmbrales.speed}
              onChange={(e) => handleThresholdChange("speed", parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-900 h-1 rounded-lg cursor-pointer"
            />
            <p className="text-[8.5px] text-gray-500 font-mono">Filtra repuntes de velocidad viral menores a {sensitivityUmbrales.speed.toFixed(1)} sigmas.</p>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS SCREEN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Anomalies list (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 min-h-0 overflow-y-auto pr-1">
          <div className="flex justify-between items-center px-1 shrink-0">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">Cola de Alertas Activas ({filteredAnomalies.length})</h2>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {filteredAnomalies.map((an) => {
              const isSelected = selectedAnomalyId === an.id;
              const typeLabel = an.type === "volumen" ? "Pico Volumen" : an.type === "sentimiento" ? "Caída Sentimiento" : "Velocidad Viral";
              
              return (
                <div
                  key={an.id}
                  onClick={() => handleSelectAnomaly(an.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2.5 relative ${
                    isSelected 
                      ? "bg-red-950/15 border-red-650/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : "bg-[#141414] hover:bg-[#181818] border-[#1f1f1f] hover:border-slate-850"
                  }`}
                >
                  {/* Glowing pulsing dot for critical anomalies */}
                  {an.criticality === "alta" && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-550 animate-pulse shadow-[0_0_8px_#ef4444]" />
                  )}

                  <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                    <span className="text-red-400 bg-red-550/10 border border-red-500/10 px-1.5 py-0.25 rounded uppercase">
                      {typeLabel}
                    </span>
                    <span className="text-gray-500">{an.time.slice(11)}</span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-200">{an.subject}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Ubicación: {an.state}</p>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-[#1f1f1f] text-[10px] font-mono font-bold">
                    <span className="text-gray-400">Criticidad: <strong className="text-white uppercase">{an.criticality}</strong></span>
                    <span className="text-red-500">+{an.sigma} &sigma;</span>
                  </div>
                </div>
              );
            })}

            {filteredAnomalies.length === 0 && (
              <div className="p-8 text-center text-gray-500 border border-dashed border-slate-850 rounded-2xl text-[10.5px]">
                <ShieldAlert className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                No hay alertas activas que superen los umbrales de sensibilidad configurados.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visualization Dashboard (8 cols) */}
        <div className="lg:col-span-8 card-intelligence p-5 flex flex-col space-y-6 min-h-0 overflow-y-auto">
          
          {/* Details header */}
          <div className="flex justify-between items-start border-b border-[#1f1f1f] pb-3 shrink-0">
            <div className="space-y-1">
              <span className="text-[8.5px] font-bold font-mono tracking-widest text-red-400 uppercase">Visor Técnico de Desviaciones</span>
              <h2 className="text-sm font-bold text-white">{selectedAnomaly.subject}</h2>
              <p className="text-[10px] text-gray-400 leading-normal">{selectedAnomaly.description}</p>
            </div>
            <div className="text-right">
              <span className="text-[8.5px] font-bold font-mono text-gray-500 uppercase">Desviación en {selectedAnomaly.time}</span>
              <p className="text-base font-black text-red-500 font-mono">+{selectedAnomaly.sigma} sigmas</p>
            </div>
          </div>

          {/* Recharts Timeline Evolution chart (Reference Line at peak moment) */}
          <div className="h-56 bg-[#0d0d0d] border border-slate-900 p-4 rounded-xl flex flex-col shrink-0">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-2">Línea de Tiempo Operativa y Punto de Alerta</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedAnomaly.timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} />
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={9} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#141414",
                      border: "1px solid #2b2b2b",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "10px",
                      fontFamily: "monospace"
                    }}
                  />
                  <ReferenceLine x={selectedAnomaly.time.slice(11)} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: "ANOMALÍA", fill: "#ef4444", fontSize: 8, position: "top", fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cause Analysis list of publications */}
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-[#1f1f1f] pb-1 flex items-center gap-1.5 shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Publicaciones Causales Indexadas en el DW
            </h3>
            
            <div className="space-y-2">
              {selectedAnomaly.causalPublications.map((pub) => (
                <div 
                  key={pub.id}
                  className="p-3.5 bg-[#0d0d0d] hover:bg-[#141414]/50 border border-slate-900 rounded-xl leading-relaxed text-gray-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
                >
                  <div className="space-y-1.5 max-w-[80%]">
                    <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-blue-400 bg-blue-550/5 border border-blue-550/10 px-1.5 py-0.25 rounded">
                      {pub.autor}
                    </span>
                    <p className="text-xs font-sans text-gray-300">{pub.contenido}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center text-[10.5px] font-mono font-bold">
                    <span className="text-red-400">SEV: {pub.severidad}</span>
                    <span className="text-gray-500">Eng: <strong className="text-white">{pub.engagement.toLocaleString()}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
