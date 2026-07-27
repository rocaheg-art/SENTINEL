"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useV3Context } from "@/context/V3Context";
import { useRouter, useSearchParams } from "next/navigation";
import { getPublications, getPages, getPublication, Publication, PublicationDetail, FacebookPage, PublicationFilters } from "@/lib/api";
import { 
  Search as SearchIcon, 
  X, 
  ChevronRight, 
  BookOpen, 
  Calendar, 
  SlidersHorizontal,
  RefreshCw,
  Clock,
  ExternalLink
} from "lucide-react";

export default function ExplorarCanvas() {
  const { addSessionLog } = useV3Context();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams ? (searchParams.get("search") || "") : "";
  
  // Search state
  const [query, setQuery] = useState(initialSearch);
  const [activeFilters, setActiveFilters] = useState<{
    source: string;
    category: string;
    timeRange: string;
    tone: string;
  }>({
    source: "todas",
    category: "todas",
    timeRange: "todo",
    tone: "todos"
  });

  // DB Publications state
  const [publications, setPublications] = useState<Publication[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagesList, setPagesList] = useState<FacebookPage[]>([]);

  // Reader state
  const [selectedArticle, setSelectedArticle] = useState<Publication | null>(null);
  const [detail, setDetail] = useState<PublicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Dynamic reference date for time filters (defaults to latest known date in DB)
  const [refToday, setRefToday] = useState<Date>(new Date("2026-07-09T00:00:00"));

  // Fetch the latest publication date in DB to compute time filter ranges
  useEffect(() => {
    async function fetchLatestDate() {
      try {
        const res = await getPublications({ limit: 1 });
        if (res.data && res.data.length > 0) {
          const latestDateStr = res.data[0].fecha_publicacion || res.data[0].fecha_registro;
          if (latestDateStr) {
            setRefToday(new Date(latestDateStr));
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest publication date:", err);
      }
    }
    fetchLatestDate();
  }, []);

  // Load publication by ID from query param on mount
  useEffect(() => {
    const urlId = searchParams ? searchParams.get("id") : null;
    if (urlId) {
      async function loadInitialArticle(pubId: string) {
        try {
          const data = await getPublication(pubId);
          setSelectedArticle(data);
        } catch (err) {
          console.error("Failed to load initial article from URL ID:", err);
        }
      }
      loadInitialArticle(urlId);
    }
  }, [searchParams]);

  // Auto-select first article if search parameter is present and results are fetched
  useEffect(() => {
    if (initialSearch && publications.length > 0 && !selectedArticle) {
      setSelectedArticle(publications[0]);
    }
  }, [publications, initialSearch]);

  // Load pages list for source dropdown on mount
  useEffect(() => {
    async function loadPages() {
      try {
        const pages = await getPages();
        setPagesList(pages);
      } catch (err) {
        console.error("Failed to load pages list:", err);
      }
    }
    loadPages();
  }, []);

  // Parse natural language queries
  const parseNaturalLanguage = (searchVal: string) => {
    const q = searchVal.toLowerCase();
    const parsedFilters: Partial<typeof activeFilters> = {};
    let cleanedSearch = searchVal;

    // Detect tone keywords
    if (q.includes("positivo") || q.includes("buen")) {
      parsedFilters.tone = "positivo";
      cleanedSearch = cleanedSearch.replace(/positivo|buen/gi, "").trim();
    } else if (q.includes("negativo") || q.includes("mal") || q.includes("tenso")) {
      parsedFilters.tone = "negativo";
      cleanedSearch = cleanedSearch.replace(/negativo|mal|tenso/gi, "").trim();
    } else if (q.includes("neutro")) {
      parsedFilters.tone = "neutral";
      cleanedSearch = cleanedSearch.replace(/neutro/gi, "").trim();
    }

    // Detect date keywords
    if (q.includes("hoy")) {
      parsedFilters.timeRange = "hoy";
      cleanedSearch = cleanedSearch.replace(/hoy/gi, "").trim();
    } else if (q.includes("esta semana") || q.includes("semana")) {
      parsedFilters.timeRange = "7d";
      cleanedSearch = cleanedSearch.replace(/esta semana|semana/gi, "").trim();
    } else if (q.includes("este mes") || q.includes("mes")) {
      parsedFilters.timeRange = "30d";
      cleanedSearch = cleanedSearch.replace(/este mes|mes/gi, "").trim();
    }

    // Detect category keywords
    if (q.includes("seguridad") || q.includes("delito") || q.includes("robo") || q.includes("polic")) {
      parsedFilters.category = "delito";
      cleanedSearch = cleanedSearch.replace(/seguridad|delito|robo|policía|policíaco/gi, "").trim();
    } else if (q.includes("vial") || q.includes("tránsito") || q.includes("choque") || q.includes("bloqueo")) {
      parsedFilters.category = "bloqueo";
      cleanedSearch = cleanedSearch.replace(/vial|tránsito|choque|bloqueo/gi, "").trim();
    } else if (q.includes("lluvia") || q.includes("inundac") || q.includes("clima")) {
      parsedFilters.category = "inundacion";
      cleanedSearch = cleanedSearch.replace(/lluvia|inundación|inundaciones|clima/gi, "").trim();
    } else if (q.includes("alcalde") || q.includes("nava") || q.includes("kuri") || q.includes("gobernador") || q.includes("polític")) {
      parsedFilters.category = "politica";
      cleanedSearch = cleanedSearch.replace(/alcalde|nava|kuri|gobernador|política/gi, "").trim();
    }

    return { cleanedSearch, parsedFilters };
  };

  // Fetch from backend whenever query or filters change
  const fetchResults = async () => {
    setLoading(true);
    try {
      const { cleanedSearch, parsedFilters } = parseNaturalLanguage(query);

      // Merge natural language parsed filters with active dropdown state
      const mergedFilters = {
        ...activeFilters,
        ...parsedFilters
      };

      const apiFilters: PublicationFilters = {
        limit: 14,
        offset: 0
      };

      if (cleanedSearch.trim()) {
        apiFilters.search = cleanedSearch.trim();
      }

      if (mergedFilters.category !== "todas") {
        apiFilters.categoria = mergedFilters.category;
      }

      if (mergedFilters.tone !== "todos") {
        apiFilters.sentimiento = mergedFilters.tone;
      }

      if (mergedFilters.source !== "todas") {
        apiFilters.pagina_id = mergedFilters.source;
      }

      // Map timeRange
      let start = new Date(refToday);
      if (mergedFilters.timeRange === "hoy") {
        start.setHours(0, 0, 0, 0);
        apiFilters.fecha_inicio = start.toISOString().split("T")[0];
      } else if (mergedFilters.timeRange === "7d") {
        start.setDate(refToday.getDate() - 7);
        apiFilters.fecha_inicio = start.toISOString().split("T")[0];
      } else if (mergedFilters.timeRange === "30d") {
        start.setDate(refToday.getDate() - 30);
        apiFilters.fecha_inicio = start.toISOString().split("T")[0];
      }

      const res = await getPublications(apiFilters);
      setPublications(res.data);
      setTotalCount(res.total);
    } catch (err) {
      console.error("Failed to query publications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, activeFilters, refToday]);

  // Load publication details (including comments and images) when selected
  useEffect(() => {
    if (!selectedArticle) {
      setDetail(null);
      return;
    }
    const articleId = selectedArticle.id;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const data = await getPublication(articleId);
        setDetail(data);
      } catch (err) {
        console.error("Failed to load publication detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedArticle]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults();
    addSessionLog(`Explorar: Consulta manual de búsqueda ejecutada: "${query}"`);
  };

  // Dropdown filter setters
  const setFilterVal = (key: keyof typeof activeFilters, val: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: val
    }));
    addSessionLog(`Explorar: Filtro '${key}' cambiado a '${val}'`);
  };

  const removeFilterChip = (key: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: key === "tone" ? "todos" : key === "timeRange" ? "todo" : "todas"
    }));
    addSessionLog(`Explorar: Filtro '${key}' removido`);
  };

  // Related notes calculated on active selected article
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    // Simply fetch other articles of the same category
    return publications
      .filter(p => p.id !== selectedArticle.id && p.categoria === selectedArticle.categoria)
      .slice(0, 3);
  }, [selectedArticle, publications]);

  const getSentimentLabelColor = (sent: string) => {
    if (sent === "positivo") return "bg-ok/10 text-ok border-ok/20";
    if (sent === "negativo") return "bg-critical/10 text-critical border-critical/20";
    return "bg-attention/10 text-attention border-attention/20";
  };

  return (
    <div className="flex-1 flex min-h-0 bg-background text-foreground font-sans relative overflow-hidden">
      
      {/* LEFT COLUMN: SEARCH & CARDS GRID (Fluid) */}
      <div className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto space-y-6 select-none">
        
        {/* Search header container */}
        <div className="flex flex-col items-center space-y-4 shrink-0">
          <form 
            onSubmit={handleSearchSubmit}
            className="w-full max-w-[70%] relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca una noticia, tema, medio o persona... (ej: 'lluvias hoy' o 'qué dijeron de Luis Nava')"
              className="w-full bg-card-bg border border-card-border hover:border-text-muted focus:border-accent-blue px-5 py-3.5 pl-12 rounded-2xl text-xs text-foreground placeholder-text-muted focus:outline-none transition-all shadow-sm"
            />
            <SearchIcon className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            {query && (
              <button 
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Quick Dropdown selectors row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-text-muted">
            
            {/* Medium selector */}
            <select
              value={activeFilters.source}
              onChange={(e) => setFilterVal("source", e.target.value)}
              className="bg-card-bg border border-card-border rounded-xl px-3 py-1.5 focus:outline-none focus:border-accent-blue text-foreground font-sans cursor-pointer hover:bg-card-border/10"
            >
              <option value="todas">Todos los medios</option>
              {pagesList.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            {/* Category selector */}
            <select
              value={activeFilters.category}
              onChange={(e) => setFilterVal("category", e.target.value)}
              className="bg-card-bg border border-card-border rounded-xl px-3 py-1.5 focus:outline-none focus:border-accent-blue text-foreground font-sans cursor-pointer hover:bg-card-border/10"
            >
              <option value="todas">Todos los temas</option>
              <option value="delito">Seguridad Pública</option>
              <option value="bloqueo">Vialidad / Tránsito</option>
              <option value="inundacion">Clima / Lluvias</option>
              <option value="politica">Gobierno y Actores</option>
            </select>

            {/* Time range selector */}
            <select
              value={activeFilters.timeRange}
              onChange={(e) => setFilterVal("timeRange", e.target.value)}
              className="bg-card-bg border border-card-border rounded-xl px-3 py-1.5 focus:outline-none focus:border-accent-blue text-foreground font-sans cursor-pointer hover:bg-card-border/10"
            >
              <option value="todo">Cualquier fecha</option>
              <option value="hoy">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>

            {/* Tone selector buttons */}
            <div className="flex bg-card-bg border border-card-border rounded-xl p-0.5">
              {["todos", "positivo", "neutral", "negativo"].map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setFilterVal("tone", tone)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all capitalize cursor-pointer ${
                    activeFilters.tone === tone 
                      ? "bg-accent-blue text-white shadow-sm" 
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  {tone === "todos" ? "Cualquier Tono" : tone}
                </button>
              ))}
            </div>
          </div>

          {/* Active Accumulative Filters Pills list */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-[80%] pt-1">
            {activeFilters.source !== "todas" && (
              <span className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-xl flex items-center gap-1.5 text-[9px] font-bold">
                Medio: {pagesList.find(p => p.id === activeFilters.source)?.nombre}
                <X className="w-3 h-3 hover:text-foreground cursor-pointer" onClick={() => removeFilterChip("source")} />
              </span>
            )}
            {activeFilters.category !== "todas" && (
              <span className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-xl flex items-center gap-1.5 text-[9px] font-bold">
                Tema: {activeFilters.category === "delito" ? "Seguridad" : activeFilters.category === "bloqueo" ? "Vialidad" : activeFilters.category}
                <X className="w-3 h-3 hover:text-foreground cursor-pointer" onClick={() => removeFilterChip("category")} />
              </span>
            )}
            {activeFilters.timeRange !== "todo" && (
              <span className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-xl flex items-center gap-1.5 text-[9px] font-bold">
                Rango: {activeFilters.timeRange}
                <X className="w-3 h-3 hover:text-foreground cursor-pointer" onClick={() => removeFilterChip("timeRange")} />
              </span>
            )}
            {activeFilters.tone !== "todos" && (
              <span className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-xl flex items-center gap-1.5 text-[9px] font-bold">
                Tono: {activeFilters.tone}
                <X className="w-3 h-3 hover:text-foreground cursor-pointer" onClick={() => removeFilterChip("tone")} />
              </span>
            )}

            {/* Results count indicator */}
            {totalCount > 0 && (
              <span className="text-[10px] font-mono text-text-muted font-bold ml-2">
                {totalCount} publicaciones encontradas
              </span>
            )}
          </div>
        </div>

        {/* CARDS GRID (2 columns) */}
        {loading ? (
          <div className="flex-1 flex justify-center items-center font-mono text-xs text-text-muted gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
            Buscando coincidencias...
          </div>
        ) : publications.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-text-muted text-xs italic py-16">
            No se encontraron publicaciones que coincidan con la búsqueda. Intenta simplificar los términos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publications.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedArticle(item)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                  selectedArticle?.id === item.id 
                    ? "bg-accent-blue/5 border-accent-blue shadow-sm"
                    : "bg-card-bg hover:bg-card-border/10 border border-card-border"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline font-mono text-[9px] text-text-muted">
                    <span className="font-bold text-text-muted">{item.pagina_nombre}</span>
                    <span>{item.fecha_publicacion ? item.fecha_publicacion.slice(0, 16) : item.fecha_registro.slice(0, 16)}</span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                    {item.contenido.split("\n")[0] || item.contenido}
                  </h3>
                  
                  <p className="text-[10.5px] text-text-muted leading-relaxed line-clamp-2 mt-1">
                    {item.contenido.split("\n").slice(1).join(" ") || item.contenido}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-card-border">
                  <span className="text-[9px] font-mono text-text-muted font-bold">
                    ID: {item.id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded border uppercase text-[8px] font-mono font-bold ${getSentimentLabelColor(item.sentimiento)}`}>
                    {item.categoria || "noticia"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDE READER PANEL (60% width) */}
      {selectedArticle && (
        <aside className="w-[450px] lg:w-[600px] shrink-0 bg-card-bg border-l border-card-border flex flex-col justify-between z-30 animate-slideRight shadow-xl">
          
          {/* Reader Header */}
          <div className="p-5 border-b border-card-border flex justify-between items-center shrink-0 bg-card-bg">
            <div className="flex items-center gap-2 font-mono text-[9.5px] text-text-muted">
              <BookOpen className="w-4 h-4 text-accent-blue" />
              <span>LECTOR EN DETALLE</span>
            </div>
            <button 
              onClick={() => setSelectedArticle(null)}
              className="p-1.5 hover:bg-card-border/40 rounded-xl text-text-muted hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reader Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  onClick={() => router.push(`/perfiles?q=${selectedArticle.pagina_nombre}`)}
                  className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2.5 py-0.5 rounded-lg cursor-pointer hover:bg-accent-blue/20"
                >
                  {selectedArticle.pagina_nombre}
                </span>
                <span className="text-[9px] font-mono text-text-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedArticle.fecha_publicacion || selectedArticle.fecha_registro}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground leading-snug pt-2">
                {selectedArticle.contenido.split("\n")[0] || selectedArticle.contenido}
              </h2>
            </div>

            {/* Content text */}
            <div className="text-sm text-foreground leading-relaxed space-y-4 font-sans whitespace-pre-wrap select-text selection:bg-accent-blue/20 selection:text-foreground">
              {selectedArticle.contenido}
            </div>

            {/* Images Gallery */}
            {loadingDetail ? (
              <div className="py-8 flex flex-col items-center justify-center font-mono text-[10px] text-text-muted gap-2">
                <span className="w-4 h-4 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                <span>Cargando adjuntos visuales...</span>
              </div>
            ) : detail && detail.images && detail.images.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-card-border">
                <span className="text-[10px] font-bold text-text-muted uppercase font-mono tracking-wider">Adjuntos Visuales</span>
                <div className="grid grid-cols-3 gap-2">
                  {detail.images.map((img) => (
                    <div key={img.id} className="relative aspect-video bg-background border border-card-border rounded-lg overflow-hidden group">
                      <img
                        src={img.url}
                        alt="Facebook attachment"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => window.open(img.url, "_blank")}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Engagement Grid */}
            {detail && (
              <div className="space-y-3 pt-6 border-t border-card-border">
                <span className="text-[10px] font-bold text-text-muted uppercase font-mono tracking-wider">Desglose de Engagement</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background border border-card-border rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-text-muted uppercase">Me Gusta</span>
                    <span className="text-sm font-extrabold text-foreground mt-1">{detail.me_gusta || 0}</span>
                  </div>
                  <div className="bg-background border border-card-border rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-text-muted uppercase">Comentarios</span>
                    <span className="text-sm font-extrabold text-foreground mt-1">{detail.comentarios_count || 0}</span>
                  </div>
                  <div className="bg-background border border-card-border rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-text-muted uppercase">Compartidos</span>
                    <span className="text-sm font-extrabold text-foreground mt-1">{detail.compartidos || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Red de Coincidencia de Evento (Visual network simulation) */}
            <div className="bg-background border border-card-border rounded-xl p-4 space-y-3 pt-6 border-t border-card-border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Red de Coincidencia de Evento (OSINT Tracking)</h3>
                  <p className="text-[8.5px] text-text-muted">Interconexiones semánticas y propagación de noticias</p>
                </div>
                <span className="text-[8.5px] bg-ok/10 text-ok border border-ok/20 px-2 py-0.5 rounded-full font-bold">
                  92% Match
                </span>
              </div>

              <div className="h-24 w-full bg-card-bg rounded-xl flex items-center justify-center relative overflow-hidden border border-card-border">
                <svg className="w-48 h-full" viewBox="0 0 100 40">
                  <line x1="50" y1="20" x2="20" y2="10" stroke="var(--accent-blue)" strokeWidth="0.8" />
                  <line x1="50" y1="20" x2="35" y2="30" stroke="var(--accent-blue)" strokeWidth="0.8" />
                  <line x1="50" y1="20" x2="80" y2="15" stroke="var(--accent-blue)" strokeWidth="0.8" />
                  
                  <circle cx="50" cy="20" r="3" fill="var(--critical)" />
                  <circle cx="50" cy="20" r="6" stroke="var(--critical)" strokeWidth="0.5" fill="none" className="animate-ping" style={{ transformOrigin: '50px 20px' }} />
                  
                  <circle cx="20" cy="10" r="2" fill="var(--accent-blue)" />
                  <circle cx="35" cy="30" r="2" fill="var(--accent-blue)" />
                  <circle cx="80" cy="15" r="2" fill="var(--accent-blue)" />
                </svg>
              </div>
            </div>

            {/* Related notes section */}
            {relatedArticles.length > 0 && (
              <div className="pt-6 border-t border-card-border space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Cobertura de Medios (Topic Tracking)</h3>
                <div className="space-y-2">
                  {relatedArticles.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => {
                        setSelectedArticle(rel);
                        addSessionLog(`Lector: Salto a nota relacionada ID: ${rel.id}`);
                      }}
                      className="p-3 bg-background hover:bg-card-border/10 border border-card-border rounded-xl cursor-pointer transition-colors space-y-1"
                    >
                      <p className="text-[10.5px] font-semibold text-foreground leading-normal line-clamp-1">{rel.contenido}</p>
                      <div className="flex justify-between items-center text-[8.5px] font-mono text-text-muted">
                        <span className="font-bold text-text-muted">{rel.pagina_nombre}</span>
                        <span>{rel.fecha_registro.slice(11, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reader Footer action buttons */}
          <div className="p-4 border-t border-card-border bg-card-bg flex justify-between items-center text-[10.5px] font-mono shrink-0">
            <span className="text-text-muted">Categoría: <strong className="text-foreground uppercase">{selectedArticle.categoria || "vial"}</strong></span>
            {selectedArticle.enlace && (
              <a 
                href={selectedArticle.enlace}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-card-bg hover:bg-card-border/20 border border-card-border rounded-xl text-foreground font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              >
                Abrir en Facebook
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </aside>
      )}

    </div>
  );
}
