"use client";

import React, { useState } from "react";
import { useV3Context } from "@/context/V3Context";
import { generarReporte, getReportDownloadUrl, GeneratedReport } from "@/lib/api";
import { 
  FileText, 
  FileDown, 
  RefreshCw,
  Plus,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  Grid,
  Trash2,
  ChevronUp,
  ChevronDown,
  Calendar,
  Layers,
  Settings,
  Presentation,
  Maximize2
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
  Tooltip,
  BarChart,
  Bar
} from "recharts";

interface WidgetTemplate {
  id: string;
  name: string;
  category: "grafica" | "tabla" | "kpi";
  description: string;
}

interface ReportWidget {
  id: string;
  templateId: string;
  name: string;
  size: "half" | "full";
  timeRange: string;
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  { id: "w-evol", name: "Gráfica: Evolución de Engagement", category: "grafica", description: "Línea temporal mostrando interacciones de los últimos 30 días." },
  { id: "w-dist", name: "Gráfica: Distribución de Categorías", category: "grafica", description: "Donut chart detallando la concentración temática." },
  { id: "w-rank", name: "Tabla: Ranking de Estados", category: "tabla", description: "Listado de regiones ordenadas por número de incidentes." },
  { id: "w-anom", name: "Tabla: Historial de Anomalías", category: "tabla", description: "Bitácora operativa de alertas de desviación estándar (sigmas)." },
  { id: "w-kpis", name: "KPI: Indicadores Operativos", category: "kpi", description: "Bloque consolidado de Publicaciones, Engagement y Severidad." }
];

export default function ReportBuilderCanvas() {
  const { addSessionLog } = useV3Context();
  const [activeWidgets, setActiveWidgets] = useState<ReportWidget[]>([
    { id: "act-1", templateId: "w-kpis", name: "KPI: Indicadores Operativos", size: "full", timeRange: "7D" },
    { id: "act-2", templateId: "w-evol", name: "Gráfica: Evolución de Engagement", size: "half", timeRange: "30D" }
  ]);

  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "xlsx">("pdf");
  const [generating, setGenerating] = useState(false);
  const [reportQueue, setReportQueue] = useState<GeneratedReport[]>([]);

  const handleAddWidget = (template: WidgetTemplate) => {
    const newWidget: ReportWidget = {
      id: `act-${Date.now()}`,
      templateId: template.id,
      name: template.name,
      size: template.category === "kpi" ? "full" : "half",
      timeRange: "7D"
    };
    setActiveWidgets([...activeWidgets, newWidget]);
    addSessionLog(`Constructor: Widget '${template.name}' agregado al lienzo`);
  };

  const handleRemoveWidget = (id: string) => {
    const target = activeWidgets.find(w => w.id === id);
    setActiveWidgets(activeWidgets.filter(w => w.id !== id));
    if (target) {
      addSessionLog(`Constructor: Widget '${target.name}' removido del lienzo`);
    }
  };

  const handleMoveWidget = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= activeWidgets.length) return;
    
    const reordered = [...activeWidgets];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;
    setActiveWidgets(reordered);
  };

  const handleSizeChange = (id: string, size: "half" | "full") => {
    setActiveWidgets(activeWidgets.map(w => w.id === id ? { ...w, size } : w));
  };

  const handleTimeRangeChange = (id: string, range: string) => {
    setActiveWidgets(activeWidgets.map(w => w.id === id ? { ...w, timeRange: range } : w));
  };

  const handleCompileReport = async () => {
    setGenerating(true);
    addSessionLog("Reportes: Iniciando compilación asíncrona de reporte dinámico");
    try {
      const payload = {
        tipo: "diario",
        rango: "constructor-v3",
        filtros: {
          widgets: activeWidgets.map(w => ({ id: w.templateId, size: w.size, range: w.timeRange }))
        }
      };
      
      const newReport = await generarReporte(payload);
      setReportQueue([newReport, ...reportQueue]);
      addSessionLog(`Reportes: Reporte consolidado compílado exitosamente (ID: ${newReport.id})`);
    } catch (err) {
      console.error("Failed to compile report:", err);
      addSessionLog("Reportes: Error durante la compilación del PDF");
    } finally {
      setGenerating(false);
    }
  };

  // Render Widget Preview on sheet
  const renderWidgetPreview = (widget: ReportWidget) => {
    const tempId = widget.templateId;

    if (tempId === "w-kpis") {
      return (
        <div className="grid grid-cols-3 gap-4 font-mono text-center py-4 bg-[#0d0d0d] rounded-xl border border-slate-900 select-none">
          <div>
            <p className="text-[8px] text-gray-500 uppercase">Publicaciones</p>
            <p className="text-sm font-bold text-white mt-1">456</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-500 uppercase">Engagement</p>
            <p className="text-sm font-bold text-blue-400 mt-1">24.5K</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-500 uppercase">Severidad Vial</p>
            <p className="text-sm font-bold text-red-500 mt-1">6.8 / 10</p>
          </div>
        </div>
      );
    }

    if (tempId === "w-evol") {
      return (
        <div className="h-32 mt-2 select-none pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[{n:"L",v:40},{n:"M",v:60},{n:"M",v:110},{n:"J",v:70},{n:"V",v:90}]} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBuild" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="n" stroke="#4b5563" fontSize={7} />
              <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="url(#colorBuild)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (tempId === "w-dist") {
      const data = [{name:"D",v:45},{name:"V",v:35},{name:"C",v:20}];
      return (
        <div className="h-32 mt-2 flex items-center justify-center select-none pointer-events-none">
          <ResponsiveContainer width="50%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={18} outerRadius={28} dataKey="v">
                <Cell fill="#ef4444" />
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="text-[8px] space-y-1 pl-4 font-mono text-gray-500">
            <p><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1" />Delitos: 45%</p>
            <p><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block mr-1" />Vialidad: 35%</p>
          </div>
        </div>
      );
    }

    if (tempId === "w-rank") {
      return (
        <div className="space-y-1.5 text-[9px] font-mono text-gray-400 py-2">
          <div className="flex justify-between border-b border-slate-900 pb-1 text-gray-500 font-sans font-bold uppercase text-[7.5px] tracking-wider">
            <span>Estado</span>
            <span>Casos</span>
          </div>
          <div className="flex justify-between"><span>1. Querétaro</span><span className="text-white">184</span></div>
          <div className="flex justify-between"><span>2. Nuevo León</span><span className="text-white">142</span></div>
          <div className="flex justify-between"><span>3. CDMX</span><span className="text-white">110</span></div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 text-[9.5px] font-mono text-gray-400 py-2">
        <div className="flex justify-between border-b border-slate-900 pb-1 text-gray-500 font-sans font-bold uppercase text-[7.5px] tracking-wider">
          <span>Detector</span>
          <span>Desviación</span>
        </div>
        <div className="flex justify-between"><span>Corregidora</span><span className="text-red-400">+4.8 &sigma;</span></div>
        <div className="flex justify-between"><span>San Juan</span><span className="text-red-400">+3.8 &sigma;</span></div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row min-h-0 bg-[#0d0d0d] select-none font-sans overflow-hidden">
      
      {/* LEFT COLUMN: WIDGETS LIBRARY (30%) */}
      <div className="w-full xl:w-[320px] shrink-0 border-r border-[#1f1f1f] p-5 flex flex-col space-y-4 overflow-y-auto select-none">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Biblioteca de Widgets</h2>
          <p className="text-[9px] text-gray-500 mt-0.5">Añade componentes analíticos a tu reporte haciendo clic en el botón '+'</p>
        </div>

        <div className="space-y-3 flex-1">
          {WIDGET_TEMPLATES.map((temp) => {
            return (
              <div 
                key={temp.id}
                className="p-3.5 bg-[#141414] border border-[#1f1f1f] hover:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-300">{temp.name}</h3>
                  <p className="text-[10px] text-gray-500 leading-normal">{temp.description}</p>
                </div>
                <button
                  onClick={() => handleAddWidget(temp)}
                  className="w-full py-1.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#2b2b2b] text-gray-300 hover:text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  Agregar al Lienzo
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER COLUMN: REPORT SHEET CANVAS (70%) */}
      <div className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto space-y-4 relative">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center shrink-0 border-b border-[#1f1f1f] pb-3">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Grid className="w-4.5 h-4.5 text-blue-500" />
              CONSTRUCTOR DE REPORTES PERSONALIZADOS
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Arrastra, ordena y ajusta los parámetros específicos de cada widget antes de compilar el documento final.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Format selection */}
            <div className="flex items-center bg-[#141414] border border-[#1f1f1f] rounded-xl p-1 gap-1">
              <button 
                onClick={() => setSelectedFormat("pdf")}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                  selectedFormat === "pdf" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                PDF
              </button>
              <button 
                onClick={() => setSelectedFormat("xlsx")}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                  selectedFormat === "xlsx" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Excel
              </button>
            </div>

            <button
              onClick={handleCompileReport}
              disabled={generating || activeWidgets.length === 0}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold rounded-xl text-[10px] font-mono uppercase flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
            >
              {generating ? (
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  COMPILAR REPORTE
                </>
              )}
            </button>
          </div>
        </div>

        {/* REPORT CANVAS SHEET */}
        <div className="flex-1 bg-[#090b11] border border-[#1f1f1f] rounded-3xl p-6 min-h-[500px] flex flex-col space-y-4 shadow-inner relative">
          
          {/* Sheet background grid watermark */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02] border-2 border-[#3b82f6] border-dashed m-3 rounded-2xl" />

          {activeWidgets.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-500 text-xs italic py-16 select-none border border-dashed border-slate-850 rounded-2xl">
              <Layers className="w-9 h-9 text-gray-600 mb-2 animate-pulse" />
              El lienzo del reporte está vacío. Selecciona widgets de la biblioteca izquierda para comenzar a estructurar el documento.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {activeWidgets.map((widget, index) => {
                const isFull = widget.size === "full";
                
                return (
                  <div
                    key={widget.id}
                    className={`card-intelligence p-4 flex flex-col justify-between transition-all duration-300 border border-slate-850 relative ${
                      isFull ? "col-span-2" : "col-span-1"
                    }`}
                  >
                    {/* Header Widget controller toolbar */}
                    <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-2 mb-2 select-none">
                      <div className="flex items-center gap-2">
                        <span className="cursor-move text-gray-500 hover:text-white">&bull;&bull;&bull;</span>
                        <h4 className="text-[10.5px] font-bold text-white truncate max-w-[130px] md:max-w-none">{widget.name}</h4>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Size adjust */}
                        <select
                          value={widget.size}
                          onChange={(e) => handleSizeChange(widget.id, e.target.value as any)}
                          className="bg-[#0d0d0d] border border-slate-900 rounded py-0.5 px-1 text-[8.5px] text-gray-400 font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="half">Mitad Ancho</option>
                          <option value="full">Ancho Completo</option>
                        </select>

                        {/* Date adjust */}
                        <select
                          value={widget.timeRange}
                          onChange={(e) => handleTimeRangeChange(widget.id, e.target.value)}
                          className="bg-[#0d0d0d] border border-slate-900 rounded py-0.5 px-1 text-[8.5px] text-gray-400 font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="Hoy">Hoy</option>
                          <option value="7D">7 Días</option>
                          <option value="30D">30 Días</option>
                        </select>

                        <div className="flex items-center border-l border-slate-850 pl-2 gap-0.5">
                          <button 
                            disabled={index === 0}
                            onClick={() => handleMoveWidget(index, "up")}
                            className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Subir"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            disabled={index === activeWidgets.length - 1}
                            onClick={() => handleMoveWidget(index, "down")}
                            className="p-0.5 text-gray-600 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Bajar"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleRemoveWidget(widget.id)}
                            className="p-0.5 text-red-500 hover:text-red-400 pl-1 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Widget Render */}
                    <div className="flex-1 min-h-[90px]">
                      {renderWidgetPreview(widget)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* COMPILED REPORTS LOG TABLE */}
        <div className="card-intelligence p-5 shrink-0 select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            Historial de Compilaciones del Constructor
          </h2>

          <div className="space-y-3">
            {reportQueue.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic p-3 text-center">No hay reportes compilados en esta sesión.</p>
            ) : (
              reportQueue.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-[#0d0d0d] border border-slate-900 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white">Reporte Dinámico Personalizado</h3>
                    <p className="text-[9.5px] text-gray-500 font-mono">
                      ID: {rep.id} | Creado: {rep.creado_en.slice(11, 19)} | Widgets: {activeWidgets.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono text-emerald-400 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" />
                      Listo
                    </span>
                    
                    <a
                      href={getReportDownloadUrl(rep.id, "pdf")}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2b2b2b] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Descargar PDF"
                    >
                      <FileDown className="w-4 h-4 text-red-500" />
                    </a>

                    <a
                      href={getReportDownloadUrl(rep.id, "xlsx")}
                      className="p-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2b2b2b] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Descargar Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
