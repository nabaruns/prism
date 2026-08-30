"use client";

import { useEffect, useRef } from "react";

export type GraphNode = { key: string; type: string; name: string; sourceIds: string[] };
export type GraphEdge = { fromKey: string; toKey: string; rel: string };

const TYPE_COLOR: Record<string, string> = {
  site: "#a78bfa",
  company: "#a78bfa",
  product: "#38bdf8",
  price: "#fbbf24",
  person: "#34d399",
  opportunity: "#e879f9",
  doc: "#94a3b8",
  topic: "#f472b6",
  change: "#fb7185",
};
const colorFor = (t: string) => TYPE_COLOR[t] ?? "#9ca3af";

type Sim = { x: number; y: number; vx: number; vy: number; r: number; node: GraphNode; pinned: boolean };

export function GraphView({ entities, edges }: { entities: GraphNode[]; edges: GraphEdge[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{ sims: Map<string, Sim>; hover: string | null; drag: string | null; mouse: { x: number; y: number }; reheat?: () => void }>(
    { sims: new Map(), hover: null, drag: null, mouse: { x: 0, y: 0 } },
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = wrap.clientWidth;
    let H = 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      W = wrap.clientWidth;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    // sync simulation nodes with incoming entities (preserve positions across updates)
    const st = stateRef.current;
    const seen = new Set<string>();
    entities.forEach((e, i) => {
      seen.add(e.key);
      if (!st.sims.has(e.key)) {
        const angle = (i / Math.max(entities.length, 1)) * Math.PI * 2;
        st.sims.set(e.key, {
          x: W / 2 + Math.cos(angle) * 120 + (i % 7) * 3,
          y: H / 2 + Math.sin(angle) * 90 + (i % 5) * 3,
          vx: 0, vy: 0,
          r: Math.min(5 + e.sourceIds.length * 2.5, 16),
          node: e, pinned: false,
        });
      } else {
        const s = st.sims.get(e.key)!;
        s.node = e;
        s.r = Math.min(5 + e.sourceIds.length * 2.5, 16);
      }
    });
    for (const k of Array.from(st.sims.keys())) if (!seen.has(k)) st.sims.delete(k);

    const neighbors = (key: string) => {
      const set = new Set<string>();
      for (const e of edges) {
        if (e.fromKey === key) set.add(e.toKey);
        if (e.toKey === key) set.add(e.fromKey);
      }
      return set;
    };

    let raf = 0;
    // Simulation "temperature": forces scale by alpha, which cools to 0 so the
    // layout settles instead of jittering forever. Reheated on drag / data change.
    let alpha = 1;
    st.reheat = () => { alpha = 0.5; };
    const step = () => {
      const sims = st.sims;
      const arr = Array.from(sims.values());
      if (alpha > 0.001) {
        // repulsion
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i], b = arr[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 0.01) { dx = (i % 7) - 3; dy = (j % 7) - 3; d2 = 1; }
            const d = Math.sqrt(d2);
            const f = (1400 / d2) * alpha;
            const fx = (dx / d) * f, fy = (dy / d) * f;
            a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
          }
        }
        // springs
        for (const e of edges) {
          const a = sims.get(e.fromKey), b = sims.get(e.toKey);
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (d - 90) * 0.01 * alpha;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
        alpha = alpha > 0.02 ? alpha * 0.96 : 0;
      }
      // gravity + integrate
      for (const s of arr) {
        if (alpha > 0.001) {
          s.vx += (W / 2 - s.x) * 0.002 * alpha;
          s.vy += (H / 2 - s.y) * 0.002 * alpha;
        }
        s.vx *= 0.82; s.vy *= 0.82;
        if (st.drag === s.node.key) { s.x = st.mouse.x; s.y = st.mouse.y; s.vx = 0; s.vy = 0; }
        else { s.x += s.vx; s.y += s.vy; }
        s.x = Math.max(s.r, Math.min(W - s.r, s.x));
        s.y = Math.max(s.r, Math.min(H - s.r, s.y));
      }

      // draw
      ctx.clearRect(0, 0, W, H);
      const hoverSet = st.hover ? neighbors(st.hover) : null;
      // edges
      for (const e of edges) {
        const a = sims.get(e.fromKey), b = sims.get(e.toKey);
        if (!a || !b) continue;
        const active = st.hover && (e.fromKey === st.hover || e.toKey === st.hover);
        ctx.strokeStyle = active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = active ? 1.4 : 0.7;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // nodes
      for (const s of arr) {
        const dim = st.hover && st.hover !== s.node.key && !(hoverSet && hoverSet.has(s.node.key));
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = colorFor(s.node.type);
        ctx.fill();
        if (st.hover === s.node.key) { ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke(); }
        if (s.r >= 8 || st.hover === s.node.key) {
          ctx.globalAlpha = dim ? 0.25 : 0.8;
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "10px ui-sans-serif, system-ui";
          const label = s.node.name.length > 18 ? s.node.name.slice(0, 17) + "…" : s.node.name;
          ctx.fillText(label, s.x + s.r + 3, s.y + 3);
        }
        ctx.globalAlpha = 1;
      }
      // tooltip
      if (st.hover) {
        const s = sims.get(st.hover);
        if (s) {
          const txt = `${s.node.type} · ${s.node.name} · ${s.node.sourceIds.length} source(s)`;
          ctx.font = "11px ui-sans-serif, system-ui";
          const w = ctx.measureText(txt).width + 12;
          let tx = s.x + 10, ty = s.y - 24;
          tx = Math.min(tx, W - w - 4);
          ctx.fillStyle = "rgba(6,6,11,0.92)";
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath(); ctx.roundRect(tx, ty, w, 20, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#e5e7eb"; ctx.fillText(txt, tx + 6, ty + 14);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const pick = (mx: number, my: number) => {
      let best: string | null = null, bd = 16;
      for (const s of st.sims.values()) {
        const d = Math.hypot(s.x - mx, s.y - my);
        if (d < Math.max(s.r + 4, bd)) { bd = d; best = s.node.key; }
      }
      return best;
    };
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      st.mouse = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      if (!st.drag) st.hover = pick(st.mouse.x, st.mouse.y);
    };
    const onDown = () => { if (st.hover) { st.drag = st.hover; st.reheat?.(); } };
    const onUp = () => { st.drag = null; };
    const onLeave = () => { st.hover = null; st.drag = null; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [entities, edges]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 420 }}>
      {entities.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/30">
          The graph will appear here as Prism crawls.
        </div>
      )}
      <canvas ref={canvasRef} className="block cursor-grab active:cursor-grabbing" />
    </div>
  );
}
