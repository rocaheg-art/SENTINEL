"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  getDescartes, 
  updateDescarteStatus, 
  recuperarDescarte, 
  batchProcessDescartes, 
  getSistemaWorkers,
  DescarteItem, 
  WorkerSystemStats 
} from "@/lib/api";
import { 
  Inbox, 
  Check, 
  RotateCcw, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  X,
  AlertCircle,
  Cpu,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function DescartesPage() {
  // Filters
  const [estadoValidacion, setEstadoValidacion] = useState("pendiente");
  const [categoria, setCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [search, setSearch] = useState("");
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const [total, setTotal] = useState(0);
  
  // Data
  const [descartes, setDescartes] = useState<DescarteItem[]>([]);
  const [workers, setWorkers] = useState<WorkerSystemStats[]>([]);
  const [kpis, setKpis] = useState({ total: 0, pendientes: 0, confirmados: 0, recuperados: 0 });
  const [loading, setLoading] = useState(true);

  // Row Selection (Batch)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Recovery Modal State
  const [recoveryItem, setRecoveryItem] = useState<DescarteItem | null>(null);
  const [recoveryCategory, setRecoveryCategory] = useState("general");
  const [recoverySentiment, setRecoverySentiment] = useState("neutral");
  const [recovering, setRecovering] = useState(false);

  // Batch Recovery Overlay State
  const [showBatchRecoverModal, setShowBatchRecoverModal] = useState(false);
  const [batchCategory, setBatchCategory] = useState("general");
  const [batchSentiment, setBatchSentiment] = useState("neutral");

  const loadDescartes = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const filters = {
        estado_validacion: estadoValidacion || undefined,
        categoria: categoria || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        worker_id: workerId || undefined,
        search: search || undefined,
        offset,
        limit
      };
      const data = await getDescartes(filters);
      setDescartes(data.data);
      setTotal(data.total);
      setKpis(data.kpis);
      setSelectedIds([]); // Clear selection on reload
    } catch (err) {
      console.error("Error loading descartes:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const wList = await getSistemaWorkers();
      setWorkers(wList);
    } catch (err) {
      console.error("Error loading workers list:", err);
    }
  };

  useEffect(() => {
    loadDescartes();
  }, [estadoValidacion, categoria, fechaInicio, fechaFin, workerId, search, offset]);

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleConfirmDescarte = async (id: string) => {
    try {
      await updateDescarteStatus(id, "confirmado");
      loadDescartes(false);
    } catch (err) {
      console.error("Error confirming descarte:", err);
    }
  };

  const handleOpenRecovery = (item: DescarteItem) => {
    setRecoveryItem(item);
    setRecoveryCategory(item.categoria || "general");
    setRecoverySentiment("neutral");
  };

  const handleExecuteRecovery = async () => {
    if (!recoveryItem) return;
    setRecovering(true);
    try {
      await recuperarDescarte(recoveryItem.id, {
        categoria: recoveryCategory,
        sentimiento: recoverySentiment
      });
      setRecoveryItem(null);
      loadDescartes(false);
    } catch (err) {
      console.error("Error recovering publication:", err);
    } finally {
      setRecovering(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(descartes.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedIds.length === 0 || batchActionLoading) return;
    setBatchActionLoading(true);
    try {
      await batchProcessDescartes({
        ids: selectedIds,
        action: "confirm"
      });
      loadDescartes(false);
    } catch (err) {
      console.error("Error batch confirming:", err);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchRecover = async () => {
    if (selectedIds.length === 0 || batchActionLoading) return;
    setBatchActionLoading(true);
    try {
      await batchProcessDescartes({
        ids: selectedIds,
        action: "recover",
        categoria: batchCategory,
        sentimiento: batchSentiment
      });
      setShowBatchRecoverModal(false);
      loadDescartes(false);
    } catch (err) {
      console.error("Error batch recovering:", err);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const getValidationStateBadge = (state: string) => {
    if (state === "pendiente") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (state === "confirmado") return "text-emerald-450 bg-emerald-500/10 border-emerald-500/20";
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  };

  const CATEGORIES = ["delito", "politica", "comunidad", "accidente", "clima", "inundacion", "bloqueo", "salud", "noticia_local"];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#0d0d0d] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 select-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">COLA DE VALIDACIÓN DE DESCARTES</h1>
          <p className="text-xs text-gray-400 mt-1">Revisión humana de contenido omitido o descartado por los bots.</p>
        </div>
        <button
          onClick={() => loadDescartes()}
          className="p-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Summary KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
        <div className="card-intelligence p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total descartes</span>
          <span className="text-2xl font-bold text-white mono-metrics mt-2">{kpis.total}</span>
        </div>
        <div className="card-intelligence p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pendientes</span>
          <span className="text-2xl font-bold text-amber-500 mono-metrics mt-2">{kpis.pendientes}</span>
        </div>
        <div className="card-intelligence p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Confirmados</span>
          <span className="text-2xl font-bold text-emerald-450 mono-metrics mt-2">{kpis.confirmados}</span>
        </div>
        <div className="card-intelligence p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Recuperados</span>
          <span className="text-2xl font-bold text-blue-450 mono-metrics mt-2">{kpis.recuperados}</span>
        </div>
      </div>

      {/* 2. Advanced Filters */}
      <div className="card-intelligence p-5 grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en preview de contenido o motivos..."
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
          />
        </div>

        {/* Validation state */}
        <div>
          <select
            value={estadoValidacion}
            onChange={(e) => setEstadoValidacion(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 px-3 text-xs font-semibold text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los descartes</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmado">Confirmados</option>
            <option value="recuperado">Recuperados</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 px-3 text-xs font-semibold text-gray-300 focus:outline-none focus:border-blue-500 capitalize"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Worker */}
        <div>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 px-3 text-xs font-semibold text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los workers</option>
            {workers.map((w) => (
              <option key={w.worker_id} value={w.worker_id}>{w.worker_id}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-350 focus:outline-none"
          />
          <span className="text-gray-600">-</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2 px-2.5 text-xs font-semibold text-gray-355 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#141414] border border-blue-500/20 p-4 rounded-xl flex items-center justify-between z-10 select-none animate-fadeIn">
          <div className="text-xs font-bold text-gray-300">
            Seleccionados: <strong className="text-white font-mono">{selectedIds.length}</strong> descarte(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchConfirm}
              disabled={batchActionLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar descartes
            </button>
            <button
              onClick={() => setShowBatchRecoverModal(true)}
              disabled={batchActionLoading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recuperar en lote
            </button>
          </div>
        </div>
      )}

      {/* 4. Descartes List Table */}
      <div className="card-intelligence overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f] text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#141414]">
                <th className="py-3 px-4 w-[4%] text-center">
                  <input
                    type="checkbox"
                    checked={descartes.length > 0 && selectedIds.length === descartes.length}
                    onChange={handleSelectAll}
                    className="rounded text-blue-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 w-[12%]">Categoría</th>
                <th className="py-3 px-4 w-[16%]">Motivo Descarte</th>
                <th className="py-3 px-4">Contenido (Preview)</th>
                <th className="py-3 px-4 w-[6%] text-center">SEV</th>
                <th className="py-3 px-4 w-[12%]">Worker</th>
                <th className="py-3 px-4 w-[12%]">Fecha</th>
                <th className="py-3 px-4 w-[10%] text-center">Estado</th>
                <th className="py-3 px-4 w-[10%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] text-xs">
              {descartes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-500 italic">
                    No hay descartes registrados en la cola de validación.
                  </td>
                </tr>
              ) : (
                descartes.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#181818] transition-colors ${
                      selectedIds.includes(item.id) ? "bg-[#1d1d1d]" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-300 capitalize">
                      {item.categoria || "sin categoría"}
                    </td>
                    <td className="py-3.5 px-4 text-red-400 font-semibold truncate max-w-[150px]" title={item.motivos}>
                      {item.motivos}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 truncate max-w-[280px]" title={item.contenido_preview || ""}>
                      {item.contenido_preview || "Sin preview disponible"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-400">
                      {item.severidad ?? "--"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      {item.worker_id}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono">
                      {item.creado_en.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${getValidationStateBadge(item.estado_validacion)}`}>
                        {item.estado_validacion}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 shrink-0">
                        {item.estado_validacion === "pendiente" && (
                          <>
                            <button
                              onClick={() => handleConfirmDescarte(item.id)}
                              className="p-1 hover:bg-emerald-500/10 text-emerald-500 rounded cursor-pointer transition-colors"
                              title="Confirmar Descarte"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenRecovery(item)}
                              className="p-1 hover:bg-blue-500/10 text-blue-500 rounded cursor-pointer transition-colors"
                              title="Recuperar Publicación"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {item.enlace && (
                          <a
                            href={item.enlace}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-zinc-800 text-gray-500 hover:text-white rounded"
                            title="Ver en Facebook"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[#1f1f1f] pt-4 select-none">
        <p className="text-[10px] font-mono text-gray-500">
          Mostrando descartes <strong className="text-gray-300">{offset + 1}</strong> - <strong className="text-gray-300">{Math.min(offset + limit, total)}</strong> de <strong className="text-gray-300">{total}</strong>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="p-1.5 bg-[#141414] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:hover:bg-[#141414] border border-[#1f1f1f] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold text-gray-400">
            Pág. {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit) || 1}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="p-1.5 bg-[#141414] hover:bg-[#1a1a1a] disabled:opacity-40 disabled:hover:bg-[#141414] border border-[#1f1f1f] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. INDIVIDUAL RECOVERY CONFIRMATION MODAL */}
      {recoveryItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-[460px] p-6 shadow-2xl space-y-4 select-none">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-blue-500" />
                Recuperar Publicación
              </h3>
              <button
                onClick={() => setRecoveryItem(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p className="text-gray-400 leading-relaxed font-semibold">
                ¿Está seguro de recuperar esta publicación descartada y transferirla al DW principal?
              </p>
              <div className="bg-[#0d0d0d] p-3 border border-[#1f1f1f] rounded-xl text-gray-300 italic font-mono max-h-[100px] overflow-y-auto">
                "{recoveryItem.contenido_preview || "Sin preview"}"
              </div>
            </div>

            {/* Categorization & Sentiment setup */}
            <div className="space-y-3.5 text-xs bg-[#0d0d0d] p-4 border border-[#1f1f1f] rounded-xl font-medium">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 font-sans">
                  Categoría Asignada
                </label>
                <select
                  value={recoveryCategory}
                  onChange={(e) => setRecoveryCategory(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2b2b2b] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none capitalize"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 font-sans">
                  Clasificación de Sentimiento
                </label>
                <select
                  value={recoverySentiment}
                  onChange={(e) => setRecoverySentiment(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2b2b2b] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
                >
                  <option value="positivo">positivo</option>
                  <option value="negativo">negativo</option>
                  <option value="neutral">neutral</option>
                  <option value="mixto">mixto</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1f1f1f]">
              <button
                onClick={() => setRecoveryItem(null)}
                className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg text-xs font-bold text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRecovery}
                disabled={recovering}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-md"
              >
                {recovering ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Confirmar y Recuperar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BATCH RECOVERY MODAL */}
      {showBatchRecoverModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-[460px] p-6 shadow-2xl space-y-4 select-none">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-blue-500" />
                Recuperar en Lote ({selectedIds.length} elementos)
              </h3>
              <button
                onClick={() => setShowBatchRecoverModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-semibold">
              Se insertarán los {selectedIds.length} registros seleccionados en la base de publicaciones principal con los siguientes campos comunes:
            </p>

            <div className="space-y-3.5 text-xs bg-[#0d0d0d] p-4 border border-[#1f1f1f] rounded-xl font-medium">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 font-sans">
                  Categoría en Lote
                </label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2b2b2b] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none capitalize"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 font-sans">
                  Clasificación de Sentimiento en Lote
                </label>
                <select
                  value={batchSentiment}
                  onChange={(e) => setBatchSentiment(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2b2b2b] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none"
                >
                  <option value="positivo">positivo</option>
                  <option value="negativo">negativo</option>
                  <option value="neutral">neutral</option>
                  <option value="mixto">mixto</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1f1f1f]">
              <button
                onClick={() => setShowBatchRecoverModal(false)}
                className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg text-xs font-bold text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchRecover}
                disabled={batchActionLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-md"
              >
                {batchActionLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Procesar Recuperación"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
