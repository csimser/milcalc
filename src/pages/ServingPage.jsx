// ── PATH 1: STILL SERVING ─────────────────────────────────────────────
// Built from scratch using shared components (src/components/ui.jsx).
// All calculation logic sourced from src/lib/calc.js and src/lib/data.js.
// App.jsx is NOT imported here. This page is fully self-contained.

import { useState, useRef } from "react";
import NavHeader, { NAV_H } from "../components/NavHeader.jsx";
import {
  SummaryBar, SectionHeader, InfoCard, ToggleGroup,
  SliderField, HintBox, CTAButton, DS_CSS, Stepper,
} from "../components/ui.jsx";
import { lookupPay, pension, calcVAComp, calcStateTax, calcFederalTax, fmt, getVAPriorityGroup, mgibMonthly } from "../lib/calc.js";
import { STATES, GRADE_LABELS, GRADE_GROUPS, VA_PRIORITY_GROUPS, TRICARE_PLANS, GI_BILL_ONLINE_MHA, MGIB_ENROLL_OPTS, MHA_CITIES } from "../lib/data.js";
import { jsPDF } from "jspdf";
import { track } from "../analytics.js";

// ── STORAGE ───────────────────────────────────────────────────────────
const STORAGE_KEY = "milcalc_state";
function loadSaved() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

// ── DEFAULTS — mirrors svg_* keys in App.jsx so existing saves persist ─
const DEFAULTS = {
  svg_name: "",
  svg_payGrade: "E-7", svg_retGrade: null, svg_cYos: 10, svg_cAge: 28, svg_retType: "High-3",
  svg_tspBal: 0, svg_tspTradBal: 0, svg_tspRothBal: 0, svg_tspType: "traditional", svg_tspPct: 5, svg_sepYos: 15, svg_tgtYos: 20,
  svg_vaRat: 0, svg_vaDep: "alone", svg_state: "Texas",
  svg_civSal: 60000, svg_civSalB: 0,
  svg_hysaBal: 0, svg_hysaMo: 0, svg_hysaApy: 4.5,
  svg_othBal: 0, svg_othMo: 0, svg_othRate: 7,
  svg_civRetAge: 65,
  svg_giUse: false, svg_giType: "post911", svg_giOnline: false, svg_giCity: "",
  svg_giEligPct: 100, svg_giMonths: 36, svg_mgibEnroll: "full", svg_mgibServiceYears: "3+",
  svg_hiDeps: "single", svg_hiCost: null,
  svg_tricarePlan: "prime_a_fam",
};

const VA_DEP_MAP = {
  alone:  { key: "s",  ch: 0 }, spouse: { key: "sp", ch: 0 },
  sp_1c:  { key: "sp", ch: 1 }, sp_2c:  { key: "sp", ch: 2 }, sp_3c: { key: "sp", ch: 3 },
  s_1c:   { key: "s",  ch: 1 }, s_2c:   { key: "s",  ch: 2 }, s_3c:  { key: "s",  ch: 3 },
};

// ── TSP PROJECTION HELPERS — same algorithm as App.jsx StayVsGoTab ─────
// Pure math, no side effects. Duplicated here because StayVsGoTab doesn't export them.
function pTspBal(initBal, monthlyContrib, contribYrs, growthYrs, rate = 0.07) {
  const mr = rate / 12;
  let b = Math.max(0, initBal);
  const cm = Math.round(Math.max(0, contribYrs) * 12);
  for (let i = 0; i < cm; i++) b = b * (1 + mr) + monthlyContrib;
  if (growthYrs > 0) b *= Math.pow(1 + rate, growthYrs);
  return Math.max(0, b);
}
function pTspBalStepped(initBal, payGrade, startYos, endYos, tspPct, isBRS, growthYrs, rate = 0.07) {
  const mr = rate / 12;
  let b = Math.max(0, initBal);
  for (let yos = startYos; yos < endYos; yos++) {
    const bp = lookupPay(payGrade, yos) || lookupPay(payGrade, startYos) || 5000;
    const mem = bp * (tspPct / 100);
    const auto = isBRS ? bp * 0.01 : 0;
    const m1   = isBRS ? Math.min(mem, bp * 0.03) : 0;
    const m2   = isBRS ? Math.min(Math.max(0, mem - bp * 0.03), bp * 0.02) * 0.5 : 0;
    const contrib = mem + auto + m1 + m2;
    for (let mo = 0; mo < 12; mo++) b = b * (1 + mr) + contrib;
  }
  if (growthYrs > 0) b *= Math.pow(1 + rate, growthYrs);
  return Math.max(0, b);
}

// ── TRICARE PLAN OPTIONS (retirees) ──────────────────────────────────
const SP_TRICARE_OPTS = [
  { v: "prime_a_self", l: "Prime – Self (Grp A)",   amt: () => TRICARE_PLANS.prime.groupA.self },
  { v: "prime_a_fam",  l: "Prime – Family (Grp A)", amt: () => TRICARE_PLANS.prime.groupA.family },
  { v: "prime_b_self", l: "Prime – Self (Grp B)",   amt: () => TRICARE_PLANS.prime.groupB.self },
  { v: "prime_b_fam",  l: "Prime – Family (Grp B)", amt: () => TRICARE_PLANS.prime.groupB.family },
  { v: "select_a_self",l: "Select – Self (Grp A)",  amt: () => TRICARE_PLANS.select.groupA.self },
  { v: "select_a_fam", l: "Select – Family (Grp A)",amt: () => TRICARE_PLANS.select.groupA.family },
  { v: "select_b_self",l: "Select – Self (Grp B)",  amt: () => TRICARE_PLANS.select.groupB.self },
  { v: "select_b_fam", l: "Select – Family (Grp B)",amt: () => TRICARE_PLANS.select.groupB.family },
  { v: "none",         l: "Other / Not enrolled",   amt: () => 0 },
];

// ── PAGE-LEVEL CSS ────────────────────────────────────────────────────
const PAGE_CSS = `
html, body, #root { background: #0f0f14; margin: 0; padding: 0; }
.sp-wrap {
  padding-top: 12px;
  padding-bottom: 6rem;
  min-height: 100vh;
  background: #0f0f14;
}
.sp-inner {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 1.25rem;
}
.sp-inputs-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 767px) {
  .sp-inputs-two { grid-template-columns: 1fr; }
}
/* ── Stacked field: label above, full-width value below ── */
.sp-stack {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sp-stack:last-child { border-bottom: none; }
.sp-lbl {
  display: block;
  font-size: 13px; font-weight: 400; color: #9ca3af; margin-bottom: 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* select inside stacked field */
.sp-select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  width: 100%; cursor: pointer; min-height: 36px;
  -webkit-appearance: none; appearance: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%236b7280' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
  padding-right: 22px;
}
.sp-select option, .sp-select optgroup { background: #17171f; color: #f9fafb; }
/* ── Two-column field grid ── */
.sp-two {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sp-two:last-child { border-bottom: none; }
.sp-col {
  padding: 14px 16px;
  min-width: 0;
}
.sp-col:first-child { border-right: 1px solid rgba(255,255,255,0.04); }
.sp-col-lbl {
  display: block;
  font-size: 13px; font-weight: 400; color: #9ca3af; margin-bottom: 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-col-row { display: flex; align-items: center; min-width: 0; }
.sp-col-row input {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 16px; font-weight: 500;
  width: 100%; min-width: 0; min-height: 36px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.sp-col-row input::-webkit-inner-spin-button,
.sp-col-row input::-webkit-outer-spin-button { -webkit-appearance: none; }
.sp-pre { font-size: 14px; color: #6b7280; margin-right: 3px; flex-shrink: 0; }
.sp-suf { font-size: 13px; color: #6b7280; margin-left: 3px; flex-shrink: 0; }
.sp-col-hint {
  font-size: 10px; color: #6b7280; margin-top: 5px; line-height: 1.45;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* ── Inline field row (label left, value right) ── */
.sp-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  gap: 12px; min-height: 52px;
}
.sp-row:last-child { border-bottom: none; }
.sp-row-lbl {
  font-size: 13px; font-weight: 400; color: #9ca3af; flex-shrink: 0; line-height: 1.4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-row-val {
  display: flex; align-items: center; gap: 3px;
  font-size: 16px; font-weight: 500; color: #f9fafb;
  text-align: right; min-width: 0;
}
.sp-row-val input {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 16px; font-weight: 500;
  text-align: right; width: 7ch; min-height: 36px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.sp-row-val input::-webkit-inner-spin-button,
.sp-row-val input::-webkit-outer-spin-button { -webkit-appearance: none; }
.sp-row-val select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  cursor: pointer; text-align: right;
  -webkit-appearance: none; appearance: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%236b7280' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
  padding-right: 18px;
}
.sp-row-val select option { background: #17171f; color: #f9fafb; }
/* ── Salary two-col ── */
.sp-sal-two {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sp-sal-two:last-child { border-bottom: none; }
.sp-sal-col { padding: 14px 16px; min-width: 0; }
.sp-sal-col:first-child { border-right: 1px solid rgba(255,255,255,0.04); }
.sp-sal-lbl {
  display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: #4b5563; margin-bottom: 6px; line-height: 1.3;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-sal-input { display: flex; align-items: center; gap: 3px; }
.sp-sal-input input {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  width: 100%; min-width: 0; min-height: 32px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.sp-sal-input input::-webkit-inner-spin-button,
.sp-sal-input input::-webkit-outer-spin-button { -webkit-appearance: none; }
.sp-sal-hint {
  font-size: 10px; color: #6b7280; margin-top: 4px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* ── Results section ── */
.sp-results { margin-top: 0.25rem; }
/* ── Comparison grid ── */
.sp-cmp {
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px;
  margin-bottom: 1rem;
}
@media (max-width: 360px) { .sp-cmp { grid-template-columns: 1fr; } }
.sp-cmp-card {
  background: #17171f; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06); overflow: hidden;
}
.sp-cmp-card-a { border-top: 3px solid #d4a017; }
.sp-cmp-card-b { border-top: 3px solid #34d399; }
.sp-cmp-head {
  padding: 12px 12px 0; margin-bottom: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; line-height: 1.4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-cmp-head-a { color: #f0c14b; }
.sp-cmp-head-b { color: #34d399; }
.sp-cmp-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 4px 12px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sp-cmp-row:last-of-type { border-bottom: none; }
.sp-cmp-rl { font-size: 11px; color: #6b7280; flex: 1; line-height: 1.4; }
.sp-cmp-rv {
  font-size: 12px; font-weight: 500; text-align: right; flex-shrink: 0;
  margin-left: 6px; color: #f9fafb;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-cmp-rv.gold  { color: #f0c14b; }
.sp-cmp-rv.green { color: #34d399; }
.sp-cmp-rv.red   { color: #f87171; }
.sp-cmp-rv.mut   { color: #6b7280; }
.sp-cmp-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px 12px; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 4px;
}
.sp-cmp-total-l {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #6b7280;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-cmp-total-va { font-size: 17px; font-weight: 700; color: #f0c14b; }
.sp-cmp-total-vb { font-size: 17px; font-weight: 700; color: #34d399; }
/* ── Break-even card ── */
.sp-be {
  border-radius: 14px; padding: 20px 16px; text-align: center;
  margin-bottom: 1rem; border: 1px solid;
}
.sp-be.green { background: rgba(52,211,153,0.06);  border-color: rgba(52,211,153,0.15); }
.sp-be.amber { background: rgba(212,160,23,0.06);  border-color: rgba(212,160,23,0.15); }
.sp-be.red   { background: rgba(239,68,68,0.06);   border-color: rgba(239,68,68,0.15); }
.sp-be-num {
  font-size: 52px; font-weight: 700; line-height: 1;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-be-num.green { color: #34d399; }
.sp-be-num.amber { color: #f0c14b; }
.sp-be-num.red   { color: #f87171; }
.sp-be-lbl { font-size: 13px; color: #6b7280; margin-top: 6px; line-height: 1.5; }
.sp-be-note { font-size: 12px; font-weight: 600; margin-top: 8px; }
.sp-be-note.green { color: #34d399; }
.sp-be-note.amber { color: #f0c14b; }
/* ── Chart ── */
.sp-chart-card {
  background: #17171f; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; padding: 16px 14px 12px; margin-bottom: 1rem;
}
.sp-chart-ttl {
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: #4b5563; margin-bottom: 10px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-chart-legend {
  display: flex; gap: 16px; margin-bottom: 10px;
  font-size: 11px; font-weight: 600; flex-wrap: wrap;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* ── Income breakdown table ── */
.sp-tbl { width: 100%; border-collapse: collapse; }
.sp-tbl th {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4b5563; padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-tbl th:not(:first-child) { text-align: right; }
.sp-tbl td {
  padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 13px; color: #9ca3af; vertical-align: middle;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sp-tbl td:not(:first-child) { text-align: right; font-weight: 500; }
.sp-tbl tr:last-child td { border-bottom: none; }
.sp-tbl tr.sp-tbl-total td {
  background: rgba(212,160,23,0.06); font-weight: 700;
  border-top: 1px solid rgba(212,160,23,0.15);
  color: #f9fafb; font-size: 14px;
}
.sp-tbl td.gold  { color: #f0c14b; }
.sp-tbl td.green { color: #34d399; }
.sp-tbl td.red   { color: #f87171; }
/* ── Share/disclaimer ── */
.sp-disclaimer {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px; padding: 14px 16px;
  font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
/* ── Share modal ── */
.sp-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.sp-modal {
  position: relative; background: #17171f; border-radius: 16px;
  padding: 24px; max-width: 420px; width: 90%;
  border: 1px solid rgba(255,255,255,0.06);
  max-height: 85vh; overflow-y: auto;
}
.sp-modal-close {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; font-size: 18px; color: #6b7280;
  cursor: pointer; line-height: 1; padding: 4px;
}
`;

// ── MHA CITY LIST for GI Bill lookup ─────────────────────────────────
const MHA_CITY_LIST = Object.keys(MHA_CITIES).sort();

// ── COMPONENT ─────────────────────────────────────────────────────────
export default function ServingPage() {
  const [s, setS] = useState(() => ({ ...DEFAULTS, ...(loadSaved() || {}) }));
  const [showResults, setShowResults] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImgURL, setShareImgURL] = useState(null);
  const shareBlobRef = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbCat, setFbCat] = useState("General Feedback");
  const [fbMsg, setFbMsg] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSent, setFbSent] = useState(false);
  // ── Tooltip open states (Fix 4 & 9) ─────────────────────────────────
  const [ttTsp,  setTtTsp]  = useState(false);
  const [ttHysa, setTtHysa] = useState(false);
  const [ttOth,  setTtOth]  = useState(false);
  const [tt4A,   setTt4A]   = useState(false);
  const [tt4B,   setTt4B]   = useState(false);
  const [pdfTheme, setPdfTheme] = useState("dark");
  const [showTricareInfo, setShowTricareInfo] = useState(false);
  const [showBahInfo, setShowBahInfo] = useState(false);

  const set = (k, v) => setS(prev => {
    const next = { ...prev, [k]: v };
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, [k]: v }));
    } catch {}
    return next;
  });

  const SEL = e => setTimeout(() => e.target.select(), 0);

  // ── Read state with safe defaults ────────────────────────────────────
  const svgName     = (s.svg_name || "").trim();
  const payGrade    = s.svg_payGrade  || "E-7";
  const retGrade    = s.svg_retGrade  || payGrade;   // Fix 2: retirement pay grade for pension calc
  const currentYos  = s.svg_cYos      != null ? s.svg_cYos   : 10;
  const currentAge  = s.svg_cAge      != null ? s.svg_cAge   : 28;
  const retType     = s.svg_retType   || "High-3";
  const tspBalance  = s.svg_tspBal    != null ? s.svg_tspBal : 0;
  const tspTypeSvg  = s.svg_tspType  || "traditional";
  const isSplitSvg  = tspTypeSvg === "split";
  const tspTradBal  = isSplitSvg ? (s.svg_tspTradBal || 0) : (isSplitSvg ? 0 : tspBalance);
  const tspRothBal  = isSplitSvg ? (s.svg_tspRothBal || 0) : 0;
  const tspEffectiveBal = isSplitSvg ? tspTradBal : tspBalance;
  const tspPct      = s.svg_tspPct    != null ? s.svg_tspPct : 5;
  const vaRating    = s.svg_vaRat     || 0;
  const vaDep       = s.svg_vaDep     || "alone";
  const selState    = s.svg_state     || "Texas";
  const civSalary   = s.svg_civSal    != null ? s.svg_civSal  : 60000;
  const civSalBRaw  = s.svg_civSalB   != null ? s.svg_civSalB : 0;
  const hysaBal     = s.svg_hysaBal   != null ? s.svg_hysaBal : 0;
  const hysaContrib = s.svg_hysaMo    != null ? s.svg_hysaMo  : 0;
  const hysaApy     = s.svg_hysaApy   != null ? s.svg_hysaApy : 4.5;
  const othBal      = s.svg_othBal    != null ? s.svg_othBal  : 0;
  const othContrib  = s.svg_othMo     != null ? s.svg_othMo   : 0;
  const othRate     = s.svg_othRate   != null ? s.svg_othRate  : 7;
  const civRetAge   = (typeof s.svg_civRetAge === "number" && s.svg_civRetAge >= 40 && s.svg_civRetAge <= 90) ? s.svg_civRetAge : 65;
  const hiDeps      = s.svg_hiDeps    || "single";
  const hiCostDef   = hiDeps === "family" ? 1300 : 450;
  const hiCost      = s.svg_hiCost    != null ? s.svg_hiCost  : hiCostDef;
  // Fix 8: GI Bill for Scenario A (Leave Early)
  const giUseA            = s.svg_giUse    || false;
  const giTypeA           = s.svg_giType   || "post911";
  const giOnlineA         = s.svg_giOnline || false;
  const giCityA           = s.svg_giCity   || "";
  const giEligPctA        = s.svg_giEligPct  != null ? s.svg_giEligPct  : 100;
  const giMonthsA         = s.svg_giMonths   != null ? s.svg_giMonths   : 36;
  const mgibEnrollA       = s.svg_mgibEnroll || "full";
  const mgibServiceYearsA = s.svg_mgibServiceYears || "3+";
  const isMGIBA = giTypeA === "ch30" || giTypeA === "ch1606";
  const giBaseA = giOnlineA ? GI_BILL_ONLINE_MHA : (MHA_CITIES[giCityA] || 0);
  const giMhaA  = giUseA
    ? (isMGIBA
        ? Math.round(mgibMonthly(giTypeA, mgibEnrollA, mgibServiceYearsA))
        : Math.round(giBaseA * (giEligPctA / 100)))
    : 0;
  const giYearsA = Math.ceil(giMonthsA / 12);

  // ── Slider safe bounds ────────────────────────────────────────────────
  const rawSep = s.svg_sepYos != null ? s.svg_sepYos : Math.min(19, Math.max(currentYos + 1, 15));
  const rawTgt = s.svg_tgtYos != null ? s.svg_tgtYos : Math.max(currentYos + 1, 20);
  const safeSep = Math.max(currentYos + 1, Math.min(19, rawSep));
  const safeTgt = Math.max(currentYos + 1, Math.min(30, rawTgt));
  const sepAge  = currentAge + Math.max(0, safeSep - currentYos);
  const retAge  = currentAge + Math.max(0, safeTgt - currentYos);

  // ── Derived calculations ──────────────────────────────────────────────
  const isBRS    = retType === "BRS";
  const isREDUX  = retType === "REDUX";
  const basePay  = lookupPay(payGrade, currentYos) || 5000;
  const memberAmt = basePay * (tspPct / 100);
  const autoAmt   = isBRS ? basePay * 0.01 : 0;
  const matchT1   = isBRS ? Math.min(memberAmt, basePay * 0.03) : 0;
  const matchT2   = isBRS ? Math.min(Math.max(0, memberAmt - basePay * 0.03), basePay * 0.02) * 0.5 : 0;
  const totalContrib = memberAmt + autoAmt + matchT1 + matchT2;
  const showBrsWarn  = isBRS && tspPct < 5;
  const fullMatch    = isBRS && tspPct >= 5;

  const { key: vaKey, ch: vaCh } = VA_DEP_MAP[vaDep] || VA_DEP_MAP.alone;
  const va = calcVAComp(vaRating, vaKey, vaCh);

  const si = STATES[selState] || { ok: true };
  const tricarePlanB = s.svg_tricarePlan || "prime_a_fam";
  const tricarePremB = (SP_TRICARE_OPTS.find(t => t.v === tricarePlanB) || SP_TRICARE_OPTS[1]).amt();
  // Fix 2: use retirement pay grade for pension (falls back to current pay grade if not higher)
  const retPay    = lookupPay(retGrade, safeTgt) || lookupPay(payGrade, safeTgt) || basePay;
  // Use shared pension() function to handle High-3, BRS, and REDUX uniformly
  const pensGross = safeTgt >= 20 ? pension(retType, safeTgt, retPay) : 0;
  // REDUX Career Status Bonus: $30,000 lump sum at 15 YOS (amortized for display)
  const reduxCSB  = isREDUX && safeTgt >= 20 ? 30000 : 0;
  const pensNet   = pensGross - calcStateTax(pensGross * 12, si, currentAge) / 12;

  // Federal tax on Scenario B pension
  const svgFilingStatus = (vaDep === "spouse" || vaDep.startsWith("sp_")) ? "mfj" : "single";
  const fedTaxB = calcFederalTax(pensNet * 12, svgFilingStatus, retAge >= 65, false);
  const fedTaxMoB = fedTaxB.monthlyTax;
  const pensNetFed = pensNet - fedTaxMoB;

  // TSP at 65 (scenario B — stay to retirement)
  const tspTradAt65B = pTspBalStepped(tspEffectiveBal, payGrade, currentYos, safeTgt, tspPct, isBRS, Math.max(0, 65 - retAge));
  const tspRothAt65B = isSplitSvg ? pTspBalStepped(tspRothBal, payGrade, currentYos, safeTgt, 0, false, Math.max(0, 65 - retAge)) : 0;
  const tspAt65B = tspTradAt65B + tspRothAt65B;
  const tspTradDrawB = tspTradAt65B * 0.04 / 12;
  const tspRothDrawB = tspRothAt65B * 0.04 / 12;
  const tspDrawB = tspTradDrawB + tspRothDrawB;

  // TSP at 65 (scenario A — leave early)
  const tspTradAt65A = pTspBalStepped(tspEffectiveBal, payGrade, currentYos, safeSep, tspPct, isBRS, Math.max(0, 65 - sepAge));
  const tspRothAt65A = isSplitSvg ? pTspBalStepped(tspRothBal, payGrade, currentYos, safeSep, 0, false, Math.max(0, 65 - sepAge)) : 0;
  const tspAt65A = tspTradAt65A + tspRothAt65A;
  const tspTradDrawA = tspTradAt65A * 0.04 / 12;
  const tspRothDrawA = tspRothAt65A * 0.04 / 12;
  const tspDrawA = tspTradDrawA + tspRothDrawA;

  // HYSA & other investments (same for both scenarios)
  const hysaAt65 = pTspBal(hysaBal, hysaContrib, Math.max(0, civRetAge - currentAge), Math.max(0, 65 - civRetAge), hysaApy / 100);
  const hysaDraw = hysaAt65 * 0.04 / 12;
  const othAt65  = pTspBal(othBal, othContrib, Math.max(0, civRetAge - currentAge), Math.max(0, 65 - civRetAge), othRate / 100);
  const othDraw  = othAt65 * 0.04 / 12;

  // ── Reserve Transfer Scenario (Scenario C) ───────────────────────────
  // Points: active years × 365 + remaining qualifying years in reserves × 50 (min qualifying)
  const resActiveYrs = currentYos;
  const resRemainingQual = Math.max(0, 20 - resActiveYrs);
  const resPoints = resActiveYrs * 365 + resRemainingQual * 50;
  const resEquivYrs = resPoints / 360;
  const resMultiplier = isBRS ? 0.020 : 0.025; // 2.0% BRS, 2.5% legacy
  const resBasePay = lookupPay(payGrade, 20) || lookupPay(payGrade, currentYos) || basePay;
  const resRetPay = resEquivYrs * resMultiplier * resBasePay;
  // Reserve pay starts at age 60, not at separation
  const resAge60 = 60;
  const yearsToAge60 = Math.max(0, resAge60 - currentAge);
  // TSP grows from now to 60 (active contributions until they leave, then grows-only to 60)
  const resYearsOnActive = Math.max(0, safeSep - currentYos);
  const resSepAge = currentAge + resYearsOnActive;
  const resGrowthYrsToAge60 = Math.max(0, resAge60 - resSepAge);
  const resTspAt60 = pTspBalStepped(tspEffectiveBal, payGrade, currentYos, safeSep, tspPct, isBRS, resGrowthYrsToAge60);
  const resTspAt65 = resTspAt60 * Math.pow(1.07, 5);
  const resTspDraw60 = resTspAt60 * 0.04 / 12;
  const resTspDraw65 = resTspAt65 * 0.04 / 12;
  const resStateTax = resRetPay > 0 ? calcStateTax(resRetPay * 12, si, 60) / 12 : 0;
  const resNetPay = resRetPay - resStateTax;
  const resTotalAt60 = resNetPay + va + resTspDraw60;
  const resTotalAt65 = resNetPay + va + resTspDraw65 + hysaDraw + othDraw;

  // Civilian salary B
  const civSalB = civSalBRaw > 0 ? civSalBRaw : civSalary * 0.8;

  // Monthly totals at 65
  const moA_at65 = civSalary / 12 + tspDrawA + va + hysaDraw + othDraw - hiCost;
  const moB_at65 = pensNetFed + tspDrawB + va + civSalB / 12 + hysaDraw + othDraw - tricarePremB;
  const moB_pre65 = pensNetFed + va + civSalB / 12 - tricarePremB;

  // ── Break-even ────────────────────────────────────────────────────────
  const milAnn  = basePay * 12;
  const chartEnd = Math.max(85, retAge + 25);
  let cumA = 0, cumB = 0, breakEvenAge = null;
  const chartData = [];
  for (let age = currentAge; age <= chartEnd; age++) {
    const civA  = age < civRetAge ? civSalary : 0;
    const civBa = age < civRetAge ? civSalB   : 0;
    const post65 = age >= 65 ? hysaDraw * 12 + othDraw * 12 : 0;
    // Fix 8: include GI Bill in Scenario A during entitlement years
    const giAnnA = (giUseA && age >= sepAge && age < sepAge + giYearsA) ? giMhaA * 12 : 0;
    const annA = age < sepAge ? milAnn
               : age < 65    ? civA + va * 12 + giAnnA - hiCost * 12
               :                civA + va * 12 + tspDrawA * 12 + post65 - hiCost * 12;
    const annB = age < retAge ? milAnn
               : age < 65    ? pensNetFed * 12 + va * 12 + civBa - tricarePremB * 12
               :                pensNetFed * 12 + va * 12 + civBa + tspDrawB * 12 + post65 - tricarePremB * 12;
    cumA += annA; cumB += annB;
    chartData.push({ age, cumA, cumB });
    if (!breakEvenAge && age > retAge && cumB >= cumA) breakEvenAge = age;
  }

  // ── Summary bar values ────────────────────────────────────────────────
  // Phase 1: income available at retirement (pension + VA, no investment draws)
  const summaryPhase1 = pensNetFed + va - tricarePremB;
  // Phase 2: at 65 (pension + VA + TSP + HYSA + Other, minus TRICARE)
  const summaryProjected = pensNetFed + tspDrawB + va;
  const summaryPhase2 = pensNetFed + tspDrawB + hysaDraw + othDraw + va - tricarePremB;
  const summaryAmount = safeTgt >= 20 ? fmt(Math.round(summaryPhase1)) + "/mo" : "—";
  const summarySubtitle = safeTgt >= 20
    ? `Stay to ${safeTgt} yrs · ${retGrade !== payGrade ? `${payGrade}→${retGrade}` : payGrade} · ${retType}${va > 0 ? ` · VA ${vaRating}%` : ""}`
    : `No pension at ${safeTgt} yrs — need 20+ · ${payGrade} · ${retType}`;
  const summaryChips = [
    pensNetFed  > 0 && { label: "Pension",  value: fmt(Math.round(pensNetFed)) },
    tspDrawB > 0 && { label: "TSP draw", value: fmt(Math.round(tspDrawB)) },
    va       > 0 && { label: "VA",       value: fmt(Math.round(va)) },
  ].filter(Boolean);

  // ── Break-even display helpers ────────────────────────────────────────
  const beVariant = breakEvenAge ? (breakEvenAge <= 65 ? "green" : "amber") : "red";
  const beMsg = breakEvenAge
    ? `Staying to ${safeTgt} YOS breaks even with leaving at ${safeSep} YOS at age ${breakEvenAge}`
    : `Staying to ${safeTgt} YOS does not break even before age ${chartEnd}`;
  const beNote = breakEvenAge
    ? beVariant === "green"
      ? `Staying is financially favorable · break-even before 65`
      : `Staying breaks even after 65 · consider the time tradeoff`
    : null;

  // ── SVG chart geometry ────────────────────────────────────────────────
  const CW = 320, CH = 160, PL = 48, PR = 10, PT = 10, PB = 28;
  const iW = CW - PL - PR, iH = CH - PT - PB;
  const maxCum = Math.max(1, ...chartData.map(d => Math.max(d.cumA, d.cumB)));
  const xS = age => PL + ((age - currentAge) / (chartEnd - currentAge)) * iW;
  const yS = val => PT + iH - (val / maxCum) * iH;
  const fmtM = v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;
  const yTicks = [0.25, 0.5, 0.75, 1.0].map(p => maxCum * p);
  const ageTks = [];
  for (let a = Math.ceil(currentAge / 5) * 5; a <= chartEnd; a += 5) ageTks.push(a);

  // Area path builders
  const areaA = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xS(d.age).toFixed(1)},${yS(d.cumA).toFixed(1)}`).join(" ")
    + ` L${xS(chartEnd).toFixed(1)},${(PT + iH).toFixed(1)} L${xS(currentAge).toFixed(1)},${(PT + iH).toFixed(1)} Z`;
  const areaB = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xS(d.age).toFixed(1)},${yS(d.cumB).toFixed(1)}`).join(" ")
    + ` L${xS(chartEnd).toFixed(1)},${(PT + iH).toFixed(1)} L${xS(currentAge).toFixed(1)},${(PT + iH).toFixed(1)} Z`;
  const lineA = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xS(d.age).toFixed(1)},${yS(d.cumA).toFixed(1)}`).join(" ");
  const lineB = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xS(d.age).toFixed(1)},${yS(d.cumB).toFixed(1)}`).join(" ");

  // ── Canvas infographic (share) ────────────────────────────────────────
  // ── Fix 6: Rebuilt Stay vs Go two-column canvas infographic ─────────
  const buildCanvas = () => {
    const C = { bg: "#0f0f14", card: "#17171f", gold: "#d4a017", goldL: "#f0c14b", mut: "#6b7280", lt: "#9ca3af", wh: "#f9fafb", gn: "#34d399", rd: "#f87171", gnb: "rgba(52,211,153,0.12)", gdb: "rgba(212,160,23,0.12)" };
    const W = 420, PAD = 24, COL_GAP = 12, RR = 8;
    const colW = (W - PAD * 2 - COL_GAP) / 2;
    const ROW_H = 40, ROW_GAP = 12;
    const fmt2 = v => "$" + Math.round(v).toLocaleString() + "/mo";
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); };
    const wrapText = (ctx, text, x, y, maxW, lineH) => {
      let ln = "", lnY = y;
      for (const w of text.split(" ")) { const t = ln ? ln + " " + w : w; if (ctx.measureText(t).width > maxW && ln) { ctx.fillText(ln, x, lnY); lnY += lineH; ln = w; } else ln = t; }
      if (ln) ctx.fillText(ln, x, lnY);
      return lnY;
    };

    // Build scenario row data
    const rowsA = [
      { l: `Leave at YOS ${safeSep} · Age ${sepAge}`, v: null, color: C.gold },
      { l: "No pension", v: "$0/mo", color: C.mut },
      ...(isSplitSvg && tspTradAt65A > 0 ? [{ l: `TSP Trad. at 65 (${fmt(Math.round(tspTradAt65A))})`, v: fmt2(tspTradDrawA), color: C.goldL }] : []),
      ...(isSplitSvg && tspRothAt65A > 0 ? [{ l: `TSP Roth at 65 (${fmt(Math.round(tspRothAt65A))})·tf`, v: fmt2(tspRothDrawA), color: C.goldL }] : []),
      ...(!isSplitSvg ? [{ l: `TSP at 65 (${fmt(Math.round(tspAt65A))})`, v: tspDrawA > 0 ? fmt2(tspDrawA) : "$0/mo", color: tspDrawA > 0 ? C.goldL : C.mut }] : []),
      { l: `HYSA at 65 (${fmt(Math.round(hysaAt65))})`, v: hysaDraw > 0 ? fmt2(hysaDraw) : "$0/mo", color: hysaDraw > 0 ? C.goldL : C.mut },
      ...(othDraw > 0 ? [{ l: "Other inv. (65+)", v: fmt2(othDraw), color: C.goldL }] : []),
      ...(va > 0 ? [{ l: `VA ${vaRating}%`, v: fmt2(va), color: C.goldL }] : []),
      ...(giUseA && giMhaA > 0 ? [{ l: `GI Bill (${giMonthsA} mo)`, v: fmt2(giMhaA), color: C.goldL }] : []),
      { l: "Civilian health ins.", v: hiCost > 0 ? `-${fmt2(hiCost)}` : "$0/mo", color: hiCost > 0 ? C.rd : C.mut },
    ];
    const rowsB = [
      { l: `Retire at YOS ${safeTgt} · Age ${retAge}`, v: null, color: C.gn },
      { l: "Monthly pension (after taxes)", v: pensNetFed > 0 ? fmt2(pensNetFed) : "—", color: pensNetFed > 0 ? C.gn : C.rd },
      ...(isSplitSvg && tspTradAt65B > 0 ? [{ l: `TSP Trad. at 65 (${fmt(Math.round(tspTradAt65B))})`, v: fmt2(tspTradDrawB), color: C.gn }] : []),
      ...(isSplitSvg && tspRothAt65B > 0 ? [{ l: `TSP Roth at 65 (${fmt(Math.round(tspRothAt65B))})·tf`, v: fmt2(tspRothDrawB), color: C.gn }] : []),
      ...(!isSplitSvg ? [{ l: `TSP at 65 (${fmt(Math.round(tspAt65B))})`, v: tspDrawB > 0 ? fmt2(tspDrawB) : "$0/mo", color: tspDrawB > 0 ? C.gn : C.mut }] : []),
      { l: `HYSA at 65 (${fmt(Math.round(hysaAt65))})`, v: hysaDraw > 0 ? fmt2(hysaDraw) : "$0/mo", color: hysaDraw > 0 ? C.gn : C.mut },
      ...(othDraw > 0 ? [{ l: "Other inv. (65+)", v: fmt2(othDraw), color: C.gn }] : []),
      ...(va > 0 ? [{ l: `VA ${vaRating}%`, v: fmt2(va), color: C.gn }] : []),
      { l: "TRICARE", v: tricarePremB > 0 ? `-${fmt2(tricarePremB)}` : "$0/mo", color: tricarePremB > 0 ? C.rd : C.gn },
    ];
    const nRows = Math.max(rowsA.length, rowsB.length);
    const colH = 32 + nRows * (ROW_H + ROW_GAP) + 60; // header badge + rows + total

    // Height: PAD + header(60) + profile(28) + title(34) + 2 columns + break-even(80) + gap(16) + footnote(56) + footer(32) + PAD
    const totalH = PAD + 60 + 28 + 34 + colH + 80 + 16 + 56 + 32 + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2; canvas.height = totalH * 2;
    const ctx = canvas.getContext("2d"); ctx.scale(2, 2);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, totalH);

    let y = PAD;

    // ── HEADER ──
    rr(ctx, PAD, y, 26, 26, 6); ctx.fillStyle = C.gold; ctx.fill();
    ctx.fillStyle = C.bg; ctx.font = "bold 14px -apple-system,system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("M", PAD + 13, y + 13);
    ctx.fillStyle = C.goldL; ctx.font = "700 14px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("MilCalc", PAD + 34, y + 13);
    ctx.fillStyle = C.mut; ctx.font = "11px -apple-system,system-ui";
    ctx.textAlign = "right";
    ctx.fillText(svgName ? svgName : "Stay vs Go Analysis", W - PAD, y + 13);
    y += 30;

    // Profile sub-line
    ctx.fillStyle = C.mut; ctx.font = "10px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`${payGrade} · ${currentYos} YOS · Age ${currentAge} · ${retType}${va > 0 ? ` · VA ${vaRating}%` : ""}`, PAD, y);
    y += 22;

    // ── SECTION TITLE ──
    ctx.fillStyle = C.wh; ctx.font = "700 16px -apple-system,system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Stay vs Go — Lifetime Income at 65", W / 2, y + 12);
    y += 30;

    // ── TWO COLUMNS ──
    const drawCol = (cx, rows, accent, isLeave) => {
      let cy = y;
      // Column header badge
      rr(ctx, cx, cy, colW, 26, 6);
      ctx.fillStyle = isLeave ? C.gdb : C.gnb; ctx.fill();
      ctx.fillStyle = isLeave ? C.goldL : C.gn; ctx.font = "700 10px -apple-system,system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(isLeave ? "IF YOU LEAVE EARLY" : "IF YOU STAY", cx + colW / 2, cy + 13);
      cy += 32;

      for (const { l, v, color } of rows) {
        // Row bg
        rr(ctx, cx, cy, colW, ROW_H, 5);
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fill();
        // Label
        ctx.fillStyle = C.lt; ctx.font = "9px -apple-system,system-ui";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(l, cx + 10, cy + 7);
        // Value
        if (v !== null) {
          ctx.fillStyle = color; ctx.font = "600 12px -apple-system,system-ui";
          ctx.textBaseline = "bottom";
          ctx.fillText(v, cx + 10, cy + ROW_H - 6);
        }
        cy += ROW_H + ROW_GAP;
      }
      // Pad remaining rows
      cy += (nRows - rows.length) * (ROW_H + ROW_GAP);

      // Total bar (60px tall)
      const totalA = moA_at65, totalBv = moB_at65;
      const tot = isLeave ? totalA : totalBv;
      rr(ctx, cx, cy + 6, colW, 60, 6);
      ctx.fillStyle = isLeave ? "rgba(212,160,23,0.15)" : "rgba(52,211,153,0.15)"; ctx.fill();
      ctx.strokeStyle = isLeave ? "rgba(212,160,23,0.4)" : "rgba(52,211,153,0.4)"; ctx.lineWidth = 1;
      rr(ctx, cx, cy + 6, colW, 60, 6); ctx.stroke();
      ctx.fillStyle = C.mut; ctx.font = "8px -apple-system,system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("MONTHLY @ 65", cx + 10, cy + 14);
      ctx.fillStyle = isLeave ? C.goldL : C.gn; ctx.font = "700 17px -apple-system,system-ui";
      ctx.textBaseline = "bottom";
      ctx.fillText(fmt2(tot), cx + 10, cy + 60);
    };

    drawCol(PAD, rowsA, C.gold, true);
    drawCol(PAD + colW + COL_GAP, rowsB, C.gn, false);
    y += colH;

    // ── BREAK-EVEN ──
    y += 24;
    rr(ctx, PAD, y, W - PAD * 2, 80, RR);
    const beColor = breakEvenAge ? (breakEvenAge <= 65 ? "rgba(52,211,153,0.08)" : "rgba(212,160,23,0.08)") : "rgba(248,113,113,0.08)";
    const beStroke = breakEvenAge ? (breakEvenAge <= 65 ? "rgba(52,211,153,0.3)" : "rgba(212,160,23,0.3)") : "rgba(248,113,113,0.3)";
    const beNumColor = breakEvenAge ? (breakEvenAge <= 65 ? C.gn : C.goldL) : C.rd;
    ctx.fillStyle = beColor; ctx.fill();
    ctx.strokeStyle = beStroke; ctx.lineWidth = 1;
    rr(ctx, PAD, y, W - PAD * 2, 80, RR); ctx.stroke();
    // Big number
    ctx.fillStyle = beNumColor; ctx.font = "700 36px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(breakEvenAge ? String(breakEvenAge) : "—", PAD + 16, y + 40);
    const numW = ctx.measureText(breakEvenAge ? String(breakEvenAge) : "—").width;
    // Text to the right
    ctx.fillStyle = C.wh; ctx.font = "600 12px -apple-system,system-ui";
    ctx.textBaseline = "top";
    ctx.fillText("Break-even age", PAD + 16 + numW + 10, y + 14);
    ctx.fillStyle = C.lt; ctx.font = "10px -apple-system,system-ui";
    ctx.fillText(breakEvenAge
      ? `Staying pays off financially at age ${breakEvenAge}`
      : `Staying may not break even by age ${chartEnd}`,
      PAD + 16 + numW + 10, y + 30);
    const diff = moB_at65 - moA_at65;
    ctx.fillStyle = diff >= 0 ? C.gn : C.rd; ctx.font = "600 10px -apple-system,system-ui";
    ctx.fillText(`${diff >= 0 ? "+" : ""}${fmt2(diff)} at 65 if you stay`, PAD + 16 + numW + 10, y + 48);
    y += 80;

    // ── FOOTNOTE ──
    y += 16;
    const disc = "* Monthly draws based on 4% annual withdrawal rule (Bengen, 1994). Estimates only. Not financial advice. Consult a fee-only financial advisor before making career decisions.";
    // Disclaimer box with padding
    const discH = 56;
    rr(ctx, PAD, y, W - PAD * 2, discH, 6);
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fill();
    ctx.fillStyle = C.mut; ctx.font = "9px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    const mW2 = W - PAD * 2 - 24;
    wrapText(ctx, disc, PAD + 12, y + 14, mW2, 14);
    y += discH + 12;

    // ── FOOTER ──
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 10;
    ctx.fillStyle = C.mut; ctx.font = "11px -apple-system,system-ui";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("Calculate yours free", PAD, y);
    ctx.fillStyle = C.goldL; ctx.font = "500 12px -apple-system,system-ui";
    ctx.textAlign = "right";
    const fT = "milcalc.app"; ctx.fillText(fT, W - PAD, y);
    const fW2 = ctx.measureText(fT).width;
    ctx.strokeStyle = C.goldL; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - PAD - fW2, y + 18); ctx.lineTo(W - PAD, y + 18); ctx.stroke();

    return canvas;
  };

  // ── Fix 7: PDF export — 3-page Stay vs Go report ─────────────────────
  const generatePDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const PW = 612, PH = 792, M = 57;
      let y = M;
      const isLight = pdfTheme === "light";

      // Theme-aware palette
      const ink     = isLight ? [10, 22, 40]     : [203, 213, 225];
      const mut     = isLight ? [55, 65, 81]     : [107, 127, 163];
      const gold    = isLight ? [180, 83, 9]     : [212, 160, 23];
      const goldHdr =                               [228, 169, 74];  // always bright gold on dark header
      const gn      = isLight ? [42, 122, 75]    : [74, 222, 128];
      const rd      = isLight ? [185, 28, 28]    : [248, 113, 113];
      const cardBg  = isLight ? [241, 245, 249]  : [17, 24, 39];
      const cardBg2 = isLight ? [220, 232, 244]  : [30, 41, 59];
      const divider = isLight ? [203, 213, 225]  : [30, 41, 59];
      const hdrSub  = isLight ? [200, 215, 235]  : mut;
      const disc = "These are estimates only. Actual amounts may vary. Tax estimates use 2026 standard deduction and marginal rates. Actual tax liability depends on total household income. Consult a tax professional. Growth rates based on historical averages and are not guaranteed. Not financial advice.";

      const drawPageBg = () => {
        const bg = isLight ? [255,255,255] : [10,14,26];
        doc.setFillColor(...bg); doc.rect(0,0,PW,PH,"F");
      };
      const hdrBar = () => {
        drawPageBg();
        doc.setFillColor(228,169,74); doc.rect(0,0,PW,3,"F"); // gold accent
        doc.setFillColor(17,24,39); doc.rect(0,3,PW,69,"F");  // dark navy header always
        doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(...goldHdr); doc.text("MilCalc",M,44);
        doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(...hdrSub);
        doc.text(svgName ? `Transition Plan for ${svgName} · milcalc.app` : "Transition Plan · milcalc.app",M,60);
        doc.text(new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),PW-M,60,{align:"right"});
        y = 98;
      };
      const section = (title) => {
        if (y > 700) { doc.addPage(); hdrBar(); }
        y += 14;
        doc.setFillColor(...cardBg); doc.rect(M-8,y-4,PW-M*2+16,28,"F");
        doc.setFillColor(...gold);   doc.rect(M-8,y-4,3,28,"F"); // gold left accent
        doc.setFont("helvetica","bold"); doc.setFontSize(9);
        doc.setTextColor(...(isLight ? ink : mut));
        doc.text(title.toUpperCase(),M+4,y+14); y += 34;
      };
      const row = (label, value, color=ink) => {
        if (y > 720) { doc.addPage(); hdrBar(); }
        doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(...mut); doc.text(label,M,y);
        doc.setFont("helvetica","bold"); doc.setTextColor(...color); doc.text(value,PW-M,y,{align:"right"});
        doc.setDrawColor(...divider); doc.line(M,y+5,PW-M,y+5); y += 24;
      };
      const nl = (h=14) => { y += h; };

      // ── PAGE 1: Profile & Assumptions ──────────────────────────────────
      hdrBar();
      if (svgName) { doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(...ink); doc.text(svgName,M,y); y += 24; }
      section("PROFILE");
      row("Current Pay Grade", payGrade);
      row("Pay Grade at Retirement", retGrade);
      row("Current YOS", `${currentYos} years`);
      row("Current Age", `${currentAge}`);
      row("Retirement System", retType);
      if (va > 0) row(`VA Rating`, `${vaRating}% · ${fmt(Math.round(va))}/mo (tax-free)`);
      row("Home State", selState);
      nl(12);

      section("TSP & SAVINGS");
      if (tspBalance > 0) row("TSP Current Balance", `$${tspBalance.toLocaleString()}`);
      row("TSP Contribution", `${tspPct}% of base pay`);
      if (isBRS) {
        row("DoD Auto-Contribution (BRS)", `1% · ${fmt(Math.round(autoAmt))}/mo`);
        row("DoD Match (BRS)", `up to 4% · ${fmt(Math.round(matchT1+matchT2))}/mo`);
      }
      row("Assumed TSP Growth Rate", "7% annually (blended C/S/I - historical avg.)");
      if (tspAt65A > 0) row("TSP Projected at 65 (Leave Early)", `$${Math.round(tspAt65A).toLocaleString()}`);
      if (tspAt65B > 0) row("TSP Projected at 65 (Stay to Ret.)", `$${Math.round(tspAt65B).toLocaleString()}`);
      nl(6); row("TSP Monthly Draw (4% rule)", "Annual balance × 4% ÷ 12 months", mut);
      nl(12);

      const hysaSignificant = hysaBal >= 100 || hysaContrib > 0;
      if (hysaSignificant || othBal > 0 || othContrib > 0) {
      section("HYSA & OTHER INVESTMENTS");
      if (hysaBal >= 100) row("HYSA Balance", `$${hysaBal.toLocaleString()}`);
      if (hysaContrib > 0) row("HYSA Monthly Contribution", `$${hysaContrib.toLocaleString()}`);
      if (hysaSignificant) row("HYSA APY", `${hysaApy}% (will fluctuate with Fed rate)`);
      if (hysaAt65 > 0 && hysaSignificant) row("HYSA Projected at 65", `$${Math.round(hysaAt65).toLocaleString()}`);
      if (othBal > 0 || othContrib > 0) {
        row("Other Investments Balance", `$${othBal.toLocaleString()}`);
        row("Other Investments Monthly Contribution", `$${othContrib.toLocaleString()}`);
        row("Other Investments Return Rate", `${othRate}% annually (S&P 500 historical avg. ~10% nominal, ~7% real)`);
        row("Other Investments Projected at 65", `$${Math.round(othAt65).toLocaleString()}`);
      }
      nl(12);
      } // end HYSA/other guard

      section("HEALTH INSURANCE");
      row("Civilian Health Insurance (Leave Early)", hiCost > 0 ? `-${fmt(hiCost)}/mo (${hiDeps})` : "$0/mo");
      row("TRICARE (Stay to Retirement)", tricarePremB > 0 ? `-${fmt(tricarePremB)}/mo` : "$0/mo (covered)");
      nl(12);

      if (giUseA && giMhaA > 0) {
        section("GI BILL (LEAVE EARLY SCENARIO)");
        const giTypeLabel = giTypeA === "ch30" ? "MGIB Active Duty (Ch. 30)" : giTypeA === "ch1606" ? "MGIB Selected Reserve (Ch. 1606)" : "Post-9/11 (Ch. 33)";
        row("GI Bill Type", giTypeLabel);
        row("Monthly Stipend / MHA", `${fmt(giMhaA)}/mo`);
        row("Entitlement Remaining", `${giMonthsA} months`);
        row("GI Bill Income Note", `Applies for first ${giMonthsA} months after separation only`);
        nl(12);
      }

      // ── PAGE 2: Scenario Comparison ────────────────────────────────────
      doc.addPage(); hdrBar();
      doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(...ink);
      doc.text("Scenario Comparison", M, y); y += 24;
      doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(...mut);
      doc.text("Compare the long-term financial difference between leaving early versus staying to earn a pension.", M, y); y += 20;
      nl(8);

      // Two-column comparison table helpers
      const TBL_X = M, TBL_W = PW - M*2;
      const X_A = 375, X_B = 552; // fixed right-edge x positions: Leave Early, Stay
      const tblRow = (label, valA, valB, colorA=ink, colorB=ink) => {
        if (y > 720) { doc.addPage(); hdrBar(); }
        doc.setFillColor(...cardBg); doc.rect(TBL_X,y-2,TBL_W,22,"F");
        doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(...mut); doc.text(label,TBL_X+8,y+13);
        doc.setFont("helvetica","bold"); doc.setTextColor(...colorA); doc.text(valA,X_A,y+13,{align:"right"});
        doc.setTextColor(...colorB); doc.text(valB,X_B,y+13,{align:"right"});
        y += 26;
      };
      const tblSectionHdr = (label) => {
        if (y > 700) { doc.addPage(); hdrBar(); }
        y += 8;
        doc.setFillColor(...cardBg2); doc.rect(TBL_X,y-2,TBL_W,22,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(...(isLight ? ink : mut));
        doc.text(label.toUpperCase(), TBL_X+8, y+13);
        y += 26;
      };

      // Table header
      doc.setFillColor(...cardBg2); doc.rect(TBL_X,y-2,TBL_W,28,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...(isLight ? ink : mut)); doc.text("Income Source",TBL_X+8,y+16);
      doc.setTextColor(...gold); doc.text(`If You Leave (YOS ${safeSep})`,X_A,y+16,{align:"right"});
      doc.setTextColor(...gn);   doc.text(`If You Stay (YOS ${safeTgt})`,X_B,y+16,{align:"right"});
      y += 32;

      // ── PHASE 1: Available at retirement ──
      tblSectionHdr(`Phase 1 - Available at Retirement (no investment draws)`);
      tblRow("Monthly Pension (after federal & state tax est.)", "--", pensNetFed > 0 ? fmt(Math.round(pensNetFed))+"/mo" : "--", mut, pensNetFed > 0 ? gn : mut);
      if (va > 0) tblRow(`VA Disability (${vaRating}%)`, fmt(Math.round(va))+"/mo", fmt(Math.round(va))+"/mo", gold, gn);
      if (giUseA && giMhaA > 0) tblRow(`GI Bill MHA (${giMonthsA} mo)*`, fmt(giMhaA)+"/mo", "--", gold, mut);
      tblRow("Health Insurance / TRICARE", hiCost > 0 ? `-${fmt(Math.round(hiCost))}/mo` : "$0/mo", tricarePremB > 0 ? `-${fmt(Math.round(tricarePremB))}/mo` : "$0 TRICARE", rd, tricarePremB > 0 ? rd : gn);
      // Phase 1 totals — header + component breakdown
      const moA_pre65 = va - hiCost;  // leave early: VA minus health ins (no pension, civilian salary not shown here)
      if (y > 700) { doc.addPage(); hdrBar(); }
      // Section header
      doc.setFillColor(...(isLight ? [241,245,249] : [24,34,52])); doc.rect(TBL_X,y-2,TBL_W,22,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...ink);
      doc.text("Phase 1 Take-Home Components",TBL_X+8,y+14);
      y += 24;
      // Component rows
      const compRow = (lbl, vA, vB, cA, cB) => {
        doc.setFillColor(...(isLight ? [248,250,252] : [18,26,42])); doc.rect(TBL_X,y-2,TBL_W,20,"F");
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...mut);
        doc.text("  "+lbl, TBL_X+8, y+12);
        doc.setTextColor(...cA); doc.text(vA, X_A, y+12, {align:"right"});
        doc.setTextColor(...cB); doc.text(vB, X_B, y+12, {align:"right"});
        y += 22;
      };
      if (va > 0) compRow(`VA Disability (${vaRating}%)`, fmt(Math.round(va))+"/mo", fmt(Math.round(va))+"/mo", gold, gn);
      compRow("Health Ins. / TRICARE", hiCost > 0 ? `-${fmt(Math.round(hiCost))}/mo` : "$0/mo", tricarePremB > 0 ? `-${fmt(Math.round(tricarePremB))}/mo` : "$0 (free)", rd, tricarePremB > 0 ? rd : gn);
      if (pensNetFed > 0) compRow("Pension (after tax)", "--", fmt(Math.round(pensNetFed))+"/mo", mut, gn);
      // Total row
      doc.setFillColor(...(isLight ? [226,232,240] : [28,40,58])); doc.rect(TBL_X,y-2,TBL_W,26,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...ink);
      doc.text("Phase 1 Total",TBL_X+8,y+16);
      doc.setTextColor(...gold); doc.text(fmt(Math.round(moA_pre65))+"/mo",X_A,y+16,{align:"right"});
      doc.setTextColor(...(moB_pre65 > 0 ? gn : rd)); doc.text(fmt(Math.round(moB_pre65))+"/mo",X_B,y+16,{align:"right"});
      y += 30; nl(4);

      // ── PHASE 2: Projected at 65 ──
      // Phase 2 assumptions note
      if (y > 700) { doc.addPage(); hdrBar(); }
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(...mut);
      const phase2NoteLines = doc.splitTextToSize("Phase 2 projections assume: 7% annual growth on TSP and investments, current HYSA APY, 4% annual withdrawal rate (Bengen 1994). Contributions continue through retirement age. These are long-term historical averages -- actual returns will vary.", PW-M*2);
      doc.text(phase2NoteLines, M, y); y += phase2NoteLines.length * 13 + 8;
      tblSectionHdr("Phase 2 - Projected at Age 65 (adds investment draws - not available at retirement)");
      if (tspDrawA > 0 || tspDrawB > 0) tblRow("TSP Draw at 65 (4% rule)",
        tspDrawA > 0 ? `${fmt(Math.round(tspDrawA))}/mo` : "--",
        tspDrawB > 0 ? `${fmt(Math.round(tspDrawB))}/mo` : "--",
        gold, gn);
      if (hysaDraw > 0 && hysaSignificant) tblRow("HYSA Draw at 65 (4% rule)",
        `${fmt(Math.round(hysaDraw))}/mo`,
        `${fmt(Math.round(hysaDraw))}/mo`,
        gold, gn);
      if (othDraw > 0) tblRow("Other Inv. Draw at 65 (4% rule)",
        `${fmt(Math.round(othDraw))}/mo`,
        `${fmt(Math.round(othDraw))}/mo`,
        gold, gn);
      // Phase 2 totals
      doc.setFillColor(...(isLight ? [226,232,240] : [30,41,59])); doc.rect(TBL_X,y-2,TBL_W,30,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text("Total Monthly Income at 65",TBL_X+8,y+18);
      doc.setTextColor(...gold); doc.text(fmt(Math.round(moA_at65))+"/mo",X_A,y+18,{align:"right"});
      doc.setTextColor(...gn);   doc.text(fmt(Math.round(moB_at65))+"/mo",X_B,y+18,{align:"right"});
      y += 38; nl(24);

      // Break-even highlight
      const bkC = breakEvenAge && breakEvenAge <= 65 ? (isLight ? [220,252,231] : [20,60,35]) : breakEvenAge ? (isLight ? [254,249,195] : [60,45,10]) : (isLight ? [254,226,226] : [60,10,10]);
      doc.setFillColor(...bkC); doc.rect(M,y,PW-M*2,68,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(32);
      doc.setTextColor(...(breakEvenAge ? (breakEvenAge <= 65 ? gn : gold) : rd));
      doc.text(breakEvenAge ? String(breakEvenAge) : "N/A", M+16, y+46);
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...ink);
      doc.text("Break-even age", M+80, y+24);
      doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(...mut);
      doc.text(breakEvenAge
        ? `Staying pays off financially at age ${breakEvenAge}.`
        : `Staying may not break even by age ${chartEnd}.`, M+80, y+40);
      const diffM = moB_at65 - moA_at65;
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...(diffM >= 0 ? gn : rd));
      doc.text(`${diffM >= 0 ? "+" : ""}${fmt(Math.round(diffM))}/mo difference at age 65`, M+80, y+56);
      y += 80; nl(16);

      if (giUseA && giMhaA > 0) {
        doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(...mut);
        doc.text(`* GI Bill income of ${fmt(giMhaA)}/mo applies for ${giMonthsA} months after separation only and is not included in the age-65 total.`, M, y); y += 14;
      }

      // ── PLAIN ENGLISH SUMMARY ──────────────────────────────────────────
      nl(12);
      if (y > 640) { doc.addPage(); hdrBar(); }
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...ink);
      doc.text("Plain-English Summary", M, y); y += 20;

      doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(...gold);
      const peSummLeave = `If you leave at YOS ${safeSep}: Non-pension income starts at ${fmt(Math.round(va - hiCost))}/mo (VA - health ins.). By age 65 with continued savings, projected total income is ${fmt(Math.round(moA_at65))}/mo.`;
      const peSl1 = doc.splitTextToSize(peSummLeave, PW-M*2);
      if (y + peSl1.length * 14 > 742) { doc.addPage(); hdrBar(); }
      doc.text(peSl1, M, y); y += peSl1.length * 14 + 8;

      doc.setTextColor(...gn);
      const peSummStay = `If you stay to YOS ${safeTgt}: Retirement income starts at ${fmt(Math.round(summaryPhase1))}/mo from pension + VA. By age 65, projected total income is ${fmt(Math.round(moB_at65))}/mo.`;
      const peSl2 = doc.splitTextToSize(peSummStay, PW-M*2);
      if (y + peSl2.length * 14 > 742) { doc.addPage(); hdrBar(); }
      doc.text(peSl2, M, y); y += peSl2.length * 14 + 8;

      const peDiff = moB_at65 - moA_at65;
      doc.setFont("helvetica","bold");
      doc.setTextColor(...(peDiff >= 0 ? gn : gold));
      const peSummDiff = peDiff >= 0
        ? `Staying to retirement generates approximately ${fmt(Math.round(peDiff))} more per month at age 65 -- a difference of ${fmt(Math.round(peDiff * 12))} per year.`
        : `Leaving early and investing generates approximately ${fmt(Math.round(-peDiff))} more per month at age 65 -- a difference of ${fmt(Math.round(-peDiff * 12))} per year.`;
      const peSl3 = doc.splitTextToSize(peSummDiff, PW-M*2);
      if (y + peSl3.length * 14 > 742) { doc.addPage(); hdrBar(); }
      doc.text(peSl3, M, y); y += peSl3.length * 14 + 16;

      // Footer on all pages
      // Debriefed promo box on last page
      const lastPg = doc.getNumberOfPages(); doc.setPage(lastPg);
      const promoY = 720;
      doc.setDrawColor(...gold); doc.setLineWidth(1);
      doc.rect(M - 6, promoY, PW - M * 2 + 12, 36, "S");
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...gold);
      doc.text("Planning your transition?", M, promoY + 11);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...mut);
      doc.text("Translate your military experience into a civilian resume at", M, promoY + 22);
      doc.setTextColor(...gold); doc.text("getdebriefed.co", M, promoY + 32);

      // Footer on all pages
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...mut);
        doc.text(disc, M, 762, { maxWidth: PW-M*2, lineHeightFactor: 1.6 });
      }

      doc.save("milcalc-stayvsgo.pdf");
      track("PDF Exported", { path: "serving", has_va: vaRating > 0, has_gi_bill: giUseA && giMhaA > 0, ret_grade: retGrade, pay_grade: payGrade });
    } catch (err) { console.error("PDF export error:", err); }
  };

  const handleShare = () => {
    setShowShareModal(true);
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
  const canNativeShare = (() => { try { return !!navigator.canShare && navigator.canShare({ files: [new File([], "t.png", { type: "image/png" })] }); } catch { return false; } })();
  const doShare = async () => {
    if (!shareBlobRef.current) return;
    const file = new File([shareBlobRef.current], "milcalc-stayvsgo.png", { type: "image/png" });
    if (canNativeShare) { try { await navigator.share({ files: [file], title: "My Stay vs Go — MilCalc" }); } catch (e) { } }
    else { const url = URL.createObjectURL(shareBlobRef.current); const a = document.createElement("a"); a.href = url; a.download = "milcalc-stayvsgo.png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{DS_CSS}</style>
      <style>{PAGE_CSS}</style>

      <NavHeader />

      <div className="sp-wrap">
        <div className="sp-inner">

          {/* ── SUMMARY BAR ── */}
          <SummaryBar
            label="Retirement income (Phase 1)"
            amount={summaryAmount}
            subtitle={summarySubtitle}
            at65={safeTgt >= 20 && summaryPhase2 !== summaryPhase1 ? fmt(Math.round(summaryPhase2)) : undefined}
            chips={summaryChips}
          />

          {/* ══════════════════════════════════════════════════════════════
              SECTION A — INPUTS
          ══════════════════════════════════════════════════════════════ */}

          <div className="sp-inputs-two">
            <div>
          {/* ── PROFILE CARD ── */}
          <SectionHeader>Your Profile</SectionHeader>
          <div className="ds-card">

            {/* Name (optional) */}
            <div className="sp-row">
              <span className="sp-row-lbl">Your name (optional)</span>
              <div className="sp-row-val" style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="e.g. SGT Smith"
                  value={svgName}
                  onChange={e => set("svg_name", e.target.value)}
                  style={{ textAlign: "right", width: "100%", minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                />
              </div>
            </div>

            {/* Pay grade (current) — full width stacked */}
            <div className="sp-stack">
              <span className="sp-lbl">Current Pay Grade</span>
              <select
                className="sp-select"
                value={payGrade}
                onChange={e => { set("svg_payGrade", e.target.value); if (!s.svg_retGrade) set("svg_retGrade", e.target.value); }}
              >
                {GRADE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.grades.map(gd => (
                      <option key={gd} value={gd}>{GRADE_LABELS[gd]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Fix 2: Retirement pay grade */}
            <div className="sp-stack">
              <span className="sp-lbl">Pay grade at retirement <em style={{ fontStyle: "normal", color: "#f0c14b" }}>(for pension calculation)</em></span>
              <select
                className="sp-select"
                value={retGrade}
                onChange={e => set("svg_retGrade", e.target.value)}
              >
                {GRADE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.grades.map(gd => (
                      <option key={gd} value={gd}>{GRADE_LABELS[gd]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>Your pension is based on your pay at retirement, not today.</div>
            </div>

            {/* YOS — Stepper */}
            <div className="sp-row">
              <span className="sp-row-lbl">Current YOS</span>
              <div className="sp-row-val">
                <Stepper value={currentYos} onChange={v => set("svg_cYos", v)} min={1} max={30} />
              </div>
            </div>
            {(currentYos < 1 || currentYos > 30) && (
              <span style={{ fontSize: "11px", color: "#b45309", margin: "-4px 16px 8px", display: "block" }}>
                Typical range is 1–30 YOS
              </span>
            )}

            {/* Age — free-type */}
            <div className="sp-row">
              <span className="sp-row-lbl">Current Age</span>
              <div className="sp-row-val">
                <input
                  type="text" inputMode="numeric"
                  value={currentAge}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const n = parseInt(raw, 10);
                    if (raw === "" || isNaN(n)) return;
                    set("svg_cAge", n);
                  }}
                  style={{ textAlign: "right", width: "4ch", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                />
              </div>
            </div>
            {(currentAge < 17 || currentAge > 62) && (
              <span style={{ fontSize: "11px", color: "#b45309", margin: "-4px 16px 8px", display: "block" }}>
                Typical range is 17–62
              </span>
            )}

            {/* Retirement system */}
            <ToggleGroup
              label="Retirement System"
              options={["High-3", "BRS", "REDUX"]}
              value={retType}
              onChange={v => set("svg_retType", v)}
            />
            {isREDUX && (
              <HintBox>REDUX: 40% multiplier at 20 years (vs 50% High-3). You receive a $30,000 Career Status Bonus at 15 YOS. Each year past 20 adds 3.5% instead of 2.5%.</HintBox>
            )}

            {/* VA Rating */}
            <div className="sp-row">
              <span className="sp-row-lbl">VA Rating</span>
              <div className="sp-row-val">
                <div className="ds-sel">
                  <select
                    value={vaRating}
                    onChange={e => { const r = parseInt(e.target.value); set("svg_vaRat", r); track("VA Rating Selected", { rating: r }); }}
                  >
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(r => (
                      <option key={r} value={r}>{r === 0 ? "None" : `${r}%`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* VA Dependency — show if 30%+ */}
            {vaRating >= 30 && (
              <div className="sp-row">
                <span className="sp-row-lbl">VA Dependents</span>
                <div className="sp-row-val">
                  <div className="ds-sel">
                    <select
                      value={vaDep}
                      onChange={e => set("svg_vaDep", e.target.value)}
                    >
                      <option value="alone">Alone</option>
                      <option value="spouse">+ Spouse</option>
                      <option value="sp_1c">+ Spouse + 1 child</option>
                      <option value="sp_2c">+ Spouse + 2 children</option>
                      <option value="sp_3c">+ Spouse + 3+ children</option>
                      <option value="s_1c">Single + 1 child</option>
                      <option value="s_2c">Single + 2 children</option>
                      <option value="s_3c">Single + 3+ children</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* State — for pension net calc */}
            <div className="sp-row" style={{ borderBottom: "none" }}>
              <span className="sp-row-lbl">Home State</span>
              <div className="sp-row-val">
                <div className="ds-sel">
                  <select
                    value={selState}
                    onChange={e => { set("svg_state", e.target.value); track("State Selected", { state: e.target.value }); }}
                  >
                    {Object.keys(STATES).sort().map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

            </div>
            <div>
          {/* ── TSP & SAVINGS CARD ── */}
          <SectionHeader>TSP &amp; Savings</SectionHeader>
          <div className="ds-card">

            {/* TSP balance + contribution % — two columns (Fix 4: info tooltip on Contribution %) */}
            <div className="sp-two">
              {!isSplitSvg && (
                <div className="sp-col">
                  <span className="sp-col-lbl">TSP Balance</span>
                  <div className="sp-col-row">
                    <span className="sp-pre">$</span>
                    <input
                      type="text" inputMode="numeric"
                      value={tspBalance}
                      onFocus={SEL}
                      onChange={e => set("svg_tspBal", Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                    />
                  </div>
                </div>
              )}
              <div className="sp-col">
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <span className="sp-col-lbl" style={{ marginBottom: 0 }}>Contribution %</span>
                  <button type="button" onClick={() => setTtTsp(!ttTsp)} style={{ background: "none", border: "1.5px solid #d4a017", borderRadius: "50%", width: 15, height: 15, cursor: "pointer", color: "#d4a017", fontSize: 9, fontWeight: 700, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>i</button>
                </div>
                <div className="sp-col-row">
                  <input
                    type="text" inputMode="decimal"
                    value={tspPct}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const n = parseFloat(raw);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_tspPct", n);
                    }}
                    style={{ width: "5ch", textAlign: "right", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                  <span className="sp-suf">%</span>
                </div>
                {isBRS && <div className="sp-col-hint">{fmt(Math.round(memberAmt))}/mo yours</div>}
                {ttTsp && <div className="sp-col-hint" style={{ color: "#9ca3af", background: "rgba(212,160,23,0.06)", borderLeft: "2px solid #d4a017", padding: "6px 8px", borderRadius: "0 4px 4px 0", marginTop: 4 }}>TSP C Fund has averaged ~10% annually over 30 years. A blended allocation (C/S/I funds) typically averages 7–8%. Be conservative — we default to 7%.</div>}
                {tspPct > 100 && <div className="sp-col-hint" style={{ color: "#b45309" }}>IRS limit is 100%</div>}
              </div>
            </div>

            {/* BRS hint box */}
            {isBRS && (
              <HintBox variant={showBrsWarn ? "red" : fullMatch ? "green" : "gold"}>
                {showBrsWarn
                  ? <>You're leaving free money on the table. Contribute 5% to get the full DoD match (+{fmt(Math.round(basePay * 0.04))}/mo automatic).</>
                  : <>Monthly TSP: <strong>{fmt(Math.round(totalContrib))}/mo total</strong> — {fmt(Math.round(memberAmt))} yours + {fmt(Math.round(autoAmt))} auto + {fmt(Math.round(matchT1 + matchT2))} match{fullMatch ? ". Full match unlocked ✓" : "."}</>
                }
              </HintBox>
            )}

            {/* TSP Type toggle */}
            <div style={{ marginTop:8, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#6b7280", marginBottom:6 }}>TSP Type:</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                {[["traditional","Traditional"],["roth","Roth"],["split","Split"]].map(([t,l]) => (
                  <button key={t} type="button"
                    onClick={() => set("svg_tspType", t)}
                    style={{
                      fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:6,
                      background: tspTypeSvg === t ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${tspTypeSvg === t ? "#d4a017" : "rgba(255,255,255,0.1)"}`,
                      color: tspTypeSvg === t ? "#f0c14b" : "#9ca3af",
                      cursor:"pointer", fontFamily:"inherit",
                    }}
                  >{l}</button>
                ))}
              </div>
              {isSplitSvg && (
                <div className="sp-two" style={{ marginBottom:0 }}>
                  <div className="sp-col">
                    <span className="sp-col-lbl">Traditional Bal <span style={{color:"#9ca3af",fontSize:10}}>(taxable)</span></span>
                    <div className="sp-col-row">
                      <span className="sp-pre">$</span>
                      <input type="text" inputMode="numeric" value={s.svg_tspTradBal||""} onFocus={SEL}
                        onChange={e => set("svg_tspTradBal", parseInt(e.target.value.replace(/[^0-9]/g,""))||0)}
                        style={{ background:"transparent", border:"none", outline:"none", color:"#f9fafb", fontSize:15, fontWeight:500, fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }} />
                    </div>
                  </div>
                  <div className="sp-col">
                    <span className="sp-col-lbl">Roth Bal <span style={{color:"#4ade80",fontSize:10}}>(tax-free)</span></span>
                    <div className="sp-col-row">
                      <span className="sp-pre">$</span>
                      <input type="text" inputMode="numeric" value={s.svg_tspRothBal||""} onFocus={SEL}
                        onChange={e => set("svg_tspRothBal", parseInt(e.target.value.replace(/[^0-9]/g,""))||0)}
                        style={{ background:"transparent", border:"none", outline:"none", color:"#f9fafb", fontSize:15, fontWeight:500, fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* HYSA balance + APY — two columns (Fix 4: info tooltip on APY) */}
            <div className="sp-two">
              <div className="sp-col">
                <span className="sp-col-lbl">HYSA Balance</span>
                <div className="sp-col-row">
                  <span className="sp-pre">$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={hysaBal}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const n = parseInt(raw, 10);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_hysaBal", n);
                    }}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                </div>
              </div>
              <div className="sp-col">
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <span className="sp-col-lbl" style={{ marginBottom: 0 }}>APY</span>
                  <button type="button" onClick={() => setTtHysa(!ttHysa)} style={{ background: "none", border: "1.5px solid #d4a017", borderRadius: "50%", width: 15, height: 15, cursor: "pointer", color: "#d4a017", fontSize: 9, fontWeight: 700, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>i</button>
                </div>
                <div className="sp-col-row">
                  <input
                    type="text" inputMode="decimal"
                    value={hysaApy}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const n = parseFloat(raw);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_hysaApy", n);
                    }}
                    style={{ width: "5ch", textAlign: "right", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                  <span className="sp-suf">%</span>
                </div>
                {hysaAt65 > 100 && <div className="sp-col-hint">{fmt(Math.round(hysaDraw))}/mo at 65</div>}
                {ttHysa && <div className="sp-col-hint" style={{ color: "#9ca3af", background: "rgba(212,160,23,0.06)", borderLeft: "2px solid #d4a017", padding: "6px 8px", borderRadius: "0 4px 4px 0", marginTop: 4 }}>Current HYSA rates are 4–5% APY but will fluctuate with the Federal Reserve rate. Money market funds offer similar rates with more flexibility.</div>}
                {hysaApy > 15 && <div className="sp-col-hint" style={{ color: "#b45309" }}>Rates above 15% are unusually high</div>}
              </div>
            </div>

            {/* HYSA monthly contribution */}
            <div className="sp-row">
              <span className="sp-row-lbl">HYSA Monthly Contrib.</span>
              <div className="sp-row-val">
                <span className="sp-pre" style={{ color: "#6b7280" }}>$</span>
                <input
                  type="text" inputMode="numeric"
                  value={hysaContrib}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const n = parseInt(raw, 10);
                    if (raw === "" || isNaN(n)) return;
                    set("svg_hysaMo", n);
                  }}
                  style={{ width: "7ch", textAlign: "right", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                />
              </div>
            </div>

            {/* Fix 3: HYSA explanation HintBox */}
            <HintBox>
              <strong>HYSA = High-Yield Savings Account.</strong> Offered by online banks like Marcus, Ally, and SoFi — typically earning 4–5% APY vs 0.5% at traditional banks.
            </HintBox>

            {/* Other investments balance + monthly contribution */}
            <div className="sp-two">
              <div className="sp-col">
                <span className="sp-col-lbl">Other Inv. Balance</span>
                <div className="sp-col-row">
                  <span className="sp-pre">$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={othBal}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const n = parseInt(raw, 10);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_othBal", n);
                    }}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                </div>
                <div className="sp-col-hint">Brokerage, IRA, Roth</div>
              </div>
              <div className="sp-col">
                <span className="sp-col-lbl">Monthly Contrib.</span>
                <div className="sp-col-row">
                  <span className="sp-pre">$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={othContrib}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const n = parseInt(raw, 10);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_othMo", n);
                    }}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                </div>
                {othAt65 > 100 && <div className="sp-col-hint">{fmt(Math.round(othDraw))}/mo at 65</div>}
              </div>
            </div>

            {/* Expected return — Fix 4: info tooltip */}
            <div className="sp-row" style={{ borderBottom: "none", flexDirection: "column", alignItems: "stretch", gap: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 52, padding: 0 }}>
                <span className="sp-row-lbl" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Expected Annual Return (Other Inv.)
                  <button type="button" onClick={() => setTtOth(!ttOth)} style={{ background: "none", border: "1.5px solid #d4a017", borderRadius: "50%", width: 15, height: 15, cursor: "pointer", color: "#d4a017", fontSize: 9, fontWeight: 700, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>i</button>
                </span>
                <div className="sp-row-val">
                  <input
                    type="text" inputMode="decimal"
                    value={othRate}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const n = parseFloat(raw);
                      if (raw === "" || isNaN(n)) return;
                      set("svg_othRate", n);
                    }}
                    style={{ width: "5ch", textAlign: "right", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                  />
                  <span className="sp-suf">%</span>
                </div>
              </div>
              {ttOth && <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.55, background: "rgba(212,160,23,0.06)", borderLeft: "2px solid #d4a017", padding: "6px 8px", borderRadius: "0 4px 4px 0", margin: "0 0 8px" }}>The S&P 500 has averaged ~10% annually before inflation, ~7% after. Individual stock picking typically underperforms index funds. We recommend using 7% as a realistic long-term estimate.</div>}
              {othRate > 25 && <div style={{ fontSize: 11, color: "#b45309", margin: "0 0 8px" }}>Returns above 25% annually are unusually high</div>}
            </div>
          </div>

            </div>
          </div>{/* end sp-inputs-two */}

          {/* ── SCENARIOS CARD — Fix 5: renamed and explained ── */}
          <SectionHeader>Scenarios</SectionHeader>
          <HintBox>Compare the long-term financial difference between leaving the military before 20 years versus staying to earn a pension.</HintBox>
          <div className="ds-card">

            {/* Civilian salaries */}
            <div className="sp-sal-two">
              <div className="sp-sal-col">
                <span className="sp-sal-lbl">Civ. salary if leaving early</span>
                <div className="sp-sal-input">
                  <span className="sp-pre">$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={civSalary}
                    onFocus={SEL}
                    onChange={e => set("svg_civSal", Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                  />
                </div>
                <div className="sp-sal-hint">Annual gross</div>
              </div>
              <div className="sp-sal-col">
                <span className="sp-sal-lbl">Civ. salary after military retirement</span>
                <div className="sp-sal-input">
                  <span className="sp-pre">$</span>
                  <input
                    type="text" inputMode="numeric"
                    value={civSalBRaw > 0 ? civSalBRaw : Math.round(civSalary * 0.8)}
                    onFocus={SEL}
                    onChange={e => set("svg_civSalB", Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                  />
                </div>
                <div className="sp-sal-hint">Defaults to 80% of A</div>
              </div>
            </div>

            {/* Civilian retirement age */}
            <div className="sp-row">
              <span className="sp-row-lbl">Civilian Retirement Age</span>
              <div className="sp-row-val" style={{ flexDirection:"column", alignItems:"flex-end" }}>
                <input
                  type="text" inputMode="numeric"
                  value={s.svg_civRetAge ?? 65}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    if (raw === "") { set("svg_civRetAge", ""); return; }
                    const n = parseInt(raw, 10);
                    if (!isNaN(n)) set("svg_civRetAge", n);
                  }}
                  style={{ width: "4ch" }}
                />
                {(() => { const v = s.svg_civRetAge ?? 65; return (typeof v === "number" && (v < 55 || v > 75)) ? <span style={{ fontSize:10, color:"#f59e0b", marginTop:3 }}>Typical range: 55–75</span> : null; })()}
              </div>
            </div>

            {/* Health insurance */}
            <div className="sp-row">
              <span className="sp-row-lbl">Health Ins. (If You Leave Early)</span>
              <div className="sp-row-val">
                <ToggleGroup
                  options={[{ v: "single", l: "Single" }, { v: "family", l: "Family" }]}
                  value={hiDeps}
                  onChange={v => { set("svg_hiDeps", v); set("svg_hiCost", v === "family" ? 1300 : 450); }}
                />
              </div>
            </div>
            <div className="sp-row">
              <span className="sp-row-lbl">Est. Monthly Premium</span>
              <div className="sp-row-val">
                <span className="sp-pre" style={{ color: "#6b7280" }}>$</span>
                <input
                  type="text" inputMode="numeric"
                  value={hiCost}
                  onFocus={SEL}
                  onChange={e => set("svg_hiCost", Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                  style={{ width: "6ch" }}
                />
                <span className="sp-suf" style={{ fontSize: 11, color: "#6b7280" }}>/mo</span>
              </div>
            </div>

            {/* TRICARE plan (If You Stay — retired) */}
            <div className="sp-row">
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="sp-row-lbl">TRICARE Plan (If You Stay)</span>
                <button
                  type="button"
                  onClick={() => setShowTricareInfo(v => !v)}
                  style={{
                    width:18, height:18, borderRadius:"50%",
                    background: showTricareInfo ? "rgba(212,160,23,0.2)" : "rgba(212,160,23,0.08)",
                    border:"1px solid rgba(212,160,23,0.35)",
                    color:"#d4a017", fontSize:11, fontWeight:700,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, lineHeight:1, padding:0, fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent",
                  }}
                  aria-label="TRICARE plan info"
                >ⓘ</button>
              </div>
              <div className="sp-row-val">
                <div className="ds-sel">
                  <select
                    value={tricarePlanB}
                    onChange={e => { set("svg_tricarePlan", e.target.value); track("TRICARE Plan Selected", { plan: e.target.value }); }}
                  >
                    {SP_TRICARE_OPTS.map(t => (
                      <option key={t.v} value={t.v}>{t.l}{t.amt() > 0 ? ` — $${t.amt()}/mo` : " — Free"}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {showTricareInfo && (
              <div style={{ padding:"12px 16px", background:"rgba(212,160,23,0.05)", borderTop:"1px solid rgba(212,160,23,0.12)", borderBottom:"1px solid rgba(212,160,23,0.12)", fontSize:13, lineHeight:1.6, color:"#d1d5db" }}>
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

            {/* If You Leave Early slider */}
            <SliderField
              label="If You Leave Early"
              value={safeSep}
              min={currentYos + 1}
              max={19}
              step={1}
              onChange={v => set("svg_sepYos", v)}
              badge={`YOS ${safeSep} · Age ${sepAge}`}
              badgeColor="gold"
              minLabel={`YOS ${currentYos + 1}`}
              maxLabel="YOS 19"
            />

            {/* If You Stay slider */}
            <SliderField
              label="If You Stay to Retirement"
              value={safeTgt}
              min={currentYos + 1}
              max={30}
              step={1}
              onChange={v => set("svg_tgtYos", v)}
              badge={`YOS ${safeTgt} · Age ${retAge}${safeTgt < 20 ? " · ⚠ no pension" : ""}`}
              badgeColor="green"
              minLabel={`YOS ${currentYos + 1}`}
              maxLabel="YOS 30"
            />
          </div>

          {/* ── Fix 8: GI BILL SECTION (Leave Early scenario only) ── */}
          <SectionHeader>GI Bill (If You Leave Early)</SectionHeader>
          <div className="ds-card">
            <div className="sp-row">
              <span className="sp-row-lbl">Use GI Bill entitlement?</span>
              <div className="sp-row-val">
                <div className="ds-sel">
                  <select value={giUseA ? "yes" : "no"} onChange={e => set("svg_giUse", e.target.value === "yes")}>
                    <option value="no">Not using</option>
                    <option value="yes">Yes — include in Leave Early scenario</option>
                  </select>
                </div>
              </div>
            </div>
            {giUseA && (
              <>
                <div className="sp-row">
                  <span className="sp-row-lbl">GI Bill type</span>
                  <div className="sp-row-val">
                    <div className="ds-sel">
                      <select value={giTypeA} onChange={e => set("svg_giType", e.target.value)}>
                        <option value="post911">Post-9/11 (Ch. 33)</option>
                        <option value="ch30">MGIB Active Duty (Ch. 30)</option>
                        <option value="ch1606">MGIB Selected Reserve (Ch. 1606)</option>
                      </select>
                    </div>
                  </div>
                </div>
                {!isMGIBA && (
                  <>
                    <div className="sp-stack">
                      <span className="sp-lbl">School location</span>
                      <select
                        className="sp-select"
                        value={giOnlineA ? "__online__" : giCityA}
                        onChange={e => {
                          if (e.target.value === "__online__") { set("svg_giOnline", true); }
                          else { set("svg_giOnline", false); set("svg_giCity", e.target.value); }
                        }}
                      >
                        <option value="__online__">Online Only (${GI_BILL_ONLINE_MHA}/mo)</option>
                        {MHA_CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sp-row">
                      <span className="sp-row-lbl">Eligibility tier</span>
                      <div className="sp-row-val">
                        <div className="ds-sel">
                          <select value={giEligPctA} onChange={e => set("svg_giEligPct", Number(e.target.value))}>
                            {[100,90,80,70,60,50,40].map(p => <option key={p} value={p}>{p}%</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {isMGIBA && (
                  <>
                    <div className="sp-row">
                      <span className="sp-row-lbl">Enrollment status</span>
                      <div className="sp-row-val">
                        <div className="ds-sel">
                          <select value={mgibEnrollA} onChange={e => set("svg_mgibEnroll", e.target.value)}>
                            {MGIB_ENROLL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    {giTypeA === "ch30" && (
                      <div className="sp-row">
                        <span className="sp-row-lbl">Active duty service</span>
                        <div className="sp-row-val">
                          <div className="ds-sel">
                            <select value={mgibServiceYearsA} onChange={e => set("svg_mgibServiceYears", e.target.value)}>
                              <option value="3+">3+ years</option>
                              <option value="2-3">2–3 years</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    <HintBox>MGIB pays directly to you and is taxable income — unlike Post-9/11 which pays tuition to the school and provides a tax-free housing allowance.</HintBox>
                  </>
                )}
                <div className="sp-row">
                  <span className="sp-row-lbl">Months of entitlement remaining</span>
                  <div className="sp-row-val">
                    <input
                      type="text" inputMode="numeric"
                      value={giMonthsA}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        const n = parseInt(raw, 10);
                        if (raw === "" || isNaN(n)) return;
                        set("svg_giMonths", n);
                      }}
                      style={{ width: "4ch", textAlign: "right", background: "transparent", border: "none", outline: "none", color: "#f9fafb", fontSize: 15, fontWeight: 500, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
                    />
                    <span className="sp-suf">mo</span>
                  </div>
                  {giMonthsA > 36 && (
                    <span style={{ fontSize: 11, color: "#b45309", display: "block", marginTop: 3 }}>
                      Standard GI Bill entitlement is 36 months
                    </span>
                  )}
                </div>
                {giMhaA > 0 && (
                  <div className="sp-row" style={{ background: "rgba(212,160,23,0.06)", borderTop: "1px solid rgba(212,160,23,0.15)" }}>
                    <span className="sp-row-lbl" style={{ color: "#f0c14b" }}>GI Bill {isMGIBA ? "Stipend" : "MHA"} — Leave Early</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 600, color: "#f0c14b" }}>{fmt(giMhaA)}/mo</span>
                  </div>
                )}
                <HintBox>GI Bill income applies for {giMonthsA} months after separation only. It is <strong>not</strong> included in the age-65 totals — those figures show long-term steady-state income. GI Bill income boosts your cumulative earnings in the early years after leaving.</HintBox>
              </>
            )}
          </div>

          {/* ── CTA ── */}
          <CTAButton onClick={() => {
            setShowResults(true);
            track("Pension Calculated", {
              retirement_type: retType,
              yos: safeTgt,
              pay_grade: payGrade,
              has_va: vaRating > 0,
              state: selState,
            });
          }}>
            Calculate My Scenarios
          </CTAButton>

          {/* ══════════════════════════════════════════════════════════════
              SECTION B — RESULTS (shown after CTA)
          ══════════════════════════════════════════════════════════════ */}
          {showResults && (
            <div className="sp-results">

              {/* ── COMPARISON CARDS — Fix 5: renamed, Fix 8: GI Bill, Fix 9: 4% tooltip ── */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:"1.25rem", marginBottom:10 }}>
                <div className="ds-section-hdr" style={{ margin:0 }}>Side-by-Side Comparison</div>
                <button
                  type="button"
                  onClick={() => setShowBahInfo(v => !v)}
                  style={{
                    width:18, height:18, borderRadius:"50%",
                    background: showBahInfo ? "rgba(212,160,23,0.2)" : "rgba(212,160,23,0.08)",
                    border:"1px solid rgba(212,160,23,0.35)",
                    color:"#d4a017", fontSize:11, fontWeight:700,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, lineHeight:1, padding:0, fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent",
                  }}
                  aria-label="Why no BAH or BAS?"
                >ⓘ</button>
              </div>
              {showBahInfo && (
                <div style={{ padding:"12px 16px", background:"rgba(212,160,23,0.05)", border:"1px solid rgba(212,160,23,0.2)", borderRadius:8, marginBottom:10, fontSize:13, lineHeight:1.6, color:"#d1d5db" }}>
                  <div style={{ fontWeight:700, color:"#f0c14b", marginBottom:6, fontSize:12 }}>Why no BAH?</div>
                  BAH and BAS are active duty allowances — they stop at separation and are not part of your retirement income. This calculator shows your post-separation retirement income only. Your full active duty compensation including BAH and BAS is shown in the <span style={{ color:"#f0c14b", fontWeight:600 }}>Transitioning calculator</span>.
                </div>
              )}
              {currentYos < 5 && (
                <HintBox variant="gold">
                  These projections assume you stay to YOS 20+. With only {currentYos} year{currentYos === 1 ? '' : 's'} of service today, these are long-range estimates — run this again as you get closer to your decision point for more accurate numbers.
                </HintBox>
              )}
              <div className="sp-cmp">

                {/* If You Leave Early */}
                <div className="sp-cmp-card sp-cmp-card-a">
                  <div className="sp-cmp-head sp-cmp-head-a">
                    If You Leave Early<br /><span style={{ fontSize: 9, opacity: 0.8 }}>YOS {safeSep} · Age {sepAge}</span>
                  </div>
                  <div className="sp-cmp-row">
                    <span className="sp-cmp-rl">No pension</span>
                    <span className="sp-cmp-rv mut">$0/mo</span>
                  </div>
                  <div className="sp-cmp-row">
                    <span className="sp-cmp-rl">Civ. Salary</span>
                    <span className="sp-cmp-rv gold">{fmt(Math.round(civSalary / 12))}/mo</span>
                  </div>
                  {va > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">VA ({vaRating}%)</span>
                      <span className="sp-cmp-rv gold">{fmt(Math.round(va))}/mo</span>
                    </div>
                  )}
                  {/* Fix 9: TSP draw with 4% rule tooltip */}
                  <div className="sp-cmp-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="sp-cmp-rl" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        TSP draw (65+)
                        <button type="button" onClick={() => setTt4A(!tt4A)} style={{ background: "none", border: "1.5px solid #d4a017", borderRadius: "50%", width: 13, height: 13, cursor: "pointer", color: "#d4a017", fontSize: 8, fontWeight: 700, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>i</button>
                      </span>
                      <span className={`sp-cmp-rv ${tspDrawA > 0 ? "gold" : "mut"}`}>{tspDrawA > 0 ? `${fmt(Math.round(tspDrawA))}/mo` : "—"}</span>
                    </div>
                    {tt4A && <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1.5, background: "rgba(212,160,23,0.06)", borderLeft: "2px solid #d4a017", padding: "4px 6px", borderRadius: "0 3px 3px 0", marginTop: 2 }}>The 4% rule: withdraw 4% of savings annually without running out over 30 years. E.g. $400k × 4% = $16k/yr = $1,333/mo. Not a guarantee — depends on market performance. Source: Bengen (1994).</div>}
                  </div>
                  <div style={{ fontSize: 9, color: "#6b7280", padding: "1px 10px 4px" }}>
                    Contributions stop at YOS {safeSep} · balance grows to 65
                  </div>
                  {hysaDraw > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">HYSA (65+)</span>
                      <span className="sp-cmp-rv gold">{fmt(Math.round(hysaDraw))}/mo</span>
                    </div>
                  )}
                  {othDraw > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">Other inv. (65+)</span>
                      <span className="sp-cmp-rv gold">{fmt(Math.round(othDraw))}/mo</span>
                    </div>
                  )}
                  {/* Fix 8: GI Bill row */}
                  {giUseA && giMhaA > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">GI Bill ({giMonthsA} mo)*</span>
                      <span className="sp-cmp-rv gold">{fmt(giMhaA)}/mo</span>
                    </div>
                  )}
                  {hiCost > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl" style={{ color: "#f87171" }}>Health Ins.</span>
                      <span className="sp-cmp-rv red">−{fmt(Math.round(hiCost))}/mo</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.04)", padding: "5px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 11, color: "#f0c14b", fontWeight: 700 }}>Phase 1 take-home</span>
                      <span style={{ fontSize: 13, color: "#f0c14b", fontWeight: 700 }}>{fmt(Math.round(va - hiCost))}/mo</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>VA − health ins. · no pension · salary shown above</div>
                  </div>
                  <div style={{ padding: "3px 10px 5px", borderBottom: "1px solid rgba(212,160,23,0.15)" }}>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>Phase 2 — projected at 65</div>
                    <div style={{ fontSize: 8, color: "#4b5563", marginTop: 2, lineHeight: 1.4 }}>7% growth · 4% withdrawal (Bengen 1994) · HYSA at current APY</div>
                  </div>
                  <div className="sp-cmp-row mut">
                    <span className="sp-cmp-rl">TSP bal @ 65</span>
                    <span className="sp-cmp-rv mut">{fmt(Math.round(tspAt65A))}</span>
                  </div>
                  <div className="sp-cmp-total">
                    <span className="sp-cmp-total-l">Phase 2 (at 65)</span>
                    <span className="sp-cmp-total-va">{fmt(Math.round(moA_at65))}</span>
                  </div>
                </div>

                {/* If You Stay to Retirement */}
                <div className="sp-cmp-card sp-cmp-card-b">
                  <div className="sp-cmp-head sp-cmp-head-b">
                    If You Stay<br /><span style={{ fontSize: 9, opacity: 0.8 }}>YOS {safeTgt} · Age {retAge}</span>
                  </div>
                  {pensNet > 0
                    ? <>
                        <div className="sp-cmp-row"><span className="sp-cmp-rl">Pension (after taxes)</span><span className="sp-cmp-rv green">{fmt(Math.round(pensNetFed))}/mo</span></div>
                        {fedTaxMoB > 0 && <div className="sp-cmp-row"><span className="sp-cmp-rl" style={{ fontSize: 10, color: "#f87171" }}>Fed tax ({(fedTaxB.effectiveRate * 100).toFixed(1)}%)</span><span className="sp-cmp-rv red">−{fmt(Math.round(fedTaxMoB))}/mo</span></div>}
                        {isREDUX && <div className="sp-cmp-row"><span className="sp-cmp-rl" style={{ fontSize: 10, color: "#f0c14b" }}>REDUX CSB (lump sum)</span><span className="sp-cmp-rv" style={{ color: "#f0c14b" }}>+$30,000</span></div>}
                      </>
                    : <div className="sp-cmp-row"><span className="sp-cmp-rl" style={{ color: "#f87171", fontSize: 10 }}>No pension (&lt;20 yrs)</span><span className="sp-cmp-rv red">—</span></div>
                  }
                  {va > 0 && (
                    <>
                      <div className="sp-cmp-row">
                        <span className="sp-cmp-rl">VA ({vaRating}%)</span>
                        <span className="sp-cmp-rv green">{fmt(Math.round(va))}/mo</span>
                      </div>
                      <div className="sp-cmp-row">
                        <span className="sp-cmp-rl" style={{ fontSize: 10, color: "#9ca3af" }}>
                          Priority Group {getVAPriorityGroup(vaRating)}: {VA_PRIORITY_GROUPS[getVAPriorityGroup(vaRating) - 1].copay}
                        </span>
                      </div>
                    </>
                  )}
                  {/* Fix 9: TSP draw with 4% rule tooltip */}
                  <div className="sp-cmp-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="sp-cmp-rl" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        TSP draw (65+)
                        <button type="button" onClick={() => setTt4B(!tt4B)} style={{ background: "none", border: "1.5px solid #34d399", borderRadius: "50%", width: 13, height: 13, cursor: "pointer", color: "#34d399", fontSize: 8, fontWeight: 700, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>i</button>
                      </span>
                      <span className={`sp-cmp-rv ${tspDrawB > 0 ? "green" : "mut"}`}>{tspDrawB > 0 ? `${fmt(Math.round(tspDrawB))}/mo` : "—"}</span>
                    </div>
                    {tt4B && <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1.5, background: "rgba(52,211,153,0.06)", borderLeft: "2px solid #34d399", padding: "4px 6px", borderRadius: "0 3px 3px 0", marginTop: 2 }}>The 4% rule: withdraw 4% of savings annually without running out over 30 years. E.g. $400k × 4% = $16k/yr = $1,333/mo. Not a guarantee — depends on market performance. Source: Bengen (1994).</div>}
                  </div>
                  {hysaDraw > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">HYSA (65+)</span>
                      <span className="sp-cmp-rv green">{fmt(Math.round(hysaDraw))}/mo</span>
                    </div>
                  )}
                  {othDraw > 0 && (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">Other inv. (65+)</span>
                      <span className="sp-cmp-rv green">{fmt(Math.round(othDraw))}/mo</span>
                    </div>
                  )}
                  <div className="sp-cmp-row">
                    <span className="sp-cmp-rl">Civ. Salary</span>
                    <span className="sp-cmp-rv green">{fmt(Math.round(civSalB / 12))}/mo</span>
                  </div>
                  {tricarePremB > 0 ? (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl">TRICARE</span>
                      <span className="sp-cmp-rv red">−{fmt(Math.round(tricarePremB))}/mo</span>
                    </div>
                  ) : (
                    <div className="sp-cmp-row">
                      <span className="sp-cmp-rl" style={{ color: "#34d399", fontSize: 10 }}>TRICARE: $0</span>
                      <span className="sp-cmp-rv green" style={{ fontSize: 11 }}>$0/mo</span>
                    </div>
                  )}
                  {pensNetFed > 0 && (
                    <div style={{ borderTop: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)", padding: "5px 10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 11, color: "#f0c14b", fontWeight: 700 }}>Phase 1 take-home</span>
                        <span style={{ fontSize: 13, color: "#f0c14b", fontWeight: 700 }}>{fmt(Math.round(moB_pre65))}/mo</span>
                      </div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>Pension + VA − TRICARE{civSalBRaw > 0 ? " + civ. salary" : ""}</div>
                    </div>
                  )}
                  <div style={{ padding: "3px 10px 5px", borderBottom: "1px solid rgba(52,211,153,0.15)" }}>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>Phase 2 — projected at 65</div>
                    <div style={{ fontSize: 8, color: "#4b5563", marginTop: 2, lineHeight: 1.4 }}>7% growth · 4% withdrawal (Bengen 1994) · HYSA at current APY</div>
                  </div>
                  <div className="sp-cmp-row">
                    <span className="sp-cmp-rl">TSP bal @ 65</span>
                    <span className="sp-cmp-rv mut">{fmt(Math.round(tspAt65B))}</span>
                  </div>
                  <div className="sp-cmp-total">
                    <span className="sp-cmp-total-l">Phase 2 (at 65)</span>
                    <span className="sp-cmp-total-vb">{fmt(Math.round(moB_at65))}</span>
                  </div>
                </div>
              </div>

              {/* ── Scenario C: Transfer to Reserves ── */}
              <div style={{ marginTop:16, background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:12, overflow:"hidden" }}>
                <div style={{ background:"rgba(99,102,241,0.15)", padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#a5b4fc" }}>Transfer to Reserves</div>
                    <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>20 qualifying years · Pay begins at age 60</div>
                  </div>
                  <div style={{ fontSize:10, color:"#818cf8", textAlign:"right", lineHeight:1.4 }}>
                    {resEquivYrs.toFixed(1)} equiv yrs<br />{(resEquivYrs * resMultiplier * 100).toFixed(1)}% multiplier
                  </div>
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"#9ca3af" }}>Reserve Retirement Pay</span>
                    <span style={{ fontSize:15, fontWeight:700, color:"#a5b4fc", fontFamily:"IBM Plex Mono,monospace" }}>{fmt(Math.round(resNetPay))}/mo</span>
                  </div>
                  <div style={{ fontSize:10, color:"#6b7280", marginBottom:8 }}>Starts at age 60 · Based on {resPoints.toLocaleString()} total points ({resActiveYrs} active yrs + {resRemainingQual} reserve yrs min.)</div>
                  {va > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:"#9ca3af" }}>VA Disability ({vaRating}%)</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"#34d399", fontFamily:"IBM Plex Mono,monospace" }}>{fmt(Math.round(va))}/mo</span>
                    </div>
                  )}
                  {resTspDraw60 > 0.5 && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:"#9ca3af" }}>TSP Draw at 60 (4% rule)</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"#34d399", fontFamily:"IBM Plex Mono,monospace" }}>{fmt(Math.round(resTspDraw60))}/mo</span>
                    </div>
                  )}
                  <div style={{ borderTop:"1px solid rgba(99,102,241,0.2)", paddingTop:8, marginTop:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#a5b4fc" }}>Total at Age 60</span>
                      <span style={{ fontSize:16, fontWeight:700, color:"#a5b4fc", fontFamily:"IBM Plex Mono,monospace" }}>{fmt(Math.round(resTotalAt60))}/mo</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#818cf8" }}>Total at Age 65</span>
                      <span style={{ fontSize:16, fontWeight:700, color:"#818cf8", fontFamily:"IBM Plex Mono,monospace" }}>{fmt(Math.round(resTotalAt65))}/mo</span>
                    </div>
                    <div style={{ fontSize:10, color:"#6b7280", marginTop:4 }}>Includes TSP + HYSA + other investments at 65 · 4% rule</div>
                  </div>
                  <div style={{ fontSize:10, color:"#6b7280", marginTop:8, lineHeight:1.5, borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:8 }}>
                    ⚠ Reserve retirement pay starts at age 60, not at separation. No retirement income until then. Points-based estimate — consult your personnel office for an official count.
                  </div>
                </div>
              </div>

              {s.svg_civSal === 60000 && (
                <HintBox variant="gold">
                  Add an expected civilian salary to see your full income picture after leaving the military.
                </HintBox>
              )}

              {/* ── BREAK-EVEN CARD ── */}
              <div className={`sp-be ${beVariant}`}>
                {breakEvenAge ? (
                  <>
                    <div className={`sp-be-num ${beVariant}`}>{breakEvenAge}</div>
                    <div className="sp-be-lbl">{beMsg}</div>
                    {beNote && <div className={`sp-be-note ${beVariant}`}>{beNote}</div>}
                  </>
                ) : (
                  <>
                    <div className="sp-be-num red">—</div>
                    <div className="sp-be-lbl">{beMsg}</div>
                  </>
                )}
              </div>

              {/* ── PLAIN ENGLISH SUMMARY ── */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px", marginBottom: "1rem", fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
                <strong style={{ color: "#f9fafb", display: "block", marginBottom: 6 }}>Plain-English Summary</strong>
                <span style={{ color: "#d4a017" }}>If you leave at YOS {safeSep}:</span> Non-pension income starts at {fmt(Math.round(va - hiCost))}/mo (VA − health ins.). By age 65 with continued savings, projected total income is {fmt(Math.round(moA_at65))}/mo.
                <br />
                <span style={{ color: "#34d399" }}>If you stay to YOS {safeTgt}:</span> Retirement income starts at {fmt(Math.round(summaryPhase1))}/mo from pension + VA. By age 65 projected total income is {fmt(Math.round(moB_at65))}/mo.
                <br />
                {moB_at65 > moA_at65
                  ? <strong style={{ color: "#34d399" }}>Staying to retirement generates approximately {fmt(Math.round(moB_at65 - moA_at65))} more per month at age 65 — a difference of {fmt(Math.round((moB_at65 - moA_at65) * 12))} per year.</strong>
                  : <strong style={{ color: "#d4a017" }}>Leaving early and investing generates approximately {fmt(Math.round(moA_at65 - moB_at65))} more per month at age 65 — a difference of {fmt(Math.round((moA_at65 - moB_at65) * 12))} per year.</strong>
                }
              </div>

              {/* ── AREA CHART ── */}
              <div className="sp-chart-card">
                <div className="sp-chart-ttl">Cumulative Lifetime Earnings</div>
                <div className="sp-chart-legend">
                  <span style={{ color: "#d4a017" }}>— If You Leave Early (YOS {safeSep})</span>
                  <span style={{ color: "#34d399" }}>— If You Stay (YOS {safeTgt})</span>
                </div>
                <svg
                  width="100%"
                  viewBox={`0 0 ${CW} ${CH}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ display: "block", overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4a017" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#d4a017" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  {yTicks.map((v, i) => (
                    <line key={i}
                      x1={PL} y1={yS(v).toFixed(1)}
                      x2={CW - PR} y2={yS(v).toFixed(1)}
                      stroke="rgba(138,155,181,0.12)" strokeWidth="1"
                    />
                  ))}

                  {/* Y-axis labels */}
                  {yTicks.map((v, i) => (
                    <text key={i}
                      x={PL - 4} y={(yS(v) + 3).toFixed(1)}
                      textAnchor="end" fontSize="9" fill="#6b7280"
                    >{fmtM(v)}</text>
                  ))}

                  {/* X-axis age labels */}
                  {ageTks.map(a => (
                    <text key={a}
                      x={xS(a).toFixed(1)} y={CH - 8}
                      textAnchor="middle" fontSize="9" fill="#6b7280"
                    >{a}</text>
                  ))}

                  {/* Area fills */}
                  <path d={areaA} fill="url(#gradA)" />
                  <path d={areaB} fill="url(#gradB)" />

                  {/* Lines — A dashed gold, B solid green */}
                  <path d={lineA} fill="none" stroke="#d4a017" strokeWidth="1.5"
                    strokeLinejoin="round" strokeDasharray="5,3" />
                  <path d={lineB} fill="none" stroke="#34d399" strokeWidth="2"
                    strokeLinejoin="round" />

                  {/* Break-even vertical */}
                  {breakEvenAge && breakEvenAge >= currentAge && breakEvenAge <= chartEnd && (() => {
                    const bx = xS(breakEvenAge);
                    const labelRight = bx < CW * 0.7;
                    return (
                      <g>
                        <line
                          x1={bx.toFixed(1)} y1={PT}
                          x2={bx.toFixed(1)} y2={PT + iH}
                          stroke="rgba(255,255,255,0.35)" strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                        {/* Pill label */}
                        <rect
                          x={(labelRight ? bx + 4 : bx - 68).toFixed(1)}
                          y={(PT + 4).toFixed(1)}
                          width="64" height="16" rx="8"
                          fill="rgba(255,255,255,0.12)"
                        />
                        <text
                          x={(labelRight ? bx + 36 : bx - 36).toFixed(1)}
                          y={(PT + 15).toFixed(1)}
                          textAnchor="middle" fontSize="8.5" fill="#ffffff" fontWeight="600"
                        >Break-even · {breakEvenAge}</text>
                      </g>
                    );
                  })()}
                </svg>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, textAlign: "center" }}>
                  Age →
                </div>
              </div>

              {/* ── INCOME BREAKDOWN TABLE ── */}
              <SectionHeader>Income Breakdown</SectionHeader>
              <div className="ds-card" style={{ overflowX: "auto" }}>
                <table className="sp-tbl">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th style={{ color: "#f0c14b" }}>If You Leave Early</th>
                      <th style={{ color: "#34d399" }}>If You Stay</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pension</td>
                      <td className="mut">—</td>
                      <td className={pensNetFed > 0 ? "green" : ""}>{pensNetFed > 0 ? fmt(Math.round(pensNetFed)) + "/mo" : "—"}</td>
                    </tr>
                    <tr>
                      <td>TSP draw (65+)</td>
                      <td className={tspDrawA > 0 ? "gold" : ""}>{tspDrawA > 0 ? fmt(Math.round(tspDrawA)) + "/mo" : "—"}</td>
                      <td className={tspDrawB > 0 ? "green" : ""}>{tspDrawB > 0 ? fmt(Math.round(tspDrawB)) + "/mo" : "—"}</td>
                    </tr>
                    {va > 0 && (
                      <tr>
                        <td>VA ({vaRating}%)</td>
                        <td className="gold">{fmt(Math.round(va))}/mo</td>
                        <td className="green">{fmt(Math.round(va))}/mo</td>
                      </tr>
                    )}
                    {hysaDraw > 0 && (
                      <tr>
                        <td>HYSA (65+)</td>
                        <td className="gold">{fmt(Math.round(hysaDraw))}/mo</td>
                        <td className="green">{fmt(Math.round(hysaDraw))}/mo</td>
                      </tr>
                    )}
                    <tr>
                      <td>Civ. salary</td>
                      <td className="gold">{fmt(Math.round(civSalary / 12))}/mo</td>
                      <td className="green">{fmt(Math.round(civSalB / 12))}/mo</td>
                    </tr>
                    {giUseA && giMhaA > 0 && (
                      <tr>
                        <td>GI Bill ({giMonthsA} mo)*</td>
                        <td className="gold">{fmt(giMhaA)}/mo</td>
                        <td className="mut">—</td>
                      </tr>
                    )}
                    <tr>
                      <td>Health ins.</td>
                      <td className="red">−{fmt(Math.round(hiCost))}/mo</td>
                      <td className={tricarePremB > 0 ? "red" : "green"}>{tricarePremB > 0 ? `−${fmt(Math.round(tricarePremB))}/mo` : "$0 TRICARE"}</td>
                    </tr>
                    <tr className="sp-tbl-total">
                      <td>Total / mo @ 65</td>
                      <td className="gold">{fmt(Math.round(moA_at65))}</td>
                      <td className="green">{fmt(Math.round(moB_at65))}</td>
                    </tr>
                  </tbody>
                </table>
                {giUseA && giMhaA > 0 && (
                  <div style={{ fontSize: 11, color: "#6b7280", padding: "8px 10px" }}>* GI Bill {fmt(giMhaA)}/mo applies for {giMonthsA} months after separation only — not included in age-65 totals.</div>
                )}
              </div>

              {/* ── Fix 7: SHARE + PDF BUTTONS ── */}
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
              <div style={{ display: "flex", gap: 10, marginBottom: "0.5rem" }}>
                <button className="ds-share-btn" style={{ flex: 1 }} onClick={handleShare}>
                  📤 Share Infographic
                </button>
                <button className="ds-share-btn" style={{ flex: 1, background: "rgba(212,160,23,0.12)", borderColor: "rgba(212,160,23,0.3)", color: "#f0c14b" }} onClick={generatePDF}>
                  📄 Export PDF
                </button>
              </div>

              {/* ── DISCLAIMER ── */}
              <div className="sp-disclaimer">
                <strong style={{ color: "#ffffff" }}>Disclaimer:</strong> Projections use historical averages and 2026 official pay/VA data. Estimates only — not financial advice. Consult a fee-only financial advisor before making career decisions.
                <br /><br />
                <em>Assumptions: TSP at 7% w/ longevity pay steps. HYSA + other investments stop at civilian retirement age, then compound to 65. <strong>4% rule (Bengen, 1994):</strong> annual withdrawal of 4% of savings balance ÷ 12 = monthly draw. Pension: DFAS 2026 tables. High-3: 2.5% × YOS. BRS: 2.0% × YOS. VA: 2026 official rates. GI Bill MHA/stipend applies for entitlement months only.</em>
              </div>

              {/* ── DEBRIEFED PERSISTENT FOOTER ── */}
              <div style={{ textAlign:"center", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:8 }}>
                <span style={{ fontSize:12, color:"#6b7280" }}>Need a civilian resume? Try Debriefed → </span>
                <a href="https://getdebriefed.co?utm_source=milcalc&utm_medium=footer&utm_campaign=footer"
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12, color:"#d4a017", textDecoration:"none", fontWeight:600 }}
                  onClick={() => track("Debriefed Promo Clicked", { trigger: "footer" })}>
                  getdebriefed.co
                </a>
              </div>

              {/* ── FEEDBACK BUTTON ── */}
              <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 8 }}>
                <button
                  onClick={() => { setShowFeedback(true); setFbSent(false); }}
                  style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer",
                    fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", textDecoration: "underline" }}>
                  Give feedback or report an issue
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── FEEDBACK MODAL ── */}
      {showFeedback && (
        <div className="sp-modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => setShowFeedback(false)}>✕</button>
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
                    window.open(`mailto:support@getdebriefed.co?subject=${subject}&body=${body}`);
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
        <div className="sp-modal-overlay" onClick={closeShareModal}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={closeShareModal}>✕</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
              Share My Numbers
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Your Stay vs Go infographic.
            </div>
            <div style={{ marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#0f0f14", minHeight: 200 }}>
              {shareImgURL
                ? <img src={shareImgURL} alt="Stay vs Go infographic" style={{ width: "100%", display: "block" }} />
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
