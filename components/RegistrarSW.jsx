"use client";

import { useEffect } from "react";

// Registra o service worker: deixa o site instalável e abrindo sem internet.
export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
