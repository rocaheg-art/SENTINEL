"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MEXICO_STATES, StateNode } from "./GlobalMapCanvas";

// Fix for default Leaflet marker icon paths in Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface LeafletMapWrapperProps {
  geography: { country: string; state: string | null; city: string | null };
  stateStats: Record<string, { count: number; severity: number; sentiment: string }>;
  selectedCity: string | null;
  activeLayers: { calor: boolean; markers: boolean; flows: boolean };
  onStateClick: (state: StateNode) => void;
  onCityClick: (cityName: string) => void;
}

// Calculate centroid of state based on its cities coordinates
const getStateCenter = (state: StateNode): [number, number] => {
  if (state.cities && state.cities.length > 0) {
    const sumLat = state.cities.reduce((sum, c) => sum + c.lat, 0);
    const sumLng = state.cities.reduce((sum, c) => sum + c.lng, 0);
    return [sumLat / state.cities.length, sumLng / state.cities.length];
  }
  return [23.6345, -102.5528]; // Fallback to center of Mexico
};

export default function LeafletMapWrapper({
  geography,
  stateStats,
  selectedCity,
  activeLayers,
  onStateClick,
  onCityClick,
}: LeafletMapWrapperProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    fixLeafletIcons();

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [23.6345, -102.5528],
      zoom: 5,
      zoomControl: false,
      minZoom: 4,
      maxZoom: 12,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Add custom styled zoom control at topright
    L.control.zoom({ position: "topright" }).addTo(map);

    // Add Positron (Light/White theme) Tile Layer (CartoDB)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Create Layers Group
    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle map flyTo based on geography state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (geography.state) {
      const match = MEXICO_STATES.find(
        (s) =>
          s.name.toLowerCase() === geography.state?.toLowerCase() ||
          s.id.toLowerCase() === geography.state?.toLowerCase()
      );
      if (match) {
        const center = getStateCenter(match);
        map.flyTo(center, 7.5, { animate: true, duration: 1.2 });
      }
    } else {
      map.flyTo([23.6345, -102.5528], 5, { animate: true, duration: 1.2 });
    }
  }, [geography.state, mapReady]);

  // Update Layers & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup || !mapReady) return;

    // Clear previous overlays
    layersGroup.clearLayers();

    // 1. Draw Flow Connections (if enabled and in national view)
    if (activeLayers.flows && !geography.state) {
      MEXICO_STATES.forEach((state) => {
        const fromCoord = getStateCenter(state);
        state.neighbors.forEach((neighborId) => {
          const neighbor = MEXICO_STATES.find((s) => s.id === neighborId);
          if (neighbor) {
            const toCoord = getStateCenter(neighbor);
            L.polyline([fromCoord, toCoord], {
              color: "#3b82f6",
              weight: 0.8,
              opacity: 0.25,
              dashArray: "3, 6",
            }).addTo(layersGroup);
          }
        });
      });
    }

    // 2. Draw State Centroids / Markers
    MEXICO_STATES.forEach((state) => {
      const center = getStateCenter(state);
      const stats = stateStats[state.id];
      const count = stats?.count || 0;
      const isCurrentState = geography.state?.toLowerCase() === state.name.toLowerCase() || geography.state?.toLowerCase() === state.id.toLowerCase();

      // Define color based on activeLayers.calor and volume
      let baseColor = "rgba(16, 185, 129, 0.85)"; // Emerald
      if (activeLayers.calor) {
        if (count > 150) {
          baseColor = "rgba(147, 51, 234, 0.85)"; // Purple
        } else if (count > 90) {
          baseColor = "rgba(59, 130, 246, 0.85)"; // Blue
        } else if (count > 40) {
          baseColor = "rgba(6, 182, 212, 0.85)"; // Cyan
        }
      } else {
        baseColor = "rgba(71, 85, 105, 0.7)"; // Slate Gray
      }

      // If we are in state view, render other states with very low opacity
      const opacity = geography.state ? (isCurrentState ? 1.0 : 0.15) : 1.0;

      // Custom pulsing HTML icon
      const hasPulse = activeLayers.markers && count > 90 && !geography.state;
      const stateIcon = L.divIcon({
        className: "leaflet-custom-marker",
        html: `
          <div class="leaflet-pulse-marker" style="opacity: ${opacity};">
            ${hasPulse ? `<div class="leaflet-pulse-ring" style="border: 2px solid ${baseColor};"></div>` : ""}
            <div class="leaflet-pulse-dot" style="background-color: ${baseColor}; text-shadow: none; border: 1.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.15); color: #ffffff;">
              ${state.id}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const stateMarker = L.marker(center, { icon: stateIcon }).addTo(layersGroup);

      // Bind Tooltip
      const tooltipContent = `
        <div class="font-sans text-[10px] font-mono text-text-muted space-y-0.5">
          <p class="font-bold text-foreground uppercase text-xs font-sans">${state.name}</p>
          <div class="h-[1px] bg-card-border my-1" />
          <p>Publicaciones: <strong class="text-foreground text-xs">${count}</strong></p>
          <p>Severidad Prom: <strong class="text-foreground text-xs">${(stats?.severity || 0).toFixed(1)}</strong></p>
          <div class="flex items-center gap-1.5 mt-1 font-sans">
            <span>Clima:</span>
            <span class="px-1.5 py-0.25 rounded text-[8px] font-bold uppercase ${
              stats?.sentiment === "positivo"
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : stats?.sentiment === "negativo"
                ? "bg-red-500/10 text-red-650 border border-red-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            }">
              ${stats?.sentiment || "neutral"}
            </span>
          </div>
        </div>
      `;

      stateMarker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        className: "custom-leaflet-tooltip bg-card-bg border border-card-border p-2.5 rounded-xl shadow-lg backdrop-blur-sm",
      });

      // Handle Click to Zoom State
      stateMarker.on("click", () => {
        onStateClick(state);
      });
    });

    // 3. Draw Cities (if state is selected)
    if (geography.state) {
      const matchState = MEXICO_STATES.find(
        (s) =>
          s.name.toLowerCase() === geography.state?.toLowerCase() ||
          s.id.toLowerCase() === geography.state?.toLowerCase()
      );

      if (matchState && matchState.cities) {
        matchState.cities.forEach((city) => {
          const isCitySelected = selectedCity === city.name;
          const severity = (city.name.length % 5) + 3; // Deterministic dummy severity matching the old code
          const dotColor = severity > 6 ? "#ef4444" : severity > 4 ? "#eab308" : "#10b981";

          // Custom HTML icon showing city name and dot
          const cityIcon = L.divIcon({
            className: "custom-city-icon",
            html: `
              <div class="flex flex-col items-center justify-center">
                <span class="text-[9px] font-bold text-foreground font-mono select-none pointer-events-none mb-1 text-shadow tracking-tight whitespace-nowrap">${city.name}</span>
                <span class="w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isCitySelected ? "ring-2 ring-blue-500 scale-125" : ""
                }" style="background-color: ${dotColor}; box-shadow: 0 0 8px ${dotColor}; transition: all 0.2s;"></span>
              </div>
            `,
            iconSize: [80, 35],
            iconAnchor: [40, 25],
          });

          const cityMarker = L.marker([city.lat, city.lng], { icon: cityIcon }).addTo(layersGroup);

          // Handle City Click
          cityMarker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onCityClick(city.name);
          });

          // Bind Tooltip on hover
          cityMarker.bindTooltip(
            `
            <div class="font-sans text-[10px] p-0.5 font-mono text-text-muted">
              <p class="font-bold text-foreground text-xs font-sans">${city.name}</p>
              <div class="h-[1px] bg-card-border my-1" />
              <p>Estado: <strong class="text-foreground">${matchState.name}</strong></p>
              <p>Nivel de Criticidad: <strong class="text-amber-600 font-sans">Moderado</strong></p>
            </div>
            `,
            {
              direction: "top",
              offset: [0, -15],
              className: "custom-leaflet-tooltip bg-card-bg border border-card-border p-2 rounded-xl shadow-lg backdrop-blur-sm",
            }
          );
        });
      }
    }
  }, [geography.state, stateStats, selectedCity, activeLayers, mapReady]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl z-0" />
      
      {/* Inline shadow styles for the city labels so they stand out on the white tiles */}
      <style jsx global>{`
        .text-shadow {
          text-shadow: 0 1px 2px rgba(255,255,255,0.9), 0 0 1px rgba(255,255,255,0.9);
        }
        .custom-leaflet-tooltip {
          border-color: var(--card-border) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: var(--card-border) !important;
        }
      `}</style>
    </div>
  );
}
