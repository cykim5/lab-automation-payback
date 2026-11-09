// Lab automation payback calculator.

const FIELDS = ["samples", "days", "manualMin", "autoMin", "rate", "manualErr", "autoErr", "rerunCost", "capex", "service", "consumables"];

const PRESETS = {
  "Automated nucleic acid extraction (liquid handler)": {
    samples: 192, days: 250, manualMin: 4, autoMin: 1, rate: 45,
    manualErr: 2.5, autoErr: 0.8, rerunCost: 60, capex: 180000, service: 18000, consumables: 0.6,
  },
  "Barcoded tubes with an automated sample store": {
    samples: 400, days: 250, manualMin: 1.2, autoMin: 0.3, rate: 40,
    manualErr: 0.6, autoErr: 0.1, rerunCost: 120, capex: 250000, service: 20000, consumables: 0.15,
  },
  "Automated plate sealing and decapping": {
    samples: 96, days: 250, manualMin: 0.8, autoMin: 0.2, rate: 40,
    manualErr: 0.5, autoErr: 0.2, rerunCost: 40, capex: 35000, service: 3000, consumables: 0.05,
  },
  "Small lab, low volume (does it still pay?)": {
    samples: 24, days: 250, manualMin: 4, autoMin: 1, rate: 40,
    manualErr: 2, autoErr: 0.8, rerunCost: 60, capex: 120000, service: 12000, consumables: 0.6,
  },
};

const DEFAULT = PRESETS["Automated nucleic acid extraction (liquid handler)"];
const HOURS_PER_FTE = 1800;

const el = id => document.getElementById(id);

// ---------- Math ----------

function compute(v) {
  const perYear = v.samples * v.days;
  const laborHoursSaved = perYear * (v.manualMin - v.autoMin) / 60;
  const labor = laborHoursSaved * v.rate;
  const reruns = perYear * ((v.manualErr - v.autoErr) / 100) * v.rerunCost;
  const consumables = perYear * v.consumables;
  const net = labor + reruns - v.service - consumables;
  const months = net > 0 ? v.capex / (net / 12) : Infinity;
  return { perYear, laborHoursSaved, labor, reruns, consumables, service: v.service, net, months };
}

// Net savings is linear in daily volume: net = a * samples - service.
function breakevenVolume(v, years) {
  const perSample = v.days * (
    (v.manualMin - v.autoMin) / 60 * v.rate +
    ((v.manualErr - v.autoErr) / 100) * v.rerunCost -
    v.consumables
  );
  if (perSample <= 0) return Infinity;
  return (v.capex / years + v.service) / perSample;
}

// ---------- Formatting ----------

const money = n => {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};

function formatMonths(m) {
  if (!isFinite(m)) return "Never";
  if (m < 1) return "< 1 month";
  if (m > 120) return "10+ years";
  if (m < 24) return `${Math.round(m)} months`;
  return `${(m / 12).toFixed(1)} years`;
}

function verdict(m) {
  if (!isFinite(m)) return "Running costs outweigh the savings.";
  if (m <= 18) return "Strong case on savings alone.";
  if (m <= 36) return "Reasonable. Most labs accept 2 to 3 years.";
  if (m <= 60) return "Borderline. Needs a quality or capacity reason too.";
  return "Hard to justify on cost. Look at volume or a cheaper system.";
}

// ---------- Charts ----------

function cashChart(r, v) {
  const W = 560, H = 240, L = 56, R = 12, T = 14, B = 30;
  const months = 60;
  const pts = [];
  for (let m = 0; m <= months; m++) pts.push(-v.capex + (r.net / 12) * m);
  const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts);
  const span = hi - lo || 1;
  const x = m => L + (m / months) * (W - L - R);
  const y = val => T + (1 - (val - lo) / span) * (H - T - B);

  let s = "";
  [lo, (lo + hi) / 2, hi].forEach(val => {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(val)}" y2="${y(val)}"/>`;
    s += `<text class="tick" x="${L - 8}" y="${y(val) + 4}" text-anchor="end">${money(val)}</text>`;
  });
  s += `<line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  for (let yr = 0; yr <= 5; yr++) {
    s += `<text class="tick" x="${x(yr * 12)}" y="${H - 10}" text-anchor="middle">${yr === 0 ? "Start" : "Yr " + yr}</text>`;
  }
  const path = pts.map((p, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(p).toFixed(1)}`).join("");
  s += `<path class="line" d="${path}"/>`;
  if (isFinite(r.months) && r.months <= months) {
    const px = x(r.months);
    s += `<line class="marker" x1="${px}" x2="${px}" y1="${T}" y2="${H - B}"/>`;
    s += `<circle class="pt" cx="${px}" cy="${y(0)}" r="5"/>`;
    s += `<text class="callout" x="${px + (px > W - 140 ? -8 : 8)}" y="${T + 12}" text-anchor="${px > W - 140 ? "end" : "start"}">Pays back at ${formatMonths(r.months)}</text>`;
  }
  el("cashChart").innerHTML = s;
}

function volumeChart(v) {
  const W = 560, H = 240, L = 56, R = 12, T = 14, B = 30;
  const maxVol = Math.max(50, Math.ceil(v.samples * 2 / 50) * 50);
  const cap = 72;
  const x = n => L + (n / maxVol) * (W - L - R);
  const y = m => T + (1 - Math.min(m, cap) / cap) * (H - T - B);

  let s = "";
  [0, 24, 48, 72].forEach(m => {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(m)}" y2="${y(m)}"/>`;
    s += `<text class="tick" x="${L - 8}" y="${y(m) + 4}" text-anchor="end">${m === 72 ? "6+ yr" : m / 12 + " yr"}</text>`;
  });
  for (let i = 0; i <= 4; i++) {
    const n = (maxVol / 4) * i;
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
    s += `<text class="tick" x="${x(n)}" y="${H - 10}" text-anchor="${anchor}">${Math.round(n)}/day</text>`;
  }
  // target band: 3 years or less
  s += `<rect class="band" x="${L}" y="${y(36)}" width="${W - L - R}" height="${y(0) - y(36)}"/>`;
  s += `<text class="tick" x="${W - R - 6}" y="${y(36) + 14}" text-anchor="end">Pays back in 3 years or less</text>`;

  let d = "", started = false;
  const steps = 120;
  for (let i = 1; i <= steps; i++) {
    const n = (maxVol / steps) * i;
    const m = compute({ ...v, samples: n }).months;
    if (!isFinite(m) || m > cap) { started = false; continue; }
    d += `${started ? "L" : "M"}${x(n).toFixed(1)},${y(m).toFixed(1)}`;
    started = true;
  }
  s += `<path class="line" d="${d}"/>`;
  const cur = compute(v).months;
  if (isFinite(cur) && cur <= cap) {
    s += `<circle class="pt" cx="${x(v.samples)}" cy="${y(cur)}" r="5"/>`;
    s += `<text class="callout" x="${x(v.samples) + 8}" y="${y(cur) - 8}">You</text>`;
  }
  el("volChart").innerHTML = s;
}

// ---------- Render ----------

function read() {
  const v = {};
  FIELDS.forEach(f => { v[f] = Math.max(0, Number(el(f).value) || 0); });
  return v;
}

function fill(values) {
  FIELDS.forEach(f => { el(f).value = values[f]; });
}

function render() {
  const v = read();
  const r = compute(v);

  el("payback").textContent = formatMonths(r.months);
  el("verdict").textContent = verdict(r.months);
  el("net").textContent = money(r.net);
  el("fte").textContent = `${(r.laborHoursSaved / HOURS_PER_FTE).toFixed(1)} FTE`;
  el("hours").textContent = `${Math.round(r.laborHoursSaved).toLocaleString()} hours a year`;
  el("fiveYear").textContent = money(r.net * 5 - v.capex);

  const rows = [
    ["Labor time saved", r.labor, "pos"],
    ["Fewer reruns", r.reruns, "pos"],
    ["Service contract", -r.service, "neg"],
    ["Extra consumables", -r.consumables, "neg"],
  ];
  const maxAbs = Math.max(1, ...rows.map(row => Math.abs(row[1])));
  el("breakdown").innerHTML = rows.map(([label, val, cls]) => `
    <div class="brow">
      <span class="blabel">${label}</span>
      <span class="btrack"><span class="bbar ${val < 0 ? "neg" : cls}" style="width:${(Math.abs(val) / maxAbs) * 100}%"></span></span>
      <span class="bval">${money(val)}</span>
    </div>`).join("") + `
    <div class="brow total">
      <span class="blabel">Net per year</span><span></span><span class="bval">${money(r.net)}</span>
    </div>`;

  const be = breakevenVolume(v, 3);
  el("breakeven").textContent = isFinite(be)
    ? `To pay back within 3 years, you need about ${Math.ceil(be)} samples a day. You're at ${v.samples}.`
    : "At these settings, automation doesn't pay back at any volume.";

  cashChart(r, v);
  volumeChart(v);
}

// ---------- Init ----------

const presetSelect = el("preset");
Object.keys(PRESETS).forEach(name => {
  const o = document.createElement("option");
  o.value = name;
  o.textContent = name;
  presetSelect.appendChild(o);
});
presetSelect.addEventListener("change", () => {
  if (PRESETS[presetSelect.value]) { fill(PRESETS[presetSelect.value]); render(); }
});

document.querySelector(".inputs").addEventListener("input", e => {
  if (e.target.id !== "preset") render();
});

fill(DEFAULT);
render();
