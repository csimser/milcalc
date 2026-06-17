import { useState, useEffect, useRef } from "react";
import NavHeader, { NAV_H } from "../components/NavHeader.jsx";
import UpdateCheck from "../components/UpdateCheck.jsx";
import {
  DS_CSS, SummaryBar, SectionHeader, InfoCard, IncomeRow, TotalRow, HintBox, DiscordLink,
} from "../components/ui.jsx";
import { fmt, getVAPriorityGroup, calcStateTax, calcFederalTax, pension, calcVAComp, lookupPay } from "../lib/calc.js";
import { TRICARE_PLANS, TRICARE_TRR, VA_PRIORITY_GROUPS, STATES, GRADE_LABELS, GRADE_GROUPS } from "../lib/data.js";
import { jsPDF } from "jspdf";
import { track, r100 } from "../analytics.js";
import { PUBLIC_URL, PUBLIC_DOMAIN, SUPPORT_EMAIL, PARENT_BRAND_URL, PARENT_BRAND_DOMAIN } from "../config.js";

// 2026 COLA: 2.5% effective January 1, 2026
// Source: SSA.gov COLA announcement October 2025
const COLA_2026 = 2.5;

const LS_KEY = "ret_state_v1";

const DEFAULT_STATE = {
  name: "",
  pension: 0,
  va: 0,
  vaRating: 0,
  sbpOn: false,
  sbpAmt: 0,
  tricarePlan: "prime_self",
  age: 45,
  ssa: 0,
  selectedState: "Texas",
  tspType: "traditional",
  tspTradBalance: 0,
  tspRothBalance: 0,
  deps: "s0",
  tspBalance: 0,
  tspGrowthRate: 7,
  hysaBalance: 0,
  hysaContribMo: 0,
  hysaApy: 4.5,
  othBalance: 0,
  othContribMo: 0,
  othGrowthRate: 7,
  // Auto-calculate mode fields
  autoCalc: true,
  autoGrade: "O-5",
  autoYos: 20,
  autoRetSystem: "High-3",
  autoVaRating: 0,
  autoDeps: "s0",
  autoSchoolKids: 0,   // children 18–23 in an approved school program
  autoDepParents: 0,   // dependent parents (≥50% supported), 0–2
  autoSpouseAA: false, // spouse receives VA Aid & Attendance
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}

const TRICARE_OPTS = [
  { v: "prime_self",     l: "TRICARE Prime – Self (Grp A)",      amt: TRICARE_PLANS.prime.groupA.self },
  { v: "prime_fam",      l: "TRICARE Prime – Family (Grp A)",    amt: TRICARE_PLANS.prime.groupA.family },
  { v: "prime_b_self",   l: "TRICARE Prime – Self (Grp B)",      amt: TRICARE_PLANS.prime.groupB.self },
  { v: "prime_b_fam",    l: "TRICARE Prime – Family (Grp B)",    amt: TRICARE_PLANS.prime.groupB.family },
  { v: "select_self",    l: "TRICARE Select – Self (Grp A)",     amt: TRICARE_PLANS.select.groupA.self },
  { v: "select_fam",     l: "TRICARE Select – Family (Grp A)",   amt: TRICARE_PLANS.select.groupA.family },
  { v: "select_b_self",  l: "TRICARE Select – Self (Grp B)",     amt: TRICARE_PLANS.select.groupB.self },
  { v: "select_b_fam",   l: "TRICARE Select – Family (Grp B)",   amt: TRICARE_PLANS.select.groupB.family },
  { v: "trr_self",       l: "TRICARE Retired Reserve – Self",    amt: TRICARE_TRR.individual },
  { v: "trr_fam",        l: "TRICARE Retired Reserve – Family",  amt: TRICARE_TRR.family },
  { v: "tfl",            l: "TRICARE For Life (65+)",             amt: TRICARE_PLANS.tfl.medicare_b },
  { v: "none",           l: "Other / Not enrolled",               amt: 0 },
];

const PAGE_CSS = `
html, body, #root {
  background: #0f0f14;
  margin: 0;
  padding: 0;
}
.ret2-wrap {
  min-height: 100vh;
  background: #0f0f14;
  padding-top: calc(52px + env(safe-area-inset-top, 0px));
}
.ret2-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 12px;
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}
.ret2-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 767px) {
  .ret2-two-col { grid-template-columns: 1fr; }
}
/* Inline number input */
.ret2-num {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 16px; font-weight: 500;
  text-align: right; width: 100%; max-width: 130px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.ret2-num::-webkit-inner-spin-button,
.ret2-num::-webkit-outer-spin-button { -webkit-appearance: none; }
.ret2-num::placeholder { color: #4b5563; }
/* Select wrapper */
.ret2-sel {
  position: relative; flex: 1; min-width: 0;
}
.ret2-sel select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 14px; font-weight: 500;
  width: 100%; cursor: pointer; padding-right: 18px;
  -webkit-appearance: none; appearance: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-align: right;
}
.ret2-sel::after {
  content: '';
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #6b7280;
  pointer-events: none;
}
.ret2-sel select option { background: #17171f; color: #f9fafb; }
/* COLA tracker card */
.ret2-cola-card {
  background: #17171f;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  margin-bottom: 20px;
  overflow: hidden;
}
/* Medicare / TRICARE card */
.ret2-medicare {
  background: #17171f;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 20px;
}
.ret2-med-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(52,211,153,0.06); border: 1px solid rgba(52,211,153,0.15);
  border-radius: 10px; padding: 8px 14px;
  color: #34d399; font-size: 14px; font-weight: 600;
  margin-bottom: 12px;
}
.ret2-med-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 14px;
}
.ret2-med-row:last-child { border-bottom: none; }
.ret2-med-lbl { color: #6b7280; }
.ret2-med-val { color: #f9fafb; font-weight: 500; }
/* SSA callout */
.ret2-ssa-hint {
  font-size: 12px; color: #6b7280; line-height: 1.6;
  padding: 14px 16px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.ret2-ssa-hint a { color: #d4a017; text-decoration: none; }
/* Share modal */
.ret2-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.ret2-modal {
  position: relative; background: #17171f; border-radius: 16px;
  padding: 24px; max-width: 420px; width: 90%;
  border: 1px solid rgba(255,255,255,0.06);
  max-height: 85vh; overflow-y: auto;
}
.ret2-modal-close {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; font-size: 18px; color: #6b7280;
  cursor: pointer; line-height: 1; padding: 4px;
}
`;


function growBal(currentBal, monthlyContrib, years, annualRate) {
  if (years <= 0) return currentBal;
  const r = annualRate / 12;
  if (r === 0) return currentBal + monthlyContrib * years * 12;
  return currentBal * Math.pow(1 + r, years * 12)
    + monthlyContrib * (Math.pow(1 + r, years * 12) - 1) / r;
}

export default function RetiredPage() {
  const [s, setS] = useState(loadState);
  const set = (key, val) => setS(prev => ({ ...prev, [key]: val }));
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImgURL, setShareImgURL] = useState(null);
  const shareBlobRef = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTricareInfo, setShowTricareInfo] = useState(false);
  const [fbCat, setFbCat] = useState("General Feedback");
  const [fbMsg, setFbMsg] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [pdfTheme, setPdfTheme] = useState("dark");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  // ── Export via bottom tab bar ──────────────────────────────────────────
  useEffect(() => {
    const handler = () => generatePDF();
    window.addEventListener("milcalc:export", handler);
    return () => window.removeEventListener("milcalc:export", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-calculate helpers ────────────────────────────────────────────
  // Dep key mapping (same as TransitioningPage DEP_OPTIONS)
  const RET_DEP_MAP = {
    s0:  { key: "s",  ch: 0 }, sp0: { key: "sp", ch: 0 },
    sp1: { key: "sp", ch: 1 }, sp2: { key: "sp", ch: 2 }, sp3: { key: "sp", ch: 3 },
    s1:  { key: "s",  ch: 1 }, s2:  { key: "s",  ch: 2 }, s3:  { key: "s",  ch: 3 },
  };

  // ── Calculations ─────────────────────────────────────────────────────
  const tricareOpt = TRICARE_OPTS.find(t => t.v === s.tricarePlan) || TRICARE_OPTS[0];
  const tricarePremium = tricareOpt.amt;
  const age = s.age || 45;
  // State and federal tax
  const stateInfo = STATES[s.selectedState || "Texas"] || { ok: true };

  // Auto-calc: derive pension and VA from grade/yos/system/rating/deps
  const isAutoCalc = !!s.autoCalc;
  const autoH3 = isAutoCalc ? (lookupPay(s.autoGrade || "O-5", s.autoYos || 20) || 0) : 0;
  const autoGrossPension = isAutoCalc ? pension(s.autoRetSystem || "High-3", s.autoYos || 20, autoH3) : 0;
  const autoDepInfo = RET_DEP_MAP[s.autoDeps || "s0"] || RET_DEP_MAP.s0;
  const autoHasSpouse = autoDepInfo.key === "sp";
  const autoVaAmt = isAutoCalc && (s.autoVaRating || 0) > 0
    ? calcVAComp(s.autoVaRating, autoDepInfo.key, autoDepInfo.ch, {
        parents: s.autoDepParents || 0,
        spouseAA: !!s.autoSpouseAA && autoHasSpouse,
        schoolChildren: s.autoSchoolKids || 0,
      })
    : 0;

  // Effective pension and VA (auto or manual)
  const grossPension = isAutoCalc ? autoGrossPension : (s.pension || 0);
  const stateTaxMo = grossPension > 0 ? calcStateTax(grossPension * 12, stateInfo, age) / 12 : 0;
  const effectiveDeps = isAutoCalc ? (s.autoDeps || "s0") : (s.deps || "s0");
  const filingStatus = effectiveDeps.startsWith("sp") ? "mfj" : "single";
  const tspType = s.tspType || "traditional";
  const isSplit = tspType === "split";
  // Effective VA: auto or manual
  const effectiveVA = isAutoCalc ? autoVaAmt : (s.va || 0);
  const netPension = grossPension - stateTaxMo;
  // Savings projections (4% rule at 65) — computed first so tspMonthlyDraw can be used in fed tax
  const yearsTo65 = Math.max(0, 65 - age);
  const atAge = age >= 65 ? "now" : "at 65";
  const tspRate = (s.tspGrowthRate || 7) / 100;
  const tradBal = isSplit ? (s.tspTradBalance || 0) : (s.tspBalance || 0);
  const rothBal = isSplit ? (s.tspRothBalance || 0) : 0;
  const tspTradAt65 = growBal(tradBal, 0, yearsTo65, tspRate);
  const tspRothAt65 = growBal(rothBal, 0, yearsTo65, tspRate);
  const tspAt65 = tspTradAt65 + tspRothAt65;
  const tspTradDraw = tspTradAt65 * 0.04 / 12;
  const tspRothDraw = tspRothAt65 * 0.04 / 12;
  const tspMonthlyDraw = tspTradDraw + tspRothDraw;
  const hysaAt65 = growBal(s.hysaBalance || 0, s.hysaContribMo || 0, yearsTo65, (s.hysaApy || 4.5) / 100);
  const hysaMonthlyDraw = hysaAt65 * 0.04 / 12;
  const othAt65 = growBal(s.othBalance || 0, s.othContribMo || 0, yearsTo65, (s.othGrowthRate || 7) / 100);
  const othMonthlyDraw = othAt65 * 0.04 / 12;
  const totalSavingsDraw = tspMonthlyDraw + hysaMonthlyDraw + othMonthlyDraw;
  // Federal tax — only Traditional TSP draws are taxable
  const tspTaxable = tspType === "roth" ? 0 : tspTradDraw;
  const fedTaxableAnnual = (grossPension - stateTaxMo) * 12 + tspTaxable * 12;
  const fedTax = calcFederalTax(fedTaxableAnnual, filingStatus, age >= 65, false);
  const fedTaxMo = fedTax.monthlyTax;
  const totalIncome = grossPension + effectiveVA + tspMonthlyDraw
    + hysaMonthlyDraw + othMonthlyDraw + (s.ssa || 0);
  const totalDeductions = (s.sbpOn ? (s.sbpAmt || 0) : 0) + tricarePremium;
  const takeHome = totalIncome - totalDeductions - stateTaxMo - fedTaxMo;

  // Phase 1: income available immediately at retirement (no investment draws, no SSA)
  const phase1TakeHome = takeHome - tspMonthlyDraw - hysaMonthlyDraw - othMonthlyDraw - (s.ssa || 0);
  // Phase 2: full picture at 65 (existing takeHome already includes all draws)
  const phase2TakeHome = takeHome;

  // COLA calculation — pension before COLA was pension / 1.025
  const preCola = grossPension > 0 ? Math.round(grossPension / (1 + COLA_2026 / 100)) : 0;
  const colaIncrease = grossPension - preCola;
  const colaAnnual = colaIncrease * 12;

  // Medicare eligibility
  const yearsToMedicare = Math.max(0, 65 - age);
  const medicareYear = new Date().getFullYear() + yearsToMedicare;
  const medicareEligible = age >= 65;

  // Summary chips
  const chips = [
    grossPension > 0       && { label: "Pension", value: fmt(grossPension) },
    effectiveVA > 0        && { label: "VA",      value: fmt(effectiveVA) },
    totalSavingsDraw > 0   && { label: "Savings", value: fmt(Math.round(totalSavingsDraw)) },
    s.ssa > 0              && { label: "SSA",     value: fmt(s.ssa) },
  ].filter(Boolean);

  // ── Canvas infographic ────────────────────────────────────────────────
  function buildCanvas() {
    const C = { bg: "#0f0f14", card: "#17171f", gold: "#d4a017", goldL: "#f0c14b", mut: "#6b7280", lt: "#9ca3af", wh: "#f9fafb", gn: "#34d399", rd: "#f87171" };
    const W = 420, PAD = 24, CELL_H = 72, CELL_GAP = 16, RR = 8;
    const fmt2 = v => "$" + Math.round(v).toLocaleString() + "/mo";
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); };

    const incomeData = [
      grossPension > 0.5            ? ["Pension",        grossPension]       : null,
      effectiveVA  > 0.5            ? ["VA Disability",  effectiveVA]        : null,
      tspMonthlyDraw        > 0.5   ? ["TSP Draw",       tspMonthlyDraw]     : null,
      hysaMonthlyDraw       > 0.5   ? ["HYSA Draw",      hysaMonthlyDraw]    : null,
      othMonthlyDraw        > 0.5   ? ["Other Inv.",      othMonthlyDraw]     : null,
      (s.ssa            || 0) > 0.5 ? ["Social Security", s.ssa]              : null,
    ].filter(Boolean);
    const deductData = [
      (s.sbpOn && (s.sbpAmt || 0) > 0.5) ? ["SBP Premium", s.sbpAmt] : null,
      tricarePremium > 0.5                ? ["TRICARE",     tricarePremium] : null,
    ].filter(Boolean);

    const hasDeduct = deductData.length > 0;
    const gridRows = Math.max(1, Math.ceil(incomeData.length / 2));
    const gridH = gridRows * (CELL_H + CELL_GAP) - CELL_GAP;
    let totalH = PAD + 48 + 16 + gridH + 24 + 60;
    if (hasDeduct) totalH += 24 + deductData.length * (44 + 8) + 16 + 10 + 16;
    totalH += 24 + 68 + 14 + 24 + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2; canvas.height = totalH * 2;
    const ctx = canvas.getContext("2d"); ctx.scale(2, 2);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, totalH);

    let y = PAD;
    // Header
    rr(ctx, PAD, y, 30, 30, 7); ctx.fillStyle = C.gold; ctx.fill();
    ctx.fillStyle = C.bg; ctx.font = "bold 15px -apple-system,system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("M", PAD + 15, y + 15);
    ctx.fillStyle = C.goldL; ctx.font = "600 15px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.fillText("MilCalc", PAD + 38, y + 15);
    ctx.fillStyle = C.mut; ctx.font = "12px -apple-system,system-ui";
    ctx.textAlign = "right"; ctx.fillText("My Retirement Income", W - PAD, y + 15);
    y += 48;

    // Income grid
    y += 16;
    const cellW = (W - PAD * 2 - CELL_GAP) / 2;
    for (let i = 0; i < incomeData.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = PAD + col * (cellW + CELL_GAP);
      const cy = y + row * (CELL_H + CELL_GAP);
      rr(ctx, cx, cy, cellW, CELL_H, RR); ctx.fillStyle = C.card; ctx.fill();
      const [lbl, val] = incomeData[i];
      ctx.fillStyle = C.mut; ctx.font = "500 11px -apple-system,system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(lbl.toUpperCase(), cx + 12, cy + 13);
      ctx.fillStyle = C.wh; ctx.font = "600 18px -apple-system,system-ui";
      ctx.textBaseline = "bottom";
      ctx.fillText(fmt2(val), cx + 12, cy + CELL_H - 13);
    }
    y += gridH + 24;

    // Total row (60px tall)
    rr(ctx, PAD, y, W - PAD * 2, 60, RR);
    ctx.fillStyle = "rgba(212,160,23,0.1)"; ctx.fill();
    ctx.strokeStyle = "rgba(212,160,23,0.3)"; ctx.lineWidth = 1;
    rr(ctx, PAD, y, W - PAD * 2, 60, RR); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.font = "500 12px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("RETIREMENT TAKE-HOME (PHASE 1)", PAD + 16, y + 30);
    ctx.fillStyle = C.goldL; ctx.font = "700 24px -apple-system,system-ui";
    ctx.textAlign = "right";
    ctx.fillText(fmt2(phase1TakeHome), W - PAD - 16, y + 30);
    y += 60;

    // Deductions
    if (hasDeduct) {
      y += 24;
      ctx.fillStyle = C.mut; ctx.font = "bold 11px -apple-system,system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("DEDUCTIONS", PAD, y);
      y += 16;
      for (const [lbl, val] of deductData) {
        rr(ctx, PAD, y, W - PAD * 2, 44, RR); ctx.fillStyle = C.card; ctx.fill();
        ctx.fillStyle = C.lt; ctx.font = "13px -apple-system,system-ui";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(lbl, PAD + 16, y + 22);
        ctx.fillStyle = C.rd; ctx.font = "500 14px -apple-system,system-ui";
        ctx.textAlign = "right";
        ctx.fillText("-$" + Math.round(val).toLocaleString() + "/mo", W - PAD - 16, y + 22);
        y += 44 + 8;
      }
      const cov2 = Math.min(100, Math.round(totalIncome / totalDeductions * 100));
      ctx.fillStyle = C.mut; ctx.font = "11px -apple-system,system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(cov2 + "% income coverage", PAD, y);
      y += 16;
      const pbW = W - PAD * 2;
      rr(ctx, PAD, y, pbW, 10, 5); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
      const fillW = Math.max(10, (Math.min(100, cov2) / 100) * pbW);
      rr(ctx, PAD, y, fillW, 10, 5); ctx.fillStyle = C.gold; ctx.fill();
      y += 10 + 16;
    }

    // Disclaimer
    y += 24;
    rr(ctx, PAD, y, W - PAD * 2, 68, RR);
    ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill();
    const disc = "Estimates only. Actual amounts may vary. Not financial advice. Consult a fee-only financial advisor.";
    ctx.fillStyle = C.mut; ctx.font = "10px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    const mW = W - PAD * 2 - 32; let ln = "", lnY = y + 16;
    for (const w of disc.split(" ")) { const t = ln ? ln + " " + w : w; if (ctx.measureText(t).width > mW && ln) { ctx.fillText(ln, PAD + 16, lnY); lnY += 16; ln = w; } else ln = t; }
    if (ln) ctx.fillText(ln, PAD + 16, lnY);
    y += 68 + 14;

    // Footer
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 10;
    ctx.fillStyle = C.mut; ctx.font = "12px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("Calculate yours free", PAD, y);
    ctx.fillStyle = C.goldL; ctx.font = "500 13px -apple-system,system-ui";
    ctx.textAlign = "right";
    const fT = PUBLIC_DOMAIN; ctx.fillText(fT, W - PAD, y);
    const fW = ctx.measureText(fT).width;
    ctx.strokeStyle = C.goldL; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - PAD - fW, y + 18); ctx.lineTo(W - PAD, y + 18); ctx.stroke();

    return canvas;
  }

  // ── Share handlers ────────────────────────────────────────────────────
  const handleShare = () => {
    setShowShareModal(true);
    track("Share Modal Opened", {});
    requestAnimationFrame(() => {
      const canvas = buildCanvas();
      canvas.toBlob(blob => {
        if (!blob) return;
        shareBlobRef.current = blob;
        setShareImgURL(URL.createObjectURL(blob));
      }, "image/png");
    });
  };
  const closeShareModal = () => {
    setShowShareModal(false);
    if (shareImgURL) { URL.revokeObjectURL(shareImgURL); setShareImgURL(null); }
    shareBlobRef.current = null;
  };
  const canNativeShare = !!navigator.share;
  const doShare = async () => {
    if (!shareBlobRef.current) return;
    const file = new File([shareBlobRef.current], "milcalc-retirement-income.png", { type: "image/png" });
    const shareData = { title: "My Retirement Income — MilCalc", text: `I just calculated my military retirement pay. Calculate yours free at ${PUBLIC_DOMAIN}`, url: PUBLIC_URL };
    const doDownload = () => {
      const url = URL.createObjectURL(shareBlobRef.current);
      const a = document.createElement("a"); a.href = url; a.download = "milcalc-retirement-income.png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      track("Infographic Shared", { method: "download" });
    };
    // Try file share first
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareData.title, text: shareData.text });
        track("Infographic Shared", { method: "native" }); return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    // URL share fallback
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        track("Infographic Shared", { method: "native_url" }); return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    // Download fallback
    doDownload();
  };

  // ── PDF export ────────────────────────────────────────────────────────
  function generatePDF() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const W = 612, H = 792, M = 57;
      let y = M;
      const isLight = pdfTheme === "light";

      // Theme-aware palette
      const ink   = isLight ? [10, 22, 40]    : [203, 213, 225];
      const mut   = isLight ? [55, 65, 81]    : [107, 127, 163];
      const gold  = isLight ? [180, 83, 9]    : [212, 160, 23];
      const red   = isLight ? [185, 28, 28]   : [248, 113, 113];
      const green = isLight ? [42, 122, 75]   : [74, 222, 128];
      const cardBg  = isLight ? [241, 245, 249] : [17, 24, 39];
      const divider = isLight ? [203, 213, 225] : [30, 41, 59];
      const hdrSub  = isLight ? [200, 215, 235] : mut;

      // Page background
      const drawPageBg = () => {
        const bg = isLight ? [255, 255, 255] : [10, 14, 26];
        doc.setFillColor(...bg); doc.rect(0, 0, W, H, "F");
      };

      // Header — always dark navy
      drawPageBg();
      doc.setFillColor(228, 169, 74); doc.rect(0, 0, W, 3, "F");
      doc.setFillColor(17, 24, 39); doc.rect(0, 3, W, 69, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.setTextColor(228, 169, 74); doc.text("MilCalc", M, 44);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      doc.setTextColor(...hdrSub); doc.text((s.name||"").trim() ? `Transition Plan for ${(s.name||"").trim()} · ${PUBLIC_DOMAIN}` : `Transition Plan · ${PUBLIC_DOMAIN}`, M, 60);
      doc.setFontSize(10); doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - M, 60, { align: "right" });
      y = 98;

      const section = (title) => {
        if (y > 700) { doc.addPage(); drawPageBg(); y = 40; }
        y += 14;
        doc.setFillColor(...cardBg); doc.rect(M - 8, y - 4, W - M * 2 + 16, 28, "F");
        doc.setFillColor(...gold); doc.rect(M - 8, y - 4, 3, 28, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.setTextColor(...(isLight ? ink : mut));
        doc.text(title.toUpperCase(), M + 4, y + 14); y += 34;
      };
      const row = (label, value, color = ink) => {
        if (y > 720) { doc.addPage(); drawPageBg(); y = 40; }
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...mut); doc.text(label, M, y);
        doc.setFont("helvetica", "bold"); doc.setTextColor(...color); doc.text(value, W - M, y, { align: "right" });
        doc.setDrawColor(...divider); doc.line(M, y + 5, W - M, y + 5);
        y += 24;
      };

      // ── PAGE 1: Profile + Phase 1 Income ─────────────────────────────────
      section("PROFILE");
      if ((s.age || 0) > 0) row("Current Age", String(s.age));
      if (s.selectedState) row("Home State", s.selectedState);
      if (isAutoCalc) {
        row("Pay Grade", s.autoGrade || "O-5");
        row("Years of Service", `${s.autoYos || 20} YOS`);
        row("Retirement System", s.autoRetSystem || "High-3");
        row("Input Mode", "Auto-Calculated");
      } else {
        row("Input Mode", "Manual Entry");
      }
      if (effectiveDeps.startsWith("sp")) row("Filing Status", "Married Filing Jointly");
      y += 8;

      section(age >= 65 ? "CURRENT MONTHLY INCOME" : "PHASE 1 — RETIREMENT INCOME (AVAILABLE NOW)");
      if (grossPension > 0) row("Gross Pension",           fmt(grossPension) + "/mo",   gold);
      if (effectiveVA  > 0) row("VA Disability (tax-free)", fmt(effectiveVA) + "/mo",   gold);
      // If already 65+, show investment draws and SSA in same section
      if (age >= 65) {
        if (tspMonthlyDraw > 0 && isSplit) {
          if (tspTradDraw > 0) row(`TSP Traditional Draw (${fmt(Math.round(tspTradAt65))} bal · taxable)`, fmt(Math.round(tspTradDraw)) + "/mo", green);
          if (tspRothDraw > 0) row(`TSP Roth Draw (${fmt(Math.round(tspRothAt65))} bal · tax-free)`, fmt(Math.round(tspRothDraw)) + "/mo", green);
        } else if (tspMonthlyDraw > 0) row(`TSP Draw (${fmt(Math.round(tspAt65))} bal · 4% rule · ${tspType === "roth" ? "tax-free" : "taxable"})`, fmt(Math.round(tspMonthlyDraw)) + "/mo", green);
        if (hysaMonthlyDraw > 0) row(`HYSA Draw (${fmt(Math.round(hysaAt65))} bal · 4% rule)`, fmt(Math.round(hysaMonthlyDraw)) + "/mo", green);
        if (othMonthlyDraw > 0) row(`Investments Draw (${fmt(Math.round(othAt65))} bal · 4% rule)`, fmt(Math.round(othMonthlyDraw)) + "/mo", green);
        if ((s.ssa || 0) > 0) row("Social Security", fmt(s.ssa) + "/mo", green);
      }
      y += 8;

      section("MONTHLY DEDUCTIONS");
      if (s.sbpOn && (s.sbpAmt || 0) > 0) row("SBP Premium", "-" + fmt(s.sbpAmt) + "/mo", red);
      if (tricarePremium > 0) row("TRICARE Premium", "-" + fmt(tricarePremium) + "/mo", red);
      if (stateTaxMo > 0) row(`State Income Tax (${s.selectedState || "Texas"})`, "-" + fmt(Math.round(stateTaxMo)) + "/mo", red);
      if (fedTaxMo > 0) row(`Federal Income Tax (est. ${(fedTax.effectiveRate * 100).toFixed(1)}% eff.)`, "-" + fmt(fedTaxMo) + "/mo", red);
      y += 8;

      // Take-home prominent box (for age >= 65, show phase2TakeHome since draws are in income section)
      const pdfTakeHome = age >= 65 ? phase2TakeHome : phase1TakeHome;
      doc.setFillColor(...(isLight ? [226, 232, 240] : [30, 41, 59])); doc.rect(M - 8, y - 2, W - M * 2 + 16, 38, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink);
      doc.text(age >= 65 ? "Total Monthly Take-Home (Current)" : "Monthly Take-Home at Retirement (Phase 1)", M + 4, y + 22);
      doc.setTextColor(...(pdfTakeHome >= 0 ? green : red));
      doc.text(fmt(Math.round(pdfTakeHome)) + "/mo", W - M, y + 22, { align: "right" });
      y += 46; y += 12;

      // ── PAGE 2: Phase 2 — Projected at 65 (only if under 65 and investments exist) ──
      if (age < 65 && (tspMonthlyDraw > 0 || hysaMonthlyDraw > 0 || othMonthlyDraw > 0 || (s.ssa || 0) > 0)) {
        doc.addPage(); drawPageBg(); y = 40;
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(...mut);
        const p2intro = "The following projections assume continued investment growth and are not available at retirement. These supplement your retirement income starting at age 65.";
        const p2lines = doc.splitTextToSize(p2intro, W - M * 2);
        doc.text(p2lines, M, y); y += p2lines.length * 15 + 12;

        if (tspMonthlyDraw > 0 || hysaMonthlyDraw > 0 || othMonthlyDraw > 0) {
          section("PROJECTED ACCOUNT BALANCES AT AGE 65");
          if (tspMonthlyDraw > 0) {
            if (isSplit) {
              if (tspTradAt65 > 0) { row("TSP Traditional Balance at 65", fmt(Math.round(tspTradAt65))); row("TSP Traditional Draw (4% rule) — taxable", fmt(Math.round(tspTradDraw)) + "/mo", green); }
              if (tspRothAt65 > 0) { row("TSP Roth Balance at 65", fmt(Math.round(tspRothAt65))); row("TSP Roth Draw (4% rule) — tax-free", fmt(Math.round(tspRothDraw)) + "/mo", green); }
            } else {
              row("TSP Balance at 65", fmt(Math.round(tspAt65)));
              row(`TSP Monthly Draw (4% rule) — ${tspType === "roth" ? "tax-free" : "taxable"}`, fmt(Math.round(tspMonthlyDraw)) + "/mo", green);
            }
          }
          if (hysaMonthlyDraw > 0) {
            row("HYSA Balance at 65", fmt(Math.round(hysaAt65)));
            row("HYSA Monthly Draw (4% rule)", fmt(Math.round(hysaMonthlyDraw)) + "/mo", green);
          }
          if (othMonthlyDraw > 0) {
            row("Other Investments Balance at 65", fmt(Math.round(othAt65)));
            row("Other Investments Monthly Draw (4% rule)", fmt(Math.round(othMonthlyDraw)) + "/mo", green);
          }
          row("Total Monthly Investment Draws at 65", fmt(Math.round(tspMonthlyDraw + hysaMonthlyDraw + othMonthlyDraw)) + "/mo", green);
          y += 12;
        }

        section("FULL INCOME AT AGE 65");
        row("Phase 1 Take-Home (from page 1)", fmt(phase1TakeHome) + "/mo", gold);
        if (tspMonthlyDraw > 0 && isSplit) {
          if (tspTradDraw > 0) row("+ TSP Traditional Draw at 65 (taxable)", fmt(Math.round(tspTradDraw)) + "/mo", green);
          if (tspRothDraw > 0) row("+ TSP Roth Draw at 65 (tax-free)", fmt(Math.round(tspRothDraw)) + "/mo", green);
        } else if (tspMonthlyDraw > 0) row(`+ TSP Draw at 65 (${tspType === "roth" ? "tax-free" : "taxable"})`, fmt(Math.round(tspMonthlyDraw)) + "/mo", green);
        if (hysaMonthlyDraw > 0) row("+ HYSA Draw at 65", fmt(Math.round(hysaMonthlyDraw)) + "/mo", green);
        if (othMonthlyDraw > 0) row("+ Other Investments Draw at 65", fmt(Math.round(othMonthlyDraw)) + "/mo", green);
        if ((s.ssa || 0) > 0) row("+ Social Security at 65", fmt(s.ssa) + "/mo", green);
        y += 6;
        doc.setFillColor(...(isLight ? [226, 232, 240] : [30, 41, 59])); doc.rect(M - 8, y - 2, W - M * 2 + 16, 38, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text("Total Monthly Income at Age 65", M + 4, y + 22);
        doc.setFontSize(18); doc.setTextColor(...green);
        doc.text(fmt(Math.round(phase2TakeHome)) + "/mo", W - M, y + 22, { align: "right" });
        y += 46; y += 16;

        section("ASSUMPTIONS");
        row("TSP Growth Rate", `${s.tspGrowthRate || 7}% annually (blended C/S/I funds historical avg.)`);
        row("HYSA APY", `${s.hysaApy || 4.5}% (fluctuates with Federal Reserve rate)`);
        row("Other Investments", "7% annually (S&P 500 historical avg. after inflation)");
        row("Withdrawal Rate", "4% annually (Bengen 1994, Trinity Study)");
        y += 6;
        doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...mut);
        doc.text("These are projections based on historical averages and are not guaranteed.", M, y); y += 14;
      }

      // Debriefed promo box on last page
      const lastPg = doc.getNumberOfPages(); doc.setPage(lastPg);
      const promoY = 720;
      doc.setDrawColor(...gold); doc.setLineWidth(1);
      doc.rect(M - 6, promoY, W - M * 2 + 12, 36, "S");
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...gold);
      doc.text("Planning your transition?", M, promoY + 11);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...mut);
      doc.text("Translate your military experience into a civilian resume at", M, promoY + 22);
      doc.setTextColor(...gold); doc.text(PARENT_BRAND_DOMAIN, M, promoY + 32);

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(...mut);
        doc.text(`Generated by MilCalc · ${PUBLIC_DOMAIN} · Estimates only — not financial advice. Tax estimates use 2026 standard deduction and marginal rates. Consult a tax professional.`, M, 762, { maxWidth: W - M * 2, lineHeightFactor: 1.6 });
      }

      doc.save("milcalc-retirement-income.pdf");
      track("PDF Exported", {
        sections_included: ["Income", "Deductions", "Take-Home"],
        section_count: 3,
        retirement_type: "Active",
        has_va: (s.va || 0) > 0,
        has_sbp: !!s.sbpOn,
        has_tricare: s.tricarePlan !== "none",
        state: "",
        yos: 0,
        pay_grade: "",
        has_bah: false,
        has_preretirement_comp: false,
      });
    } catch (err) {
      console.error("PDF export error:", err);
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────
  const prevPension = useRef(null);
  useEffect(() => {
    if ((s.pension || 0) > 0 && s.pension !== prevPension.current) {
      prevPension.current = s.pension;
      track("Pension Calculated", {
        years_of_service: 0,
        retirement_type: "Active",
        monthly_amount: r100(s.pension),
      });
    }
  }, [s.pension]);

  const prevVA = useRef(null);
  useEffect(() => {
    if ((s.va || 0) > 0 && s.va !== prevVA.current) {
      prevVA.current = s.va;
      track("VA Rating Selected", {
        rating: 0,
        dependency_status: "unknown",
        children: 0,
        monthly_amount: r100(s.va),
      });
    }
  }, [s.va]);

  return (
    <>
      <style>{DS_CSS + PAGE_CSS}</style>
      <NavHeader />

      <div className="ret2-wrap">
        <div className="ret2-content">

          <SummaryBar
            label="Retirement income (Phase 1)"
            amount={fmt(phase1TakeHome)}
            subtitle="After deductions · Updated March 2026"
            at65={phase2TakeHome !== phase1TakeHome ? fmt(Math.round(phase2TakeHome)) : undefined}
            chips={chips}
          />

          <div className="ret2-two-col">
            <div>
          {/* ── INCOME TRACKER ── */}
          <SectionHeader>Income Tracker</SectionHeader>
          <InfoCard title="Monthly Income">
            {/* ── Auto / Manual toggle ── */}
            <div style={{ display:"flex", gap:6, margin:"0 0 12px", padding:"0 0 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {[{ v: false, l: "Manual Entry" }, { v: true, l: "Auto-Calculate" }].map(t => (
                <button key={String(t.v)} type="button"
                  onClick={() => set("autoCalc", t.v)}
                  style={{
                    flex:1, fontSize:12, fontWeight:600, padding:"6px 0", borderRadius:8, cursor:"pointer",
                    background: isAutoCalc === t.v ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isAutoCalc === t.v ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
                    color: isAutoCalc === t.v ? "#f0c14b" : "#9ca3af",
                    fontFamily:"inherit",
                  }}
                >{t.l}</button>
              ))}
            </div>

            {/* ── State selector (always visible) ── */}
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">State</div></div>
              <div className="ds-sel">
                <select value={s.selectedState || "Texas"} onChange={e => set("selectedState", e.target.value)}>
                  {Object.keys(STATES).sort().map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
            {stateInfo && !stateInfo.ok && (
              <div style={{ fontSize:11, color:"#f87171", padding:"4px 0 8px", lineHeight:1.4 }}>
                {stateInfo.note}
              </div>
            )}
            {stateInfo && stateInfo.ok && (
              <div style={{ fontSize:11, color:"#4ade80", padding:"4px 0 8px", lineHeight:1.4 }}>
                {stateInfo.label}
              </div>
            )}

            {/* ── AUTO-CALCULATE INPUTS ── */}
            {isAutoCalc && (
              <div style={{ background:"rgba(212,160,23,0.04)", border:"1px solid rgba(212,160,23,0.12)", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#f0c14b", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>Auto-Calculate from Pay Grade</div>

                {/* Pay Grade */}
                <div className="ds-income-row">
                  <div><div className="ds-income-lbl">Pay Grade</div></div>
                  <div className="ds-sel">
                    <select value={s.autoGrade || "O-5"} onChange={e => set("autoGrade", e.target.value)}>
                      {GRADE_GROUPS.map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.grades.map(gr => (
                            <option key={gr} value={gr}>{GRADE_LABELS[gr]}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                {/* YOS */}
                <div className="ds-income-row">
                  <div><div className="ds-income-lbl">Years of Service</div></div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <input
                      className="ret2-num"
                      type="text" inputMode="numeric" placeholder="20"
                      value={s.autoYos || ""}
                      onChange={e => set("autoYos", Math.min(40, Math.max(1, Number(e.target.value.replace(/[^0-9]/g, "")) || 20)))}
                      onFocus={e => e.target.select()}
                      style={{ width:48 }}
                    />
                    <span style={{ fontSize:12, color:"#6b7280" }}>YOS</span>
                  </div>
                </div>

                {/* Retirement System */}
                <div className="ds-income-row">
                  <div><div className="ds-income-lbl">Retirement System</div></div>
                  <div style={{ display:"flex", gap:5 }}>
                    {["High-3","BRS","REDUX"].map(sys => (
                      <button key={sys} type="button"
                        onClick={() => set("autoRetSystem", sys)}
                        style={{
                          fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                          background: (s.autoRetSystem||"High-3") === sys ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                          border:`1px solid ${(s.autoRetSystem||"High-3") === sys ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
                          color:(s.autoRetSystem||"High-3") === sys ? "#f0c14b" : "#9ca3af",
                          fontFamily:"inherit",
                        }}
                      >{sys}</button>
                    ))}
                  </div>
                </div>

                {/* VA Rating */}
                <div className="ds-income-row">
                  <div><div className="ds-income-lbl">VA Disability Rating</div></div>
                  <div className="ds-sel">
                    <select value={s.autoVaRating || 0} onChange={e => set("autoVaRating", Number(e.target.value))}>
                      <option value={0}>No rating / 0%</option>
                      {[10,20,30,40,50,60,70,80,90,100].map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dependency status */}
                <div className="ds-income-row">
                  <div><div className="ds-income-lbl">Dependency Status</div></div>
                  <div className="ds-sel">
                    <select value={s.autoDeps || "s0"} onChange={e => set("autoDeps", e.target.value)}>
                      <option value="s0">Veteran alone</option>
                      <option value="sp0">+Spouse</option>
                      <option value="sp1">+Spouse+Child</option>
                      <option value="sp2">+Spouse+2 Children</option>
                      <option value="sp3">+Spouse+3 Children</option>
                      <option value="s1">Single+Child</option>
                      <option value="s2">Single+2 Children</option>
                      <option value="s3">Single+3 Children</option>
                    </select>
                  </div>
                </div>

                {/* Schoolchildren 18–23 */}
                <div className="ds-income-row">
                  <div>
                    <div className="ds-income-lbl">Schoolchildren 18–23</div>
                    <div className="ds-income-lbl-sub">Full-time, approved school program</div>
                  </div>
                  <div className="ds-sel">
                    <select value={s.autoSchoolKids || 0} onChange={e => set("autoSchoolKids", Number(e.target.value))}>
                      <option value={0}>None</option>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Dependent parents */}
                <div className="ds-income-row">
                  <div>
                    <div className="ds-income-lbl">Dependent Parents</div>
                    <div className="ds-income-lbl-sub">≥50% supported by you</div>
                  </div>
                  <div className="ds-sel">
                    <select value={s.autoDepParents || 0} onChange={e => set("autoDepParents", Number(e.target.value))}>
                      <option value={0}>None</option>
                      <option value={1}>1 dependent parent</option>
                      <option value={2}>2 dependent parents</option>
                    </select>
                  </div>
                </div>

                {/* Spouse Aid & Attendance */}
                {autoHasSpouse && (
                  <div className="ds-income-row">
                    <div><div className="ds-income-lbl">Spouse receives Aid & Attendance</div></div>
                    <div style={{ display:"flex", gap:5 }}>
                      {[["No", false],["Yes", true]].map(([l, v]) => (
                        <button key={l} type="button"
                          onClick={() => set("autoSpouseAA", v)}
                          style={{
                            fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:6, cursor:"pointer",
                            background: !!s.autoSpouseAA === v ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                            border:`1px solid ${!!s.autoSpouseAA === v ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
                            color: !!s.autoSpouseAA === v ? "#f0c14b" : "#9ca3af",
                            fontFamily:"inherit",
                          }}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Computed values display */}
                {autoGrossPension > 0 && (
                  <div style={{ marginTop:10, padding:"8px 10px", background:"rgba(212,160,23,0.06)", borderRadius:8, fontSize:12, color:"#f9fafb" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ color:"#9ca3af" }}>Pension ({s.autoGrade} · {s.autoYos} YOS · {s.autoRetSystem||"High-3"})</span>
                      <span style={{ color:"#f0c14b", fontWeight:600 }}>{fmt(autoGrossPension)}/mo</span>
                    </div>
                    {autoVaAmt > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ color:"#9ca3af" }}>VA ({s.autoVaRating}%)</span>
                        <span style={{ color:"#34d399", fontWeight:600 }}>{fmt(autoVaAmt)}/mo</span>
                      </div>
                    )}
                  </div>
                )}
                {autoGrossPension === 0 && (
                  <HintBox>Need 20+ YOS for an active duty pension. Adjust YOS above.</HintBox>
                )}
              </div>
            )}

            {/* ── MANUAL INPUTS (shown only when not in auto mode) ── */}
            {!isAutoCalc && (
              <>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Monthly Pension (gross)</div></div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                <input
                  className="ret2-num"
                  type="text" inputMode="numeric" placeholder="0"
                  value={s.pension || ""}
                  onChange={e => set("pension", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  onFocus={e => e.target.select()}
                />
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">VA Disability</div>
                <div className="ds-income-lbl-sub">Tax-free</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="ds-sel">
                  <select value={s.vaRating || 0} onChange={e => { const r = Number(e.target.value); set("vaRating", r); track("VA Rating Selected", { rating: r }); }}>
                    {[0,10,20,30,40,50,60,70,80,90,100].map(r => (
                      <option key={r} value={r}>{r === 0 ? "No rating" : `${r}%`}</option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                <input
                  className="ret2-num"
                  type="text" inputMode="numeric" placeholder="0"
                  value={s.va || ""}
                  onChange={e => set("va", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  onFocus={e => e.target.select()}
                />
              </div>
            </div>
            {(s.vaRating || 0) > 0 && (
              <div style={{ fontSize: 11, color: "#6b7280", padding: "4px 0 8px", lineHeight: 1.4 }}>
                <strong style={{ color: "#9ca3af" }}>Priority Group {getVAPriorityGroup(s.vaRating)}</strong>: {VA_PRIORITY_GROUPS[getVAPriorityGroup(s.vaRating) - 1].copay}
              </div>
            )}
              </>
            )}
            {/* VA priority group hint — auto mode */}
            {isAutoCalc && (s.autoVaRating || 0) > 0 && (
              <div style={{ fontSize: 11, color: "#6b7280", padding: "4px 0 8px", lineHeight: 1.4 }}>
                <strong style={{ color: "#9ca3af" }}>Priority Group {getVAPriorityGroup(s.autoVaRating)}</strong>: {VA_PRIORITY_GROUPS[getVAPriorityGroup(s.autoVaRating) - 1].copay}
              </div>
            )}
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>TSP Type:</div>
              <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                {[["traditional","Traditional"],["roth","Roth"],["split","Split"]].map(([t,l]) => (
                  <button key={t} type="button"
                    onClick={() => set("tspType", t)}
                    style={{
                      fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:6,
                      background: (s.tspType||"traditional") === t ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${(s.tspType||"traditional") === t ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
                      color: (s.tspType||"traditional") === t ? "#f0c14b" : "#9ca3af",
                      cursor:"pointer", fontFamily:"inherit",
                    }}
                  >{l}</button>
                ))}
              </div>
              {isSplit && (
                <>
                  <div className="ds-income-row">
                    <div><div className="ds-income-lbl">Traditional Balance <span style={{fontSize:10,color:"#9ca3af"}}>(taxable)</span></div></div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                      <input className="ret2-num" type="number" min={0} placeholder="0"
                        value={s.tspTradBalance||""} onChange={e=>set("tspTradBalance",Number(e.target.value)||0)}
                        onFocus={e=>e.target.select()} />
                    </div>
                  </div>
                  <div className="ds-income-row">
                    <div><div className="ds-income-lbl">Roth Balance <span style={{fontSize:10,color:"#4ade80"}}>(tax-free)</span></div></div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                      <input className="ret2-num" type="number" min={0} placeholder="0"
                        value={s.tspRothBalance||""} onChange={e=>set("tspRothBalance",Number(e.target.value)||0)}
                        onFocus={e=>e.target.select()} />
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* ── Deductions ── */}
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">SBP Premium</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button
                  type="button"
                  style={{
                    background: s.sbpOn ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${s.sbpOn ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: s.sbpOn ? "#f87171" : "#9ca3af",
                    borderRadius: 8, padding: "4px 10px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    minHeight: 44, fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onClick={() => { const on = !s.sbpOn; set("sbpOn", on); if (on) track("SBP Calculated", { elected: true, monthly_pension: s.pension || 0 }); }}
                >
                  {s.sbpOn ? "On" : "Off"}
                </button>
                {s.sbpOn && (
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                    <input
                      className="ret2-num"
                      type="text" inputMode="numeric" placeholder="0"
                      value={s.sbpAmt || ""}
                      onChange={e => set("sbpAmt", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                      onFocus={e => e.target.select()}
                    />
                  </div>
                )}
              </div>
            </div>
            {s.sbpOn && s.sbpAmt > 0 && (
              <IncomeRow
                label="SBP Deduction"
                sub="Pre-tax deduction from pension"
                value={`−${fmt(s.sbpAmt)}`}
                color="red"
              />
            )}
            <div className="ds-income-row">
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div className="ds-income-lbl">TRICARE Plan</div>
                <button
                  type="button"
                  onClick={() => setShowTricareInfo(v => !v)}
                  style={{
                    width:18, height:18, borderRadius:"50%",
                    background: showTricareInfo ? "rgba(212,160,23,0.2)" : "rgba(212,160,23,0.08)",
                    border: "1px solid rgba(212,160,23,0.35)",
                    color:"#d4a017", fontSize:11, fontWeight:700,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, lineHeight:1, padding:0, fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent",
                  }}
                  aria-label="TRICARE plan info"
                >ⓘ</button>
              </div>
              <div className="ds-sel">
                <select value={s.tricarePlan} onChange={e => { set("tricarePlan", e.target.value); track("TRICARE Plan Selected", { plan: e.target.value }); }}>
                  {TRICARE_OPTS.map(t => (
                    <option key={t.v} value={t.v}>{t.l}{t.amt > 0 ? ` — ${fmt(t.amt)}/mo` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            {showTricareInfo && (
              <div style={{ padding:"12px 16px", background:"rgba(212,160,23,0.05)", borderBottom:"1px solid rgba(212,160,23,0.12)", fontSize:13, lineHeight:1.6, color:"#d1d5db" }}>
                <div style={{ fontWeight:700, color:"#f0c14b", marginBottom:8, fontSize:12 }}>Which group am I?</div>
                <div style={{ marginBottom:6 }}><strong style={{ color:"#f9fafb" }}>Group A</strong> — Retired before April 1, 1995, or were on active duty on that date. Lower premiums.</div>
                <div style={{ marginBottom:10 }}><strong style={{ color:"#f9fafb" }}>Group B</strong> — Retired on or after April 1, 1995. Standard premiums. Most retirees today are Group B.</div>
                <div style={{ padding:"6px 10px", background:"rgba(212,160,23,0.1)", borderRadius:6, fontSize:12, marginBottom:12, color:"#f0c14b", fontWeight:500 }}>
                  Not sure which group? If you retired after 1995 you are Group B.
                </div>
                <div style={{ fontWeight:700, color:"#f0c14b", marginBottom:8, fontSize:12 }}>Plan types</div>
                <div style={{ marginBottom:6 }}><strong style={{ color:"#f9fafb" }}>TRICARE Prime</strong> — HMO-style. Lowest out-of-pocket, requires referrals, must live near MTF. Best for most retirees near a base.</div>
                <div style={{ marginBottom:6 }}><strong style={{ color:"#f9fafb" }}>TRICARE Select</strong> — PPO-style. More provider flexibility, higher cost sharing, no referrals needed. Good if you live far from a base.</div>
                <div style={{ marginBottom:6 }}><strong style={{ color:"#f9fafb" }}>TRICARE for Life</strong> — For retirees 65+ with Medicare Part B. Medicare pays first, TRICARE pays second. Essentially free coverage.</div>
                <div style={{ marginBottom:6 }}><strong style={{ color:"#f9fafb" }}>TRICARE Reserve Select</strong> — For Selected Reserve members not on active duty orders. Monthly premium required.</div>
                <div><strong style={{ color:"#f9fafb" }}>TRICARE Retired Reserve</strong> — For retired Reserve members under 60 not yet eligible for retiree coverage.</div>
              </div>
            )}
            {tricarePremium > 0 && (
              <IncomeRow
                label="TRICARE Premium"
                sub={tricareOpt.l}
                value={`−${fmt(tricarePremium)}`}
                color="red"
              />
            )}
            {stateTaxMo > 0 && (
              <IncomeRow
                label="State Income Tax (est.)"
                sub={stateInfo.note}
                value={`−${fmt(Math.round(stateTaxMo))}`}
                color="red"
              />
            )}
            {fedTaxMo > 0 && (
              <IncomeRow
                label="Federal Income Tax (est.)"
                sub={`${(fedTax.effectiveRate * 100).toFixed(1)}% effective rate`}
                value={`−${fmt(fedTaxMo)}`}
                color="red"
              />
            )}
            <TotalRow label={age >= 65 ? "Base Income (pension + VA − deductions)" : "Monthly Take-Home at Retirement (Phase 1)"} value={fmt(phase1TakeHome)} />

            {/* ── Phase 2 / Current investment draws ── */}
            {(tspMonthlyDraw > 0 || hysaMonthlyDraw > 0 || othMonthlyDraw > 0 || (s.ssa || 0) > 0) && (
              <>
                <div style={{ padding:"12px 16px 4px", borderTop:"2px solid rgba(212,160,23,0.3)", background:"rgba(255,255,255,0.015)", marginTop:4 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color: age >= 65 ? "#34d399" : "#d4a017", marginBottom:3 }}>
                    {age >= 65 ? "Current Investment & Other Income" : "Phase 2 — Projected at Age 65"}
                  </div>
                  <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.5 }}>
                    {age >= 65
                      ? "Available now — based on current balances and 4% withdrawal rule."
                      : "Not available at retirement — assumes continued investment growth starting at age 65."}
                  </div>
                </div>
                {tspMonthlyDraw > 0 && isSplit ? (
                  <>
                    {tspTradDraw > 0.5 && <IncomeRow label="TSP Traditional Draw" sub={`4% rule · taxable (${fmt(Math.round(tspTradAt65))} bal)`} value={`+${fmt(Math.round(tspTradDraw))}`} color="green" />}
                    {tspRothDraw > 0.5 && <IncomeRow label="TSP Roth Draw" sub={`4% rule · tax-free (${fmt(Math.round(tspRothAt65))} bal)`} value={`+${fmt(Math.round(tspRothDraw))}`} color="green" />}
                  </>
                ) : tspMonthlyDraw > 0 && (
                  <IncomeRow label="TSP Monthly Draw" sub={`4% rule · ${tspType === "roth" ? "tax-free" : "taxable"} (${fmt(Math.round(tspAt65))} bal)`} value={`+${fmt(Math.round(tspMonthlyDraw))}`} color="green" />
                )}
                {hysaMonthlyDraw > 0 && (
                  <IncomeRow label="HYSA Monthly Draw" sub={age >= 65 ? `4% rule (${fmt(Math.round(hysaAt65))} bal)` : `4% rule · at 65 (${fmt(Math.round(hysaAt65))} bal)`} value={`+${fmt(Math.round(hysaMonthlyDraw))}`} color="green" />
                )}
                {othMonthlyDraw > 0 && (
                  <IncomeRow label="Investments Monthly Draw" sub={age >= 65 ? `4% rule (${fmt(Math.round(othAt65))} bal)` : `4% rule · at 65 (${fmt(Math.round(othAt65))} bal)`} value={`+${fmt(Math.round(othMonthlyDraw))}`} color="green" />
                )}
                {(s.ssa || 0) > 0 && (
                  <IncomeRow label="Social Security" sub="Your ssa.gov estimate" value={`+${fmt(s.ssa)}`} color="green" />
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"rgba(52,211,153,0.06)", borderTop:"1px solid rgba(52,211,153,0.15)" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#34d399" }}>
                    {age >= 65 ? "Total Current Monthly Income" : "Total Monthly Income at Age 65"}
                  </span>
                  <span style={{ fontSize:20, fontWeight:700, color:"#34d399", letterSpacing:"-0.5px" }}>{fmt(Math.round(phase2TakeHome))}/mo</span>
                </div>
              </>
            )}
          </InfoCard>

          {/* ── SAVINGS & INVESTMENTS ── */}
          <SectionHeader>Savings &amp; Investments</SectionHeader>
          <InfoCard title="Savings Projections">
            {/* TSP */}
            <div style={{ fontWeight:600, fontSize:13, color:"#9ca3af", marginBottom:8 }}>
              Thrift Savings Plan (TSP)
            </div>
            {!isSplit && (
              <div className="ds-income-row">
                <div><div className="ds-income-lbl">Current Balance</div></div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                  <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                    value={s.tspBalance||""} onChange={e=>set("tspBalance",Number(e.target.value.replace(/[^0-9]/g,""))||0)}
                    onFocus={e=>e.target.select()} />
                </div>
              </div>
            )}
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Growth Rate %</div>
                <div className="ds-income-lbl-sub">C Fund ~10% historical · blended 7–8%</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="text" inputMode="decimal" placeholder="7"
                  value={s.tspGrowthRate||""} onChange={e=>set("tspGrowthRate",Number(e.target.value.replace(/[^0-9.]/g,""))||7)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            {tspAt65 > 100 && !isSplit && (
              <IncomeRow label={`TSP ${atAge} (${fmt(Math.round(tspAt65))})`}
                sub={`4% rule · ${tspType === "roth" ? "tax-free" : "taxable"} · Bengen 1994`}
                value={`${fmt(Math.round(tspMonthlyDraw))}/mo`}
                color="green" />
            )}
            {tspAt65 > 100 && isSplit && (
              <>
                {tspTradAt65 > 100 && <IncomeRow label={`TSP Traditional ${atAge} (${fmt(Math.round(tspTradAt65))})`} sub="4% rule · taxable" value={`${fmt(Math.round(tspTradDraw))}/mo`} color="green" />}
                {tspRothAt65 > 100 && <IncomeRow label={`TSP Roth ${atAge} (${fmt(Math.round(tspRothAt65))})`} sub="4% rule · tax-free" value={`${fmt(Math.round(tspRothDraw))}/mo`} color="green" />}
              </>
            )}

            {/* HYSA */}
            <div style={{ fontWeight:600, fontSize:13, color:"#9ca3af", margin:"12px 0 8px" }}>
              High-Yield Savings (HYSA)
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Current Balance</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                  value={s.hysaBalance||""} onChange={e=>set("hysaBalance",Number(e.target.value.replace(/[^0-9]/g,""))||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Monthly Contribution</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                  value={s.hysaContribMo||""} onChange={e=>set("hysaContribMo",Number(e.target.value.replace(/[^0-9]/g,""))||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">APY %</div>
                <div className="ds-income-lbl-sub">Current HYSA rates 4–5% APY</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="text" inputMode="decimal" placeholder="4.5"
                  value={s.hysaApy||""} onChange={e=>set("hysaApy",Number(e.target.value.replace(/[^0-9.]/g,""))||4.5)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            {hysaAt65 > 100 && (
              <IncomeRow label={`HYSA ${atAge} (${fmt(Math.round(hysaAt65))})`}
                sub={`Monthly draw ${atAge} (4% rule)`}
                value={`${fmt(Math.round(hysaMonthlyDraw))}/mo`}
                color="green" />
            )}

            {/* Other Investments */}
            <div style={{ fontWeight:600, fontSize:13, color:"#9ca3af", margin:"12px 0 8px" }}>
              Other Investments
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Current Balance</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                  value={s.othBalance||""} onChange={e=>set("othBalance",Number(e.target.value.replace(/[^0-9]/g,""))||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Monthly Contribution</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                  value={s.othContribMo||""} onChange={e=>set("othContribMo",Number(e.target.value.replace(/[^0-9]/g,""))||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Growth Rate %</div>
                <div className="ds-income-lbl-sub">S&amp;P 500 historical avg ~10%</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="text" inputMode="decimal" placeholder="7"
                  value={s.othGrowthRate||""} onChange={e=>set("othGrowthRate",Number(e.target.value.replace(/[^0-9.]/g,""))||7)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            {othAt65 > 100 && (
              <IncomeRow label={`Investments ${atAge} (${fmt(Math.round(othAt65))})`}
                sub={`Monthly draw ${atAge} (4% rule)`}
                value={`${fmt(Math.round(othMonthlyDraw))}/mo`}
                color="green" />
            )}

            {totalSavingsDraw > 0 && (
              <TotalRow label={`Total savings draw ${atAge}`} value={`${fmt(Math.round(totalSavingsDraw))}/mo`} />
            )}
          </InfoCard>

            </div>
            <div>
          {/* ── COLA TRACKER ── */}
          <SectionHeader>COLA Tracker</SectionHeader>
          <div className="ret2-cola-card">
            <IncomeRow
              label="2026 COLA"
              sub="Effective January 1, 2026 · Source: SSA.gov"
              value={`+${COLA_2026}%`}
              color="green"
            />
            {grossPension > 0 && (
              <>
                <IncomeRow
                  label="Pension before COLA"
                  sub="Estimated Dec 2025 amount"
                  value={fmt(preCola)}
                  color="white"
                />
                <IncomeRow
                  label="Pension after COLA"
                  sub="Current 2026 amount"
                  value={fmt(grossPension)}
                  color="gold"
                />
                <IncomeRow
                  label="Annual COLA increase"
                  sub={`${fmt(colaIncrease)}/mo × 12 months`}
                  value={`+${fmt(colaAnnual)}/yr`}
                  color="green"
                />
              </>
            )}
            {!grossPension && (
              <HintBox>{isAutoCalc ? "Select your pay grade and YOS above to see your COLA breakdown." : "Enter your current pension above to see your COLA breakdown."}</HintBox>
            )}
          </div>

          {/* ── SOCIAL SECURITY ── */}
          <SectionHeader>Social Security</SectionHeader>
          <InfoCard title="SSA Estimate">
            <div className="ds-field-row">
              <span className="ds-field-label">Monthly Estimate</span>
              <div className="ds-field-value">
                <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                  <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                  <input
                    className="ret2-num"
                    type="text" inputMode="numeric"
                    placeholder="Enter from ssa.gov"
                    value={s.ssa || ""}
                    onChange={e => set("ssa", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    onFocus={e => e.target.select()}
                  />
                </div>
              </div>
            </div>
            {s.ssa > 0 && (
              <IncomeRow
                label="Social Security"
                sub="Included in monthly total above"
                value={fmt(s.ssa)}
                color="green"
              />
            )}
            <div className="ret2-ssa-hint">
              Get your personalized estimate at{" "}
              <span style={{ color:"#d4a017" }}>ssa.gov/myaccount</span>
              {" "}— plug it in above to see your full retirement picture including Social Security.
            </div>
          </InfoCard>

          {/* ── CURRENT AGE FOR MEDICARE ── */}
          <div className="ds-card" style={{ marginBottom: "1rem" }}>
            <div className="ds-field-row">
              <span className="ds-field-label">Current Age</span>
              <div className="ds-field-value">
                <input
                  className="ret2-num"
                  type="text" inputMode="numeric" placeholder="45"
                  value={s.age || ""}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const n = parseInt(raw, 10);
                    if (raw === "" || isNaN(n)) return;
                    set("age", n);
                  }}
                />
              </div>
            </div>
            {s.age > 0 && (s.age < 18 || s.age > 100) && (
              <div style={{ fontSize: 11, color: "#b45309", padding: "0 16px 8px" }}>
                Typical range is 18–100
              </div>
            )}
          </div>

          </div>
          </div>{/* end ret2-two-col */}

          {/* ── MEDICARE / TRICARE ── */}
          <SectionHeader>Medicare & TRICARE</SectionHeader>
          <div className="ret2-medicare">
            <div className="ret2-med-badge">
              ✓ {medicareEligible ? "TRICARE For Life" : "TRICARE Prime"}
            </div>
            <div className="ret2-med-row">
              <span className="ret2-med-lbl">Current coverage</span>
              <span className="ret2-med-val">{medicareEligible ? "TRICARE For Life" : "TRICARE Prime / Select"}</span>
            </div>
            {!medicareEligible && (
              <>
                <div className="ret2-med-row">
                  <span className="ret2-med-lbl">Medicare eligibility</span>
                  <span className="ret2-med-val">Age 65 · {medicareYear}</span>
                </div>
                <div className="ret2-med-row">
                  <span className="ret2-med-lbl">Years until Medicare</span>
                  <span className="ret2-med-val">{yearsToMedicare} year{yearsToMedicare !== 1 ? "s" : ""}</span>
                </div>
              </>
            )}
            <div className="ret2-med-row">
              <span className="ret2-med-lbl">At 65</span>
              <span className="ret2-med-val">Transitions to TRICARE For Life</span>
            </div>
            <div className="ret2-med-row">
              <span className="ret2-med-lbl">TFL cost</span>
              <span className="ret2-med-val" style={{ color:"#34d399" }}>
                {fmt(0)}/mo (Medicare Part B required)
              </span>
            </div>
          </div>
          <HintBox>
            TRICARE For Life wraps around Medicare at age 65 — it covers most Medicare cost-shares at no additional TRICARE premium. You will need to enroll in Medicare Part B (~$185/mo in 2026).
          </HintBox>

          {/* ── SHARE + PDF BUTTONS ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {[{v:"dark",l:"🌙 Dark"},{v:"light",l:"🖨 Print-Friendly"}].map(t => (
              <button key={t.v} onClick={() => setPdfTheme(t.v)} style={{
                flex: 1, padding: "5px 0", fontSize: 12, borderRadius: 6, cursor: "pointer",
                border: pdfTheme === t.v ? "2px solid #f0c14b" : "1px solid rgba(255,255,255,0.12)",
                background: pdfTheme === t.v ? "rgba(212,160,23,0.15)" : "transparent",
                color: pdfTheme === t.v ? "#f0c14b" : "#6b7280",
              }}>{t.l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
            <button className="ds-share-btn" style={{ flex: 1, marginBottom: 0 }} onClick={handleShare}>
              📤 Share My Numbers
            </button>
            <button className="ds-share-btn" style={{ flex: 1, marginBottom: 0, background: "rgba(212,160,23,0.15)", color: "#f0c14b", border: "1px solid rgba(212,160,23,0.3)" }} onClick={generatePDF}>
              📄 Export PDF
            </button>
          </div>

          {/* ── DEBRIEFED PERSISTENT FOOTER ── */}
          <div style={{ textAlign:"center", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:8 }}>
            <span style={{ fontSize:12, color:"#6b7280" }}>Need a civilian resume? Try Debriefed → </span>
            <a href={`${PARENT_BRAND_URL}?utm_source=milcalc&utm_medium=footer&utm_campaign=footer`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:"#d4a017", textDecoration:"none", fontWeight:600 }}
              onClick={() => track("Debriefed Promo Clicked", { trigger: "footer" })}>
              {PARENT_BRAND_DOMAIN}
            </a>
            <span style={{ fontSize:12, color:"#374151" }}> &nbsp;·&nbsp; </span>
            <a href="#/terms" style={{ fontSize:12, color:"#6b7280", textDecoration:"none" }}>Terms</a>
            <span style={{ fontSize:12, color:"#374151" }}> &nbsp;·&nbsp; </span>
            <a href="#/partners" style={{ fontSize:12, color:"#6b7280", textDecoration:"none" }}>Partners</a>
            <div style={{ fontSize:11, color:"#4b5563", marginTop:8 }}>
              Built by Chris Simser · Open source under MIT · <a href="https://github.com/csimser/milcalc" target="_blank" rel="noopener noreferrer" style={{ color:"#6b7280", textDecoration:"none" }}>github.com/csimser/milcalc</a>
            </div>
            <DiscordLink />
            <UpdateCheck />
          </div>

          {/* ── FEEDBACK BUTTON ── */}
          <div style={{ textAlign: "center", paddingBottom: 16 }}>
            <button
              onClick={() => { setShowFeedback(true); setFbSent(false); }}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer",
                fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", textDecoration: "underline" }}>
              Give feedback or report an issue
            </button>
          </div>

        </div>
      </div>

      {/* ── FEEDBACK MODAL ── */}
      {showFeedback && (
        <div className="ret2-modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="ret2-modal" onClick={e => e.stopPropagation()}>
            <button className="ret2-modal-close" onClick={() => setShowFeedback(false)}>✕</button>
            {fbSent ? (
              <>
                <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: 8 }}>Thanks for your feedback!</div>
                <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 20 }}>We read every message and use it to improve MilCalc.</div>
                <button onClick={() => setShowFeedback(false)}
                  style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.06)", border: "none",
                    borderRadius: 10, color: "#fff", fontSize: 14, cursor: "pointer",
                    fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Send Feedback</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Category</label>
                  <select value={fbCat} onChange={e => setFbCat(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 14, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Data Correction</option>
                    <option>General Feedback</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Message <span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea value={fbMsg} onChange={e => setFbMsg(e.target.value)} rows={4} placeholder="Tell us what's on your mind…"
                    style={{ width: "100%", padding: "10px 12px", background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 14, resize: "vertical", boxSizing: "border-box",
                      fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Name (optional)</label>
                  <input type="text" value={fbName} onChange={e => setFbName(e.target.value)} placeholder="Your name"
                    style={{ width: "100%", padding: "10px 12px", background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box",
                      fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Email (optional)</label>
                  <input type="email" value={fbEmail} onChange={e => setFbEmail(e.target.value)} placeholder="For follow-up"
                    style={{ width: "100%", padding: "10px 12px", background: "#1c1c24", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box",
                      fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }} />
                </div>
                <button
                  disabled={!fbMsg.trim()}
                  onClick={() => {
                    if (!fbMsg.trim()) return;
                    const subject = encodeURIComponent(`MilCalc Feedback: ${fbCat}`);
                    const body = encodeURIComponent(`Category: ${fbCat}\n${fbName ? `Name: ${fbName}\n` : ""}${fbEmail ? `Email: ${fbEmail}\n` : ""}\n${fbMsg}`);
                    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
                    track("Feedback Submitted", { category: fbCat, has_email: !!fbEmail.trim() });
                    setFbSent(true);
                  }}
                  style={{ width: "100%", padding: "13px", background: fbMsg.trim() ? "linear-gradient(135deg,#c2782a,#e09448)" : "rgba(255,255,255,0.06)",
                    color: fbMsg.trim() ? "#0f0f14" : "#6b7280", border: "none", borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: fbMsg.trim() ? "pointer" : "default",
                    fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
                  Send Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && (
        <div className="ret2-modal-overlay" onClick={closeShareModal}>
          <div className="ret2-modal" onClick={e => e.stopPropagation()}>
            <button className="ret2-modal-close" onClick={closeShareModal}>✕</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
              Share My Numbers
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Your retirement income infographic.
            </div>
            <div style={{ marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#0f0f14", minHeight: 200 }}>
              {shareImgURL
                ? <img src={shareImgURL} alt="Retirement income infographic" style={{ width: "100%", display: "block" }} />
                : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#6b7280", fontSize: 13 }}>Generating…</div>
              }
            </div>
            <button
              onClick={doShare}
              disabled={!shareBlobRef.current}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 0",
                background: shareBlobRef.current ? "#d4a017" : "rgba(255,255,255,0.06)",
                color: shareBlobRef.current ? "#0f0f14" : "#6b7280",
                border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: shareBlobRef.current ? "pointer" : "default",
                opacity: shareBlobRef.current ? 1 : 0.5, transition: "opacity .2s",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              📤 {canNativeShare ? "Share" : "Download PNG"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
