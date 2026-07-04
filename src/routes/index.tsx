import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")(
  { component: Landing }
);

/* ─── Keyframes + pseudo-element CSS injected once ─── */
function GlobalStyles() {
  return (
    <style>{`
      @property --holo-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }
      @keyframes editor-float {
        0%, 100% { transform: translateY(0px);   }
        50%      { transform: translateY(-14px);  }
      }
      @keyframes scan {
        0%   { top: 0px;    opacity: 0; }
        8%   { opacity: 1;              }
        92%  { opacity: 1;              }
        100% { top: 190px;  opacity: 0; }
      }
      @keyframes badge-pop {
        from { opacity: 0; transform: scale(0.6) translateX(8px); }
        to   { opacity: 1; transform: scale(1)   translateX(0);   }
      }
      @keyframes badge-fade {
        from { opacity: 1; }
        to   { opacity: 0; transform: translateX(6px); }
      }
      @keyframes holo-spin  { to { --holo-angle: 360deg; } }
      @keyframes card-shine {
        from { transform: translateX(-150%); }
        to   { transform: translateX(250%);  }
      }
      @keyframes blob-breathe {
        0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.9; }
        50%     { transform: translate(-50%,-50%) scale(1.65); opacity: 0.4; }
      }
      @keyframes btn-ripple {
        to { transform: translate(-50%,-50%) scale(32); opacity: 0; }
      }
      @keyframes mesh-drift {
        0%,100% { transform: translate(0,0) scale(1); }
        50%     { transform: translate(-2%,2%) scale(1.06); }
      }

      /* ── Site-wide gradient mesh background ── */
      .rc-mesh-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse 60% 45% at 12% 8%,  rgba(99,102,241,0.10), transparent 60%),
          radial-gradient(ellipse 55% 40% at 88% 18%, rgba(139,92,246,0.09), transparent 60%),
          radial-gradient(ellipse 50% 45% at 20% 78%, rgba(59,130,246,0.08), transparent 60%),
          radial-gradient(ellipse 60% 50% at 82% 88%, rgba(236,72,153,0.06), transparent 60%),
          radial-gradient(ellipse 70% 60% at 50% 45%, rgba(6,182,212,0.05), transparent 65%);
        animation: mesh-drift 22s ease-in-out infinite;
      }

      /* ── Feature card: holographic ring + shine on hover ── */
      .rc-feat-card {
        position: relative;
        border-radius: 14px;
        padding: 20px;
        border: 1px solid rgba(99,102,241,0.12);
        background: rgba(255,255,255,0.8);
        backdrop-filter: blur(8px);
        overflow: hidden;
        cursor: default;
        transition: transform 0.08s ease, box-shadow 0.08s ease;
        transform-style: preserve-3d;
      }
      .rc-feat-card::before {
        content: '';
        position: absolute; inset: 0;
        border-radius: 14px; padding: 1px;
        background: conic-gradient(
          from var(--holo-angle),
          #6366f1,#a855f7,#06b6d4,#22d3ee,
          #34d399,#eab308,#f97316,#ef4444,
          #a855f7,#6366f1
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: destination-out;
        mask-composite: exclude;
        opacity: 0; transition: opacity 0.25s ease;
        pointer-events: none; z-index: 1;
        --holo-angle: 0deg;
      }
      .rc-feat-card:hover::before {
        opacity: 1;
        animation: holo-spin 2.5s linear infinite;
      }
      .rc-feat-card::after {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(108deg,transparent 30%,rgba(255,255,255,0.55) 50%,transparent 70%);
        transform: translateX(-150%);
        pointer-events: none; z-index: 2;
      }
      .rc-feat-card:hover::after {
        animation: card-shine 0.55s ease-in-out forwards;
      }

      /* ── Hero CTA button: cursor spotlight + bevel ── */
      .rc-hero-btn {
        display: inline-block; position: relative; overflow: hidden;
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: #fff; font-size: 13px; padding: 8px 20px;
        border-radius: 8px; font-weight: 500; border: none; cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        text-decoration: none;
      }
      .rc-hero-btn::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle 70px at var(--bx,50%) var(--by,50%), rgba(255,255,255,0.28), transparent 70%);
        opacity: 0; transition: opacity 0.2s; pointer-events: none;
      }
      .rc-hero-btn::after {
        content: ''; position: absolute; inset: 0; border-radius: 8px;
        background: linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.12);
        pointer-events: none;
      }
      .rc-hero-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 28px rgba(99,102,241,0.45); }
      .rc-hero-btn:hover::before { opacity: 1; }
      .rc-hero-btn:active { transform: translateY(0) scale(1); box-shadow: none; }

      /* ── CTA magnetic button ── */
      .rc-cta-btn {
        display: inline-block; position: relative; overflow: hidden;
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: #fff; font-size: 14px; padding: 10px 28px;
        border-radius: 8px; font-weight: 500; border: none; cursor: pointer;
        box-shadow: 0 4px 20px rgba(99,102,241,0.3); transition: box-shadow 0.2s ease;
      }
      .rc-cta-btn::after {
        content: ''; position: absolute; inset: 0; border-radius: 8px;
        background: linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 60%);
        pointer-events: none;
      }
      .rc-cta-btn:hover { box-shadow: 0 8px 32px rgba(99,102,241,0.45); }
    `}</style>
  );
}

/* ─── Syntax token helpers ─── */
const Kw = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#ff7b72' }}>{c}</span>;
const Fn = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#d2a8ff' }}>{c}</span>;
const St = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#a5d6ff' }}>{c}</span>;
const Cm = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#8b949e' }}>{c}</span>;
const Op = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#79c0ff' }}>{c}</span>;
const Va = ({ c }: { c: React.ReactNode }) => <span style={{ color: '#e6edf3' }}>{c}</span>;
const CL = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ whiteSpace: 'pre' }}>{children ?? '\u00A0'}</div>
);

/* ─── Floating code editor ─── */
interface BadgeState {
  id: number; top: number; cls: string; dot: string; text: string; fading: boolean;
}
const BADGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'  },
  warn:     { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', border: '1px solid rgba(234,179,8,0.25)' },
  info:     { bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' },
};

function EditorWidget() {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [badges, setBadges] = useState<BadgeState[]>([]);

  /* cursor tilt with resting angle */
  useEffect(() => {
    const wrap = wrapRef.current!;
    const el   = editorRef.current!;
    const REST = { rx: 3, ry: -8 };
    let tgt = { ...REST }, cur = { ...REST };
    let raf: number;

    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      tgt.ry = REST.ry + ((e.clientX - r.left) / r.width  - 0.5) * 10;
      tgt.rx = REST.rx - ((e.clientY - r.top)  / r.height - 0.5) * 7;
    };
    const onLeave = () => { tgt.rx = REST.rx; tgt.ry = REST.ry; };

    const tick = () => {
      cur.rx += (tgt.rx - cur.rx) * 0.08;
      cur.ry += (tgt.ry - cur.ry) * 0.08;
      el.style.transform  = `perspective(900px) rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)`;
      const sx = -cur.ry * 1.5, sy = cur.rx * 1.2;
      el.style.boxShadow  = `${sx}px ${sy + 20}px 60px rgba(0,0,0,0.30),0 0 0 1px rgba(99,102,241,0.18),0 0 80px rgba(99,102,241,0.10)`;
      raf = requestAnimationFrame(tick);
    };

    wrap.addEventListener('mousemove',  onMove);
    wrap.addEventListener('mouseleave', onLeave);
    tick();
    return () => {
      wrap.removeEventListener('mousemove',  onMove);
      wrap.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* issue badge cycling */
  useEffect(() => {
    const DEFS = [
      { top: 68,  cls: 'critical', dot: '#f87171', text: 'SQL Injection · Line 5'   },
      { top: 132, cls: 'warn',     dot: '#facc15', text: 'Hardcoded token · Line 11' },
      { top: 28,  cls: 'info',     dot: '#a5b4fc', text: 'No rate limit · Line 4'   },
    ];
    const CYCLE = 3200;
    let counter = 0;
    const timers:   ReturnType<typeof setTimeout>[]  = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    DEFS.forEach((def, i) => {
      const addBadge = () => {
        const id = counter++;
        setBadges(prev => [...prev, { ...def, id, fading: false }]);
        timers.push(setTimeout(() => {
          setBadges(prev => prev.map(b => b.id === id ? { ...b, fading: true } : b));
          timers.push(setTimeout(() => {
            setBadges(prev => prev.filter(b => b.id !== id));
          }, 320));
        }, CYCLE - 350));
      };
      timers.push(setTimeout(() => {
        addBadge();
        intervals.push(setInterval(addBadge, CYCLE * DEFS.length));
      }, i * CYCLE));
    });

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ flexShrink: 0, width: 380, perspective: 1000, cursor: 'default',
        animation: 'editor-float 3.8s ease-in-out infinite' }}
    >
      <div ref={editorRef} style={{
        position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden',
        background: '#0d1117', transformStyle: 'preserve-3d',
        transform:  'perspective(900px) rotateX(3deg) rotateY(-8deg)',
        boxShadow:  '12px 24px 60px rgba(0,0,0,0.30),0 0 0 1px rgba(99,102,241,0.18),0 0 80px rgba(99,102,241,0.10)',
      }}>
        {/* glass shine */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', zIndex: 10,
          background: 'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)' }} />

        {/* title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['#ff5f57','#febc2e','#28c840'] as const).map((bg, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: bg }} />
          ))}
          <div style={{ marginLeft: 10, fontSize: 11, fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.06)', padding: '3px 10px',
            borderRadius: '4px 4px 0 0', borderTop: '1px solid rgba(99,102,241,0.4)',
            color: 'rgba(255,255,255,0.8)' }}>auth.py</div>
        </div>

        {/* code body */}
        <div style={{ position: 'relative', display: 'flex',
          fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11.5, lineHeight: 1.7,
          padding: '14px 0', overflow: 'hidden' }}>
          {/* line numbers */}
          <div style={{ padding: '0 12px 0 14px', color: 'rgba(255,255,255,0.18)',
            userSelect: 'none', textAlign: 'right', minWidth: 36 }}>
            {Array.from({ length: 12 }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>

          {/* lines + overlays */}
          <div style={{ flex: 1, paddingRight: 16, position: 'relative' }}>
            {/* scanning glow line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2, zIndex: 5,
              background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.7),rgba(139,92,246,0.5),transparent)',
              filter: 'blur(1px)', pointerEvents: 'none',
              animation: 'scan 3s ease-in-out infinite',
            }} />

            <CL><Kw c="import" /> <Va c="sqlite3" /></CL>
            <CL><Cm c="# User authentication handler" /></CL>
            <CL />
            <CL><Kw c="def" /> <Fn c="login" />(<Va c="username" />, <Va c="password" />):</CL>
            <CL>{'    '}<Va c="query" /> <Op c="=" /> <St c='f"SELECT * FROM users' /></CL>
            <CL><St c={"             WHERE user='{username}'\""} /></CL>
            <CL>{'    '}<Va c="result" /> <Op c="=" /> <Fn c="db" />.<Fn c="execute" />(<Va c="query" />)</CL>
            <CL>{'    '}<Kw c="return" /> <Va c="result" /></CL>
            <CL />
            <CL><Kw c="def" /> <Fn c="reset_password" />(<Va c="email" />):</CL>
            <CL>{'    '}<Va c="token" /> <Op c="=" /> <St c='"abc123"' />{'  '}<Cm c="# hardcoded" /></CL>
            <CL>{'    '}<Fn c="send_email" />(<Va c="email" />, <Va c="token" />)</CL>

            {/* badges */}
            {badges.map(b => {
              const col = BADGE_COLORS[b.cls];
              return (
                <div key={b.id} style={{
                  position: 'absolute', right: -4, top: b.top,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 6,
                  background: col.bg, color: col.color, border: col.border,
                  animation: `${b.fading ? 'badge-fade 0.3s ease' : 'badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)'} forwards`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: b.dot, flexShrink: 0 }} />
                  {b.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero neural-network canvas ─── */
function HeroCanvas({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c   = ref.current!;
    const ctx = c.getContext('2d')!;
    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.06, vy: (Math.random() - 0.5) * 0.06,
      r: Math.random() * 2 + 1,
    }));

    let ez = { cx: 0, cy: 0, hard: 0, soft: 0 };
    const cacheZone = () => {
      const el = editorRef.current;
      if (!el) return;
      const cr = c.getBoundingClientRect(), er = el.getBoundingClientRect();
      const hw = Math.max(er.width, er.height) * 0.52;
      ez = { cx: (er.left + er.width / 2) - cr.left, cy: (er.top + er.height / 2) - cr.top, hard: hw, soft: hw + 90 };
    };
    window.addEventListener('resize', cacheZone);
    requestAnimationFrame(cacheZone);

    const fade = (px: number, py: number) => {
      const d = Math.sqrt((px - ez.cx) ** 2 + (py - ez.cy) ** 2);
      if (d <= ez.hard) return 0; if (d >= ez.soft) return 1;
      const t = (d - ez.hard) / (ez.soft - ez.hard);
      return 0.5 - 0.5 * Math.cos(t * Math.PI);
    };

    let raf: number;
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      ([
        { x: 0.2, y: 0.3, r: 300, col: '99,102,241',  a: 0.13 },
        { x: 0.5, y: 0.6, r: 250, col: '139,92,246',  a: 0.08 },
        { x: 0.1, y: 0.8, r: 200, col: '59,130,246',  a: 0.07 },
      ] as const).forEach(b => {
        const g = ctx.createRadialGradient(b.x * c.width, b.y * c.height, 0, b.x * c.width, b.y * c.height, b.r);
        g.addColorStop(0, `rgba(${b.col},${b.a})`); g.addColorStop(1, `rgba(${b.col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x * c.width, b.y * c.height, b.r, 0, Math.PI * 2); ctx.fill();
      });
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 100) n.vx *= -1;
        if (n.y < 0 || n.y > 100) n.vy *= -1;
      });
      nodes.forEach((a, i) => {
        const ax = a.x * c.width / 100, ay = a.y * c.height / 100, fa = fade(ax, ay);
        nodes.slice(i + 1).forEach(b => {
          const bx = b.x * c.width / 100, by = b.y * c.height / 100;
          const dx = ax - bx, dy = ay - by, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            const f = Math.min(fa, fade(bx, by)); if (f <= 0) return;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(99,102,241,${0.22 * (1 - d / 80) * f})`; ctx.lineWidth = 0.7; ctx.stroke();
          }
        });
        if (fa > 0) { ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(99,102,241,${0.42 * fa})`; ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', cacheZone); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ─── CTA code rain canvas ─── */
function CtaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    const syms = ['0','1','{','}','<','>','/','=',';','fn','if','let','const','def'];
    type Drop = { x: number; y: number; speed: number; sym: string; alpha: number; size: number };
    let drops: Drop[] = [];
    let raf: number;
    const init = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      drops = Array.from({ length: 20 }, () => ({
        x: Math.random() * c.width, y: Math.random() * c.height,
        speed: 0.3 + Math.random() * 0.5, sym: syms[Math.floor(Math.random() * syms.length)],
        alpha: 0.12 + Math.random() * 0.13, size: 10 + Math.random() * 8,
      }));
    };
    init();
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight; ctx.clearRect(0, 0, c.width, c.height);
      drops.forEach(d => {
        ctx.fillStyle = `rgba(99,102,241,${d.alpha})`; ctx.font = `${d.size}px monospace`;
        ctx.fillText(d.sym, d.x, d.y); d.y += d.speed;
        if (d.y > c.height + 20) { d.y = -20; d.x = Math.random() * c.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ─── Feature card: holographic + 3-D tilt ─── */
function FeatCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform  = `perspective(600px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.04)`;
    el.style.boxShadow  = `${-x * 14}px ${-y * 14}px 28px rgba(99,102,241,0.15)`;
  };
  const onLeave = () => {
    const el = ref.current!;
    el.style.transform = ''; el.style.boxShadow = '';
  };
  return (
    <div ref={ref} className="rc-feat-card" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', top: -20, right: -20, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle,rgba(99,102,241,0.2),transparent)' }} />
      <div style={{ position: 'relative', zIndex: 3, width: 36, height: 36, borderRadius: 10, marginBottom: 12,
        background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      <div style={{ position: 'relative', zIndex: 3, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{name}</div>
      <div style={{ position: 'relative', zIndex: 3, fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

/* ─── Main landing page ─── */
function Landing() {
  const editorRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLButtonElement>(null);

  /* CTA magnetic button */
  useEffect(() => {
    const btn = ctaBtnRef.current!;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf: number;
    const onMove  = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width  / 2) * 0.28;
      ty = (e.clientY - r.top  - r.height / 2) * 0.28;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const tick    = () => {
      cx += (tx - cx) * 0.1; cy += (ty - cy) * 0.1;
      btn.style.transform = `translate(${cx}px,${cy}px)`;
      raf = requestAnimationFrame(tick);
    };
    btn.addEventListener('mousemove',  onMove);
    btn.addEventListener('mouseleave', onLeave);
    tick();
    return () => {
      btn.removeEventListener('mousemove',  onMove);
      btn.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleHeroBtnMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--bx', (e.clientX - r.left) + 'px');
    e.currentTarget.style.setProperty('--by', (e.clientY - r.top)  + 'px');
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget, r = btn.getBoundingClientRect();
    const rip = document.createElement('span');
    Object.assign(rip.style, {
      position: 'absolute', width: '6px', height: '6px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
      left: (e.clientX - r.left) + 'px', top: (e.clientY - r.top) + 'px',
      transform: 'translate(-50%,-50%)', animation: 'btn-ripple 0.65s ease-out forwards',
    });
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
  };

  return (
    <>
      <GlobalStyles />
      <div className="rc-mesh-bg" />
      <div style={{ fontFamily: 'system-ui,sans-serif', background: 'transparent', color: '#111', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ── Nav ── */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 32px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
              &lt;/&gt;
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>RefineCode</span>
          </div>
          <Link to="/login" className="rc-hero-btn" onMouseMove={handleHeroBtnMove}>Login →</Link>
        </nav>

        {/* ── Hero ── */}
        <section style={{ position: 'relative', padding: '80px 32px 70px', overflow: 'hidden', minHeight: 520, display: 'flex', alignItems: 'center' }}>
          <HeroCanvas editorRef={editorRef} />
          <div style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 48, width: '100%' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2, margin: '0 0 14px' }}>
                Find bugs,<br />security holes,<br />
                <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  before they ship.
                </span>
              </h1>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, maxWidth: 400, margin: '0 0 24px' }}>
                Paste your code and get a senior-engineer-grade review covering security vulnerabilities, performance issues, and readability — in seconds.
              </p>
              <Link to="/tool" className="rc-hero-btn" onMouseMove={handleHeroBtnMove}>
                Start Reviewing →
              </Link>
            </div>
            {/* Editor replaces globe — ref threaded to HeroCanvas for exclusion zone */}
            <div ref={editorRef}>
              <EditorWidget />
            </div>
          </div>
        </section>

        {/* ── Curve ── */}
        <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0, background: '#f8f7ff' }}>
          <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path d="M0,0 C360,40 1080,40 1440,0 L1440,40 L0,40 Z" fill="#fff" />
          </svg>
        </div>

        {/* ── Stats ── */}
        <section style={{ background: 'rgba(248,247,255,0.9)', padding: '24px 32px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, textAlign: 'center' }}>
            {[{ num: '12+', label: 'Languages supported' }, { num: '<3s', label: 'Average review time' }, { num: '4', label: 'Severity levels' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.num}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Wave ── */}
        <div style={{ width: '100%', overflow: 'hidden', background: '#fff' }}>
          <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,0 L0,0 Z" fill="#f8f7ff" />
          </svg>
        </div>

        {/* ── Features ── */}
        <section style={{ padding: '48px 32px', background: 'rgba(255,255,255,0.9)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>Everything you need in a code review</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, maxWidth: 860, margin: '0 auto' }}>
            <FeatCard icon="🛡️" name="Security Audit"    desc="Detects SQL injection, hardcoded secrets, eval usage, and critical vulnerabilities." />
            <FeatCard icon="⚡"  name="Performance Tips"  desc="Spots inefficient loops, unnecessary computations, and memory issues." />
            <FeatCard icon="👁️" name="Readability Score" desc="Rates code quality out of 10 with an honest, strict scoring system." />
            <FeatCard icon="🌐" name="12+ Languages"      desc="Python, JavaScript, TypeScript, Java, C++, Go, Rust, and more." />
            <FeatCard icon="🔀" name="Diff View"          desc="Side-by-side comparison of original vs improved code with highlights." />
            <FeatCard icon="🕐" name="Review History"     desc="Keeps track of your last 10 reviews to compare progress over time." />
          </div>
        </section>

        {/* ── Glow divider ── */}
        <div style={{ position: 'relative', height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),rgba(139,92,246,0.4),transparent)', margin: '0 32px' }}>
          <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
            width: 60, height: 5, background: 'rgba(99,102,241,0.3)', filter: 'blur(4px)', borderRadius: '50%' }} />
        </div>

        {/* ── CTA ── */}
        <section style={{ position: 'relative', padding: '60px 32px', textAlign: 'center', overflow: 'hidden', background: 'rgba(248,247,255,0.9)' }}>
          <CtaCanvas />
          {/* breathing blobs */}
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', top: '50%', left: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle,rgba(99,102,241,0.18),transparent)', animation: 'blob-breathe 4s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', top: '30%', left: '60%', pointerEvents: 'none',
            background: 'radial-gradient(circle,rgba(139,92,246,0.14),transparent)', animation: 'blob-breathe 6s ease-in-out infinite reverse' }} />
          <div style={{ position: 'relative', zIndex: 5 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ready to write better code?</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Free to use. Sign up in seconds. Just paste and review.</p>
            <button ref={ctaBtnRef} className="rc-cta-btn" onClick={handleCtaClick}>
              Start reviewing your code.
            </button>
          </div>
        </section>

        {/* ── Glow line ── */}
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),rgba(139,92,246,0.5),transparent)' }} />

        {/* ── Footer ── */}
        <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '20px 32px', background: 'rgba(255,255,255,0.92)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Built with React, TanStack Start, and Groq AI</div>
          </div>
        </footer>

      </div>
    </>
  );
}