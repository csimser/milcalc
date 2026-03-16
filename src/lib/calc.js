// ── SHARED CALCULATION FUNCTIONS ─────────────────────────────────────
// All pure functions — no React dependencies, no side effects.

import {
  PAY2026, YOS_BREAKS, VA, TAX_BRACKETS_2026, STANDARD_DEDUCTION_2026,
  VGLI_RATES, MGIB_AD, MGIB_SR,
} from './data.js';

// ── DISPLAY HELPERS ───────────────────────────────────────────────────
export const fmt = n => {const v=Number(n);if(!isFinite(v)||isNaN(v))return "$0";return (v<0?"-$":"$")+Math.abs(Math.round(v)).toLocaleString("en-US");};
export const fmtYos = y => y%1===0?`${y}`:`${y.toFixed(1)}`;
export const dk = dep => ({Single:"s",Spouse:"sp","Spouse + Child":"spc","Child Only":"c"}[dep]||"s");

// ── PAY LOOKUP ───────────────────────────────────────────────────────
// Look up 2026 monthly basic pay for a given grade + total YOS
export function lookupPay(grade, yos) {
  const row = PAY2026[grade];
  if (!row) return null;
  let idx = 0;
  for (let i = 0; i < YOS_BREAKS.length; i++) {
    if (yos > YOS_BREAKS[i]) idx = i;
  }
  return row[idx] || null;
}

// ── VA COMPENSATION ──────────────────────────────────────────────────
// Calculate total VA compensation including additional children under 18
// children = total number of children under 18 (0 = none, 1 = included in base spc/c rate, 2+ = adds per-child amount)
export function calcVAComp(rating, depsKey, children) {
  const entry = VA[rating];
  if (!entry) return 0;
  // 10% and 20% ratings: veteran-alone rate only (no dependent compensation)
  if (rating <= 20) return entry.s || 0;
  let baseKey = depsKey;
  if (children > 0 && baseKey === "s") baseKey = "c";
  if (children > 0 && baseKey === "sp") baseKey = "spc";
  const base = entry[baseKey] || entry.s || 0;
  const extraChildren = Math.max(0, children - 1);
  const perChild = entry.ac || 0;
  return base + extraChildren * perChild;
}

// ── PENSION CALCULATIONS ─────────────────────────────────────────────
export function pension(rt, yos, h3) {
  if (!h3 || h3 <= 0 || !yos || yos <= 0) return 0;
  if (rt==="REDUX") return Math.max(0, h3 * Math.min(0.40+Math.max(0,yos-20)*0.035, 0.75));
  return Math.max(0, h3 * (rt==="BRS"?0.020:0.025) * Math.min(yos,40));
}

export function pct(rt, yos) {
  const y = yos || 0;
  if (rt==="REDUX") return Math.min(40+Math.max(0,y-20)*3.5,75);
  return Math.min(y*(rt==="BRS"?2.0:2.5),100);
}

// ── MEDICAL RETIREMENT (PDRL/TDRL) — Chapter 61 ──────────────────────
// Source: 10 USC § 1201/§ 1202; congress.gov/crs-product/IF10483
// PDRL: DOD rating ≥ 30% OR YOS ≥ 20 → permanent disability retired list
//   Pay = HIGHER of (DOD% × High-3) or (YOS × multiplier × High-3), capped at 75%
// TDRL: DOD rating < 30% AND YOS < 20 → temporary list, minimum 50% applied
// BRS members get 2.0% for the YOS leg (NOT 2.5%) — confirmed by DoD Defense Primer
export function medicalPension(yos, h3, dodPct, tdrl, retType) {
  const yosMult = yos * (retType === "BRS" ? 2.0 : 2.5);
  const isPDRL = dodPct >= 30 || yos >= 20;
  const isTDRL = !isPDRL && tdrl;
  const isSeverance = !isPDRL && !tdrl;
  const disabMult = isTDRL ? Math.max(dodPct, 50) : dodPct;
  const finalMult = isPDRL ? Math.min(Math.max(yosMult, disabMult), 75) : isTDRL ? 50 : 0;
  const method = isPDRL ? (disabMult >= yosMult ? "disability" : "yos") : isTDRL ? "tdrl" : "severance";
  const severancePay = isSeverance ? 2 * h3 * yos : 0;
  return { pay: h3 * (finalMult / 100), mult: finalMult, yosMult, disabMult, isPDRL, isTDRL, isSeverance, method, severancePay };
}

// ── RESERVE/GUARD RETIREMENT ────────────────────────────────────────────
// Source: 10 USC § 12733; militarypay.defense.gov/Pay/Retirement/Reserve.aspx
// Formula: (totalPoints ÷ 360) × multiplier × High-3
export function reservePension(points, h3, rt) {
  if (!points || points <= 0 || !h3 || h3 <= 0) return { pay: 0, equivYOS: 0, multPct: 0 };
  const equivYOS = points / 360;
  const mult = rt === "BRS" ? 0.020 : 0.025;
  const pay = Math.max(0, h3 * mult * equivYOS);
  return { pay, equivYOS, multPct: mult * 100 };
}

// Helper: compute pension by separation type — always returns >= 0
export function pensionBySepType(separationType, retType, yos, h3, medDodPct, tdrl, reservePoints, currentAge, payStartAge) {
  let result = 0;
  if (separationType === "active") result = pension(retType, yos || 0, h3 || 0);
  else if (separationType === "medical") result = medicalPension(yos || 0, h3 || 0, medDodPct || 0, tdrl, retType).pay;
  else if (separationType === "reserve") result = (currentAge >= payStartAge) ? reservePension(reservePoints || 0, h3 || 0, retType).pay : 0;
  return Math.max(0, result || 0);
}

// Helper: compute reserve pension amount regardless of age eligibility (for display/export)
export function reservePensionAmount(reservePoints, h3, retType) {
  return Math.max(0, reservePension(reservePoints || 0, h3 || 0, retType).pay || 0);
}

// ── FEDERAL INCOME TAX ───────────────────────────────────────────────
// Source: IRS Rev. Proc. 2025-28 + One Big Beautiful Bill (OBBB) adjustments
// Returns { annualTax, monthlyTax, effectiveRate, totalDeduction }
export function calcFederalTax(taxableAnnualGross, filingStatus, age65Plus, spouseAge65Plus) {
  const gross = Number(taxableAnnualGross) || 0;
  if (gross <= 0) return { annualTax: 0, monthlyTax: 0, effectiveRate: 0, totalDeduction: 0 };
  let deduction = STANDARD_DEDUCTION_2026[filingStatus] ?? 16100;
  if (age65Plus) {
    deduction += (filingStatus === "mfj") ? 1650 : 2050;
  }
  if (spouseAge65Plus && filingStatus === "mfj") {
    deduction += 1650;
  }
  // OBBB senior deduction (2025–2028): additional $6,000 for age 65+
  if (age65Plus) {
    const obbThreshold = (filingStatus === "mfj") ? 150000 : 75000;
    if (gross <= obbThreshold) deduction += 6000;
  }
  const taxableIncome = Math.max(0, gross - deduction);
  const brackets = TAX_BRACKETS_2026[filingStatus] ?? TAX_BRACKETS_2026.single;

  let annualTax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    annualTax += taxableInBracket * bracket.rate;
  }

  return {
    annualTax: Math.round(annualTax),
    monthlyTax: Math.round(annualTax / 12),
    effectiveRate: gross > 0 ? annualTax / gross : 0,
    totalDeduction: deduction,
  };
}

// ── STATE TAX ────────────────────────────────────────────────────────
// Calculates estimated state tax on military retirement pay
// age param enables age-tiered exemptions for CO, MD, ID
export function calcStateTax(annualPension, stateInfo, age) {
  if (!stateInfo || stateInfo.ok) return 0;
  const p = Math.max(0, annualPension);
  const userAge = age || 0;

  // Age-tiered exemption overrides
  let exemptDollar = stateInfo.exempt || 0;

  const note = stateInfo.note || "";
  if (note.includes("Under 55: $15k") && note.includes("55–64: $20k")) {
    // Colorado age tiers
    if (userAge < 55) exemptDollar = 15000;
    else if (userAge < 65) exemptDollar = 20000;
    else exemptDollar = 24000;
  } else if (note.includes("Under 55: $12,500") && note.includes("55+: $20,000")) {
    // Maryland age tiers
    exemptDollar = userAge >= 55 ? 20000 : 12500;
  } else if (stateInfo.ageExempt && userAge < stateInfo.ageExempt) {
    // Idaho: under 62 = no exemption (fully taxable)
    exemptDollar = 0;
  }

  const exemptPct = (stateInfo.pctExempt || 0) / 100;
  const exemptAmt = Math.max(exemptDollar, p * exemptPct);
  const taxable = Math.max(0, p - exemptAmt);
  return Math.round(taxable * ((stateInfo.rate || 0) / 100));
}

// ── VA PRIORITY GROUP ────────────────────────────────────────────────
export function getVAPriorityGroup(vaRating) {
  if (vaRating >= 50) return 1;
  if (vaRating >= 30) return 2;
  if (vaRating >= 10) return 3;
  return 5;
}

// ── VGLI (VETERANS GROUP LIFE INSURANCE) ────────────────────────────
export function vgliRate(age) {
  if (age < 30) return VGLI_RATES[29];
  if (age < 35) return VGLI_RATES[34];
  if (age < 40) return VGLI_RATES[39];
  if (age < 45) return VGLI_RATES[44];
  if (age < 50) return VGLI_RATES[49];
  if (age < 55) return VGLI_RATES[54];
  if (age < 60) return VGLI_RATES[59];
  if (age < 65) return VGLI_RATES[64];
  if (age < 70) return VGLI_RATES[69];
  if (age < 75) return VGLI_RATES[74];
  return VGLI_RATES[99];
}

export function vgliMonthly(coverage, age) {
  return (coverage / 1000) * vgliRate(age);
}

// ── MGIB (MONTGOMERY GI BILL) ────────────────────────────────────────
export function mgibMonthly(giType, mgibEnroll, mgibServiceYears) {
  if (giType === "ch30") return (MGIB_AD[mgibServiceYears] || MGIB_AD["3+"])[mgibEnroll] || 0;
  if (giType === "ch1606") return MGIB_SR[mgibEnroll] || 0;
  return 0;
}

// ── SPECIAL PAY HELPERS ──────────────────────────────────────────────
export function sumSpecialPays(sp) {
  if (!sp || typeof sp !== "object") return 0;
  return Object.values(sp).reduce((sum, p) => sum + (p && p.on ? (Number(p.amount) || 0) : 0), 0);
}

export function countSpecialPays(sp) {
  if (!sp || typeof sp !== "object") return 0;
  return Object.values(sp).filter(p => p && p.on && (Number(p.amount) || 0) > 0).length;
}

export function enabledPayIds(sp) {
  if (!sp || typeof sp !== "object") return [];
  return Object.entries(sp).filter(([, p]) => p && p.on && (Number(p.amount) || 0) > 0).map(([k]) => k);
}
