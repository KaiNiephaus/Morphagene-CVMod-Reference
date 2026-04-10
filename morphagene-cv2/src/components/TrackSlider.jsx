// ── TrackSlider ──────────────────────────────────────────────────────────────
// Styled range input: visible filled track + glowing thumb dot.
// The native <input> is invisible and overlaid for interaction.

export function TrackSlider({ value, min, max, step, onChange, color, T, disabled }) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center", userSelect: "none" }}>
      {/* Track background */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 5, borderRadius: 3,
        background: T.track, pointerEvents: "none",
      }}>
        {/* Filled portion */}
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: disabled ? T.muted : color,
          opacity: disabled ? 0.3 : 0.88,
          transition: "width 0.04s linear",
        }} />
      </div>

      {/* Thumb dot */}
      <div style={{
        position: "absolute",
        left: `calc(${pct}% - 9px)`,
        width: 18, height: 18, borderRadius: "50%",
        background: disabled ? T.muted : color,
        border: `2.5px solid ${T.surface}`,
        boxShadow: `0 0 0 1px ${disabled ? T.muted : color}55, 0 2px 8px rgba(0,0,0,0.35)`,
        pointerEvents: "none",
        transition: "left 0.04s linear",
      }} />

      {/* Native input — invisible, handles all interaction */}
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={!!disabled}
        onChange={e => onChange(+e.target.value)}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0, cursor: disabled ? "default" : "pointer", zIndex: 2, margin: 0,
        }}
      />
    </div>
  )
}
