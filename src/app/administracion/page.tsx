"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Globe,
  Tags,
  Users,
  Plus,
  Search,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  WifiOff,
  RefreshCw,
  Download,
  List,
  Database
} from "lucide-react";
import { adminGetDashboard, adminGetFuentes, adminCreateFuente, adminDeleteFuente, adminGetCategorias, adminCreateCategoria, adminUpdateCategoria, adminDeleteCategoria, isAdminError, AdminDashboard, Fuente, Categoria } from "@/lib/adminApi";

type AdminView = "dashboard" | "fuentes" | "nueva" | "categorias";

export default function AdministracionPage() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [offline, setOffline] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [totalFuentes, setTotalFuentes] = useState(0);
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingFuentes, setLoadingFuentes] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  // Categories lists
  const [catsN1, setCatsN1] = useState<Categoria[]>([]);
  const [catsN2, setCatsN2] = useState<Categoria[]>([]);
  const [catsN3, setCatsN3] = useState<Categoria[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // New category form state
  const [catForm, setCatForm] = useState({
    id: null as number | null,
    nombre: "",
    nivel: 1,
    id_padre: "" as string | number,
    descripcion: "",
    palabras_clave: ""
  });
  const [savingCat, setSavingCat] = useState(false);
  const [catMsg, setCatMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // New fuente form state
  const [form, setForm] = useState({
    nombre: "", url_facebook: "", url_web: "", municipio: "",
    estado: "Querétaro", pais: "México", tipo_fuente: "",
    enlace_valido: true, pagina_activa: true, duplicado: false,
    estado_validacion: "Pendiente", observaciones: "", categoria_id: ""
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // States for searchable category dropdown
  const [catSearch, setCatSearch] = useState("");
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoadingDash(true);
    const res = await adminGetDashboard();
    if (isAdminError(res)) {
      setOffline(res.error === "mau_offline");
    } else {
      setDashboard(res);
      setOffline(false);
    }
    setLoadingDash(false);
  }

  async function loadCategoriasData() {
    setLoadingCats(true);
    const res = await adminGetCategorias();
    if (!isAdminError(res)) {
      setCatsN1(res.nivel1 || []);
      setCatsN2(res.nivel2 || []);
      setCatsN3(res.nivel3 || []);
    }
    setLoadingCats(false);
  }

  async function loadFuentes(q?: string) {
    setLoadingFuentes(true);
    const res = await adminGetFuentes(q || searchQ);
    if (!isAdminError(res)) {
      setFuentes(res.fuentes || []);
      setTotalFuentes(res.total || res.fuentes?.length || 0);
    }
    setLoadingFuentes(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este registro definitivamente?")) return;
    setDeleting(id);
    const res = await adminDeleteFuente(id);
    if (!isAdminError(res)) {
      setFuentes(prev => prev.filter(f => f.id !== id));
    }
    setDeleting(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await adminCreateFuente({
      nombre: form.nombre,
      url_facebook: form.url_facebook,
      url_web: form.url_web || undefined,
      municipio: form.municipio || undefined,
      estado: form.estado,
      pais: form.pais,
      tipo_fuente: form.tipo_fuente || undefined,
      enlace_valido: form.enlace_valido ? 1 : 0,
      pagina_activa: form.pagina_activa ? 1 : 0,
      duplicado: form.duplicado ? 1 : 0,
      estado_validacion: form.estado_validacion,
      categoria_id: form.categoria_id ? parseInt(form.categoria_id) : undefined
    });
    if (isAdminError(res)) {
      setSaveMsg({ type: "error", text: res.message || "Error al guardar. Verifica la conexión con la base de datos." });
    } else {
      setSaveMsg({ type: "ok", text: "Fuente registrada correctamente." });
      setForm(f => ({ ...f, nombre: "", url_facebook: "", url_web: "", observaciones: "", categoria_id: "" }));
    }
    setSaving(false);
  }

  async function handleSaveCategoria() {
    setSavingCat(true);
    setCatMsg(null);
    const payload = {
      nombre: catForm.nombre,
      nivel: catForm.nivel,
      id_padre: catForm.id_padre ? parseInt(catForm.id_padre.toString()) : null,
      descripcion: catForm.descripcion || undefined,
      palabras_clave: catForm.palabras_clave || undefined
    };

    let res;
    if (catForm.id) {
      res = await adminUpdateCategoria(catForm.id, payload);
    } else {
      res = await adminCreateCategoria(payload);
    }

    if (isAdminError(res)) {
      setCatMsg({ type: "error", text: res.message || "Error al guardar la categoría." });
    } else {
      setCatMsg({ type: "ok", text: catForm.id ? "Categoría actualizada correctamente." : "Categoría creada correctamente." });
      setCatForm({ id: null, nombre: "", nivel: 1, id_padre: "", descripcion: "", palabras_clave: "" });
      loadCategoriasData();
    }
    setSavingCat(false);
  }

  async function handleDeleteCategoria(id: number) {
    if (!confirm("¿Eliminar o desactivar esta categoría definitivamente?")) return;
    const res = await adminDeleteCategoria(id);
    if (isAdminError(res)) {
      alert(res.message || "Error al eliminar categoría.");
    } else {
      if (res.message) {
        alert(res.message);
      }
      loadCategoriasData();
    }
  }

  const statColor = (sev: string) => {
    const map: Record<string, string> = {
      blue: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
      green: "text-ok bg-ok/10 border-ok/20",
      yellow: "text-attention bg-attention/10 border-attention/20",
      red: "text-critical bg-critical/10 border-critical/20",
    };
    return map[sev] || map.blue;
  };

  const validacionBadge = (est: string) => {
    if (est === "validado" || est === "aprobado") return "bg-ok/10 text-ok border-ok/20";
    if (est === "rechazado") return "bg-critical/10 text-critical border-critical/20";
    return "bg-attention/10 text-attention border-attention/20";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground font-sans">
      
      {/* Header */}
      <div className="border-b border-card-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Administración</h1>
            <p className="text-[10px] text-text-muted">Gestión de fuentes · SENTINEL DB</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {offline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-critical/10 border border-critical/20 rounded-xl text-[10px] font-bold text-critical">
              <WifiOff className="w-3 h-3" />
              MAU App offline
            </div>
          )}
          <button
            onClick={loadDashboard}
            className="w-8 h-8 rounded-xl border border-card-border flex items-center justify-center text-text-muted hover:text-foreground hover:bg-card-border/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDash ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-card-border shrink-0">
        {([
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "fuentes", label: "Fuentes", icon: Globe },
          { id: "nueva", label: "Agregar fuente", icon: Plus },
          { id: "categorias", label: "Categorías", icon: Tags },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setView(tab.id);
                if (tab.id === "fuentes" && fuentes.length === 0) loadFuentes();
                if (tab.id === "categorias") loadCategoriasData();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer -mb-px ${
                view === tab.id
                  ? "border-accent-blue text-accent-blue"
                  : "border-transparent text-text-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* OFFLINE STATE */}
        {offline && (
          <div className="bg-card-bg border border-card-border rounded-[28px] p-8 flex flex-col items-center gap-4 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-critical/10 border border-critical/20 flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-critical" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground">Conexión con SENTINEL_DB local offline</h2>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                El portal requiere conexión con tu servidor SQL Server local de tu PC (<strong className="text-foreground">SENTINEL_DB</strong>) iniciado a través de la app en <code className="bg-card-border px-1 rounded text-[9px]">localhost:5000</code>.
              </p>
            </div>
            <div className="bg-background border border-card-border rounded-xl p-4 text-left w-full">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 font-mono">Para arrancar el enlace local:</p>
              <code className="text-[11px] text-accent-blue block">
                cd &quot;SENTINEL mau 2&quot;<br />
                venv/bin/python app.py
              </code>
            </div>
            <button
              onClick={loadDashboard}
              className="px-5 py-2.5 bg-accent-blue text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Conectar a base de datos SQL local (SENTINEL_DB)
            </button>
          </div>
        )}

        {/* === DASHBOARD VIEW === */}
        {!offline && view === "dashboard" && (
          <>
            {loadingDash ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Conectando con SENTINEL DB...</span>
              </div>
            ) : dashboard ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`bg-card-bg border rounded-2xl p-4 ${statColor("blue")}`}>
                    <Globe className="w-5 h-5 mb-2" />
                    <p className="text-2xl font-extrabold">{dashboard.total_fuentes}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5 opacity-70">Total fuentes</p>
                  </div>
                  <div className={`bg-card-bg border rounded-2xl p-4 ${statColor("green")}`}>
                    <Tags className="w-5 h-5 mb-2" />
                    <p className="text-2xl font-extrabold">{dashboard.total_categorias}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5 opacity-70">Categorías</p>
                  </div>
                  <div className={`bg-card-bg border rounded-2xl p-4 ${statColor("yellow")}`}>
                    <Users className="w-5 h-5 mb-2" />
                    <p className="text-2xl font-extrabold">{dashboard.total_usuarios}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5 opacity-70">Usuarios activos</p>
                  </div>
                  <div className={`bg-card-bg border rounded-2xl p-4 ${statColor("blue")}`}>
                    <Database className="w-5 h-5 mb-2" />
                    <p className="text-2xl font-extrabold text-accent-blue">{dashboard.por_categoria?.length || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5 text-accent-blue/70">Cat. con datos</p>
                  </div>
                </div>

                {/* Charts + Recent Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                  {/* Bar chart by category */}
                  <div className="lg:col-span-5 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Páginas por categoría</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Distribución de fuentes monitoreadas</p>
                    </div>
                    <div className="space-y-3">
                      {dashboard.por_categoria?.slice(0, 8).map((cat, i) => {
                        const max = dashboard.por_categoria[0]?.total || 1;
                        const pct = Math.round((cat.total / max) * 100);
                        const colors = ["bg-accent-blue", "bg-ok", "bg-attention", "bg-critical", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-teal-500"];
                        return (
                          <div key={cat.nombre} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-text-muted font-medium truncate max-w-[70%]">{cat.nombre}</span>
                              <span className="font-bold text-foreground">{cat.total}</span>
                            </div>
                            <div className="h-1.5 bg-card-border rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent records */}
                  <div className="lg:col-span-7 bg-card-bg border border-card-border rounded-[28px] overflow-hidden">
                    <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-accent-blue" />
                        Últimas fuentes registradas
                      </p>
                      <button
                        onClick={() => { setView("fuentes"); if (fuentes.length === 0) loadFuentes(); }}
                        className="text-[10px] font-bold text-accent-blue hover:text-accent-blue/80 cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        Ver todas <List className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="divide-y divide-card-border">
                      {dashboard.ultimos?.slice(0, 6).map(fuente => (
                        <div key={fuente.id} className="px-5 py-3 flex items-center gap-3 hover:bg-card-border/10 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5 text-accent-blue" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{fuente.nombre}</p>
                            <p className="text-[9px] text-text-muted truncate">{fuente.categoria_raiz}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md border font-bold ${validacionBadge(fuente.estado_validacion || "pendiente")}`}>
                              {fuente.estado_validacion || "pendiente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => { setView("fuentes"); if (fuentes.length === 0) loadFuentes(); }}
                    className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-center gap-3 hover:bg-card-border/10 cursor-pointer transition-all group"
                  >
                    <List className="w-4 h-4 text-accent-blue" />
                    <span className="text-xs font-bold text-foreground group-hover:text-accent-blue transition-colors">Ver todas las fuentes</span>
                  </button>
                  <button
                    onClick={() => setView("nueva")}
                    className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-center gap-3 hover:bg-card-border/10 cursor-pointer transition-all group"
                  >
                    <Plus className="w-4 h-4 text-ok" />
                    <span className="text-xs font-bold text-foreground group-hover:text-ok transition-colors">Agregar fuente</span>
                  </button>
                  <a
                    href="http://127.0.0.1:5001/exportar"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-center gap-3 hover:bg-card-border/10 cursor-pointer transition-all group"
                  >
                    <Download className="w-4 h-4 text-attention" />
                    <span className="text-xs font-bold text-foreground group-hover:text-attention transition-colors">Exportar CSV</span>
                  </a>
                  <button
                    onClick={() => { setView("categorias"); loadCategoriasData(); }}
                    className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-center gap-3 hover:bg-card-border/10 cursor-pointer transition-all group"
                  >
                    <Tags className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-foreground group-hover:text-purple-500 transition-colors">Jerarquía de categorías</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <AlertTriangle className="w-8 h-8 text-attention mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">No se pudieron cargar los datos</p>
              </div>
            )}
          </>
        )}

        {/* === FUENTES VIEW === */}
        {!offline && view === "fuentes" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-card-bg border border-card-border rounded-2xl px-4 py-2.5">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, categoría, municipio, tipo..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadFuentes(searchQ)}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted outline-none"
                />
              </div>
              <button
                onClick={() => loadFuentes(searchQ)}
                disabled={loadingFuentes}
                className="px-4 py-2.5 bg-accent-blue text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {loadingFuentes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar
              </button>
              <button
                onClick={() => { setSearchQ(""); loadFuentes(""); }}
                className="px-4 py-2.5 bg-card-bg border border-card-border text-text-muted hover:text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Limpiar
              </button>
            </div>

            {/* Count */}
            {fuentes.length > 0 && (
              <p className="text-[10px] text-text-muted font-mono">
                {totalFuentes} fuentes {searchQ ? `para "${searchQ}"` : "registradas"}
              </p>
            )}

            {/* Table */}
            {loadingFuentes ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
              </div>
            ) : fuentes.length === 0 ? (
              <div className="bg-card-bg border border-card-border rounded-[28px] p-10 text-center">
                <Globe className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">
                  {searchQ ? "Sin resultados para esa búsqueda" : "No hay fuentes registradas"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {searchQ ? "Intenta con otros términos." : "Usa la pestaña \"Agregar fuente\" para registrar la primera."}
                </p>
              </div>
            ) : (
              <div className="bg-card-bg border border-card-border rounded-[28px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-card-border">
                        {["#", "Nombre", "Clasificación", "Ubicación", "Tipo fuente", "Estado", "Validación", "Acciones"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[9px] uppercase font-bold text-text-muted tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {fuentes.map((f, i) => (
                        <tr key={f.id} className="hover:bg-card-border/10 transition-colors">
                          <td className="px-4 py-3 text-text-muted font-mono text-[10px]">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{f.nombre}</p>
                            {f.url_web && (
                              <a href={f.url_web} target="_blank" rel="noreferrer" className="text-[9px] text-text-muted hover:text-accent-blue flex items-center gap-1 mt-0.5">
                                <ExternalLink className="w-2.5 h-2.5" /> Sitio web
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {f.categoria_raiz && <p className="text-[9px] text-text-muted">{f.categoria_raiz}</p>}
                              {f.subcategoria && <p className="text-[9px] text-accent-blue">→ {f.subcategoria}</p>}
                              {f.tipo_especifico && <p className="text-[9px] text-ok">→ {f.tipo_especifico}</p>}
                              {!f.categoria_raiz && <p className="text-[9px] text-text-muted italic">Sin clasificar</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {f.municipio ? (
                              <div>
                                <p className="text-foreground">{f.municipio}</p>
                                <p className="text-[9px] text-text-muted">{f.estado}</p>
                              </div>
                            ) : <span className="text-text-muted">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {f.tipo_fuente ? (
                              <span className="px-2 py-0.5 bg-card-border rounded-md text-[9px] font-bold text-text-muted">{f.tipo_fuente}</span>
                            ) : <span className="text-text-muted">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className={`flex items-center gap-1 text-[9px] ${f.pagina_activa ? "text-ok" : "text-critical"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${f.pagina_activa ? "bg-ok" : "bg-critical"}`} />
                                {f.pagina_activa ? "Activa" : "Inactiva"}
                              </div>
                              {f.duplicado ? (
                                <div className="flex items-center gap-1 text-[9px] text-attention">
                                  <Copy className="w-2.5 h-2.5" /> Duplicado
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${validacionBadge(f.estado_validacion || "pendiente")}`}>
                              {f.estado_validacion || "Pendiente"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <a
                                href={f.url_facebook}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-all cursor-pointer"
                                title="Ver en Facebook"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => handleDelete(f.id)}
                                disabled={deleting === f.id}
                                className="w-7 h-7 rounded-lg bg-critical/10 border border-critical/20 flex items-center justify-center text-critical hover:bg-critical/20 transition-all cursor-pointer disabled:opacity-50"
                                title="Eliminar"
                              >
                                {deleting === f.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === NUEVA FUENTE VIEW === */}
        {!offline && view === "nueva" && (
          <div className="max-w-3xl space-y-5">
            
            {saveMsg && (
              <div className={`flex items-center gap-2 p-4 rounded-2xl border text-xs font-bold ${
                saveMsg.type === "ok"
                  ? "bg-ok/10 border-ok/20 text-ok"
                  : "bg-critical/10 border-critical/20 text-critical"
              }`}>
                {saveMsg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {saveMsg.text}
              </div>
            )}

            {/* Section: Información básica */}
            <div className="bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-card-border">
                <Globe className="w-4 h-4 text-accent-blue" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Información básica</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Nombre / Sitio *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Gobierno de Querétaro"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Tipo de fuente</label>
                  <select
                    value={form.tipo_fuente}
                    onChange={e => setForm(f => ({ ...f, tipo_fuente: e.target.value }))}
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                  >
                    <option value="">-- Selecciona --</option>
                    {["Gobierno", "Medio informativo", "Comunidad", "Figura pública", "Emergencias", "Organización civil", "Otro"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Sitio web</label>
                  <input
                    type="text"
                    value={form.url_web}
                    onChange={e => setForm(f => ({ ...f, url_web: e.target.value }))}
                    placeholder="https://www.ejemplo.com"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">URL de Facebook *</label>
                  <input
                    type="text"
                value={form.url_facebook}
                    onChange={e => setForm(f => ({ ...f, url_facebook: e.target.value }))}
                    placeholder="https://www.facebook.com/..."
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section: Clasificación jerárquica */}
            <div className="bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-card-border">
                <Tags className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Clasificación de Categoría</p>
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Buscar y Seleccionar Categoría (SENTINEL DB) *</label>
                
                {/* Search input field */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Escribe para buscar... (Ej: accidente, medio, noticias)"
                      value={catSearch}
                      onChange={e => {
                        setCatSearch(e.target.value);
                        setShowCatDropdown(true);
                      }}
                      onFocus={() => {
                        setShowCatDropdown(true);
                        if (catsN1.length === 0) loadCategoriasData();
                      }}
                      className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors"
                    />
                    {form.categoria_id && (
                      <span className="absolute right-3 top-2.5 px-2 py-0.5 bg-ok/10 border border-ok/20 rounded text-[9px] font-bold text-ok">
                        Seleccionada: #{form.categoria_id}
                      </span>
                    )}
                  </div>
                  {catSearch || form.categoria_id ? (
                    <button
                      onClick={() => {
                        setCatSearch("");
                        setForm(f => ({ ...f, categoria_id: "" }));
                        setShowCatDropdown(false);
                      }}
                      className="px-3 py-2 bg-card-border rounded-xl text-xs text-text-muted hover:text-foreground font-semibold"
                    >
                      Limpiar
                    </button>
                  ) : null}
                </div>

                {/* Dropdown list */}
                {showCatDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-card-bg border border-card-border rounded-xl shadow-lg p-2 space-y-1">
                    {/* Render filtered flat categories */}
                    {(() => {
                      const allCats: { id: number; nombre: string; path: string; label: string }[] = [];
                      catsN1.forEach(n1 => {
                        allCats.push({ id: n1.id, nombre: n1.nombre, path: n1.nombre, label: `${n1.nombre} (Nivel 1)` });
                        catsN2.filter(n2 => n2.id_padre === n1.id).forEach(n2 => {
                          allCats.push({ id: n2.id, nombre: n2.nombre, path: `${n1.nombre} → ${n2.nombre}`, label: `${n2.nombre} (Nivel 2)` });
                          catsN3.filter(n3 => n3.id_padre === n2.id).forEach(n3 => {
                            allCats.push({ id: n3.id, nombre: n3.nombre, path: `${n1.nombre} → ${n2.nombre} → ${n3.nombre}`, label: `${n3.nombre} (Nivel 3)` });
                          });
                        });
                      });

                      const filtered = allCats.filter(c => 
                        c.path.toLowerCase().includes(catSearch.toLowerCase()) || 
                        c.id.toString() === catSearch
                      );

                      if (filtered.length === 0) {
                        return <p className="text-[10px] text-text-muted italic p-2 text-center">No se encontraron categorías</p>;
                      }

                      return filtered.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setForm(f => ({ ...f, categoria_id: cat.id.toString() }));
                            setCatSearch(cat.path);
                            setShowCatDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-card-border/30 transition-colors flex items-center justify-between ${
                            form.categoria_id === cat.id.toString() ? "bg-accent-blue/10 border border-accent-blue/20 text-accent-blue" : "text-foreground"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{cat.nombre}</p>
                            <p className="text-[8px] text-text-muted">{cat.path}</p>
                          </div>
                          <span className="text-[8px] bg-card-border px-1.5 py-0.5 rounded font-mono font-bold text-text-muted">{cat.label}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
                {/* Quick Select Root Categories Chips */}
                {catsN1.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Accesos rápidos (Categorías Raíz):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {catsN1.map(n1 => (
                        <button
                          key={n1.id}
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, categoria_id: n1.id.toString() }));
                            setCatSearch(n1.nombre);
                            setShowCatDropdown(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            form.categoria_id === n1.id.toString()
                              ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                              : "bg-background border-card-border text-text-muted hover:text-foreground hover:bg-card-border/20"
                          }`}
                        >
                          {n1.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Ubicación */}
            <div className="bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-card-border">
                <svg className="w-4 h-4 text-attention" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Ubicación</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Municipio", key: "municipio" as const, placeholder: "Ej: Querétaro" },
                  { label: "Estado", key: "estado" as const, placeholder: "Ej: Querétaro" },
                  { label: "País", key: "pais" as const, placeholder: "México" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">{field.label}</label>
                    <input
                      type="text"
                      value={form[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Validación */}
            <div className="bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-card-border">
                <CheckCircle2 className="w-4 h-4 text-ok" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Validación y estado</p>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Estado de validación</label>
                  <select
                    value={form.estado_validacion}
                    onChange={e => setForm(f => ({ ...f, estado_validacion: e.target.value }))}
                    className="bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                  >
                    <option>Pendiente</option>
                    <option>Aprobado</option>
                    <option>Rechazado</option>
                  </select>
                </div>
                {[
                  { key: "enlace_valido" as const, label: "Enlace válido" },
                  { key: "pagina_activa" as const, label: "Página activa" },
                  { key: "duplicado" as const, label: "Duplicado" },
                ].map(chk => (
                  <label key={chk.key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-muted hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={form[chk.key]}
                      onChange={e => setForm(f => ({ ...f, [chk.key]: e.target.checked }))}
                      className="w-4 h-4 accent-blue-500"
                    />
                    {chk.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.url_facebook}
                className="px-6 py-3 bg-ok text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-md"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Registrar fuente
              </button>
              <button
                onClick={() => setView("fuentes")}
                className="px-6 py-3 bg-card-bg border border-card-border text-text-muted hover:text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </div>
        )}

        {/* === CATEGORIAS VIEW === */}
        {!offline && view === "categorias" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Category form */}
            <div className="lg:col-span-4 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4 h-fit">
              <div>
                <p className="text-xs font-bold text-foreground">{catForm.id ? "Editar categoría" : "Crear nueva categoría"}</p>
                <p className="text-[9px] text-text-muted">Configuración de taxonomías para el scraper</p>
              </div>
              
              {catMsg && (
                <div className={`p-3 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${
                  catMsg.type === "ok" ? "bg-ok/10 border-ok/20 text-ok" : "bg-critical/10 border-critical/20 text-critical"
                }`}>
                  {catMsg.text}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={catForm.nombre}
                    onChange={e => setCatForm(c => ({ ...c, nombre: e.target.value }))}
                    placeholder="Ej: Seguridad Vial"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Nivel *</label>
                    <select
                      value={catForm.nivel}
                      onChange={e => setCatForm(c => ({ ...c, nivel: parseInt(e.target.value), id_padre: "" }))}
                      className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                    >
                      <option value={1}>1 (Raíz)</option>
                      <option value={2}>2 (Subcategoría)</option>
                      <option value={3}>3 (Especifico)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Padre</label>
                    <select
                      value={catForm.id_padre}
                      disabled={catForm.nivel === 1}
                      onChange={e => setCatForm(c => ({ ...c, id_padre: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
                    >
                      <option value="">-- Selecciona --</option>
                      {catForm.nivel === 2 && catsN1.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                      {catForm.nivel === 3 && catsN2.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Descripción</label>
                  <textarea
                    value={catForm.descripcion}
                    onChange={e => setCatForm(c => ({ ...c, descripcion: e.target.value }))}
                    placeholder="Propósito de esta categoría..."
                    rows={3}
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Palabras Clave (Separadas por comas)</label>
                  <input
                    type="text"
                    value={catForm.palabras_clave}
                    onChange={e => setCatForm(c => ({ ...c, palabras_clave: e.target.value }))}
                    placeholder="choque, volcadura, autopista"
                    className="w-full bg-background border border-card-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveCategoria}
                  disabled={savingCat || !catForm.nombre || (catForm.nivel > 1 && !catForm.id_padre)}
                  className="flex-1 py-2 bg-ok text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingCat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Guardar
                </button>
                {catForm.id && (
                  <button
                    onClick={() => setCatForm({ id: null, nombre: "", nivel: 1, id_padre: "", descripcion: "", palabras_clave: "" })}
                    className="px-3 py-2 bg-card-border rounded-xl text-xs text-foreground font-semibold cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Category hierarchy view */}
            <div className="lg:col-span-8 bg-card-bg border border-card-border rounded-[28px] p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-foreground">Jerarquía de Categorías</p>
                <p className="text-[9px] text-text-muted">Árbol de clasificación actual en SENTINEL_DB</p>
              </div>

              {loadingCats ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {catsN1.map(n1 => (
                    <div key={n1.id} className="bg-background border border-card-border rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-md text-[9px] font-bold font-mono">Nivel 1</span>
                          <p className="text-xs font-bold text-foreground">{n1.nombre}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCatForm({ id: n1.id, nombre: n1.nombre, nivel: 1, id_padre: "", descripcion: "", palabras_clave: "" })}
                            className="text-[9px] font-bold text-accent-blue hover:underline cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteCategoria(n1.id)}
                            className="text-[9px] font-bold text-critical hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Level 2 children */}
                      <div className="pl-6 space-y-2 border-l border-card-border">
                        {catsN2.filter(n2 => n2.id_padre === n1.id).map(n2 => (
                          <div key={n2.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-ok/10 text-ok border border-ok/20 rounded-md text-[9px] font-bold font-mono">Nivel 2</span>
                                <p className="text-xs font-semibold text-foreground">{n2.nombre}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setCatForm({ id: n2.id, nombre: n2.nombre, nivel: 2, id_padre: n2.id_padre || "", descripcion: "", palabras_clave: "" })}
                                  className="text-[9px] font-bold text-accent-blue hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCategoria(n2.id)}
                                  className="text-[9px] font-bold text-critical hover:underline cursor-pointer"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {/* Level 3 children */}
                            <div className="pl-6 space-y-1.5 border-l border-card-border">
                              {catsN3.filter(n3 => n3.id_padre === n2.id).map(n3 => (
                                <div key={n3.id} className="flex items-center justify-between py-1 bg-card-border/10 rounded-lg px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-md text-[9px] font-bold font-mono">Nivel 3</span>
                                    <p className="text-[11px] font-medium text-foreground">{n3.nombre}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setCatForm({ id: n3.id, nombre: n3.nombre, nivel: 3, id_padre: n3.id_padre || "", descripcion: "", palabras_clave: "" })}
                                      className="text-[9px] font-bold text-accent-blue hover:underline cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCategoria(n3.id)}
                                      className="text-[9px] font-bold text-critical hover:underline cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
