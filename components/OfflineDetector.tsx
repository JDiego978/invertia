"use client";

import { useEffect, useState } from "react";

export default function OfflineDetector() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-yellow-900 text-sm font-medium px-4 py-2 text-center">
      Sin conexión — mostrando datos guardados localmente
    </div>
  );
}
