"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Compass,
  FileText,
  Globe,
  MessageSquare,
  AlertTriangle,
  Inbox,
  Cpu,
  FileBarChart,
  Database,
  Settings,
  Brain
} from "lucide-react";

interface SidebarProps {
  dbType?: string;
}

const NAV_ITEMS = [
  {
    name: "Inteligencia",
    path: "/",
    exact: true,
    icon: Brain,
    description: "Centro de alerta · Estado de Querétaro"
  },
  {
    name: "Observatorio",
    path: "/observatorio",
    exact: false,
    icon: Compass,
    description: "Resumen editorial semanal inteligente"
  },
  {
    name: "Publicaciones",
    path: "/publicaciones",
    exact: false,
    icon: FileText,
    description: "Exploración y análisis de contenido"
  },
  {
    name: "Páginas",
    path: "/paginas",
    exact: false,
    icon: Globe,
    description: "Rendimiento por página de Facebook"
  },
  {
    name: "Sentimiento",
    path: "/sentimiento",
    exact: false,
    icon: MessageSquare,
    description: "Distribución léxica y de comentarios"
  },
  {
    name: "Severidad",
    path: "/severidad",
    exact: false,
    icon: AlertTriangle,
    description: "Publicaciones críticas y alertas"
  },
  {
    name: "Descartes",
    path: "/descartes",
    exact: false,
    icon: Inbox,
    description: "Validación de contenido descartado"
  },
  {
    name: "Sistema",
    path: "/sistema",
    exact: false,
    icon: Cpu,
    description: "Monitoreo de ciclos y workers"
  },
  {
    name: "Reportes",
    path: "/reportes",
    exact: false,
    icon: FileBarChart,
    description: "Exportación y compilación ejecutiva"
  }
];

export default function Sidebar({ dbType = "MYSQL" }: SidebarProps) {
  const pathname = usePathname();

  const isRouteActive = (item: typeof NAV_ITEMS[0]) => {
    if (!pathname) return false;
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  return (
    <aside className="w-[72px] bg-card-bg/85 backdrop-blur-xl border-r border-card-border flex flex-col justify-between items-center py-5 z-40 select-none shrink-0">
      
      {/* Top Section: Logo */}
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="relative group">
          <Link href="/" className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-b from-accent-blue to-blue-600 text-white shadow-sm hover:scale-[1.02] transition-all duration-200">
            <Shield className="h-5 w-5" />
          </Link>
          <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-card-bg/95 border border-card-border text-foreground text-xs py-1.5 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50 font-sans font-semibold backdrop-blur-md">
            SENTINEL Analytics
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-[1px] bg-card-border" />

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2.5 w-full items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = isRouteActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
                  isActive
                    ? item.path === "/" ? "bg-red-500 text-white" : "bg-accent-blue text-white"
                    : item.path === "/" ? "text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent" : "text-text-muted hover:text-foreground hover:bg-card-border/50 border border-transparent"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />

                {/* Tooltip */}
                <div className="absolute left-16 bg-card-bg/95 border border-card-border text-foreground text-xs py-2 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50 font-sans min-w-[150px] backdrop-blur-md">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{item.description}</p>
                </div>
              </Link>
            );
          })}


          {/* Motores / Administración */}
          {(() => {
            const isActive = pathname?.startsWith("/sentinel-mau") || false;
            return (
              <Link
                href="/sentinel-mau"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
                  isActive
                    ? "bg-accent-blue text-white"
                    : "text-text-muted hover:text-foreground hover:bg-card-border/50 border border-transparent"
                }`}
              >
                <Cpu className="h-5 w-5 shrink-0" />
                <div className="absolute left-16 bg-card-bg/95 border border-card-border text-foreground text-xs py-2 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50 font-sans min-w-[150px] backdrop-blur-md">
                  <p className="font-bold">Motores / Administración</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Gestión de fuentes · SENTINEL DB</p>
                </div>
              </Link>
            );
          })()}
        </nav>
      </div>

      {/* Bottom Section: Database Indicator */}
      <div className="relative group flex justify-center w-full">
        <div className="w-11 h-11 rounded-xl border border-card-border bg-card-border/20 flex items-center justify-center text-text-muted hover:text-foreground hover:bg-card-border/50 transition-all cursor-pointer">
          <Database className={`h-4.5 w-4.5 ${
            dbType === "POSTGRES" ? "text-accent-blue" : (dbType === "MYSQL" ? "text-accent-cyan" : "text-attention")
          }`} />
        </div>
        <div className="absolute left-16 bottom-0 bg-card-bg/95 border border-card-border text-foreground text-xs py-2 px-3 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-50 font-sans backdrop-blur-md">
          <p className="font-bold uppercase text-[9px] text-text-muted">Canal de Datos</p>
          <p className="text-[11px] font-bold mt-0.5">
            {dbType === "POSTGRES" ? "PostgreSQL (sentinel)" : (dbType === "MYSQL" ? "MySQL (sentinel_analytics)" : "SQLite (Local)")}
          </p>
        </div>
      </div>
    </aside>
  );
}
