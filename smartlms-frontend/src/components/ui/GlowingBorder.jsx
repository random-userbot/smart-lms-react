/**
 * Premium glowing border card wrapper inspired by 21st.dev.
 */
export function GlowCard({ children, className = '', glowColor = 'accent' }) {
  const colorMap = {
    accent: 'from-accent/20 via-violet-500/20 to-accent/20',
    success: 'from-success/20 via-emerald-400/20 to-success/20',
    warning: 'from-warning/20 via-amber-400/20 to-warning/20',
    danger: 'from-danger/20 via-rose-400/20 to-danger/20',
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Animated glow border */}
      <div className={`absolute -inset-[1px] bg-gradient-to-r ${colorMap[glowColor]} rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
      <div className="relative bg-surface rounded-[inherit] border border-border group-hover:border-transparent transition-colors duration-500">
        {children}
      </div>
    </div>
  );
}

/**
 * Animated text gradient with shimmer effect.
 */
export function ShimmerText({ children, className = '' }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-violet-400 to-accent bg-[length:200%_100%]"
        style={{ animation: 'shimmerText 3s linear infinite' }}>
        {children}
      </span>
    </span>
  );
}
