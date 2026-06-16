// ── SHARED CALCULATION FUNCTIONS ─────────────────────────────────────
// All pure functions — no React dependencies, no side effects.

import {
  PAY2026, YOS_BREAKS, VA, TAX_BRACKETS_2026, STANDARD_DEDUCTION_2026,
  VGLI_RATES, MGIB_AD, MGIB_SR,
  RET_SYSTEMS, PDR_2026, LUMP_SUM_AGE,
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
  // "Over X" pay columns mean YOS >= X, so step up AT the boundary (>=), not
  // past it (>). Using > left every exact-boundary YOS (20, 22, 24, 26, …) one
  // column low (e.g. E-8 at 22 YOS returned the "Over 20" rate, not "Over 22").
  for (let i = 0; i < YOS_BREAKS.length; i++) {
    if (yos >= YOS_BREAKS[i]) idx = i;
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
  // Cap depends on retirement system: High-3 → 75%, BRS → 60% (BRS uses the
  // 2.0%/yr multiplier and the lower statutory cap on the YOS leg).
  const sys = RET_SYSTEMS[retType] || RET_SYSTEMS["High-3"];
  const cap = sys.cap;
  const yosMult = yos * sys.mult;
  const isPDRL = dodPct >= 30 || yos >= 20;
  const isTDRL = !isPDRL && tdrl;
  const isSeverance = !isPDRL && !tdrl;
  const disabMult = isTDRL ? Math.max(dodPct, 50) : dodPct;
  const finalMult = isPDRL ? Math.min(Math.max(yosMult, disabMult), cap) : isTDRL ? 50 : 0;
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

// Helper: compute reserve pension amount regardless of age eligibility (for display/export)
export function reservePensionAmount(reservePoints, h3, retType) {
  return Math.max(0, reservePension(reservePoints || 0, h3 || 0, retType).pay || 0);
}

// LOS-based ("length of service") retired pay — the CRSC cap per 10 USC 1413a.
// CRSC may not exceed the dollar amount of retired pay the member would receive
// computed purely on years of service (the disability % is ignored).
//   - Chapter 61 medical: (reserve? equivYOS : yos) × mult, capped at the system
//     cap. For a sub-20-year disability retiree this is LESS than the disability-
//     based gross pension, so CRSC only partially restores the VA waiver.
//   - Everyone else: their retired pay already IS the LOS computation, so the cap
//     equals the gross pension and never binds (full restoration, e.g. 20-yr regular).
export function losBasedPension(retireeType, retType, yos, equivYOS, h3, grossPension) {
  if (!isMedicalType(retireeType)) return Math.max(0, grossPension || 0);
  const sys = RET_SYSTEMS[retType] || RET_SYSTEMS["High-3"];
  const years = isReserveType(retireeType) ? (equivYOS || 0) : (yos || 0);
  const losPct = Math.min(years * sys.mult, sys.cap);
  return Math.max(0, Math.round((h3 || 0) * (losPct / 100)));
}

// Legacy coarse-type pension helper. The main app now uses calculateRetirement()
// with the 7-way retireeType; this thin wrapper is retained only for the
// standalone TransitioningPage, which has its own simplified sepType state.
export function pensionBySepType(separationType, retType, yos, h3, medDodPct, tdrl, reservePoints, currentAge, payStartAge) {
  let result = 0;
  if (separationType === "active") result = pension(retType, yos || 0, h3 || 0);
  else if (separationType === "medical") result = medicalPension(yos || 0, h3 || 0, medDodPct || 0, tdrl, retType).pay;
  else if (separationType === "reserve") result = (currentAge >= payStartAge) ? reservePension(reservePoints || 0, h3 || 0, retType).pay : 0;
  return Math.max(0, result || 0);
}

// ── RETIREMENT ENGINE (v1.1) ─────────────────────────────────────────
// Single source of truth for pension, CRDP/CRSC offset, BRS lump sum, and
// reserve retired-pay timing across all seven retiree types.
// Ground truth: militarypay.defense.gov/Calculators (match within $1–2/mo).

// The seven retiree types (source of truth in app state).
export const RETIREE_TYPES = [
  "active-regular", "active-tera", "active-medical",
  "reserve-regular-drawing", "reserve-regular-waiting", "reserve-medical",
  "veteran",
];

// Map the 7-way retiree type to the legacy coarse separation bucket so the
// many non-pension consumers (TRICARE, GI Bill, VA health, labels, PDF
// gating) keep working unchanged. Pension math must NOT read this.
export function legacySepType(retireeType) {
  switch (retireeType) {
    case "active-regular":
    case "active-tera": return "active";
    case "active-medical":
    case "reserve-medical": return "medical";
    case "reserve-regular-drawing":
    case "reserve-regular-waiting": return "reserve";
    case "veteran": return "veteran";
    default: return "active";
  }
}

export const isReserveType = rt => rt === "reserve-regular-drawing" || rt === "reserve-regular-waiting" || rt === "reserve-medical";
export const isMedicalType = rt => rt === "active-medical" || rt === "reserve-medical";
export const isActiveType  = rt => rt === "active-regular" || rt === "active-tera" || rt === "active-medical";

// TERA reduction: retired pay reduced 1% for each year retired short of 20.
// Source: DFAS/Army TERA computation — factor = 1 − 0.01 × (20 − YOS), YOS<20.
export function teraReductionFactor(yos) {
  if (yos >= 20) return 1;
  return Math.max(0, 1 - 0.01 * (20 - yos));
}

// Reserve retired-pay age reduction: age 60 reduced 3 months per 90 days of
// qualifying active duty (after 28 Jan 2008). Floor 50. Returns {age, months,
// periods} so the UI can show the math.
export function reservePayAge(adDays) {
  const days = Math.max(0, adDays || 0);
  const periods = Math.floor(days / 90);
  const months = periods * 3;
  const age = Math.max(50, 60 - months / 12);
  return { age, months, periods };
}

// CRDP eliminates the VA waiver (full concurrent receipt) when VA ≥ 50% and
// the retiree's category qualifies. reserve20GoodYears gates the Chapter 61
// reserve case (would-have-qualified-for-regular-retirement test).
export function crdpQualifies(retireeType, yos, vaRating, atPayAge, reserve20GoodYears) {
  if ((vaRating || 0) < 50) return false;
  switch (retireeType) {
    case "active-regular":  return (yos || 0) >= 20;
    case "active-tera":     return true;                       // CRDP despite <20 YOS
    case "active-medical":  return (yos || 0) >= 20;           // Ch.61 needs 20+ YOS
    case "reserve-regular-drawing": return !!atPayAge;         // drawing ⇒ 20 good yrs
    case "reserve-regular-waiting": return false;              // no pension flowing
    // Chapter 61 reserve: needs BOTH 20 good years AND to be at retired pay age.
    // Under pay age the VA waiver still applies until CRDP kicks in.
    case "reserve-medical": return !!reserve20GoodYears && !!atPayAge;
    default: return false;
  }
}

// CRSC eliminates the offset (separate, branch-determined, non-taxable) when
// the disability is combat-related. Available regardless of CRDP.
export function crscQualifies(retireeType, combatRelated, reserve20GoodYears) {
  if (!combatRelated) return false;
  switch (retireeType) {
    case "active-regular":
    case "active-tera":
    case "active-medical": return true;                        // any YOS
    case "reserve-regular-drawing": return true;               // 20+ qualifying yrs
    case "reserve-regular-waiting": return false;              // no pension flowing
    // Chapter 61 disability retirees qualify for CRSC at ANY length of service
    // (unlike CRDP, which needs 20 yrs). The CRSC payment is instead capped at
    // LOS-based retired pay (see losBasedPension / 10 USC 1413a).
    case "reserve-medical": return true;
    default: return false;
  }
}

// BRS lump sum present-value buyout. Discounts the stream of monthly pension
// from retirement to age 67 at the annual Personal Discount Rate (PDR).
//   elected ∈ {0, 0.25, 0.5}; retireAge = age at separation.
// Returns null when not applicable (no election, retireAge ≥ 67, $0 pension).
export function brsLumpSum(monthlyGross, elected, retireAge, pdrAnnual = PDR_2026) {
  const pct = elected || 0;
  if (pct <= 0 || !monthlyGross || monthlyGross <= 0) return null;
  const monthsTo67 = Math.round((LUMP_SUM_AGE - (retireAge || 0)) * 12);
  if (monthsTo67 <= 0) return null;
  const pdrMonthly = Math.pow(1 + pdrAnnual, 1 / 12) - 1;
  const annuityFactor = (1 - Math.pow(1 + pdrMonthly, -monthsTo67)) / pdrMonthly;
  const presentValue = monthlyGross * annuityFactor;
  return {
    cash: Math.round(presentValue * pct),
    reducedMonthly: Math.round(monthlyGross * (1 - pct)),
    fullMonthly: Math.round(monthlyGross),
    monthsTo67,
    electedPct: pct,
  };
}

// ── MAIN ENGINE ──────────────────────────────────────────────────────
// input: {
//   retireeType, retType, yos, high3, medDodPct, tdrl, reservePoints,
//   currentAge, payStartAge, retireAge, brsLumpSum, combatRelated,
//   vaRating, vaMonthly, reserve20GoodYears
// }
// vaMonthly is passed pre-computed (keep this function free of dependent lookups).
export function calculateRetirement(input) {
  const {
    retireeType = "active-regular", retType = "High-3",
    yos = 0, high3 = 0, medDodPct = 0, tdrl = false,
    reservePoints = 0, currentAge = 0, payStartAge = 60, retireAge = 0,
    brsLumpSum: electedLump = 0, combatRelated = false,
    vaRating = 0, vaMonthly = 0, reserve20GoodYears = false,
    v3TaxFree = false,
  } = input || {};

  const sys = RET_SYSTEMS[retType] || RET_SYSTEMS["High-3"];
  const h3 = Math.max(0, high3 || 0);
  const notes = [];

  // Veteran — no pension, VA only.
  if (retireeType === "veteran") {
    return {
      retireeType, grossPension: 0, multiplierPct: 0, teraFactor: 1, equivYOS: null,
      offsetType: "none", netPensionAfterOffset: 0, taxablePensionMonthly: 0,
      fedTaxablePensionMonthly: 0, losBasedPension: 0, crscCapped: false,
      crscAmount: 0, lumpSum: null, isWaiting: false, payStartAge,
      projectedGross: 0, method: "none", severancePay: 0, notes,
    };
  }

  const reserve = isReserveType(retireeType);
  const equivYOS = reserve ? (reservePoints || 0) / 360 : null;
  const isWaiting = retireeType === "reserve-regular-waiting";

  // 1) Gross monthly pension + display multiplier.
  let grossFull = 0;        // gross before TERA factor / waiting gate
  let multiplierPct = 0;
  let teraFactor = 1;
  let method = "regular";
  let severancePay = 0;

  if (retireeType === "active-regular" || retireeType === "active-tera") {
    if (retType === "REDUX") {
      grossFull = pension("REDUX", yos, h3);
      multiplierPct = pct("REDUX", yos);
    } else {
      multiplierPct = Math.min(yos * sys.mult, sys.cap);
      grossFull = h3 * (multiplierPct / 100);
    }
    if (retireeType === "active-tera") {
      teraFactor = teraReductionFactor(yos);
      grossFull = grossFull * teraFactor;
      multiplierPct = multiplierPct * teraFactor; // effective % so gross = mult × high3 reconciles
      method = "tera";
    }
  } else if (retireeType === "active-medical") {
    const mp = medicalPension(yos, h3, medDodPct, tdrl, retType);
    grossFull = mp.pay;
    multiplierPct = mp.mult;
    method = mp.method;
    severancePay = mp.severancePay;
  } else if (retireeType === "reserve-regular-drawing" || retireeType === "reserve-regular-waiting") {
    multiplierPct = Math.min(equivYOS * sys.mult, sys.cap);
    grossFull = h3 * (multiplierPct / 100);
  } else if (retireeType === "reserve-medical") {
    const yosLeg = equivYOS * sys.mult;
    multiplierPct = Math.min(Math.max(yosLeg, medDodPct || 0), sys.cap);
    grossFull = h3 * (multiplierPct / 100);
    method = (medDodPct || 0) >= yosLeg ? "disability" : "yos";
  }

  grossFull = Math.max(0, Math.round(grossFull));
  // Waiting reservists: pension is $0 now, begins at retired pay age.
  const grossPension = isWaiting ? 0 : grossFull;
  const projectedGross = grossFull;

  // 2) Offset resolution (mutually exclusive). CRSC elected over CRDP.
  // Active/drawing retirees are receiving pay by definition. The "awaiting pay
  // age" reservist is never at pay age here (pension is $0). A Chapter 61
  // RESERVE medical retiree DOES draw retired pay immediately, but CRDP for them
  // only begins at retired pay age — so gate atPayAge on currentAge >= payStartAge.
  const atPayAge = retireeType === "reserve-regular-waiting" ? false
    : retireeType === "reserve-medical" ? (currentAge >= payStartAge)
    : true;
  let offsetType = "none";
  if (isWaiting || grossPension <= 0) {
    offsetType = "none";
  } else if (crscQualifies(retireeType, combatRelated, reserve20GoodYears)) {
    offsetType = "crsc";
  } else if (crdpQualifies(retireeType, yos, vaRating, atPayAge, reserve20GoodYears)) {
    offsetType = "crdp";
  } else if ((vaMonthly || 0) > 0) {
    offsetType = "waiver";
  }

  // 3) Net pension after offset + CRSC amount + taxable base.
  // LOS-based retired pay = the CRSC ceiling (10 USC 1413a). For non-medical
  // retirees it equals the gross pension (never binds); for Chapter 61 medical
  // retirees with < 20 yrs it is lower, so CRSC only partially restores the waiver.
  const losBased = losBasedPension(retireeType, retType, yos, equivYOS, h3, grossPension);
  let netPensionAfterOffset = grossPension;
  let crscAmount = 0;
  let crscCapped = false;
  if (offsetType === "waiver" || offsetType === "crsc") {
    netPensionAfterOffset = Math.max(0, grossPension - (vaMonthly || 0));
  }
  if (offsetType === "crsc") {
    // CRSC = MIN(VA waiver, gross pension, LOS-based retired pay), tax-free.
    crscAmount = Math.min(vaMonthly || 0, grossPension, losBased);
    crscCapped = isMedicalType(retireeType) && losBased < Math.min(vaMonthly || 0, grossPension);
    if (crscCapped) {
      notes.push("CRSC is capped at your LOS-based retired pay (years-of-service computation, disability % ignored) per 10 USC 1413a, so it only partially restores the VA waiver. The VA waiver still applies to the remaining pension.");
    } else {
      notes.push("CRSC amount estimated as full VA compensation assuming all disabilities are combat-related. Actual CRSC payment is determined by your service branch and may be less if only some disabilities qualify combat-related.");
    }
  }
  // Taxable retired pay equals the net pension actually received as retired pay
  // (CRDP restores the full taxable amount; CRSC/waiver leave only the reduced
  // pension taxable; the CRSC dollars are tax-free).
  const taxablePensionMonthly = netPensionAfterOffset;
  // Federal taxability: a V3 (combat-related, 26 USC 104) disability retiree's
  // retired pay is excluded from federal gross income. Only Chapter 61 medical
  // retired pay qualifies. State treatment varies (handled/disclaimed in UI).
  const fedTaxablePensionMonthly =
    (v3TaxFree && isMedicalType(retireeType)) ? 0 : taxablePensionMonthly;

  // 4) BRS lump sum (active or reserve-drawing, BRS only).
  let lumpSum = null;
  const lumpEligible = retType === "BRS" && !isWaiting &&
    (isActiveType(retireeType) || retireeType === "reserve-regular-drawing");
  if (lumpEligible) {
    lumpSum = brsLumpSum(grossPension, electedLump, retireAge);
    if (lumpSum) {
      notes.push(`Lump sum cash payment of $${lumpSum.cash.toLocaleString("en-US")} is taxable in the retirement year — consult a tax advisor for impact on retirement-year filing.`);
    }
  }

  return {
    retireeType,
    grossPension,
    multiplierPct,
    teraFactor,
    equivYOS,
    offsetType,
    netPensionAfterOffset,
    taxablePensionMonthly,
    fedTaxablePensionMonthly,
    losBasedPension: losBased,
    crscCapped,
    crscAmount,
    lumpSum,
    isWaiting,
    payStartAge,
    atPayAge,
    projectedGross,
    method,
    severancePay,
    notes,
  };
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
  if (age < 80) return VGLI_RATES[79];
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
