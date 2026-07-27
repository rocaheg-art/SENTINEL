"use client";

import React, { Suspense } from "react";
import GlobalMapCanvas from "@/components/v3/GlobalMapCanvas";

export default function MapaPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center font-mono text-xs text-gray-500">Cargando mapa de control...</div>}>
      <GlobalMapCanvas />
    </Suspense>
  );
}
