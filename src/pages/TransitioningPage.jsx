import { useState, useEffect, useRef } from "react";
import NavHeader, { NAV_H } from "../components/NavHeader.jsx";
import { PUBLIC_URL, PUBLIC_DOMAIN, SUPPORT_EMAIL, PARENT_BRAND_URL, PARENT_BRAND_DOMAIN } from "../config.js";
import {
  DS_CSS, SummaryBar, SectionHeader, InfoCard, FieldRow, ToggleGroup,
  IncomeRow, TotalRow, HintBox, StepList, Stepper, DiscordLink,
} from "../components/ui.jsx";
import {
  lookupPay, calcVAComp, calcStateTax, calcFederalTax, fmt, mgibMonthly,
  vgliMonthly, getVAPriorityGroup,
  calculateRetirement, legacySepType, reservePayAge, teraReductionFactor,
  isReserveType, isMedicalType, isActiveType,
} from "../lib/calc.js";
import {
  GRADE_LABELS, GRADE_GROUPS, COL, MHA_CITIES, STATES,
  TRICARE_PLANS, GI_BILL_ONLINE_MHA, MGIB_ENROLL_OPTS, VA_PRIORITY_GROUPS,
} from "../lib/data.js";
import { jsPDF } from "jspdf";
import { track, r100 } from "../analytics.js";

// ── Dependency options — maps UI string to VA depsKey + total children ──
const DEP_OPTIONS = [
  { v: "s0",  l: "Veteran alone",       key: "s",  ch: 0 },
  { v: "sp0", l: "+Spouse",             key: "sp", ch: 0 },
  { v: "sp1", l: "+Spouse+Child",       key: "sp", ch: 1 },
  { v: "sp2", l: "+Spouse+2 Children",  key: "sp", ch: 2 },
  { v: "sp3", l: "+Spouse+3 Children",  key: "sp", ch: 3 },
  { v: "s1",  l: "Single+Child",        key: "s",  ch: 1 },
  { v: "s2",  l: "Single+2 Children",   key: "s",  ch: 2 },
  { v: "s3",  l: "Single+3 Children",   key: "s",  ch: 3 },
];

const TRICARE_PLAN_OPTS = [
  { v: "prime_a_self",   l: "Prime – Self (Grp A)",    amt: TRICARE_PLANS.prime.groupA.self },
  { v: "prime_a_fam",    l: "Prime – Family (Grp A)",  amt: TRICARE_PLANS.prime.groupA.family },
  { v: "prime_b_self",   l: "Prime – Self (Grp B)",    amt: TRICARE_PLANS.prime.groupB.self },
  { v: "prime_b_fam",    l: "Prime – Family (Grp B)",  amt: TRICARE_PLANS.prime.groupB.family },
  { v: "select_a_self",  l: "Select – Self (Grp A)",   amt: TRICARE_PLANS.select.groupA.self },
  { v: "select_a_fam",   l: "Select – Family (Grp A)", amt: TRICARE_PLANS.select.groupA.family },
  { v: "select_b_self",  l: "Select – Self (Grp B)",   amt: TRICARE_PLANS.select.groupB.self },
  { v: "select_b_fam",   l: "Select – Family (Grp B)", amt: TRICARE_PLANS.select.groupB.family },
  { v: "none",           l: "No TRICARE",               amt: 0 },
];

const LS_KEY = "tr_state_v2";

const DEFAULT_STATE = {
  name: "",
  // v1.1: retireeType (7-way) is the source of truth; sepType is the derived
  // legacy mirror (legacySepType) that the many non-pension consumers
  // (TRICARE, GI Bill, VA health, PDF, analytics) continue to read.
  retireeType: "active-regular",
  sepType: "active",
  retType: "High-3",
  yos: 20,
  grade: "E-7",
  // v1.1 retirement fields
  medDodPct: 50,
  tdrl: false,
  combatRelated: false,
  retireAge: 42,
  brsLumpSum: 0,
  reservePoints: 3600,
  currentAge: 45,
  payStartAge: 60,
  reserve20GoodYears: true,
  reserveAdDays: 0,
  reservePtGoodYears: 0,
  reservePtAdDays: 0,
  reservePtOther: 0,
  deps: "sp0",
  vaRating: 0,
  giUse: false,
  giType: "post911",
  giOnline: false,
  giCity: "",
  giEligPct: 100,
  mgibEnroll: "full",
  mgibServiceYears: "3+",
  tspType: "traditional",
  tspBalance: 0,
  tspTradBalance: 0,
  tspRothBalance: 0,
  tspContribMo: 0,
  tspGrowthRate: 7,
  hysaBalance: 0,
  hysaContribMo: 0,
  hysaApy: 4.5,
  othBalance: 0,
  othContribMo: 0,
  othGrowthRate: 7,
  sbpOn: false,
  tricarePlan: "prime_a_fam",
  lifeIns: 0,
  targetIncome: 0,
  vgliOn: false,
  vgliCoverage: 500000,
  vgliAge: 40,
  civHealthOn: false,
  civHealthAmt: 1300,
  city1: "Colorado Springs, CO",
  city2: "San Antonio, TX",
  city3: "Jacksonville, FL",
  selectedState: "Texas",
  otherMonthlyIncome: 0,
  tspYrsRemaining: 0,
};

// Pre-v1.1 saved blobs have `sepType` (active/medical/reserve/veteran) but no
// `retireeType`. Map the old coarse type to the new 7-way type so existing
// users keep their configuration, keep `sepType` synced as the derived mirror,
// and coerce REDUX off types where it's invalid. Mirrors App.jsx::migrateState.
function migrateState(saved) {
  if (!saved || typeof saved !== "object") return saved;
  const s = { ...saved };
  if (!s.retireeType) {
    const sep = s.sepType;
    const yos = s.yos || 0;
    if (sep === "active") s.retireeType = yos > 0 && yos < 20 ? "active-tera" : "active-regular";
    else if (sep === "medical") s.retireeType = "active-medical";
    else if (sep === "reserve") s.retireeType = "reserve-regular-drawing";
    else if (sep === "veteran") s.retireeType = "veteran";
    else s.retireeType = "active-regular";
  }
  // REDUX only valid for Active Regular (20-yr High-3 retirees who took CSB).
  if (s.retType === "REDUX" && s.retireeType !== "active-regular") s.retType = "High-3";
  // Keep the legacy mirror consistent with the source of truth.
  s.sepType = legacySepType(s.retireeType);
  return s;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    // Migrate the saved blob first (so the legacy-detection check sees the
    // absence of retireeType), then layer defaults under it.
    const saved = migrateState(JSON.parse(raw));
    return { ...DEFAULT_STATE, ...saved };
  } catch { return DEFAULT_STATE; }
}

const COL_CITIES = Object.keys(COL).sort();
const MHA_CITY_LIST = Object.keys(MHA_CITIES).sort();

const PAGE_CSS = `
html, body, #root {
  background: #0f0f14;
  margin: 0;
  padding: 0;
}
.tr-wrap {
  min-height: 100vh;
  background: #0f0f14;
  padding-top: calc(52px + env(safe-area-inset-top, 0px));
}
.tr-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 12px;
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}
.tr-two-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  align-items: start;
}
@media (min-width: 0px) {
  .tr-two-col { grid-template-columns: 1fr; }
}
/* COL city cards – 3 across */
.tr-col-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 1rem;
}
.tr-col-card {
  background: #17171f;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.tr-col-card-base {
  border-color: rgba(212,160,23,0.25);
}
.tr-col-card-base .tr-col-idx {
  color: #f0c14b;
}
.tr-col-sel {
  background: transparent; border: none; outline: none;
  color: #4b5563; font-size: 10px; font-weight: 600;
  width: 100%; cursor: pointer; text-align: center;
  -webkit-appearance: none; appearance: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin-bottom: 6px; line-height: 1.3;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.tr-col-sel option { background: #17171f; color: #f9fafb; }
.tr-col-idx {
  font-size: 20px; font-weight: 700; color: #f9fafb; line-height: 1;
}
.tr-col-diff {
  font-size: 11px; font-weight: 600; margin-top: 4px;
}
.tr-col-diff.base { color: #6b7280; }
.tr-col-diff.green { color: #34d399; }
.tr-col-diff.red { color: #f87171; }
/* COL picker interactivity */
.tr-col-card {
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s;
}
.tr-col-card:hover {
  border-color: rgba(212,160,23,0.45);
}
.tr-col-card:focus-within {
  border-color: rgba(212,160,23,0.45);
}
.tr-col-chevron {
  position: absolute; bottom: 8px; right: 8px;
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #4b5563;
  pointer-events: none;
}
.tr-col-city-label {
  font-size: 10px; font-weight: 600; color: #4b5563;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 6px; line-height: 1.3;
  text-align: center; width: 100%;
  max-height: 2.6em; overflow: hidden;
}
/* COL bottom-sheet / dropdown modal */
.tr-col-picker-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: flex-end; justify-content: center;
}
@media (min-width: 768px) {
  .tr-col-picker-overlay {
    align-items: center;
  }
}
.tr-col-picker-sheet {
  background: #17171f;
  border-radius: 20px 20px 0 0;
  width: 100%; max-width: 100%;
  max-height: 75vh;
  display: flex; flex-direction: column;
  border-top: 1px solid rgba(255,255,255,0.08);
}
@media (min-width: 768px) {
  .tr-col-picker-sheet {
    border-radius: 16px;
    max-width: 420px;
    max-height: 60vh;
  }
}
.tr-col-picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tr-col-picker-title {
  font-size: 15px; font-weight: 600; color: #f9fafb;
}
.tr-col-picker-close {
  background: none; border: none; color: #6b7280; font-size: 18px;
  cursor: pointer; padding: 4px; line-height: 1;
  font-family: inherit;
}
.tr-col-picker-search {
  margin: 12px 16px 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 14px;
  color: #f9fafb; font-size: 14px;
  outline: none; width: calc(100% - 32px);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-sizing: border-box;
}
.tr-col-picker-search::placeholder { color: #4b5563; }
.tr-col-picker-list {
  overflow-y: auto; flex: 1;
  padding: 4px 0 16px;
}
.tr-col-picker-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  cursor: pointer; font-size: 14px; color: #d1d5db;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.tr-col-picker-item:active { background: rgba(255,255,255,0.05); }
.tr-col-picker-item.selected {
  color: #f0c14b; font-weight: 600;
}
.tr-col-picker-checkmark {
  color: #d4a017; font-size: 16px; flex-shrink: 0;
}
/* Inline select wrapper */
.tr-sel {
  position: relative; flex: 1; min-width: 0;
}
.tr-sel select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 14px; font-weight: 500;
  width: 100%; cursor: pointer; padding-right: 18px;
  -webkit-appearance: none; appearance: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-align: right;
}
.tr-sel::after {
  content: '';
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #6b7280;
  pointer-events: none;
}
.tr-sel select option { background: #17171f; color: #f9fafb; }
/* Gap card */
.tr-gap-card {
  border-radius: 14px; padding: 20px 16px;
  text-align: center; margin-bottom: 1rem;
  border: 1px solid;
}
.tr-gap-card.green {
  background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.15);
}
.tr-gap-card.red {
  background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.15);
}
.tr-gap-num {
  font-size: 42px; font-weight: 700; line-height: 1;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.tr-gap-num.green { color: #34d399; }
.tr-gap-num.red   { color: #f87171; }
.tr-gap-lbl {
  font-size: 13px; color: #6b7280; margin-top: 6px;
}
.tr-gap-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.tr-gap-row-l { font-size: 12px; color: #6b7280; }
.tr-gap-row-r { font-size: 14px; font-weight: 600; color: #f9fafb; }
.tr-prog-bg {
  background: rgba(255,255,255,0.06); border-radius: 4px; height: 4px;
  margin-top: 10px; overflow: hidden;
}
.tr-prog-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #d4a017, #f0c14b);
  transition: width 0.3s ease;
}
/* Text input inside field rows */
.tr-txt {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 16px; font-weight: 500;
  text-align: right; width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.tr-txt::placeholder { color: #4b5563; }
.tr-num {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 16px; font-weight: 500;
  text-align: right; width: 100%; max-width: 110px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.tr-num::-webkit-inner-spin-button,
.tr-num::-webkit-outer-spin-button { -webkit-appearance: none; }
.tr-num::placeholder { color: #4b5563; }
/* 2×2 grid for separation type toggle — always 2 columns */
.tr-sep-tg > .ds-tg > div {
  display: grid !important;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
/* Engagement popup */
.tr-ep-overlay{position:fixed;inset:0;z-index:700;display:flex;align-items:center;
  justify-content:center;padding:20px;backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);background:rgba(10,14,26,.65)}
.tr-ep-modal{background:#1a2640;border:1px solid rgba(194,120,42,.35);
  border-radius:18px;width:100%;max-width:380px;padding:32px 24px 24px;
  box-shadow:0 12px 40px rgba(0,0,0,.5)}
.tr-ep-title{font-size:22px;color:#f9fafb;text-align:center;margin-bottom:20px;line-height:1.3;font-weight:700}
.tr-ep-options{display:flex;flex-direction:column;gap:10px}
.tr-ep-opt{display:flex;align-items:center;gap:14px;width:100%;padding:16px;
  border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(31,45,69,.6);
  color:#f9fafb;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;
  -webkit-tap-highlight-color:transparent;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.tr-ep-opt-ico{font-size:22px;width:32px;text-align:center;flex-shrink:0}
.tr-ep-dismiss{display:block;width:100%;margin-top:18px;padding:10px;border:none;
  background:transparent;color:#6b7280;font-size:13px;cursor:pointer;text-align:center;
  font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
/* Share modal */
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

/* ── MICRO-SURVEY ── */
@keyframes survey-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.survey-card {
  background: #17171f;
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.06);
  padding: 14px;
  margin: 14px 0 0;
  animation: survey-in 200ms ease both;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.survey-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.survey-question { color: #f9fafb; font-size: 14px; font-weight: 500; }
.survey-x {
  background: none; border: none; color: #4b5563; cursor: pointer;
  font-size: 20px; line-height: 1; padding: 0;
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; border-radius: 6px;
  transition: color 0.1s;
}
.survey-x:active { color: #9ca3af; }
.survey-btns { display: flex; gap: 8px; }
.survey-btn {
  flex: 1; min-height: 44px;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #f9fafb;
  font-size: 13px; font-weight: 500; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, transform 0.1s;
  font-family: inherit; padding: 8px 4px;
  display: flex; align-items: center; justify-content: center;
}
.survey-btn:active { transform: scale(0.96); }
.survey-btn.sel { background: rgba(212,160,23,0.12); border-color: rgba(212,160,23,0.4); color: #d4a017; }
.survey-expand { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.survey-textarea {
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.1);
  border-radius: 10px; color: #f9fafb;
  font-size: 13px; padding: 10px 12px;
  resize: none; font-family: inherit; line-height: 1.5;
  outline: none; width: 100%; box-sizing: border-box;
}
.survey-textarea::placeholder { color: #4b5563; }
.survey-textarea:focus { border-color: rgba(212,160,23,0.3); }
.survey-submit {
  background: #d4a017; border: none; border-radius: 10px;
  color: #0f0f14; font-size: 13px; font-weight: 700;
  padding: 12px; cursor: pointer; width: 100%;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s; font-family: inherit;
}
.survey-submit:active { transform: scale(0.97); }
.survey-thanks {
  color: #34d399; font-size: 15px; font-weight: 600;
  text-align: center; padding: 6px 0;
}
`;

function growBal(currentBal, monthlyContrib, years, annualRate) {
  if (years <= 0) return currentBal;
  const r = annualRate / 12;
  if (r === 0) return currentBal + monthlyContrib * years * 12;
  return currentBal * Math.pow(1 + r, years * 12)
    + monthlyContrib * (Math.pow(1 + r, years * 12) - 1) / r;
}

export default function TransitioningPage() {
  const [s, setS] = useState(loadState);
  const set = (key, val) => setS(prev => ({ ...prev, [key]: val }));
  // Setting the 7-way retiree type also re-derives the legacy sepType mirror
  // and coerces REDUX off types where it's invalid.
  const setRetireeType = v => setS(prev => ({
    ...prev,
    retireeType: v,
    sepType: legacySepType(v),
    retType: prev.retType === "REDUX" && v !== "active-regular" ? "High-3" : prev.retType,
  }));
  const [ptEstOpen, setPtEstOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');
  const [showDebriefedPromo, setShowDebriefedPromo] = useState(false);
  const [showDebriefedCard, setShowDebriefedCard] = useState(false);
  const [debriefedCardDismissed, setDebriefedCardDismissed] = useState(false);
  const debriefedCardShownRef = useRef(false);
  const DEBRIEF_SESSION_KEY = "milcalc_debriefed_shown";
  const POPUP_SESSION_KEY = "milcalc_tr_popup_shown";
  const [showPopup, setShowPopup] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [colPickerKey, setColPickerKey] = useState(null); // "city1" | "city2" | "city3" | null
  const [colSearch, setColSearch] = useState("");
  const [fbCat, setFbCat] = useState("General Feedback");
  const [fbMsg, setFbMsg] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [pdfTheme, setPdfTheme] = useState("dark");
  const [showTricareInfo, setShowTricareInfo] = useState(false);
  const [showTargetTip, setShowTargetTip] = useState(false);
  // ── Micro-survey ──────────────────────────────────────────────────────
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyChoice, setSurveyChoice] = useState(null);
  const [surveyText, setSurveyText] = useState("");
  const [surveyDone, setSurveyDone] = useState(false);
  const surveyShownRef = useRef(false);
  const popupShownRef = useRef(false);
  const popupStartTime = useRef(Date.now());
  const isPopupBlocked = () => { try { return sessionStorage.getItem(POPUP_SESSION_KEY) === "1"; } catch { return false; } };
  const triggerPopup = (trigger) => {
    if (isPopupBlocked() || popupShownRef.current || showDebriefedPromo) return;
    popupShownRef.current = true;
    try { sessionStorage.setItem(POPUP_SESSION_KEY, "1"); } catch {}
    setShowPopup(true);
    track("Engagement Popup Shown", { trigger });
  };
  const dismissPopup = () => {
    setShowPopup(false);
    track("Engagement Popup Dismissed", {});
  };
  // ── PWA install prompt removed ──
  // MilCalc is a download-only app — there is no "install as app" / Add to Home
  // Screen flow. triggerPwa() is kept as an inert no-op so the existing call
  // sites below don't need to change.
  const triggerPwa = () => {};
  // DEV: clear survey gate on every load so it's testable
  useEffect(() => {
    if (import.meta.env.DEV) sessionStorage.removeItem("milcalc_survey_shown");
  }, []);
  // ── Rating prompt ──
  const RATING_LS_KEY = "milcalc_rating_last_shown";
  const RETURNING_LS_KEY = "milcalc_returning_user";
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const ratingShownRef = useRef(false);
  const calcCountRef = useRef(0);
  const isRatingBlocked = () => {
    try {
      // Never first session
      if (!localStorage.getItem(RETURNING_LS_KEY)) return true;
      // Once per week
      const last = Number(localStorage.getItem(RATING_LS_KEY) || 0);
      if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return true;
    } catch {}
    return false;
  };
  const triggerRatingPrompt = () => {
    if (ratingShownRef.current || showDebriefedPromo || showPopup) return;
    if (isRatingBlocked()) return;
    if (calcCountRef.current < 3) return;
    if (Date.now() - popupStartTime.current < 5 * 60 * 1000) return;
    ratingShownRef.current = true;
    try { localStorage.setItem(RATING_LS_KEY, String(Date.now())); } catch {}
    setShowRatingPrompt(true);
    track("Rating Prompt Shown", {});
  };
  const dismissRatingPrompt = (action) => { setShowRatingPrompt(false); track("Rating Prompt Dismissed", { action }); };
  // Mark returning user at end of first session, check on mount
  useEffect(() => {
    try { localStorage.setItem(RETURNING_LS_KEY, "1"); } catch {}
    // Check 5+ min timer for rating (poll every 60s after 5 min)
    const timer = setTimeout(() => {
      const poll = setInterval(() => triggerRatingPrompt(), 60000);
      return () => clearInterval(poll);
    }, 300000); // 5 minutes
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [shareImgURL, setShareImgURL] = useState(null);
  const shareBlobRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  // ── Export via bottom tab bar ──────────────────────────────────────────
  useEffect(() => {
    const handler = () => generatePDF();
    window.addEventListener("milcalc:export", handler);
    return () => window.removeEventListener("milcalc:export", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculations ──────────────────────────────────────────────────────
  const depInfo = DEP_OPTIONS.find(d => d.v === s.deps) || DEP_OPTIONS[0];
  const h3 = lookupPay(s.grade, s.yos) || 0;
  const stateInfo = STATES[s.selectedState] || { ok: true };
  const currentAge = s.vgliAge || 40;
  const filingStatus = (s.deps || "").startsWith("sp") ? "mfj" : "single";
  const vaComp = s.vaRating > 0 ? calcVAComp(s.vaRating, depInfo.key, depInfo.ch) : 0;
  // ── v1.1 retirement engine ─ single source of truth for pension, CRDP/CRSC
  // offset, BRS lump sum, and reserve retired-pay timing. vaMonthly is passed
  // pre-computed so the engine stays free of dependent lookups.
  const ret = calculateRetirement({ ...s, high3: h3, vaMonthly: vaComp });
  const grossPension = ret.grossPension;
  // taxablePension = retired pay actually received after VA waiver/CRSC offset
  // (CRDP/none leave it equal to gross). crscMo is the tax-free CRSC restoration.
  const taxablePension = ret.taxablePensionMonthly;
  const crscMo = ret.crscAmount;
  const stateTaxMo = taxablePension > 0 ? calcStateTax(taxablePension * 12, stateInfo, currentAge) / 12 : 0;
  const netPension = taxablePension - stateTaxMo + crscMo;
  // Points estimator + reserve pay-age math (for the conditional UI fields).
  const ptEstimate = Math.round((s.reservePtGoodYears || 0) * 63 + (s.reservePtAdDays || 0) + (s.reservePtOther || 0));
  const payAgeCalc = reservePayAge(s.reserveAdDays);
  const isMGIB = s.giType === "ch30" || s.giType === "ch1606";
  const giBase = s.giOnline ? GI_BILL_ONLINE_MHA : (MHA_CITIES[s.giCity] || 0);
  const giMhaMo = s.giUse
    ? (isMGIB
        ? Math.round(mgibMonthly(s.giType, s.mgibEnroll || "full", s.mgibServiceYears || "3+"))
        : Math.round(giBase * (s.giEligPct / 100)))
    : 0;
  const giLabel = isMGIB ? (s.giType === "ch30" ? "MGIB-AD (Ch. 30)" : "MGIB-SR (Ch. 1606)") : "GI Bill MHA";
  const giTaxNote = isMGIB ? "taxable" : "tax-free";
  const tspType = s.tspType || "traditional";
  const otherMonthlyIncome = s.otherMonthlyIncome || 0;
  // TSP & Savings projections (auto-calculated using 4% rule at 65)
  const yearsTo65 = Math.max(0, 65 - currentAge);
  // Two-phase TSP: contributions while on active duty, then balance grows only after retirement.
  // User specifies years of service remaining; default 0 (retiring now).
  const yearsToRetirement = Math.max(0, Number(s.tspYrsRemaining) || 0);
  const yearsRetTo65 = Math.max(0, yearsTo65 - yearsToRetirement);
  const tspRate = (s.tspGrowthRate || 7) / 100;
  // For split mode: use separate balances; contributions go to both proportionally
  const isSplit = tspType === "split";
  const tradBal = isSplit ? (s.tspTradBalance || 0) : (s.tspBalance || 0);
  const rothBal = isSplit ? (s.tspRothBalance || 0) : 0;
  const totalSplitBal = tradBal + rothBal;
  const tradContribFrac = totalSplitBal > 0 ? tradBal / totalSplitBal : 1;
  const tradContrib = isSplit ? (s.tspContribMo || 0) * tradContribFrac : (s.tspContribMo || 0);
  const rothContrib = isSplit ? (s.tspContribMo || 0) * (1 - tradContribFrac) : 0;
  const tspAtRetirement = growBal(tradBal, tradContrib, yearsToRetirement, tspRate);
  const tspRothAtRetirement = growBal(rothBal, rothContrib, yearsToRetirement, tspRate);
  const tspTradAt65 = growBal(tspAtRetirement, 0, yearsRetTo65, tspRate);
  const tspRothAt65 = growBal(tspRothAtRetirement, 0, yearsRetTo65, tspRate);
  const tspAt65 = tspTradAt65 + tspRothAt65;
  const tspTradDraw = tspTradAt65 * 0.04 / 12;
  const tspRothDraw = tspRothAt65 * 0.04 / 12;
  const tspMonthlyDraw = tspTradDraw + tspRothDraw;
  const hysaAt65 = growBal(s.hysaBalance || 0, s.hysaContribMo || 0, yearsTo65, (s.hysaApy || 4.5) / 100);
  const hysaMonthlyDraw = hysaAt65 * 0.04 / 12;
  const othAt65 = growBal(s.othBalance || 0, s.othContribMo || 0, yearsTo65, (s.othGrowthRate || 7) / 100);
  const othMonthlyDraw = othAt65 * 0.04 / 12;
  const totalSavingsDraw = tspMonthlyDraw + hysaMonthlyDraw + othMonthlyDraw;
  // Federal tax: only Traditional TSP draws are taxable
  const tspTaxable = tspType === "roth" ? 0 : tspTradDraw;
  const mgibTaxableAnnual = isMGIB ? giMhaMo * 12 : 0;
  const federalTaxableAnnual = (taxablePension * 12) + mgibTaxableAnnual + (tspTaxable * 12);
  const fedTax = calcFederalTax(federalTaxableAnnual, filingStatus, currentAge >= 65, false);
  const fedTaxMo = fedTax.monthlyTax;
  const totalIncome = netPension + vaComp + giMhaMo + tspMonthlyDraw + hysaMonthlyDraw + othMonthlyDraw + otherMonthlyIncome;
  const sbpAmt = s.sbpOn && grossPension > 0 ? Math.round(grossPension * 0.065) : 0;
  const tricarePlanInfo = TRICARE_PLAN_OPTS.find(p => p.v === s.tricarePlan) || TRICARE_PLAN_OPTS[0];
  const tricarePremium = tricarePlanInfo.amt;
  const civHealthAmt = s.civHealthOn ? (s.civHealthAmt || 0) : 0;
  const vgliPremium = s.vgliOn ? Math.round(vgliMonthly(s.vgliCoverage || 500000, s.vgliAge || 40)) : (s.lifeIns || 0);
  const totalDeductions = sbpAmt + tricarePremium + vgliPremium + civHealthAmt;
  const takeHome = totalIncome - totalDeductions - fedTaxMo;
  // Phase 1: income available immediately at retirement (no investment draws)
  const phase1TakeHome = takeHome - tspMonthlyDraw - hysaMonthlyDraw - othMonthlyDraw;
  // Phase 2: full picture at 65 (= existing takeHome)
  const phase2TakeHome = takeHome;
  // Target income: user-set value, or default to current active duty base pay (h3)
  const targetIncome = s.targetIncome > 0 ? s.targetIncome : h3;
  const incomeGap = targetIncome > 0 ? targetIncome - phase1TakeHome : 0;
  const isFullyCovered = phase1TakeHome >= targetIncome || (targetIncome === 0 && phase1TakeHome >= 0);
  const coverage = targetIncome > 0 ? Math.min(100, Math.round((phase1TakeHome / targetIncome) * 100)) : 100;
  const pensionPct = ret.multiplierPct;

  const chips = [
    netPension > 0 && { label: "Pension", value: fmt(netPension) },
    vaComp > 0       && { label: "VA",      value: fmt(vaComp) },
    giMhaMo > 0      && { label: isMGIB ? "MGIB" : "GI Bill", value: fmt(giMhaMo) },
    s.targetIncome <= 0
      ? { label: "Phase 1", value: fmt(phase1TakeHome),          color: "#d4a017" }
      : isFullyCovered
        ? { label: "Surplus", value: `+${fmt(Math.abs(incomeGap))}`, color: "#4ade80" }
        : { label: "Gap",     value: `−${fmt(incomeGap)}`,          color: "#f87171" },
  ].filter(Boolean);

  // ── Analytics ─────────────────────────────────────────────────────────
  const prevPension = useRef(null);
  useEffect(() => {
    if (grossPension > 0 && grossPension !== prevPension.current) {
      prevPension.current = grossPension;
      calcCountRef.current += 1;
      track("Pension Calculated", {
        years_of_service: s.yos,
        retirement_type: s.sepType === "veteran" ? "none" : s.retType,
        monthly_amount: r100(grossPension),
      });
    }
  }, [grossPension, s.yos, s.retType, s.sepType]);

  const prevVA = useRef(null);
  useEffect(() => {
    if (s.vaRating > 0 && s.vaRating !== prevVA.current) {
      prevVA.current = s.vaRating;
      track("VA Rating Selected", {
        rating: s.vaRating,
        dependency_status: s.deps,
        children: depInfo.ch,
        monthly_amount: r100(vaComp),
      });
    }
  }, [s.vaRating, s.deps, vaComp]);

  const prevGap = useRef(null);
  useEffect(() => {
    const k = takeHome + "|" + totalIncome;
    if (totalIncome > 0 && k !== prevGap.current) {
      prevGap.current = k;
      track("Income Gap Calculated", {
        target_income: r100(totalDeductions),
        total_benefits: r100(totalIncome),
        gap_amount: r100(Math.abs(takeHome)),
        salary_needed: r100(isFullyCovered ? 0 : Math.abs(takeHome) * 12),
      });
    }
  }, [takeHome, totalIncome, totalDeductions, isFullyCovered]);

  const prevCOL = useRef(null);
  useEffect(() => {
    const k = s.city1 + "|" + s.city2 + "|" + s.city3;
    if (k !== prevCOL.current) {
      prevCOL.current = k;
      const fi = COL[s.city1] || 100;
      const ti = COL[s.city2] || 100;
      track("COL City Compared", { city_from: s.city1, city_to: s.city2, index_difference: ti - fi });
    }
  }, [s.city1, s.city2, s.city3]);

  // ── Engagement popup: 3-min timer + income gap calculated ─────────────
  useEffect(() => {
    if (isPopupBlocked() || popupShownRef.current) return;
    if (grossPension <= 0) return; // only after income gap calculated
    const elapsed = Date.now() - popupStartTime.current;
    const delay = Math.max(0, 180000 - elapsed); // 3 minutes
    const timer = setTimeout(() => triggerPopup("income_gap_3min"), delay);
    return () => clearTimeout(timer);
  }, [grossPension]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Micro-survey trigger ───────────────────────────────────────────────
  useEffect(() => {
    if (!phase1TakeHome) return;
    if (surveyShownRef.current) return;
    try { if (sessionStorage.getItem("milcalc_survey_shown")) return; } catch {}
    // If debriefed card hasn't been shown yet this session, delay extra 5s to avoid stacking
    let delay = 1000;
    try { if (!sessionStorage.getItem(DEBRIEF_SESSION_KEY)) delay += 5000; } catch {}
    const t = setTimeout(() => {
      try { if (sessionStorage.getItem("milcalc_survey_shown")) return; } catch {}
      surveyShownRef.current = true;
      setShowSurvey(true);
    }, delay);
    return () => clearTimeout(t);
  }, [phase1TakeHome]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inline Debriefed card trigger ──────────────────────────────────────
  useEffect(() => {
    if (!phase1TakeHome) return;
    if (debriefedCardShownRef.current) return;
    try { if (sessionStorage.getItem(DEBRIEF_SESSION_KEY)) return; } catch {}
    debriefedCardShownRef.current = true;
    const trigger = isFullyCovered ? "gap_surplus" : "gap_shortfall";
    try { sessionStorage.setItem(DEBRIEF_SESSION_KEY, "true"); } catch {}
    track("Debriefed Promo Shown", { trigger });
    setShowDebriefedCard(true);
  }, [phase1TakeHome]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── COL comparison helper ─────────────────────────────────────────────
  function colInfo(cityKey, isBase) {
    const idx = COL[cityKey] || 100;
    const baseIdx = COL[s.city1] || 100;
    const diff = Math.round(((idx - baseIdx) / baseIdx) * 100);
    const cls = isBase ? "base" : diff > 0 ? "red" : diff < 0 ? "green" : "base";
    const lbl = isBase ? "Base city" : diff > 0 ? `+${diff}% more` : diff < 0 ? `${diff}% less` : "Same cost";
    return { idx, cls, lbl };
  }

  // ── Canvas infographic ────────────────────────────────────────────────
  // ── Micro-survey handlers ──────────────────────────────────────────────
  function dismissSurvey() {
    try { sessionStorage.setItem("milcalc_survey_shown", "1"); } catch {}
    setShowSurvey(false);
  }
  function handleSurveyChoice(choice) {
    try { navigator.vibrate(10); } catch {}
    setSurveyChoice(choice);
    if (choice === "yes") {
      setSurveyDone(true);
      try { sessionStorage.setItem("milcalc_survey_shown", "1"); } catch {}
      setTimeout(() => setShowSurvey(false), 2000);
    }
  }
  function handleSurveySubmit() {
    track("Feedback Submitted", {
      text: surveyText,
      source: "micro_survey",
      trigger: "income_gap",
      path: "transitioning",
      timestamp: new Date().toISOString(),
    });
    setSurveyDone(true);
    try { sessionStorage.setItem("milcalc_survey_shown", "1"); } catch {}
    setTimeout(() => setShowSurvey(false), 2000);
  }

  function buildCanvas() {
    const C = { bg: "#0f0f14", card: "#17171f", gold: "#d4a017", goldL: "#f0c14b", mut: "#6b7280", lt: "#9ca3af", wh: "#f9fafb", gn: "#34d399", rd: "#f87171" };
    const W = 420, PAD = 24, CELL_H = 72, CELL_GAP = 16, RR = 8;
    const fmt2 = v => "$" + Math.round(v).toLocaleString() + "/mo";
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); };

    const incomeData = [
      netPension > 0.5 ? ["Pension", netPension]          : null,
      vaComp       > 0.5 ? ["VA Disability", vaComp]     : null,
      giMhaMo      > 0.5 ? ["GI Bill MHA", giMhaMo]      : null,
      tspMonthlyDraw  > 0.5 ? ["TSP Draw",  tspMonthlyDraw]  : null,
      hysaMonthlyDraw > 0.5 ? ["HYSA Draw", hysaMonthlyDraw] : null,
      otherMonthlyIncome > 0.5 ? ["Other Income", otherMonthlyIncome] : null,
    ].filter(Boolean);
    const deductData = [
      sbpAmt > 0.5           ? ["SBP Premium", sbpAmt]          : null,
      tricarePremium > 0.5   ? ["TRICARE", tricarePremium]       : null,
      vgliPremium    > 0.5   ? ["Life Ins / VGLI", vgliPremium] : null,
      civHealthAmt > 0.5     ? ["Civilian Health", civHealthAmt] : null,
    ].filter(Boolean);

    const hasDeduct = deductData.length > 0;
    const hasTspPhases = yearsToRetirement > 0 && tspAtRetirement > 100 && (s.tspContribMo || 0) > 0;
    const gridRows = Math.max(1, Math.ceil(incomeData.length / 2));
    const gridH = gridRows * (CELL_H + CELL_GAP) - CELL_GAP;
    let totalH = PAD + 48 + 16 + gridH + 24 + 60;
    if (hasTspPhases) totalH += 38;
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
    ctx.textAlign = "right"; ctx.fillText("My Transition Plan", W - PAD, y + 15);
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

    // TSP phase info strip (only when user has years remaining + contributions)
    if (hasTspPhases) {
      ctx.fillStyle = C.mut; ctx.font = "500 11px -apple-system,system-ui";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("TSP AT SEPARATION: $" + Math.round(tspAtRetirement).toLocaleString(), PAD, y);
      const sepW = ctx.measureText("TSP AT SEPARATION: $" + Math.round(tspAtRetirement).toLocaleString()).width;
      ctx.fillStyle = C.lt;
      ctx.fillText("   ·   TSP AT 65: $" + Math.round(tspAt65).toLocaleString(), PAD + sepW, y);
      y += 38;
    }

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
    alert('share tapped');
    let msg = '';
    msg += `navigator.share: ${!!navigator.share}\n`;
    msg += `blob: ${!!shareBlobRef.current}\n`;
    msg += `blob size: ${shareBlobRef.current?.size ?? 'none'}\n`;
    const shareText = isFullyCovered
      ? `My military retirement covers ${coverage}% of my target income — I calculated it free at ${PUBLIC_DOMAIN}`
      : `Planning my military transition — my retirement covers ${coverage}% of my target. Calculate yours free at ${PUBLIC_DOMAIN}`;
    msg += `shareText: ${shareText?.slice(0, 50)}\n`;
    msg += `standalone: ${window.navigator.standalone}\n`;
    msg += `userAgent: ${navigator.userAgent.slice(0, 80)}\n`;
    setDebugMsg(msg);

    setShowShareModal(true);
    track("Share Modal Opened", {});
    track("Share Link Generated", { slug: "direct", medium: "share" });
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
    const file = new File([shareBlobRef.current], "milcalc-transition-plan.png", { type: "image/png" });
    const shareText = isFullyCovered
      ? `My military retirement covers ${coverage}% of my target income — I calculated it free at ${PUBLIC_DOMAIN}`
      : `Planning my military transition — my retirement covers ${coverage}% of my target. Calculate yours free at ${PUBLIC_DOMAIN}`;
    const shareData = { title: "My Transition Plan — MilCalc", text: shareText, url: PUBLIC_URL };
    const doDownload = () => {
      const url = URL.createObjectURL(shareBlobRef.current);
      const a = document.createElement("a"); a.href = url; a.download = "milcalc-transition-plan.png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      track("Infographic Shared", { method: "download" });
    };
    // Try file share first
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareData.title, text: shareData.text });
        track("Infographic Shared", { method: "native" });
        calcCountRef.current += 1; setTimeout(() => triggerPwa(), 1500); return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    // URL share fallback
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        track("Infographic Shared", { method: "native_url" });
        calcCountRef.current += 1; setTimeout(() => triggerPwa(), 1500); return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    // Download fallback
    doDownload();
    calcCountRef.current += 1;
    setTimeout(() => triggerPwa(), 1500);
  };

  // ── PDF export ────────────────────────────────────────────────────────
  function generatePDF() {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const PW = 612, PH = 792, M = 57;
      let y = M;
      const isLight = pdfTheme === "light";

      // Theme-aware palette — identical to ServingPage
      const ink     = isLight ? [10, 22, 40]    : [203, 213, 225];
      const mut     = isLight ? [55, 65, 81]    : [107, 127, 163];
      const gold    = isLight ? [180, 83, 9]    : [212, 160, 23];
      const goldHdr =                             [228, 169, 74];  // always bright gold on dark header
      const rd      = isLight ? [185, 28, 28]   : [248, 113, 113];
      const gn      = isLight ? [20, 120, 75]   : [52, 211, 153];
      const cardBg  = isLight ? [241, 245, 249] : [17, 24, 39];
      const cardBg2 = isLight ? [220, 232, 244] : [30, 41, 59];
      const divider = isLight ? [203, 213, 225] : [30, 41, 59];
      const hdrSub  = isLight ? [200, 215, 235] : mut;
      const disc = "These are estimates only. Actual amounts may vary. Not financial advice. Tax estimates use 2026 standard deduction and marginal rates. Actual tax liability depends on total household income. Consult a tax professional.";

      // Helpers — structurally identical to ServingPage
      const drawPageBg = () => {
        const bg = isLight ? [255, 255, 255] : [10, 14, 26];
        doc.setFillColor(...bg); doc.rect(0, 0, PW, PH, "F");
      };
      const hdrBar = () => {
        drawPageBg();
        doc.setFillColor(228, 169, 74); doc.rect(0, 0, PW, 3, "F");  // gold accent
        doc.setFillColor(17, 24, 39);   doc.rect(0, 3, PW, 69, "F"); // dark navy header always
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...goldHdr); doc.text("MilCalc", M, 44);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...hdrSub);
        doc.text((s.name||"").trim() ? `Transition Plan for ${(s.name||"").trim()} · ${PUBLIC_DOMAIN}` : `Transition Plan · ${PUBLIC_DOMAIN}`, M, 60);
        doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), PW - M, 60, { align: "right" });
        y = 98;
      };
      const section = (title) => {
        if (y > 700) { doc.addPage(); hdrBar(); }
        y += 14;
        doc.setFillColor(...cardBg); doc.rect(M - 8, y - 4, PW - M * 2 + 16, 28, "F");
        doc.setFillColor(...gold);   doc.rect(M - 8, y - 4, 3, 28, "F"); // gold left accent
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.setTextColor(...(isLight ? ink : mut));
        doc.text(title.toUpperCase(), M + 4, y + 14); y += 34;
      };
      const row = (label, value, color = ink) => {
        if (y > 720) { doc.addPage(); hdrBar(); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...mut); doc.text(label, M, y);
        doc.setFont("helvetica", "bold"); doc.setTextColor(...color); doc.text(value, PW - M, y, { align: "right" });
        doc.setDrawColor(...divider); doc.line(M, y + 5, PW - M, y + 5); y += 24;
      };
      const nl = (h = 14) => { y += h; };

      // ── PAGE 1: Profile + Phase 1 Income + Income Gap ───────────────────
      hdrBar();

      section("PROFILE");
      row("Pay Grade", s.grade);
      row("Years of Service", `${s.yos} YOS`);
      row("Retirement System", s.retType);
      row("Separation Type", s.sepType.charAt(0).toUpperCase() + s.sepType.slice(1));
      if (s.selectedState) row("Home State", s.selectedState);
      nl(12);

      section("PHASE 1 — RETIREMENT INCOME (AVAILABLE AT SEPARATION)");
      if (grossPension > 0) row("Military Pension (gross)", fmt(grossPension) + "/mo", gold);
      if (vaComp > 0) row(`VA Disability (${s.vaRating}%) — tax-free`, fmt(vaComp) + "/mo", gold);
      if (giMhaMo > 0) row(isMGIB ? `${giLabel} (gross — taxable)` : `${giLabel} (tax-free)`, fmt(giMhaMo) + "/mo", gold);
      if (otherMonthlyIncome > 0) row("Other Monthly Income", fmt(otherMonthlyIncome) + "/mo", gold);
      nl(12);

      section("MONTHLY DEDUCTIONS");
      if (sbpAmt > 0) row("SBP Premium", "-" + fmt(sbpAmt) + "/mo", rd);
      if (tricarePremium > 0) row("TRICARE Premium", "-" + fmt(tricarePremium) + "/mo", rd);
      if (vgliPremium > 0) row(s.vgliOn ? "VGLI Premium" : "Life Insurance", "-" + fmt(vgliPremium) + "/mo", rd);
      if (civHealthAmt > 0) row("Civilian Health Insurance", "-" + fmt(civHealthAmt) + "/mo", rd);
      if (fedTaxMo > 0) row(`Federal Income Tax (est. ${(fedTax.effectiveRate * 100).toFixed(1)}% eff.)`, "-" + fmt(fedTaxMo) + "/mo", rd);
      if (stateTaxMo > 0) row(`State Income Tax (${s.selectedState})`, "-" + fmt(Math.round(stateTaxMo)) + "/mo", rd);
      nl(6);

      // Phase 1 take-home prominent box
      doc.setFillColor(...(isLight ? [226, 232, 240] : [30, 41, 59])); doc.rect(M - 8, y - 2, PW - M * 2 + 16, 38, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text("Monthly Take-Home at Retirement (Phase 1)", M + 4, y + 22);
      doc.setFontSize(18); doc.setTextColor(...(phase1TakeHome >= 0 ? gold : rd));
      doc.text((phase1TakeHome >= 0 ? "+" : "-") + fmt(Math.abs(phase1TakeHome)) + "/mo", PW - M, y + 22, { align: "right" });
      y += 46; nl(12);

      section("INCOME GAP");
      row("Target Monthly Income", fmt(targetIncome) + (s.targetIncome === 0 ? " (current base pay)" : "") + "/mo");
      row("Phase 1 Take-Home", (phase1TakeHome >= 0 ? "+" : "-") + fmt(Math.abs(phase1TakeHome)) + "/mo", phase1TakeHome >= 0 ? gn : rd);
      if (isFullyCovered) {
        row("Monthly Surplus", "+" + fmt(Math.abs(incomeGap)) + "/mo", gn);
      } else {
        row("Monthly Shortfall", "-" + fmt(Math.abs(incomeGap)) + "/mo", rd);
      }
      row("Phase 1 Coverage", coverage + "% of target", coverage >= 100 ? gn : coverage >= 80 ? gold : rd);
      nl(6);
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...mut);
      doc.text("Gap calculated on retirement income only — investment draws at age 65 are not included.", M, y); y += 16;
      nl(8);

      // ── COST OF LIVING COMPARISON ──────────────────────────────────────
      const colCities = [
        { key: s.city1, isBase: true },
        { key: s.city2, isBase: false },
        { key: s.city3, isBase: false },
      ];
      const baseColIdx = COL[s.city1] || 100;
      section("COST OF LIVING COMPARISON");
      row("Base City", `${s.city1} (Index: ${baseColIdx})`);
      for (const { key, isBase } of colCities) {
        if (isBase) continue;
        const idx = COL[key] || 100;
        const diffPct = Math.round(((idx - baseColIdx) / baseColIdx) * 100);
        const cheaper = diffPct < 0;
        const sign = cheaper ? "" : "+";
        const savingsLabel = cheaper ? "saves" : "costs";
        const monthlyDiff = phase1TakeHome > 0
          ? Math.abs(Math.round(phase1TakeHome * (Math.abs(diffPct) / 100)))
          : 0;
        row(`${key} (Index: ${idx})`, `${sign}${diffPct}% ${cheaper ? "cheaper" : "more expensive"} · ${savingsLabel} ~${fmt(monthlyDiff)}/mo`, cheaper ? gn : rd);
      }
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...mut);
      doc.text("Cost of living index based on MIT Living Wage data. Lower index = lower cost of living.", M, y); y += 16;
      nl(8);

      // ── Phase 2 — Projected at Age 65 (flows after COL, new page only if needed) ──
      if (tspMonthlyDraw > 0 || hysaMonthlyDraw > 0 || othMonthlyDraw > 0) {
        // Only break to a new page if there isn't enough room for the banner + at least one section
        if (y > 620) { doc.addPage(); hdrBar(); } else { nl(20); }

        // Phase 2 banner — styled to match the Phase 1 header on page 1
        doc.setFillColor(...(isLight ? [17, 80, 150] : [17, 50, 100]));
        doc.rect(M - 8, y - 4, PW - M * 2 + 16, 46, "F");
        doc.setFillColor(...gn); doc.rect(M - 8, y - 4, 4, 46, "F"); // green left accent
        doc.setFont("helvetica", "bold"); doc.setFontSize(15);
        doc.setTextColor(...(isLight ? [255, 255, 255] : [74, 222, 128]));
        doc.text("PHASE 2 \u2014 PROJECTED AT AGE 65", M + 6, y + 14);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.setTextColor(...(isLight ? [200, 220, 255] : [107, 163, 200]));
        const p2subtitle = "The following are long-term projections based on investment growth. These funds are not available at retirement \u2014 they supplement your income starting at age 65.";
        const p2subLines = doc.splitTextToSize(p2subtitle, PW - M * 2 - 16);
        doc.text(p2subLines, M + 6, y + 30);
        y += 50; // advance past the banner so section() doesn't overlap it
        section("PROJECTED ACCOUNT BALANCES AT AGE 65");
        if (tspMonthlyDraw > 0) {
          if (isSplit) {
            if (tspTradAt65 > 0) { row("TSP Traditional Balance at 65", fmt(Math.round(tspTradAt65))); row("TSP Traditional Draw (4% rule) — taxable", fmt(Math.round(tspTradDraw)) + "/mo", gn); }
            if (tspRothAt65 > 0) { row("TSP Roth Balance at 65", fmt(Math.round(tspRothAt65))); row("TSP Roth Draw (4% rule) — tax-free", fmt(Math.round(tspRothDraw)) + "/mo", gn); }
          } else {
            if ((s.tspContribMo||0) > 0 && yearsToRetirement > 0) row("TSP at Separation (Phase 1 — after contributions)", fmt(Math.round(tspAtRetirement)));
            row("TSP at Age 65 (Phase 2 — growth only)", fmt(Math.round(tspAt65)));
            row(`TSP Monthly Draw (4% rule) — ${tspType === "roth" ? "tax-free" : "taxable"}`, fmt(Math.round(tspMonthlyDraw)) + "/mo", gn);
          }
        }
        if (hysaMonthlyDraw > 0) {
          row("HYSA Balance at 65", fmt(Math.round(hysaAt65)));
          row("HYSA Monthly Draw (4% rule)", fmt(Math.round(hysaMonthlyDraw)) + "/mo", gn);
        }
        if (othMonthlyDraw > 0) {
          row("Other Investments Balance at 65", fmt(Math.round(othAt65)));
          row("Other Investments Monthly Draw (4% rule)", fmt(Math.round(othMonthlyDraw)) + "/mo", gn);
        }
        row("Total Monthly Investment Draws at 65", fmt(Math.round(tspMonthlyDraw + hysaMonthlyDraw + othMonthlyDraw)) + "/mo", gn);
        nl(12);

        section("FULL INCOME AT AGE 65");
        row("Phase 1 Take-Home (carried from page 1)", fmt(phase1TakeHome) + "/mo", gold);
        if (tspMonthlyDraw > 0 && isSplit) {
          if (tspTradDraw > 0) row("+ TSP Traditional Draw at 65 (taxable)", fmt(Math.round(tspTradDraw)) + "/mo", gn);
          if (tspRothDraw > 0) row("+ TSP Roth Draw at 65 (tax-free)", fmt(Math.round(tspRothDraw)) + "/mo", gn);
        } else if (tspMonthlyDraw > 0) row(`+ TSP Draw at 65 (${tspType === "roth" ? "tax-free" : "taxable"})`, fmt(Math.round(tspMonthlyDraw)) + "/mo", gn);
        if (hysaMonthlyDraw > 0) row("+ HYSA Draw at 65", fmt(Math.round(hysaMonthlyDraw)) + "/mo", gn);
        if (othMonthlyDraw > 0) row("+ Other Investments Draw at 65", fmt(Math.round(othMonthlyDraw)) + "/mo", gn);
        nl(6);
        doc.setFillColor(...(isLight ? [226, 232, 240] : [30, 41, 59])); doc.rect(M - 8, y - 2, PW - M * 2 + 16, 38, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text("Total Monthly Income at Age 65", M + 4, y + 22);
        doc.setFontSize(18); doc.setTextColor(...gn);
        doc.text(fmt(Math.round(phase2TakeHome)) + "/mo", PW - M, y + 22, { align: "right" });
        y += 46; nl(16);

        section("ASSUMPTIONS");
        row("TSP Growth Rate", `${s.tspGrowthRate || 7}% annually (blended C/S/I funds historical avg.)`);
        row("HYSA APY", `${s.hysaApy || 4.5}% (fluctuates with Federal Reserve rate)`);
        row("Other Investments", "7% annually (S&P 500 historical avg. after inflation)");
        row("Withdrawal Rate", "4% annually (Bengen 1994, Trinity Study)");
        nl(6);
        doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...mut);
        doc.text("These are projections based on historical averages and are not guaranteed.", M, y); y += 14;
      }
      nl(4);

      // Debriefed promo box on last page above disclaimer
      if (y + 60 > 740) { doc.addPage(); hdrBar(); }
      nl(8);
      doc.setDrawColor(212, 160, 23); doc.setLineWidth(1);
      doc.rect(M - 6, y - 4, PW - M * 2 + 12, 46, "S");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...gold);
      doc.text("Planning your transition?", M, y + 10);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...mut);
      doc.text("Translate your military experience into a civilian resume at", M, y + 24);
      doc.setTextColor(...gold);
      doc.text(PARENT_BRAND_DOMAIN, M, y + 36);
      y += 54;

      // Footer on all pages — identical to ServingPage
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mut);
        doc.text(disc, M, 762, { maxWidth: PW - M * 2, lineHeightFactor: 1.6 });
      }

      doc.save("milcalc-transition-plan.pdf");
      calcCountRef.current += 1;
      // Post-export Debriefed promo — 2s delay, once per session
      try {
        if (!sessionStorage.getItem(DEBRIEF_SESSION_KEY)) {
          setTimeout(() => {
            sessionStorage.setItem(DEBRIEF_SESSION_KEY, "1");
            setShowDebriefedPromo(true);
            track("Debriefed Promo Shown", { trigger: "post_export" });
          }, 2000);
        } else {
          // Debriefed already shown — try PWA as lowest priority
          setTimeout(() => triggerPwa(), 2000);
        }
      } catch {}
      track("PDF Exported", {
        sections_included: ["Profile", "Income", "Deductions", "Take-Home"],
        section_count: 4,
        retirement_type: s.sepType === "medical" ? "Medical" : s.sepType === "reserve" ? "Reserve" : "Active",
        has_va: s.vaRating > 0,
        has_sbp: s.sbpOn,
        has_tricare: s.tricarePlan !== "none",
        state: s.selectedState,
        yos: s.yos || 0,
        pay_grade: s.grade,
        has_bah: false,
        has_preretirement_comp: false,
      });
    } catch (err) {
      console.error("PDF export error:", err);
    }
  }

  return (
    <>
      <style>{DS_CSS + PAGE_CSS}</style>
      <NavHeader />

      <div className="tr-wrap">
        <div className="tr-content">

          <SummaryBar
            label="Retirement income (Phase 1)"
            amount={fmt(phase1TakeHome)}
            subtitle={`${s.retType} · ${s.yos} YOS${grossPension > 0 ? ` · ${pensionPct.toFixed(0)}% of High-3` : " · No pension"}`}
            at65={phase2TakeHome !== phase1TakeHome ? fmt(Math.round(phase2TakeHome)) : undefined}
            chips={chips}
          />

          {/* ── MY INFO ── */}
          <SectionHeader>My Info</SectionHeader>
          <InfoCard>
            <FieldRow label="Name (optional)">
              <input
                className="tr-txt"
                type="text"
                placeholder="Your name"
                value={s.name}
                onChange={e => set("name", e.target.value)}
              />
            </FieldRow>
            {/* ── RETIREE TYPE (v1.1 7-way selector) ── */}
            <div className="ds-tg ds-tg-with-label">
              <span className="ds-field-label">Retiree Type</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                {[
                  { grp: "Active Duty", opts: [
                    { v: "active-regular", l: "Active Regular (20+ yrs)", d: "Standard 20-year active retirement" },
                    { v: "active-tera",    l: "Active TERA (under 20 yrs)", d: "Voluntary early retirement, 15–19 yrs" },
                    { v: "active-medical", l: "Active Medical (Ch. 61)", d: "Disability retirement" },
                  ]},
                  { grp: "Reserve / Guard", opts: [
                    { v: "reserve-regular-drawing", l: "Reserve — Drawing Pension", d: "At retired-pay age, pension flowing" },
                    { v: "reserve-regular-waiting", l: "Reserve — Awaiting Pay Age", d: "Retired, pension begins later" },
                    { v: "reserve-medical",         l: "Reserve Medical (Ch. 61)", d: "Reserve disability retirement" },
                  ]},
                  { grp: "No Pension", opts: [
                    { v: "veteran", l: "Veteran (Separated)", d: "No military pension" },
                  ]},
                ].map(group => (
                  <div key={group.grp}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#4b5563", margin: "0 0 6px" }}>{group.grp}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {group.opts.map(o => (
                        <button
                          key={o.v}
                          type="button"
                          className={`ds-tb${s.retireeType === o.v ? " active" : ""}`}
                          onClick={() => setRetireeType(o.v)}
                          style={{ width: "100%", flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "10px 12px", gap: 1, whiteSpace: "normal", minHeight: 0 }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{o.l}</span>
                          <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>{o.d}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {s.retireeType === "veteran" && (
              <HintBox variant="gold">No DoD retirement pay. Veterans who separated before qualifying for retirement receive no pension — but VA disability compensation, GI Bill, and VA Healthcare all still apply.</HintBox>
            )}

            {isMedicalType(s.retireeType) && (
              <HintBox>
                <strong>Chapter 61 Medical Retirement.</strong> Multiplier = higher of your DoD disability rating or the {s.retType === "BRS" ? "2.0" : "2.5"}%/yr length-of-service figure{isReserveType(s.retireeType) ? " (points ÷ 360)" : ""}, capped at {s.retType === "BRS" ? "60" : "75"}% of High-36.
              </HintBox>
            )}

            {s.retireeType !== "veteran" && (
              <ToggleGroup
                label="Retirement System"
                value={s.retType}
                onChange={v => set("retType", v)}
                options={s.retireeType === "active-regular" ? ["High-3", "BRS", "REDUX"] : ["High-3", "BRS"]}
              />
            )}

            {s.retireeType !== "veteran" && s.retType === "BRS" && (
              <HintBox><strong>BRS:</strong> 2.0%/yr multiplier plus TSP matching up to 5% of basic pay. Applies to those who opted in or entered service after Jan 1, 2018.</HintBox>
            )}

            {isMedicalType(s.retireeType) && (
              <FieldRow label="DoD Disability Rating">
                <div className="tr-sel">
                  <select value={s.medDodPct} onChange={e => set("medDodPct", Number(e.target.value))}>
                    {[30,40,50,60,70,80,90,100].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </FieldRow>
            )}

            {s.retireeType === "active-tera" && (
              <HintBox>
                Standard TERA (Title 10 §1293/1305) early retirement: 15–19 years.{s.yos > 0 && s.yos < 20 && <> Reduction factor ×{teraReductionFactor(s.yos).toFixed(3)} ({Math.round((1 - teraReductionFactor(s.yos)) * 100)}% reduction for retiring {(20 - s.yos).toFixed(1)} yrs early).</>}
              </HintBox>
            )}

            {isReserveType(s.retireeType) && (
              <>
                <FieldRow label="Total Retirement Points">
                  <Stepper value={s.reservePoints} onChange={v => set("reservePoints", Math.round(v))} min={0} max={14400} step={50} />
                </FieldRow>
                <div style={{ padding: "0 14px 12px" }}>
                  <button
                    type="button"
                    onClick={() => setPtEstOpen(o => !o)}
                    style={{ background: "none", border: "none", color: "#d4a017", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "2px 0", fontFamily: "inherit" }}
                  >
                    {ptEstOpen ? "▾" : "▸"} Don't know your exact points?
                  </button>
                  {ptEstOpen && (
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "4px 0", marginTop: 6 }}>
                      <FieldRow label="Good years served">
                        <Stepper value={s.reservePtGoodYears} onChange={v => set("reservePtGoodYears", Math.round(v))} min={0} max={40} />
                      </FieldRow>
                      <FieldRow label="Active-duty days">
                        <Stepper value={s.reservePtAdDays} onChange={v => set("reservePtAdDays", Math.round(v))} min={0} max={8000} step={10} />
                      </FieldRow>
                      <FieldRow label="Other point sources">
                        <Stepper value={s.reservePtOther} onChange={v => set("reservePtOther", Math.round(v))} min={0} max={5000} step={10} />
                      </FieldRow>
                      <HintBox>
                        Estimated total: <strong>{ptEstimate.toLocaleString()} pts</strong> (good years × 63 + AD days + other). Enter exact points from MyPay for accuracy.
                        <button
                          type="button"
                          onClick={() => set("reservePoints", ptEstimate)}
                          style={{ display: "block", marginTop: 8, background: "#d4a017", color: "#0f0f14", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                        >Use this estimate</button>
                      </HintBox>
                    </div>
                  )}
                </div>
                {s.reservePoints > 0 && h3 > 0 && (
                  <HintBox><strong>Equivalent YOS:</strong> {(s.reservePoints / 360).toFixed(1)} years · <strong>{s.retireeType === "reserve-regular-waiting" ? "Projected pension" : "Pension"}:</strong> {fmt(ret.projectedGross)}/mo</HintBox>
                )}
              </>
            )}

            {s.retireeType === "reserve-regular-waiting" && (
              <>
                <FieldRow label="Current Age">
                  <Stepper value={s.currentAge} onChange={v => set("currentAge", Math.round(v))} min={35} max={80} />
                </FieldRow>
                <FieldRow label="Qualifying Active-Duty Days">
                  <Stepper
                    value={s.reserveAdDays}
                    onChange={v => { const d = Math.max(0, Math.round(v)); set("reserveAdDays", d); set("payStartAge", reservePayAge(d).age); }}
                    min={0} max={5000} step={30}
                  />
                </FieldRow>
                <HintBox>
                  {s.reserveAdDays > 0
                    ? <><strong>Pay-age reduction:</strong> {s.reserveAdDays.toLocaleString()} days ÷ 90 = {payAgeCalc.periods} period{payAgeCalc.periods === 1 ? "" : "s"} × 3 mo = {payAgeCalc.months} mo. <strong>Retired pay age = {payAgeCalc.age}</strong> (floor 50).</>
                    : <>Retired pay age: <strong>60</strong>. Ready Reserve members may reduce age 60 by 3 months per 90 qualifying active-duty days (after 28 Jan 2008).</>}
                </HintBox>
                <HintBox variant="gold">Pension = $0 now; begins at age {payAgeCalc.age}. VA disability flows immediately.</HintBox>
              </>
            )}

            {s.retireeType === "reserve-medical" && (
              <ToggleGroup
                label="20+ qualifying years of reserve service? (CRDP eligibility)"
                value={s.reserve20GoodYears ? "y" : "n"}
                onChange={v => set("reserve20GoodYears", v === "y")}
                options={[{ v: "n", l: "No" }, { v: "y", l: "Yes" }]}
              />
            )}

            {s.retireeType !== "veteran" && (
              <ToggleGroup
                label="Disabilities are combat-related (CRSC eligible)"
                value={s.combatRelated ? "y" : "n"}
                onChange={v => set("combatRelated", v === "y")}
                options={[{ v: "n", l: "No" }, { v: "y", l: "Yes" }]}
              />
            )}

            {s.retType === "BRS" && (isActiveType(s.retireeType) || s.retireeType === "reserve-regular-drawing") && (
              <>
                <FieldRow label="Retirement Age (at separation)">
                  <Stepper value={s.retireAge} onChange={v => set("retireAge", Math.round(v))} min={37} max={66} />
                </FieldRow>
                <ToggleGroup
                  label="BRS Lump Sum Election"
                  value={String(s.brsLumpSum)}
                  onChange={v => set("brsLumpSum", Number(v))}
                  options={[{ v: "0", l: "None" }, { v: "0.25", l: "25%" }, { v: "0.5", l: "50%" }]}
                />
                {ret.lumpSum && (
                  <HintBox><strong>Lump sum cash:</strong> {fmt(ret.lumpSum.cash)} · <strong>Reduced /mo until 67:</strong> {fmt(ret.lumpSum.reducedMonthly)} · <strong>Full after 67:</strong> {fmt(ret.lumpSum.fullMonthly)}</HintBox>
                )}
              </>
            )}
            <FieldRow label="Years of Service">
              <Stepper value={s.yos} onChange={v => set("yos", v)} min={0} max={40} />
            </FieldRow>
            <FieldRow label="Pay Grade">
              <div className="tr-sel">
                <select value={s.grade} onChange={e => set("grade", e.target.value)}>
                  {GRADE_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.grades.map(gr => (
                        <option key={gr} value={gr}>{GRADE_LABELS[gr]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </FieldRow>
            <FieldRow label="Dependents">
              <div className="tr-sel">
                <select value={s.deps} onChange={e => { set("deps", e.target.value); track("Additional Children Updated", { deps: e.target.value }); }}>
                  {DEP_OPTIONS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
              </div>
            </FieldRow>
            <FieldRow label="State of Residence">
              <div className="tr-sel">
                <select value={s.selectedState} onChange={e => { set("selectedState", e.target.value); track("State Selected", { state: e.target.value }); }}>
                  {Object.keys(STATES).sort().map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </FieldRow>
          </InfoCard>
          {/* ── INCOME SOURCES ── */}
          <SectionHeader>Income Sources</SectionHeader>
          <InfoCard>
            {s.sepType !== "veteran" && (
              <IncomeRow
                label="Military Pension"
                sub={grossPension > 0
                  ? stateTaxMo > 0
                    ? `${s.retType} · ${pensionPct.toFixed(0)}% of High-3 · Gross ${fmt(grossPension)} · ${stateInfo.rate}% state tax`
                    : `${s.retType} · ${pensionPct.toFixed(0)}% of High-3 (${s.grade} at ${s.yos} YOS) · ${s.selectedState}: tax-exempt`
                  : ret.isWaiting
                    ? "Not yet flowing — begins at retired pay age"
                    : "Below minimum YOS for pension"}
                value={fmt(netPension)}
                color={netPension > 0 ? "gold" : "muted"}
              />
            )}
            {ret.isWaiting && (
              <HintBox variant="gold"><strong>Pension begins at age {ret.payStartAge}.</strong> Projected gross: {fmt(ret.projectedGross)}/mo. VA disability flows immediately.</HintBox>
            )}
            {grossPension > 0 && s.vaRating > 0 && ret.offsetType !== "none" && (
              <HintBox variant={ret.offsetType === "waiver" ? "red" : "green"}>
                {ret.offsetType === "crdp" && <><strong>CRDP:</strong> Concurrent Retirement & Disability Pay — full pension AND full VA compensation, no offset.</>}
                {ret.offsetType === "crsc" && <><strong>CRSC:</strong> Combat-Related Special Compensation of {fmt(crscMo)}/mo (tax-free) restores the VA-waived pension.</>}
                {ret.offsetType === "waiver" && <><strong>VA Waiver:</strong> Pension offset dollar-for-dollar by {fmt(vaComp)}/mo of VA comp. {s.vaRating < 50 ? "CRDP requires a 50%+ VA rating." : "If your disabilities are combat-related, you may qualify for CRSC instead."}</>}
              </HintBox>
            )}
            {ret.lumpSum && (
              <HintBox><strong>BRS Lump Sum ({Math.round(ret.lumpSum.electedPct * 100)}%):</strong> {fmt(ret.lumpSum.cash)} cash at retirement, reduced to {fmt(ret.lumpSum.reducedMonthly)}/mo until age 67, then {fmt(ret.lumpSum.fullMonthly)}/mo.</HintBox>
            )}
            <FieldRow label="VA Disability Rating">
              <div className="tr-sel">
                <select value={s.vaRating} onChange={e => set("vaRating", Number(e.target.value))}>
                  <option value={0}>No rating</option>
                  {[10,20,30,40,50,60,70,80,90,100].map(r => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
            </FieldRow>
            {s.vaRating > 0 && (
              <>
                <IncomeRow
                  label="VA Disability Compensation"
                  sub={`${s.vaRating}% · ${depInfo.l}`}
                  value={fmt(vaComp)}
                  color="gold"
                />
                <HintBox>
                  <strong>VA Priority Group {getVAPriorityGroup(s.vaRating)}</strong>: {VA_PRIORITY_GROUPS[getVAPriorityGroup(s.vaRating) - 1].who}. Copays: {VA_PRIORITY_GROUPS[getVAPriorityGroup(s.vaRating) - 1].copay}.
                </HintBox>
              </>
            )}
            <FieldRow label="GI Bill / Education">
              <div className="tr-sel">
                <select
                  value={s.giUse ? "yes" : "no"}
                  onChange={e => set("giUse", e.target.value === "yes")}
                >
                  <option value="no">Not using</option>
                  <option value="yes">Using GI Bill</option>
                </select>
              </div>
            </FieldRow>
            {s.giUse && (
              <>
                <FieldRow label="GI Bill type">
                  <div className="tr-sel">
                    <select value={s.giType || "post911"} onChange={e => set("giType", e.target.value)}>
                      <option value="post911">Post-9/11 (Ch. 33)</option>
                      <option value="ch30">MGIB Active Duty (Ch. 30)</option>
                      <option value="ch1606">MGIB Selected Reserve (Ch. 1606)</option>
                    </select>
                  </div>
                </FieldRow>
                {!isMGIB && (
                  <>
                    <FieldRow label="School location">
                      <div className="tr-sel">
                        <select
                          value={s.giOnline ? "__online__" : s.giCity}
                          onChange={e => {
                            if (e.target.value === "__online__") { set("giOnline", true); }
                            else { set("giOnline", false); set("giCity", e.target.value); }
                          }}
                        >
                          <option value="__online__">{"Online Only ($" + GI_BILL_ONLINE_MHA + "/mo)"}</option>
                          {MHA_CITY_LIST.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </FieldRow>
                    <FieldRow label="Eligibility tier">
                      <div className="tr-sel">
                        <select value={s.giEligPct} onChange={e => set("giEligPct", Number(e.target.value))}>
                          {[100,90,80,70,60,50,40].map(p => (
                            <option key={p} value={p}>{p}%</option>
                          ))}
                        </select>
                      </div>
                    </FieldRow>
                  </>
                )}
                {isMGIB && (
                  <>
                    <FieldRow label="Enrollment status">
                      <div className="tr-sel">
                        <select value={s.mgibEnroll || "full"} onChange={e => set("mgibEnroll", e.target.value)}>
                          {MGIB_ENROLL_OPTS.map(o => (
                            <option key={o.v} value={o.v}>{o.l}</option>
                          ))}
                        </select>
                      </div>
                    </FieldRow>
                    {s.giType === "ch30" && (
                      <FieldRow label="Active duty service">
                        <div className="tr-sel">
                          <select value={s.mgibServiceYears || "3+"} onChange={e => set("mgibServiceYears", e.target.value)}>
                            <option value="3+">3+ years</option>
                            <option value="2-3">2–3 years</option>
                          </select>
                        </div>
                      </FieldRow>
                    )}
                  </>
                )}
                {giMhaMo > 0 && (
                  <IncomeRow
                    label={giLabel}
                    sub={isMGIB
                      ? `${giTaxNote} · ${MGIB_ENROLL_OPTS.find(o => o.v === (s.mgibEnroll || "full"))?.l || "Full-Time"}`
                      : (s.giOnline ? `Online rate · ${s.giEligPct}% eligibility` : (s.giCity || "Select a school city"))}
                    value={fmt(giMhaMo)}
                    color="gold"
                  />
                )}
                {isMGIB && (
                  <HintBox>MGIB pays directly to you and is taxable income — unlike Post-9/11 which pays tuition to the school and provides a tax-free housing allowance.</HintBox>
                )}
                {!isMGIB && !s.giOnline && !s.giCity && (
                  <HintBox>Select a school city above to see your monthly housing allowance.</HintBox>
                )}
              </>
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
              {(s.tspType||"traditional") === "split" ? (
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
              ) : null}
            </div>
            <FieldRow label="Other monthly income">
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                <input className="tr-num" type="number" min={0} placeholder="0"
                  value={s.otherMonthlyIncome || ""}
                  onChange={e => set("otherMonthlyIncome", Number(e.target.value) || 0)}
                  onFocus={e => e.target.select()} />
                <span style={{ fontSize:12, color:"#6b7280" }}>/mo</span>
              </div>
            </FieldRow>
            {otherMonthlyIncome > 0 && (
              <IncomeRow label="Other Income" sub="Additional monthly income" value={fmt(otherMonthlyIncome)} color="gold" />
            )}
          </InfoCard>

          {/* ── TSP & SAVINGS ── */}
          <SectionHeader>TSP &amp; Savings</SectionHeader>
          <InfoCard title="Savings Projections">
            {/* TSP */}
            <div style={{ fontWeight:600, fontSize:13, color:"#9ca3af", marginBottom:8 }}>
              Thrift Savings Plan (TSP)
            </div>
            {(s.tspType||"traditional") !== "split" && (
              <div className="ds-income-row">
                <div><div className="ds-income-lbl">Current Balance</div></div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                  <input className="ret2-num" type="number" min={0} placeholder="0"
                    value={s.tspBalance||""} onChange={e=>set("tspBalance",Number(e.target.value)||0)}
                    onFocus={e=>e.target.select()} />
                </div>
              </div>
            )}
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Monthly Contribution (while serving)</div>
                <div className="ds-income-lbl-sub">Contributions during remaining active duty service · 2026 limit $24,500/yr</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="number" min={0} placeholder="0"
                  value={s.tspContribMo||""} onChange={e=>set("tspContribMo",Number(e.target.value)||0)}
                  onFocus={e=>e.target.select()} />
                <span style={{fontSize:12,color:"#6b7280"}}>/mo</span>
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Growth Rate %</div>
                <div className="ds-income-lbl-sub">C Fund ~10% historical · blended 7–8% · conservative: 7%</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="number" min={0} max={15} step={0.1} placeholder="7"
                  value={s.tspGrowthRate||""} onChange={e=>set("tspGrowthRate",Number(e.target.value)||7)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Years of service remaining before retirement</div>
                <div className="ds-income-lbl-sub">Enter 0 if retiring now or within the next few months</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="text" inputMode="numeric" placeholder="0"
                  value={s.tspYrsRemaining > 0 ? s.tspYrsRemaining : ""}
                  onChange={e => set("tspYrsRemaining", Number(e.target.value) || 0)}
                  onFocus={e => e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>yrs</span>
              </div>
            </div>
            {(Number(s.tspYrsRemaining) || 0) > 30 && (
              <div style={{fontSize:11,color:"#f0c14b",padding:"4px 0 2px",lineHeight:1.4}}>
                ⚠ Over 30 years remaining — double-check this value.
              </div>
            )}
            {tspAtRetirement > 100 && yearsToRetirement > 0 && (s.tspContribMo||0) > 0 && !isSplit && (
              <IncomeRow label="TSP at Separation"
                sub={`after ${yearsToRetirement} yr${yearsToRetirement !== 1 ? "s" : ""} of contributions · phase 1`}
                value={fmt(Math.round(tspAtRetirement))}
                color="green" />
            )}
            {tspAt65 > 100 && !isSplit && (
              <IncomeRow label={`TSP at Age 65 (${fmt(Math.round(tspAt65))})`}
                sub={`4% rule · ${tspType === "roth" ? "tax-free" : "taxable"}${yearsToRetirement > 0 && (s.tspContribMo||0) > 0 ? " · growth only after separation" : ""}`}
                value={`${fmt(Math.round(tspMonthlyDraw))}/mo`}
                color="green" />
            )}
            {tspAt65 > 100 && isSplit && (
              <>
                {tspTradAt65 > 100 && <IncomeRow label={`TSP Traditional at 65 (${fmt(Math.round(tspTradAt65))})`} sub="4% rule · taxable" value={`${fmt(Math.round(tspTradDraw))}/mo`} color="green" />}
                {tspRothAt65 > 100 && <IncomeRow label={`TSP Roth at 65 (${fmt(Math.round(tspRothAt65))})`} sub="4% rule · tax-free" value={`${fmt(Math.round(tspRothDraw))}/mo`} color="green" />}
              </>
            )}
            <div style={{fontSize:11,color:"#9ca3af",padding:"4px 0 8px",lineHeight:1.4}}>
              Phase 1: contributions compound until separation. Phase 2: balance grows only from separation to age 65 — no further contributions assumed.
            </div>

            {/* HYSA */}
            <div style={{ fontWeight:600, fontSize:13, color:"#9ca3af", margin:"12px 0 8px" }}>
              High-Yield Savings (HYSA)
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Current Balance</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="number" min={0} placeholder="0"
                  value={s.hysaBalance||""} onChange={e=>set("hysaBalance",Number(e.target.value)||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Monthly Contribution</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="number" min={0} placeholder="0"
                  value={s.hysaContribMo||""} onChange={e=>set("hysaContribMo",Number(e.target.value)||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">APY %</div>
                <div className="ds-income-lbl-sub">Current HYSA rates 4–5% APY · fluctuates with Fed rate</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="number" min={0} max={10} step={0.1} placeholder="4.5"
                  value={s.hysaApy||""} onChange={e=>set("hysaApy",Number(e.target.value)||4.5)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            {hysaAt65 > 100 && (
              <IncomeRow label={`HYSA at 65 (${fmt(Math.round(hysaAt65))})`}
                sub="Monthly draw at 65 (4% rule)"
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
                <input className="ret2-num" type="number" min={0} placeholder="0"
                  value={s.othBalance||""} onChange={e=>set("othBalance",Number(e.target.value)||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div><div className="ds-income-lbl">Monthly Contribution</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:14,color:"#6b7280"}}>$</span>
                <input className="ret2-num" type="number" min={0} placeholder="0"
                  value={s.othContribMo||""} onChange={e=>set("othContribMo",Number(e.target.value)||0)}
                  onFocus={e=>e.target.select()} />
              </div>
            </div>
            <div className="ds-income-row">
              <div>
                <div className="ds-income-lbl">Growth Rate %</div>
                <div className="ds-income-lbl-sub">S&amp;P 500 historical avg ~10% · conservative: 7%</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input className="ret2-num" type="number" min={0} max={15} step={0.1} placeholder="7"
                  value={s.othGrowthRate||""} onChange={e=>set("othGrowthRate",Number(e.target.value)||7)}
                  onFocus={e=>e.target.select()} style={{width:56}} />
                <span style={{fontSize:13,color:"#6b7280"}}>%</span>
              </div>
            </div>
            {othAt65 > 100 && (
              <IncomeRow label={`Investments at 65 (${fmt(Math.round(othAt65))})`}
                sub="Monthly draw at 65 (4% rule)"
                value={`${fmt(Math.round(othMonthlyDraw))}/mo`}
                color="green" />
            )}

            {totalSavingsDraw > 0 && (
              <TotalRow label="Total savings draw at 65" value={`${fmt(Math.round(totalSavingsDraw))}/mo`} />
            )}
          </InfoCard>

          {/* ── DEDUCTIONS ── */}
          <SectionHeader>Deductions</SectionHeader>
          <InfoCard>
            {grossPension > 0 && (
              <>
                <ToggleGroup
                  label="SBP (Survivor Benefit)"
                  options={[{ v: "off", l: "Not enrolled" }, { v: "on", l: "Enrolled (6.5%)" }]}
                  value={s.sbpOn ? "on" : "off"}
                  onChange={v => {
                    const on = v === "on";
                    set("sbpOn", on);
                    if (on) track("SBP Calculated", {
                      elected: true,
                      monthly_premium: r100(grossPension * 0.065),
                      survivor_annuity: r100(grossPension * 0.55),
                    });
                  }}
                />
                {s.sbpOn && (
                  <IncomeRow
                    label="SBP Premium"
                    sub="6.5% of gross pension · pre-tax deduction"
                    value={`−${fmt(sbpAmt)}`}
                    color="red"
                  />
                )}
              </>
            )}
            <div className="ds-field-row">
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="ds-field-label">TRICARE Plan</span>
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
              <div className="ds-field-value">
                <div className="tr-sel">
                  <select value={s.tricarePlan} onChange={e => {
                    const v = e.target.value;
                    set("tricarePlan", v);
                    const planInfo = TRICARE_PLAN_OPTS.find(p => p.v === v) || TRICARE_PLAN_OPTS[0];
                    const famSize = v.includes("fam") ? "family" : "self";
                    track("TRICARE Plan Selected", {
                      plan: v,
                      coverage_type: famSize,
                      monthly_cost: r100(planInfo.amt),
                    });
                  }}>
                    {TRICARE_PLAN_OPTS.map(p => (
                      <option key={p.v} value={p.v}>
                        {p.l}{p.amt > 0 ? " — " + fmt(p.amt) : " — Free"}
                      </option>
                    ))}
                  </select>
                </div>
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
                sub={tricarePlanInfo.l}
                value={`−${fmt(tricarePremium)}`}
                color="red"
              />
            )}
            <FieldRow label="Life Insurance / VGLI">
              <div className="tr-sel">
                <select value={s.vgliOn ? "vgli" : "manual"} onChange={e => set("vgliOn", e.target.value === "vgli")}>
                  <option value="manual">Manual / Other</option>
                  <option value="vgli">Use VGLI Calculator</option>
                </select>
              </div>
            </FieldRow>
            {s.vgliOn ? (
              <>
                <FieldRow label="Your Age">
                  <div className="tr-sel">
                    <select value={s.vgliAge || 40} onChange={e => set("vgliAge", Number(e.target.value))}>
                      {[...Array(51)].map((_, i) => i + 25).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </FieldRow>
                <FieldRow label="VGLI Coverage">
                  <div className="tr-sel">
                    <select value={s.vgliCoverage || 500000} onChange={e => set("vgliCoverage", Number(e.target.value))}>
                      {[50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000].map(v => (
                        <option key={v} value={v}>${(v / 1000).toFixed(0)}K</option>
                      ))}
                    </select>
                  </div>
                </FieldRow>
                <IncomeRow
                  label="VGLI Premium"
                  sub={`Age ${s.vgliAge || 40} · $${((s.vgliCoverage || 500000) / 1000).toFixed(0)}K coverage`}
                  value={`−${fmt(vgliPremium)}`}
                  color="red"
                />
              </>
            ) : (
              <FieldRow label="Life Insurance (manual)">
                <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                  <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                  <input
                    className="tr-num"
                    type="number" min={0} placeholder="0"
                    value={s.lifeIns || ""}
                    onChange={e => set("lifeIns", Number(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                  />
                  <span style={{ fontSize:12, color:"#6b7280" }}>/mo</span>
                </div>
              </FieldRow>
            )}
            <FieldRow label="Civilian Health Insurance">
              <div className="tr-sel" style={{ maxWidth: 150 }}>
                <select
                  value={s.civHealthOn ? (s.civHealthAmt >= 1000 ? "family" : "single") : "none"}
                  onChange={e => {
                    if (e.target.value === "none") { set("civHealthOn", false); }
                    else if (e.target.value === "single") { set("civHealthOn", true); set("civHealthAmt", 450); }
                    else { set("civHealthOn", true); set("civHealthAmt", 1300); }
                  }}
                >
                  <option value="none">Not needed</option>
                  <option value="single">Single (~$450)</option>
                  <option value="family">Family (~$1,300)</option>
                </select>
              </div>
            </FieldRow>
            {s.civHealthOn && (
              <IncomeRow
                label="Civilian Health Insurance"
                sub="Adjust if your employer subsidizes"
                value={`−${fmt(civHealthAmt)}`}
                color="red"
              />
            )}
            {stateTaxMo > 0 && (
              <IncomeRow
                label="State Income Tax (est.)"
                sub={`${stateInfo.rate}% rate · ${s.selectedState}`}
                value={`−${fmt(Math.round(stateTaxMo))}`}
                color="red"
              />
            )}
            {fedTaxMo > 0 && (
              <IncomeRow
                label="Federal Income Tax (est.)"
                sub={`${(fedTax.effectiveRate * 100).toFixed(1)}% effective rate · ${filingStatus === "mfj" ? "MFJ" : "Single"}`}
                value={`−${fmt(fedTaxMo)}`}
                color="red"
              />
            )}
            <TotalRow label="Monthly Take-Home at Retirement (Phase 1)" value={fmt(phase1TakeHome)} />

            {/* ── Phase 2: At Age 65 ── */}
            {(tspMonthlyDraw > 0 || hysaMonthlyDraw > 0 || othMonthlyDraw > 0) && (
              <>
                <div style={{ padding:"12px 16px 4px", borderTop:"2px solid rgba(212,160,23,0.3)", background:"rgba(255,255,255,0.015)", marginTop:4 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"#d4a017", marginBottom:3 }}>
                    Phase 2 — Projected at Age 65
                  </div>
                  <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.5 }}>
                    Not available at retirement — assumes continued investment growth starting at age 65.
                  </div>
                </div>
                {tspMonthlyDraw > 0 && isSplit ? (
                  <>
                    {tspTradDraw > 0.5 && <IncomeRow label="TSP Traditional Draw" sub={`4% rule · at 65 (${fmt(Math.round(tspTradAt65))} bal) · taxable`} value={`+${fmt(Math.round(tspTradDraw))}`} color="green" />}
                    {tspRothDraw > 0.5 && <IncomeRow label="TSP Roth Draw" sub={`4% rule · at 65 (${fmt(Math.round(tspRothAt65))} bal) · tax-free`} value={`+${fmt(Math.round(tspRothDraw))}`} color="green" />}
                  </>
                ) : tspMonthlyDraw > 0 && (
                  <IncomeRow label="TSP Monthly Draw" sub={`4% rule · at 65 (${fmt(Math.round(tspAt65))} bal) · ${tspType === "roth" ? "tax-free" : "taxable"}`} value={`+${fmt(Math.round(tspMonthlyDraw))}`} color="green" />
                )}
                {hysaMonthlyDraw > 0 && (
                  <IncomeRow label="HYSA Monthly Draw" sub={`4% rule · at 65 (${fmt(Math.round(hysaAt65))} bal)`} value={`+${fmt(Math.round(hysaMonthlyDraw))}`} color="green" />
                )}
                {othMonthlyDraw > 0 && (
                  <IncomeRow label="Investments Monthly Draw" sub={`4% rule · at 65 (${fmt(Math.round(othAt65))} bal)`} value={`+${fmt(Math.round(othMonthlyDraw))}`} color="green" />
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"rgba(52,211,153,0.06)", borderTop:"1px solid rgba(52,211,153,0.15)" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#34d399" }}>Total Monthly Income at Age 65</span>
                  <span style={{ fontSize:20, fontWeight:700, color:"#34d399", letterSpacing:"-0.5px" }}>{fmt(Math.round(phase2TakeHome))}/mo</span>
                </div>
              </>
            )}
          </InfoCard>

          {/* ── INCOME GAP ── */}
          <SectionHeader>Income Gap</SectionHeader>
          <InfoCard>
            <div className="ds-field-row">
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="ds-field-label">Target monthly income</span>
                <button
                  type="button"
                  onClick={() => setShowTargetTip(v => !v)}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: showTargetTip ? "rgba(212,160,23,0.2)" : "rgba(212,160,23,0.08)",
                    border: "1px solid rgba(212,160,23,0.35)",
                    color: "#d4a017", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, lineHeight: 1, padding: 0, fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  aria-label="Target income info"
                >ⓘ</button>
              </div>
              <div className="ds-field-value">
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                <span style={{ fontSize:14, color:"#6b7280" }}>$</span>
                <input
                  className="tr-num"
                  type="number" min={0} placeholder={fmt(h3).replace("$","").replace(",","")}
                  value={s.targetIncome || ""}
                  onChange={e => {
                    const v = Number(e.target.value) || 0;
                    set("targetIncome", v);
                    track("Income Gap Calculated", {
                      target_income: v || h3,
                      total_benefits: Math.round(totalIncome),
                      gap_amount: Math.abs(v > 0 ? v - takeHome : h3 - takeHome),
                      salary_needed: Math.round(Math.max(0, v > 0 ? v - takeHome : h3 - takeHome) * 12),
                    });
                  }}
                  onFocus={e => e.target.select()}
                />
                <span style={{ fontSize:12, color:"#6b7280" }}>/mo</span>
              </div>
              </div>
            </div>
            {showTargetTip && (
              <div style={{ padding: "12px 16px", background: "rgba(212,160,23,0.05)", borderBottom: "1px solid rgba(212,160,23,0.12)", fontSize: 13, lineHeight: 1.6, color: "#d1d5db", marginBottom: 4 }}>
                This is your lifestyle target — what you need per month to maintain your standard of living in retirement. The income gap shows how much your military benefits cover vs how much you need from a civilian job or other sources.
              </div>
            )}
            <div style={{ fontSize: 11, color: "#6b7280", padding: "4px 0 8px" }}>
              Leave blank to use current base pay ({fmt(h3)}/mo) as target.
            </div>
          </InfoCard>
          <div className={`tr-gap-card ${isFullyCovered ? "green" : "red"}`}>
            <div className={`tr-gap-num ${isFullyCovered ? "green" : "red"}`}>
              {isFullyCovered ? `+${fmt(Math.abs(incomeGap))}` : `−${fmt(incomeGap)}`}
            </div>
            <div className="tr-gap-lbl">
              {isFullyCovered
                ? "Monthly surplus vs target income"
                : "Monthly shortfall — consider closing with civilian income or investments"}
            </div>
            {!isFullyCovered && (
              <>
                <div className="tr-gap-row">
                  <span className="tr-gap-row-l">Phase 1 covers</span>
                  <span className="tr-gap-row-r">{coverage}% of target</span>
                </div>
                <div className="tr-prog-bg">
                  <div
                    className="tr-prog-fill"
                    style={{ width: `${Math.max(0, coverage)}%`, background: coverage >= 80 ? "linear-gradient(90deg, #d4a017, #f0c14b)" : "#f87171" }}
                  />
                </div>
              </>
            )}
            {isFullyCovered && (
              <div className="tr-prog-bg">
                <div className="tr-prog-fill" style={{ width: "100%", background: "#d4a017" }} />
              </div>
            )}
            <div className="tr-gap-row" style={{ borderTopColor: "rgba(255,255,255,0.05)" }}>
              <span className="tr-gap-row-l">Target income</span>
              <span className="tr-gap-row-r">{fmt(targetIncome)}{s.targetIncome === 0 ? " (base pay)" : ""}</span>
            </div>
            <div className="tr-gap-row" style={{ borderTopColor: "rgba(255,255,255,0.05)" }}>
              <span className="tr-gap-row-l">Phase 1 take-home</span>
              <span className="tr-gap-row-r">{fmt(phase1TakeHome)}</span>
            </div>
            <div className="tr-gap-row" style={{ borderTopColor: "rgba(255,255,255,0.05)" }}>
              <span className="tr-gap-row-l">Total deductions</span>
              <span className="tr-gap-row-r">{fmt(totalDeductions)}</span>
            </div>
          </div>

          {/* ── MICRO-SURVEY ── */}
          {showSurvey && (
            <div className="survey-card">
              <div className="survey-header">
                <span className="survey-question">Was this helpful?</span>
                <button className="survey-x" onClick={dismissSurvey} aria-label="Dismiss">×</button>
              </div>
              {!surveyDone ? (
                <>
                  <div className="survey-btns">
                    <button className={`survey-btn${surveyChoice === "yes" ? " sel" : ""}`} onClick={() => handleSurveyChoice("yes")}>👍 Yes</button>
                    <button className={`survey-btn${surveyChoice === "not_really" ? " sel" : ""}`} onClick={() => handleSurveyChoice("not_really")}>👎 Not really</button>
                    <button className={`survey-btn${surveyChoice === "suggest" ? " sel" : ""}`} onClick={() => handleSurveyChoice("suggest")}>💬 Suggest</button>
                  </div>
                  {(surveyChoice === "not_really" || surveyChoice === "suggest") && (
                    <div className="survey-expand">
                      <textarea
                        className="survey-textarea"
                        placeholder={surveyChoice === "not_really" ? "What's missing?" : "What would you add?"}
                        value={surveyText}
                        onChange={e => setSurveyText(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <button className="survey-submit" onClick={handleSurveySubmit}>Send feedback</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="survey-thanks">Thanks! 🙌</div>
              )}
            </div>
          )}

          <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.55, padding:"8px 4px 0" }}>
            Gap calculated on retirement income only — investment draws at 65 not included.
            {phase2TakeHome !== phase1TakeHome && (
              <span style={{ color:"#34d399", marginLeft:4 }}>At 65: {fmt(Math.round(phase2TakeHome))}/mo (projected)</span>
            )}
          </div>
          <button onClick={() => { track("Share Link Generated", { trigger: isFullyCovered ? "surplus" : "shortfall" }); handleShare(); }}
            style={{ background:"none", border:"none", color:"#d4a017", fontSize:12, cursor:"pointer", padding:"4px 0 2px", textDecoration:"underline", fontFamily:"inherit" }}>
            Share your results →
          </button>

          {/* ── DEBRIEFED CONTEXTUAL CARD ── */}
          {showDebriefedCard && !debriefedCardDismissed && (
            !isFullyCovered ? (
              <div style={{ position:"relative", border:"1.5px solid rgba(212,160,23,0.5)", borderRadius:12, padding:"14px 16px", margin:"10px 0 6px", background:"rgba(212,160,23,0.05)" }}>
                <button onClick={() => { setDebriefedCardDismissed(true); track("Debriefed Promo Dismissed", { trigger: "gap_shortfall" }); }}
                  style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:18, cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
                <div style={{ fontSize:13, fontWeight:700, color:"#f0c14b", marginBottom:4, paddingRight:20 }}>
                  Your gap is {fmt(incomeGap)}/mo — a stronger civilian resume gets you there faster
                </div>
                <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.5, marginBottom:10 }}>
                  Translate your military experience into civilian career terms — roles, salary ranges, and a resume that gets past ATS.
                </div>
                <a href={`${PARENT_BRAND_URL}?utm_source=milcalc&utm_medium=gap&utm_campaign=shortfall`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => { track("Debriefed Promo Clicked", { trigger: "gap_shortfall" }); setDebriefedCardDismissed(true); }}
                  style={{ fontSize:12, color:"#f0c14b", textDecoration:"underline", fontWeight:600 }}>
                  Try Debriefed free →
                </a>
              </div>
            ) : (
              <div style={{ position:"relative", border:"1.5px solid rgba(52,211,153,0.4)", borderRadius:12, padding:"14px 16px", margin:"10px 0 6px", background:"rgba(52,211,153,0.05)" }}>
                <button onClick={() => { setDebriefedCardDismissed(true); track("Debriefed Promo Dismissed", { trigger: "gap_surplus" }); }}
                  style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:18, cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
                <div style={{ fontSize:13, fontWeight:700, color:"#34d399", marginBottom:4, paddingRight:20 }}>
                  You're financially covered — now get the civilian career to match
                </div>
                <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.5, marginBottom:10 }}>
                  Your benefits cover your target income. Make sure your resume is as strong as your retirement plan.
                </div>
                <a href={`${PARENT_BRAND_URL}?utm_source=milcalc&utm_medium=gap&utm_campaign=surplus`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => { track("Debriefed Promo Clicked", { trigger: "gap_surplus" }); setDebriefedCardDismissed(true); }}
                  style={{ fontSize:12, color:"#34d399", textDecoration:"underline", fontWeight:600 }}>
                  Try Debriefed free →
                </a>
              </div>
            )
          )}

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
            <button className="ds-share-btn" style={{ flex: 1, marginBottom: 0 }} onTouchStart={() => setDebugMsg('touchstart fired')} onClick={handleShare}>
              📤 Share My Numbers
            </button>
            <button className="ds-share-btn" style={{ flex: 1, marginBottom: 0, background: "rgba(212,160,23,0.15)", color: "#f0c14b", border: "1px solid rgba(212,160,23,0.3)" }} onClick={generatePDF}>
              📄 Export PDF
            </button>
          </div>

          {/* ── COST OF LIVING ── */}
          <SectionHeader>Cost of Living Comparison</SectionHeader>
          <div style={{ fontSize: 11, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
            Tap any city to change
          </div>
          <div className="tr-col-grid">
            {[
              { stateKey: "city1", val: s.city1, isBase: true },
              { stateKey: "city2", val: s.city2, isBase: false },
              { stateKey: "city3", val: s.city3, isBase: false },
            ].map(({ stateKey, val, isBase }) => {
              const { idx, cls, lbl } = colInfo(val, isBase);
              return (
                <div
                  key={stateKey}
                  className={`tr-col-card${isBase ? " tr-col-card-base" : ""}`}
                  onClick={() => { setColPickerKey(stateKey); setColSearch(""); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { setColPickerKey(stateKey); setColSearch(""); } }}
                >
                  <div className="tr-col-city-label">{val}</div>
                  <div className="tr-col-idx">{idx}</div>
                  <div className={`tr-col-diff ${cls}`}>{lbl}</div>
                  <div className="tr-col-chevron" />
                </div>
              );
            })}
          </div>
          <HintBox>
            COL index of 100 = national average. City 1 is your base. Cities 2 and 3 show relative cost vs. your base city.
          </HintBox>

          {/* ── COL City Picker Modal ── */}
          {colPickerKey && (
            <div
              className="tr-col-picker-overlay"
              onClick={e => { if (e.target === e.currentTarget) setColPickerKey(null); }}
            >
              <div className="tr-col-picker-sheet" onClick={e => e.stopPropagation()}>
                <div className="tr-col-picker-header">
                  <span className="tr-col-picker-title">
                    Select City ({colPickerKey === "city1" ? "Base" : colPickerKey === "city2" ? "Compare 2" : "Compare 3"})
                  </span>
                  <button className="tr-col-picker-close" onClick={() => setColPickerKey(null)}>✕</button>
                </div>
                <input
                  className="tr-col-picker-search"
                  type="text"
                  placeholder="Search cities…"
                  value={colSearch}
                  onChange={e => setColSearch(e.target.value)}
                  autoFocus
                />
                <div className="tr-col-picker-list">
                  {COL_CITIES.filter(c => c.toLowerCase().includes(colSearch.toLowerCase())).map(c => {
                    const currentVal = s[colPickerKey];
                    const isSelected = c === currentVal;
                    return (
                      <div
                        key={c}
                        className={`tr-col-picker-item${isSelected ? " selected" : ""}`}
                        onClick={() => {
                          set(colPickerKey, c);
                          track("COL City Compared", { city: c, slot: colPickerKey });
                          setColPickerKey(null);
                        }}
                      >
                        <span>{c}</span>
                        {isSelected && <span className="tr-col-picker-checkmark">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── NEXT STEPS ── */}
          <SectionHeader>Next Steps</SectionHeader>
          <InfoCard title="Action Items">
            <StepList steps={[
              "File your VA disability claim before separation — ratings are backdated to the date filed, not the date awarded.",
              "Enroll in TRICARE Retiree immediately at separation to avoid a coverage gap (tricare.mil → Retiree portal).",
              "Review your SBP election window — you have one year from retirement to enroll; missed elections cannot be corrected.",
              "Convert your SGLI to VGLI within 240 days of separation — no medical exam required.",
              "Use your Post-9/11 GI Bill within 36 months of separation — contact your school's VA certifying official to start.",
            ]} />
          </InfoCard>

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
          </div>

          {/* ── FEEDBACK BUTTON ── */}
          <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 24 }}>
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

      {/* ── DEBRIEFED CROSS-PROMO (post-export) ── */}
      {showDebriefedPromo && (
        <div className="sp-modal-overlay" onClick={() => { setShowDebriefedPromo(false); track("Debriefed Promo Dismissed", { trigger: "post_export" }); }}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => { setShowDebriefedPromo(false); track("Debriefed Promo Dismissed", { trigger: "post_export" }); }}>✕</button>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 8, textAlign: "center" }}>You planned your finances — now plan your career</div>
            <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.55, marginBottom: 20, textAlign: "center" }}>
              Translate your military experience into a civilian resume at {PARENT_BRAND_DOMAIN}
            </div>
            <a href={`${PARENT_BRAND_URL}?utm_source=milcalc&utm_medium=app&utm_campaign=post-export`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => { track("Debriefed Promo Clicked", { trigger: "post_export" }); setShowDebriefedPromo(false); }}
              style={{ display: "block", padding: "12px 28px", background: "linear-gradient(135deg,#c2782a,#e09448)",
                color: "#0f0f14", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: "pointer", textDecoration: "none", textAlign: "center", marginBottom: 12 }}>
              Check It Out
            </a>
            <button onClick={() => { setShowDebriefedPromo(false); track("Debriefed Promo Dismissed", { trigger: "post_export" }); }}
              style={{ display: "block", width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* ── ENGAGEMENT POPUP ── */}
      {showPopup && !showDebriefedPromo && (
        <div className="tr-ep-overlay" onClick={dismissPopup}>
          <div className="tr-ep-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:32, textAlign:"center", marginBottom:8 }}>
              {isFullyCovered ? "✅" : "📊"}
            </div>
            <div className="tr-ep-title" style={{ marginBottom:6 }}>
              Your retirement covers {coverage}% of your target
            </div>
            <div style={{ fontSize:13, color:"#6b7280", textAlign:"center", lineHeight:1.5, marginBottom:20 }}>
              {isFullyCovered
                ? `You have a ${fmt(Math.abs(incomeGap))}/mo surplus. Share your plan or export a PDF to review offline.`
                : `You have a ${fmt(incomeGap)}/mo gap to close. Share your plan or export a PDF to review with your advisor.`}
            </div>
            <button onClick={() => { track("Engagement Popup Share Clicked", {}); dismissPopup(); handleShare(); }}
              style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#c2782a,#e09448)",
                color:"#0f0f14", border:"none", borderRadius:10, fontSize:15, fontWeight:700,
                cursor:"pointer", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", marginBottom:8 }}>
              Share My Results
            </button>
            <button onClick={() => { track("Engagement Popup PDF Clicked", {}); dismissPopup(); generatePDF(); }}
              style={{ width:"100%", padding:"13px", background:"rgba(212,160,23,0.12)", border:"1px solid rgba(212,160,23,0.3)",
                color:"#f0c14b", borderRadius:10, fontSize:15, fontWeight:700,
                cursor:"pointer", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", marginBottom:8 }}>
              Export PDF
            </button>
            <button className="tr-ep-dismiss" onClick={dismissPopup}>Maybe later</button>
          </div>
        </div>
      )}

      {/* ── RATING PROMPT ── */}
      {showRatingPrompt && !showDebriefedPromo && !showPopup && (
        <div className="tr-ep-overlay" onClick={() => dismissRatingPrompt("dismissed")}>
          <div className="tr-ep-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>⭐</div>
            <div className="tr-ep-title">Enjoying MilCalc?</div>
            <div style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 1.5, marginBottom: 20 }}>
              If MilCalc helped your transition planning, a quick review means the world to us.
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=MilCalc%20Review&body=I%20wanted%20to%20share%20feedback%20about%20MilCalc%3A`}
              onClick={() => dismissRatingPrompt("rated")}
              style={{ display: "block", padding: "13px", background: "linear-gradient(135deg,#c2782a,#e09448)",
                color: "#0f0f14", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: "pointer", textDecoration: "none", textAlign: "center", marginBottom: 8,
                fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
              Leave a Review
            </a>
            <button className="tr-ep-dismiss" onClick={() => dismissRatingPrompt("dismissed")}>Not now</button>
          </div>
        </div>
      )}

      {/* ── DEBUG OVERLAY (temp) ── */}
      {debugMsg && (
        <div style={{
          position: 'fixed', top: 60, left: 12, right: 12,
          background: '#000', color: '#0f0', fontFamily: 'monospace',
          fontSize: 11, padding: 12, borderRadius: 8, zIndex: 9999,
          whiteSpace: 'pre-wrap', border: '1px solid #0f0'
        }} onClick={() => setDebugMsg('')}>
          {debugMsg}
          {'\n(tap to dismiss)'}
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
              Your transition plan infographic.
            </div>
            <div style={{ marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#0f0f14", minHeight: 200 }}>
              {shareImgURL
                ? <img src={shareImgURL} alt="Transition plan infographic" style={{ width: "100%", display: "block" }} />
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
