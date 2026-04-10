import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, ReferenceDot,
} from "recharts";

// ── Theme ────────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0a0a14", surface: "#14141e", surface2: "#1e1e2c",
  border: "#2e2e44", border2: "#3e3e5a",
  text: "#e4e4f0", muted: "#9090b8", dim: "#1a1a28",
  panel: "#0e0e1a", label: "#7070a0",
  track: "#232338", tooltip: "#14141e",
};
const LIGHT = {
  bg: "#eceaf4", surface: "#ffffff", surface2: "#f0eef8",
  border: "#c4c0dc", border2: "#a8a4c8",
  text: "#0c0a20", muted: "#5a5878", dim: "#dedce8",
  panel: "#f6f4ff", label: "#7070a0",
  track: "#d8d4ec", tooltip: "#ffffff",
};

// Per-theme accent colours – dark uses vivid, light uses darker saturated versions
const DARK_COLORS  = { varispeed:"#00e5ff", genesize:"#ff9800", slide:"#55dd33", morph:"#dd44ff", organize:"#ffe033", sos:"#ff3f7f" };
const LIGHT_COLORS = { varispeed:"#006e8a", genesize:"#b85800", slide:"#206e20", morph:"#7700bb", organize:"#847000", sos:"#c40040" };

// ── Input definitions ────────────────────────────────────────────────────────
const INPUTS = [
  { id:"varispeed", label:"VARI-SPEED", short:"VS", min:-4, max:4,  defaultCv:0,
    firmware:[{ key:"vsop", label:"PITCH MODE", options:["Standard","1V/Oct Bidir","1V/Oct Fwd"] }],
    meta:["±4 V bipolar","Bipolar attenuverter","Noon = stopped"] },
  { id:"genesize",  label:"GENE SIZE",  short:"GS", min:0,  max:8,  defaultCv:0,
    firmware:[{ key:"gnsm", label:"GRAIN WINDOW", options:["Hard Cuts","Liquid Smooth"] }],
    meta:["0–8 V unipolar","Bipolar attenuverter","0V = full splice"] },
  { id:"slide",     label:"SLIDE",      short:"SL", min:0,  max:8,  defaultCv:0,
    firmware:[],
    meta:["0–8 V unipolar","Bipolar attenuverter","0V = splice start"] },
  { id:"morph",     label:"MORPH",      short:"MO", min:0,  max:5,  defaultCv:0,
    firmware:[{ key:"ckop", label:"CLK MODE", options:["Auto","Force Gene Shift","Force Time Stretch"] }],
    meta:["0–5 V unipolar","No attenuverter (unity)","0V = gap/silence"] },
  { id:"organize",  label:"ORGANIZE",   short:"OR", min:0,  max:5,  defaultCv:0,
    firmware:[{ key:"omod", label:"SELECT TIMING", options:["Wait for Gene","Immediate"] }],
    meta:["0–5 V unipolar","No attenuverter (unity)","0V = splice 1"] },
  { id:"sos",       label:"SOS",        short:"SS", min:0,  max:8,  defaultCv:8,
    firmware:[{ key:"inop", label:"RECORD MODE", options:["Normal","Capture Raw Input"] }],
    meta:["0–8 V unipolar","Combo-pot (attenuates CV)","Norm +8V (full buffer)"] },
];
const INPUT_MAP = Object.fromEntries(INPUTS.map(i => [i.id, i]));

// ── Interaction matrix data ──────────────────────────────────────────────────
const MATRIX_CELLS = {
  "varispeed-genesize":{ level:3, title:"Time Stretch",      desc:"Hold GS constant while sweeping VS: grain pitch changes but duration stays fixed, decoupling pitch from time. The foundational Morphagene time-stretch patch." },
  "varispeed-slide":   { level:2, title:"Pitch Scrub",       desc:"Slow ramp into SLIDE while VS sets pitch: scan through audio at a fixed pitch. Works like a melodic tape-delay." },
  "varispeed-morph":   { level:2, title:"Pitched Clouds",    desc:"High MORPH density + VS modulation: pitched grain clouds. Random VS = atonal scatter; step-sequenced VS = harmonic stacking." },
  "varispeed-organize":{ level:1, title:"Melodic Sampler",   desc:"CV into OR selects splice; 1V/Oct into VS pitches it: full melodic sample instrument. Requires vsop firmware option." },
  "varispeed-sos":     { level:1, title:"Pitch Delay",       desc:"Vary VS while SOS sets feedback depth: pitch-shifted delay loop. Extremes produce reverse pitch-shifted feedback spirals." },
  "genesize-morph":    { level:3, title:"Cloud Density",     desc:"Control grain size AND overlap simultaneously: small GS + high MORPH = dense microsound clouds. Envelope both for percussive granular swells." },
  "genesize-slide":    { level:3, title:"Window Scan",       desc:"SLIDE sets where in the splice to start; GS sets how much to hear. Narrow window + SLIDE sweep = granular microscopy of the audio." },
  "genesize-organize": { level:2, title:"Cross-Splice Grains",desc:"Step OR while GS is small: each step fires tiny grains from different audio regions — voltage-controlled sample collage." },
  "genesize-sos":      { level:1, title:"Granular Feedback", desc:"Small GS + high SOS: grains loop with feedback, building a granular reverb-like sustained texture from any input." },
  "slide-morph":       { level:2, title:"Position + Density",desc:"Sweep SLIDE while MORPH is high: the grain cloud scrubs through audio. LFO into SLIDE with static high MORPH = drifting ambient texture." },
  "slide-organize":    { level:2, title:"Splice + Offset",   desc:"OR selects the splice; SLIDE offsets within it. Sequencer for OR + envelope for SLIDE = pitched-start sample playback." },
  "slide-sos":         { level:3, title:"Scanning Delay",    desc:"SOS sets feedback depth; SLIDE modulates loop playhead. Varying SLIDE mid-loop creates pitch-shifted echoes and time-domain modulation." },
  "morph-organize":    { level:2, title:"Splice Cloud Scan", desc:"Slow LFO into OR while MORPH is high: cycles through splices as a granular blur rather than hard cuts. Good for ambient transitions." },
  "morph-sos":         { level:2, title:"Feedback Density",  desc:"High SOS (deep feedback) + increasing MORPH: the looping buffer grows denser with each pass. Builds layered granular drones over time." },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const snap1 = v => Math.round(v * 10) / 10;

function getVSMetrics(cv, vsop) {
  const st = vsop === 1 ? cv * 12 : vsop === 2 ? Math.max(0, cv) * 12 : cv >= 0 ? cv * 3 : cv * 6.5;
  return { speed: +Math.pow(2, st / 12).toFixed(5), semitones: +st.toFixed(2) };
}
function getMorphStage(cv) {
  const v = clamp(cv, 0, 5);
  return v < 0.8 ? 0 : v < 1.5 ? 1 : v < 2.8 ? 2 : v < 4 ? 3 : 4;
}

// ── Curve data builders ───────────────────────────────────────────────────────
function vsPoints(vsop = 0) {
  return Array.from({ length: 81 }, (_, i) => {
    const v = -4 + i * 0.1;
    const st = vsop === 1 ? v * 12 : vsop === 2 ? Math.max(0, v) * 12 : v >= 0 ? v * 3 : v * 6.5;
    return { v: +v.toFixed(2), speed: +Math.pow(2, st / 12).toFixed(5), st: +st.toFixed(2) };
  });
}
const gsPoints  = () => Array.from({length:81},(_,i)=>{ const v=i*0.1; return {v:+v.toFixed(1),grainPct:+((1-v/8)*100).toFixed(2)}; });
const slPoints  = () => Array.from({length:81},(_,i)=>{ const v=i*0.1; return {v:+v.toFixed(1),pos:+(v/8*100).toFixed(2)}; });
const moPoints  = () => Array.from({length:51},(_,i)=>{ const v=i*0.1; const d=v<0.8?0.2:v<1.5?1:v<2.8?2:v<4?3:4; return {v:+v.toFixed(1),density:d}; });
const orPoints  = n => Array.from({length:n},(_,i)=>({splice:i+1,threshold:+((i/n)*5).toFixed(3)}));
const sosPoints = () => Array.from({length:81},(_,i)=>{ const v=i*0.1; return {v:+v.toFixed(1),live:+(1-v/8).toFixed(4),buf:+(v/8).toFixed(4)}; });

// ── Modulation engine ─────────────────────────────────────────────────────────
const DEFAULT_MOD = { type:"static", staticVal:0, shape:"sine", rate:0.3, amplitude:0.85, attackTime:0.15, decayTime:0.4 };

function computeModCV(src, t, inp) {
  const { min, max } = inp;
  const range  = max - min;
  const center = min < 0 ? 0 : min + range * 0.5;
  if (src.type === "static") return clamp(src.staticVal, min, max);
  if (src.type === "lfo") {
    const raw = src.shape === "sine" ? Math.sin(t * src.rate * Math.PI * 2)
      : src.shape === "tri"  ? 1 - 4 * Math.abs(((t * src.rate + 0.25) % 1) - 0.5)
      : src.shape === "saw"  ? 2 * ((t * src.rate % 1)) - 1
      :                        1 - 2 * ((t * src.rate % 1));
    return clamp(center + raw * (range * 0.5) * src.amplitude, min, max);
  }
  if (src.type === "envelope") {
    const period = 1 / Math.max(0.05, src.rate);
    const phase  = (t % period) / period;
    const env    = phase < src.attackTime ? phase / src.attackTime
                 : phase < src.attackTime + src.decayTime ? 1 - (phase - src.attackTime) / src.decayTime : 0;
    return clamp(min + env * range * src.amplitude, min, max);
  }
  if (src.type === "sh") {
    const step = Math.floor(t * src.rate);
    const hash = (((step * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    return clamp(min + hash * range * src.amplitude, min, max);
  }
  return center;
}

function buildTimeDomain(src, inp, seconds = 5, res = 200) {
  return Array.from({ length: res }, (_, i) => {
    const t = (i / res) * seconds;
    return { t: +t.toFixed(3), cv: +computeModCV(src, t, inp).toFixed(4) };
  });
}

// ── Custom slider (styled track + thumb + invisible native input) ─────────────
function TrackSlider({ value, min, max, step, onChange, color, T, disabled }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position:"relative", height:28, display:"flex", alignItems:"center", userSelect:"none" }}>
      <div style={{ position:"absolute", left:0, right:0, height:5, borderRadius:3,
        background:T.track, pointerEvents:"none" }}>
        <div style={{ width:`${pct}%`, height:"100%", borderRadius:3,
          background: disabled ? T.muted : color, opacity: disabled ? 0.3 : 0.88,
          transition:"width 0.04s linear" }} />
      </div>
      <div style={{ position:"absolute", left:`calc(${pct}% - 9px)`, width:18, height:18,
        borderRadius:"50%", background: disabled ? T.muted : color,
        border:`2.5px solid ${T.surface}`,
        boxShadow:`0 0 0 1px ${disabled?T.muted:color}55, 0 2px 8px rgba(0,0,0,0.35)`,
        pointerEvents:"none", transition:"left 0.04s linear" }} />
      <input type="range" min={min} max={max} step={step} value={value} disabled={!!disabled}
        onChange={e => onChange(+e.target.value)}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          opacity:0, cursor: disabled ? "default" : "pointer", zIndex:2, margin:0 }} />
    </div>
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const MF = "'DM Mono','Fira Code',monospace";

function Pill({ children, color }) {
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:2,
    background:color+"1a", border:`1px solid ${color}44`,
    fontFamily:MF, fontSize:11, color, letterSpacing:"0.05em" }}>{children}</span>;
}

function Label({ children, T, style }) {
  return <div style={{ fontFamily:MF, fontSize:11, color:T.label,
    textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6, ...style }}>{children}</div>;
}

function StatBlock({ items, T }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(items.length,4)},1fr)`,
      gap:6, marginBottom:14 }}>
      {items.map((it,i) => (
        <div key={i} style={{ background:T.surface2, border:`1px solid ${T.border}`,
          padding:"8px 10px", borderRadius:3 }}>
          <div style={{ fontFamily:MF, fontSize:10, color:T.muted, marginBottom:4 }}>{it.label}</div>
          <div style={{ fontFamily:MF, fontSize:13, color:it.hi||T.text, fontWeight:500 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function ChartTitle({ children, T, mt }) {
  return <div style={{ fontFamily:MF, fontSize:10, color:T.muted,
    textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, marginTop:mt ?? 14 }}>{children}</div>;
}

function Note({ children, T }) {
  return <div style={{ margin:"14px 0 0", padding:"10px 13px", background:T.surface2,
    borderLeft:`2px solid ${T.border2}`, fontFamily:MF, fontSize:12, color:T.muted, lineHeight:1.7 }}>{children}</div>;
}

function Mono({ children, T }) {
  return <code style={{ background:T.dim, padding:"1px 5px", borderRadius:2,
    fontFamily:MF, fontSize:11, color:T.text, border:`1px solid ${T.border}` }}>{children}</code>;
}

function makeTooltip(T) {
  return ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:T.tooltip, border:`1px solid ${T.border2}`,
        padding:"8px 12px", fontFamily:MF, fontSize:11, color:T.text,
        boxShadow:"0 4px 16px rgba(0,0,0,0.25)" }}>
        <div style={{ color:T.muted, marginBottom:4 }}>CV {label}V</div>
        {payload.map((p,i) => (
          <div key={i} style={{ color:p.color||T.text }}>
            {p.name}: {typeof p.value==="number" ? p.value.toFixed(3) : p.value}
          </div>
        ))}
      </div>
    );
  };
}

// ── Grain overlap visualiser ──────────────────────────────────────────────────
const MORPH_STAGES = [
  { label:"Gap / Silence",         col:"#546e7a", grains:[] },
  { label:"Seamless Loop",         col:"#26c6da", grains:[{l:0,w:68}] },
  { label:"2× Overlap",            col:"#66bb6a", grains:[{l:0,w:62},{l:32,w:62}] },
  { label:"3× Overlap + Panning",  col:"#ffa726", grains:[{l:0,w:56},{l:22,w:56},{l:44,w:56}] },
  { label:"4× + Pitch Scatter",    col:"#dd44ff", grains:[{l:0,w:50},{l:13,w:50},{l:26,w:50},{l:39,w:50}] },
];

function GrainOverlapViz({ stage, gnsm, T }) {
  const info    = MORPH_STAGES[stage];
  const smooth  = gnsm === 1;
  return (
    <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:3,
      padding:"12px 14px", marginBottom:4 }}>
      <div style={{ position:"relative", height:58 }}>
        {info.grains.length === 0 ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%",
            fontFamily:MF, fontSize:12, color:T.muted, letterSpacing:"0.08em" }}>
            — SILENT GAP BETWEEN GENES —
          </div>
        ) : info.grains.map((g, i) => (
          <div key={i} style={{
            position:"absolute", left:`${g.l}%`, top: 5 + i * 12,
            width:`${g.w}%`, height:14,
            background:info.col, opacity: 0.22 + i * 0.09,
            borderRadius: smooth ? 7 : 2,
            boxShadow: smooth ? `0 0 14px ${info.col}88` : `0 0 4px ${info.col}55`,
            transition:"all 0.25s ease",
          }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"inherit",
              background:`linear-gradient(90deg,transparent,${info.col}44,transparent)` }} />
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
        <span style={{ fontFamily:MF, fontSize:11, color:info.col, letterSpacing:"0.06em" }}>
          {info.label.toUpperCase()}
        </span>
        <span style={{ fontFamily:MF, fontSize:10, color:T.muted }}>
          {smooth ? "liquid smooth  · " : ""}{info.grains.length} active {info.grains.length===1?"gene":"genes"}
        </span>
      </div>
    </div>
  );
}

// ── Module Faceplate ──────────────────────────────────────────────────────────
function Faceplate({ activeId, onSelect, animCV, getColor, T }) {
  const ROWS = [
    {id:"varispeed",ky:55, jy:74 },
    {id:"genesize", ky:106,jy:125},
    {id:"slide",    ky:157,jy:176},
    {id:"morph",    ky:208,jy:227},
    {id:"organize", ky:259,jy:278},
    {id:"sos",      ky:310,jy:329},
  ];
  return (
    <div style={{ display:"flex", justifyContent:"center", paddingBottom:10 }}>
      <svg width={114} height={395} style={{ overflow:"visible" }}>
        <rect x={2} y={2} width={110} height={391} rx={4} fill={T.surface2} stroke={T.border} strokeWidth={1.5} />
        {[12,383].map(y => <circle key={y} cx={57} cy={y} r={4.5} fill={T.dim} stroke={T.border} strokeWidth={1} />)}
        <text x={57} y={28} textAnchor="middle" fontFamily={MF} fontSize={7} fill={T.muted} letterSpacing={2.5}>MORPHAGENE</text>
        {ROWS.map(({id,ky,jy}) => {
          const inp   = INPUT_MAP[id];
          const col   = getColor(id);
          const isAct = id === activeId;
          const cv    = animCV[id] ?? inp.defaultCv;
          const norm  = (cv - inp.min) / (inp.max - inp.min);
          const ang   = (norm * 270 - 135) * Math.PI / 180;
          return (
            <g key={id} style={{ cursor:"pointer" }} onClick={() => onSelect(id)}>
              <rect x={8} y={ky-20} width={98} height={47} rx={3}
                fill={isAct?col+"14":"transparent"} stroke={isAct?col+"38":"transparent"} strokeWidth={1} />
              <circle cx={30} cy={ky} r={12} fill={T.dim} stroke={col} strokeWidth={isAct?1.8:0.8} />
              <line x1={30} y1={ky} x2={30+Math.sin(ang)*9} y2={ky-Math.cos(ang)*9}
                stroke={col} strokeWidth={isAct?2:1.2} strokeLinecap="round" />
              <circle cx={30} cy={jy} r={6.5} fill={T.surface} stroke={col} strokeWidth={isAct?1.8:0.8} />
              <circle cx={30} cy={jy} r={2.8} fill={isAct?col:T.dim} />
              <text x={47} y={ky+1} fontFamily={MF} fontSize={8.5} fill={col}
                fontWeight={isAct?"600":"400"} letterSpacing={0.5}>{inp.short}</text>
              <text x={47} y={ky+12} fontFamily={MF} fontSize={7} fill={T.muted}
                letterSpacing={0.3}>{inp.label}</text>
              <rect x={90} y={ky-11} width={7} height={22} rx={2} fill={T.track} />
              <rect x={90} y={ky-11+(22*(1-norm))} width={7} height={22*norm} rx={2} fill={col} opacity={0.8} />
            </g>
          );
        })}
        <text x={57} y={370} textAnchor="middle" fontFamily={MF} fontSize={7} fill={T.muted} opacity={0.6}>
          IN · OUT · REC · CLK
        </text>
        {[18,30,42,54,66,78].map((x,i)=>(
          <circle key={i} cx={x} cy={381} r={4} fill={T.dim} stroke={T.border} strokeWidth={0.8} />
        ))}
      </svg>
    </div>
  );
}

// ── Mod Source Panel ──────────────────────────────────────────────────────────
function ModSourcePanel({ src, onChange, inp, col, isPlaying, onTogglePlay, T }) {
  const set = (k,v) => onChange({...src,[k]:v});
  const typeBtn = id => ({
    background: src.type===id ? col+"22" : T.surface2,
    border:`1px solid ${src.type===id ? col : T.border}`,
    color: src.type===id ? col : T.muted,
    padding:"6px 11px", borderRadius:2, cursor:"pointer",
    fontFamily:MF, fontSize:11, letterSpacing:"0.05em",
  });
  const shapeBtn = id => ({
    background: src.shape===id ? col+"22" : T.surface2,
    border:`1px solid ${src.shape===id ? col : T.border}`,
    color: src.shape===id ? col : T.muted,
    padding:"5px 10px", borderRadius:2, cursor:"pointer",
    fontFamily:MF, fontSize:11,
  });

  return (
    <div>
      <Label T={T}>Modulation Source</Label>
      <div style={{ display:"flex", gap:5, marginBottom:14, flexWrap:"wrap" }}>
        {[["static","STATIC"],["lfo","LFO"],["envelope","ENV"],["sh","S&H"]].map(([t,lbl]) => (
          <button key={t} style={typeBtn(t)} onClick={() => set("type",t)}>{lbl}</button>
        ))}
      </div>

      {src.type==="static" && (<>
        <Label T={T}>CV Value</Label>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontFamily:MF, fontSize:12, color:T.muted }}>{inp.min}V</span>
          <span style={{ fontFamily:MF, fontSize:13, color:col, fontWeight:500 }}>
            {(src.staticVal>=0&&inp.min<0)?"+":""}{src.staticVal.toFixed(2)} V
          </span>
          <span style={{ fontFamily:MF, fontSize:12, color:T.muted }}>{inp.max}V</span>
        </div>
        <TrackSlider value={src.staticVal} min={inp.min} max={inp.max} step={0.02}
          onChange={v=>set("staticVal",v)} color={col} T={T} />
      </>)}

      {src.type==="lfo" && (<>
        <Label T={T}>Waveform</Label>
        <div style={{ display:"flex", gap:5, marginBottom:14, flexWrap:"wrap" }}>
          {["sine","tri","saw","ramp"].map(s=>(
            <button key={s} style={shapeBtn(s)} onClick={()=>set("shape",s)}>{s}</button>
          ))}
        </div>
        <PSlider label="RATE" value={src.rate} min={0.05} max={4} step={0.01} unit="Hz" col={col} onChange={v=>set("rate",v)} T={T} />
        <PSlider label="AMPLITUDE" value={src.amplitude} min={0} max={1} step={0.01} unit="×" col={col} onChange={v=>set("amplitude",v)} T={T} />
      </>)}

      {src.type==="envelope" && (<>
        <PSlider label="RATE"      value={src.rate}        min={0.1} max={4}   step={0.05} unit="Hz" col={col} onChange={v=>set("rate",v)}        T={T} />
        <PSlider label="ATTACK"    value={src.attackTime}  min={0.01} max={0.9} step={0.01} unit="s" col={col} onChange={v=>set("attackTime",v)}  T={T} />
        <PSlider label="DECAY"     value={src.decayTime}   min={0.01} max={0.9} step={0.01} unit="s" col={col} onChange={v=>set("decayTime",v)}   T={T} />
        <PSlider label="AMPLITUDE" value={src.amplitude}   min={0} max={1}     step={0.01} unit="×" col={col} onChange={v=>set("amplitude",v)}    T={T} />
      </>)}

      {src.type==="sh" && (<>
        <PSlider label="CLOCK RATE" value={src.rate}      min={0.1} max={8} step={0.05} unit="Hz" col={col} onChange={v=>set("rate",v)}       T={T} />
        <PSlider label="RANGE"      value={src.amplitude} min={0}   max={1} step={0.01} unit="×"  col={col} onChange={v=>set("amplitude",v)}  T={T} />
      </>)}

      <div style={{ marginTop:14 }}>
        <button onClick={onTogglePlay} style={{
          background: isPlaying ? col+"22" : T.surface2,
          border:`1px solid ${isPlaying ? col : T.border}`,
          color: isPlaying ? col : T.muted,
          padding:"9px 16px", borderRadius:3, cursor:"pointer",
          fontFamily:MF, fontSize:12, letterSpacing:"0.1em",
          display:"flex", alignItems:"center", gap:8,
          width:"100%", justifyContent:"center",
        }}>
          {isPlaying ? "■  STOP" : "▶  PLAY MODULATION"}
        </button>
        {src.type !== "static" && !isPlaying && (
          <div style={{ fontFamily:MF, fontSize:11, color:T.muted,
            textAlign:"center", marginTop:7, lineHeight:1.5 }}>
            Press play to animate curves live
          </div>
        )}
      </div>
    </div>
  );
}

function PSlider({ label, value, min, max, step, unit, col, onChange, T }) {
  return (
    <div style={{ marginBottom:13 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontFamily:MF, fontSize:11, color:T.muted }}>{label}</span>
        <span style={{ fontFamily:MF, fontSize:13, color:col, fontWeight:500 }}>{value.toFixed(2)}{unit}</span>
      </div>
      <TrackSlider value={value} min={min} max={max} step={step} onChange={onChange} color={col} T={T} />
    </div>
  );
}

// ── Firmware panel ────────────────────────────────────────────────────────────
const FW_NOTES = {
  vsop: ["Default asymmetric range (+12/−26st). Non-linear, tape-flutter optimised. Note the curve shape above changes when you switch modes.",
         "1V/Oct bidirectional. ~2 oct reliable range. Requires precise attenuverter calibration.",
         "1V/Oct forward only. Best pitch accuracy in lower octaves. No reverse via CV."],
  gnsm: ["Hard gate on grain boundaries. Possible clicks at small grain sizes.",
         "Crossfaded grain boundaries. Smoother granular texture. Reflected in the grain overlap visualiser."],
  ckop: ["MORPH < ~10:00 → Gene Shift mode. MORPH > ~10:00 → Time Stretch mode.",
         "Always Gene Shift regardless of MORPH position.",
         "Always Time Stretch regardless of MORPH position."],
  omod: ["New splice waits for current gene to finish. Smooth but with latency.",
         "Immediate splice switch on CV change. Good for rhythmic triggering."],
  inop: ["Normal: SOS crossfades live input and buffer when recording.",
         "Record raw input regardless of SOS level. Use as send/return FX processor."],
};

function FirmwarePanel({ inp, firmOpts, setFirmOpts, col, T }) {
  if (!inp.firmware.length) return (
    <div style={{ padding:"12px 14px", background:T.surface2, border:`1px solid ${T.border}`,
      borderRadius:3, fontFamily:MF, fontSize:12, color:T.muted }}>
      No firmware options for {inp.label}
    </div>
  );
  return (
    <div>
      {inp.firmware.map(fw => (
        <div key={fw.key} style={{ marginBottom:14 }}>
          <Label T={T}>{fw.label}</Label>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
            {fw.options.map((opt,i) => {
              const active = (firmOpts[fw.key]||0) === i;
              return (
                <button key={i} onClick={() => setFirmOpts(p=>({...p,[fw.key]:i}))}
                  style={{ background:active?col+"22":T.surface2,
                    border:`1px solid ${active?col:T.border}`,
                    color:active?col:T.muted,
                    padding:"6px 11px", borderRadius:2, cursor:"pointer",
                    fontFamily:MF, fontSize:11, letterSpacing:"0.04em" }}>
                  {opt}
                </button>
              );
            })}
          </div>
          <div style={{ padding:"8px 11px", background:T.dim, borderRadius:2,
            fontFamily:MF, fontSize:11, color:T.muted, lineHeight:1.65 }}>
            {(FW_NOTES[fw.key]||[""])[firmOpts[fw.key]||0]}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chart Panel ───────────────────────────────────────────────────────────────
function ChartPanel({ inp, currentCV, timeDomain, animTime, isPlaying, firmOpts, T, col, spliceCount }) {
  const cv     = currentCV;
  const sCV    = snap1(clamp(cv, inp.min, inp.max));
  const TT     = useMemo(() => makeTooltip(T), [T]);
  const dotR   = isPlaying ? 7 : 5;
  const morphStage = getMorphStage(cv);

  // Y-values for ReferenceDot per input
  const dotY = useMemo(() => {
    const s = sCV;
    if (inp.id==="varispeed"){ const m=getVSMetrics(s,firmOpts.vsop||0); return {speed:m.speed,st:m.semitones}; }
    if (inp.id==="genesize") return { grainPct: (1-clamp(s,0,8)/8)*100 };
    if (inp.id==="slide")    return { pos: clamp(s,0,8)/8*100 };
    if (inp.id==="morph")    return { density: s<0.8?0.2:s<1.5?1:s<2.8?2:s<4?3:4 };
    if (inp.id==="sos")      return { live:1-clamp(s,0,8)/8, buf:clamp(s,0,8)/8 };
    return {};
  }, [cv, inp.id, firmOpts.vsop, sCV]);

  const tdPlayhead = isPlaying ? (animTime % 5) : null;

  const staticData = useMemo(() => {
    if (inp.id==="varispeed") return vsPoints(firmOpts.vsop||0);
    if (inp.id==="genesize")  return gsPoints();
    if (inp.id==="slide")     return slPoints();
    if (inp.id==="morph")     return moPoints();
    if (inp.id==="organize")  return orPoints(spliceCount);
    if (inp.id==="sos")       return sosPoints();
    return [];
  }, [inp.id, firmOpts.vsop, spliceCount]);

  // Stat blocks
  const stats = useMemo(() => {
    if (inp.id==="varispeed"){
      const { speed, semitones } = getVSMetrics(cv, firmOpts.vsop||0);
      return [
        { label:"CV Voltage",  value:`${cv>=0?"+":""}${cv.toFixed(2)} V` },
        { label:"Pitch Shift", value:`${semitones>=0?"+":""}${semitones} st` },
        { label:"Speed ×",     value:`${speed.toFixed(4)}×` },
        { label:"Direction",   value:cv<0?"REVERSE":cv===0?"STOPPED":"FORWARD",
          hi:cv<0?"#ff3f7f":cv===0?"#ff9800":"#55dd33" },
      ];
    }
    if (inp.id==="genesize"){
      const pct=(1-clamp(cv,0,8)/8)*100;
      return [
        { label:"CV Voltage",  value:`${cv.toFixed(2)} V` },
        { label:"Gene Window", value:`${pct.toFixed(1)}%` },
        { label:"Mode",        value:pct>90?"FULL LOOP":pct>30?"SEGMENT":"GRANULAR",
          hi:pct>90?"#55dd33":pct>30?"#ff9800":"#dd44ff" },
      ];
    }
    if (inp.id==="slide"){
      const pos=clamp(cv,0,8)/8*100;
      return [
        { label:"CV Voltage", value:`${cv.toFixed(2)} V` },
        { label:"Position",   value:`${pos.toFixed(1)}%` },
        { label:"Zone",       value:pos<10?"START":pos>90?"END":"MID-SPLICE" },
      ];
    }
    if (inp.id==="morph"){
      const labels=["Gap","Seamless","2× Overlap","3× Pan","4×+Pitch"];
      const hiCols=["#546e7a","#26c6da","#66bb6a","#ffa726","#dd44ff"];
      return [
        { label:"CV Voltage",    value:`${cv.toFixed(2)} V` },
        { label:"Stage",         value:labels[morphStage], hi:hiCols[morphStage] },
        { label:"Active Grains", value:`${morphStage===0?"0 (gap)":morphStage}` },
        { label:"Pitch Scatter", value:morphStage>=4?"ON":"OFF", hi:morphStage>=4?"#dd44ff":T.muted },
      ];
    }
    if (inp.id==="organize"){
      const sel=Math.min(spliceCount-1,Math.floor((clamp(cv,0,5)/5)*spliceCount));
      return [
        { label:"CV Voltage",  value:`${cv.toFixed(2)} V` },
        { label:"Selected",    value:`Splice #${sel+1} / ${spliceCount}` },
        { label:"V per Splice",value:`${(5/spliceCount).toFixed(3)} V`, hi:col },
        { label:"Timing",      value:firmOpts.omod===1?"IMMEDIATE":"WAIT FOR GENE",
          hi:firmOpts.omod===1?"#ff9800":T.muted },
      ];
    }
    if (inp.id==="sos"){
      const buf=clamp(cv,0,8)/8;
      return [
        { label:"CV Voltage",     value:`${cv.toFixed(2)} V` },
        { label:"Live Input",     value:`${((1-buf)*100).toFixed(0)}%`, hi:buf<0.5?"#55dd33":T.muted },
        { label:"Buffer Feedbk.", value:`${(buf*100).toFixed(0)}%`,     hi:buf>0.5?"#ff3f7f":T.muted },
        { label:"Mode",           value:buf>0.95?"FROZEN LOOP":buf<0.05?"LIVE ONLY":"OVERDUB" },
      ];
    }
    return [];
  }, [inp.id, cv, firmOpts, morphStage, spliceCount, col, T]);

  const gid = inp.id;

  return (
    <div style={{ height:"100%", overflowY:"auto", paddingBottom:32 }}>
      {/* Meta pills */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {inp.meta.map((m,i)=><Pill key={i} color={col}>{m}</Pill>)}
      </div>

      <StatBlock items={stats} T={T} />

      {/* Time domain preview */}
      {timeDomain.length > 0 && (<>
        <ChartTitle T={T} mt={0}>CV Over Time  —  Modulation Preview</ChartTitle>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={timeDomain} margin={{left:-10,right:10,top:4,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="t" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}}
              label={{value:"t (s)",fill:T.muted,fontSize:10,position:"insideBottomRight",offset:-4}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} domain={[inp.min,inp.max]} />
            {tdPlayhead !== null && (
              <ReferenceLine x={+tdPlayhead.toFixed(3)} stroke={col} strokeWidth={2.5} opacity={0.9} />
            )}
            <defs>
              <linearGradient id={`td-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.35} />
                <stop offset="100%" stopColor={col} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area type="monotone" dataKey="cv" name="CV" stroke={col}
              fill={`url(#td-${gid})`} dot={false} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </>)}

      {/* ── VARI-SPEED ── */}
      {inp.id==="varispeed" && (<>
        <ChartTitle T={T}>Playback Speed ×  CV {firmOpts.vsop>0?`· ${["","1V/Oct Bidir","1V/Oct Fwd"][firmOpts.vsop]}`:""}</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <ReferenceLine x={0}   stroke={T.border2} strokeDasharray="4 2" />
            <ReferenceLine y={1}   stroke={T.border2} strokeDasharray="4 2"
              label={{value:"1:1",fill:T.muted,fontSize:10,position:"insideTopRight"}} />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot  x={sCV} y={dotY.speed} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{filter:`drop-shadow(0 0 5px ${col})`}} />
            <Tooltip content={TT} />
            <Line type="monotone" dataKey="speed" name="speed×" stroke={col} dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Semitone Offset  ×  CV</ChartTitle>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <ReferenceLine x={0} stroke={T.border2} strokeDasharray="4 2" />
            <ReferenceLine y={0} stroke={T.border2} strokeDasharray="4 2" />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot  x={sCV} y={dotY.st} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{filter:`drop-shadow(0 0 5px ${col})`}} />
            <defs>
              <linearGradient id={`vs-st`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.3} />
                <stop offset="100%" stopColor={col} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area type="monotone" dataKey="st" name="semitones" stroke={col}
              fill="url(#vs-st)" dot={false} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <Note T={T}>Asymmetric range: +4V = +12st, −4V = −26st. Non-linear scaling adds resolution near zero for tape-flutter work. Switch firmware modes above to see the curve reshape. Enable <Mono T={T}>vsop 1</Mono> for 1V/Oct bidirectional, <Mono T={T}>vsop 2</Mono> for forward-only.</Note>
      </>)}

      {/* ── GENE SIZE ── */}
      {inp.id==="genesize" && (<>
        <ChartTitle T={T}>Gene Window %  ×  CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} domain={[0,100]} unit="%" />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot  x={sCV} y={dotY.grainPct} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{filter:`drop-shadow(0 0 5px ${col})`}} />
            <defs>
              <linearGradient id="gs-g" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={col} stopOpacity={0.5} />
                <stop offset="100%" stopColor={col} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area type="monotone" dataKey="grainPct" name="grain%" stroke={col}
              fill="url(#gs-g)" dot={false} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Grain Envelope Size (relative, live)</ChartTitle>
        <div style={{ background:T.surface2, border:`1px solid ${T.border}`,
          borderRadius:3, padding:"12px 16px", marginBottom:4 }}>
          <div style={{ position:"relative", height:30, background:T.dim, borderRadius:2, overflow:"hidden" }}>
            <div style={{ position:"absolute", left:0, top:0, bottom:0,
              width:`${(1-clamp(cv,0,8)/8)*100}%`,
              background:col, opacity:0.22, transition:"width 0.04s linear" }} />
            <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
              width:`${(1-clamp(cv,0,8)/8)*100}%`, height:2, background:col,
              boxShadow:`0 0 8px ${col}`, transition:"width 0.04s linear" }} />
            <div style={{ position:"absolute", top:6, left:8, fontFamily:MF, fontSize:9, color:T.muted }}>
              SPLICE WINDOW ▶ GENE WINDOW
            </div>
          </div>
        </div>
        <Note T={T}>Unipolar 0–8V (negative CV clamped). Gene Size is time-based, not sample-count-based — grain duration stays consistent regardless of Vari-Speed. Toggle <Mono T={T}>gnsm 1</Mono> in Firmware tab — the Morph grain overlap visualiser reflects the grain edge style.</Note>
      </>)}

      {/* ── SLIDE ── */}
      {inp.id==="slide" && (<>
        <ChartTitle T={T}>Splice Position %  ×  CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} domain={[0,100]} unit="%" />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot  x={sCV} y={dotY.pos} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{filter:`drop-shadow(0 0 5px ${col})`}} />
            <Tooltip content={TT} />
            <Line type="monotone" dataKey="pos" name="position%" stroke={col} dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Tape Scrub Position (live)</ChartTitle>
        <div style={{ background:T.surface2, border:`1px solid ${T.border}`,
          borderRadius:3, padding:"12px 16px", marginBottom:4 }}>
          <div style={{ position:"relative", height:38 }}>
            {Array.from({length:20},(_,i)=>(
              <div key={i} style={{ position:"absolute", left:`${i*5}%`, top:8, bottom:8,
                width:"4.5%", background: i<Math.floor(clamp(cv,0,8)/8*20) ? T.surface : T.dim,
                borderRight:`1px solid ${T.border}` }} />
            ))}
            <div style={{ position:"absolute", left:`${clamp(cv,0,8)/8*100}%`, top:0, bottom:0,
              width:2.5, background:col, boxShadow:`0 0 10px ${col}`,
              transform:"translateX(-50%)", transition:"left 0.04s linear" }} />
            <div style={{ position:"absolute", top:5, left:7, fontFamily:MF, fontSize:9, color:T.muted }}>
              ◀ SPLICE START ——  SLIDE ——  SPLICE END ▶
            </div>
          </div>
        </div>
        <Note T={T}>Position changes are immediate — not quantised to gene boundaries. Use smooth CV sources (MATHS, slow LFO) to avoid clicks. A 0→8V ramp creates full chronological scrubbing without pitch change. Self-patch CV Out → Slide for content-reactive positioning.</Note>
      </>)}

      {/* ── MORPH ── */}
      {inp.id==="morph" && (<>
        <ChartTitle T={T}>Grain Density  ×  CV {firmOpts.ckop>0?`· ${["","Gene Shift locked","Time Stretch locked"][firmOpts.ckop]}`:""}</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} domain={[0,4.5]} ticks={[0,1,2,3,4]} />
            {[0.8,1.5,2.8,4.0].map((x,i)=>(
              <ReferenceLine key={x} x={x} stroke={T.border2} strokeDasharray="2 4"
                label={{value:["seam","2×","3×","4×"][i],fill:T.muted,fontSize:9,position:"top"}} />
            ))}
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot  x={sCV} y={dotY.density} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{filter:`drop-shadow(0 0 5px ${col})`}} />
            <defs>
              <linearGradient id="mo-g" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#546e7a" stopOpacity={0.4} />
                <stop offset="30%"  stopColor="#66bb6a" stopOpacity={0.4} />
                <stop offset="80%"  stopColor="#dd44ff" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area type="stepAfter" dataKey="density" name="grains" stroke={col}
              fill="url(#mo-g)" dot={false} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Simultaneous Gene Layers  (live — reflects Firmware gnsm)</ChartTitle>
        <GrainOverlapViz stage={morphStage} gnsm={firmOpts.gnsm||0} T={T} />
        <Note T={T}>Unity-gain 0–5V. No attenuverter — use external scaling for subtle modulation. With CLK patched: below ~10:00 = Gene Shift; above ~10:00 = Time Stretch. Morph pitch ratios configurable via <Mono T={T}>mcr1/2/3</Mono> (range 0.0625–16.0×, including negative for reverse).</Note>
      </>)}

      {/* ── ORGANIZE ── */}
      {inp.id==="organize" && (<>
        <ChartTitle T={T}>Splice Selection  ×  CV  ({spliceCount} splices)</ChartTitle>
        {(()=>{
          const selIdx = Math.min(spliceCount-1, Math.floor((clamp(cv,0,5)/5)*spliceCount));
          return (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="splice" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}}
                  label={{value:"splice #",fill:T.muted,fontSize:10,position:"insideBottomRight",offset:-4}} />
                <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}}
                  label={{value:"CV (V)",fill:T.muted,fontSize:10,angle:-90,position:"insideLeft"}} />
                <ReferenceLine y={cv} stroke={col} strokeWidth={2.5} opacity={0.85} />
                <Tooltip content={({active,payload})=>active&&payload?.length?(
                  <div style={{background:T.tooltip,border:`1px solid ${T.border2}`,
                    padding:"8px 12px",fontFamily:MF,fontSize:11,color:T.text}}>
                    <div style={{color:T.muted}}>Splice #{payload[0]?.payload?.splice}</div>
                    <div style={{color:col}}>Threshold: {payload[0]?.payload?.threshold}V</div>
                  </div>
                ):null} />
                <Bar dataKey="threshold" radius={[2,2,0,0]}>
                  {staticData.map((_,i)=>{
                    const isSel = i===selIdx;
                    return <Cell key={i} fill={isSel?col:T.surface2} stroke={isSel?col:T.border} strokeWidth={1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        })()}
        <Note T={T}>Unity-gain 0–5V. Community reports up to 8V sometimes needed for final splices in large banks. Selection is quantised — no gradual crossfade. Toggle <Mono T={T}>omod 1</Mono> for immediate switching. Allow 2–4ms gate delay when combining CV + trigger to avoid timing races.</Note>
      </>)}

      {/* ── SOS ── */}
      {inp.id==="sos" && (<>
        <ChartTitle T={T}>Live / Buffer Mix  ×  CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{left:-10,right:10,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}} />
            <YAxis stroke={T.border2} tick={{fill:T.muted,fontSize:10,fontFamily:MF}}
              domain={[0,1]} tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
            <ReferenceLine x={sCV} stroke={T.border2} strokeWidth={1.5} opacity={0.8} />
            <ReferenceDot  x={sCV} y={dotY.live} r={dotR} fill="#55dd33" stroke={T.surface} strokeWidth={2.5}
              style={{filter:"drop-shadow(0 0 5px #55dd33)"}} />
            <ReferenceDot  x={sCV} y={dotY.buf}  r={dotR} fill="#ff3f7f" stroke={T.surface} strokeWidth={2.5}
              style={{filter:"drop-shadow(0 0 5px #ff3f7f)"}} />
            <defs>
              <linearGradient id="sos-l" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#55dd33" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#55dd33" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sos-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3f7f" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ff3f7f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={({active,payload,label})=>active&&payload?.length?(
              <div style={{background:T.tooltip,border:`1px solid ${T.border2}`,
                padding:"8px 12px",fontFamily:MF,fontSize:11,color:T.text}}>
                <div style={{color:T.muted,marginBottom:4}}>CV {label}V</div>
                {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: {(p.value*100).toFixed(1)}%</div>)}
              </div>
            ):null} />
            <Area type="monotone" dataKey="live" name="Live Input" stroke="#55dd33"
              fill="url(#sos-l)" dot={false} strokeWidth={2.5} />
            <Area type="monotone" dataKey="buf"  name="Buffer"     stroke="#ff3f7f"
              fill="url(#sos-b)" dot={false} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Signal Balance Meter (live)</ChartTitle>
        <div style={{ background:T.surface2, border:`1px solid ${T.border}`,
          borderRadius:3, padding:"12px 16px", marginBottom:4 }}>
          {(()=>{
            const buf=clamp(cv,0,8)/8, live=1-buf;
            return (<>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:MF, fontSize:11, color:"#55dd33", minWidth:30 }}>LIVE</span>
                <div style={{ flex:1, height:22, background:T.dim, borderRadius:2,
                  overflow:"hidden", position:"relative" }}>
                  <div style={{ position:"absolute", left:0, top:0, bottom:0,
                    width:`${live*100}%`, background:"linear-gradient(90deg,#55dd33bb,#55dd3333)",
                    transition:"width 0.04s linear" }} />
                  <div style={{ position:"absolute", right:0, top:0, bottom:0,
                    width:`${buf*100}%`, background:"linear-gradient(90deg,#ff3f7f33,#ff3f7fbb)",
                    transition:"width 0.04s linear" }} />
                  <div style={{ position:"absolute", left:`${live*100}%`, top:0, bottom:0,
                    width:2, background:T.border2, transform:"translateX(-50%)" }} />
                </div>
                <span style={{ fontFamily:MF, fontSize:11, color:"#ff3f7f", minWidth:36, textAlign:"right" }}>BUF</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:7 }}>
                <span style={{ fontFamily:MF, fontSize:12, color:"#55dd33" }}>{(live*100).toFixed(0)}%</span>
                <span style={{ fontFamily:MF, fontSize:12, color:"#ff3f7f" }}>{(buf*100).toFixed(0)}%</span>
              </div>
            </>);
          })()}
        </div>
        <Note T={T}>Normalised to +8V (no patch = full buffer feedback). Knob acts as attenuator when CV is patched. Use envelope → SOS for percussive loop captures. Enable <Mono T={T}>inop 1</Mono> to record raw input regardless of SOS level.</Note>
      </>)}
    </div>
  );
}

// ── Interaction Matrix ────────────────────────────────────────────────────────
function InteractionMatrix({ onSelectPair, getColor, T }) {
  const [hovered, setHovered] = useState(null);
  const getCell = (a,b) => MATRIX_CELLS[[a,b].sort().join("-")] || null;
  const LEVEL_STYLE = [null,
    { bg:"#1a1a36", bd:"#33335a", col:"#8888cc" },
    { bg:"#1a2e1a", bd:"#2a4a2a", col:"#88bb88" },
    { bg:"#2a1a36", bd:"#4a2a5a", col:"#cc88ff" },
  ];
  return (
    <div style={{ paddingBottom:24 }}>
      <p style={{ fontFamily:MF, fontSize:12, color:T.muted, marginBottom:16, lineHeight:1.7 }}>
        Hover any highlighted cell to see the patch interaction. Click to jump to that input.
      </p>
      <div style={{ display:"flex", gap:14, marginBottom:16, flexWrap:"wrap" }}>
        {[1,2,3].map(l=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:16, height:16, borderRadius:2,
              background:LEVEL_STYLE[l].bg, border:`1px solid ${LEVEL_STYLE[l].bd}` }} />
            <span style={{ fontFamily:MF, fontSize:11, color:T.muted }}>
              {l===1?"Subtle":l===2?"Productive":"High Synergy"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={{ width:60 }} />
              {INPUTS.map(inp=>(
                <th key={inp.id} style={{ padding:"6px 4px", fontFamily:MF, fontSize:9,
                  color:getColor(inp.id), letterSpacing:"0.08em", textAlign:"center",
                  borderBottom:`1px solid ${T.border}` }}>{inp.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INPUTS.map(row=>(
              <tr key={row.id}>
                <td style={{ padding:"4px 10px 4px 0", fontFamily:MF, fontSize:9,
                  color:getColor(row.id), letterSpacing:"0.08em",
                  borderRight:`1px solid ${T.border}`, textAlign:"right" }}>{row.short}</td>
                {INPUTS.map(col2=>{
                  if (row.id===col2.id) return (
                    <td key={col2.id} style={{ padding:3 }}>
                      <div style={{ width:40,height:30,background:T.surface2,borderRadius:2,
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <div style={{ width:5,height:5,borderRadius:"50%",
                          background:getColor(row.id),opacity:0.6 }} />
                      </div>
                    </td>
                  );
                  const cell = getCell(row.id, col2.id);
                  const hk   = `${row.id}-${col2.id}`;
                  const isH  = hovered===hk || hovered===`${col2.id}-${row.id}`;
                  if (!cell) return (
                    <td key={col2.id} style={{ padding:3 }}>
                      <div style={{ width:40,height:30,background:T.dim,borderRadius:2,opacity:0.4 }} />
                    </td>
                  );
                  const ls = LEVEL_STYLE[cell.level];
                  return (
                    <td key={col2.id} style={{ padding:3 }}>
                      <div onMouseEnter={()=>setHovered(hk)} onMouseLeave={()=>setHovered(null)}
                        onClick={()=>onSelectPair(row.id, col2.id)}
                        style={{ width:40,height:30,borderRadius:2,cursor:"pointer",
                          background:isH?ls.bg+"cc":ls.bg, border:`1px solid ${isH?ls.col:ls.bd}`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"all 0.1s" }}>
                        <span style={{ fontSize:cell.level===3?13:cell.level===2?11:9,
                          color:ls.col }}>
                          {cell.level===3?"★":cell.level===2?"◆":"·"}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:16,minHeight:90,padding:"12px 14px",
        background:T.surface2, border:`1px solid ${T.border}`, borderRadius:3 }}>
        {hovered ? (()=>{
          const mk = [hovered, hovered.split("-").reverse().join("-")].find(k=>MATRIX_CELLS[k]);
          const cell = mk ? MATRIX_CELLS[mk] : null;
          if (!cell) return <span style={{ fontFamily:MF,fontSize:12,color:T.muted }}>—</span>;
          const [a,b] = mk.split("-");
          return (<>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
              <span style={{ fontFamily:MF,fontSize:12,color:getColor(a),fontWeight:500 }}>{INPUT_MAP[a]?.label}</span>
              <span style={{ fontFamily:MF,fontSize:11,color:T.muted }}>×</span>
              <span style={{ fontFamily:MF,fontSize:12,color:getColor(b),fontWeight:500 }}>{INPUT_MAP[b]?.label}</span>
              <span style={{ marginLeft:"auto",fontFamily:MF,fontSize:11,
                color:LEVEL_STYLE[cell.level].col }}>{cell.title}</span>
            </div>
            <div style={{ fontFamily:MF,fontSize:12,color:T.muted,lineHeight:1.7 }}>{cell.desc}</div>
          </>);
        })() : <span style={{ fontFamily:MF,fontSize:12,color:T.muted }}>
          Hover a cell to see the patch interaction description
        </span>}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const T = isDark ? DARK : LIGHT;
  const getColor = useCallback(id => (isDark ? DARK_COLORS : LIGHT_COLORS)[id], [isDark]);

  const [activeId, setActiveId]   = useState("varispeed");
  const [view, setView]           = useState("charts");
  const [leftTab, setLeftTab]     = useState("mod");
  const [spliceCount, setSpliceCount] = useState(8);

  const [modSources, setModSources] = useState(
    Object.fromEntries(INPUTS.map(i => [i.id, { ...DEFAULT_MOD, staticVal:i.defaultCv }]))
  );
  const [firmOpts, setFirmOpts] = useState({ vsop:0, gnsm:0, ckop:0, omod:0, inop:0 });
  const [isPlaying, setIsPlaying] = useState(false);

  const animRef = useRef(null);
  const timeRef = useRef(0);
  const [animTime, setAnimTime] = useState(0);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return; }
    const loop = () => { timeRef.current += 0.016; setAnimTime(timeRef.current); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  const animCV = useMemo(() => {
    const out = {};
    INPUTS.forEach(i => {
      const src = modSources[i.id];
      out[i.id] = src.type==="static" ? src.staticVal
        : isPlaying ? computeModCV(src, animTime, i) : computeModCV(src, 0, i);
    });
    return out;
  }, [modSources, animTime, isPlaying]);

  const inp = INPUT_MAP[activeId];
  const col = getColor(activeId);

  const timeDomain = useMemo(() => {
    const src = modSources[activeId];
    if (src.type==="static") return [];
    return buildTimeDomain(src, inp, 5, 200);
  }, [modSources, activeId, inp]);

  const setModSource = useCallback((id,v) => setModSources(p=>({...p,[id]:v})), []);

  const navBtn = id => ({
    background: view===id ? T.surface2 : "none",
    border:`1px solid ${view===id ? T.border2 : T.border}`,
    color: view===id ? T.text : T.muted,
    padding:"5px 13px", cursor:"pointer", borderRadius:3,
    fontFamily:MF, fontSize:11, letterSpacing:"0.08em",
  });
  const leftTabBtn = id => ({
    background:"none", border:"none",
    borderBottom:`2px solid ${leftTab===id ? col : "transparent"}`,
    color: leftTab===id ? col : T.muted,
    padding:"8px 12px", cursor:"pointer", fontFamily:MF, fontSize:11, letterSpacing:"0.1em",
  });

  return (
    <div style={{ background:T.bg, minHeight:"100vh", color:T.text,
      display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Barlow+Condensed:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;width:100%;height:28px;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:1px;height:1px;opacity:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#33334a;border-radius:2px;}
        button:focus{outline:none;}
      `}</style>

      {/* Header */}
      <div style={{ background:T.panel, borderBottom:`1px solid ${T.border}`,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:16,
        flexShrink:0, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22,
            fontWeight:700, letterSpacing:"0.12em", color:T.text }}>MAKE NOISE MORPHAGENE</div>
          <div style={{ fontFamily:MF, fontSize:10, color:T.muted, letterSpacing:"0.15em", marginTop:1 }}>
            CV MODULATION REFERENCE · v2.1 | by TryError
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <button style={navBtn("charts")} onClick={()=>setView("charts")}>INPUTS</button>
          <button style={navBtn("matrix")} onClick={()=>setView("matrix")}>MATRIX</button>
          <button onClick={()=>setIsDark(p=>!p)} style={{
            background:T.surface2, border:`1px solid ${T.border}`,
            color:T.muted, padding:"5px 12px", cursor:"pointer", borderRadius:3,
            fontFamily:MF, fontSize:11 }}>
            {isDark?"☀ LIGHT":"☾ DARK"}
          </button>
        </div>
      </div>

      {view==="matrix" ? (
        <div style={{ padding:"20px 24px", maxWidth:740, overflowY:"auto" }}>
          <InteractionMatrix
            onSelectPair={a => { setActiveId(a); setView("charts"); }}
            getColor={getColor} T={T} />
        </div>
      ) : (
        <div style={{ display:"flex", flex:1, minHeight:0 }}>

          {/* Left */}
          <div style={{ width:250, minWidth:220, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", background:T.panel,
            overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"12px 14px 0", borderBottom:`1px solid ${T.border}` }}>
              <Faceplate activeId={activeId} onSelect={setActiveId}
                animCV={animCV} getColor={getColor} T={T} />
            </div>
            <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
              <button style={leftTabBtn("mod")} onClick={()=>setLeftTab("mod")}>MOD</button>
              <button style={leftTabBtn("firmware")} onClick={()=>setLeftTab("firmware")}>FIRMWARE</button>
              {activeId==="organize" && (
                <button style={leftTabBtn("splices")} onClick={()=>setLeftTab("splices")}>SPLICES</button>
              )}
            </div>
            <div style={{ padding:"14px 14px 24px", flex:1, overflowY:"auto" }}>
              {leftTab==="mod" && (
                <ModSourcePanel src={modSources[activeId]}
                  onChange={v=>setModSource(activeId,v)}
                  inp={inp} col={col} isPlaying={isPlaying}
                  onTogglePlay={()=>{ if(isPlaying){timeRef.current=0;setAnimTime(0);} setIsPlaying(p=>!p); }}
                  T={T} />
              )}
              {leftTab==="firmware" && (
                <FirmwarePanel inp={inp} firmOpts={firmOpts} setFirmOpts={setFirmOpts} col={col} T={T} />
              )}
              {leftTab==="splices" && activeId==="organize" && (
                <div>
                  <Label T={T}>Splice Count</Label>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:MF, fontSize:12, color:T.muted }}>2</span>
                    <span style={{ fontFamily:MF, fontSize:14, color:col, fontWeight:500 }}>{spliceCount}</span>
                    <span style={{ fontFamily:MF, fontSize:12, color:T.muted }}>32</span>
                  </div>
                  <TrackSlider value={spliceCount} min={2} max={32} step={1}
                    onChange={setSpliceCount} color={col} T={T} />
                  <Note T={T}>Adjust to see how V-per-splice resolution changes. At 32 splices each occupies only 0.156V — making precise CV selection very difficult without quantisation.</Note>
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 22px", minWidth:0 }}>
            <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, marginBottom:16, overflowX:"auto" }}>
              {INPUTS.map(i=>(
                <button key={i.id} onClick={()=>setActiveId(i.id)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  padding:"8px 16px", whiteSpace:"nowrap",
                  fontFamily:MF, fontSize:11, letterSpacing:"0.08em",
                  color: activeId===i.id ? getColor(i.id) : T.muted,
                  borderBottom:`2px solid ${activeId===i.id ? getColor(i.id) : "transparent"}`,
                  marginBottom:-1 }}>{i.label}</button>
              ))}
            </div>
            <ChartPanel
              inp={inp} currentCV={animCV[activeId]}
              timeDomain={timeDomain} animTime={animTime} isPlaying={isPlaying}
              firmOpts={firmOpts} T={T} col={col} spliceCount={spliceCount} />
          </div>
        </div>
      )}
    </div>
  );
}
