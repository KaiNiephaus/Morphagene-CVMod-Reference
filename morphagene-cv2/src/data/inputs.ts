import type { CVInput, InputId } from "../types"

// ── CV Input definitions ─────────────────────────────────────────────────────
// Each entry describes one continuous CV input on the Morphagene.

export const INPUTS: CVInput[] = [
  {
    id: "varispeed",
    label: "VARI-SPEED",
    short: "VS",
    min: -4, max: 4, defaultCv: 0,
    firmware: [
      { key: "vsop", label: "PITCH MODE", options: ["Standard", "1V/Oct Bidir", "1V/Oct Fwd"] }
    ],
    meta: ["±4 V bipolar", "Bipolar attenuverter", "Noon = stopped"],
    description: "Controls playback pitch and direction. Bipolar — negative voltages play in reverse. Non-linear scaling gives extra resolution near zero for tape-flutter effects.",
  },
  {
    id: "genesize",
    label: "GENE SIZE",
    short: "GS",
    min: 0, max: 8, defaultCv: 0,
    firmware: [
      { key: "gnsm", label: "GRAIN WINDOW", options: ["Hard Cuts", "Liquid Smooth"] }
    ],
    meta: ["0–8 V unipolar", "Bipolar attenuverter", "0V = full splice"],
    description: "Sets the playback window size within a Splice. At 0V the Gene equals the full Splice (normal looping). Higher voltages shrink the window into granular territory.",
  },
  {
    id: "slide",
    label: "SLIDE",
    short: "SL",
    min: 0, max: 8, defaultCv: 0,
    firmware: [],
    meta: ["0–8 V unipolar", "Bipolar attenuverter", "0V = splice start"],
    description: "Offsets where within the Splice the Gene begins playing. Changes are immediate — use smooth CV sources to avoid clicks. A 0→8V ramp scrubs through audio chronologically.",
  },
  {
    id: "morph",
    label: "MORPH",
    short: "MO",
    min: 0, max: 5, defaultCv: 0,
    firmware: [
      { key: "ckop", label: "CLK MODE", options: ["Auto", "Force Gene Shift", "Force Time Stretch"] }
    ],
    meta: ["0–5 V unipolar", "No attenuverter (unity)", "0V = gap/silence"],
    description: "Controls grain density and overlap. Five stages from silent gap to four simultaneous pitched layers. With CLK patched: Gene Shift below ~10:00, Time Stretch above ~10:00.",
  },
  {
    id: "organize",
    label: "ORGANIZE",
    short: "OR",
    min: 0, max: 5, defaultCv: 0,
    firmware: [
      { key: "omod", label: "SELECT TIMING", options: ["Wait for Gene", "Immediate"] }
    ],
    meta: ["0–5 V unipolar", "No attenuverter (unity)", "0V = splice 1"],
    description: "Selects which Splice plays. Selection is stepped and quantised — no gradual crossfade. Community reports sometimes needing up to 8V to reach final splices in large banks.",
  },
  {
    id: "sos",
    label: "SOS",
    short: "SS",
    min: 0, max: 8, defaultCv: 8,
    firmware: [
      { key: "inop", label: "RECORD MODE", options: ["Normal", "Capture Raw Input"] }
    ],
    meta: ["0–8 V unipolar", "Combo-pot (attenuates CV)", "Norm +8V (full buffer)"],
    description: "Crossfades between live input and buffer playback. Normalised to +8V — no patch means full buffer feedback (frozen loop). The core of the Morphagene tape-delay personality.",
  },
]

// Quick lookup by id
export const INPUT_MAP: Record<InputId, CVInput> =
  Object.fromEntries(INPUTS.map(i => [i.id, i])) as Record<InputId, CVInput>
