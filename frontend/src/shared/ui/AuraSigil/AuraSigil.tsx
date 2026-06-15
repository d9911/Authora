'use client';

/**
 * The Authora signature: concentric "aura" rings around a core identity dot.
 * Pure SVG + CSS so it renders in the sandboxed preview (no external assets).
 * Motion is a slow, single orchestrated pulse; disabled under reduced-motion.
 */
export function AuraSigil({ size = 220 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} role="presentation">
        <defs>
          <radialGradient id="aura-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9F8CFF" />
            <stop offset="100%" stopColor="#5B4BFF" />
          </radialGradient>
        </defs>
        {[88, 68, 48].map((r, i) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#5B4BFF"
            strokeOpacity={0.14 + i * 0.12}
            strokeWidth={1.25}
            className={`aura-ring aura-ring-${i}`}
          />
        ))}
        <circle cx="100" cy="100" r="22" fill="url(#aura-core)" className="aura-core" />
        {/* orbiting credential node */}
        <circle cx="100" cy="12" r="4" fill="#9F8CFF" className="aura-node" />
      </svg>
      <style>{`
        .aura-core { transform-origin: 100px 100px; animation: aura-breathe 4.5s ease-in-out infinite; }
        .aura-ring { transform-origin: 100px 100px; }
        .aura-ring-0 { animation: aura-breathe 4.5s ease-in-out infinite; }
        .aura-ring-1 { animation: aura-breathe 4.5s ease-in-out 0.4s infinite; }
        .aura-ring-2 { animation: aura-breathe 4.5s ease-in-out 0.8s infinite; }
        .aura-node { transform-origin: 100px 100px; animation: aura-orbit 9s linear infinite; }
        @keyframes aura-breathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes aura-orbit { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .aura-core, .aura-ring, .aura-node { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
