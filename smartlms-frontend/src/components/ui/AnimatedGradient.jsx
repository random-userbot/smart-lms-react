import { useEffect, useRef } from 'react';

/**
 * WebGL-inspired animated gradient mesh background.
 * Uses CSS animations for performance — creates a rich, 
 * multi-layered organic gradient effect like 21st.dev hero sections.
 */
export function AnimatedGradient({ className = '', intensity = 'medium' }) {
  const opacityMap = { low: 'opacity-30', medium: 'opacity-50', high: 'opacity-70' };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {/* Primary orb */}
      <div className={`absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full ${opacityMap[intensity]}`}
        style={{
          background: 'radial-gradient(circle, hsla(250, 80%, 60%, 0.4) 0%, transparent 70%)',
          animation: 'orbFloat1 20s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />
      {/* Secondary orb */}
      <div className={`absolute -bottom-1/4 -right-1/4 w-[70%] h-[70%] rounded-full ${opacityMap[intensity]}`}
        style={{
          background: 'radial-gradient(circle, hsla(280, 70%, 50%, 0.35) 0%, transparent 70%)',
          animation: 'orbFloat2 25s ease-in-out infinite',
          filter: 'blur(100px)',
        }}
      />
      {/* Accent orb */}
      <div className={`absolute top-1/3 right-1/4 w-[50%] h-[50%] rounded-full ${opacityMap[intensity]}`}
        style={{
          background: 'radial-gradient(circle, hsla(220, 80%, 60%, 0.3) 0%, transparent 70%)',
          animation: 'orbFloat3 18s ease-in-out infinite',
          filter: 'blur(60px)',
        }}
      />
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}

/**
 * Grid dot pattern overlay for depth.
 */
export function GridPattern({ className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true"
      style={{
        backgroundImage: `radial-gradient(circle, var(--color-border) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        opacity: 0.4,
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
      }}
    />
  );
}
