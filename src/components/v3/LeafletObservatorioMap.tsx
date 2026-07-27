"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet marker icon paths in Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface LocationPoint {
  nombre: string;
  lat: number;
  lng: number;
  publicaciones: number;
  sentimiento_predominante: string;
  severidad_promedio: number;
}

interface LeafletObservatorioMapProps {
  locations: LocationPoint[];
  activeLocationFilter: string | null;
  onLocationClick: (locName: string | null) => void;
  onHoverLocation: (loc: LocationPoint | null) => void;
}

export default function LeafletObservatorioMap({
  locations,
  activeLocationFilter,
  onLocationClick,
  onHoverLocation,
}: LeafletObservatorioMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map centering in Querétaro Centro (20.5888, -100.3899)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    fixLeafletIcons();

    const map = L.map(mapContainerRef.current, {
      center: [20.5888, -100.3899],
      zoom: 12,
      zoomControl: false,
      minZoom: 9,
      maxZoom: 16,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // Light theme voyager tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when locations or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup || !mapReady) return;

    // Clear previous markers
    markersGroup.clearLayers();

    const getSentimentColor = (sent: string) => {
      const s = sent.toLowerCase();
      if (s === "negativo") return "#ef4444";
      if (s === "positivo") return "#10b981";
      if (s === "mixto") return "#a855f7";
      return "#64748b";
    };

    locations.forEach((loc) => {
      const isSelected = activeLocationFilter?.toLowerCase() === loc.nombre.toLowerCase();
      const dotColor = getSentimentColor(loc.sentimiento_predominante);

      // Custom pulsing HTML marker icon
      const customIcon = L.divIcon({
        className: "leaflet-custom-marker",
        html: `
          <div class="leaflet-pulse-marker" style="transition: transform 0.2s;">
            <div class="leaflet-pulse-ring" style="border: 2px solid ${dotColor}; opacity: ${isSelected ? 0.8 : 0.4};"></div>
            <div class="leaflet-pulse-dot" style="background-color: ${dotColor}; text-shadow: none; border: 1.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.15); width: 14px; height: 14px;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(markersGroup);

      // Mouse actions
      marker.on("mouseover", () => {
        onHoverLocation(loc);
      });

      marker.on("mouseout", () => {
        onHoverLocation(null);
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const nextFilter = activeLocationFilter === loc.nombre ? null : loc.nombre;
        onLocationClick(nextFilter);
      });

      // Bind Tooltip on hover
      const tooltipContent = `
        <div class="font-sans text-[10.5px] p-0.5 font-mono text-text-muted space-y-0.5">
          <p class="font-bold text-foreground text-xs font-sans">${loc.nombre}</p>
          <div class="h-[1px] bg-card-border my-1" />
          <p>Publicaciones: <strong class="text-foreground">${loc.publicaciones}</strong></p>
          <p>Severidad Prom: <strong class="text-foreground">${loc.severidad_promedio}</strong></p>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        className: "custom-leaflet-tooltip bg-card-bg border border-card-border p-2.5 rounded-xl shadow-lg backdrop-blur-sm",
      });
    });

    // Auto-fit bounds if we have locations
    if (locations.length > 0 && !activeLocationFilter) {
      const group = L.featureGroup(locations.map(loc => L.marker([loc.lat, loc.lng])));
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [locations, activeLocationFilter, mapReady]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl z-0" />
      <style jsx global>{`
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
