"use client";

import React, { Suspense } from "react";
import PublicacionesTableCanvas from "@/components/v3/PublicacionesTableCanvas";

export default function ExplorarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-foreground text-xs">Cargando Explorador...</div>}>
      <PublicacionesTableCanvas />
    </Suspense>
  );
}
