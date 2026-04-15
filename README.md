# Morphagene CV Modulation Reference V3.1

An interactive reference tool for the **Make Noise Morphagene** eurorack module.  
Explore how CV voltages and modulation sources affect the module's core functions — visually and through audio.

**→ [Open the app](https://morphagene-cv-reference.vercel.app/)**

---
## Overview

<img width="1130" height="880" alt="Vari-Speed Overview" src="https://github.com/user-attachments/assets/9877f62b-4c52-4f9a-ad31-2989f6d988f3" />
<img width="1158" height="836" alt="Morph Overview" src="https://github.com/user-attachments/assets/e2e19957-fae8-4358-a049-e3717faee5a9" />
<img width="1158" height="842" alt="Organize Overview" src="https://github.com/user-attachments/assets/e82db944-477f-4a2b-808b-5bfbcd557129" />


---

## What it does

The Morphagene has six CV inputs that shape how it plays, slices, and transforms audio. Understanding exactly what a given voltage *does* — and how that changes when you modulate it — can save a lot of guesswork at the patch bay.

This tool lets you:

- **Explore each CV input** with interactive charts showing the full response curve
- **Apply modulation** — LFO, Envelope, or Sample & Hold — and watch the effect animate in real time
- **Hear the result** directly in the browser via a synthesised audio preview that tracks the current CV value
- **Compare firmware settings** that change how each input behaves
- **Browse patch interactions** in a cross-input matrix highlighting productive and high-synergy combinations

---

## The six CV inputs

| Input | Range | What it controls |
|---|---|---|
| **Vari-Speed** | ±4V | Playback pitch and direction. Negative voltage = reverse. |
| **Gene Size** | 0–8V | The playback window within a splice — from full loop down to granular grain sizes. |
| **Slide** | 0–8V | Where within a splice playback begins. Sweep it to scrub through audio. |
| **Morph** | 0–5V | Grain density and overlap — from silent gap to four simultaneous pitched layers. |
| **Organize** | 0–5V | Selects which splice plays. Stepped and quantised. |
| **SOS** | 0–8V | Crossfade between live input and buffer playback. Normalised to +8V (frozen loop). |

---

## Modulation sources

Each input can be driven by one of four modulation sources:

- **Static** — set a fixed CV value and read off the exact effect
- **LFO** — sine, triangle, sawtooth, or ramp wave with adjustable rate and amplitude
- **Envelope** — cycling AD envelope with attack (up to 20s) and decay (up to 60s)
- **Sample & Hold** — random stepped values at a chosen clock rate

Press **Play** to animate the modulation live. The CV Over Time chart, stat readouts, and audio preview all update in real time.

---
## Mobile Version -> Coming Soon


## About the Morphagene

The [Make Noise Morphagene](https://www.makenoisemusic.com/modules/morphagene) is a stereo eurorack module for splice-based granular playback and real-time tape manipulation. It records, slices, and plays back audio using a vocabulary of Reels, Splices, and Genes — all CV-controllable.

---

Built with React, TypeScript, Vite, Recharts, and the Web Audio API.
