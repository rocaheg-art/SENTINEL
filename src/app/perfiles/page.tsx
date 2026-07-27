"use client";

import React, { Suspense } from "react";
import PerfilesCanvas from "@/components/v3/PerfilesCanvas";

export default function PerfilesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center font-mono text-xs text-gray-500">Cargando perfil...</div>}>
      <PerfilesCanvas />
    </Suspense>
  );
}
