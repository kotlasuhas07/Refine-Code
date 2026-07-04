import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    window.addEventListener("resize", resize);

    function drawCornerWaves(cx: number, cy: number, flip: boolean) {
      const count = 6;

      for (let i = 0; i < count; i++) {
        const spread = 120 + i * 38;
        const alpha = 0.55 - i * 0.07;
        const phase = t * 0.018 + i * 0.7;

        ctx.beginPath();

        const pts = 120;

        for (let j = 0; j <= pts; j++) {
          const progress = j / pts;

          const angle = flip
            ? Math.PI + progress * (Math.PI / 2)
            : progress * (Math.PI / 2);

          const wave =
            Math.sin(progress * Math.PI * 3 + phase) * (10 + i * 4) +
            Math.sin(progress * Math.PI * 5 + phase * 1.3) * (5 + i * 2);

          const r = spread + wave;

          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        const grad = ctx.createLinearGradient(
          cx,
          cy,
          cx + (flip ? -1 : 1) * spread,
          cy + (flip ? -1 : 1) * spread
        );

        grad.addColorStop(0, `rgba(99,102,241,${alpha})`);
        grad.addColorStop(1, `rgba(139,92,246,${alpha * 0.4})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawCornerWaves(0, 0, false);

      drawCornerWaves(canvas.width, canvas.height, true);

      t++;

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setError("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate({ to: "/tool" });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/tool`,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9ff",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Waves */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "32px",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Code2
            style={{
              width: "18px",
              height: "18px",
              color: "#fff",
            }}
          />
        </div>

        <span
          style={{
            fontWeight: 700,
            fontSize: "18px",
            color: "#111",
          }}
        >
          RefineCode
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "32px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 5,
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "4px",
            color: "#111",
          }}
        >
          {isSignUp ? "Create an account" : "Welcome back"}
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            marginBottom: "24px",
          }}
        >
          {isSignUp
            ? "Sign up to start reviewing code"
            : "Log in to your account"}
        </p>

        {/* Google Login */}
        <button
          onClick={handleGoogle}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "16px",
            color: "#111",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>

          Continue with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />

          <span
            style={{
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            or
          </span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#e5e7eb",
            }}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: "12px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#111",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
              outline: "none",
              background: "#fff",
              color: "#111",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#111",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
              outline: "none",
              background: "#fff",
              color: "#111",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: error.includes("Check your email")
                ? "#f0fdf4"
                : "#fef2f2",
              color: error.includes("Check your email")
                ? "#166534"
                : "#991b1b",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: "#6366f1",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading || !email || !password ? 0.7 : 1,
          }}
        >
          {loading
            ? "Please wait..."
            : isSignUp
            ? "Create account"
            : "Log in"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
            marginTop: "16px",
          }}
        >
          {isSignUp
            ? "Already have an account? "
            : "Don't have an account? "}

          <span
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            style={{
              color: "#6366f1",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {isSignUp ? "Log in" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  );
}