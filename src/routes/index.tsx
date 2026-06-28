import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LESSONS } from "@/lib/course";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Симулятор проектного менеджера в IT — Практический курс" },
      {
        name: "description",
        content:
          "Project management simulator — практический симулятор проектного менеджера в IT: теория, квизы и кейсы. Учись управлять IT-проектами на практике.",
      },
      { property: "og:title", content: "Project management simulator" },
      { property: "og:description", content: "Практический симулятор проектного менеджмента в IT." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

/** Animated node-graph rendered on a canvas behind the hero text. */
function GraphCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const primary = `oklch(${styles.getPropertyValue("--primary").trim() || "0.6 0.2 265"})`;

    let width = 0;
    let height = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    let nodes: Node[] = [];

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, Math.max(28, (width * height) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.5 + Math.random() * 2.5,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const maxDist = Math.min(180, width / 6);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.5;
            ctx!.strokeStyle = primary;
            ctx!.globalAlpha = alpha;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      ctx!.globalAlpha = 1;
      for (const n of nodes) {
        ctx!.fillStyle = primary;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-subtle">
      <GraphCanvas />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 30%, var(--background) 85%)" }}
        aria-hidden
      />

      <header className="relative z-10 max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <span className="font-bold tracking-tight">PM Simulator</span>
        <Link to="/login">
          <Button size="sm" variant="outline">Войти</Button>
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4">
        <section className="min-h-[78vh] flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-3 py-1 text-xs animate-fade-in">
            {LESSONS.length} уроков · теория, квизы и кейсы
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in">
            Project management
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">simulator</span>
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground text-lg animate-fade-in">
            Практический симулятор проектного менеджера в IT.
          </p>
          <div className="mt-8 animate-scale-in">
            <Link to="/login">
              <Button size="lg" className="hover-scale">
                Начать <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
