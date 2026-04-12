// ── Firmware option descriptions ─────────────────────────────────────────────
// Indexed by firmware key, then by option index (matching INPUTS firmware arrays)

export const FW_NOTES: Record<string, string[]> = {
  vsop: [
    "Default asymmetric range (+12/−26st). Non-linear, tape-flutter optimised. The curve above changes shape when you switch modes.",
    "1V/Oct bidirectional. ~2 octaves of reliable tracking range. Requires precise attenuverter calibration.",
    "1V/Oct forward only. Best pitch accuracy in lower octaves. No reverse via CV.",
  ],
  gnsm: [
    "Hard gate on grain boundaries. Possible clicks at very small grain sizes.",
    "Crossfaded grain boundaries. Smoother granular texture. Reflected in the grain overlap visualiser on the MORPH panel.",
  ],
  ckop: [
    "MORPH < ~10:00 → Gene Shift mode. MORPH > ~10:00 → Time Stretch mode.",
    "Always Gene Shift regardless of MORPH position.",
    "Always Time Stretch regardless of MORPH position.",
  ],
  omod: [
    "New splice waits for current gene to finish. Smooth but with latency.",
    "Immediate splice switch on CV change. Good for rhythmic triggering. May cause audible clicks.",
  ],
  inop: [
    "Normal: SOS crossfades live input and buffer when recording.",
    "Record raw input regardless of SOS level. Use as send/return FX processor.",
  ],
}
