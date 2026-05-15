// Login page — single password input, stores JWT on success, redirects to home
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate    = useNavigate();
  const cardRef     = useRef(null);
  const canvasRef   = useRef(null);

  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  // ── Particle canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, particles = [], raf;

    function makeParticle(initial) {
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        r: 0.7 + Math.random() * 1.8,
        vy: -0.06 - Math.random() * 0.18,
        vx: (Math.random() - 0.5) * 0.06,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.003 + Math.random() * 0.006,
        swayAmp: 0.15 + Math.random() * 0.35,
        alpha: 0.04 + Math.random() * 0.05,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.014,
      };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(48, Math.max(22, Math.round((w * h) / 28000)));
      particles = Array.from({ length: count }, () => makeParticle(true));
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.sway    += p.swaySpeed;
        p.twinkle += p.twinkleSpeed;
        p.x       += p.vx + Math.sin(p.sway) * p.swayAmp * 0.04;
        p.y       += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > w + 10) { particles[i] = makeParticle(false); continue; }
        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.twinkle));
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,173,181,${a.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.r > 1.8) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(0,173,181,${(a * 0.25).toFixed(3)})`;
          ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(step);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onResize = () => { resize(); if (!reduced) { cancelAnimationFrame(raf); step(); } };
    window.addEventListener('resize', onResize);
    resize();
    if (!reduced) step();

    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, []);

  // ── Shake helper (imperative — matches the original void-reflow trick) ───────
  function triggerShake() {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('pos-shake');
    void card.offsetWidth;
    card.classList.add('pos-shake');
    setTimeout(() => card.classList.remove('pos-shake'), 500);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid password. Try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Keyframes ── */
        @keyframes pos-bgBreath   { 0%,100%{opacity:1} 50%{opacity:.7} }
        @keyframes pos-cardIn     { to{opacity:1;transform:translateY(0)} }
        @keyframes pos-haloBreath { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes pos-shake {
          10%,90%      { transform:translateX(-2px) }
          20%,80%      { transform:translateX(4px) }
          30%,50%,70%  { transform:translateX(-7px) }
          40%,60%      { transform:translateX(7px) }
        }
        @keyframes pos-cornerSize { to{width:14px;height:14px;border-width:1px} }
        @keyframes pos-cornerFade { to{opacity:.6} }
        @keyframes pos-markGlow {
          0%,100% { filter:drop-shadow(0 0 18px rgba(0,173,181,.35)) drop-shadow(0 0 4px rgba(0,173,181,.5)) }
          50%     { filter:drop-shadow(0 0 30px rgba(0,173,181,.6)) drop-shadow(0 0 8px rgba(0,173,181,.75)) }
        }
        @keyframes pos-spin        { from{transform:rotate(45deg)} to{transform:rotate(405deg)} }
        @keyframes pos-twinkle     { 0%,100%{opacity:.85} 50%{opacity:.35} }
        @keyframes pos-blink       { 0%,49.999%{opacity:1} 50%,100%{opacity:0} }
        @keyframes pos-divPulse {
          0%,100%{box-shadow:0 0 0 3px #393E46,0 0 0 4px rgba(0,173,181,.35)}
          50%    {box-shadow:0 0 0 3px #393E46,0 0 0 6px rgba(0,173,181,.15)}
        }
        @keyframes pos-errIn       { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pos-spinner     { to{transform:rotate(360deg)} }

        /* ── Background ── */
        .pos-bg-grid {
          position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:radial-gradient(circle,rgba(238,238,238,.045) 1px,transparent 1px);
          background-size:22px 22px;
          mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,#000 30%,transparent 85%);
          -webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,#000 30%,transparent 85%);
        }
        .pos-bg-glow {
          position:fixed;inset:0;pointer-events:none;z-index:0;
          background:
            radial-gradient(ellipse 50% 35% at 50% 42%,rgba(0,173,181,.10),transparent 70%),
            radial-gradient(ellipse 70% 50% at 50% 100%,rgba(0,173,181,.04),transparent 70%);
          animation:pos-bgBreath 9s ease-in-out infinite;
        }
        .pos-bg-noise {
          position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          opacity:.45;mix-blend-mode:overlay;
        }

        /* ── Card wrapper ── */
        .pos-card-wrap {
          position:relative;width:100%;max-width:420px;z-index:1;
          opacity:0;transform:translateY(14px);
          animation:pos-cardIn 520ms cubic-bezier(.2,.7,.25,1) 80ms forwards;
        }
        .pos-card-wrap::before {
          content:"";position:absolute;inset:-1px;border-radius:17px;padding:1px;
          background:linear-gradient(180deg,rgba(0,173,181,.55) 0%,rgba(0,173,181,.10) 30%,rgba(0,173,181,.04) 70%,rgba(0,173,181,.20) 100%);
          -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
          -webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;
        }
        .pos-card-wrap::after {
          content:"";position:absolute;inset:-40px;border-radius:60px;z-index:-1;pointer-events:none;
          background:radial-gradient(ellipse 60% 50% at 50% 30%,rgba(0,173,181,.18),transparent 70%);
          filter:blur(20px);animation:pos-haloBreath 7s ease-in-out infinite;
        }

        /* ── Card ── */
        .pos-card {
          position:relative;background:#393E46;border-radius:16px;
          padding:38px 36px 30px;overflow:hidden;
          box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 20px 60px -20px rgba(0,0,0,.5),0 8px 24px -12px rgba(0,0,0,.4);
        }
        .pos-card.pos-shake { animation:pos-shake 460ms cubic-bezier(.36,.07,.19,.97); }
        .pos-card.pos-shake .pos-input-wrap {
          border-color:#ef4f5e !important;
          box-shadow:0 0 0 3px rgba(239,79,94,.14) !important;
        }

        /* ── Corner brackets ── */
        .pos-corner {
          position:absolute;width:0;height:0;
          border-color:#00ADB5;border-style:solid;border-width:0;opacity:0;
          animation:pos-cornerSize 420ms cubic-bezier(.2,.7,.25,1) 320ms forwards,
                    pos-cornerFade 420ms ease 320ms forwards;
        }
        .pos-corner.tl{top:10px;left:10px;border-right:0!important;border-bottom:0!important;border-top-left-radius:4px}
        .pos-corner.tr{top:10px;right:10px;border-left:0!important;border-bottom:0!important;border-top-right-radius:4px;animation-delay:380ms,380ms}
        .pos-corner.bl{bottom:10px;left:10px;border-right:0!important;border-top:0!important;border-bottom-left-radius:4px;animation-delay:440ms,440ms}
        .pos-corner.br{bottom:10px;right:10px;border-left:0!important;border-top:0!important;border-bottom-right-radius:4px;animation-delay:500ms,500ms}

        /* ── Top label ── */
        .pos-top-label {
          display:flex;align-items:center;gap:8px;justify-content:center;
          margin-bottom:22px;
          color:rgba(238,238,238,.5);font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;
          font-family:'Geist Mono',ui-monospace,'SF Mono',monospace;
        }
        .pos-top-label::before,.pos-top-label::after {
          content:"";flex:1;max-width:30px;height:1px;
          background:linear-gradient(90deg,transparent,rgba(238,238,238,.14),transparent);
        }

        /* ── Logo mark ── */
        .pos-mark {
          width:76px;height:76px;position:relative;
          animation:pos-markGlow 4.2s ease-in-out infinite;
        }
        .pos-mark::after {
          content:"";position:absolute;inset:-18px;border-radius:50%;z-index:-1;
          background:radial-gradient(circle,rgba(0,173,181,.18),transparent 65%);
          animation:pos-haloBreath 4.2s ease-in-out infinite;
        }
        .pos-mark .pos-frame {
          transform-origin:40px 40px;
          animation:pos-spin 36s linear infinite;
        }
        .pos-mark .pos-node {
          transform-origin:center;
          animation:pos-twinkle 3.6s ease-in-out infinite;
        }
        .pos-mark .pos-node:nth-child(5){animation-delay:.4s}
        .pos-mark .pos-node:nth-child(6){animation-delay:.8s}
        .pos-mark .pos-node:nth-child(7){animation-delay:1.2s}
        .pos-mark .pos-node:nth-child(8){animation-delay:1.6s}
        .pos-mark .pos-node:nth-child(9){animation-delay:2s}

        /* ── Cursor blink ── */
        .pos-cursor {
          display:inline-block;width:8px;height:22px;
          background:#00ADB5;border-radius:1.5px;vertical-align:-2px;
          margin-left:4px;transform:translateY(2px);
          box-shadow:0 0 8px rgba(0,173,181,.6);
          animation:pos-blink 1.1s steps(1,end) infinite;
        }

        /* ── Divider ── */
        .pos-divider {
          position:relative;height:1px;margin:26px -36px 24px;
          background:linear-gradient(90deg,transparent,rgba(238,238,238,.14) 20%,rgba(238,238,238,.14) 80%,transparent);
        }
        .pos-divider::after {
          content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:5px;height:5px;border-radius:50%;background:#00ADB5;
          animation:pos-divPulse 3.4s ease-in-out infinite;
        }

        /* ── Input wrap ── */
        .pos-input-wrap {
          position:relative;display:flex;align-items:center;
          background:#222831;border:1px solid rgba(238,238,238,.14);border-radius:9px;
          transition:border-color 350ms cubic-bezier(.4,0,.2,1),box-shadow 350ms cubic-bezier(.4,0,.2,1);
        }
        .pos-input-wrap:hover { border-color:rgba(238,238,238,.22); }
        .pos-input-wrap:focus-within {
          border-color:#00ADB5;
          box-shadow:0 0 0 3px rgba(0,173,181,.14),0 0 24px -6px rgba(0,173,181,.45);
        }
        .pos-input-wrap:focus-within .pos-lead { color:#00ADB5; }
        .pos-input-wrap input::placeholder { color:rgba(238,238,238,.32);letter-spacing:0; }

        /* ── Toggle button ── */
        .pos-toggle {
          background:transparent;border:0;width:38px;height:38px;margin-right:3px;
          border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;
          color:rgba(238,238,238,.5);transition:color .15s,background .15s,transform .15s;
        }
        .pos-toggle:hover{color:#00ADB5;background:rgba(0,173,181,.06)}
        .pos-toggle:active{transform:scale(.92)}

        /* ── Submit button ── */
        .pos-submit {
          margin-top:22px;display:flex;align-items:center;justify-content:center;gap:10px;
          width:100%;height:44px;background:#00ADB5;color:#222831;
          border:none;border-radius:9px;cursor:pointer;
          font-size:14px;font-weight:600;letter-spacing:.2px;font-family:inherit;
          position:relative;overflow:hidden;
          transition:transform 200ms cubic-bezier(.4,0,.2,1),filter 200ms ease,box-shadow 220ms ease;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -1px 0 rgba(0,0,0,.18),0 6px 16px -6px rgba(0,173,181,.5);
        }
        .pos-submit::before {
          content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);
          transform:translateX(-120%);transition:transform 600ms ease;
        }
        .pos-submit:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px) scale(1.01);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(0,0,0,.22),0 12px 28px -8px rgba(0,173,181,.7);}
        .pos-submit:hover:not(:disabled)::before{transform:translateX(120%)}
        .pos-submit:active:not(:disabled){transform:translateY(0) scale(.99)}
        .pos-submit:disabled{pointer-events:none;opacity:.7}
        .pos-spinner {
          width:18px;height:18px;border-radius:50%;
          border:2px solid rgba(34,40,49,.25);border-top-color:#222831;
          animation:pos-spinner .7s linear infinite;
        }

        /* ── Error ── */
        .pos-err { animation:pos-errIn 220ms ease; }

        @media(max-width:480px){
          .pos-card{padding:32px 26px 26px}
          .pos-divider{margin-left:-26px;margin-right:-26px}
        }
        @media(prefers-reduced-motion:reduce){
          *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
        }
      `}</style>

      {/* ── Page shell ── */}
      <div style={{
        background: '#222831', color: '#EEEEEE', minHeight: '100vh',
        fontFamily: "'Geist',-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
        WebkitFontSmoothing: 'antialiased',
        display: 'grid', placeItems: 'center', padding: 32,
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Background layers */}
        <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
        <div className="pos-bg-grid"  aria-hidden="true" />
        <div className="pos-bg-glow"  aria-hidden="true" />
        <div className="pos-bg-noise" aria-hidden="true" />

        {/* ── Card wrapper ── */}
        <div className="pos-card-wrap">
          <form
            ref={cardRef}
            className="pos-card"
            onSubmit={handleSubmit}
            autoComplete="off"
            noValidate
          >
            {/* Corner brackets */}
            <span className="pos-corner tl" aria-hidden="true" />
            <span className="pos-corner tr" aria-hidden="true" />
            <span className="pos-corner bl" aria-hidden="true" />
            <span className="pos-corner br" aria-hidden="true" />

            {/* Top label */}
            <div className="pos-top-label">authenticate</div>

            {/* Logo mark */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, position: 'relative' }}>
              <div className="pos-mark" role="img" aria-label="Personal OS logo">
                <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="none"
                  stroke="#00ADB5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ display: 'block', width: '100%', height: '100%' }}>
                  <rect className="pos-frame" x="14" y="14" width="52" height="52" rx="10" strokeWidth="1.4" opacity="0.45" />
                  <path d="M40 12 L62 25 L62 55 L40 68 L18 55 L18 25 Z" strokeWidth="1.5" opacity="0.6" />
                  <path d="M30 56 L30 24 L46 24 A12 12 0 0 1 46 48 L30 48" strokeWidth="2.4" strokeLinecap="round" />
                  <circle className="pos-node" cx="40" cy="12" r="2.2" fill="#00ADB5" stroke="none" />
                  <circle className="pos-node" cx="62" cy="25" r="1.8" fill="#00ADB5" stroke="none" />
                  <circle className="pos-node" cx="62" cy="55" r="1.8" fill="#00ADB5" stroke="none" />
                  <circle className="pos-node" cx="40" cy="68" r="2.2" fill="#00ADB5" stroke="none" />
                  <circle className="pos-node" cx="18" cy="55" r="1.8" fill="#00ADB5" stroke="none" />
                  <circle className="pos-node" cx="18" cy="25" r="1.8" fill="#00ADB5" stroke="none" />
                  <circle cx="40" cy="40" r="2.2" fill="#00ADB5" stroke="none" />
                  <circle cx="40" cy="40" r="6" strokeWidth="1" opacity="0.35" />
                </svg>
              </div>
            </div>

            {/* Brand */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                margin: 0, color: '#00ADB5', fontSize: 28, fontWeight: 600,
                letterSpacing: '-0.4px', lineHeight: 1,
                display: 'inline-flex', alignItems: 'baseline', gap: 4,
              }}>
                Personal OS<span className="pos-cursor" aria-hidden="true" />
              </h1>
              <p style={{ textAlign: 'center', color: 'rgba(238,238,238,.5)', fontSize: 12.5, margin: '9px 0 0', letterSpacing: '0.1px' }}>
                Your life &amp; career dashboard
              </p>
            </div>

            {/* Divider */}
            <div className="pos-divider" aria-hidden="true" />

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label htmlFor="pos-pw" style={{ fontSize: 12.5, fontWeight: 500, color: '#EEEEEE', letterSpacing: '0.1px' }}>
                  Password
                </label>
                <span style={{ fontSize: 10.5, color: 'rgba(238,238,238,.5)', letterSpacing: '0.4px', textTransform: 'uppercase', fontFamily: "'Geist Mono',ui-monospace,'SF Mono',monospace" }}>
                  private · single user
                </span>
              </div>

              <div className="pos-input-wrap">
                {/* Lock icon */}
                <span className="pos-lead" aria-hidden="true" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 38, height: 42, flexShrink: 0,
                  color: 'rgba(238,238,238,.5)', transition: 'color 250ms ease',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/>
                    <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                    <circle cx="12" cy="16" r="1.2" fill="currentColor"/>
                  </svg>
                </span>

                <input
                  id="pos-pw"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your passphrase"
                  autoFocus
                  required
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#EEEEEE', flex: 1, height: 42, padding: '0 2px',
                    fontFamily: 'inherit', fontSize: 14, letterSpacing: '0.15em',
                  }}
                />

                {/* Eye toggle */}
                <button
                  type="button"
                  className="pos-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18"/>
                      <path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.2 3.9"/>
                      <path d="M6.6 6.6A17.7 17.7 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.3-1"/>
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="pos-err" style={{
                  color: '#ef4f5e', fontSize: 11.5, marginTop: 8, letterSpacing: '0.2px',
                  fontFamily: "'Geist Mono',ui-monospace,'SF Mono',monospace",
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="pos-submit" disabled={loading || !password}>
              {loading ? (
                <span className="pos-spinner" aria-hidden="true" />
              ) : (
                <>
                  <span>Sign in</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="m13 6 6 6-6 6"/>
                  </svg>
                  <span style={{
                    marginLeft: 4, fontSize: 10.5, fontWeight: 600,
                    background: 'rgba(34,40,49,.18)', color: 'rgba(34,40,49,.85)',
                    padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(34,40,49,.22)',
                    fontFamily: "'Geist Mono',ui-monospace,'SF Mono',monospace",
                  }}>↵</span>
                </>
              )}
            </button>

            {/* Footer */}
            <div style={{ marginTop: 18, textAlign: 'center', color: 'rgba(238,238,238,.5)', fontSize: 11, letterSpacing: '0.4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00ADB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                  <rect x="4" y="11" width="16" height="10" rx="2"/>
                  <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                </svg>
                Personal access only — single account
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
