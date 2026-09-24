"use client";

import { useEffect, useId, useRef } from "react";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";

const KIND_COLOR = {
  live: "#c8102e",
  wanted: "#b56a4c",
  report: "#2f5d62",
} as const;

export const GLOBE_LOCAL_ZOOM = 2.6;

export type GlobeFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
};

type InteractiveGlobeProps = {
  markers: GlobeActivityMarker[];
  selectedId?: string | null;
  focus?: GlobeFocus | null;
  onSelect: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
};

function project(
  lat: number,
  lng: number,
  yaw: number,
  pitch: number,
  radius: number,
  cx: number,
  cy: number,
) {
  const lam = ((lng - yaw) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const phi0 = (pitch * Math.PI) / 180;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
  if (cosC < 0) {
    return null;
  }
  const x = radius * Math.cos(phi) * Math.sin(lam);
  const y = radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam));
  return { x: cx + x, y: cy - y, depth: cosC };
}

export function InteractiveGlobe({ markers, selectedId, focus, onSelect, onZoomChange }: InteractiveGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const state = useRef({
    yaw: 10,
    pitch: 18,
    zoom: 1.15,
    dragging: false,
    lastX: 0,
    lastY: 0,
    reduced: false,
  });
  const lastZoom = useRef(1.15);
  const drawRef = useRef<() => void>(() => undefined);
  const onZoomChangeRef = useRef(onZoomChange);
  const labelId = useId();

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  function notifyZoom(next: number) {
    const prev = lastZoom.current;
    const crossed = prev < GLOBE_LOCAL_ZOOM !== next < GLOBE_LOCAL_ZOOM;
    if (crossed || Math.abs(next - prev) >= 0.2) {
      lastZoom.current = next;
      onZoomChangeRef.current?.(next);
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    state.current.reduced = media.matches;
    const onChange = () => {
      state.current.reduced = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!focus) {
      return;
    }
    const targetYaw = focus.longitude;
    const targetPitch = Math.max(-40, Math.min(40, focus.latitude));
    const targetZoom = focus.zoom ?? 2.4;
    const start = { ...state.current };
    if (state.current.reduced) {
      state.current.yaw = targetYaw;
      state.current.pitch = targetPitch;
      state.current.zoom = targetZoom;
      notifyZoom(targetZoom);
      drawRef.current();
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 700);
      const e = 1 - (1 - t) ** 3;
      state.current.yaw = start.yaw + (targetYaw - start.yaw) * e;
      state.current.pitch = start.pitch + (targetPitch - start.pitch) * e;
      const next = start.zoom + (targetZoom - start.zoom) * e;
      state.current.zoom = next;
      notifyZoom(next);
      drawRef.current();
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38 * state.current.zoom;
      const { yaw, pitch } = state.current;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#e4eeef";
      ctx.fillRect(0, 0, w, h);

      const grd = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, radius * 0.2, cx, cy, radius);
      grd.addColorStop(0, "#f7fbfb");
      grd.addColorStop(0.55, "#d5e3e5");
      grd.addColorStop(1, "#9bb6b9");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = "rgba(47, 93, 98, 0.45)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(47, 93, 98, 0.28)";
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 6) {
          const p = project(lat, lng, yaw, pitch, radius, cx, cy);
          if (!p) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      for (let lng = -150; lng <= 180; lng += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 6) {
          const p = project(lat, lng, yaw, pitch, radius, cx, cy);
          if (!p) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      const plotted = markers
        .map((marker) => {
          const p = project(marker.latitude, marker.longitude, yaw, pitch, radius, cx, cy);
          return p ? { marker, ...p } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => a.depth - b.depth);

      for (const item of plotted) {
        const selected = item.marker.id === selectedId;
        ctx.beginPath();
        ctx.arc(item.x, item.y, selected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = KIND_COLOR[item.marker.kind];
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = "#171716";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

    };
    drawRef.current = draw;
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [markers, selectedId]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      state.current.dragging = true;
      state.current.lastX = event.clientX;
      state.current.lastY = event.clientY;
      wrap.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!state.current.dragging) {
        return;
      }
      const dx = event.clientX - state.current.lastX;
      const dy = event.clientY - state.current.lastY;
      state.current.lastX = event.clientX;
      state.current.lastY = event.clientY;
      state.current.yaw -= dx * 0.35;
      state.current.pitch = Math.max(-50, Math.min(50, state.current.pitch + dy * 0.2));
      drawRef.current();
    };
    const onPointerUp = () => {
      state.current.dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = Math.max(0.9, Math.min(3.6, state.current.zoom - event.deltaY * 0.0015));
      state.current.zoom = next;
      notifyZoom(next);
      drawRef.current();
    };
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
    };
  }, []);

  function hitTest(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return null;
    }
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.38 * state.current.zoom;
    let best: { id: string; d: number } | null = null;
    for (const marker of markers) {
      const p = project(marker.latitude, marker.longitude, state.current.yaw, state.current.pitch, radius, cx, cy);
      if (!p) {
        continue;
      }
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 14 && (!best || d < best.d)) {
        best = { id: marker.id, d };
      }
    }
    return best?.id ?? null;
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-[18rem] w-full touch-none overflow-hidden rounded-2xl border border-geo/25 bg-geo-soft sm:h-[24rem] lg:h-[32rem]"
      role="img"
      aria-labelledby={labelId}
      onClick={(event) => {
        const id = hitTest(event.clientX, event.clientY);
        if (id) {
          onSelect(id);
        }
      }}
    >
      <p id={labelId} className="sr-only">
        Rotatable globe of Firsthand activity. Use the activity list for keyboard access.
      </p>
      <canvas ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
