"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface GeographyState {
  country: string;
  state: string | null;
  city: string | null;
}

export interface TimeRangeState {
  startDate: string;
  endDate: string;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  state?: any;
}

export interface ScrapersStatusState {
  facebook: "green" | "amber" | "red";
  media: "green" | "amber" | "red";
  dbLatency: number;
}

interface V3ContextType {
  // Master Time Selector
  dateRange: TimeRangeState;
  setDateRange: (range: TimeRangeState) => void;
  timePreset: string;
  setTimePreset: (preset: string) => void;

  // Cascade Filters
  geography: GeographyState;
  setGeography: (geo: GeographyState) => void;
  sourceWeight: number; // 0 = solo Facebook, 100 = solo medios, 50 = 50/50
  setSourceWeight: (weight: number) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  clearAllFilters: () => void;

  // Global Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchExpanded: boolean;
  setIsSearchExpanded: (expanded: boolean) => void;

  // Breadcrumbs Navigation
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (crumbs: BreadcrumbItem[]) => void;
  pushBreadcrumb: (label: string, path: string, state?: any) => void;
  popBreadcrumb: () => void;

  // Presentation Mode
  isPresentationMode: boolean;
  setIsPresentationMode: (mode: boolean) => void;

  // Anomalies Sensitivities
  sensitivityUmbrales: { volume: number; sentiment: number; speed: number; divergence: number };
  setSensitivityUmbrales: (umbrales: { volume: number; sentiment: number; speed: number; divergence: number }) => void;

  // Subscribed Entities
  subscribedEntities: string[];
  toggleSubscribeEntity: (entity: string) => void;

  // Read Alerts
  readAlertIds: string[];
  markAlertAsRead: (alertId: string) => void;

  // Scrapers Health Status & Latency
  scrapersStatus: ScrapersStatusState;
  setScrapersStatus: (status: ScrapersStatusState) => void;
  
  // Navigation History Logs
  sessionLogs: string[];
  addSessionLog: (log: string) => void;
}

const V3Context = createContext<V3ContextType | undefined>(undefined);

// Helper to get formatted ISO dates (reference dates matching the dataset)
const getReferenceDates = (preset: string): TimeRangeState => {
  const refToday = new Date("2026-06-23T12:00:00"); // Base reference date from logs
  let start = new Date(refToday);
  
  switch (preset) {
    case "Hoy":
      start.setHours(0, 0, 0, 0);
      break;
    case "24h":
      start.setDate(refToday.getDate() - 1);
      break;
    case "7D":
      start.setDate(refToday.getDate() - 7);
      break;
    case "14D":
      start.setDate(refToday.getDate() - 14);
      break;
    case "30D":
      start.setDate(refToday.getDate() - 30);
      break;
    case "Este mes":
      start = new Date(refToday.getFullYear(), refToday.getMonth(), 1);
      break;
    case "Picos":
      // Select periods of high activity (e.g. 10th to 15th of June)
      start = new Date("2026-06-10T00:00:00");
      refToday.setTime(new Date("2026-06-16T23:59:59").getTime());
      break;
    case "Todo":
    default:
      start = new Date("2026-05-01T00:00:00");
      break;
  }
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    startDate: format(start),
    endDate: format(refToday)
  };
};

export const V3ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Master Time Range States
  const [timePreset, setTimePresetState] = useState<string>("7D");
  const [dateRange, setDateRange] = useState<TimeRangeState>({
    startDate: "2026-06-16",
    endDate: "2026-06-23"
  });

  // Time preset change wrapper
  const setTimePreset = (preset: string) => {
    setTimePresetState(preset);
    const range = getReferenceDates(preset);
    setDateRange(range);
  };

  // Cascade Filters States
  const [geography, setGeography] = useState<GeographyState>({
    country: "México",
    state: null,
    city: null
  });
  const [sourceWeight, setSourceWeight] = useState<number>(50); // 50/50 mix
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  // Breadcrumbs Navigation States
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { label: "Lienzo Global", path: "/" }
  ]);

  const pushBreadcrumb = (label: string, path: string, state?: any) => {
    // Avoid double entries for same path
    setBreadcrumbs((prev) => {
      const idx = prev.findIndex(c => c.path === path);
      if (idx !== -1) {
        return [...prev.slice(0, idx + 1)];
      }
      return [...prev, { label, path, state }];
    });
  };

  const popBreadcrumb = () => {
    setBreadcrumbs((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
  };

  // Presentation Mode
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Sensitivity Configuration for Anomalies (sigmas)
  const [sensitivityUmbrales, setSensitivityUmbrales] = useState({
    volume: 3.0,
    sentiment: 2.5,
    speed: 3.5,
    divergence: 2.0
  });

  // Subscribed entities and read alerts state with localStorage persistence
  const [subscribedEntities, setSubscribedEntities] = useState<string[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const subs = localStorage.getItem("sentinel_subscribed_entities");
        if (subs) setSubscribedEntities(JSON.parse(subs));
        
        const reads = localStorage.getItem("sentinel_read_alerts");
        if (reads) setReadAlertIds(JSON.parse(reads));
      } catch (e) {
        console.error("Error loading alerts state from localStorage", e);
      }
    }
  }, []);

  const toggleSubscribeEntity = (entity: string) => {
    setSubscribedEntities((prev) => {
      const next = prev.includes(entity)
        ? prev.filter((e) => e !== entity)
        : [...prev, entity];
      if (typeof window !== "undefined") {
        localStorage.setItem("sentinel_subscribed_entities", JSON.stringify(next));
      }
      addSessionLog(`Perfil: ${prev.includes(entity) ? "Desuscripción de" : "Suscripción a"} '${entity}'`);
      return next;
    });
  };

  const markAlertAsRead = (alertId: string) => {
    setReadAlertIds((prev) => {
      if (prev.includes(alertId)) return prev;
      const next = [...prev, alertId];
      if (typeof window !== "undefined") {
        localStorage.setItem("sentinel_read_alerts", JSON.stringify(next));
      }
      return next;
    });
  };

  // Scrapers Health Status & Database Latency
  const [scrapersStatus, setScrapersStatus] = useState<ScrapersStatusState>({
    facebook: "green",
    media: "green",
    dbLatency: 45
  });

  // Navigation history session logs
  const [sessionLogs, setSessionLogs] = useState<string[]>([
    "Sucesos: Inicializando sesión de monitoreo táctico.",
    "BBDD: Conexión establecida con el servidor PostgreSQL a las 10.16.3.122:5433"
  ]);

  const addSessionLog = (log: string) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const stamp = `[${pad(now.getHours())}:${pad(now.getMinutes())}]`;
    setSessionLogs((prev) => [`${stamp} ${log}`, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const clearAllFilters = () => {
    setGeography({ country: "México", state: null, city: null });
    setSourceWeight(50);
    setSelectedCategories([]);
    setSearchQuery("");
  };

  // Simulated Database Latency ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setScrapersStatus((prev) => ({
        ...prev,
        dbLatency: Math.max(12, Math.min(180, prev.dbLatency + Math.floor(Math.random() * 21) - 10))
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <V3Context.Provider
      value={{
        dateRange,
        setDateRange,
        timePreset,
        setTimePreset,
        geography,
        setGeography,
        sourceWeight,
        setSourceWeight,
        selectedCategories,
        setSelectedCategories,
        clearAllFilters,
        searchQuery,
        setSearchQuery,
        isSearchExpanded,
        setIsSearchExpanded,
        breadcrumbs,
        setBreadcrumbs,
        pushBreadcrumb,
        popBreadcrumb,
        isPresentationMode,
        setIsPresentationMode,
        sensitivityUmbrales,
        setSensitivityUmbrales,
        subscribedEntities,
        toggleSubscribeEntity,
        readAlertIds,
        markAlertAsRead,
        scrapersStatus,
        setScrapersStatus,
        sessionLogs,
        addSessionLog
      }}
    >
      {children}
    </V3Context.Provider>
  );
};

export const useV3Context = () => {
  const context = useContext(V3Context);
  if (!context) {
    throw new Error("useV3Context must be used within a V3ContextProvider");
  }
  return context;
};
