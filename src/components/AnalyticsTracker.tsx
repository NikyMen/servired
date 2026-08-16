"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function randomKey() {
  return crypto.randomUUID();
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const visitorKey = localStorage.getItem("servired_visitor") || randomKey();
    const sessionKey = sessionStorage.getItem("servired_session") || randomKey();
    const startedAt = sessionStorage.getItem("servired_started") || String(Date.now());
    localStorage.setItem("servired_visitor", visitorKey);
    sessionStorage.setItem("servired_session", sessionKey);
    sessionStorage.setItem("servired_started", startedAt);

    const send = (includeSearch = false) => {
      const params = new URLSearchParams(query);
      const payload = JSON.stringify({
        visitorKey,
        sessionKey,
        path: pathname,
        source: params.get("utm_source") || document.referrer || "Directo",
        durationSeconds: Math.floor((Date.now() - Number(startedAt)) / 1000),
        term: includeSearch ? params.get("q") || undefined : undefined,
        categorySlug: includeSearch ? params.get("categoria") || undefined : undefined,
      });
      navigator.sendBeacon?.("/api/metricas", new Blob([payload], { type: "application/json" })) ||
        fetch("/api/metricas", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    };

    send(true);
    const timer = window.setInterval(send, 15_000);
    const onVisibility = () => { if (document.visibilityState === "hidden") send(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      send();
    };
  }, [pathname, query]);

  return null;
}
