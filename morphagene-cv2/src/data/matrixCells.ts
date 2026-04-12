// ── Interaction Matrix ───────────────────────────────────────────────────────
// Keys are sorted pairs of input IDs joined by '-'.
// level: 1 = subtle, 2 = productive, 3 = high synergy

export interface MatrixCell {
  level: 1 | 2 | 3
  title: string
  desc:  string
}

export const MATRIX_CELLS: Record<string, MatrixCell> = {
  "varispeed-genesize": {
    level: 3, title: "Time Stretch",
    desc: "Hold GS constant while sweeping VS: grain pitch changes but duration stays fixed, decoupling pitch from time. The foundational Morphagene time-stretch patch.",
  },
  "varispeed-slide": {
    level: 2, title: "Pitch Scrub",
    desc: "Slow ramp into SLIDE while VS sets pitch: scan through audio at a fixed pitch. Works like a melodic tape-delay.",
  },
  "varispeed-morph": {
    level: 2, title: "Pitched Clouds",
    desc: "High MORPH density + VS modulation: pitched grain clouds. Random VS = atonal scatter; step-sequenced VS = harmonic stacking.",
  },
  "varispeed-organize": {
    level: 1, title: "Melodic Sampler",
    desc: "CV into OR selects splice; 1V/Oct into VS pitches it: full melodic sample instrument. Requires vsop firmware option.",
  },
  "varispeed-sos": {
    level: 1, title: "Pitch Delay",
    desc: "Vary VS while SOS sets feedback depth: pitch-shifted delay loop. Extremes produce reverse pitch-shifted feedback spirals.",
  },
  "genesize-morph": {
    level: 3, title: "Cloud Density",
    desc: "Control grain size AND overlap simultaneously: small GS + high MORPH = dense microsound clouds. Envelope both for percussive granular swells.",
  },
  "genesize-slide": {
    level: 3, title: "Window Scan",
    desc: "SLIDE sets where in the splice to start; GS sets how much to hear. Narrow window + SLIDE sweep = granular microscopy of the audio.",
  },
  "genesize-organize": {
    level: 2, title: "Cross-Splice Grains",
    desc: "Step OR while GS is small: each step fires tiny grains from different audio regions — voltage-controlled sample collage.",
  },
  "genesize-sos": {
    level: 1, title: "Granular Feedback",
    desc: "Small GS + high SOS: grains loop with feedback, building a granular reverb-like sustained texture from any input.",
  },
  "slide-morph": {
    level: 2, title: "Position + Density",
    desc: "Sweep SLIDE while MORPH is high: the grain cloud scrubs through audio. LFO into SLIDE with static high MORPH = drifting ambient texture.",
  },
  "slide-organize": {
    level: 2, title: "Splice + Offset",
    desc: "OR selects the splice; SLIDE offsets within it. Sequencer for OR + envelope for SLIDE = pitched-start sample playback.",
  },
  "slide-sos": {
    level: 3, title: "Scanning Delay",
    desc: "SOS sets feedback depth; SLIDE modulates loop playhead. Varying SLIDE mid-loop creates pitch-shifted echoes and time-domain modulation.",
  },
  "morph-organize": {
    level: 2, title: "Splice Cloud Scan",
    desc: "Slow LFO into OR while MORPH is high: cycles through splices as a granular blur rather than hard cuts. Good for ambient transitions.",
  },
  "morph-sos": {
    level: 2, title: "Feedback Density",
    desc: "High SOS (deep feedback) + increasing MORPH: the looping buffer grows denser with each pass. Builds layered granular drones over time.",
  },
}
