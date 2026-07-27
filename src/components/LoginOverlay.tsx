"use client";

import React, { useState } from "react";
import { login } from "@/lib/api";
import { Shield, Lock, User, AlertCircle } from "lucide-react";

export default function LoginOverlay({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login({ username, password });
      localStorage.setItem("sentinel_token", data.access_token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0d0d0d] flex items-center justify-center p-4">
      {/* Glow effects in background */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-900/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-[420px] bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.15)] animate-pulse">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">SENTINEL ANALYTICS</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">Consola de Inteligencia de Redes Sociales</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/30 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-sans">
              Usuario de Sistema
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Introduzca usuario"
                className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 font-sans">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_15px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.45)] cursor-pointer flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#1f1f1f] pt-4">
          <p className="text-[10px] font-mono text-gray-650">
            SENTINEL PLATFORM v2.0.0 (STAGING)
          </p>
        </div>
      </div>
    </div>
  );
}
