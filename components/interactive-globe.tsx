"use client";

import { useEffect, useId, useRef } from "react";
import type { GlobeActivityMarker } from "@/lib/coverage-opportunity";
import { latLngToVector, SEARCH_PLACE_MARKER_ID } from "@/lib/globe-coords";
import type { GlobeAnchor } from "@/lib/explore-popup";

export const GLOBE_LOCAL_ZOOM = 3.3;

export type GlobeFocus = {
  latitude: number;
  longitude: number;
  zoom?: number;
  nonce?: number;
};

export type { GlobeAnchor } from "@/lib/explore-popup";

export type GlobeAnchorLocation = {
  latitude: number;
  longitude: number;
};

const KIND_COLOR = {
  live: 0xc8102e,
  wanted: 0xb56a4c,
  report: 0x2f5d62,
} as const;

type InteractiveGlobeProps = {
  markers: GlobeActivityMarker[];
  selectedId?: string | null;
  anchorLocation?: GlobeAnchorLocation | null;
  focus?: GlobeFocus | null;
  onSelect: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
  onAnchorChange?: (anchor: GlobeAnchor | null) => void;
  pauseRotation?: boolean;
  idleRotate?: boolean;
  size?: "hero" | "explore";
};

export function InteractiveGlobe({
  markers,
  selectedId,
  anchorLocation = null,
  focus,
  onSelect,
  onZoomChange,
  onAnchorChange,
  pauseRotation = false,
  idleRotate = true,
  size = "explore",
}: InteractiveGlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const markersRef = useRef(markers);
  const selectedRef = useRef(selectedId);
  const anchorLocRef = useRef(anchorLocation);
  const onSelectRef = useRef(onSelect);
  const onZoomRef = useRef(onZoomChange);
  const onAnchorRef = useRef(onAnchorChange);
  const pauseRef = useRef(pauseRotation);
  const idleRef = useRef(idleRotate);
  const focusRef = useRef(focus);
  const reducedRef = useRef(false);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    anchorLocRef.current = anchorLocation;
  }, [anchorLocation]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onZoomRef.current = onZoomChange;
  }, [onZoomChange]);
  useEffect(() => {
    onAnchorRef.current = onAnchorChange;
  }, [onAnchorChange]);
  useEffect(() => {
    pauseRef.current = pauseRotation;
  }, [pauseRotation]);
  useEffect(() => {
    idleRef.current = idleRotate;
  }, [idleRotate]);
  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = media.matches;
    const onChange = () => {
      reducedRef.current = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const root = wrap;
    let disposed = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let frame = 0;

    void (async () => {
      const THREE = await import("three");
      if (disposed || !wrapRef.current) {
        return;
      }
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070b12);
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
      const distance = { current: size === "hero" ? 4.35 : 4.05 };
      camera.position.set(0, 0.12, distance.current);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      root.appendChild(renderer.domElement);
      renderer.domElement.className = "h-full w-full cursor-grab touch-none active:cursor-grabbing";
      renderer.domElement.style.display = "block";

      const earth = new THREE.Group();
      scene.add(earth);

      const geometry = new THREE.SphereGeometry(1, 96, 64);
      // NASA Blue Marble Next Generation (Dec 2004, public domain / NASA Visible Earth)
      const texture = new THREE.TextureLoader().load("/geo/earth-blue-marble.jpg");
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 8,
        specular: new THREE.Color(0x222222),
      });
      const globe = new THREE.Mesh(geometry, material);
      earth.add(globe);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.035, 64, 48),
        new THREE.MeshBasicMaterial({
          color: 0x7eb6ff,
          transparent: true,
          opacity: 0.14,
          side: THREE.BackSide,
        }),
      );
      earth.add(atmosphere);

      scene.add(new THREE.AmbientLight(0xffffff, 0.88));
      const sun = new THREE.DirectionalLight(0xfff4e5, 1.15);
      sun.position.set(-1.2, 0.9, 3.2);
      scene.add(sun);

      const markerGroup = new THREE.Group();
      earth.add(markerGroup);
      const markerMeshes: { id: string; mesh: import("three").Mesh }[] = [];

      function rebuildMarkers() {
        while (markerGroup.children.length) {
          const child = markerGroup.children[0]!;
          markerGroup.remove(child);
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((item) => item.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
        markerMeshes.length = 0;
        const visible = densify(markersRef.current, distance.current, selectedRef.current);
        for (const marker of visible) {
          const selected = marker.id === selectedRef.current;
          const radius = selected ? 0.018 : 0.012;
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 12, 12),
            new THREE.MeshBasicMaterial({ color: KIND_COLOR[marker.kind] }),
          );
          const outline = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 1.28, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
          );
          const point = latLngToVector(marker.latitude, marker.longitude, 1.012);
          mesh.position.set(point.x, point.y, point.z);
          outline.position.copy(mesh.position);
          markerGroup.add(outline);
          markerGroup.add(mesh);
          if (selected) {
            const halo = new THREE.Mesh(
              new THREE.SphereGeometry(radius * 1.7, 12, 12),
              new THREE.MeshBasicMaterial({ color: 0xfffcf7, transparent: true, opacity: 0.55 }),
            );
            halo.position.copy(mesh.position);
            markerGroup.add(halo);
          }
          markerMeshes.push({ id: marker.id, mesh });
        }
      }

      const pointer = { dragging: false, moved: false, lastX: 0, lastY: 0 };
      const focusAnim = {
        active: false,
        t0: 0,
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
      };

      function applyFocus(next: GlobeFocus) {
        const point = latLngToVector(next.latitude, next.longitude, 1);
        const dir = new THREE.Vector3(point.x, point.y, point.z).normalize();
        const dist = next.zoom ?? (size === "hero" ? 3.55 : 3.3);
        distance.current = dist;
        earth.quaternion.identity();
        focusAnim.from.copy(camera.position);
        focusAnim.to.copy(dir.multiplyScalar(dist));
        focusAnim.t0 = performance.now();
        focusAnim.active = !reducedRef.current;
        if (reducedRef.current) {
          camera.position.copy(focusAnim.to);
          camera.up.set(0, 1, 0);
          camera.lookAt(0, 0, 0);
        }
      }

      function resize() {
        const rect = root.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer?.setSize(w, h, true);
      }

      function projectSelected(): GlobeAnchor | null {
        const pin =
          anchorLocRef.current ??
          markersRef.current.find((item) => item.id === selectedRef.current) ??
          null;
        if (!pin || !renderer) {
          return null;
        }
        const local = latLngToVector(pin.latitude, pin.longitude, 1.02);
        const world = new THREE.Vector3(local.x, local.y, local.z).applyQuaternion(earth.quaternion);
        const view = camera.clone();
        if (focusAnim.active) {
          view.position.copy(focusAnim.to);
          view.up.set(0, 1, 0);
          view.lookAt(0, 0, 0);
        }
        view.updateProjectionMatrix();
        view.updateMatrixWorld();
        const camDir = view.position.clone().normalize();
        const facing = world.clone().normalize().dot(camDir) > 0;
        const projected = world.clone().project(view);
        const rect = root.getBoundingClientRect();
        return {
          x: (projected.x * 0.5 + 0.5) * rect.width,
          y: (-projected.y * 0.5 + 0.5) * rect.height,
          visible: facing && projected.z <= 1 && projected.z >= -1,
          wrapW: rect.width,
          wrapH: rect.height,
        };
      }

      const lastFocusKey = { current: "" };
      function consumeFocus() {
        const next = focusRef.current;
        const key = next ? `${next.latitude.toFixed(4)}:${next.longitude.toFixed(4)}:${next.zoom ?? ""}:${next.nonce ?? ""}` : "";
        if (!key || key === lastFocusKey.current) {
          return;
        }
        lastFocusKey.current = key;
        applyFocus(next!);
      }

      let lastMarkerKey = "";
      function maybeRebuild() {
        const key = `${markersRef.current.map((item) => item.id).join(",")}|${selectedRef.current}|${Math.round(distance.current * 10)}`;
        if (key !== lastMarkerKey) {
          lastMarkerKey = key;
          rebuildMarkers();
        }
      }

      const lastAnchor = { x: -999, y: -999, visible: false, missing: true };
      const tick = (now: number) => {
        if (disposed) {
          return;
        }
        consumeFocus();
        maybeRebuild();
        if (focusAnim.active) {
          const t = Math.min(1, (now - focusAnim.t0) / 1100);
          const e = 1 - (1 - t) ** 3;
          camera.position.lerpVectors(focusAnim.from, focusAnim.to, e);
          camera.up.set(0, 1, 0);
          camera.lookAt(0, 0, 0);
          distance.current = camera.position.length();
          onZoomRef.current?.(distance.current);
          if (t >= 1) {
            focusAnim.active = false;
          }
        } else if (idleRef.current && !pauseRef.current && !pointer.dragging && !reducedRef.current) {
          earth.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.00115);
        }
        renderer?.render(scene, camera);
        const anchor = projectSelected();
        const changed =
          !anchor
            ? !lastAnchor.missing
            : lastAnchor.missing ||
              lastAnchor.visible !== anchor.visible ||
              Math.abs(anchor.x - lastAnchor.x) > 1.5 ||
              Math.abs(anchor.y - lastAnchor.y) > 1.5;
        if (changed) {
          if (anchor) {
            lastAnchor.x = anchor.x;
            lastAnchor.y = anchor.y;
            lastAnchor.visible = anchor.visible;
            lastAnchor.missing = false;
          } else {
            lastAnchor.missing = true;
          }
          onAnchorRef.current?.(anchor);
        }
        frame = requestAnimationFrame(tick);
      };

      const onPointerDown = (event: PointerEvent) => {
        pointer.dragging = true;
        pointer.moved = false;
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        root.setPointerCapture(event.pointerId);
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!pointer.dragging) {
          return;
        }
        const dx = event.clientX - pointer.lastX;
        const dy = event.clientY - pointer.lastY;
        if (Math.hypot(dx, dy) > 3) {
          pointer.moved = true;
        }
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        earth.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * 0.005);
        earth.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), dy * 0.0035);
      };
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const onPointerUp = (event: PointerEvent) => {
        const dragged = pointer.moved;
        pointer.dragging = false;
        if (dragged || !renderer) {
          return;
        }
        const rect = root.getBoundingClientRect();
        ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(markerMeshes.map((item) => item.mesh));
        const hit = hits[0];
        if (!hit) {
          return;
        }
        const found = markerMeshes.find((item) => item.mesh === hit.object);
        if (found) {
          onSelectRef.current(found.id);
        }
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        distance.current = Math.max(2.15, Math.min(5.2, distance.current + event.deltaY * 0.0022));
        camera.position.setLength(distance.current);
        camera.lookAt(0, 0, 0);
        onZoomRef.current?.(distance.current);
      };

      root.addEventListener("pointerdown", onPointerDown);
      root.addEventListener("pointermove", onPointerMove);
      root.addEventListener("pointerup", onPointerUp);
      root.addEventListener("pointercancel", onPointerUp);
      root.addEventListener("wheel", onWheel, { passive: false });
      const observer = new ResizeObserver(resize);
      observer.observe(wrap);
      resize();
      rebuildMarkers();
      consumeFocus();
      frame = requestAnimationFrame(tick);

      (wrap as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
        root.removeEventListener("pointerdown", onPointerDown);
        root.removeEventListener("pointermove", onPointerMove);
        root.removeEventListener("pointerup", onPointerUp);
        root.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("wheel", onWheel);
        observer.disconnect();
        geometry.dispose();
        material.dispose();
        texture.dispose();
        atmosphere.geometry.dispose();
        (atmosphere.material as import("three").Material).dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      const extra = (wrap as HTMLDivElement & { __cleanup?: () => void }).__cleanup;
      extra?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [size]);

  const heightClass =
    size === "hero"
      ? "h-[15rem] w-full sm:h-[18rem] lg:h-[22rem]"
      : "h-[22rem] w-full sm:h-[28rem] lg:h-[38rem]";

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-2xl bg-[#070b12] ${heightClass}`}
      role="img"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="sr-only">
        3D globe of Earth with Firsthand activity. Search a place or use the activity list for keyboard access.
      </p>
    </div>
  );
}

function densify(markers: GlobeActivityMarker[], distance: number, selectedId?: string | null) {
  const pinned = markers.filter((item) => item.id === selectedId || item.id === SEARCH_PLACE_MARKER_ID);
  if (distance < 3.2 || markers.length <= 20) {
    const rest = markers.filter((item) => !pinned.some((pin) => pin.id === item.id));
    return [...pinned, ...rest].slice(0, 40);
  }
  const buckets = new Map<string, GlobeActivityMarker>();
  const rank = { live: 0, wanted: 1, report: 2 };
  for (const marker of markers) {
    if (pinned.some((pin) => pin.id === marker.id)) {
      continue;
    }
    const key = `${Math.round(marker.latitude / 12)}:${Math.round(marker.longitude / 12)}`;
    const existing = buckets.get(key);
    if (!existing || rank[marker.kind] < rank[existing.kind]) {
      buckets.set(key, marker);
    }
  }
  return [...pinned, ...buckets.values()].slice(0, 22);
}
