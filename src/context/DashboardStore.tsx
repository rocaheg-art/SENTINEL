"use client";

import { create } from "zustand";
import { useEffect, useState } from "react";

export interface ChartConfig {
  type: string;        // e.g. 'area' | 'line' | 'bar' | 'scatter'
  granularity: string; // e.g. 'hour' | 'day' | 'week'
  metric: string;      // e.g. 'volume' | 'sentiment' | 'engagement'
  compareWithPrior: boolean;
  color: string;       // Hex or Tailwind color string
}

export interface Anomaly {
  id: string;
  type: "volume" | "sentiment" | "source";
  message: string;
  timestamp: string;
  severity: "critical" | "warning";
  deviation: number; // expressed in standard deviations
  details: string;
}

interface DashboardState {
  // Time filters (MySQL data boundaries 2026-05-19 to 2026-06-02)
  timeRange: [string, string];
  selectedSource: string | null;
  selectedCategory: string | null;
  expandedChartId: string | null;
  
  // Comparative Mode
  isComparing: boolean;
  compareTimeRange: [string, string];

  // Local configurations for each widget
  chartConfigs: Record<string, ChartConfig>;
  
  // Live polling states (polling toggles)
  livePolling: Record<string, boolean>;

  // Anomalies alerts
  anomalies: Anomaly[];

  // Unread badge counts for sidebar
  unseenCounts: Record<string, number>;
  
  // Selected publication for deep highlighting
  selectedPublicationId: string | null;

  // Actions
  setTimeRange: (range: [string, string]) => void;
  setSelectedSource: (source: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setExpandedChartId: (id: string | null) => void;
  setSelectedPublicationId: (id: string | null) => void;
  setIsComparing: (val: boolean) => void;
  setCompareTimeRange: (range: [string, string]) => void;
  updateChartConfig: (chartId: string, config: Partial<ChartConfig>) => void;
  toggleLivePolling: (chartId: string) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  clearUnseenCount: (path: string) => void;
  incrementUnseenCount: (path: string) => void;
}

const DEFAULT_CONFIGS: Record<string, ChartConfig> = {
  trends: { type: "area", granularity: "day", metric: "volume", compareWithPrior: false, color: "#2563EB" },
  trends_compare: { type: "area", granularity: "day", metric: "volume", compareWithPrior: false, color: "#64748B" },
  sources: { type: "treemap", granularity: "day", metric: "volume", compareWithPrior: false, color: "#2563EB" },
  sentiment: { type: "gauge", granularity: "day", metric: "sentiment", compareWithPrior: false, color: "#10B981" },
  feed: { type: "list", granularity: "day", metric: "engagement", compareWithPrior: false, color: "#3b82f6" }
};

// Client store setup with hydration-safe localStorage retrieval
export const useDashboardStore = create<DashboardState>((set, get) => ({
  timeRange: ["2026-05-19", "2026-06-02"],
  selectedSource: null,
  selectedCategory: null,
  expandedChartId: null,
  isComparing: false,
  compareTimeRange: ["2026-05-05", "2026-05-18"],
  chartConfigs: DEFAULT_CONFIGS,
  livePolling: { trends: false, sources: false, sentiment: false, feed: false },
  anomalies: [
    {
      id: "anom-1",
      type: "volume",
      message: "Pico de volumen inusual detectado en AlertaQro Noticias Querétaro",
      timestamp: "2026-06-02T11:00:00",
      severity: "warning",
      deviation: 2.8,
      details: "El volumen de menciones escaló 2.8x sobre el promedio móvil de las últimas 24 horas debido a reportes de inundaciones."
    },
    {
      id: "anom-2",
      type: "sentiment",
      message: "Caída drástica de sentimiento negativo sostenido por más de 30 minutos",
      timestamp: "2026-05-28T16:30:00",
      severity: "critical",
      deviation: 3.4,
      details: "Pico del 85% de comentarios negativos en temas de 'Tren_ferrocarril' debido a accidente de tren."
    }
  ],
  selectedPublicationId: null,
  unseenCounts: {
    "/dashboard": 3,
    "/semantica": 1,
    "/explorador": 0,
    "/analitica": 0
  },

  setTimeRange: (range) => set({ timeRange: range }),
  setSelectedSource: (source) => set({ selectedSource: source }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setExpandedChartId: (id) => set({ expandedChartId: id }),
  setSelectedPublicationId: (id) => set({ selectedPublicationId: id }),
  setIsComparing: (val) => set({ isComparing: val }),
  setCompareTimeRange: (range) => set({ compareTimeRange: range }),
  updateChartConfig: (chartId, newConfig) => {
    const configs = { ...get().chartConfigs };
    configs[chartId] = { ...configs[chartId], ...newConfig };
    set({ chartConfigs: configs });
    if (typeof window !== "undefined") {
      localStorage.setItem(`sentinel_config_${chartId}`, JSON.stringify(configs[chartId]));
    }
  },
  toggleLivePolling: (chartId) => {
    const polling = { ...get().livePolling };
    polling[chartId] = !polling[chartId];
    set({ livePolling: polling });
  },
  setAnomalies: (anomalies) => set({ anomalies }),
  clearUnseenCount: (path) => {
    const counts = { ...get().unseenCounts };
    counts[path] = 0;
    set({ unseenCounts: counts });
  },
  incrementUnseenCount: (path) => {
    const counts = { ...get().unseenCounts };
    counts[path] = (counts[path] || 0) + 1;
    set({ unseenCounts: counts });
  }
}));

// Hydration hook for Next.js to load settings safely from localStorage
export function useHydratedConfigs() {
  const updateChartConfig = useDashboardStore((state) => state.updateChartConfig);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      await Promise.resolve();
      if (!active) return;

      Object.keys(DEFAULT_CONFIGS).forEach((chartId) => {
        const saved = localStorage.getItem(`sentinel_config_${chartId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            updateChartConfig(chartId, parsed);
          } catch (e) {
            console.error("Failed to parse config for " + chartId, e);
          }
        }
      });
      setHydrated(true);
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [updateChartConfig]);

  return hydrated;
}
