"use client";

import React, { useState, useMemo } from "react";
import { useV3Context } from "@/context/V3Context";
import { 
  SlidersHorizontal, 
  GitCompare, 
  Tv, 
  User, 
  Flame, 
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Heart,
  MessageSquare
} from "lucide-react";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip 
} from "recharts";

interface Subject {
  id: string;
  name: string;
  type: "canal" | "figura" | "tema";
  metrics: {
    volumen: number;
    engagement: number;
    severidad: number;
    velocidad: number; // 1-100 scale
    negativo: number;  // % negative sentiment
  };
  keyQuote: string;
}

const COMPARE_SUBJECTS: Subject[] = [
  { id: "rr", name: "RR Noticias Qro", type: "canal", metrics: { volumen: 450, engagement: 82000, severidad: 5.8, velocidad: 85, negativo: 42 }, keyQuote: "Cobertura masiva en tiempo real sobre Bernardo Quintana." },
  { id: "av", name: "Alerta Vial Qro", type: "canal", metrics: { volumen: 680, engagement: 145000, severidad: 7.2, velocidad: 92, negativo: 68 }, keyQuote: "Alertas ciudadanas continuas por baches e inundaciones viales." },
  { id: "dsj", name: "Diario de Querétaro", type: "canal", metrics: { volumen: 310, engagement: 24000, severidad: 4.5, velocidad: 50, negativo: 22 }, keyQuote: "Notas editoriales con estructura profunda sobre planeación urbana." },
  { id: "mk", name: "Mauricio Kuri", type: "figura", metrics: { volumen: 340, engagement: 18600, severidad: 5.6, velocidad: 60, negativo: 35 }, keyQuote: "Gobernador enfocado en inspección de obras hidráulicas." },
  { id: "ln", name: "Luis Nava", type: "figura", metrics: { volumen: 185, engagement: 11400, severidad: 6.8, velocidad: 55, negativo: 52 }, keyQuote: "Alcalde enfrentando demandas por bacheo y alumbrado público." },
  { id: "inund", name: "Inundaciones Centro", type: "tema", metrics: { volumen: 1240, engagement: 310000, severidad: 8.5, velocidad: 95, negativo: 85 }, keyQuote: "Crisis recurrente pluvial de alta tracción y severidad viales." },
  { id: "trans", name: "Transporte Qrobús", type: "tema", metrics: { volumen: 520, engagement: 68000, severidad: 5.4, velocidad: 45, negativo: 48 }, keyQuote: "Debate técnico sobre la reestructuración de rutas urbanas." }
];

export default function ComparativeCanvas() {
  const { addSessionLog } = useV3Context();
  const [subjectAId, setSubjectAId] = useState<string>("rr");
  const [subjectBId, setSubjectBId] = useState<string>("av");

  const subjectA = useMemo(() => COMPARE_SUBJECTS.find(s => s.id === subjectAId)!, [subjectAId]);
  const subjectB = useMemo(() => COMPARE_SUBJECTS.find(s => s.id === subjectBId)!, [subjectBId]);

  // Calculate similarity index based on standard normalized distance
  const similarityScore = useMemo(() => {
    const metrics = ["volumen", "engagement", "severidad", "velocidad", "negativo"] as const;
    let totalDelta = 0;
    
    // Custom normalizers
    const normalizers = {
      volumen: 1240,
      engagement: 310000,
      severidad: 10,
      velocidad: 100,
      negativo: 100
    };

    metrics.forEach(m => {
      const valA = subjectA.metrics[m] / normalizers[m];
      const valB = subjectB.metrics[m] / normalizers[m];
      totalDelta += Math.abs(valA - valB);
    });

    const score = Math.max(0, Math.min(100, Math.round((1 - (totalDelta / metrics.length)) * 100)));
    return score;
  }, [subjectA, subjectB]);

  const radarChartData = useMemo(() => {
    // Axes to draw: Volumen, Engagement, Severidad, Velocidad, % Negativo
    return [
      {
        axis: "Volumen",
        [subjectA.name]: Math.min(100, (subjectA.metrics.volumen / 1240) * 100),
        [subjectB.name]: Math.min(100, (subjectB.metrics.volumen / 1240) * 100)
      },
      {
        axis: "Engagement",
        [subjectA.name]: Math.min(100, (subjectA.metrics.engagement / 310000) * 100),
        [subjectB.name]: Math.min(100, (subjectB.metrics.engagement / 310000) * 100)
      },
      {
        axis: "Severidad",
        [subjectA.name]: subjectA.metrics.severidad * 10,
        [subjectB.name]: subjectB.metrics.severidad * 10
      },
      {
        axis: "Velocidad",
        [subjectA.name]: subjectA.metrics.velocidad,
        [subjectB.name]: subjectB.metrics.velocidad
      },
      {
        axis: "Sent. Negativo",
        [subjectA.name]: subjectA.metrics.negativo,
        [subjectB.name]: subjectB.metrics.negativo
      }
    ];
  }, [subjectA, subjectB]);

  // Co-mentions simulated stories mapping
  const coMentionsData = useMemo(() => {
    const list = [
      {
        id: "pub1",
        fuente: "Alerta Vial Querétaro",
        contenido: `Debido a lluvias atípicas registradas esta noche en la capital, se reportó un fuerte colapso vial en Av. 5 de Febrero. La cobertura de ${subjectA.name} y ${subjectB.name} muestra un descontento masivo en las paradas del Qrobús.`,
        fecha: "2026-06-22 20:15",
        engagement: 4200,
        severidad: 8.5
      },
      {
        id: "pub2",
        fuente: "Reporte de Análisis Táctico",
        contenido: `Durante la inspección de obras viales, usuarios cuestionan directamente la velocidad del bacheo urbano. Los foros asocian la figura de ${subjectA.name} con los constantes reportes emitidos en ${subjectB.name}.`,
        fecha: "2026-06-21 12:30",
        engagement: 1850,
        severidad: 6.2
      }
    ];
    return list;
  }, [subjectA, subjectB]);

  const handleSelectA = (id: string) => {
    setSubjectAId(id);
    addSessionLog(`Comparativo: Sujeto A cambiado a '${COMPARE_SUBJECTS.find(s => s.id === id)?.name}'`);
  };

  const handleSelectB = (id: string) => {
    setSubjectBId(id);
    addSessionLog(`Comparativo: Sujeto B cambiado a '${COMPARE_SUBJECTS.find(s => s.id === id)?.name}'`);
  };

  // Divergence calculation helper
  const renderDivergenceBar = (
    label: string, 
    valA: number, 
    valB: number, 
    formatFn: (v: number) => string, 
    maxVal: number
  ) => {
    const pctA = Math.min(100, (valA / maxVal) * 100);
    const pctB = Math.min(100, (valB / maxVal) * 100);

    return (
      <div className="space-y-1.5 text-[10.5px]">
        <div className="flex justify-between text-gray-400 font-mono">
          <span className="text-white font-bold">{formatFn(valA)}</span>
          <span className="uppercase font-sans font-bold text-gray-500 tracking-wider">{label}</span>
          <span className="text-white font-bold">{formatFn(valB)}</span>
        </div>
        {/* Bidirectional bars */}
        <div className="flex h-2.5 items-center w-full bg-[#090b11] border border-slate-900 rounded-lg overflow-hidden">
          {/* Sujeto A (fills right-to-left in the left half) */}
          <div className="flex-1 flex justify-end">
            <div 
              className="h-full bg-blue-600 rounded-l transition-all duration-500" 
              style={{ width: `${pctA}%` }}
            />
          </div>
          <div className="w-[2px] h-full bg-slate-800" />
          {/* Sujeto B (fills left-to-right in the right half) */}
          <div className="flex-1 flex justify-start">
            <div 
              className="h-full bg-[#a855f7] rounded-r transition-all duration-500" 
              style={{ width: `${pctB}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto select-none relative min-h-0">
      
      {/* Title */}
      <div className="border-b border-[#1f1f1f] pb-4 shrink-0">
        <h1 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <SlidersHorizontal className="w-4.5 h-4.5 text-blue-500" />
          SALA DE CONFRONTACIÓN Y COMPARATIVOS
        </h1>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Confronta dos temas, canales de difusión o figuras públicas para analizar divergencias estadísticas, perfiles de comportamiento y menciones cruzadas en la base de datos.
        </p>
      </div>

      {/* SELECTORS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-[#141414] border border-[#1f1f1f] p-4 rounded-2xl shadow-md">
        
        {/* Selector A (4 cols) */}
        <div className="md:col-span-4 space-y-1">
          <label className="block text-[8px] font-bold text-blue-400 uppercase tracking-widest">Sujeto de Comparación A</label>
          <select
            value={subjectAId}
            onChange={(e) => handleSelectA(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-slate-850 hover:border-slate-800 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-xs font-bold font-sans"
          >
            {COMPARE_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === subjectBId}>
                {s.name} ({s.type === "canal" ? "Canal" : s.type === "figura" ? "Personaje" : "Tema"})
              </option>
            ))}
          </select>
        </div>

        {/* VS / SIMILITUD (3 cols) */}
        <div className="md:col-span-3 text-center flex flex-col justify-center items-center py-2 md:py-0">
          <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Similitud de Perfil</span>
          <div className="flex items-center gap-3.5 mt-1">
            <span className="w-6 h-[1px] bg-slate-800 hidden md:block" />
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-mono">
              {similarityScore}%
            </span>
            <span className="w-6 h-[1px] bg-slate-800 hidden md:block" />
          </div>
        </div>

        {/* Selector B (4 cols) */}
        <div className="md:col-span-4 space-y-1">
          <label className="block text-[8px] font-bold text-[#a855f7] uppercase tracking-widest text-right">Sujeto de Comparación B</label>
          <select
            value={subjectBId}
            onChange={(e) => handleSelectB(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-slate-850 hover:border-slate-800 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-[#a855f7] text-xs font-bold font-sans text-right"
          >
            {COMPARE_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === subjectAId}>
                {s.name} ({s.type === "canal" ? "Canal" : s.type === "figura" ? "Personaje" : "Tema"})
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* CORE COMPARISON BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Overlapping Radar (7 cols) */}
        <div className="lg:col-span-7 card-intelligence p-5 flex flex-col h-[400px]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Visualización Radar Poligonal</h2>
            <p className="text-[9px] text-gray-400 mt-0.5">Polígonos superpuestos en las 5 dimensiones clave del perfil de monitoreo</p>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                <PolarGrid stroke="#1f1f1f" />
                <PolarAngleAxis dataKey="axis" stroke="#94a3b8" fontSize={9.5} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" fontSize={8} />
                <Radar 
                  name={subjectA.name} 
                  dataKey={subjectA.name} 
                  stroke="#2563eb" 
                  fill="#2563eb" 
                  fillOpacity={0.25} 
                />
                <Radar 
                  name={subjectB.name} 
                  dataKey={subjectB.name} 
                  stroke="#a855f7" 
                  fill="#a855f7" 
                  fillOpacity={0.25} 
                />
                <Legend 
                  wrapperStyle={{
                    fontSize: "10px",
                    fontFamily: "sans-serif",
                    marginTop: "10px"
                  }}
                />
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
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Divergence Metrics (5 cols) */}
        <div className="lg:col-span-5 card-intelligence p-5 flex flex-col justify-between h-[400px]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Barras de Divergencia Bidireccionales</h2>
            <p className="text-[9px] text-gray-400 mt-0.5">Ventajas relativas en métricas cuantitativas clave</p>
          </div>

          <div className="space-y-4 my-auto">
            {renderDivergenceBar(
              "Volumen de Notas", 
              subjectA.metrics.volumen, 
              subjectB.metrics.volumen, 
              (v) => `${v} menciones`, 
              1240
            )}

            {renderDivergenceBar(
              "Engagement Total", 
              subjectA.metrics.engagement, 
              subjectB.metrics.engagement, 
              (v) => `${v.toLocaleString()}`, 
              310000
            )}

            {renderDivergenceBar(
              "Severidad Promedio", 
              subjectA.metrics.severidad, 
              subjectB.metrics.severidad, 
              (v) => `${v.toFixed(1)} / 10`, 
              10
            )}

            {renderDivergenceBar(
              "Velocidad de Difusión", 
              subjectA.metrics.velocidad, 
              subjectB.metrics.velocidad, 
              (v) => `${v} / 100`, 
              100
            )}

            {renderDivergenceBar(
              "Sentimiento Negativo", 
              subjectA.metrics.negativo, 
              subjectB.metrics.negativo, 
              (v) => `${v}%`, 
              100
            )}
          </div>

          {/* Quick quote summary card */}
          <div className="bg-[#0d0d0d] p-3 rounded-xl border border-slate-900 grid grid-cols-2 gap-4 text-[10px] font-mono text-gray-400">
            <div className="border-r border-slate-800 pr-2">
              <p className="font-bold text-white uppercase text-[8px] tracking-wider mb-1">Alineación A</p>
              <p className="italic leading-relaxed">"{subjectA.keyQuote}"</p>
            </div>
            <div className="pl-2">
              <p className="font-bold text-white uppercase text-[8px] tracking-wider mb-1">Alineación B</p>
              <p className="italic leading-relaxed">"{subjectB.keyQuote}"</p>
            </div>
          </div>
        </div>

      </div>

      {/* CO-MENTIONS CROSS TABLE */}
      <div className="card-intelligence p-5 select-none">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-500" />
          Tabla de Co-menciones y Cruces de Datos
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans text-gray-300">
            <thead>
              <tr className="border-b border-[#1f1f1f] text-left text-gray-500 font-bold uppercase text-[9px] tracking-wider">
                <th className="pb-3 pl-3">Fuente</th>
                <th className="pb-3">Contenido de la Publicación</th>
                <th className="pb-3 text-center">Severidad</th>
                <th className="pb-3 text-center">Engagement</th>
                <th className="pb-3 text-right pr-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {coMentionsData.map((row) => (
                <tr key={row.id} className="hover:bg-[#141414]/30 transition-colors">
                  <td className="py-4 pl-3 font-semibold text-white max-w-[120px] truncate">{row.fuente}</td>
                  <td className="py-4 pr-6 leading-relaxed max-w-[400px] truncate md:max-w-none md:whitespace-normal">{row.contenido}</td>
                  <td className="py-4 text-center">
                    <span className="px-2 py-0.5 bg-red-950/20 text-red-400 border border-red-900/30 rounded font-mono font-bold text-[10px]">
                      SEV {row.severidad.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-4 text-center font-mono font-bold text-white">{row.engagement.toLocaleString()}</td>
                  <td className="py-4 text-right font-mono text-gray-500 pr-3">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
