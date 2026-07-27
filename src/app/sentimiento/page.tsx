"use client";

import React, { useState, useEffect } from "react";
import { getSentiment, SentimentResponse } from "@/lib/api";
import { 
  Smile, 
  Frown, 
  Meh, 
  HelpCircle, 
  Calendar, 
  RefreshCw,
  TrendingUp,
  Grid,
  FileText,
  AlertOctagon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  AreaChart, Area, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";

export default function SentimientoPage() {
  const router = useRouter();
  
  // Filters
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [categoria, setCategoria] = useState("");
  
  // Data
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadSentiment = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const filters = {
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        categoria: categoria || undefined
      };
      const res = await getSentiment(filters);
      setData(res);
    } catch (err) {
      console.error("Error loading sentiment analytics:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadSentiment();
  }, [fechaInicio, fechaFin, categoria]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d0d0d] font-mono text-xs text-gray-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
        <span>Procesando analítica semántica y de sentimiento...</span>
      </div>
    );
  }

  // Categories list
  const CATEGORIES = ["delito", "politica", "comunidad", "accidente", "clima", "inundacion", "bloqueo", "salud", "noticia_local"];

  // Helper to color sentiment matrix cells
  const getMatrixCellBg = (val: number, type: "positivo" | "negativo" | "neutral" | "mixto") => {
    if (val === 0) return "bg-zinc-900 text-gray-650";
    
    // Scale opacity based on value ratio (approximate max ratio)
    const opacity = Math.min(Math.max(Math.round(val * 10), 10), 90);
    
    if (type === "positivo") return `text-emerald-400 bg-emerald-500/${opacity}`;
    if (type === "negativo") return `text-red-400 bg-red-500/${opacity}`;
    if (type === "mixto") return `text-purple-400 bg-purple-500/${opacity}`;
    return `text-zinc-300 bg-zinc-500/${opacity}`;
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 select-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">ANALÍTICA DE SENTIMIENTO</h1>
          <p className="text-xs text-gray-400 mt-1">Análisis de tono afectivo sobre publicaciones y comentarios capturados.</p>
        </div>
        <button
          onClick={() => loadSentiment()}
          className="p-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Global Date and Category Filters */}
      <div className="card-intelligence p-4 flex flex-col md:flex-row md:items-center gap-4 select-none">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
          <Calendar className="w-4 h-4 text-blue-500" />
          Rango Global:
        </div>
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-1.5 px-3 text-gray-300 focus:outline-none"
          />
          <span className="text-gray-600">-</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-1.5 px-3 text-gray-300 focus:outline-none"
          />
        </div>
        <div className="md:ml-auto">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-1.5 px-3 text-xs font-bold text-gray-300 focus:outline-none capitalize"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Global Sentiment Proportions (4 Big Numbers) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
        <div className="card-intelligence p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500">Positivo</p>
            <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
              {data.proporciones.positivo || 0}%
            </p>
          </div>
        </div>

        <div className="card-intelligence p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <Frown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500">Negativo</p>
            <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
              {data.proporciones.negativo || 0}%
            </p>
          </div>
        </div>

        <div className="card-intelligence p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-gray-400 flex items-center justify-center">
            <Meh className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500">Neutral</p>
            <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
              {data.proporciones.neutral || 0}%
            </p>
          </div>
        </div>

        <div className="card-intelligence p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-500">Mixto</p>
            <p className="text-2xl font-bold tracking-tight text-white mono-metrics mt-0.5">
              {data.proporciones.mixto || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* 3. Stacked Area Chart (Daily Evolution) */}
      <div className="card-intelligence p-5 flex flex-col h-[340px] select-none">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Evolución Temporal del Sentimiento
        </h2>
        <div className="flex-1 min-h-0">
          {mounted && data.evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.evolucion} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis dataKey="fecha" stroke="#4b5563" fontSize={9} />
                <YAxis stroke="#4b5563" fontSize={9} />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #2b2b2b", fontSize: "10px" }} />
                <Area type="monotone" dataKey="positivo" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#71717a" fill="#71717a" fillOpacity={0.15} />
                <Area type="monotone" dataKey="negativo" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-full flex items-center justify-center text-[10px] font-mono text-gray-500">No hay datos históricos en este rango</p>
          )}
        </div>
      </div>

      {/* 4. Sentiment Matrix per Category */}
      <div className="card-intelligence p-5 select-none">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
          <Grid className="w-4 h-4 text-blue-500" />
          Matriz de Frecuencia Semántica por Categoría
        </h2>
        
        <div className="overflow-x-auto border border-[#1f1f1f] rounded-xl">
          <table className="w-full border-collapse text-left text-xs font-semibold select-none">
            <thead>
              <tr className="bg-[#141414] border-b border-[#1f1f1f] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-center">Positivo</th>
                <th className="py-3 px-4 text-center">Negativo</th>
                <th className="py-3 px-4 text-center">Neutral</th>
                <th className="py-3 px-4 text-center">Mixto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {data.matriz.map((row) => {
                const totalRow = (row.valores.positivo || 0) + (row.valores.negativo || 0) + (row.valores.neutral || 0) + (row.valores.mixto || 0);
                const getPct = (v: number) => totalRow > 0 ? (v / totalRow) : 0;
                
                return (
                  <tr key={row.categoria} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-bold capitalize">{row.categoria.replace("_", " ")}</td>
                    <td className={`py-3 px-4 text-center font-mono ${getMatrixCellBg(getPct(row.valores.positivo || 0), "positivo")}`}>
                      {row.valores.positivo || 0}
                    </td>
                    <td className={`py-3 px-4 text-center font-mono ${getMatrixCellBg(getPct(row.valores.negativo || 0), "negativo")}`}>
                      {row.valores.negativo || 0}
                    </td>
                    <td className={`py-3 px-4 text-center font-mono ${getMatrixCellBg(getPct(row.valores.neutral || 0), "neutral")}`}>
                      {row.valores.neutral || 0}
                    </td>
                    <td className={`py-3 px-4 text-center font-mono ${getMatrixCellBg(getPct(row.valores.mixto || 0), "mixto")}`}>
                      {row.valores.mixto || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Double columns bottom: Negative Comments & Term Cloud Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left List: Most Negative Recent Comments */}
        <div className="card-intelligence p-5 flex flex-col h-[400px]">
          <div className="mb-4 select-none">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
              Comentarios más Negativos Recientes
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Monitoreo de desaprobación social directa en publicaciones</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {data.comentarios_negativos.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-4 text-center select-none">Sin comentarios negativos registrados.</p>
            ) : (
              data.comentarios_negativos.map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => router.push(`/publicaciones?search=${comm.publicacion_id}`)}
                  className="p-3 bg-[#0d0d0d] hover:bg-[#181818] border border-[#1f1f1f] rounded-xl flex items-start justify-between cursor-pointer transition-colors group"
                >
                  <div className="space-y-1 w-[80%]">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 font-bold select-none">
                      <span className="text-gray-300 truncate max-w-[120px]">{comm.autor || "Anónimo"}</span>
                      <span>&bull;</span>
                      <span>{comm.fecha}</span>
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-white transition-colors leading-relaxed font-medium">
                      {comm.contenido}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold font-mono text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.25 rounded shrink-0 select-none">
                    NEGATIVO
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Histogram: Terms cloud in negative pubs */}
        <div className="card-intelligence p-5 flex flex-col h-[400px] select-none">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              Términos Frecuentes en Notas Negativas
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Filtro léxico de conceptos recurrentes en capturas de riesgo</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {data.frecuencia_palabras.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-4 text-center">Sin palabras indexadas.</p>
            ) : (
              data.frecuencia_palabras.map((term, idx) => {
                const maxCount = data.frecuencia_palabras[0].count;
                const ratio = maxCount > 0 ? (term.count / maxCount * 100) : 0;
                
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400 font-semibold">
                      <span className="font-mono text-gray-300">{term.word}</span>
                      <span className="font-mono">{term.count}</span>
                    </div>
                    <div className="w-full bg-[#0d0d0d] h-2 rounded-full overflow-hidden border border-[#1f1f1f]">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${ratio}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
