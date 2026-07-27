"use client";

import React, { Suspense } from "react";
import PublicacionesTableCanvas from "@/components/v3/PublicacionesTableCanvas";

export default function PublicacionesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-foreground text-xs">Cargando Publicaciones...</div>}>
      <PublicacionesTableCanvas />
    </Suspense>
  );
}