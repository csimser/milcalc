// ── SHARED UI COMPONENTS + DESIGN SYSTEM ─────────────────────────────
// All shared building blocks for MilCalc's three paths.
// Inject DS_CSS via <style>{DS_CSS}</style> at the page level once.

import { DISCORD_URL } from "../config.js";

// ── DESIGN SYSTEM CSS ─────────────────────────────────────────────────
export const DS_CSS = `
/* ── RESET & BASE ── */
html, body, #root {
  background: #0f0f14;
  margin: 0;
  padding: 0;
}
.ds-page {
  background: #0f0f14;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  color: #f9fafb;
  -webkit-font-smoothing: antialiased;
}
.ds-page *, .ds-page *::before, .ds-page *::after {
  box-sizing: border-box;
}

/* ── PAGE CONTENT WRAPPER ── */
.ds-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 12px;
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
}

/* ── PAGE TRANSITION ── */
@keyframes ds-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ds-page-enter {
  animation: ds-fade-in 0.15s ease both;
}

/* ── HERO / SUMMARY SECTION ── */
.ds-summary {
  padding: 24px 0 20px;
  background: linear-gradient(180deg, rgba(212,160,23,0.04) 0%, transparent 100%);
  margin-bottom: 1rem;
}
.ds-summary-eyebrow {
  font-size: 10px; font-weight: 500; letter-spacing: 0.06em;
  text-transform: uppercase; color: #6b7280; margin-bottom: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-summary-amount {
  font-size: 48px; font-weight: 700; color: #f9fafb;
  letter-spacing: -2px; line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-summary-sub {
  font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 16px;
}
.ds-summary-chips {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.ds-chip {
  background: rgba(255,255,255,0.06);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 5px 12px; font-size: 12px; white-space: nowrap;
}
.ds-chip-label { color: #9ca3af; }
.ds-chip-value { color: #e5e7eb; font-weight: 500; }

/* ── SECTION HEADER ── */
.ds-section-hdr {
  font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4b5563;
  margin-bottom: 10px; margin-top: 1.25rem;
}
.ds-section-hdr:first-child { margin-top: 0; }

/* ── INFO CARD ── */
.ds-card {
  background: #17171f;
  border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  margin-bottom: 16px;
  overflow: hidden;
}
.ds-card-title {
  font-size: 10px; font-weight: 600; color: #4b5563;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 12px 14px 10px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
}

/* ── FIELD ROW ── */
.ds-field-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
  gap: 12px;
  min-height: 48px;
}
.ds-field-row:last-child { border-bottom: none; }
.ds-field-label {
  font-size: 10px; font-weight: 500; color: #6b7280;
  letter-spacing: 0.06em; text-transform: uppercase;
  flex-shrink: 0; line-height: 1.4;
}
.ds-field-value {
  font-size: 15px; font-weight: 500; color: #f9fafb;
  text-align: right; min-width: 0; flex: 1;
}
.ds-field-hint {
  font-size: 10px; color: #4b5563; margin-top: 2px;
}
.ds-field-hint-gold {
  font-size: 10px; color: rgba(212,160,23,0.7); margin-top: 2px;
}

/* ── TWO-COLUMN FIELD GRID ── */
.ds-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.ds-two-col > .ds-field-row:first-child {
  border-right: 0.5px solid rgba(255,255,255,0.04);
}
.ds-two-col > .ds-field-row {
  flex-direction: column; align-items: flex-start; gap: 4px;
}
.ds-two-col > .ds-field-row .ds-field-value { text-align: left; }

/* ── INPUTS INSIDE CARDS ── */
.ds-card input[type="text"],
.ds-card input[type="number"] {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  text-align: right; width: 100%; min-height: 28px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  -moz-appearance: textfield;
}
.ds-card input[type="text"]::-webkit-inner-spin-button,
.ds-card input[type="number"]::-webkit-inner-spin-button,
.ds-card input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none; margin: 0;
}
.ds-card input[type="text"]::placeholder,
.ds-card input[type="number"]::placeholder {
  color: #4b5563;
}
.ds-card select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  width: 100%; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-card select option { background: #17171f; color: #f9fafb; }

/* Input with prefix */
.ds-input-wrap {
  display: flex; align-items: center;
  flex: 1; min-width: 0; justify-content: flex-end;
}
.ds-input-pre {
  font-size: 14px; color: #6b7280; margin-right: 4px; flex-shrink: 0;
}
.ds-input-suf {
  font-size: 13px; color: #6b7280; margin-left: 4px; flex-shrink: 0;
}

/* ── TOGGLE GROUP ── */
.ds-tg {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 12px 14px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-tg:last-child { border-bottom: none; }
.ds-tg-with-label { flex-direction: column; gap: 8px; }
.ds-tg-with-label .ds-field-label { flex: none; }
/* 2×2 grid variant for separation type */
.ds-tg-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  padding: 12px 14px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-tg-grid:last-child { border-bottom: none; }
.ds-tg-grid-label {
  font-size: 10px; font-weight: 500; color: #6b7280;
  letter-spacing: 0.06em; text-transform: uppercase;
  margin-bottom: 6px; padding: 12px 14px 0; display: block;
}
.ds-tb {
  flex: 1; min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s, transform 0.1s;
  border: 0.5px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #6b7280;
  -webkit-tap-highlight-color: transparent;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
  min-height: 36px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  white-space: nowrap;
}
.ds-tb.active {
  background: rgba(212,160,23,0.12);
  border-color: rgba(212,160,23,0.4);
  color: #d4a017;
  font-weight: 600;
}
.ds-tb.active-green {
  background: rgba(34,211,153,0.1);
  border-color: rgba(34,211,153,0.3);
  color: #34d399;
  font-weight: 600;
}
.ds-tb:active { transform: scale(0.97); }

/* ── SLIDER FIELD ── */
.ds-slider-row {
  padding: 12px 14px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-slider-row:last-child { border-bottom: none; }
.ds-slider-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.ds-slider-lbl {
  font-size: 13px; font-weight: 400; color: #9ca3af;
}
.ds-slider-badge {
  background: rgba(212,160,23,0.15);
  color: #d4a017; border-radius: 20px;
  padding: 3px 10px; font-size: 12px; font-weight: 600;
}
.ds-slider-badge.green {
  background: rgba(52,211,153,0.1);
  color: #34d399;
}
.ds-slider-bounds {
  display: flex; justify-content: space-between;
  font-size: 10px; color: #6b7280; margin-top: 5px;
}
input[type="range"].ds-range {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 3px;
  background: rgba(255,255,255,0.08); border-radius: 2px;
  outline: none; cursor: pointer; display: block;
}
input[type="range"].ds-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: #d4a017; border: 3px solid #0f0f14;
  cursor: pointer;
}
input[type="range"].ds-range::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: #d4a017; border: 3px solid #0f0f14;
  cursor: pointer;
}
input[type="range"].ds-range.green::-webkit-slider-thumb {
  background: #34d399;
}
input[type="range"].ds-range.green::-moz-range-thumb {
  background: #34d399;
}

/* ── INCOME ROW ── */
.ds-income-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
  gap: 12px;
  min-height: 44px;
}
.ds-income-row:last-child { border-bottom: none; }
.ds-income-lbl {
  font-size: 13px; color: #9ca3af; line-height: 1.4;
}
.ds-income-lbl-sub {
  font-size: 10px; color: #4b5563; margin-top: 2px;
}
.ds-income-val {
  font-size: 15px; font-weight: 500; white-space: nowrap; flex-shrink: 0;
}
.ds-income-val.gold  { color: #f0c14b; }
.ds-income-val.green { color: #34d399; }
.ds-income-val.red   { color: #f87171; }
.ds-income-val.white { color: #f9fafb; }
.ds-income-val.muted { color: #6b7280; }

/* ── TOTAL ROW ── */
.ds-total-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px;
  border-top: 0.5px solid rgba(212,160,23,0.15);
  background: rgba(212,160,23,0.06);
  gap: 12px;
}
.ds-total-lbl {
  font-size: 13px; font-weight: 600; color: #d4a017;
}
.ds-total-val {
  font-size: 22px; font-weight: 700; color: #f0c14b; letter-spacing: -0.5px;
}

/* ── HINT BOX ── */
.ds-hint {
  background: rgba(212,160,23,0.06);
  border: 0.5px solid rgba(212,160,23,0.2);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 11px; line-height: 1.55; color: rgba(212,160,23,0.8);
  margin: 0 14px 12px;
}
.ds-hint.green {
  background: rgba(34,211,153,0.06);
  border-color: rgba(34,211,153,0.2);
  color: #6ee7b7;
}
.ds-hint.red {
  background: rgba(239,68,68,0.06);
  border-color: rgba(239,68,68,0.2);
  color: #f87171;
}
/* Hint inside a card (no outer margin) */
.ds-card .ds-hint {
  margin: 0; border-radius: 0; border-left: none; border-right: none;
  border-top: none; border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-card .ds-hint:last-child { border-bottom: none; }

/* ── STEP LIST ── */
.ds-steps { padding: 0 14px 14px; }
.ds-step {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 10px 0;
  border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-step:last-child { border-bottom: none; }
.ds-step-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(212,160,23,0.12);
  color: #d4a017; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.ds-step-text {
  font-size: 13px; color: #d1d5db; line-height: 1.5;
}

/* ── CTA BUTTON ── */
.ds-cta {
  display: block; width: 100%;
  background: #d4a017; border: none; border-radius: 12px;
  color: #0f0f14; font-size: 14px; font-weight: 700;
  padding: 14px; cursor: pointer; text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s;
  margin-bottom: 1rem;
  min-height: 48px; letter-spacing: 0.01em;
}
.ds-cta:active { transform: scale(0.98); }
.ds-cta:disabled { opacity: 0.4; cursor: default; }

/* ── STATUS BADGES ── */
.ds-badge-green {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(52,211,153,0.06); border: 0.5px solid rgba(52,211,153,0.15);
  border-radius: 8px; padding: 12px 16px;
  color: #34d399; font-size: 14px; font-weight: 500;
}
.ds-badge-red {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(239,68,68,0.06); border: 0.5px solid rgba(239,68,68,0.15);
  border-radius: 8px; padding: 12px 16px;
  color: #f87171; font-size: 14px; font-weight: 500;
}
.ds-badge-gold {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(212,160,23,0.06); border: 0.5px solid rgba(212,160,23,0.15);
  border-radius: 8px; padding: 12px 16px;
  color: #d4a017; font-size: 14px; font-weight: 500;
}

/* ── STEPPER INPUT (- value +) ── */
.ds-stepper {
  display: flex; align-items: center; gap: 0;
  border: 0.5px solid rgba(255,255,255,0.08); border-radius: 10px;
  overflow: hidden;
  height: 40px;
}
.ds-stepper-btn {
  width: 34px; height: 34px; flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: none;
  color: #9ca3af; font-size: 18px; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s, transform 0.1s;
  border-radius: 8px;
}
.ds-stepper-btn:active { background: rgba(212,160,23,0.12); transform: scale(0.94); }
.ds-stepper-val {
  flex: 1; text-align: center; background: transparent; border: none;
  color: #f9fafb; font-size: 16px; font-weight: 500; outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  border-left: 0.5px solid rgba(255,255,255,0.06);
  border-right: 0.5px solid rgba(255,255,255,0.06);
  -moz-appearance: textfield;
}
.ds-stepper-val::-webkit-inner-spin-button,
.ds-stepper-val::-webkit-outer-spin-button { -webkit-appearance: none; }

/* ── SELECT WITH ARROW ── */
.ds-select-wrap {
  position: relative; flex: 1; min-width: 0;
}
.ds-select-wrap select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  width: 100%; cursor: pointer; padding-right: 20px;
  -webkit-appearance: none; appearance: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  text-align: right;
}
.ds-select-wrap::after {
  content: '';
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #4b5563;
  pointer-events: none;
}
.ds-select-wrap select option { background: #17171f; color: #f9fafb; }

/* ── INLINE SELECT (right-aligned, with chevron) ── */
.ds-sel {
  position: relative; flex: 1; min-width: 0;
}
.ds-sel select {
  background: transparent; border: none; outline: none;
  color: #f9fafb; font-size: 15px; font-weight: 500;
  width: 100%; cursor: pointer; padding-right: 18px;
  -webkit-appearance: none; appearance: none;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  text-align: right;
}
.ds-sel::after {
  content: '';
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #4b5563;
  pointer-events: none;
}
.ds-sel select option { background: #17171f; color: #f9fafb; }

/* ── STATE TAX BADGE ── */
.ds-tax-badge {
  display: inline-flex; align-items: center;
  padding: 2px 7px; border-radius: 5px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.03em;
  margin-left: 6px; flex-shrink: 0;
}
.ds-tax-badge.free    { background: rgba(34,211,153,0.12);  border: 0.5px solid rgba(34,211,153,0.3);  color: #34d399; }
.ds-tax-badge.partial { background: rgba(212,160,23,0.12);  border: 0.5px solid rgba(212,160,23,0.3);  color: #d4a017; }
.ds-tax-badge.taxable { background: rgba(248,113,113,0.12); border: 0.5px solid rgba(248,113,113,0.3); color: #f87171; }

/* ── INFO ICON + TOOLTIP ── */
.ds-info-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(212,160,23,0.15); color: #d4a017;
  font-size: 9px; font-weight: 700;
  cursor: pointer; flex-shrink: 0; margin-left: 4px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.ds-tooltip {
  font-size: 11px; color: #9ca3af; line-height: 1.5;
  padding: 10px 14px 12px; background: rgba(212,160,23,0.04);
  border-top: 0.5px solid rgba(255,255,255,0.04);
}

/* ── DISCLAIMER BOX ── */
.ds-disclaimer {
  background: rgba(255,255,255,0.03); border-radius: 10px;
  padding: 14px 16px; font-size: 12px; color: #6b7280;
  line-height: 1.6; margin-bottom: 1.5rem;
  border: 0.5px solid rgba(255,255,255,0.04);
}

/* ── BREAK-EVEN CARD ── */
.ds-be {
  border-radius: 14px; padding: 20px 16px;
  text-align: center; margin-bottom: 1rem;
  border: 0.5px solid;
}
.ds-be.green {
  background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.15);
}
.ds-be.amber {
  background: rgba(212,160,23,0.06); border-color: rgba(212,160,23,0.15);
}
.ds-be.red {
  background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.15);
}
.ds-be-num {
  font-size: 48px; font-weight: 700; line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-be-num.green { color: #34d399; }
.ds-be-num.amber { color: #f0c14b; }
.ds-be-num.red   { color: #f87171; }
.ds-be-lbl {
  font-size: 13px; color: #6b7280; margin-top: 6px; line-height: 1.5;
}
.ds-be-note {
  font-size: 12px; font-weight: 600; margin-top: 8px;
}
.ds-be-note.green { color: #34d399; }
.ds-be-note.amber { color: #f0c14b; }

/* ── COMPARISON CARDS GRID ── */
.ds-compare-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  margin-bottom: 1rem;
}
@media (max-width: 360px) {
  .ds-compare-grid { grid-template-columns: 1fr; }
}
.ds-compare-card {
  background: #17171f; border-radius: 12px;
  border: 0.5px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.ds-compare-card-a { border-top: 3px solid #d4a017; }
.ds-compare-card-b { border-top: 3px solid #34d399; }
.ds-compare-ttl {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 12px 12px 0;
  margin-bottom: 10px; line-height: 1.4;
}
.ds-compare-ttl-a { color: #f0c14b; }
.ds-compare-ttl-b { color: #34d399; }
.ds-compare-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 5px 12px; border-bottom: 0.5px solid rgba(255,255,255,0.04);
}
.ds-compare-row:last-of-type { border-bottom: none; }
.ds-compare-rl { font-size: 11px; color: #6b7280; line-height: 1.4; min-width: 0; flex: 1; }
.ds-compare-rv {
  font-size: 12px; font-weight: 500; text-align: right;
  flex-shrink: 0; margin-left: 6px; color: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-compare-rv.pos { color: #34d399; }
.ds-compare-rv.neg { color: #f87171; }
.ds-compare-rv.mut { color: #6b7280; }
.ds-compare-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px 12px;
  border-top: 0.5px solid rgba(255,255,255,0.06);
  margin-top: 2px;
}
.ds-compare-total-l {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #6b7280;
}
.ds-compare-total-va { font-size: 17px; font-weight: 700; color: #f0c14b; }
.ds-compare-total-vb { font-size: 17px; font-weight: 700; color: #34d399; }

/* ── CHART CARD ── */
.ds-chart-card {
  background: #17171f; border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 16px 14px 12px;
  margin-bottom: 1rem;
}
.ds-chart-title {
  font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: #4b5563; margin-bottom: 10px;
}
.ds-chart-legend {
  display: flex; gap: 16px; margin-bottom: 10px;
  font-size: 11px; font-weight: 600; flex-wrap: wrap;
}

/* ── SHARE BUTTON ── */
.ds-share-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px;
  background: #d4a017;
  color: #0f0f14; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s; margin-bottom: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}
.ds-share-btn:active { transform: scale(0.98); }

/* ── PRESS STATES on tappable rows ── */
.ds-card .ds-field-row:active,
.ds-card .ds-income-row:active {
  background: rgba(255,255,255,0.02);
  transition: background 0.1s;
}
`;

// ── REACT COMPONENTS ───────────────────────────────────────────────────

/**
 * SummaryBar — gradient banner with headline amount + chips.
 * @param {string} label    — small uppercase eyebrow
 * @param {string} amount   — large number (pre-formatted) — Phase 1 take-home
 * @param {string} subtitle — small subtitle below amount
 * @param {string} at65     — optional Phase 2 amount shown as "At 65: $X/mo"
 * @param {Array}  chips    — [{label, value}]
 */
export function SummaryBar({ label, amount, subtitle, chips = [], at65 }) {
  return (
    <div className="ds-summary">
      <div className="ds-summary-eyebrow">{label}</div>
      <div className="ds-summary-amount">{amount}</div>
      {at65 && (
        <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 4, marginBottom: 2 }}>
          At 65:{" "}
          <span style={{ color: "#f9fafb", fontWeight: 600 }}>{at65}/mo</span>
          <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 6 }}>projected</span>
        </div>
      )}
      {subtitle && <div className="ds-summary-sub">{subtitle}</div>}
      {chips.length > 0 && (
        <div className="ds-summary-chips">
          {chips.map((c, i) => (
            <div key={i} className="ds-chip">
              <span className="ds-chip-label">{c.label}: </span>
              <span className="ds-chip-value" style={c.color ? { color: c.color } : undefined}>{c.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SectionHeader — uppercase label between card groups.
 */
export function SectionHeader({ children }) {
  return <div className="ds-section-hdr">{children}</div>;
}

/**
 * InfoCard — card container.
 * @param {string}     title    — optional card title row
 * @param {ReactNode}  children
 */
export function InfoCard({ title, children }) {
  return (
    <div className="ds-card">
      {title && <div className="ds-card-title">{title}</div>}
      {children}
    </div>
  );
}

/**
 * FieldRow — label-left, value/input-right row inside a card.
 * @param {string}    label     — field label (uppercase)
 * @param {ReactNode} children  — value or input element on the right
 */
export function FieldRow({ label, children }) {
  return (
    <div className="ds-field-row">
      <span className="ds-field-label">{label}</span>
      <div className="ds-field-value">{children}</div>
    </div>
  );
}

/**
 * ToggleGroup — a row of exclusive toggle buttons.
 * @param {Array}    options   — [{v, l}] or string[]
 * @param {*}        value     — current selected value
 * @param {Function} onChange  — called with new value
 * @param {string}   label     — optional label above buttons
 */
export function ToggleGroup({ options, value, onChange, label }) {
  return (
    <div className={`ds-tg${label ? " ds-tg-with-label" : ""}`}>
      {label && <span className="ds-field-label">{label}</span>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
        {options.map(o => {
          const v = typeof o === "object" ? o.v : o;
          const l = typeof o === "object" ? o.l : o;
          return (
            <button
              key={String(v)}
              className={`ds-tb${value === v ? " active" : ""}`}
              onClick={() => onChange(v)}
              type="button"
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SliderField — labeled slider with a gold/green badge showing current value.
 * @param {string}   label       — field label
 * @param {number}   value       — current value
 * @param {number}   min
 * @param {number}   max
 * @param {number}   step
 * @param {Function} onChange
 * @param {string}   badge       — text for the badge (pre-formatted)
 * @param {string}   badgeColor  — "gold" | "green"
 * @param {string}   minLabel    — left bound label
 * @param {string}   maxLabel    — right bound label
 */
export function SliderField({
  label, value, min, max, step = 1, onChange,
  badge, badgeColor = "gold", minLabel, maxLabel,
}) {
  return (
    <div className="ds-slider-row">
      <div className="ds-slider-head">
        <span className="ds-slider-lbl">{label}</span>
        {badge != null && (
          <span className={`ds-slider-badge${badgeColor === "green" ? " green" : ""}`}>
            {badge}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`ds-range${badgeColor === "green" ? " green" : ""}`}
      />
      {(minLabel || maxLabel) && (
        <div className="ds-slider-bounds">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * IncomeRow — label-left, colored value-right inside a card.
 * @param {string} label
 * @param {string} sub      — optional sub-label
 * @param {string} value
 * @param {string} color    — "gold"|"green"|"red"|"white"|"muted"
 */
export function IncomeRow({ label, sub, value, color = "white" }) {
  return (
    <div className="ds-income-row">
      <div>
        <div className="ds-income-lbl">{label}</div>
        {sub && <div className="ds-income-lbl-sub">{sub}</div>}
      </div>
      <span className={`ds-income-val ${color}`}>{value}</span>
    </div>
  );
}

/**
 * TotalRow — gold totals row at the bottom of a card.
 */
export function TotalRow({ label, value }) {
  return (
    <div className="ds-total-row">
      <span className="ds-total-lbl">{label}</span>
      <span className="ds-total-val">{value}</span>
    </div>
  );
}

/**
 * HintBox — left-border callout for tips/warnings.
 * @param {string}   variant  — "gold"|"green"|"red"
 * @param {ReactNode} children
 */
export function HintBox({ children, variant = "gold" }) {
  return (
    <div className={`ds-hint${variant !== "gold" ? ` ${variant}` : ""}`}>
      {children}
    </div>
  );
}

/**
 * StepList — numbered "next steps" list inside a card.
 * @param {string[]} steps
 */
export function StepList({ steps }) {
  return (
    <div className="ds-steps">
      {steps.map((step, i) => (
        <div key={i} className="ds-step">
          <div className="ds-step-num">{i + 1}</div>
          <div className="ds-step-text">{step}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * CTAButton — full-width gold action button.
 */
export function CTAButton({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      className="ds-cta"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * Stepper — "-  value  +" numeric input.
 */
export function Stepper({ value, onChange, min, max, step = 1, format }) {
  const dec = () => onChange(Math.max(min ?? -Infinity, value - step));
  const inc = () => onChange(Math.min(max ?? Infinity, value + step));
  return (
    <div className="ds-stepper">
      <button type="button" className="ds-stepper-btn" onClick={dec} aria-label="Decrease">−</button>
      <input
        type="number"
        className="ds-stepper-val"
        value={value}
        onChange={e => {
          const n = Number(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onFocus={e => setTimeout(() => e.target.select(), 0)}
        min={min} max={max}
      />
      <button type="button" className="ds-stepper-btn" onClick={inc} aria-label="Increase">+</button>
    </div>
  );
}

// ── DISCORD COMMUNITY LINK ────────────────────────────────────────────
// Single source of truth for the "Join The Debrief community" footer link.
// Rendered in every route's footer so the downloaded MilCalc.html always
// carries the Discord invite (previously it lived only on the unused
// LandingPage in App.jsx, which Rollup tree-shook out of the build).
export function DiscordLink({ marginTop = 8 }) {
  return (
    <div style={{ marginTop, fontSize: 12 }}>
      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
        style={{ color: "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 3 }}>
          <path fillRule="evenodd" d="M10 3.5c-4.14 0-7.5 2.46-7.5 5.5 0 1.43.74 2.73 1.96 3.71-.1.86-.45 1.62-.97 2.23-.14.16-.17.39-.09.59.08.2.27.33.49.33 1.3 0 2.5-.43 3.49-1.16.82.26 1.71.4 2.62.4 4.14 0 7.5-2.46 7.5-5.5S14.14 3.5 10 3.5z" clipRule="evenodd"/>
        </svg>
        Join The Debrief community
      </a>
    </div>
  );
}
