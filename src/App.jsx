import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { track, r100 } from "./analytics.js";
import { version as APP_VERSION } from "../package.json";
import { jsPDF } from "jspdf";

import {
  PAY2026, YOS_BREAKS, GRADE_LABELS, GRADE_GROUPS, VA, STATES, COL, MHA_CITIES,
  TAX_BRACKETS_2026, STANDARD_DEDUCTION_2026, FILING_STATUS_LABELS,
  TRICARE_PLANS, TRICARE_RS, TRICARE_TRR, VA_PRIORITY_GROUPS, VGLI_RATES,
  ELIG_TIERS, ENROLL_OPTS, GI_BILL_ONLINE_MHA, MGIB_AD, MGIB_SR, MGIB_ENROLL_OPTS,
  BAS_2026,
} from './lib/data.js';
import {
  lookupPay, calcVAComp, pension, pct, medicalPension, reservePension,
  pensionBySepType, reservePensionAmount, calcFederalTax, calcStateTax,
  getVAPriorityGroup, vgliRate, vgliMonthly, mgibMonthly,
  fmt, fmtYos, dk,
} from './lib/calc.js';

export const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700&family=Libre+Baskerville:wght@700&family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');`;
export const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b1120;--card:#111827;--sub:#111827;--ink:#cbd5e1;--mut:#6b7fa3;--fnt:#6b7fa3;
  --nv:#d4a017;--nvm:#f0c14b;--nvl:rgba(212,160,23,.12);
  --gn:#4ade80;--gnb:rgba(74,222,128,.12);--rd:#f87171;--rdb:rgba(248,113,113,.12);
  --gd:#d4a017;--gdb:rgba(212,160,23,.12);--br:rgba(255,255,255,0.1);--brm:rgba(255,255,255,0.1);
  --sh:56px;--tabh:64px;
  --safe-b:env(safe-area-inset-bottom,0px);
  --safe-t:env(safe-area-inset-top,0px);
}
html{-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--ink);font-family:Barlow,sans-serif;
  font-size:16px;line-height:1.5;overscroll-behavior-y:contain;
  -webkit-font-smoothing:antialiased}
html{background:var(--bg)}
::-webkit-scrollbar{width:0;height:0}
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .22s ease-out both}

/* ── TOP STATUS BAR ── */
.sb{position:fixed;top:0;left:0;right:0;
  height:calc(var(--sh) + var(--safe-t));padding-top:var(--safe-t);
  background:var(--sub);
  z-index:200;display:flex;align-items:center;justify-content:space-between;
  padding-left:16px;padding-right:16px;
  box-shadow:0 1px 8px rgba(0,0,0,.35);border-bottom:1px solid var(--br)}
.sb-left{display:flex;flex-direction:column;justify-content:center;min-width:0}
.sb-title{font-family:'Libre Baskerville',serif;font-size:11px;
  color:var(--nv);letter-spacing:.03em;line-height:1}
.sb-total{font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;
  color:var(--ink);line-height:1.2;letter-spacing:-.01em}
.sb-sub{font-size:10px;font-weight:600;color:var(--mut);
  letter-spacing:.06em;text-transform:uppercase;margin-top:1px}
.sb-right{display:flex;gap:14px;align-items:center}
.sb-pill{display:flex;flex-direction:column;align-items:flex-end;
  padding:5px 10px;border-radius:8px;min-width:68px}
.sb-pill-l{font-size:8px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;color:var(--mut);margin-bottom:1px}
.sb-pill-v{font-family:'IBM Plex Mono',monospace;font-size:15px;
  font-weight:600;color:var(--ink);white-space:nowrap;line-height:1.15}
.sb-pill-v.pos{color:var(--gn)}.sb-pill-v.warn{color:var(--nvm)}
.sb-pill-v.neg{color:var(--rd)}

/* ── BOTTOM TAB BAR ── */
.btabs{position:fixed;bottom:0;left:0;right:0;z-index:200;
  background:var(--sub);border-top:1px solid var(--br);
  padding-bottom:var(--safe-b)}
.btabs-scroll{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;
  scroll-snap-type:x proximity;scrollbar-width:none}
.btabs-scroll::-webkit-scrollbar{display:none}
.btab{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:3px;
  min-width:72px;width:72px;height:var(--tabh);
  border:none;background:none;cursor:pointer;
  font-family:Barlow,sans-serif;font-size:10px;font-weight:500;
  color:var(--mut);position:relative;
  -webkit-tap-highlight-color:transparent;
  transition:color .15s}
.btab:active{background:var(--sub)}
.btab.on{color:var(--nvm);font-weight:700}
.btab.on::after{content:'';position:absolute;top:0;left:50%;
  transform:translateX(-50%);width:32px;height:2.5px;
  background:var(--nv);border-radius:0 0 2px 2px}
.btab-ico{font-size:20px;line-height:1;height:22px;display:flex;align-items:center;justify-content:center}
.btab.on .btab-ico{transform:scale(1.1)}
.btab-dot{position:absolute;top:6px;right:14px;width:5px;height:5px;
  border-radius:50%;background:var(--gn)}

/* ── MAIN CONTENT ── */
.main{margin-top:calc(var(--sh) + var(--safe-t));
  padding:20px 16px calc(var(--tabh) + var(--safe-b) + 20px);
  max-width:600px;margin-left:auto;margin-right:auto}

/* ── SECTION HEAD ── */
.sh2{margin-bottom:20px}
.sh2 h2{font-family:'Libre Baskerville',serif;font-size:20px;color:var(--ink);
  margin-bottom:4px;line-height:1.3}
.sh2 p{font-size:14px;color:var(--mut);line-height:1.55}

/* ── CARD ── */
.card{background:var(--card);border:1px solid var(--br);border-radius:12px;
  padding:18px 16px;margin-bottom:14px}
.cttl{font-size:10px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;color:var(--fnt);margin-bottom:14px}

/* ── GRIDS — single column mobile-first ── */
.g2,.g23,.g3{display:grid;grid-template-columns:1fr;gap:14px}

/* ── FORM ── */
.field{margin-bottom:16px}.field:last-child{margin-bottom:0}
.flbl{display:block;font-size:12px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--mut);margin-bottom:6px}
.fhint{font-size:12px;color:var(--fnt);margin-top:5px;line-height:1.45}
.iwrap{position:relative;display:flex;align-items:center}
.ipre{position:absolute;left:14px;font-family:'IBM Plex Mono',monospace;
  font-size:16px;color:var(--mut);pointer-events:none;z-index:1}
.isuf{position:absolute;right:14px;font-size:13px;font-weight:600;
  color:var(--mut);pointer-events:none}
input.nf{width:100%;border:1.5px solid var(--br);border-radius:10px;
  padding:12px 14px;font-family:'IBM Plex Mono',monospace;font-size:16px;
  color:var(--ink);background:var(--bg);outline:none;
  min-height:48px;
  transition:border-color .13s,box-shadow .13s}
input.nf.pre{padding-left:28px}
input.nf.suf{padding-right:48px}
input.nf:focus{border-color:var(--nvm);box-shadow:0 0 0 3px rgba(194,120,42,.18)}
select{width:100%;border:1.5px solid var(--br);border-radius:10px;
  padding:12px 38px 12px 14px;font-family:Barlow,sans-serif;font-size:16px;
  color:var(--ink);background:var(--bg);outline:none;cursor:pointer;appearance:none;
  min-height:48px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a9ab5' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center;
  transition:border-color .13s}
select:focus{border-color:var(--nvm)}
.tg{display:flex;gap:6px;flex-wrap:wrap}
.tb{padding:10px 16px;border-radius:8px;border:1.5px solid var(--br);background:var(--bg);
  color:var(--mut);font-family:Barlow,sans-serif;font-size:14px;font-weight:500;
  cursor:pointer;transition:all .11s;min-height:44px;
  display:flex;align-items:center;justify-content:center}
.tb:active{transform:scale(.97)}
.tb.on{background:var(--nv);border-color:var(--nv);color:var(--ink)}

/* ── STATS ── */
.bsl{font-size:10px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;color:var(--fnt);margin-bottom:6px}
.bsv{font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:600;line-height:1}
.bss{font-size:12px;color:var(--mut);margin-top:5px}
.mt{background:var(--sub);border-radius:10px;padding:14px 16px}
.mtl{font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.08em;color:var(--fnt);margin-bottom:4px}
.mtv{font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:600}
.mts{font-size:11px;color:var(--fnt);margin-top:3px}

/* ── DATA ROWS ── */
.dr{display:flex;justify-content:space-between;align-items:flex-start;
  padding:11px 0;border-bottom:1px solid var(--br)}
.dr:last-child{border-bottom:none}
.drl{font-size:14px;color:var(--mut)}
.drs{font-size:11px;color:var(--fnt);margin-top:2px}
.drv{font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:500;
  text-align:right;flex-shrink:0;margin-left:12px}

/* ── INFO BOXES ── */
.ib{border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6}
.ib-gn{background:var(--gnb);border-left:3px solid var(--gn);color:var(--gn)}
.ib-gd{background:var(--gdb);border-left:3px solid var(--gd);color:#7A5208}
.ib-nv{background:var(--nvl);border-left:3px solid var(--nv);color:var(--nv)}
.ib-rd{background:var(--rdb);border-left:3px solid var(--rd);color:var(--rd)}

/* ── PROGRESS ── */
.pb{height:8px;background:var(--sub);border-radius:100px;overflow:hidden}
.pbf{height:100%;border-radius:100px;transition:width .45s ease-out}

/* ── TABLE ── */
.dt{width:100%;border-collapse:collapse;font-size:13px}
.dt th{text-align:left;font-size:9px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--fnt);padding:6px 8px;
  border-bottom:1px solid var(--br)}
.dt td{padding:8px 8px;border-bottom:1px solid var(--br);
  font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--ink)}
.dt tr:last-child td{border-bottom:none}
.dt tr.hi td{background:var(--sub);border-left:2px solid var(--nv)}
.dt tr.hi td:first-child{color:var(--nvm);font-weight:600}
hr{border:none;border-top:1px solid var(--br);margin:16px 0}
.chip{display:inline-block;padding:6px 12px;background:var(--sub);border-radius:6px;
  font-size:13px;color:var(--mut);cursor:pointer;transition:background .12s;
  margin:3px;min-height:36px;line-height:1.5}
.chip:active{background:var(--brm)}
.chip.g{background:var(--gnb);color:var(--gn)}

/* ── DEBRIEFED BRAND BADGE ── */
.db-badge{position:fixed;top:0;left:0;right:0;z-index:300;
  background:#0a0c0f;border-bottom:1px solid #2a3040;
  display:flex;align-items:center;justify-content:space-between;
  height:28px;padding:0 12px}
.db-home{background:none;border:none;cursor:pointer;
  font-family:Rajdhani,Inter,sans-serif;font-size:11px;font-weight:600;
  color:#8b919e;letter-spacing:.03em;padding:0;line-height:28px;
  white-space:nowrap;transition:color .15s}
.db-home:hover{color:#d4a84b}
.db-badge-center{display:flex;align-items:center;gap:6px;
  position:absolute;left:50%;transform:translateX(-50%)}
.db-badge-d{width:16px;height:16px;background:#d4a84b;border-radius:3px;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:10px;color:#0a0c0f;font-family:system-ui,sans-serif;line-height:1}
.db-badge-txt{font-family:Rajdhani,Inter,sans-serif;font-size:11px;font-weight:600;
  color:#8b919e;letter-spacing:.03em}
.db-badge-txt a{color:#d4a84b;text-decoration:none}
.db-badge-txt a:hover{text-decoration:underline}
.has-badge .sb{top:28px}
.has-badge .main{margin-top:calc(var(--sh) + var(--safe-t) + 28px)}

/* ── LANDING PAGE ── */
.lp{min-height:100vh;background:#0a0c0f;color:#e8eaed;
  font-family:Inter,Barlow,sans-serif;overflow-x:hidden}
.lp *{box-sizing:border-box}
.lp-nav{display:flex;align-items:center;justify-content:space-between;
  padding:20px 24px;max-width:1100px;margin:0 auto}
.lp-logo{display:flex;align-items:center;gap:10px}
.lp-logo-icon{width:32px;height:32px;background:#d4a84b;border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:18px;color:#0a0c0f;font-family:system-ui,sans-serif}
.lp-logo-name{font-family:Rajdhani,sans-serif;font-weight:700;font-size:22px;color:#e8eaed;letter-spacing:.02em}
.lp-nav-cta{background:#d4a84b;color:#0a0c0f;border:none;border-radius:8px;
  padding:10px 22px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:15px;
  cursor:pointer;transition:background .15s;letter-spacing:.02em}
.lp-nav-cta:hover{background:#e4bc5e}

.lp-hero{max-width:1100px;margin:0 auto;padding:60px 24px 40px;text-align:center}
.lp-hero-badge{display:inline-flex;align-items:center;gap:6px;
  background:rgba(212,168,75,.1);border:1px solid rgba(212,168,75,.2);
  border-radius:20px;padding:6px 16px;margin-bottom:24px;
  font-size:12px;color:#d4a84b;font-weight:600;letter-spacing:.04em}
.lp-hero h1{font-family:Rajdhani,sans-serif;font-weight:700;
  font-size:clamp(36px,6vw,64px);line-height:1.05;color:#e8eaed;margin-bottom:16px}
.lp-hero h1 span{color:#d4a84b}
.lp-hero-sub{font-size:clamp(16px,2.5vw,20px);color:#8b919e;line-height:1.6;
  max-width:560px;margin:0 auto 36px}
.lp-hero-cta{display:inline-flex;align-items:center;gap:8px;
  background:#d4a84b;color:#0a0c0f;border:none;border-radius:12px;
  padding:16px 36px;font-family:Rajdhani,sans-serif;font-weight:700;
  font-size:18px;cursor:pointer;transition:all .2s;letter-spacing:.02em}
.lp-hero-cta:hover{background:#e4bc5e;transform:translateY(-1px);
  box-shadow:0 8px 24px rgba(212,168,75,.25)}
.lp-hero-cta svg{width:20px;height:20px}

.lp-features{max-width:1100px;margin:0 auto;padding:40px 24px 60px;
  display:grid;grid-template-columns:1fr;gap:20px}
@media(min-width:640px){.lp-features{grid-template-columns:1fr 1fr;gap:24px}}
@media(min-width:900px){.lp-features{grid-template-columns:repeat(4,1fr)}}
.lp-feat{background:#1a1f2a;border:1px solid #2a3040;border-radius:14px;
  padding:28px 24px;transition:border-color .2s}
.lp-feat:hover{border-color:#d4a84b}
.lp-feat-ico{font-size:28px;margin-bottom:14px;display:block}
.lp-feat h3{font-family:Rajdhani,sans-serif;font-weight:700;font-size:18px;
  color:#e8eaed;margin-bottom:8px}
.lp-feat p{font-size:14px;color:#8b919e;line-height:1.6}

.lp-install{max-width:600px;margin:0 auto;padding:0 24px 40px;text-align:center}
.lp-install-card{background:#1a1f2a;border:1px solid #2a3040;border-radius:14px;
  padding:24px;display:flex;align-items:center;gap:16px;text-align:left}
.lp-install-ico{font-size:28px;flex-shrink:0}
.lp-install-txt h4{font-family:Rajdhani,sans-serif;font-weight:700;font-size:16px;
  color:#e8eaed;margin:0 0 4px}
.lp-install-txt p{font-size:13px;color:#8b919e;margin:0;line-height:1.5}
.lp-install-btn{background:#d4a84b;color:#0a0c0f;border:none;border-radius:8px;
  padding:10px 20px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:14px;
  cursor:pointer;flex-shrink:0;transition:background .15s}
.lp-install-btn:hover{background:#e4bc5e}

.lp-footer{border-top:1px solid #2a3040;padding:28px 24px;text-align:center;
  max-width:1100px;margin:0 auto}
.lp-footer p{font-size:13px;color:#5a6070;line-height:1.6}
.lp-footer a{color:#d4a84b;text-decoration:none}
.lp-footer a:hover{text-decoration:underline}

/* ── DESKTOP BREAKPOINT ── */
@media(min-width:768px){
  .main{padding:28px 32px calc(var(--tabh) + var(--safe-b) + 28px);max-width:720px}
  .g2{grid-template-columns:1fr 1fr}
  .g23{grid-template-columns:2fr 3fr}
  .g3{grid-template-columns:1fr 1fr 1fr}
  .bsv{font-size:34px}
  .btab{min-width:80px;width:auto;padding:0 6px}
}

/* ── LARGE DESKTOP ── */
@media(min-width:1024px){
  .main{max-width:1060px;padding:32px 40px calc(var(--tabh) + var(--safe-b) + 32px)}
  .sb{max-width:1060px;left:50%;transform:translateX(-50%);border-radius:0 0 12px 12px}
  .has-badge .sb{max-width:1060px;left:50%;transform:translateX(-50%)}
  .btabs{max-width:600px;left:50%;transform:translateX(-50%);
    border-radius:12px 12px 0 0;border-left:1px solid var(--br);border-right:1px solid var(--br)}
  .card{padding:24px 28px}
  .sh2 h2{font-size:24px}
  .modal-body{max-width:720px}
  .info-sheet{max-width:540px}
  .dt{font-size:14px}
  .dt td{padding:10px 12px}
  .dt th{padding:8px 12px;font-size:10px}
}

/* ── DESKTOP DASHBOARD LAYOUT ── */
@media(min-width:900px){
  .dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
  .dash-grid>.card{margin-bottom:0}
  .dash-full{grid-column:1/-1}
}

/* ── INFO BUTTON ── */
.info-btn{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--br);
  background:transparent;color:var(--mut);font-size:18px;font-weight:600;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .15s;-webkit-tap-highlight-color:transparent;flex-shrink:0}
.info-btn:active{background:var(--nvl);border-color:var(--nv);color:var(--nvm)}

/* ── INFO MENU OVERLAY ── */
.info-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;
  justify-content:center;background:rgba(0,0,0,.55);animation:fo .18s ease-out}
@keyframes fo{from{opacity:0}to{opacity:1}}
.info-sheet{background:var(--card);border-radius:16px 16px 0 0;width:100%;
  max-width:480px;padding:24px 20px calc(20px + var(--safe-b));
  animation:fsu .22s ease-out}
@keyframes fsu{from{transform:translateY(100%)}to{transform:translateY(0)}}
.info-sheet-title{font-family:'Barlow Condensed',sans-serif;font-size:14px;
  font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);
  margin-bottom:16px}
.info-sheet-btn{display:flex;align-items:center;gap:14px;width:100%;
  padding:16px;border-radius:10px;border:1px solid var(--br);background:var(--bg);
  color:var(--ink);font-family:Barlow,sans-serif;font-size:16px;font-weight:500;
  cursor:pointer;margin-bottom:10px;transition:border-color .13s;
  -webkit-tap-highlight-color:transparent}
.info-sheet-btn:active{border-color:var(--nv)}
.info-sheet-btn span:first-child{font-size:20px;width:28px;text-align:center}
.info-sheet-cancel{display:block;width:100%;padding:14px;border:none;
  background:transparent;color:var(--mut);font-family:Barlow,sans-serif;
  font-size:15px;font-weight:600;cursor:pointer;margin-top:6px}

/* ── MODAL SCREEN (Support / Privacy) ── */
.modal-screen{position:fixed;inset:0;z-index:600;background:var(--bg);
  overflow-y:auto;-webkit-overflow-scrolling:touch;animation:fu .22s ease-out both}
.modal-hdr{position:sticky;top:0;z-index:10;background:var(--bg);
  display:flex;align-items:center;gap:12px;padding:16px;
  border-bottom:1px solid var(--br)}
.modal-back{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--br);
  background:transparent;color:var(--ink);font-size:20px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  -webkit-tap-highlight-color:transparent}
.modal-back:active{background:var(--nvl);border-color:var(--nv)}
.modal-htxt{font-family:'Barlow Condensed',sans-serif;font-size:18px;
  font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink)}
.modal-body{padding:20px 16px 40px;max-width:600px;margin:0 auto}

/* ── SUPPORT SCREEN ── */
.sup-hero{margin-bottom:28px}
.sup-hero h2{font-family:'Libre Baskerville',serif;font-size:22px;color:var(--ink);
  margin-bottom:6px}
.sup-hero p{font-size:14px;color:var(--mut);line-height:1.55}
.sup-contact{background:var(--card);border:1px solid var(--br);border-radius:12px;
  padding:20px 16px;margin-bottom:28px}
.sup-contact-lbl{font-size:10px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;color:var(--nvm);margin-bottom:10px}
.sup-contact-email{font-family:'IBM Plex Mono',monospace;font-size:15px;
  color:var(--ink);margin-bottom:4px}
.sup-contact-note{font-size:12px;color:var(--mut);margin-bottom:14px}
.sup-contact-btn{display:block;width:100%;padding:14px;border:none;border-radius:10px;
  background:var(--nv);color:var(--ink);font-family:'Barlow Condensed',sans-serif;
  font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  cursor:pointer;text-align:center;text-decoration:none;
  transition:opacity .13s;-webkit-tap-highlight-color:transparent}
.sup-contact-btn:active{opacity:.8}
.faq-title{font-size:10px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;color:var(--nvm);margin-bottom:14px}
.faq-item{border-bottom:1px solid var(--br)}
.faq-q{display:flex;align-items:center;justify-content:space-between;gap:12px;
  width:100%;padding:16px 0;border:none;background:none;cursor:pointer;
  text-align:left;font-family:Barlow,sans-serif;font-size:15px;font-weight:600;
  color:var(--ink);-webkit-tap-highlight-color:transparent}
.faq-q span:last-child{font-size:18px;color:var(--nvm);flex-shrink:0;
  transition:transform .2s}
.faq-q.open span:last-child{transform:rotate(45deg)}
.faq-a{padding:0 0 16px;font-size:14px;color:var(--mut);line-height:1.65;
  animation:fu .18s ease-out both}

/* ── PRIVACY SCREEN ── */
.prv-callout{background:var(--nvl);border:1px solid rgba(194,120,42,.25);
  border-radius:12px;padding:18px 16px;margin-bottom:28px;
  font-size:14px;color:var(--nvm);line-height:1.65;font-weight:500}
.prv-section{margin-bottom:24px;padding-bottom:24px;
  border-bottom:1px solid rgba(194,120,42,.12)}
.prv-section:last-of-type{border-bottom:none}
.prv-num{font-size:10px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;color:var(--nvm);margin-bottom:6px}
.prv-h{font-family:'Barlow Condensed',sans-serif;font-size:17px;
  font-weight:700;color:var(--ink);margin-bottom:8px}
.prv-p{font-size:14px;color:var(--mut);line-height:1.65}
.prv-ul{font-size:14px;color:var(--mut);line-height:1.65;
  padding-left:18px;margin-top:6px}
.prv-ul li{margin-bottom:4px}
.modal-footer{margin-top:32px;padding-top:20px;border-top:1px solid var(--br);
  text-align:center}
.modal-footer p{font-size:12px;color:var(--fnt);line-height:1.6;margin-bottom:4px}

/* ── FEEDBACK FORM ── */
.fb-form{background:var(--card);border:1px solid var(--br);border-radius:12px;
  padding:20px 16px;margin-bottom:28px}
.fb-label{display:block;font-size:12px;font-weight:600;color:var(--ink);
  margin-bottom:6px;margin-top:14px}
.fb-label:first-child{margin-top:0}
.fb-label .opt{font-weight:400;color:var(--mut);font-size:11px;margin-left:4px}
.fb-select,.fb-input,.fb-textarea{display:block;width:100%;padding:12px;
  border:1px solid var(--br);border-radius:8px;background:var(--bg);
  color:var(--ink);font-family:Barlow,sans-serif;font-size:14px;
  -webkit-appearance:none;appearance:none;transition:border-color .13s;box-sizing:border-box}
.fb-select:focus,.fb-input:focus,.fb-textarea:focus{outline:none;border-color:var(--nv)}
.fb-textarea{min-height:100px;resize:vertical;line-height:1.5}
.fb-submit{display:block;width:100%;padding:14px;border:none;border-radius:10px;
  background:var(--nv);color:var(--ink);font-family:'Barlow Condensed',sans-serif;
  font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  cursor:pointer;margin-top:18px;transition:opacity .13s;
  -webkit-tap-highlight-color:transparent}
.fb-submit:active{opacity:.8}
.fb-submit:disabled{opacity:.4;cursor:default}
.fb-success{text-align:center;padding:28px 16px;color:var(--gn);font-weight:600;font-size:15px}

/* ── ENGAGEMENT POPUP ── */
.ep-overlay{position:fixed;inset:0;z-index:700;display:flex;align-items:center;
  justify-content:center;padding:20px;backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);background:rgba(10,14,26,.65);
  animation:ep-in .25s ease-out both}
@keyframes ep-in{from{opacity:0}to{opacity:1}}
.ep-modal{background:#1a2640;border:1px solid rgba(194,120,42,.35);
  border-radius:18px;width:100%;max-width:380px;padding:32px 24px 24px;
  box-shadow:0 12px 40px rgba(0,0,0,.5);animation:ep-slide .3s ease-out both}
@keyframes ep-slide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.ep-title{font-family:'Libre Baskerville',serif;font-size:22px;color:var(--ink);
  text-align:center;margin-bottom:20px;line-height:1.3}
.ep-options{display:flex;flex-direction:column;gap:10px}
.ep-opt{display:flex;align-items:center;gap:14px;width:100%;padding:16px;
  border:1px solid var(--br);border-radius:12px;background:rgba(31,45,69,.6);
  color:var(--ink);font-family:Barlow,sans-serif;font-size:15px;font-weight:600;
  cursor:pointer;text-decoration:none;transition:border-color .15s,background .15s;
  -webkit-tap-highlight-color:transparent}
.ep-opt:hover,.ep-opt:active{border-color:var(--nv);background:var(--nvl)}
.ep-opt-ico{font-size:22px;width:32px;text-align:center;flex-shrink:0}
.ep-dismiss{display:block;width:100%;margin-top:18px;padding:10px;border:none;
  background:transparent;color:var(--mut);font-family:Barlow,sans-serif;
  font-size:13px;cursor:pointer;text-align:center}
.ep-dismiss:active{color:var(--ink)}

/* ── SHARE PAGE ── */
.share-page{min-height:100vh;min-height:100dvh;background:#0A0E1A;color:#F0F4F8;
  display:flex;flex-direction:column;align-items:center;padding:0 16px 48px}
.share-back{align-self:flex-start;padding:16px 0;font-size:14px;color:#7A8AA0;
  background:none;border:none;cursor:pointer;font-family:'Barlow',sans-serif;font-weight:600}
.share-back:active{opacity:.7}
.share-hero{text-align:center;max-width:480px;margin:32px auto 28px}
.share-hero h1{font-family:'Libre Baskerville',serif;font-size:28px;color:#F0F4F8;
  margin:0 0 10px;line-height:1.2}
.share-hero p{font-size:15px;color:#7A8AA0;line-height:1.55;margin:0}
.share-flow{max-width:480px;width:100%}
.share-input{width:100%;padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:10px;
  background:#1A2236;color:#F0F4F8;font-size:16px;font-family:'Barlow',sans-serif;
  outline:none;box-sizing:border-box;transition:border-color .15s}
.share-input:focus{border-color:#C9913A}
.share-input::placeholder{color:#7A8AA0}
.share-link-box{margin-top:20px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:12px;
  background:#141C2E;text-align:center}
.share-link-url{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#C9913A;
  word-break:break-all;line-height:1.5;margin-bottom:14px}
.share-copy-big{display:block;width:100%;padding:14px 0;border:none;border-radius:10px;
  background:#C9913A;color:#0A0E1A;font-family:'Barlow Condensed',sans-serif;
  font-size:16px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  cursor:pointer;transition:background .13s}
.share-copy-big:active{background:#E4A94A}
.share-qr{display:flex;justify-content:center;margin-top:24px;padding:16px;
  background:#fff;border-radius:10px;width:fit-content;margin-left:auto;margin-right:auto;
  outline:1px solid rgba(255,255,255,.08);outline-offset:6px}
.share-btns{display:flex;gap:0;margin-top:28px;justify-content:center;
  border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden}
.share-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:12px 8px;border:none;border-right:1px solid rgba(255,255,255,.08);
  background:#141C2E;color:#F0F4F8;font-family:'Barlow',sans-serif;
  font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;
  transition:background .13s;-webkit-tap-highlight-color:transparent}
.share-btn:last-child{border-right:none}
.share-btn:active,.share-btn:hover{background:#1A2236}
.share-org-toggle{margin-top:36px;display:flex;align-items:center;justify-content:center;
  gap:6px;background:none;border:none;color:#7A8AA0;font-family:'Barlow',sans-serif;
  font-size:13px;font-weight:600;cursor:pointer;padding:8px 0;width:100%}
.share-org-toggle:active{opacity:.7}
.share-org-toggle svg{transition:transform .2s}
.share-org-section{max-width:480px;width:100%;margin-top:16px;padding:20px;
  background:#141C2E;border:1px solid rgba(255,255,255,.08);border-radius:12px}
.share-org-section p{font-size:13px;color:#7A8AA0;line-height:1.5;margin:0 0 14px}
.share-orgs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.share-org{padding:7px 14px;border:1px solid rgba(255,255,255,.08);border-radius:20px;
  background:transparent;font-size:13px;color:#7A8AA0;font-weight:500;
  cursor:pointer;transition:border-color .13s,background .13s;font-family:'Barlow',sans-serif;
  -webkit-tap-highlight-color:transparent}
.share-org:active,.share-org.on{border-color:#C9913A;background:rgba(201,145,58,.1);color:#F0F4F8}
.share-org-url{margin-top:10px}
.share-org-url .share-link-url{font-size:12px;margin-bottom:10px}
.share-blurb{background:#1A2236;border:1px solid rgba(255,255,255,.08);border-radius:10px;
  padding:14px;font-size:13px;color:#7A8AA0;line-height:1.6;font-style:italic;
  margin-top:14px}
.share-footer{margin-top:40px;text-align:center;font-size:12px;color:#7A8AA0}
.share-footer a{color:#C9913A;text-decoration:none}

/* ── STAY VS GO TAB ── */
.svgc-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
@media(max-width:400px){.svgc-cards{grid-template-columns:1fr}}
.svgc-card{background:var(--card);border:1px solid var(--br);border-radius:12px;padding:16px 14px}
.svgc-card-a{border-top:3px solid var(--nv)}
.svgc-card-b{border-top:3px solid var(--gn)}
.svgc-ttl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;line-height:1.4}
.svgc-ttl-a{color:var(--nvm)}.svgc-ttl-b{color:var(--gn)}
.svgc-row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--br)}
.svgc-rl{font-size:12px;color:var(--mut);line-height:1.4;min-width:0;flex:1}
.svgc-rv{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;text-align:right;flex-shrink:0;margin-left:8px}
.svgc-total{padding:10px 0;margin-top:10px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--br)}
.svgc-total-l{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.svgc-total-v{font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:700}
.svgc-total-a .svgc-total-v{color:var(--nvm)}.svgc-total-b .svgc-total-v{color:var(--gn)}
.svgc-be{text-align:center;padding:18px 16px;border-radius:12px}
.svgc-be.gn{background:var(--gnb);border:1px solid var(--gn)}
.svgc-be.am{background:var(--gdb);border:1px solid var(--gd)}
.svgc-be.rd{background:var(--rdb);border:1px solid var(--rd)}
.svgc-be-num{font-family:'IBM Plex Mono',monospace;font-size:48px;font-weight:700;line-height:1}
.svgc-be-lbl{font-size:13px;color:var(--mut);margin-top:4px;line-height:1.5}
`;

// ── DEBRIEFED CTA CARDS ───────────────────────────────────────────────
const DEBRIEFED_TEXTURE = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fbbf24' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`;

function DebriefedGapCard({ gap }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ background:"#1a2744", backgroundImage:DEBRIEFED_TEXTURE, borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", fontFamily:"'Barlow',sans-serif", margin:"16px 0" }}>
      <div style={{ fontFamily:"'Barlow Condensed'", fontWeight:700, fontSize:11, letterSpacing:2, color:"#d4a017", textTransform:"uppercase", marginBottom:8 }}>BUILT BY VETERANS</div>
      <div style={{ fontFamily:"'Bebas Neue'", fontSize:30, color:"#fff", lineHeight:1.05, marginBottom:10 }}>Got a ${Math.round(gap).toLocaleString()}/mo gap to close?</div>
      <div style={{ fontSize:15, color:"rgba(255,255,255,0.7)", lineHeight:1.55, marginBottom:20 }}>Debriefed translates your military experience into civilian career terms — helping you find roles that match your skills and close the gap.</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        {["Free to start","Resume translation","Job matching"].map(p=>(
          <div key={p} style={{ background:"rgba(212,160,23,0.12)", border:"1px solid rgba(212,160,23,0.25)", borderRadius:20, padding:"4px 10px", fontSize:12, color:"#d4a017", fontFamily:"'Barlow Condensed'", fontWeight:600 }}>✓ {p}</div>
        ))}
      </div>
      <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer"
        onMouseEnter={()=>hov||setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ display:"block", background:hov?"#f0c14b":"#d4a017", color:"#0a1628", borderRadius:12, padding:"13px 24px", fontFamily:"'Barlow Condensed'", fontWeight:700, fontSize:16, textAlign:"center", cursor:"pointer", transition:"all 0.2s ease", textDecoration:"none" }}>
        Try Debriefed Free →
      </a>
      <div style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:10 }}>No credit card required</div>
    </div>
  );
}

function DebriefedGeneralCard() {
  const [hov1, setHov1] = useState(false);
  const [hov2, setHov2] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ background:"#1a2744", backgroundImage:DEBRIEFED_TEXTURE, borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", fontFamily:"'Barlow',sans-serif", position:"relative", margin:"16px 0" }}>
      <button onClick={()=>setDismissed(true)} style={{ position:"absolute", top:12, right:14, background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:20, cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
      <div style={{ fontFamily:"'Barlow Condensed'", fontWeight:700, fontSize:11, letterSpacing:2, color:"#d4a017", textTransform:"uppercase", marginBottom:8 }}>BUILT BY VETERANS</div>
      <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, color:"#fff", lineHeight:1.05, marginBottom:10 }}>Your service, translated.</div>
      <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)", lineHeight:1.55, marginBottom:20 }}>Transitioning soon? Debriefed helps you turn your MOS, rank, and years of service into a civilian career — free to start.</div>
      <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer"
        onMouseEnter={()=>setHov1(true)} onMouseLeave={()=>setHov1(false)}
        style={{ display:"block", background:hov1?"#f0c14b":"#d4a017", color:"#0a1628", borderRadius:12, padding:"13px 24px", fontFamily:"'Barlow Condensed'", fontWeight:700, fontSize:15, textAlign:"center", cursor:"pointer", transition:"all 0.2s ease", textDecoration:"none" }}>
        Try Debriefed Free →
      </a>
      <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer"
        onMouseEnter={()=>setHov2(true)} onMouseLeave={()=>setHov2(false)}
        style={{ display:"block", background:hov2?"#243a5f":"#1e3a5f", color:"#d3d3d3", borderRadius:12, padding:"12px 24px", fontFamily:"'Barlow Condensed'", fontWeight:600, fontSize:14, textAlign:"center", cursor:"pointer", transition:"all 0.2s ease", textDecoration:"none", marginTop:8 }}>
        Learn more
      </a>
      <div style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:10 }}>No credit card required</div>
    </div>
  );
}

// ── LANDING PAGE ────────────────────────────────────────────────────────
function LandingPage({onEnter}){
  const [installPrompt,setInstallPrompt]=useState(null);
  const [showInstallNudge,setShowInstallNudge]=useState(false);

  useEffect(()=>{
    track("Page Viewed",{page:"Landing"});
    const handler=e=>{e.preventDefault();setInstallPrompt(e);setShowInstallNudge(true);};
    window.addEventListener('beforeinstallprompt',handler);
    // iOS detection — no beforeinstallprompt event
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
    const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(isIOS&&!isStandalone) setShowInstallNudge(true);
    return ()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  const handleInstall=async()=>{
    if(installPrompt){
      track("PWA Install Prompted",{});
      installPrompt.prompt();
      const choice=await installPrompt.userChoice;
      if(choice.outcome==="accepted") track("PWA Installed",{});
      setInstallPrompt(null);
    }
  };

  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;

  return(
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-logo">
          <div className="lp-logo-icon">M</div>
          <div className="lp-logo-name">MilCalc</div>
        </div>
        <button className="lp-nav-cta" onClick={()=>{track("CTA Clicked",{location:"nav"});onEnter();}}>Open Calculator</button>
      </nav>

      <div className="lp-hero">
        <div className="lp-hero-badge">
          <span style={{width:14,height:14,background:'#d4a84b',borderRadius:3,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#0a0c0f'}}>D</span>
          Part of the Debriefed product family
        </div>
        <h1>Your military retirement,<br/><span>fully decoded.</span></h1>
        <p className="lp-hero-sub">Pension, VA disability, TRICARE, GI Bill, taxes, and income gap analysis — all in one calculator built by veterans, for veterans.</p>
        <button className="lp-hero-cta" onClick={()=>{track("CTA Clicked",{location:"hero"});onEnter();}}>
          Open Calculator
          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"/></svg>
        </button>
      </div>

      <div className="lp-features">
        <div className="lp-feat">
          <span className="lp-feat-ico">{"\u{1F3D6}"}</span>
          <h3>Pension Calculator</h3>
          <p>High-3, BRS, REDUX, medical retirement, and Reserve/Guard points-based pension with SBP analysis.</p>
        </div>
        <div className="lp-feat">
          <span className="lp-feat-ico">{"\u{1FA96}"}</span>
          <h3>VA Disability</h3>
          <p>2026 VA compensation rates, CRDP/CRSC eligibility, and tax-equivalent value.</p>
        </div>
        <div className="lp-feat">
          <span className="lp-feat-ico">{"\u{1F4CA}"}</span>
          <h3>Tax Planning</h3>
          <p>Federal tax estimates, state military retirement exemptions for all 50 states, and long-term tax impact analysis.</p>
        </div>
        <div className="lp-feat">
          <span className="lp-feat-ico">{"\u{1F4B0}"}</span>
          <h3>Income Gap</h3>
          <p>See how your benefits stack up against your target income. Get salary benchmarks and GS pay grade references.</p>
        </div>
      </div>

      {showInstallNudge&&(
        <div className="lp-install">
          <div className="lp-install-card">
            <div className="lp-install-ico">{"\u{1F4F1}"}</div>
            <div className="lp-install-txt">
              <h4>Add to Home Screen</h4>
              <p>{isIOS
                ?"Tap the share button, then \"Add to Home Screen\" for the best experience."
                :"Install MilCalc for instant access — works offline."
              }</p>
            </div>
            {installPrompt&&<button className="lp-install-btn" onClick={()=>{track("Add to Home Screen Tapped",{});handleInstall();}}>Install</button>}
          </div>
        </div>
      )}

      <footer className="lp-footer">
        <p><a href="/share">Share MilCalc</a></p>
        <p style={{marginTop:8}}>Part of the <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer">Debriefed</a> product family.  Built by veterans, for veterans.</p>
        <p style={{marginTop:8}}>Not affiliated with DoD, DFAS, VA, or any government agency. All calculations are estimates.</p>
      </footer>
    </div>
  );
}

// ── ATOMS ──────────────────────────────────────────────────────────────
const C={green:"var(--gn)",red:"var(--rd)",navy:"var(--nvm)",gold:"var(--nvm)",ink:"var(--ink)"};

function NF({label,value,onChange,min,max,step=1,pre,suf,hint,warn}){
  const [local,setLocal]=useState(String(value));
  const [focused,setFocused]=useState(false);
  const prevVal=useRef(value);
  // Sync local display when value changes externally (e.g. +/- buttons, reset)
  useEffect(()=>{if(!focused&&value!==prevVal.current){setLocal(String(value));prevVal.current=value;}},[value,focused]);
  const parse=s=>{const v=String(s).replace(/[$,\s]/g,"");if(v===""||v==="-"||v===".") return null;const n=Number(v);return isNaN(n)||!isFinite(n)?null:n;};
  const clamp=n=>{let c=n;if(min!=null)c=Math.max(min,c);if(max!=null)c=Math.min(max,c);return c;};
  const commit=s=>{const n=parse(s);if(n===null){const fallback=min!=null?Math.max(min,0):0;onChange(fallback);setLocal(String(fallback));return;}
    const c=clamp(n);onChange(c);setLocal(String(c));};
  const dec=()=>{const n=clamp((parse(local)??value)-step);onChange(n);setLocal(String(n));};
  const inc=()=>{const n=clamp((parse(local)??value)+step);onChange(n);setLocal(String(n));};
  const btnS={flex:"0 0 48px",height:48,border:"1.5px solid var(--br)",background:"var(--bg)",
    color:"var(--nvm)",fontSize:22,fontWeight:600,fontFamily:"Barlow,sans-serif",
    cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
    WebkitTapHighlightColor:"transparent"};
  return(
    <div className="field">
      {label&&<label className="flbl">{label}</label>}
      <div style={{display:"flex",gap:0}}>
        <button type="button" onClick={dec} style={{...btnS,borderRadius:"10px 0 0 10px",borderRight:"none"}}
          aria-label="Decrease">-</button>
        <div className="iwrap" style={{flex:1,minWidth:0}}>
          {pre&&<span className="ipre">{pre}</span>}
          <input type="text" inputMode={step%1!==0?"decimal":"numeric"}
            value={focused?local:(pre==="$"?Math.round(value).toLocaleString("en-US"):String(value))}
            className={"nf"+(pre?" pre":"")+(suf?" suf":"")}
            style={{borderRadius:0,textAlign:"center"}}
            onFocus={e=>{setFocused(true);setLocal(String(value));setTimeout(()=>e.target.select(),0);}}
            onChange={e=>setLocal(e.target.value)}
            onBlur={e=>{setFocused(false);commit(e.target.value);}}
            onKeyDown={e=>{if(e.key==="Enter"){e.target.blur();}}}/>
          {suf&&<span className="isuf">{suf}</span>}
        </div>
        <button type="button" onClick={inc} style={{...btnS,borderRadius:"0 10px 10px 0",borderLeft:"none"}}
          aria-label="Increase">+</button>
      </div>
      {hint&&<div className="fhint">{hint}</div>}
      {warn&&<div className="fhint" style={{color:"var(--gd)"}}>{warn}</div>}
    </div>
  );
}

function SF({label,value,onChange,options,hint}){
  return(
    <div className="field">
      {label&&<label className="flbl">{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{fontSize:16,minHeight:48}}>
        {options.map(o=>{const v=typeof o==="object"?o.v:o,l=typeof o==="object"?o.l:o;return <option key={v} value={v}>{l}</option>;})}
      </select>
      {hint&&<div className="fhint">{hint}</div>}
    </div>
  );
}

function TG({label,value,onChange,options,hint}){
  return(
    <div className="field">
      {label&&<label className="flbl">{label}</label>}
      <div className="tg" style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(options.length,3)},1fr)`,gap:6}}>
        {options.map(o=>{const v=typeof o==="object"?o.v:o,l=typeof o==="object"?o.l:o;
          return <button key={v} className={"tb"+(value===v?" on":"")}
            style={{width:"100%",fontSize:14,padding:"12px 8px"}}
            onClick={()=>onChange(v)}>{l}</button>;
        })}
      </div>
      {hint&&<div className="fhint">{hint}</div>}
    </div>
  );
}

function BStat({label,value,sub,color}){
  return(
    <div>
      <div className="bsl">{label}</div>
      <div className="bsv" style={{color:C[color]||C.ink}}>{value}</div>
      {sub&&<div className="bss">{sub}</div>}
    </div>
  );
}

function MT({label,value,sub,color}){
  return(
    <div className="mt">
      <div className="mtl">{label}</div>
      <div className="mtv" style={{color:C[color]||C.ink}}>{value}</div>
      {sub&&<div className="mts">{sub}</div>}
    </div>
  );
}

function DR({label,value,sub,color}){
  return(
    <div className="dr">
      <div><div className="drl">{label}</div>{sub&&<div className="drs">{sub}</div>}</div>
      <div className="drv" style={{color:C[color]||C.ink}}>{value}</div>
    </div>
  );
}

function PBar({value,max,color="var(--nv)"}){
  const pct2=max>0?Math.min(100,Math.max(0,(value/(max||1))*100)):0;
  return <div className="pb"><div className="pbf" style={{width:`${pct2}%`,background:color}}/></div>;
}

// ── COLLAPSIBLE DETAIL TOGGLE ──────────────────────────────────────────
function Reveal({label,children}){
  const [open,setOpen]=useState(false);
  return(
    <div style={{marginTop:12}}>
      <button type="button" onClick={()=>setOpen(!open)}
        style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
          cursor:"pointer",fontFamily:"Barlow,sans-serif",fontSize:13,fontWeight:600,
          color:"var(--nvm)",padding:"8px 0",WebkitTapHighlightColor:"transparent"}}>
        <span style={{transform:open?"rotate(90deg)":"rotate(0)",transition:"transform .15s",fontSize:11}}>&#9654;</span>
        {label}
      </button>
      {open&&<div style={{animation:"fu .18s ease-out both"}}>{children}</div>}
    </div>
  );
}

// ── STAY VS GO: PROJECT TSP BALANCE ───────────────────────────────────
// Compound monthly at rate (default 7% annual), then grow-only phase
function pTspBal(initBal, monthlyContrib, contribYrs, growthYrs, rate=0.07) {
  const mr = rate / 12;
  let b = Math.max(0, initBal);
  const cm = Math.round(Math.max(0, contribYrs) * 12);
  for (let i = 0; i < cm; i++) b = b * (1 + mr) + monthlyContrib;
  if (growthYrs > 0) b *= Math.pow(1 + rate, growthYrs);
  return Math.max(0, b);
}

function pTspBalStepped(initBal, payGrade, startYos, endYos, tspPct, isBRS, growthYrs, rate=0.07) {
  const mr = rate / 12;
  let b = Math.max(0, initBal);
  for (let yos = startYos; yos < endYos; yos++) {
    const bp = lookupPay(payGrade, yos) || lookupPay(payGrade, startYos) || 5000;
    const memberAmt = bp * (tspPct / 100);
    const autoAmt   = isBRS ? bp * 0.01 : 0;
    const matchT1   = isBRS ? Math.min(memberAmt, bp * 0.03) : 0;
    const matchT2   = isBRS ? Math.min(Math.max(0, memberAmt - bp * 0.03), bp * 0.02) * 0.5 : 0;
    const contrib   = memberAmt + autoAmt + matchT1 + matchT2;
    for (let m = 0; m < 12; m++) b = b * (1 + mr) + contrib;
  }
  if (growthYrs > 0) b *= Math.pow(1 + rate, growthYrs);
  return Math.max(0, b);
}

// ── TAB 1: DASHBOARD (pure output — home screen) ──────────────────────
function UnconfiguredBanner({go}){
  return(
    <div onClick={()=>go("myinfo")} style={{background:"var(--gnb)",border:"1px solid var(--gn)",borderRadius:10,padding:"12px 16px",marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:13,color:"var(--ink)"}}>Using default values — <strong>tap My Info</strong> to enter your numbers.</span>
      <span style={{fontSize:16,color:"var(--gn)"}}>&#8594;</span>
    </div>
  );
}

function DashboardTab({state,set,isConfigured,go,onPdfExported,modalActive}){
  const {userName,separationType,retType,yos,high3,usePayGrade,payGrade,vaRating,vaDeps,vaChildren,sbp,sbpCoverage,
         selectedState,desiredIncome,income,filingStatus,medDodPct,tdrl,reservePoints,currentAge,payStartAge,
         colFrom,colTo,monthlyIncome,
         giUsing,giType,giEligPct,giSchoolCity,giEnroll,giOnline,giMonthsPerYear,
         mgibEnroll,mgibServiceYears}=state;
  const [showExportModal,setShowExportModal]=useState(false);
  const [exportSections,setExportSections]=useState({dashboard:true,pension:true,va:true,tax:true,col:true,gap:true});
  const [exporting,setExporting]=useState(false);
  const [pdfTheme,setPdfTheme]=useState("dark");
  const [showDebriefedPromo,setShowDebriefedPromo]=useState(false);
  const DEBRIEF_SESSION_KEY="milcalc_debriefed_shown";
  const [showShareModal,setShowShareModal]=useState(false);
  const [shareImgURL,setShareImgURL]=useState(null);
  const [shareBlobRef]=useState({current:null});
  const h3=(usePayGrade&&lookupPay(payGrade,yos))||high3;
  const key=dk(vaDeps);
  const isReserveEligibleNow=separationType==="reserve"&&currentAge>=payStartAge;
  const g=pensionBySepType(separationType,retType,yos,h3,medDodPct,tdrl,reservePoints,currentAge,payStartAge);
  const sbpC=sbp?g*(sbpCoverage/100)*0.065:0;
  const netP=g-sbpC;
  const vaM=calcVAComp(vaRating,key,vaChildren||0);
  const si=STATES[selectedState]||{ok:true};
  // VA offset for medical retirees with < 20 YOS (Ch. 61)
  const medCalc=separationType==="medical"?medicalPension(yos,h3,medDodPct,tdrl,retType):null;
  const isVAOffset=separationType==="medical"&&yos<20&&vaM>0&&g>0&&medCalc&&!medCalc.isSeverance;
  // With VA offset: DOD pay reduced dollar-for-dollar by VA comp; receive higher of the two
  const offsetNetP=isVAOffset?Math.max(0,netP-vaM):netP;
  const taxableAnnual=offsetNetP*12+(income||0);
  const {monthlyTax:fedTax,effectiveRate:fedEffRate,totalDeduction:fedDeduction}=calcFederalTax(taxableAnnual,filingStatus||"single",state.age65Plus,state.spouseAge65Plus);
  const stTax=calcStateTax(offsetNetP*12,si)/12;
  const atP=offsetNetP-fedTax-stTax;
  const isMGIB=giType==="ch30"||giType==="ch1606";
  const mhaBase=giOnline?GI_BILL_ONLINE_MHA:(MHA_CITIES[giSchoolCity]||0);
  const mhaMo=giUsing?(isMGIB?Math.round(mgibMonthly(giType,mgibEnroll,mgibServiceYears)):Math.round(mhaBase*(giEligPct/100)*giEnroll)):0;
  const mhaBooksMo=giUsing&&!isMGIB?Math.round((1000*(giEligPct/100))/12):0;
  const giLabel=isMGIB?(giType==="ch30"?"MGIB-AD (Ch. 30)":"MGIB-SR (Ch. 1606)"):"GI Bill MHA";
  const giTaxNote=isMGIB?"taxable":"tax-free";
  const otherMo=Math.round((income||0)/12);
  const totalBase=atP+vaM+otherMo;
  const totalSchool=totalBase+mhaMo;
  const healthPrem=(()=>{
    if(separationType==="veteran") return 0;
    if(separationType==="reserve"&&!isReserveEligibleNow){
      const rr=state.reserveHealthType==="trs"?TRICARE_RS:state.reserveHealthType==="trr"?TRICARE_TRR:null;
      return rr?(state.tricareFamSize==="family"?rr.family:rr.individual):0;
    }
    if(separationType==="medical"&&state.tricareplan==="select") return 0;
    const tp=TRICARE_PLANS[state.tricareplan]||TRICARE_PLANS.prime;
    const gr=tp[`group${state.tricareGroup||"A"}`]||tp.groupA;
    const mp=state.tricareplan==="tfl"?(state.tricareFamSize==="family"?370:185):0;
    return (gr[state.tricareFamSize]||gr.self)+mp;
  })();
  const civHiCost=state.civHiCost!=null?state.civHiCost:0;
  const insuranceMo=Math.round(healthPrem+(state.useVgli?vgliMonthly(state.vgliCoverage,state.vgliAge):0)+(state.otherLifePremium||0)+civHiCost);
  const totalAfterInsRaw=totalSchool-insuranceMo;
  const deductionsExceedIncome=totalAfterInsRaw<0&&(insuranceMo+sbpC)>0;
  const totalAfterIns=Math.max(0,totalAfterInsRaw);
  const gap=desiredIncome-totalAfterIns;
  const isAnyRetiree=separationType==="active"||(separationType==="medical"&&yos>=20)||(separationType==="reserve"&&isReserveEligibleNow);
  const elig=isAnyRetiree&&vaRating>=50;
  const reserveCalc=separationType==="reserve"?reservePension(reservePoints||0,h3||0,retType):{pay:0,equivYOS:0,multPct:0};
  const p=separationType==="active"?pct(retType,yos):separationType==="medical"?medicalPension(yos,h3,medDodPct,tdrl,retType).mult:separationType==="reserve"?Math.min(reserveCalc.equivYOS*reserveCalc.multPct,100):0;
  const pensionLabel=separationType==="active"?"Pension / mo":separationType==="medical"?"Medical Ret. Pay":separationType==="reserve"?(isReserveEligibleNow?"Reserve Pay / mo":`Reserve (Age ${payStartAge})`):"No Pension";
  const reserveProjected=separationType==="reserve"&&!isReserveEligibleNow?reserveCalc.pay:0;

  const [showFullDisclaimer,setShowFullDisclaimer]=useState(false);

  // ── individual deduction components for infographic ──
  const vgliPrem=state.useVgli?vgliMonthly(state.vgliCoverage,state.vgliAge):0;
  const otherLifePrem=state.otherLifePremium||0;

  // ── Infographic Canvas Generator — returns canvas for blob extraction ──
  const buildInfographicCanvas=()=>{
    const C={bg:"#0a1628",card:"#1e3a5f",gold:"#d4a017",goldL:"#f0c14b",red:"#f87171",mut:"#8a9bb0",lt:"#cbd5e1",wh:"#ffffff",disc:"#111f35"};
    const W=400,PAD=20,CARD_H=36,CARD_GAP=6,SEC_GAP=18,CARD_R=8;
    const incomeRows=[];
    if(atP>0) incomeRows.push({label:"Pension (after tax)",val:atP});
    if(vaM>0) incomeRows.push({label:"VA Disability",val:vaM});
    if(mhaMo>0) incomeRows.push({label:giLabel,val:mhaMo});
    if(otherMo>0) incomeRows.push({label:"Additional Income",val:otherMo});
    const deductRows=[];
    if(sbpC>0) deductRows.push({label:"SBP Premium",val:sbpC});
    if(healthPrem>0) deductRows.push({label:"TRICARE Premium",val:healthPrem});
    if(civHiCost>0) deductRows.push({label:"Civilian Health Ins.",val:civHiCost});
    if(vgliPrem>0||otherLifePrem>0) deductRows.push({label:"Life Insurance",val:Math.round(vgliPrem+otherLifePrem)});
    const totalIncome=incomeRows.reduce((s,r)=>s+r.val,0);
    const totalDeductions=deductRows.reduce((s,r)=>s+r.val,0);
    const takeHome=Math.max(0,totalIncome-totalDeductions);
    const hasGap=desiredIncome>0&&(desiredIncome-takeHome)>0;
    const gapAmt=hasGap?desiredIncome-takeHome:0;
    let h=PAD+30+SEC_GAP+20+8+incomeRows.length*(CARD_H+CARD_GAP);
    if(deductRows.length>0) h+=SEC_GAP+20+8+deductRows.length*(CARD_H+CARD_GAP);
    h+=SEC_GAP+46+SEC_GAP+1;
    if(hasGap) h+=SEC_GAP+20+8+80+SEC_GAP;
    h+=60+SEC_GAP+20+PAD;
    const canvas=document.createElement("canvas");
    canvas.width=W*2;canvas.height=h*2;
    const ctx=canvas.getContext("2d");ctx.scale(2,2);
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,h);
    let y=PAD;
    const rr=(x,ry,w,rh,r)=>{ctx.beginPath();ctx.moveTo(x+r,ry);ctx.lineTo(x+w-r,ry);ctx.quadraticCurveTo(x+w,ry,x+w,ry+r);ctx.lineTo(x+w,ry+rh-r);ctx.quadraticCurveTo(x+w,ry+rh,x+w-r,ry+rh);ctx.lineTo(x+r,ry+rh);ctx.quadraticCurveTo(x,ry+rh,x,ry+rh-r);ctx.lineTo(x,ry+r);ctx.quadraticCurveTo(x,ry,x+r,ry);ctx.closePath();};
    const fmtD=v=>"$"+Math.round(v).toLocaleString();
    // Header
    const logoSz=26;
    rr(PAD,y,logoSz,logoSz,6);ctx.fillStyle="#0A0E1A";ctx.fill();ctx.strokeStyle=C.gold;ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=C.goldL;ctx.font="bold 16px system-ui,-apple-system,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("M",PAD+logoSz/2,y+logoSz/2);
    ctx.fillStyle=C.goldL;ctx.font="500 14px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText("MilCalc",PAD+logoSz+8,y+logoSz/2);
    ctx.fillStyle=C.mut;ctx.font="11px system-ui,-apple-system,sans-serif";ctx.textAlign="right";
    ctx.fillText("My Retirement Plan",W-PAD,y+logoSz/2);
    y+=30+SEC_GAP;
    const secLabel=(text,sy)=>{ctx.fillStyle=C.gold;ctx.font="bold 10px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";ctx.letterSpacing="1.5px";ctx.fillText(text.toUpperCase(),PAD,sy);try{ctx.letterSpacing="0px";}catch{}return sy+20+8;};
    const cardRow=(label,val,ry,isDeduct)=>{rr(PAD,ry,W-PAD*2,CARD_H,CARD_R);ctx.fillStyle=C.card;ctx.fill();ctx.fillStyle=C.lt;ctx.font="12px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(label,PAD+12,ry+CARD_H/2);ctx.fillStyle=isDeduct?C.red:C.wh;ctx.font="500 13px system-ui,-apple-system,sans-serif";ctx.textAlign="right";ctx.fillText((isDeduct?"-":"")+fmtD(val),W-PAD-12,ry+CARD_H/2);return ry+CARD_H+CARD_GAP;};
    y=secLabel("Monthly Income",y);
    for(const row of incomeRows) y=cardRow(row.label,row.val,y,false);
    if(deductRows.length>0){y+=SEC_GAP-CARD_GAP;y=secLabel("Deductions",y);for(const row of deductRows) y=cardRow(row.label,row.val,y,true);}
    y+=SEC_GAP-CARD_GAP;
    const totalY=y,totalH=46;
    rr(PAD,totalY,W-PAD*2,totalH,CARD_R);ctx.fillStyle=C.card;ctx.fill();
    ctx.strokeStyle=C.gold;ctx.lineWidth=1.5;rr(PAD,totalY,W-PAD*2,totalH,CARD_R);ctx.stroke();
    ctx.fillStyle=C.gold;ctx.font="500 13px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText("Est. Monthly Take-Home",PAD+12,totalY+totalH/2);
    ctx.fillStyle=C.goldL;ctx.font="500 20px system-ui,-apple-system,sans-serif";ctx.textAlign="right";
    ctx.fillText(fmtD(takeHome),W-PAD-12,totalY+totalH/2);
    y=totalY+totalH+SEC_GAP;
    ctx.strokeStyle="rgba(212,160,23,0.3)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(PAD,y);ctx.lineTo(W-PAD,y);ctx.stroke();y+=1;
    if(hasGap){
      y+=SEC_GAP;y=secLabel("Transition Picture",y);const panelH=80;
      rr(PAD,y,W-PAD*2,panelH,CARD_R);ctx.fillStyle=C.card;ctx.fill();
      ctx.fillStyle=C.gold;ctx.font="10px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
      ctx.fillText("Income Gap",PAD+14,y+10);
      ctx.fillStyle=C.wh;ctx.font="500 18px system-ui,-apple-system,sans-serif";ctx.textBaseline="top";
      ctx.fillText(fmtD(gapAmt),PAD+14,y+24);
      ctx.fillStyle=C.mut;ctx.font="11px system-ui,-apple-system,sans-serif";
      const gW=ctx.measureText(fmtD(gapAmt)).width;ctx.fillText("/mo needed",PAD+14+gW+4,y+28);
      const rX=W-PAD-14;ctx.fillStyle=C.mut;ctx.font="10px system-ui,-apple-system,sans-serif";ctx.textAlign="right";ctx.textBaseline="top";
      ctx.fillText("Target salary",rX,y+10);ctx.fillStyle=C.wh;ctx.font="500 13px system-ui,-apple-system,sans-serif";
      ctx.fillText(fmtD(desiredIncome*12)+"/yr",rX,y+24);
      const barY=y+50,barH=6,barX=PAD+14,barW=W-PAD*2-28;
      rr(barX,barY,barW,barH,3);ctx.fillStyle=C.bg;ctx.fill();
      const pctFill=Math.min(1,desiredIncome>0?takeHome/desiredIncome:0);
      if(pctFill>0){rr(barX,barY,Math.max(barH,barW*pctFill),barH,3);ctx.fillStyle=C.gold;ctx.fill();}
      ctx.fillStyle=C.mut;ctx.font="10px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
      ctx.fillText(`Benefits cover ${Math.round(pctFill*100)}% of target income`,barX,barY+barH+6);
      y+=panelH+SEC_GAP;
    }
    const discY=y,discH=52;
    rr(PAD,discY,W-PAD*2,discH,CARD_R);ctx.fillStyle=C.disc;ctx.fill();
    ctx.fillStyle=C.mut;ctx.font="10px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
    const discTxt="These are estimates only. Actual amounts may vary. Rates and benefits are subject to change. Not financial advice.";
    const maxTW=W-PAD*2-24;const words=discTxt.split(" ");let ln="",lnY=discY+10;
    for(const w of words){const t=ln?ln+" "+w:w;if(ctx.measureText(t).width>maxTW&&ln){ctx.fillText(ln,PAD+12,lnY);lnY+=14;ln=w;}else{ln=t;}}
    if(ln) ctx.fillText(ln,PAD+12,lnY);
    y=discY+discH+SEC_GAP;
    ctx.fillStyle=C.mut;ctx.font="11px system-ui,-apple-system,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
    ctx.fillText("Calculate yours free",PAD,y);
    ctx.fillStyle=C.goldL;ctx.font="500 12px system-ui,-apple-system,sans-serif";ctx.textAlign="right";
    const fT="milcalc.app",fX=W-PAD;ctx.fillText(fT,fX,y);
    const fW=ctx.measureText(fT).width;ctx.strokeStyle=C.goldL;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(fX-fW,y+15);ctx.lineTo(fX,y+15);ctx.stroke();
    return canvas;
  };

  // ── Share button handler: generate infographic, open modal ──
  const handleShareMyResults=()=>{
    setShowShareModal(true);
    track("Share Modal Opened",{});
    // Build canvas after modal is open so preview renders reliably
    requestAnimationFrame(()=>{
      const canvas=buildInfographicCanvas();
      canvas.toBlob((blob)=>{
        if(!blob) return;
        shareBlobRef.current=blob;
        setShareImgURL(URL.createObjectURL(blob));
      },"image/png");
    });
  };

  // ── Share helpers ──
  const downloadPNG=()=>{
    if(!shareBlobRef.current) return;
    const url=URL.createObjectURL(shareBlobRef.current);
    const a=document.createElement("a");a.href=url;a.download="milcalc-retirement-plan.png";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    track("Infographic Shared",{method:"download"});
  };
  const shareNative=async()=>{
    if(!shareBlobRef.current) return;
    const file=new File([shareBlobRef.current],"milcalc-retirement-plan.png",{type:"image/png"});
    try{await navigator.share({files:[file],text:"I just calculated my military retirement pay. Calculate yours free at milcalc.app",url:"https://milcalc.app"});track("Infographic Shared",{method:"native"});}catch{}
  };
  const canNativeShare=(()=>{try{return navigator.canShare&&navigator.canShare({files:[new File([""],"test.png",{type:"image/png"})]});}catch{return false;}})();
  const closeShareModal=()=>{if(shareImgURL) URL.revokeObjectURL(shareImgURL);setShareImgURL(null);shareBlobRef.current=null;setShowShareModal(false);};
  const showShareBtn=(atP>0||vaM>0);

  return(
    <div className="fu">
      {!isConfigured&&<UnconfiguredBanner go={go}/>}
      {isConfigured&&separationType!=="veteran"&&(state.bah||0)===0&&(
        <div onClick={()=>go("myinfo")} style={{background:"linear-gradient(135deg,rgba(194,120,42,.12),rgba(194,120,42,.06))",border:"1px solid rgba(194,120,42,.25)",borderRadius:10,padding:"12px 16px",marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:13,color:"var(--ink)",lineHeight:1.4}}>{"\uD83D\uDCCB"} <strong>Add your current pay</strong> for a true gap calculation</span>
          <span style={{fontSize:16,color:"var(--nvm)"}}>&#8594;</span>
        </div>
      )}
      {userName&&<div style={{fontSize:14,color:"var(--mut)",marginBottom:4}}>Here's your picture, {userName}.</div>}
      <div className="sh2"><h2>Your Financial Dashboard</h2>
        <p>{separationType==="veteran"?"Veteran":separationType==="medical"?"Medical Retiree":separationType==="reserve"?"Reserve/Guard":"Active Duty"} / {retType} / {separationType==="reserve"?`${(reservePoints/360).toFixed(1)} equiv. YOS`:fmtYos(yos)+" YOS"} / {selectedState}</p>
      </div>

      {/* ── EXPORT + SHARE BUTTONS ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr"+(showShareBtn?" 1fr":""),gap:10,marginBottom:16}}>
        <button onClick={()=>setShowExportModal(true)}
          style={{padding:"14px 20px",background:"linear-gradient(135deg,#c2782a,#e09448)",
            color:"#0A0E1A",border:"none",borderRadius:12,fontSize:16,fontWeight:700,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10,
            fontFamily:"Barlow,sans-serif",boxShadow:"0 2px 12px rgba(194,120,42,.3)"}}>
          <span style={{fontSize:20}}>{"\u2B07"}</span> Export My Plan
        </button>
        {showShareBtn&&<button onClick={handleShareMyResults}
          style={{padding:"14px 20px",background:"linear-gradient(135deg,#0a1628,#1e3a5f)",
            color:"#f0c14b",border:"1px solid rgba(212,160,23,.4)",borderRadius:12,fontSize:16,fontWeight:700,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10,
            fontFamily:"Barlow,sans-serif",boxShadow:"0 2px 12px rgba(10,22,40,.4)",transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="#d4a017"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(212,160,23,.4)"}>
          <span style={{fontSize:18}}>{"\u{1F4F2}"}</span> Share My Results
        </button>}
      </div>

      <div className="dash-grid">
      {/* Hero stat cards — 2 wide */}
      <div className="dash-full" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div className="card" style={{textAlign:"center",padding:"16px 10px",marginBottom:0}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".09em",color:"var(--fnt)",marginBottom:6}}>{pensionLabel}</div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:600,color:separationType==="veteran"?"var(--mut)":"var(--nv)",lineHeight:1}}>{separationType==="veteran"?"\u2014":separationType==="reserve"&&!isReserveEligibleNow?fmt(reserveProjected):fmt(atP)}</div>
          <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>{separationType==="veteran"?"N/A":separationType==="reserve"&&!isReserveEligibleNow?"projected gross":"after tax"}</div>
        </div>
        <div className="card" style={{textAlign:"center",padding:"16px 10px",marginBottom:0}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".09em",color:"var(--fnt)",marginBottom:6}}>VA Comp / mo</div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:600,color:"var(--gn)",lineHeight:1}}>{fmt(vaM)}</div>
          <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>tax-free</div>
        </div>
      </div>

      {/* Grand total card */}
      <div className="card dash-full" style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
          <div>
            <div className="bsl">Grand Total / mo</div>
            <div className="bsv" style={{color:gap<=0?"var(--gn)":"var(--nv)"}}>{fmt(totalSchool)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--fnt)"}}>Annual</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:17,fontWeight:600,color:"var(--nv)"}}>{fmt(totalSchool*12)}</div>
          </div>
        </div>
        <DR label="Pension (net)" value={fmt(atP)} color="navy"/>
        <DR label="VA Compensation" value={fmt(vaM)} color="green" sub="Tax-free"/>
        {mhaMo>0&&<DR label={giLabel} value={fmt(mhaMo)} color="green" sub={`${giMonthsPerYear} mo/yr · ${giTaxNote}`}/>}
        {otherMo>0&&<DR label="Other Income" value={fmt(otherMo)} sub={fmt(income)+"/yr"}/>}
        {insuranceMo>0&&<DR label="Insurance Premiums" value={`-${fmt(insuranceMo)}`} color="red" sub="TRICARE + VGLI + other"/>}
        {deductionsExceedIncome&&<div className="ib ib-rd" style={{marginTop:10,fontSize:12}}>Estimated deductions exceed income. Review insurance and SBP selections.</div>}
      </div>

      {/* Gap / surplus */}
      <div className="card dash-full" style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--mut)",marginBottom:5}}>
          <span>Benefits vs. target ({fmt(desiredIncome)}/mo)</span>
          <span>{desiredIncome>0?Math.min(100,(totalAfterIns/desiredIncome)*100).toFixed(0):"0"}%</span>
        </div>
        <PBar value={totalAfterIns} max={desiredIncome} color={gap<=0?"var(--gn)":totalAfterIns/desiredIncome>.7?"var(--gd)":"var(--nv)"}/>
        <div style={{marginTop:10}}>
          {gap<=0?(
            <div className="ib ib-gn"><strong>Fully covered.</strong> Surplus of {fmt(Math.abs(gap))}/mo ({fmt(Math.abs(gap)*12)}/yr).</div>
          ):(
            <div className="ib ib-gd"><strong>Gap: {fmt(gap)}/mo.</strong> Need ~{fmt((gap/0.75)*12)}/yr gross salary to close.</div>
          )}
        </div>
      </div>


      {/* Status badges */}
      <div className="dash-full" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {elig&&<span style={{padding:"6px 12px",borderRadius:20,background:"var(--gnb)",color:"var(--gn)",fontSize:12,fontWeight:600}}>CRDP Eligible</span>}
        {separationType==="veteran"&&<span style={{padding:"6px 12px",borderRadius:20,background:"var(--gdb)",color:"var(--gd)",fontSize:12,fontWeight:600}}>Veteran (no pension)</span>}
        <span style={{padding:"6px 12px",borderRadius:20,background:si.ok?"var(--gnb)":"var(--rdb)",color:si.ok?"var(--gn)":"var(--rd)",fontSize:12,fontWeight:600}}>{selectedState}: {si.ok?"Tax-Exempt":"Taxed"}</span>
        {mhaMo>0&&<span style={{padding:"6px 12px",borderRadius:20,background:"var(--gnb)",color:"var(--gn)",fontSize:12,fontWeight:600}}>GI Bill Active</span>}
      </div>

      {/* Pension quick breakdown */}
      <div className="card dash-full" style={{marginBottom:14}}>
        <div className="cttl">{separationType==="veteran"?"Income Summary":"Pension Breakdown"}</div>
        {separationType==="veteran"?(
          <div className="ib ib-gd" style={{fontSize:13}}>No DoD retirement pay. Your income comes from VA compensation, GI Bill, and civilian earnings.</div>
        ):(
          <>
            <DR label="Separation Type" value={separationType==="active"?"Active Duty":separationType==="medical"?"Medical (Ch. 61)":"Reserve/Guard"}/>
            <DR label="Retirement System" value={retType==="High-3"?"High-3 (High-36)":retType}/>
            {separationType==="reserve"?(
              <>
                <DR label="Total Retirement Points" value={`${(reservePoints||0).toLocaleString()}`} sub={`Equiv. ${(reservePoints/360).toFixed(1)} YOS`}/>
                <DR label="Pension Multiplier" value={`${p.toFixed(1)}%`} sub={`of High-36 avg ${fmt(h3)}/mo`}/>
                <DR label={isReserveEligibleNow?"Gross Monthly":"Projected Gross Monthly"} value={fmt(isReserveEligibleNow?g:reserveCalc.pay)}/>
              </>
            ):(
              <>
                <DR label="Years of Service" value={`${fmtYos(yos)} years`}/>
                {separationType==="medical"&&<DR label="DoD Disability %" value={`${medDodPct}%${tdrl?" (TDRL)":""}${medCalc?.method==="disability"?" (disability method)":medCalc?.method==="yos"?" (YOS method)":""}`}/>}
                <DR label="Pension Multiplier" value={`${p.toFixed(1)}%`} sub={`of High-36 avg ${fmt(h3)}/mo`}/>
                <DR label={separationType==="medical"?"Gross Medical Retirement":"Gross Monthly"} value={fmt(g)}/>
                {isVAOffset&&<DR label="VA Offset" value={`-${fmt(Math.min(vaM,netP))}/mo`} color="red" sub="DOD pay offset dollar-for-dollar by VA comp"/>}
              </>
            )}
            {sbp&&<DR label="SBP Premium" value={`-${fmt(sbpC)}/mo`} color="red"/>}
            <DR label="Federal Tax (est.)" value={`-${fmt(fedTax)}/mo`} color="red" sub={`${(fedEffRate*100).toFixed(1)}% effective · ${FILING_STATUS_LABELS[filingStatus||"single"]||"Single"} · 2026 IRS figures`}/>
            <DR label={`State Tax — ${selectedState}`} value={si.ok?"Exempt":`-${fmt(stTax)}/mo`} color={si.ok?"green":"red"} sub={si.label||si.note}/>
            <DR label="Net After-Tax Pension" value={fmt(atP)+"/mo"} color="navy"/>
            {separationType==="reserve"&&!isReserveEligibleNow&&(
              <div className="ib ib-gd" style={{marginTop:10,fontSize:13}}>Reserve pay starts at age {payStartAge}. Currently age {currentAge}.</div>
            )}
          </>
        )}
      </div>

      </div>{/* close dash-grid */}

      {/* ── SAVE PROMPT — appears after 3+ pension calculations in session ── */}
      {(()=>{
        let calcCount=0;try{calcCount=parseInt(sessionStorage.getItem("milcalc_calc_count")||"0",10);}catch{}
        const prompted=sessionStorage.getItem("milcalc_save_prompted")==="1";
        if(calcCount>=3&&!prompted&&isConfigured) return(
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:16,
            background:"linear-gradient(135deg,rgba(194,120,42,.10),rgba(194,120,42,.04))",
            border:"1px solid rgba(194,120,42,.25)",borderRadius:12}}>
            <span style={{fontSize:20,flexShrink:0}}>{"\u{1F4BE}"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",marginBottom:2}}>Ready to save your results?</div>
              <div style={{fontSize:12,color:"var(--mut)"}}>Export a personalized PDF with all your numbers.</div>
            </div>
            <button onClick={()=>{try{sessionStorage.setItem("milcalc_save_prompted","1");}catch{}setShowExportModal(true);}}
              style={{flexShrink:0,padding:"8px 16px",background:"linear-gradient(135deg,#c2782a,#e09448)",
                color:"#0A0E1A",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                fontFamily:"Barlow,sans-serif",whiteSpace:"nowrap"}}>
              Export PDF
            </button>
          </div>
        );
        return null;
      })()}

      {/* ── SHARE PROMPT — appears after 5+ calculations ── */}
      {(()=>{
        let calcCount=0;try{calcCount=parseInt(sessionStorage.getItem("milcalc_calc_count")||"0",10);}catch{}
        const sharePrompted=sessionStorage.getItem("milcalc_share_prompted")==="1";
        if(calcCount>=5&&!sharePrompted&&isConfigured) return(
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:16,
            background:"linear-gradient(135deg,rgba(26,60,110,.06),rgba(26,60,110,.02))",
            border:"1px solid rgba(26,60,110,.15)",borderRadius:12}}>
            <span style={{fontSize:20,flexShrink:0}}>{"\u{1F517}"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",lineHeight:1.4}}>Share your results with your spouse or financial advisor</div>
            </div>
            <button onClick={()=>{try{sessionStorage.setItem("milcalc_share_prompted","1");}catch{}handleShareMyResults();}}
              style={{flexShrink:0,padding:"8px 16px",background:"var(--card)",
                color:"var(--ink)",border:"1px solid var(--br)",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                fontFamily:"Barlow,sans-serif",whiteSpace:"nowrap"}}>
              Share
            </button>
          </div>
        );
        return null;
      })()}

      {/* ── COL CALLOUT — contextual after state selected ── */}
      {isConfigured&&selectedState&&(
        <button onClick={()=>{set("planSection","col");go("planning");track("COL Banner Tapped",{source:"dashboard",state:selectedState});}}
          style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"18px 16px",marginBottom:16,
            background:"linear-gradient(135deg,rgba(26,60,110,.08),rgba(26,60,110,.03))",
            border:"1px solid rgba(26,60,110,.2)",borderRadius:12,cursor:"pointer",
            textAlign:"left",fontFamily:"Barlow,sans-serif",
            transition:"border-color .15s,box-shadow .15s",WebkitTapHighlightColor:"transparent"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--nv)";e.currentTarget.style.boxShadow="0 2px 12px rgba(26,60,110,.12)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(26,60,110,.2)";e.currentTarget.style.boxShadow="none";}}>
          <span style={{fontSize:28,width:40,textAlign:"center",flexShrink:0}}>{"\u{1F4CD}"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:3}}>You selected {selectedState}.</div>
            <div style={{fontSize:13,color:"var(--mut)",lineHeight:1.4}}>See how your retirement income compares across cities →</div>
          </div>
          <span style={{fontSize:20,color:"var(--nvm)",flexShrink:0,fontWeight:700}}>{"\u2192"}</span>
        </button>
      )}

      {/* ── EXPLORE MORE — discovery cards to bridge the navigation cliff ── */}
      <div style={{marginTop:6,marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".11em",textTransform:"uppercase",color:"var(--fnt)",marginBottom:10}}>Explore Your Numbers</div>

        {/* COL Preview Card */}
        <button onClick={()=>{set("planSection","col");go("planning");track("Discovery Card Tapped",{card:"col"});}}
          style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"16px 14px",
            background:"var(--card)",border:"1px solid var(--br)",borderRadius:12,cursor:"pointer",
            marginBottom:8,textAlign:"left",fontFamily:"Barlow,sans-serif",
            transition:"border-color .15s",WebkitTapHighlightColor:"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--nv)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
          <span style={{fontSize:26,width:36,textAlign:"center",flexShrink:0}}>{"\u{1F4CD}"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",marginBottom:2}}>Compare Cost of Living</div>
            <div style={{fontSize:12,color:"var(--mut)",lineHeight:1.4}}>See how far your {fmt(totalSchool)}/mo goes in different cities</div>
          </div>
          <span style={{fontSize:18,color:"var(--nvm)",flexShrink:0}}>{"\u2192"}</span>
        </button>

        {/* Income Gap Preview Card */}
        <button onClick={()=>{set("planSection","gap");go("planning");track("Discovery Card Tapped",{card:"gap"});}}
          style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"16px 14px",
            background:gap>0?"rgba(224,148,72,.08)":"rgba(90,158,111,.08)",
            border:gap>0?"1px solid rgba(224,148,72,.2)":"1px solid rgba(90,158,111,.2)",
            borderRadius:12,cursor:"pointer",
            marginBottom:8,textAlign:"left",fontFamily:"Barlow,sans-serif",
            transition:"border-color .15s",WebkitTapHighlightColor:"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--nv)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=gap>0?"rgba(224,148,72,.2)":"rgba(90,158,111,.2)"}>
          <span style={{fontSize:26,width:36,textAlign:"center",flexShrink:0}}>{gap>0?"\u{1F4B5}":"\u2705"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",marginBottom:2}}>
              {gap>0?`Close Your ${fmt(gap)}/mo Gap`:"You're Fully Covered"}
            </div>
            <div style={{fontSize:12,color:"var(--mut)",lineHeight:1.4}}>
              {gap>0?`See salary benchmarks, GS pay grades, and hourly rates needed`:"See surplus details, salary equivalents, and benefit breakdown"}
            </div>
          </div>
          <span style={{fontSize:18,color:"var(--nvm)",flexShrink:0}}>{"\u2192"}</span>
        </button>

        {/* Tax Optimization Card */}
        <button onClick={()=>{set("planSection","taxes");go("planning");track("Discovery Card Tapped",{card:"taxes"});}}
          style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"16px 14px",
            background:"var(--card)",border:"1px solid var(--br)",borderRadius:12,cursor:"pointer",
            marginBottom:0,textAlign:"left",fontFamily:"Barlow,sans-serif",
            transition:"border-color .15s",WebkitTapHighlightColor:"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--nv)"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="var(--br)"}>
          <span style={{fontSize:26,width:36,textAlign:"center",flexShrink:0}}>{"\u{1F4B0}"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",marginBottom:2}}>Tax Optimization</div>
            <div style={{fontSize:12,color:"var(--mut)",lineHeight:1.4}}>
              {si.ok?`${selectedState} is tax-free — see your 20-year savings`:`Moving to a tax-free state could save ${fmt(stTax*12)}/yr`}
            </div>
          </div>
          <span style={{fontSize:18,color:"var(--nvm)",flexShrink:0}}>{"\u2192"}</span>
        </button>
      </div>

      {/* Debriefed promos */}
      {gap>0&&<DebriefedGapCard gap={gap}/>}
      <DebriefedGeneralCard/>

      {/* ── SHORT DISCLAIMER ── */}
      <div style={{fontSize:11,color:"var(--mut)",lineHeight:1.6,marginTop:20,padding:"12px 0",borderTop:"1px solid var(--sub)"}}>
        Estimates only. Not affiliated with DoD, DFAS, VA, or any government agency. Verify all figures at dfas.mil, va.gov, and tricare.mil before making financial decisions.
      </div>

      {/* ── FULL DISCLAIMER ── */}
      <div style={{textAlign:"center",marginBottom:8}}>
        <button onClick={()=>setShowFullDisclaimer(!showFullDisclaimer)}
          style={{background:"none",border:"none",color:"var(--mut)",fontSize:12,cursor:"pointer",textDecoration:"underline",padding:4}}>
          {showFullDisclaimer?"Hide":"About & Disclaimer"}
        </button>
      </div>
      {/* ── FOOTER CREDIT ── */}
      <div style={{textAlign:"center",marginTop:16,marginBottom:8}}>
        <span style={{fontSize:11,color:"var(--mut)"}}>MilCalc v{APP_VERSION} · By the maker of Debriefed · <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer" style={{color:"var(--mut)",textDecoration:"none"}}>getdebriefed.co</a></span>
      </div>

      {showFullDisclaimer&&(
        <div className="card" style={{fontSize:12,color:"var(--fnt)",lineHeight:1.7}}>
          <div style={{marginBottom:14}}><strong style={{color:"var(--ink)"}}>Not Government Affiliated</strong><br/>
            This app is not affiliated with, endorsed by, or sponsored by the Department of Defense, the Defense Finance and Accounting Service (DFAS), the Department of Veterans Affairs (VA), the Defense Health Agency (TRICARE), or any other federal or state government agency.</div>
          <div style={{marginBottom:14}}><strong style={{color:"var(--ink)"}}>Estimates Only</strong><br/>
            All calculations are estimates based on publicly available 2026 rate tables and standard formulas. Your actual pension, VA compensation, TRICARE costs, and tax liability may differ based on your specific service history, discharge status, legal rulings, and individual circumstances.</div>
          <div style={{marginBottom:14}}><strong style={{color:"var(--ink)"}}>Data Sources</strong><br/>
            Pay tables sourced from DFAS.mil. VA compensation rates from VA.gov. TRICARE premiums from TRICARE.mil. BAH/MHA rates from DTMO. State tax information reflects general guidance and may not account for your specific situation. Rates are updated periodically but may not reflect the most recent changes.</div>
          <div style={{marginBottom:14}}><strong style={{color:"var(--ink)"}}>Not Financial or Legal Advice</strong><br/>
            Nothing in this app constitutes financial, legal, tax, or benefits advice. Consult a VA-accredited claims agent, military retirement financial counselor, or licensed tax professional before making decisions about your benefits.</div>
          <div style={{marginBottom:14}}><strong style={{color:"var(--ink)"}}>Healthcare Coverage</strong><br/>
            TRICARE plan costs and eligibility shown are estimates. Actual enrollment fees, copays, and coverage depend on your specific enrollment status, location, and plan. Verify current costs at tricare.mil or by calling 1-800-444-5445.</div>
          <div><strong style={{color:"var(--ink)"}}>VA Disability</strong><br/>
            Compensation amounts are estimates only. Your actual rating and payment are determined solely by the Department of Veterans Affairs.</div>
        </div>
      )}

      {/* ── EXPORT OPTIONS MODAL ── */}
      {showExportModal&&createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}
          onClick={()=>setShowExportModal(false)}>
          <div style={{position:"relative",background:"var(--card)",borderRadius:16,maxWidth:480,width:"90%",
              border:"1px solid var(--br)",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}
              onClick={e=>e.stopPropagation()}>
            {/* Scrollable content */}
            <div style={{flex:1,overflowY:"auto",padding:"24px 24px 0"}}>
              <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",marginBottom:16}}>Export My Plan</div>
              <div style={{fontSize:13,color:"var(--mut)",marginBottom:16}}>Choose sections to include in your PDF:</div>
              {[
                {key:"dashboard",label:"Dashboard Summary",locked:true},
                {key:"pension",label:"Pension Breakdown"},
                {key:"va",label:"VA Disability Details"},
                {key:"tax",label:"Tax Analysis"},
                {key:"col",label:"Cost of Living Comparison"},
                {key:"gap",label:"Income Gap Analysis"},
              ].map(s=>(
                <label key={s.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:s.locked?"default":"pointer",borderBottom:"1px solid var(--sub)"}}>
                  <input type="checkbox" checked={exportSections[s.key]} disabled={s.locked}
                    onChange={e=>setExportSections(p=>({...p,[s.key]:e.target.checked}))}
                    style={{width:18,height:18,accentColor:"var(--nv)",flexShrink:0}}/>
                  <span style={{fontSize:14,color:s.locked?"var(--mut)":"var(--ink)"}}>{s.label}{s.locked?" (always included)":""}</span>
                </label>
              ))}
              <div style={{marginTop:16,paddingBottom:16}}>
                <div style={{fontSize:13,color:"var(--mut)",marginBottom:8}}>PDF Style:</div>
                <div style={{display:"flex",gap:8}}>
                  {[{v:"dark",l:"Dark"},{v:"light",l:"Print Friendly"}].map(t=>(
                    <button key={t.v} onClick={()=>setPdfTheme(t.v)}
                      style={{flex:1,minHeight:44,padding:"10px 12px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",
                        fontFamily:"Barlow,sans-serif",border:pdfTheme===t.v?"2px solid var(--gd)":"1px solid var(--br)",
                        background:pdfTheme===t.v?"var(--sub)":"transparent",color:pdfTheme===t.v?"var(--ink)":"var(--mut)"}}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Sticky footer with action buttons */}
            <div style={{padding:"16px 24px 24px",background:"var(--card)",borderTop:"1px solid var(--sub)",flexShrink:0}}>
              <button onClick={()=>{generatePDF();}} disabled={exporting}
                style={{width:"100%",padding:"14px 20px",background:exporting?"var(--sub)":"linear-gradient(135deg,#c2782a,#e09448)",
                  color:exporting?"var(--mut)":"#0A0E1A",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:exporting?"wait":"pointer",
                  fontFamily:"Barlow,sans-serif",minHeight:50}}>
                {exporting?"Generating...":"Generate PDF"}
              </button>
              <button onClick={()=>setShowExportModal(false)}
                style={{width:"100%",marginTop:8,padding:"10px",background:"none",border:"none",
                  color:"var(--mut)",fontSize:13,cursor:"pointer",fontFamily:"Barlow,sans-serif",minHeight:44}}>Cancel</button>
            </div>
          </div>
        </div>,document.body
      )}

      {/* ── SHARE MY RESULTS MODAL ── */}
      {showShareModal&&createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}
          onClick={closeShareModal}>
          <div style={{position:"relative",background:"var(--card)",borderRadius:16,padding:24,maxWidth:420,width:"90%",
              border:"1px solid var(--br)",maxHeight:"85vh",overflowY:"auto"}}
              onClick={e=>e.stopPropagation()}>
            <button onClick={closeShareModal}
              style={{position:"absolute",top:12,right:14,background:"none",border:"none",fontSize:18,color:"var(--mut)",cursor:"pointer",lineHeight:1,zIndex:1}}>{"\u2715"}</button>
            <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",marginBottom:4}}>Share My Results</div>
            <div style={{fontSize:13,color:"var(--mut)",marginBottom:16}}>Preview your retirement infographic.</div>
            {/* Infographic preview */}
            <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"1px solid var(--sub)",background:"#0a1628",minHeight:200}}>
              {shareImgURL?<img src={shareImgURL} alt="Infographic preview" style={{width:"100%",display:"block"}}/>
                :<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"var(--mut)",fontSize:13}}>Generating infographic...</div>}
            </div>
            {/* Single action button: native share on mobile, download on desktop */}
            {canNativeShare?
              <button onClick={shareNative} disabled={!shareBlobRef.current}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"14px 0",
                  background:shareBlobRef.current?"var(--nv)":"var(--sub)",color:"#fff",border:"none",borderRadius:10,
                  cursor:shareBlobRef.current?"pointer":"default",fontFamily:"Barlow,sans-serif",fontSize:15,fontWeight:600,
                  opacity:shareBlobRef.current?1:.5,transition:"opacity .2s"}}>
                <span style={{fontSize:18}}>{"\uD83D\uDCE4"}</span> Share
              </button>
              :<button onClick={downloadPNG} disabled={!shareBlobRef.current}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"14px 0",
                  background:shareBlobRef.current?"var(--nv)":"var(--sub)",color:"#fff",border:"none",borderRadius:10,
                  cursor:shareBlobRef.current?"pointer":"default",fontFamily:"Barlow,sans-serif",fontSize:15,fontWeight:600,
                  opacity:shareBlobRef.current?1:.5,transition:"opacity .2s"}}>
                <span style={{fontSize:18}}>{"\u2B07"}</span> Download PNG
              </button>}
          </div>
        </div>,document.body
      )}

      {/* ── DEBRIEFED CROSS-PROMO (post-export) ── */}
      {showDebriefedPromo&&!modalActive&&createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}
          onClick={()=>{setShowDebriefedPromo(false);track("Debriefed Promo Dismissed",{});}}>
          <div style={{position:"relative",background:"var(--card)",borderRadius:16,padding:"28px 24px",maxWidth:400,width:"90%",
              border:"1px solid var(--br)",textAlign:"center"}}
              onClick={e=>e.stopPropagation()}>
            <button onClick={()=>{setShowDebriefedPromo(false);track("Debriefed Promo Dismissed",{});}}
              style={{position:"absolute",top:12,right:14,background:"none",border:"none",fontSize:18,color:"var(--mut)",cursor:"pointer",lineHeight:1}}>{"\u2715"}</button>
            <div style={{fontSize:28,marginBottom:8}}>{"\u{1F3AF}"}</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",marginBottom:8,fontFamily:"'Libre Baskerville',serif"}}>Planning your transition?</div>
            <div style={{fontSize:14,color:"var(--mut)",lineHeight:1.55,marginBottom:20}}>Translate your military experience into a civilian resume at GetDebriefed.co</div>
            <a href="https://getdebriefed.co?utm_source=milcalc&utm_medium=app&utm_campaign=post-export"
              target="_blank" rel="noopener noreferrer"
              onClick={()=>{track("Debriefed Promo Clicked",{});setShowDebriefedPromo(false);}}
              style={{display:"inline-block",padding:"12px 28px",background:"linear-gradient(135deg,#c2782a,#e09448)",
                color:"#0A0E1A",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",
                fontFamily:"Barlow,sans-serif",textDecoration:"none"}}>
              Check It Out
            </a>
            <div style={{marginTop:12}}>
              <button onClick={()=>{setShowDebriefedPromo(false);track("Debriefed Promo Dismissed",{});}}
                style={{background:"none",border:"none",color:"var(--mut)",fontSize:13,cursor:"pointer",fontFamily:"Barlow,sans-serif"}}>No thanks</button>
            </div>
          </div>
        </div>,document.body
      )}
    </div>
  );

  // ── PDF GENERATION ──
  function generatePDF(){
    setExporting(true);
    try{
      const doc=new jsPDF({orientation:"portrait",unit:"pt",format:"letter"});
      const W=612,H=792,M=40;
      const cw=W-M*2; // content width
      const date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
      const COL_DATA=COL||{};
      const si2=STATES[selectedState]||{ok:true,note:""};

      // Colors — theme-aware
      const isLight=pdfTheme==="light";
      const BG=isLight?[255,255,255]:[10,14,26];
      const CARD=isLight?[241,245,249]:[20,28,46];
      const CARD2=isLight?[226,232,240]:[26,36,64];
      const GOLD=[201,145,58],GOLD_B=[228,169,74];
      const GOLD_P=isLight?[180,83,9]:GOLD_B;   // #b45309 — amber for totals/fills in print
      const GOLD_D=isLight?[180,83,9]:[107,80,32]; // #b45309 footer divider
      const HDR_BG=isLight?[26,39,68]:CARD;     // #1a2744 navy header in print
      const TXT=isLight?[10,22,40]:[240,244,248];  // #0a1628 primary text
      const MUT=isLight?[55,65,81]:[122,138,160];  // #374151 secondary/muted
      const HDR_SUB=isLight?[200,215,235]:MUT;  // light blue-white for header subtitle on navy
      const ROWLBL=isLight?[30,41,59]:MUT;      // #1e293b row label text
      const GRN=[42,122,75];
      const RED=isLight?[185,28,28]:[248,113,113]; // #b91c1c darker red for print

      let pageNum=1,totalPages=0; // we'll fix page numbers at end
      let y=0;

      const rgb=(c)=>c;
      const setC=(doc,c)=>doc.setTextColor(c[0],c[1],c[2]);
      const setF=(doc,c)=>doc.setFillColor(c[0],c[1],c[2]);
      const setD=(doc,c)=>doc.setDrawColor(c[0],c[1],c[2]);

      // Background
      const drawBg=()=>{setF(doc,BG);doc.rect(0,0,W,H,"F");};

      // Header
      const drawHeader=()=>{
        setF(doc,GOLD_P);doc.rect(0,0,W,4,"F");
        setF(doc,HDR_BG);doc.rect(0,4,W,36,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(14);setC(doc,GOLD_B);
        doc.text("MILCALC",M,27);
        doc.setFont("helvetica","normal");doc.setFontSize(8);setC(doc,HDR_SUB);
        doc.text(state.userName?`Transition Plan for ${state.userName} · milcalc.app`:"Transition Plan · milcalc.app",M+70,27);
        doc.text(`Generated ${date}`,W-M,20,{align:"right"});
      };

      // Footer
      const drawFooter=()=>{
        const fy=H-30;
        setF(doc,GOLD_D);doc.rect(M,fy-6,cw,1,"F");
        setF(doc,CARD);doc.rect(0,fy-5,W,35,"F");
        doc.setFontSize(6.5);setC(doc,MUT);doc.setFont("helvetica","normal");
        doc.text("Generated by MilCalc (milcalc.app) \u00B7 For informational purposes only \u2014 not financial or legal advice.",M,fy+8);
        doc.text("Part of the Debriefed family \u00B7 getdebriefed.co",M,fy+18);
      };

      // New page helper
      const newPage=()=>{doc.addPage();pageNum++;drawBg();drawHeader();drawFooter();y=56;};
      const checkSpace=(needed)=>{if(y+needed>H-50)newPage();};

      // Section header
      const sectionHead=(title)=>{
        checkSpace(30);
        setF(doc,CARD);doc.rect(M,y,cw,22,"F");
        setF(doc,GOLD_P);doc.rect(M,y,4,22,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(10);setC(doc,isLight?TXT:GOLD_B);
        doc.text(title,M+14,y+15);
        y+=28;
      };

      // Data row
      const dataRow=(label,value,opts={})=>{
        checkSpace(20);
        if(opts.highlight){setF(doc,CARD2);doc.rect(M,y-2,cw,18,"F");}
        doc.setFont("helvetica","normal");doc.setFontSize(8.5);
        setC(doc,opts.labelColor||ROWLBL);doc.text(label,M+8,y+10);
        doc.setFont("helvetica","bold");
        setC(doc,opts.valueColor||TXT);doc.text(String(value),W-M-8,y+10,{align:"right"});
        y+=18;
      };

      // Stat box
      const statBox=(x,w,label,value)=>{
        setF(doc,CARD);doc.rect(x,y,w,50,"F");
        setF(doc,GOLD_P);doc.rect(x,y,w,3,"F");
        doc.setFont("helvetica","normal");doc.setFontSize(7);setC(doc,ROWLBL);
        doc.text(label,x+w/2,y+18,{align:"center"});
        doc.setFont("helvetica","bold");doc.setFontSize(14);setC(doc,isLight?TXT:GOLD_B);
        doc.text(String(value),x+w/2,y+38,{align:"center"});
      };

      // Progress bar
      const progressBar=(x,w,pct,color)=>{
        checkSpace(14);
        setF(doc,isLight?CARD2:CARD);doc.rect(x,y,w,8,"F");
        const fillW=Math.min(1,Math.max(0,pct/100))*w;
        setF(doc,color||GRN);doc.rect(x,y,fillW,8,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(7);setC(doc,TXT);
        doc.text(`${Math.round(pct)}%`,x+w+6,y+7);
        y+=14;
      };

      // ── PAGE 1 ──
      drawBg();drawHeader();drawFooter();
      y=56;

      // Name and rank info
      const displayName=(userName||"").trim();
      if(displayName){
        doc.setFont("helvetica","bold");doc.setFontSize(16);setC(doc,TXT);
        doc.text(displayName,M,y+14);
        y+=10;
      }
      const rankInfo=[
        separationType==="reserve"?"Reserve/Guard":separationType==="medical"?"Medical Retiree":separationType==="veteran"?"Veteran":usePayGrade?GRADE_LABELS[payGrade]||payGrade:"",
        separationType==="reserve"?`${(reservePoints/360).toFixed(1)} equiv. YOS`:`${fmtYos(yos)} YOS`,
        retType
      ].filter(Boolean).join(" \u00B7 ");
      if(rankInfo){
        doc.setFont("helvetica","normal");doc.setFontSize(9);setC(doc,MUT);
        doc.text(rankInfo,displayName?W-M:M,y+14,displayName?{align:"right"}:{});
      }
      y+=28;

      // Four stat boxes
      const bw=(cw-18)/4;
      const grossPension=separationType==="reserve"?reserveCalc.pay:g;
      statBox(M,bw,separationType==="medical"?"MED. RETIREMENT":"PENSION (GROSS)",separationType==="veteran"?"N/A":fmt(grossPension));
      statBox(M+bw+6,bw,"VA DISABILITY",fmt(vaM));
      statBox(M+(bw+6)*2,bw,"TOTAL MONTHLY",fmt(totalSchool));
      statBox(M+(bw+6)*3,bw,"ANNUAL INCOME",fmt(totalSchool*12));
      y+=60;

      // PENSION section
      if(exportSections.pension&&separationType!=="veteran"){
        sectionHead(separationType==="medical"?"MEDICAL RETIREMENT PAY":"PENSION BREAKDOWN");
        dataRow("Retirement System",retType);
        if(separationType==="reserve"){
          dataRow("Total Retirement Points",(reservePoints||0).toLocaleString());
          dataRow("Equivalent YOS",`${(reservePoints/360).toFixed(1)} years`);
        }else{
          dataRow("High-3 Base Pay",fmt(h3)+"/mo");
          dataRow("Years of Service",fmtYos(yos)+" years");
        }
        if(separationType==="medical"){
          const pdfMedCalc=medicalPension(yos,h3,medDodPct,tdrl,retType);
          dataRow("DoD Disability Rating",medDodPct+"%");
          dataRow("Status",pdfMedCalc.isPDRL?"PDRL (Permanent)":pdfMedCalc.isTDRL?"TDRL (Temporary)":"Severance Only");
          dataRow("Calculation Method",pdfMedCalc.method==="disability"?"Disability % method":"YOS method");
          if(isVAOffset) dataRow("VA Offset","DOD pay offset by VA comp (YOS < 20)",{valueColor:RED});
        }
        dataRow(separationType==="reserve"&&!isReserveEligibleNow?"Projected Monthly Gross":separationType==="medical"?"Monthly Medical Retirement":"Monthly Gross Pension",fmt(grossPension),{highlight:true,valueColor:GOLD_P});
        dataRow("After-Tax Estimate",fmt(atP)+"/mo");
        dataRow("Annual Gross",fmt(grossPension*12));
        dataRow("CRDP/CRSC Status",elig?"Eligible":"Not eligible",{valueColor:elig?GOLD_P:MUT});
        if(sbp&&grossPension>0){
          const sbpBase=grossPension*(sbpCoverage/100);
          const sbpPrem=sbpBase*0.065;
          const sbpAnnuity=sbpBase*0.55;
          const paidUpAge=Math.max(70,(state.sbpRetireAge||42)+30);
          y+=4;
          dataRow("SBP Coverage",sbpCoverage+"% of retired pay");
          dataRow("SBP Base Amount",fmt(sbpBase)+"/mo");
          dataRow("SBP Premium (6.5%)","-"+fmt(sbpPrem)+"/mo",{valueColor:RED});
          dataRow("Survivor Annuity (55%)",fmt(sbpAnnuity)+"/mo",{valueColor:GRN});
          dataRow("Paid-Up Status","Age "+paidUpAge+" (30 yrs + age 70 rule)");
          checkSpace(20);
          doc.setFont("helvetica","italic");doc.setFontSize(7);setC(doc,MUT);
          doc.text("SBP-DIC offset fully eliminated Jan 2023 — survivors receive both benefits.",M+8,y+10);
          y+=16;
        }
        y+=6;
      }

      // VA section
      if(exportSections.va){
        sectionHead("VA DISABILITY");
        dataRow("Combined Rating",vaRating>0?vaRating+"%":"Not rated");
        dataRow("Dependency Status",vaDeps);
        dataRow("Monthly Tax-Free Amount",fmt(vaM),{highlight:true,valueColor:GOLD_P});
        dataRow("Annual Tax-Free",fmt(vaM*12));
        const taxEquiv=vaM>0&&fedEffRate>0?fmt(vaM/(1-fedEffRate)):"N/A";
        dataRow("Tax-Equivalent Value",taxEquiv,{valueColor:GOLD_P});
        y+=6;
      }

      // TAX section
      if(exportSections.tax){
        sectionHead("TAX ANALYSIS");
        dataRow("State",selectedState);
        dataRow("State Tax Treatment",si2.label||si2.note||(si2.ok?"Exempt":"Taxed"),{valueColor:si2.ok?GRN:MUT});
        dataRow("Federal Effective Rate",(fedEffRate*100).toFixed(1)+"%");
        dataRow("Estimated Federal Tax","-"+fmt(fedTax*12)+"/yr",{valueColor:RED});
        if(!si2.ok) dataRow("Estimated State Tax","-"+fmt(stTax*12)+"/yr",{valueColor:RED});
        y+=6;
      }

      // PAGE 2 — COL & Gap
      if(exportSections.col||exportSections.gap){
        newPage();

        if(exportSections.col){
          const effectiveFrom2=COL_DATA[colFrom]?colFrom:(STATE_DEFAULT_CITY[selectedState]||colFrom);
          const fi2=COL_DATA[effectiveFrom2]||100,ti2=COL_DATA[colTo]||100;
          const autoMo2=Math.round(atP+vaM+Math.round((income||0)/12));
          const effMonthly2=(monthlyIncome||0)>0?monthlyIncome:(autoMo2>0?autoMo2:5000);
          const adj2=effMonthly2*(ti2/(fi2||1));
          const diff2=adj2-effMonthly2;
          sectionHead("COST OF LIVING COMPARISON");
          dataRow("Moving From",effectiveFrom2+` (Index: ${fi2})`);
          dataRow("Moving To",colTo+` (Index: ${ti2})`);
          dataRow("Monthly Savings",(diff2<=0?"+":"")+fmt(Math.abs(diff2))+"/mo",{highlight:true,valueColor:diff2<=0?GRN:RED});
          dataRow("Purchasing Power Equivalent",fmt(adj2)+"/mo");

          // Visual bar chart
          checkSpace(40);
          const maxIdx=Math.max(fi2,ti2,120);
          const barW=cw-120;
          doc.setFont("helvetica","normal");doc.setFontSize(7);
          setC(doc,ROWLBL);doc.text(effectiveFrom2.split(",")[0],M+8,y+10);
          setF(doc,GOLD_P);doc.rect(M+110,y+2,barW*(fi2/(maxIdx||1)),10,"F");
          doc.setFont("helvetica","bold");setC(doc,TXT);doc.text(String(fi2),M+114+barW*(fi2/(maxIdx||1)),y+10);
          y+=16;
          setC(doc,ROWLBL);doc.setFont("helvetica","normal");doc.text(colTo.split(",")[0],M+8,y+10);
          setF(doc,diff2<=0?GRN:RED);doc.rect(M+110,y+2,barW*(ti2/(maxIdx||1)),10,"F");
          doc.setFont("helvetica","bold");setC(doc,TXT);doc.text(String(ti2),M+114+barW*(ti2/(maxIdx||1)),y+10);
          y+=24;
        }

        if(exportSections.gap){
          const totalForGap2=totalAfterIns;
          const gap2=desiredIncome-totalForGap2;
          const sal2=gap2>0?(gap2/0.75):0;
          const cov2=desiredIncome>0?Math.min(100,(totalForGap2/(desiredIncome||1))*100):0;

          // Pre-retirement compensation comparison (if user entered BAH)
          const pdfHasPre=(state.bah||0)>0;
          if(pdfHasPre&&separationType!=="veteran"){
            const pdfIsEnlisted=payGrade&&payGrade.startsWith("E-");
            const pdfEffBAS=(state.bas||0)>0?state.bas:(pdfIsEnlisted?BAS_2026.enlisted:BAS_2026.officer);
            const pdfPreTotal=h3+(state.bah||0)+pdfEffBAS;
            const pdfCompDrop=totalForGap2-pdfPreTotal;
            sectionHead("PRE-RETIREMENT COMPENSATION");
            dataRow("Base Pay",fmt(h3)+"/mo");
            if((state.bah||0)>0) dataRow("BAH",fmt(state.bah)+"/mo");
            dataRow("BAS",fmt(pdfEffBAS)+"/mo");
            dataRow("Total Active Duty Comp",fmt(pdfPreTotal)+"/mo",{highlight:true,valueColor:GOLD_P});
            y+=4;
            dataRow("Post-Retirement Income",fmt(totalForGap2)+"/mo");
            dataRow("True Compensation Drop",(pdfCompDrop>=0?"+":"")+fmt(pdfCompDrop)+"/mo",{highlight:true,valueColor:pdfCompDrop>=0?GRN:RED});
            y+=8;
          }

          sectionHead("INCOME GAP ANALYSIS");
          dataRow("Target Income",fmt(desiredIncome)+"/mo");
          dataRow("Total Benefits",fmt(totalForGap2)+"/mo");
          dataRow("Monthly Gap",gap2>0?fmt(gap2)+"/mo":"Fully covered!",{highlight:true,valueColor:gap2>0?GOLD_P:GRN});
          if(gap2>0){
            dataRow("Gross Salary Needed",fmt(sal2*12)+"/yr",{valueColor:GOLD_P});
            dataRow("Part-Time Equivalent","$"+(sal2*12/1040).toFixed(0)+"/hr",{valueColor:GOLD_P});
          }
          // Coverage bar
          checkSpace(24);
          doc.setFont("helvetica","normal");doc.setFontSize(7.5);setC(doc,ROWLBL);
          doc.text("Benefits Coverage",M+8,y+8);
          progressBar(M+100,cw-160,cov2,gap2<=0?(isLight?GOLD_P:GRN):GOLD_P);
          y+=6;
        }
      }

      // NEXT STEPS
      checkSpace(140);
      sectionHead("NEXT STEPS");
      const steps=[
        "File for VA disability if not already rated",
        "Confirm High-3 with final LES before separation",
        "Update VA dependent records for all children under 18",
        "Consult a fee-only financial advisor",
        "Re-run MilCalc annually \u2014 VA rates update each December",
      ];
      steps.forEach((s,i)=>{
        checkSpace(16);
        doc.setFont("helvetica","normal");doc.setFontSize(8);setC(doc,MUT);
        doc.text(`${i+1}.`,M+8,y+10);
        setC(doc,TXT);doc.text(s,M+22,y+10);
        y+=16;
      });

      // CTA box
      checkSpace(36);
      y+=8;
      setF(doc,CARD2);doc.rect(M,y,cw,28,"F");
      setF(doc,GOLD_P);doc.rect(M,y,cw,2,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(9);setC(doc,GOLD_P);
      doc.text("Update your numbers anytime at milcalc.app",W/2,y+18,{align:"center"});

      // Debriefed promo box on last page
      {const lp=doc.getNumberOfPages();doc.setPage(lp);
      const pY=720;
      doc.setDrawColor(...GOLD_P);doc.setLineWidth(1);
      doc.rect(M-6,pY,cw+12,36,"S");
      doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...GOLD_P);
      doc.text("Planning your transition?",M,pY+11);
      doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(MUT[0],MUT[1],MUT[2]);
      doc.text("Translate your military experience into a civilian resume at",M,pY+22);
      doc.setTextColor(...GOLD_P);doc.text("getdebriefed.co",M,pY+32);}

      // Add page numbers
      totalPages=doc.getNumberOfPages();
      for(let i=1;i<=totalPages;i++){
        doc.setPage(i);
        doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(MUT[0],MUT[1],MUT[2]);
        doc.text(`Page ${i} of ${totalPages}`,W-M,28,{align:"right"});
      }

      // Save
      const dateStr=new Date().toISOString().slice(0,10);
      doc.save(`MilCalc_RetirementPlan_${dateStr}.pdf`);

      // Track
      const sectionLabels={dashboard:"Dashboard Summary",pension:"Pension Breakdown",va:"VA Disability Details",tax:"Tax Analysis",col:"Cost of Living Comparison",gap:"Income Gap Analysis"};
      const included=Object.entries(exportSections).filter(([,v])=>v).map(([k])=>sectionLabels[k]||k);
      track("PDF Exported",{
        sections_included:included,
        section_count:included.length,
        retirement_type:separationType==="medical"?"Medical":separationType==="reserve"?"Reserve":"Active",
        has_va:(vaRating||0)>0,
        has_sbp:!!sbp,
        has_tricare:!!(state.tricareplan&&state.tricareplan!=="none"),
        state:selectedState||"",
        yos:yos||0,
        pay_grade:usePayGrade?payGrade:"",
        has_bah:(state.bah||0)>0,
        has_preretirement_comp:(state.bah||0)>0,
      });

      setShowExportModal(false);
      if(onPdfExported) onPdfExported();
      // Debriefed cross-promo — 2.5s delay, once per session
      try{
        if(sessionStorage.getItem(DEBRIEF_SESSION_KEY)!=="1"){
          setTimeout(()=>{sessionStorage.setItem(DEBRIEF_SESSION_KEY,"1");setShowDebriefedPromo(true);track("Debriefed Promo Shown",{trigger:"pdf_export"});},2500);
        }
      }catch{}
    }catch(err){
      console.error("PDF export error:",err);
    }finally{
      setExporting(false);
    }
  }
}

// ── TAB 2: BENEFITS (output-only detail views) ───────────────────────
function BenefitsTab({state,isConfigured,go}){
  const {separationType,retType,yos,high3,usePayGrade,payGrade,vaRating,vaDeps,vaChildren,sbp,sbpCoverage,
         selectedState,medDodPct,tdrl,reservePoints,currentAge,payStartAge,
         giUsing,giType,giEligPct,giSchoolCity,giEnroll,giOnline,giMonthsPerYear,
         mgibEnroll,mgibServiceYears}=state;
  const h3=(usePayGrade&&lookupPay(payGrade,yos))||high3;
  const derivedPay=usePayGrade?lookupPay(payGrade,yos):null;
  const key=dk(vaDeps);
  const nKids=vaChildren||0;
  const isReserveEligibleNow=separationType==="reserve"&&currentAge>=payStartAge;
  const g=pensionBySepType(separationType,retType,yos,h3,medDodPct,tdrl,reservePoints,currentAge,payStartAge);
  const p=separationType==="active"?pct(retType,yos):separationType==="medical"?medicalPension(yos,h3,medDodPct,tdrl,retType).mult:separationType==="reserve"?reservePension(reservePoints,h3,retType).multPct*(reservePoints/360):0;
  const sbpC=sbp?g*(sbpCoverage/100)*0.065:0;
  const net=g-sbpC;
  const vaM=calcVAComp(vaRating,key,nKids);
  const vaBase=calcVAComp(vaRating,key,Math.min(nKids,1)); // base rate (includes first child)
  const vaExtra=nKids>1?(VA[vaRating]?.ac||0)*(nKids-1):0;
  const medCalcB=separationType==="medical"?medicalPension(yos,h3,medDodPct,tdrl,retType):null;
  const isVAOffsetB=separationType==="medical"&&yos<20&&vaM>0&&g>0&&medCalcB&&!medCalcB.isSeverance;
  const offsetNetB=isVAOffsetB?Math.max(0,net-vaM):net;
  const isAnyRetiree=separationType==="active"||(separationType==="medical"&&yos>=20)||(separationType==="reserve"&&isReserveEligibleNow);
  const elig=isAnyRetiree&&vaRating>=50;
  const [crdpOpen,setCrdpOpen]=useState(false);
  const bTaxableAnn=offsetNetB*12+(state.income||0);
  const {effectiveRate:bEffRate}=calcFederalTax(bTaxableAnn,state.filingStatus||"single",state.age65Plus,state.spouseAge65Plus);
  const bAfterTaxMo=offsetNetB*(1-bEffRate);

  // GI Bill
  const isMGIBb=giType==="ch30"||giType==="ch1606";
  const rate26=MHA_CITIES[giSchoolCity]||0;
  const baseRate=giOnline?GI_BILL_ONLINE_MHA:rate26;
  const mhaMonthly=isMGIBb?mgibMonthly(giType,mgibEnroll,mgibServiceYears):(giOnline?baseRate*(giEligPct/100):baseRate*(giEligPct/100)*giEnroll);
  const bookStipend=isMGIBb?0:1000*(giEligPct/100);
  const annualMHA=mhaMonthly*giMonthsPerYear;
  const giLabelB=isMGIBb?(giType==="ch30"?"MGIB-AD (Ch. 30)":"MGIB-SR (Ch. 1606)"):"GI Bill MHA";
  const giTaxNoteB=isMGIBb?"Taxable income":"Tax-free · school months only";

  // Insurance — branches by separation type
  const plan=TRICARE_PLANS[state.tricareplan]||TRICARE_PLANS.prime;
  const grpRates=plan[`group${state.tricareGroup||"A"}`]||plan.groupA;
  const stdTricarePremium=grpRates[state.tricareFamSize]||grpRates.self;
  const medicarePremium=state.tricareplan==="tfl"?(state.tricareFamSize==="family"?plan.medicare_b*2:plan.medicare_b):0;
  const tricarePremium=(()=>{
    if(separationType==="veteran") return 0;
    if(separationType==="reserve"&&!isReserveEligibleNow){
      const rr=state.reserveHealthType==="trs"?TRICARE_RS:state.reserveHealthType==="trr"?TRICARE_TRR:null;
      return rr?(state.tricareFamSize==="family"?rr.family:rr.individual):0;
    }
    if(separationType==="medical"&&state.tricareplan==="select") return 0;
    return stdTricarePremium+medicarePremium;
  })();
  const vgliMo=state.useVgli?vgliMonthly(state.vgliCoverage,state.vgliAge):0;
  const totalInsurance=tricarePremium+vgliMo+(state.otherLifePremium||0);
  const vaPG=getVAPriorityGroup(vaRating);
  const vaPGInfo=VA_PRIORITY_GROUPS[vaPG-1];

  return(
    <div className="fu">
      {!isConfigured&&<UnconfiguredBanner go={go}/>}
      <div className="sh2"><h2>Your Benefits</h2><p>Detailed breakdown of each income source and deduction.</p></div>

      {/* ── PENSION DETAIL ── */}
      <div className="card">
        <div className="cttl">{separationType==="veteran"?"Service Status":separationType==="medical"?"Medical Retirement":"Military Pension"}</div>
        {separationType==="veteran"?(
          <div>
            <div className="ib ib-gd" style={{fontSize:13,marginBottom:12}}>No DoD retirement pay. Veterans who separated before qualifying for retirement receive no pension.</div>
            <div className="ib ib-nv" style={{fontSize:13}}>Still eligible for: VA disability compensation, GI Bill benefits, VA Healthcare, and all planning tools in this app.</div>
          </div>
        ):separationType==="medical"?(
          <div>
            {medCalcB?.isSeverance?(
              <div>
                <div className="ib ib-rd" style={{fontSize:13,marginBottom:12}}>
                  Not eligible for retirement pay — severance pay only.
                </div>
                <DR label="Severance Pay (one-time)" value={fmt(medCalcB.severancePay)} color="navy" sub={`2 × ${fmt(h3)}/mo × ${fmtYos(yos)} YOS`}/>
                <div className="ib ib-gd" style={{fontSize:12,marginTop:8}}>
                  Severance = 2 × monthly base pay × YOS. No ongoing retirement pay.
                </div>
              </div>
            ):(
              <>
                <div style={{marginBottom:16}}>
                  <BStat label="Gross Monthly Medical Retirement Pay" value={fmt(g)} color="navy"
                    sub={`${medCalcB?.isPDRL?"PDRL":"TDRL"} · Multiplier: ${medCalcB?.mult.toFixed(1)}% of High-36 avg${medCalcB?.method==="disability"?" (disability % method)":medCalcB?.method==="yos"?" (YOS method)":medCalcB?.isTDRL?" (TDRL — min 50%)":""}`}/>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--mut)",marginBottom:5}}>
                    <span>YOS leg: {fmtYos(yos)} yrs × {retType==="BRS"?"2.0":"2.5"}% = {medCalcB?.yosMult.toFixed(1)}%</span>
                    <span>DoD: {medCalcB?.disabMult}%{medCalcB?.method==="disability"?" ✓":""}</span>
                  </div>
                  <PBar value={medCalcB?.mult||0} max={75} color="var(--nv)"/>
                </div>
                <div className="ib ib-nv" style={{fontSize:12,marginBottom:12}}>
                  {medCalcB?.isPDRL
                    ?`PDRL: max(DoD ${medDodPct}%, YOS ${fmtYos(yos)} × ${retType==="BRS"?"2.0":"2.5"}%) = ${medCalcB?.mult.toFixed(1)}% × High-36, capped at 75%.`
                    :`TDRL: minimum 50% applied. Reassessed every 18 months, max 5 years.`}
                </div>
                {isVAOffsetB&&(
                  <div className="ib ib-gd" style={{fontSize:12,marginBottom:12}}>
                    <strong>VA Offset (YOS &lt; 20):</strong> DOD retirement pay offset dollar-for-dollar by VA compensation. You receive the higher of the two, not both.
                    {state.combatRelated&&<><br/><strong style={{color:"var(--gn)"}}>CRSC eligible:</strong> Combat-Related Special Compensation IS payable concurrently with VA comp.</>}
                  </div>
                )}
                <hr/>
                <DR label="Gross Medical Retirement" value={fmt(g)}/>
                {isVAOffsetB&&<DR label="VA Offset" value={`-${fmt(Math.min(vaM,net))}`} color="red" sub="DOD pay reduced by VA compensation"/>}
                {sbp&&<DR label="SBP Premium" value={`-${fmt(sbpC)}`} color="red" sub="6.5% of covered base amount · pre-tax deduction"/>}
                {sbp&&<DR label="Survivor Annuity" value={fmt(g*(sbpCoverage/100)*0.55)+"/mo"} color="green" sub="55% of base amount · paid to survivor for life"/>}
                <DR label="Net Monthly" value={fmt(isVAOffsetB?offsetNetB:net)} color="navy"/>
                <DR label="Net Annual" value={fmt((isVAOffsetB?offsetNetB:net)*12)} color="navy"/>
                <hr/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <MT label="Est. After-Tax /mo" value={fmt(bAfterTaxMo)} color="green" sub={`${(bEffRate*100).toFixed(1)}% effective rate`}/>
                  <MT label="Annual After-Tax" value={fmt(bAfterTaxMo*12)} color="green" sub="Not FICA-taxed"/>
                </div>
                {yos>=20&&<div className="ib ib-gn" style={{marginTop:10,fontSize:11}}>20+ YOS: eligible for CRDP — can receive both DOD retirement and VA compensation concurrently. No offset.</div>}
                {sbp&&<div className="ib ib-gn" style={{marginTop:10,fontSize:11}}>SBP-DIC offset eliminated Jan 2023 — survivor receives both SBP and VA DIC in full.</div>}
              </>
            )}
          </div>
        ):separationType==="reserve"?(
          <div>
            <div style={{marginBottom:16}}>
              <BStat label={isReserveEligibleNow?"Gross Monthly Reserve Pay":"Projected Reserve Pay"} value={fmt(reservePension(reservePoints,h3,retType).pay)} color={isReserveEligibleNow?"navy":"gold"}
                sub={`${reservePoints} pts ÷ 360 = ${(reservePoints/360).toFixed(1)} equiv. yrs × ${retType==="BRS"?"2.0":"2.5"}% × High-36 avg`}/>
            </div>
            {!isReserveEligibleNow&&(
              <div className="ib ib-gd" style={{fontSize:13,marginBottom:12}}>
                Reserve pay starts at age {payStartAge}. You are currently {currentAge}. {payStartAge-currentAge} years until pay begins.
              </div>
            )}
            <div className="ib ib-nv" style={{fontSize:12,marginBottom:12}}>
              High-36 average is calculated from the 36 months before pay starts (age {payStartAge}), using pay rates at that time — not when you stopped drilling.
            </div>
            <hr/>
            <DR label="Total Points" value={reservePoints.toLocaleString()}/>
            <DR label="Equiv. YOS" value={`${(reservePoints/360).toFixed(1)} years`}/>
            <DR label="Gross Monthly" value={fmt(reservePension(reservePoints,h3,retType).pay)}/>
            {sbp&&<DR label="SBP Premium" value={`-${fmt(sbpC)}`} color="red"/>}
            <DR label="Net Monthly" value={fmt(net)} color="navy"/>
          </div>
        ):(
          <div>
            <div style={{marginBottom:16}}>
              <BStat label="Gross Monthly Pension" value={fmt(g)} color="navy"
                sub={`${fmtYos(yos)} yrs x ${retType==="BRS"?"2.0":retType==="REDUX"?"varies":"2.5"}% = ${p.toFixed(1)}% of High-36 avg`}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--mut)",marginBottom:5}}>
                <span>Multiplier: {p.toFixed(1)}%</span><span>Max: {retType==="REDUX"?"75":"100"}%</span>
              </div>
              <PBar value={p} max={retType==="REDUX"?75:100} color={p>=50?"var(--gn)":"var(--nv)"}/>
            </div>
            <hr/>
            <DR label="Gross Pension" value={fmt(g)}/>
            {sbp&&<DR label="SBP Premium" value={`-${fmt(sbpC)}`} color="red" sub="6.5% of covered base amount · pre-tax deduction"/>}
            {sbp&&<DR label="Survivor Annuity" value={fmt(g*(sbpCoverage/100)*0.55)+"/mo"} color="green" sub="55% of base amount · paid to survivor for life"/>}
            <DR label="Net Monthly" value={fmt(net)} color="navy"/>
            <DR label="Net Annual" value={fmt(net*12)} color="navy"/>
            <hr/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MT label="Est. After-Tax /mo" value={fmt(bAfterTaxMo)} color="green" sub={`${(bEffRate*100).toFixed(1)}% effective rate`}/>
              <MT label="Annual After-Tax" value={fmt(bAfterTaxMo*12)} color="green" sub="Not FICA-taxed"/>
            </div>
            {sbp&&<div className="ib ib-gn" style={{marginTop:10,fontSize:11}}>SBP-DIC offset eliminated Jan 2023 — survivor receives both SBP and VA DIC in full.</div>}
            {usePayGrade&&derivedPay&&(
              <div className="ib ib-nv" style={{marginTop:12,fontSize:12}}>
                <strong>2026 DFAS rate:</strong> {GRADE_LABELS[payGrade]} at {fmtYos(yos)} yrs = <strong>{fmt(derivedPay)}/mo</strong>
              </div>
            )}
          </div>
        )}

        {/* Collapsed reference: DFAS pay table */}
        {separationType==="active"&&usePayGrade&&(
          <Reveal label="Show DFAS Pay Table">
            <table className="dt">
              <thead><tr><th>YOS</th><th>Monthly Pay</th><th>High-3 Pension</th></tr></thead>
              <tbody>
                {[20,22,24,26,28,30].map(y=>{
                  const pay=lookupPay(payGrade,y);
                  if(!pay) return null;
                  const pen=pension(retType,y,pay);
                  return(
                    <tr key={y} className={y===yos?"hi":""}>
                      <td>{y} yrs</td><td>{fmt(pay)}</td>
                      <td style={{color:"var(--nv)",fontWeight:600}}>{fmt(pen)}/mo</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{fontSize:11,color:"var(--fnt)",marginTop:8}}>Source: DFAS.mil — Effective January 1, 2026 (3.8% raise).</p>
          </Reveal>
        )}

        {retType==="REDUX"&&(
          <div className="ib ib-gd" style={{marginTop:12,fontSize:13}}>
            <strong>REDUX:</strong> $30k CSB at 15 yrs. COLA reduced 1%/yr until 62. Accrual beyond 20 yrs: 3.5%/yr, capped at 75%.
          </div>
        )}
      </div>

      {/* ── VA DISABILITY DETAIL ── */}
      <div className="card">
        <div className="cttl">VA Disability Compensation</div>
        <div style={{marginBottom:16}}>
          <BStat label="Monthly VA Compensation" value={fmt(vaM)} color="green"
            sub={`${vaRating}% rating · ${vaDeps}${nKids>0?` · ${nKids} child${nKids>1?"ren":""}`:""}  · 100% tax-free`}/>
        </div>
        {nKids>1&&vaRating>=30&&(
          <div style={{fontSize:13,color:"var(--mut)",marginBottom:12,lineHeight:1.55}}>
            Base rate ({vaDeps==="Spouse + Child"||vaDeps==="Child Only"?vaDeps.toLowerCase():"with 1 child"}): <strong style={{color:"var(--ink)",fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(vaBase)}</strong> + {nKids-1} additional {nKids-1===1?"child":"children"}: <strong style={{color:"var(--gn)",fontFamily:"'IBM Plex Mono',monospace"}}>+{fmt(vaExtra)}/mo</strong>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <MT label="Annual" value={fmt(vaM*12)} color="green"/>
          <MT label="Tax-Equiv. Value" value={`${fmt(bEffRate<1?vaM/(1-bEffRate):vaM)}/mo`} color="navy" sub={`At ${(bEffRate*100).toFixed(1)}% effective rate`}/>
        </div>


        {/* Collapsed reference: VA rate table */}
        <Reveal label="Show 2026 VA Rate Table">
          <table className="dt">
            <thead><tr><th>Rating</th><th>Single</th><th>w/ Spouse</th></tr></thead>
            <tbody>
              {[10,20,30,40,50,60,70,80,90,100].map(r=>(
                <tr key={r} className={r===vaRating?"hi":""}>
                  <td>{r}%</td><td>{fmt(VA[r].s)}</td><td>{VA[r].sp?fmt(VA[r].sp):"---"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>

      {/* ── CRDP / CRSC (expandable) ── */}
      <div className="card">
        <button type="button" onClick={()=>setCrdpOpen(!crdpOpen)}
          style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",
            background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"Barlow,sans-serif"}}>
          <div className="cttl" style={{marginBottom:0}}>CRDP / CRSC — Concurrent Receipt</div>
          <span style={{fontSize:18,color:"var(--mut)",transition:"transform .15s",
            transform:crdpOpen?"rotate(180deg)":"rotate(0)"}}>&#9662;</span>
        </button>
        <div style={{fontSize:12,color:"var(--mut)",marginTop:4,marginBottom:8}}>
          For retirees with 50%+ VA rating. Active duty retirees need 20+ years. Medical (Chapter 61) retirees also need 20+ years. Reserve retirees must be actively receiving retirement pay.
        </div>
        <div style={{marginTop:8}}>
          <div className={"ib "+(elig?"ib-gn":"ib-gd")} style={{fontSize:13}}>
            {elig
              ?`✓ You qualify — ${separationType==="medical"?"medical retiree (20+ yrs)":separationType==="reserve"?"Reserve/Guard drawing pay":"active duty retiree"} with ${vaRating}% VA rating.`
              :separationType==="veteran"
                ?`Veterans without retirement pay are not eligible for CRDP. See CRSC below if you have combat-related injuries.`
                :separationType==="medical"&&yos<20
                  ?`Chapter 61 medical retirees with fewer than 20 years of service do not qualify for CRDP. Your DOD pay is offset dollar-for-dollar by VA comp.${state.combatRelated?" You may qualify for CRSC (combat-related) — apply through your branch.":" If your disability is combat-related, you may qualify for CRSC."} Current YOS: ${fmtYos(yos)}.`
                  :separationType==="reserve"&&!isReserveEligibleNow
                    ?`CRDP eligibility begins when Reserve retirement pay starts at age ${payStartAge}.`
                    :`To qualify: must be a retiree with 50%+ VA rating. Current rating: ${vaRating}%.`}
          </div>
        </div>
        {crdpOpen&&(
          <div style={{marginTop:12,animation:"fu .18s ease-out both"}}>
            <DR label="Pension (net of SBP)" value={fmt(g-sbpC)}/>
            <DR label="VA Compensation" value={fmt(vaM)} color="green" sub="Tax-free"/>
            <hr/>
            <BStat label="Combined Monthly" value={fmt(g-sbpC+vaM)} color={elig?"green":"navy"}
              sub={fmt((g-sbpC+vaM)*12)+"/year"}/>
            {elig&&(
              <div className="ib ib-gn" style={{marginTop:12,fontSize:13}}>
                <strong>CRDP adds {fmt(vaM)}/mo</strong> ({fmt(vaM*12)}/yr) that would have been offset under pre-2004 rules. Over 20 years: <strong>{fmt(vaM*12*20)}</strong>.
              </div>
            )}
            <div style={{marginTop:12,fontSize:13,color:"var(--mut)",lineHeight:1.6}}>
              <strong style={{color:"var(--ink)"}}>CRSC</strong> is for combat/training injuries at any rating. Applied through your branch (HRC, AFPC, etc). You cannot receive both CRDP and CRSC — DFAS pays whichever is higher.
            </div>
          </div>
        )}
      </div>

      {/* ── GI BILL (only if giUsing) ── */}
      {giUsing&&(
        <div className="card">
          <div className="cttl">{giLabelB}</div>
          {isMGIBb?(
            <div>
              <div style={{marginBottom:16}}>
                <BStat label={`Monthly Benefit (2026 rates)`} value={fmt(mhaMonthly)} color="green"
                  sub={giType==="ch30"?`${mgibServiceYears==="3+"?"3+ yrs":"2-3 yrs"} AD · ${MGIB_ENROLL_OPTS.find(o=>o.v===mgibEnroll)?.l||"Full-Time"}`:`Selected Reserve · ${MGIB_ENROLL_OPTS.find(o=>o.v===mgibEnroll)?.l||"Full-Time"}`}/>
              </div>
              <DR label="Monthly Payment" value={fmt(mhaMonthly)} color="green" sub={giTaxNoteB}/>
              <DR label={`Annual (${giMonthsPerYear} mo)`} value={fmt(annualMHA)} color="green"/>
              <div className="ib ib-gd" style={{marginTop:10,fontSize:12}}>MGIB pays directly to you and is taxable income — unlike Post-9/11, which pays tuition to the school and provides a tax-free housing allowance.</div>
              <hr/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <MT label="Lifetime (36 mo)" value={fmt(mhaMonthly*36)} color="navy"/>
                <MT label="Monthly avg" value={fmt(annualMHA/12)} color="green"/>
              </div>
            </div>
          ):(
            <div>
              <div style={{marginBottom:16}}>
                <BStat label="Monthly MHA (2026 rates)" value={fmt(mhaMonthly)} color="green"
                  sub={giOnline
                    ?`Online flat rate x ${giEligPct}% eligibility`
                    :`${fmt(baseRate)} base x ${giEligPct}% elig. x ${(giEnroll*100).toFixed(0)}% enrollment`}/>
              </div>
              <DR label="Monthly MHA" value={fmt(mhaMonthly)} color="green" sub="Tax-free · school months only"/>
              <DR label="Books Stipend" value={fmt(bookStipend)+"/yr"} color="green" sub="Paid at term start"/>
              <DR label={`Annual MHA (${giMonthsPerYear} mo)`} value={fmt(annualMHA)} color="green"/>
              <DR label="Annual Total (MHA + Books)" value={fmt(annualMHA+bookStipend)} color="green"/>
              <hr/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <MT label="Lifetime (4 yr)" value={fmt((annualMHA+bookStipend)*4)} color="navy"/>
                <MT label="Monthly avg" value={fmt((annualMHA+bookStipend)/12)} color="green" sub="incl. books"/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INSURANCE / HEALTHCARE BREAKDOWN ── */}
      <div className="card">
        <div className="cttl">{separationType==="veteran"?"VA Healthcare":"Insurance Premiums"}</div>
        {separationType==="veteran"?(
          <div>
            <div className="ib ib-nv" style={{fontSize:13,marginBottom:12}}>
              <strong>VA Priority Group {vaPG}</strong>: {vaPGInfo.who}
            </div>
            <DR label="Healthcare Copay" value={vaPGInfo.free?"$0":"Varies"} color={vaPGInfo.free?"green":"navy"} sub={vaPGInfo.copay}/>
            <DR label="Healthcare Premium" value="$0" color="green" sub="VA Healthcare has no premium"/>
            <Reveal label="Show All Priority Groups">
              <table className="dt">
                <thead><tr><th>PG</th><th>Who Qualifies</th><th>Copay</th></tr></thead>
                <tbody>{VA_PRIORITY_GROUPS.map(pg=>(
                  <tr key={pg.group} className={pg.group===vaPG?"hi":""}>
                    <td style={{color:"var(--nv)",fontWeight:600}}>{pg.group}</td>
                    <td style={{fontSize:11,fontFamily:"Barlow,sans-serif",color:"var(--mut)"}}>{pg.who}</td>
                    <td style={{fontSize:11,fontFamily:"Barlow,sans-serif"}}>{pg.copay}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Reveal>
          </div>
        ):separationType==="reserve"&&!isReserveEligibleNow?(
          <div>
            <DR label="Health Plan" value={state.reserveHealthType==="trs"?"TRICARE Reserve Select":state.reserveHealthType==="trr"?"TRICARE Retired Reserve":"Civilian/Marketplace"} color="navy"
              sub={state.reserveHealthType==="trs"?TRICARE_RS.note:state.reserveHealthType==="trr"?TRICARE_TRR.note:"ACA marketplace or employer plan"}/>
            <DR label="Monthly Premium" value={fmt(tricarePremium)} color="navy"
              sub={state.tricareFamSize==="family"?"Family":"Individual"}/>
            {state.reserveHealthType==="trr"&&(
              <div className="ib ib-gd" style={{marginTop:10,fontSize:12}}>TRR premiums are significant. Compare with healthcare.gov marketplace plans in your area.</div>
            )}
          </div>
        ):(
          <div>
            <DR label="TRICARE Premium" value={fmt(stdTricarePremium)} color="navy"
              sub={plan.label+(state.tricareFamSize==="family"?" · Family":" · Self")}/>
            {state.tricareplan==="tfl"&&(
              <DR label="Medicare Part B" value={fmt(medicarePremium)} color="navy"
                sub={state.tricareFamSize==="family"?"2 enrollees x $185/mo":"Standard 2026 premium"}/>
            )}
          </div>
        )}
        {state.useVgli&&<DR label="VGLI Premium" value={fmt(Math.round(vgliMo))} color="navy"
          sub={`$${state.vgliCoverage.toLocaleString()} coverage · Age ${state.vgliAge}`}/>}
        {state.otherLifePremium>0&&<DR label="Other Life Insurance" value={fmt(state.otherLifePremium)} color="navy"/>}
        <hr/>
        <BStat label="Total Monthly Premiums" value={fmt(Math.round(totalInsurance))} color="red"
          sub={`$${Math.round(totalInsurance*12).toLocaleString()}/year`}/>

        {state.useVgli&&(
          <Reveal label="Show VGLI Rate Schedule">
            <table className="dt">
              <thead><tr><th>Age</th><th>Rate/$1k</th><th>Your cost/mo</th></tr></thead>
              <tbody>
                {[[29,"Under 30"],[34,"30-34"],[39,"35-39"],[44,"40-44"],[49,"45-49"],
                  [54,"50-54"],[59,"55-59"],[64,"60-64"],[69,"65-69"],[74,"70-74"],[79,"75-79"],[99,"80+"]
                ].map(([bracket,label])=>{
                  const rate=VGLI_RATES[bracket];
                  const mo=Math.round((state.vgliCoverage/1000)*rate);
                  return(
                    <tr key={bracket} className={vgliRate(state.vgliAge)===rate?"hi":""}>
                      <td style={{color:"var(--mut)"}}>{label}</td>
                      <td style={{fontFamily:"IBM Plex Mono, monospace"}}>${rate.toFixed(2)}</td>
                      <td style={{fontFamily:"IBM Plex Mono, monospace",color:"var(--nv)"}}>${mo}/mo</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{fontSize:11,color:"var(--mut)",marginTop:8}}>Source: VA.gov VGLI rate tables · Effective July 1, 2025 · Max $500,000</div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

// ── TAB 3: PLANNING (what-if tools with inputs) ──────────────────────
function EditInMyInfo({label,value,go}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--sub)"}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",color:"var(--mut)"}}>{label}</div>
        <div style={{fontSize:15,fontWeight:600,color:"var(--ink)",marginTop:2}}>{value}</div>
      </div>
      <button onClick={()=>go("myinfo")} style={{background:"none",border:"none",color:"var(--nv)",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
        Edit in My Info &#8594;
      </button>
    </div>
  );
}

// Map states to a default "current city" in COL table
const STATE_DEFAULT_CITY={
  "Alabama":"Birmingham, AL","Alaska":"Anchorage, AK","Arizona":"Phoenix, AZ",
  "Arkansas":"Little Rock, AR","California":"San Diego, CA","Colorado":"Colorado Springs, CO",
  "Connecticut":"Hartford, CT","Delaware":"Dover, DE","Florida":"Jacksonville, FL",
  "Georgia":"Atlanta, GA","Hawaii":"Oahu, HI","Idaho":"Boise, ID",
  "Illinois":"Chicago, IL","Indiana":"Indianapolis, IN","Iowa":"Des Moines, IA",
  "Kansas":"Junction City/Fort Riley, KS","Kentucky":"Louisville, KY","Louisiana":"Baton Rouge, LA",
  "Maine":"Portland, ME","Maryland":"Baltimore, MD","Massachusetts":"Boston, MA",
  "Michigan":"Detroit, MI","Minnesota":"Minneapolis-St. Paul, MN","Mississippi":"Biloxi/Keesler, MS",
  "Missouri":"St. Louis, MO","Montana":"Billings, MT","Nebraska":"Offutt/Omaha, NE",
  "Nevada":"Las Vegas, NV","New Hampshire":"Manchester, NH","New Jersey":"Newark, NJ",
  "New Mexico":"Albuquerque, NM","New York":"New York, NY","North Carolina":"Fayetteville/Fort Liberty, NC",
  "North Dakota":"Fargo, ND","Ohio":"Columbus, OH","Oklahoma":"Oklahoma City, OK",
  "Oregon":"Portland, OR","Pennsylvania":"Philadelphia, PA","Rhode Island":"Providence, RI",
  "South Carolina":"Charleston, SC","South Dakota":"Sioux Falls, SD","Tennessee":"Nashville, TN",
  "Texas":"San Antonio, TX","Utah":"Salt Lake City, UT","Vermont":"Burlington, VT",
  "Virginia":"Hampton Roads/Norfolk, VA","Washington":"Seattle, WA","West Virginia":"Charleston, WV",
  "Wisconsin":"Milwaukee, WI","Wyoming":"Cheyenne, WY",
  "District of Columbia":"Washington DC",
};

// Popular military retirement destinations
const POPULAR_RETIRE_CITIES=["San Antonio, TX","Tampa, FL","Colorado Springs, CO","Virginia Beach, VA","Jacksonville, FL","Clarksville/Fort Campbell, TN","Fayetteville/Fort Liberty, NC","Killeen/Fort Cavazos, TX","Pensacola, FL","Huntsville, AL","El Paso/Fort Bliss, TX","Savannah, GA"];

function PlanningTab({state,set,go}){
  const {separationType,retType,yos,high3,usePayGrade,payGrade,vaRating,vaDeps,vaChildren,sbp,sbpCoverage,
         selectedState,income,desiredIncome,colFrom,colTo,monthlyIncome,filingStatus,
         medDodPct,tdrl,reservePoints,currentAge,payStartAge,
         giUsing,giType,giEligPct,giSchoolCity,giEnroll,giOnline,
         mgibEnroll,mgibServiceYears}=state;
  const planHysaBal=state.svg_hysaBal!=null?state.svg_hysaBal:0;
  const planHysaMo=state.svg_hysaMo!=null?state.svg_hysaMo:0;
  const planHysaApy=state.svg_hysaApy!=null?state.svg_hysaApy:4.5;
  const planOthBal=state.svg_othBal!=null?state.svg_othBal:0;
  const planOthMo=state.svg_othMo!=null?state.svg_othMo:0;
  const planOthRate=state.svg_othRate!=null?state.svg_othRate:7;
  const planSsaMo=state.plan_ssaMo!=null?state.plan_ssaMo:0;
  const planAge=currentAge>0?currentAge:45;
  const planHysaAt65=pTspBal(planHysaBal,planHysaMo,Math.max(0,65-planAge),0,planHysaApy/100);
  const planHysaDraw=planHysaAt65*0.04/12;
  const planOthAt65=pTspBal(planOthBal,planOthMo,Math.max(0,65-planAge),0,planOthRate/100);
  const planOthDraw=planOthAt65*0.04/12;
  const h3=(usePayGrade&&lookupPay(payGrade,yos))||high3;
  const key=dk(vaDeps);
  const nKids=vaChildren||0;
  const g=pensionBySepType(separationType,retType,yos,h3,medDodPct,tdrl,reservePoints,currentAge,payStartAge);
  const sbpC=sbp?g*(sbpCoverage/100)*0.065:0;
  const netP=g-sbpC;
  const annP=netP*12;
  const vaM=calcVAComp(vaRating,key,nKids);
  const annVA=vaM*12;
  const si=STATES[selectedState]||{ok:true,note:""};
  const medCalcP=separationType==="medical"?medicalPension(yos,h3,medDodPct,tdrl,retType):null;
  const isVAOffsetP=separationType==="medical"&&yos<20&&vaM>0&&g>0&&medCalcP&&!medCalcP.isSeverance;
  const offsetAnnP=isVAOffsetP?Math.max(0,annP-annVA):annP;
  const stTax=calcStateTax(offsetAnnP,si);
  const taxableAnnualP=offsetAnnP+(income||0);
  const {annualTax:fedTaxAnn,effectiveRate:pEffRate,totalDeduction:pDeduction}=calcFederalTax(taxableAnnualP,filingStatus||"single",state.age65Plus,state.spouseAge65Plus);
  const take=offsetAnnP+annVA+income-fedTaxAnn-stTax;
  const friendly=["Texas","Florida","Nevada","Wyoming","South Dakota","Washington","Tennessee","Mississippi","Illinois","Alabama","Hawaii"];

  // COL — auto-derive "from" city based on state if user hasn't changed it
  const autoFrom=STATE_DEFAULT_CITY[selectedState]||colFrom;
  const effectiveFrom=COL[colFrom]?colFrom:autoFrom;
  const fi=COL[effectiveFrom]||100,ti=COL[colTo]||100;
  // Use the user's computed total monthly income as the default if they haven't touched monthlyIncome
  const {monthlyTax:pFedTaxMo}=calcFederalTax(taxableAnnualP,filingStatus||"single",state.age65Plus,state.spouseAge65Plus);
  const stTaxMo=calcStateTax(offsetAnnP,si)/12;
  const atP=netP-pFedTaxMo-stTaxMo;
  const isMGIBp=giType==="ch30"||giType==="ch1606";
  const mhaBase=giOnline?GI_BILL_ONLINE_MHA:(MHA_CITIES[giSchoolCity]||0);
  const mhaMo=giUsing?(isMGIBp?Math.round(mgibMonthly(giType,mgibEnroll,mgibServiceYears)):Math.round(mhaBase*(giEligPct/100)*giEnroll)):0;
  const giLabelP=isMGIBp?(giType==="ch30"?"MGIB-AD (Ch. 30)":"MGIB-SR (Ch. 1606)"):"GI Bill MHA";
  const otherMo=Math.round((income||0)/12);
  const autoMonthly=Math.round(atP+vaM+otherMo+mhaMo);
  const effectiveMonthly=monthlyIncome>0?monthlyIncome:(autoMonthly>0?autoMonthly:5000);
  const adj=effectiveMonthly*(ti/(fi||1)),diff=adj-effectiveMonthly;
  const diffAnn=(adj-effectiveMonthly)*12;
  const cats=[
    {n:"Housing",w:.33,v:1.6},{n:"Groceries",w:.13,v:.6},{n:"Utilities",w:.07,v:.5},
    {n:"Transportation",w:.10,v:.7},{n:"Healthcare",w:.08,v:.6},{n:"Misc.",w:.10,v:.5},
  ];

  // Gap — compute from My Info data automatically
  const totalBase=atP+vaM+otherMo+planHysaDraw+planOthDraw+planSsaMo;
  const totalIncRaw=totalBase+mhaMo;
  const totalInc=Math.max(0,totalIncRaw);
  const gap=desiredIncome-totalInc;
  const sal=gap>0?gap/0.75:0;
  const hr=sal*12/2080;
  const hrPT=sal*12/1040;
  const cov=desiredIncome>0?Math.min(100,(totalInc/desiredIncome)*100):0;
  const gs=[
    {g:"GS-9",r:"$56,111-$72,940",lo:56111},{g:"GS-11",r:"$68,405-$88,926",lo:68405},
    {g:"GS-12",r:"$81,966-$106,549",lo:81966},{g:"GS-13",r:"$97,376-$126,585",lo:97376},
    {g:"GS-14",r:"$115,079-$149,651",lo:115079},{g:"GS-15",r:"$135,435-$176,300",lo:135435},
  ];

  const section=state.planSection||"taxes";
  const setSection=v=>set("planSection",v);
  const [colNudgeDismissed,setColNudgeDismissed]=useState(false);
  const [gapNudgeDismissed,setGapNudgeDismissed]=useState(false);

  // ── Analytics ──
  const prevCOL=useRef(null);
  useEffect(()=>{
    const k2=effectiveFrom+"|"+colTo;
    if(section==="col"&&effectiveFrom!==colTo&&k2!==prevCOL.current){
      prevCOL.current=k2;
      track("COL City Compared",{city_from:effectiveFrom,city_to:colTo,index_difference:ti-fi});
    }
  },[section,effectiveFrom,colTo,fi,ti]);

  const prevGap=useRef(null);
  useEffect(()=>{
    const k2=desiredIncome+"|"+totalInc;
    if(section==="gap"&&desiredIncome>0&&k2!==prevGap.current){
      prevGap.current=k2;
      track("Income Gap Calculated",{target_income:r100(desiredIncome),total_benefits:r100(totalInc),gap_amount:r100(gap),salary_needed:r100(sal*12)});
    }
  },[section,desiredIncome,totalInc,gap,sal]);

  // Auto-sync colFrom to state when state changes
  const prevSt=useRef(selectedState);
  useEffect(()=>{
    if(selectedState!==prevSt.current){
      prevSt.current=selectedState;
      const mapped=STATE_DEFAULT_CITY[selectedState];
      if(mapped&&COL[mapped]) set("colFrom",mapped);
    }
  },[selectedState]);

  return(
    <div className="fu">
      <div className="sh2"><h2>Planning Tools</h2><p>Explore taxes, cost of living, and income gap scenarios.</p></div>

      {/* Sub-nav */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:18}}>
        {[{id:"taxes",l:"Taxes"},{id:"col",l:"Cost of Living"},{id:"gap",l:"Income Gap"}].map(s=>(
          <button key={s.id} className={"tb"+(section===s.id?" on":"")}
            style={{width:"100%",fontSize:14,padding:"12px 8px",position:"relative"}}
            onClick={()=>setSection(s.id)}>
            {s.l}
            {s.id==="col"&&!colNudgeDismissed&&section!=="col"&&<span style={{position:"absolute",top:4,right:8,width:6,height:6,borderRadius:"50%",background:"var(--gn)"}}/>}
            {s.id==="gap"&&!gapNudgeDismissed&&section!=="gap"&&<span style={{position:"absolute",top:4,right:8,width:6,height:6,borderRadius:"50%",background:"var(--gn)"}}/>}
          </button>
        ))}
      </div>

      {/* Nudge banner for COL/Gap when on Taxes tab */}
      {section==="taxes"&&!colNudgeDismissed&&!gapNudgeDismissed&&(
        <div style={{background:"var(--gnb)",border:"1px solid rgba(90,158,111,.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <span style={{fontSize:13,color:"var(--gn)",lineHeight:1.4}}>Try <strong style={{cursor:"pointer"}} onClick={()=>{setSection("col");setColNudgeDismissed(true);}}>Cost of Living</strong> and <strong style={{cursor:"pointer"}} onClick={()=>{setSection("gap");setGapNudgeDismissed(true);}}>Income Gap</strong> — they use your My Info data automatically.</span>
          <button onClick={()=>{setColNudgeDismissed(true);setGapNudgeDismissed(true);}} style={{background:"none",border:"none",color:"var(--gn)",fontSize:16,cursor:"pointer",flexShrink:0,padding:4}}>&#10005;</button>
        </div>
      )}

      {/* ── TAXES ── */}
      {section==="taxes"&&(
        <div>
          <div className="card">
            <div className="cttl">Location & Income</div>
            <EditInMyInfo label="State of Residence" value={selectedState} go={go}/>
            <EditInMyInfo label="Other Annual Income" value={income>0?fmt(income):"$0"} go={go}/>
            <div style={{marginTop:12}} className={"ib "+(si.ok?"ib-gn":"ib-rd")}><strong>{selectedState}:</strong> {si.label||si.note}</div>
          </div>
          <div className="card">
            <div className="cttl">Annual Tax Breakdown <span style={{fontSize:11,color:"var(--mut)",fontWeight:400}}>· 2026 IRS figures</span></div>
            <DR label={isVAOffsetP?"Pension (after VA offset)":"Pension Income"} value={fmt(isVAOffsetP?offsetAnnP:annP)}/>
            {isVAOffsetP&&<div className="ib ib-gd" style={{fontSize:11,marginBottom:8}}>DOD pay offset dollar-for-dollar by VA comp (YOS &lt; 20). You receive the higher of the two.</div>}
            <DR label="VA Compensation" value={fmt(annVA)} color="green" sub="Always tax-free"/>
            {income>0&&<DR label="Other Income" value={fmt(income)}/>}
            <DR label="Est. Federal Tax" value={`-${fmt(fedTaxAnn)}`} color="red" sub={taxableAnnualP>0?`${(pEffRate*100).toFixed(1)}% effective · ${FILING_STATUS_LABELS[filingStatus||"single"]||"Single"} · $${(pDeduction||16100).toLocaleString()} std. deduction`:"No taxable income"}/>
            <DR label={`State Tax — ${selectedState}`} value={si.ok?"Exempt":`-${fmt(stTax)}`} color={si.ok?"green":"red"} sub={si.ok?(si.label||"No state tax on your pension"):(si.label||`${si.rate}% rate`)}/>
            <hr/>
            <BStat label="Total Annual Take-Home" value={fmt(take)} color="green" sub={`${fmt(take/12)}/month after all taxes`}/>
          </div>
          <div className="card">
            <div className="cttl">Long-Term State Tax Impact</div>
            <p style={{fontSize:14,color:"var(--mut)",lineHeight:1.6}}>
              {si.ok
                ?<>Living in <strong style={{color:"var(--ink)"}}>{selectedState}</strong> saves you roughly <strong style={{color:"var(--gn)"}}>{fmt(annP*0.05)}/year</strong> compared to a 5% state. Over 20 years: <strong style={{color:"var(--gn)"}}>{fmt(annP*0.05*20)}</strong> stays with you.</>
                :<>Moving to a tax-exempt state could save <strong style={{color:"var(--gn)"}}>{fmt(stTax)}/year</strong>. Over 20 years: <strong style={{color:"var(--gn)"}}>{fmt(stTax*20)}</strong>.</>}
            </p>
          </div>
          <Reveal label="Show Tax-Friendly States">
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {friendly.map(s=><span key={s} className="chip" onClick={()=>set("selectedState",s)}>{s}</span>)}
            </div>
          </Reveal>
        </div>
      )}

      {/* ── COST OF LIVING ── */}
      {section==="col"&&(
        <div>
          {/* Hero summary card — shows result immediately */}
          <div className="card" style={{borderLeft:diff>0?"3px solid var(--rd)":"3px solid var(--gn)"}}>
            <div style={{fontSize:15,color:"var(--ink)",lineHeight:1.6,fontWeight:500}}>
              {effectiveFrom===colTo?(
                <span>Select two different cities to compare cost of living.</span>
              ):diff>0?(
                <span>Your <strong style={{fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(effectiveMonthly)}/mo</strong> goes <strong style={{color:"var(--rd)"}}>{Math.abs(((ti-fi)/fi)*100).toFixed(0)}% less far</strong> in {colTo.split(",")[0]} than {effectiveFrom.split(",")[0]}. You'd need <strong style={{fontFamily:"'IBM Plex Mono',monospace",color:"var(--rd)"}}>{fmt(Math.abs(diff))}/mo more</strong> to maintain your lifestyle.</span>
              ):(
                <span>Your <strong style={{fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(effectiveMonthly)}/mo</strong> goes <strong style={{color:"var(--gn)"}}>{Math.abs(((ti-fi)/fi)*100).toFixed(0)}% further</strong> in {colTo.split(",")[0]} than {effectiveFrom.split(",")[0]}. You'd save <strong style={{fontFamily:"'IBM Plex Mono',monospace",color:"var(--gn)"}}>{fmt(Math.abs(diff))}/mo</strong>.</span>
              )}
            </div>
            {effectiveFrom!==colTo&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
                <MT label="Monthly Difference" value={(diff>0?"+":"")+fmt(diff)} color={diff>0?"red":"green"} sub="per month"/>
                <MT label="Annual Impact" value={(diffAnn>0?"+":"")+fmt(diffAnn)} color={diffAnn>0?"red":"green"} sub="per year"/>
              </div>
            )}
          </div>

          <div className="card">
            <div className="cttl">Compare Cities</div>
            <SF label="Where You Are Now" value={effectiveFrom} onChange={v=>set("colFrom",v)} options={Object.keys(COL).sort()}
              hint={`Auto-set from your state (${selectedState}). Change anytime.`}/>
            <SF label="Where You're Considering" value={colTo} onChange={v=>set("colTo",v)} options={Object.keys(COL).sort()}/>
            <NF label="Your Monthly Income" value={effectiveMonthly}
              onChange={v=>set("monthlyIncome",v)} pre="$" step={100}
              hint={autoMonthly>0?`Auto-filled from your benefits (${fmt(autoMonthly)}/mo). Adjust if needed.`:"Enter your expected monthly income."}/>

            {/* Popular cities quick-picks */}
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--fnt)",marginBottom:8}}>Popular Retirement Cities</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {POPULAR_RETIRE_CITIES.filter(c=>c!==effectiveFrom).slice(0,8).map(c=>(
                  <span key={c} className={"chip"+(c===colTo?" g":"")} onClick={()=>set("colTo",c)}>{c.split(",")[0]}</span>
                ))}
              </div>
            </div>
          </div>

          {effectiveFrom!==colTo&&(
            <div className="card">
              <div className="cttl">Breakdown by Category</div>
              {cats.map(({n,w,v})=>{
                const d=fi>0?((ti-fi)/fi)*v*effectiveMonthly*w:0;
                return(
                  <div key={n} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span style={{color:"var(--mut)"}}>{n}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",color:d>0?"var(--rd)":"var(--gn)",fontWeight:500}}>{d>0?"+":""}{fmt(d)}/mo</span>
                    </div>
                    <PBar value={Math.abs(d)} max={500} color={d>0?"var(--rd)":"var(--gn)"}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INCOME GAP ── */}
      {section==="gap"&&(
        <div>
          {/* ── PRE-RETIREMENT COMPENSATION COMPARISON ── */}
          {(()=>{
            const isEnlisted=payGrade&&payGrade.startsWith("E-");
            const autoBAS=isEnlisted?BAS_2026.enlisted:BAS_2026.officer;
            const effectiveBAS=(state.bas||0)>0?state.bas:autoBAS;
            const basePay=h3;
            const preRetTotal=basePay+(state.bah||0)+effectiveBAS;
            const postRetTotal=totalInc;
            const compGap=postRetTotal-preRetTotal;
            const autoCity=STATE_DEFAULT_CITY[selectedState];
            const suggestedBAH=autoCity?MHA_CITIES[autoCity]||0:0;

            return h3>0&&separationType!=="veteran"?(
              <div style={{marginBottom:14}}>
                {/* True Compensation Gap card */}
                <div className="card" style={{borderLeft:"3px solid var(--nvm)",marginBottom:14}}>
                  <div className="cttl">Pre-Retirement vs Post-Retirement</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                    <MT label="Active Duty Comp" value={fmt(preRetTotal)} color="navy" sub="/mo total"/>
                    <MT label="Retirement Income" value={fmt(postRetTotal)} color="green" sub="/mo after tax"/>
                  </div>
                  <div style={{background:"var(--sub)",borderRadius:10,padding:14,textAlign:"center",marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--fnt)",marginBottom:4}}>True Compensation Drop</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,fontWeight:600,color:compGap>=0?"var(--gn)":"var(--rd)"}}>
                      {compGap>=0?"+":""}{fmt(compGap)}<span style={{fontSize:14,color:"var(--mut)"}}>/mo</span>
                    </div>
                    <div style={{fontSize:12,color:"var(--mut)",marginTop:4}}>{fmt(compGap*12)}/year</div>
                  </div>

                  {/* Breakdown */}
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase",color:"var(--fnt)",marginBottom:6}}>Pre-Retirement Total Comp</div>
                  <DR label="Base Pay" value={fmt(basePay)} sub={usePayGrade?GRADE_LABELS[payGrade]||payGrade:`High-36 avg`}/>
                  <DR label="BAH" value={(state.bah||0)>0?fmt(state.bah):"Not set"} color={(state.bah||0)>0?"ink":"red"} sub="Tax-free allowance"/>
                  <DR label="BAS" value={fmt(effectiveBAS)} sub={`${isEnlisted?"Enlisted":"Officer"} 2026 rate · tax-free`}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--br)"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"var(--ink)"}}>Total Active Comp</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:600,color:"var(--nvm)"}}>{fmt(preRetTotal)}</span>
                  </div>
                  <hr/>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".09em",textTransform:"uppercase",color:"var(--fnt)",marginBottom:6,marginTop:4}}>Post-Retirement Income</div>
                  <DR label="Pension (net)" value={fmt(atP)} color="navy"/>
                  <DR label="VA Compensation" value={fmt(vaM)} color="green" sub="Tax-free"/>
                  {mhaMo>0&&<DR label={giLabelP} value={fmt(mhaMo)} color="green"/>}
                  {otherMo>0&&<DR label="Other Income" value={fmt(otherMo)}/>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--br)"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"var(--ink)"}}>Total Retirement</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:600,color:"var(--gn)"}}>{fmt(postRetTotal)}</span>
                  </div>

                  {/* Link to edit pay in My Info */}
                  <div style={{marginTop:10,textAlign:"center"}}>
                    <button onClick={()=>go("myinfo")} style={{background:"none",border:"1px solid var(--nvm)",borderRadius:8,padding:"10px 20px",
                      color:"var(--nvm)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Barlow,sans-serif"}}>
                      Edit pay details in My Info &#8594;
                    </button>
                  </div>
                </div>

              </div>
            ):null;
          })()}

          {/* Hero result — the answer first */}
          {desiredIncome>0&&(
            <div className="card" style={{borderLeft:gap<=0?"3px solid var(--gn)":"3px solid var(--gd)"}}>
              {gap<=0?(
                <div>
                  <div style={{fontSize:13,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--gn)",marginBottom:8}}>You're Fully Covered</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:600,color:"var(--gn)",lineHeight:1}}>+{fmt(Math.abs(gap))}<span style={{fontSize:16,fontWeight:500}}>/mo</span></div>
                  <div style={{fontSize:14,color:"var(--mut)",marginTop:8,lineHeight:1.5}}>
                    Your benefits exceed your target by <strong style={{color:"var(--gn)"}}>{fmt(Math.abs(gap))}/mo</strong> ({fmt(Math.abs(gap)*12)}/yr). You're in great shape.
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:13,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--gd)",marginBottom:8}}>Additional Income Needed</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:600,color:"var(--ink)",lineHeight:1}}>{fmt(gap*12)}<span style={{fontSize:16,fontWeight:500,color:"var(--mut)"}}>/year</span></div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,color:"var(--mut)",marginTop:4}}>{fmt(gap)}/month</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14}}>
                    <div style={{background:"var(--sub)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--fnt)",marginBottom:4}}>Full-Time</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:600,color:"var(--ink)"}}>{fmt(sal*12)}/yr</div>
                      <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>${hr.toFixed(0)}/hr</div>
                    </div>
                    <div style={{background:"var(--sub)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--fnt)",marginBottom:4}}>Part-Time</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:600,color:"var(--ink)"}}>{fmt(sal*12)}/yr</div>
                      <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>${hrPT.toFixed(0)}/hr</div>
                    </div>
                    <div style={{background:"var(--sub)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--fnt)",marginBottom:4}}>Gross Salary</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:600,color:"var(--ink)"}}>{fmt(sal*12)}</div>
                      <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>est. 25% tax</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coverage bar — prominent */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{fontSize:14,fontWeight:600,color:"var(--ink)"}}>Benefits Coverage</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:600,color:gap<=0?"var(--gn)":cov>70?"var(--gd)":"var(--nv)"}}>{cov.toFixed(0)}%</span>
            </div>
            <div style={{height:12,background:"var(--sub)",borderRadius:100,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",borderRadius:100,transition:"width .45s ease-out",width:`${cov}%`,background:gap<=0?"var(--gn)":cov>70?"var(--gd)":"var(--nv)"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--mut)"}}>
              <span>{fmt(totalInc)}/mo from benefits</span>
              <span>Target: {fmt(desiredIncome)}/mo</span>
            </div>
          </div>

          {/* Benefit breakdown */}
          <div className="card">
            <div className="cttl">Your Benefits (after tax)</div>
            <DR label="Pension (after taxes & SBP)" value={fmt(atP)} color="navy"/>
            <DR label="VA Compensation" value={fmt(vaM)} color="green" sub="Tax-free"/>
            {mhaMo>0&&<DR label={giLabelP} value={fmt(mhaMo)} color="green" sub="School months only"/>}
            {otherMo>0&&<DR label="Other Income" value={fmt(otherMo)} color="ink" sub="Monthly average"/>}
            <hr/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
              <span style={{fontSize:14,fontWeight:600,color:"var(--ink)"}}>Total Monthly</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:600,color:"var(--nvm)"}}>{fmt(totalInc)}</span>
            </div>
            <EditInMyInfo label="Target Take-Home" value={fmt(desiredIncome)} go={go}/>
          </div>

          {gap>0&&(
            <Reveal label="Show GS Pay Reference">
              <table className="dt">
                <thead><tr><th>Grade</th><th>Salary Range</th></tr></thead>
                <tbody>{gs.map(({g,r,lo})=>(
                  <tr key={g} className={sal*12>=lo&&sal*12<lo*1.38?"hi":""}>
                    <td style={{color:"var(--nv)",fontWeight:600}}>{g}</td><td>{r}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Reveal>
          )}
          {gap>0&&<DebriefedGapCard gap={gap}/>}
        </div>
      )}
    </div>
  );
}

// ── TAB 4: PROFILE (all inputs consolidated) ─────────────────────────
function ProfileTab({state,set,isConfigured,go}){
  const {userName,separationType,retType,yos,high3,usePayGrade,payGrade,sbp,sbpCoverage,
         medDodPct,tdrl,reservePoints,currentAge,payStartAge,reserveHealthType,
         vaRating,vaDeps,vaChildren,selectedState,income,desiredIncome,
         giUsing,giType,giEligPct,giSchoolCity,giEnroll,giOnline,giMonthsPerYear,
         mgibEnroll,mgibServiceYears,
         tricareplan,tricareFamSize,tricareGroup,useVgli,vgliCoverage,vgliAge,otherLifePremium}=state;
  const [nameWarn,setNameWarn]=useState("");
  const [confirmReset,setConfirmReset]=useState(false);
  const derivedPay=usePayGrade?lookupPay(payGrade,yos):null;
  const h3Prof=(usePayGrade&&derivedPay)?derivedPay:high3;
  const pensionMo=pensionBySepType(separationType,retType,yos,h3Prof,medDodPct,tdrl,reservePoints,currentAge,payStartAge);

  // ── Analytics ──
  const prevPension=useRef(null);
  useEffect(()=>{
    if(yos>0&&pensionMo>0&&pensionMo!==prevPension.current){
      prevPension.current=pensionMo;
      track("Pension Calculated",{years_of_service:yos,retirement_type:separationType==="veteran"?"none":retType,monthly_amount:r100(pensionMo)});
      try{const c=parseInt(sessionStorage.getItem("milcalc_calc_count")||"0",10);sessionStorage.setItem("milcalc_calc_count",String(c+1));}catch{}
    }
  },[yos,retType,payGrade,separationType,high3,medDodPct,pensionMo]);

  const nKids=vaChildren||0;

  const prevVA=useRef(null);
  useEffect(()=>{
    if(vaRating>0&&vaRating!==prevVA.current){
      prevVA.current=vaRating;
      const vaAmt=calcVAComp(vaRating,dk(vaDeps),nKids);
      track("VA Rating Selected",{rating:vaRating,dependency_status:vaDeps,children:nKids,monthly_amount:r100(vaAmt)});
    }
  },[vaRating,vaDeps,nKids]);

  const prevChildren=useRef(null);
  useEffect(()=>{
    if(vaRating>=30&&nKids>0&&nKids!==prevChildren.current){
      prevChildren.current=nKids;
      const extra=nKids>1?(VA[vaRating]?.ac||0)*(nKids-1):0;
      track("Additional Children Updated",{count:nKids,rating:vaRating,additional_monthly_amount:r100(extra)});
    }
  },[vaRating,nKids]);

  const prevState=useRef(null);
  useEffect(()=>{
    if(selectedState&&selectedState!==prevState.current){
      prevState.current=selectedState;
      const si=STATES[selectedState]||{ok:true};
      track("State Selected",{state:selectedState,taxes_military_retirement:!si.ok});
    }
  },[selectedState]);

  // Mark as visited on first render
  if(!state._hasVisitedMyInfo) setTimeout(()=>set("_hasVisitedMyInfo",true),0);

  const plan=TRICARE_PLANS[tricareplan];
  const PLAN_OPTS=[
    {v:"prime",l:"TRICARE Prime *"},{v:"select",l:"TRICARE Select"},
    {v:"tfl",l:"TRICARE For Life (65+)"},{v:"select_overseas",l:"TRICARE Select Overseas"},
  ];
  const FAM_OPTS=[{v:"self",l:"Self Only"},{v:"family",l:"Self + Family"}];
  const VGLI_OPTS=[100000,200000,300000,400000,500000].map(v=>({v,l:"$"+v.toLocaleString()}));

  return(
    <div className="fu">
      {!isConfigured&&(
        <div className="ib ib-nv" style={{marginBottom:16,fontSize:14,lineHeight:1.6}}>
          <strong>Welcome!</strong> Fill this out first. Your Dashboard updates instantly as you go.
        </div>
      )}
      <div className="sh2"><h2>My Info</h2><p>Set up once — all numbers update everywhere automatically.</p></div>

      {/* ── NAME (optional) ── */}
      <div className="card">
        <div className="field">
          <label className="flbl">Your Name (optional)</label>
          <input type="text" value={userName||""} maxLength={60}
            placeholder="e.g. John Smith, MSG Ret."
            className="nf"
            style={{fontSize:16,minHeight:48,borderRadius:10,textAlign:"left",padding:"0 14px"}}
            onChange={e=>{
              const v=e.target.value;
              if(v.length>60) return;
              if(v&&!/^[A-Za-z\s\-.']+$/.test(v)){setNameWarn("Letters, spaces, hyphens, periods, and apostrophes only");return;}
              setNameWarn("");
              set("userName",v);
            }}
            onBlur={e=>{const v=(e.target.value||"").trim();set("userName",v);setNameWarn("");}}/>
          {nameWarn&&<div className="fhint" style={{color:"var(--gd)"}}>{nameWarn}</div>}
        </div>
      </div>

      {/* ── SERVICE PROFILE ── */}
      <div className="card">
        <div className="cttl">Service Profile</div>
        <div className="field">
          <label className="flbl">Separation Type</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[{v:"active",l:"Active Duty Retiree"},{v:"medical",l:"Medical Retiree"},{v:"reserve",l:"Reserve / Guard"},{v:"veteran",l:"Veteran (no pension)"}].map(o=>(
              <button key={o.v} className={"tb"+(separationType===o.v?" on":"")}
                style={{width:"100%",fontSize:13,padding:"12px 8px"}}
                onClick={()=>set("separationType",o.v)}>{o.l}</button>
            ))}
          </div>
        </div>

        {separationType==="veteran"&&(
          <div>
            <div className="ib ib-gd" style={{fontSize:13,marginBottom:12}}>No DoD retirement pay. Veterans who separated before qualifying for retirement receive no pension.</div>
            <div className="ib ib-nv" style={{fontSize:13}}>Still eligible for: VA disability compensation, GI Bill benefits, VA Healthcare, and all planning tools in this app.</div>
          </div>
        )}

        {separationType==="medical"&&(
          <div className="ib ib-nv" style={{fontSize:13,marginBottom:12}}>
            <strong>Chapter 61 Medical Retirement.</strong> PDRL (DoD ≥ 30% or YOS ≥ 20): pay = higher of (DoD disability %) or (YOS × {retType==="BRS"?"2.0":"2.5"}%) × High-36, capped at 75%. TDRL (DoD &lt; 30%, YOS &lt; 20): 50% × High-36 minimum. Below that: severance only.
          </div>
        )}

        {separationType==="reserve"&&(
          <div className="ib ib-nv" style={{fontSize:13,marginBottom:12}}>
            Reserve/Guard retirement needs 20 qualifying years (50+ points/year). Pay = (Total Points ÷ 360) × {retType==="BRS"?"2.0":"2.5"}% × High-36 avg. Starts at age 60 (or earlier with qualifying active service).
          </div>
        )}

        {separationType!=="veteran"&&(
          <TG label="Retirement System" value={retType} onChange={v=>set("retType",v)}
            options={separationType==="medical"?[{v:"High-3",l:"High-3 (High-36)"},{v:"BRS",l:"BRS"}]:[{v:"High-3",l:"High-3 (High-36)"},{v:"BRS",l:"BRS"},{v:"REDUX",l:"REDUX"}]}
            hint={{
              "High-3":"High-3 and High-36 are the same system \u2014 average of your highest 36 consecutive months of base pay. 2.5%/yr multiplier.",
              "BRS":"Blended Retirement \u2014 2.0%/yr + TSP matching up to 5%. Applies to those who opted in or entered after Jan 1, 2018.",
              "REDUX":"$30k CSB at 15 yrs. 40% at 20 yrs + 3.5%/yr thereafter. Rare \u2014 most members did not elect this.",
            }[retType]}/>
        )}

        {(separationType==="active"||separationType==="medical")&&(
          <NF label={separationType==="medical"?"Years of Service at Separation":"Years of Service"} value={yos} onChange={v=>set("yos",Math.round(v*2)/2)} min={0} max={40} step={0.5} suf="yrs"
            hint={separationType==="medical"?"YOS at time of medical separation — any amount qualifies":"Minimum 20 years for retirement eligibility. Half-year increments supported (e.g. 20.5)."}/>
        )}

        {separationType==="medical"&&(
          <>
            <NF label="DoD Disability Rating %" value={medDodPct} onChange={v=>set("medDodPct",v)} min={0} max={100} step={10} suf="%"
              hint="Rating from Physical Evaluation Board (PEB) — separate from your VA rating"/>
            <TG label="Disability Status" value={tdrl?"tdrl":"pdrl"} onChange={v=>set("tdrl",v==="tdrl")}
              options={[{v:"pdrl",l:"Permanent (PDRL)"},{v:"tdrl",l:"Temporary (TDRL)"}]}
              hint={tdrl?"TDRL applies a minimum 50% multiplier while condition is re-evaluated":"Permanently retired — final disability rating applies"}/>
            <TG label="Combat-Related Disability?" value={state.combatRelated?"y":"n"} onChange={v=>set("combatRelated",v==="y")}
              options={[{v:"n",l:"No"},{v:"y",l:"Yes (CRSC eligible)"}]}
              hint="Combat-Related Special Compensation (CRSC) is payable concurrently with VA compensation. Apply through your branch of service."/>
            {(()=>{
              const mp=medicalPension(yos,h3Prof,medDodPct,tdrl,retType);
              if(mp.isTDRL) return(
                <div className="ib ib-gd" style={{fontSize:12,marginTop:8}}>
                  Placed on TDRL — minimum 50% rating applied. Reassessed every 18 months, max 5 years. May be moved to PDRL or separated with severance.
                </div>
              );
              if(mp.isSeverance) return(
                <div className="ib ib-rd" style={{fontSize:12,marginTop:8}}>
                  Not eligible for retirement pay — severance pay only. Severance = 2 × monthly base pay × YOS = <strong>{fmt(mp.severancePay)}</strong> (one-time).
                </div>
              );
              return null;
            })()}
            {yos<20&&vaRating>0&&!medicalPension(yos,h3Prof,medDodPct,tdrl,retType).isSeverance&&(
              <div className="ib ib-gd" style={{fontSize:12,marginTop:8}}>
                <strong>VA Offset:</strong> With fewer than 20 YOS, your DoD retirement pay is offset dollar-for-dollar by VA compensation. You receive the higher of the two, not both.
                {state.combatRelated&&<><br/><strong style={{color:"var(--gn)"}}>CRSC:</strong> You may be eligible for Combat-Related Special Compensation, which IS payable concurrently with VA compensation. Apply through your branch of service.</>}
              </div>
            )}
          </>
        )}

        {separationType==="reserve"&&(
          <>
            <NF label="Total Career Retirement Points" value={reservePoints} onChange={v=>set("reservePoints",Math.round(v))} min={50} max={14400} step={50} suf="pts"
              hint="Find your total points on your RPAS or NGB/ARPC statement. Typical: 48–96 drill pts/yr + 15 membership pts/yr + active duty days."
              warn={reservePoints<4320?"Minimum 4,320 points typically required for reserve retirement (20 qualifying years)":undefined}/>
            {reservePoints>0&&h3Prof>0&&(
              <div className="ib ib-nv" style={{fontSize:12,marginTop:-4,marginBottom:8}}>
                <strong>Equivalent YOS:</strong> {(reservePoints/360).toFixed(1)} years · <strong>Projected pension:</strong> {fmt(reservePensionAmount(reservePoints,h3Prof,retType))}/mo
              </div>
            )}
            <NF label="Current Age" value={currentAge} onChange={v=>set("currentAge",Math.round(v))} min={35} max={80} suf="yrs"/>
            <NF label="Pay Start Age" value={payStartAge} onChange={v=>set("payStartAge",Math.round(v))} min={50} max={60} suf="yrs"
              hint="Default 60. Reduces by 3 months per 90 days of qualifying active duty after Jan 28, 2008. Cannot go below 50."/>
            <NF label="Years of Service (for CRDP)" value={yos} onChange={v=>set("yos",Math.round(v*2)/2)} min={0} max={40} step={0.5} suf="yrs"
              hint="Total creditable years — used for CRDP eligibility (20+ required). Half-year increments supported."/>
          </>
        )}

        {separationType!=="veteran"&&(
          <div className="field">
            <label className="flbl">High-3 / High-36 Monthly Base Pay</label>
            {separationType==="reserve"&&(
              <div className="fhint" style={{marginBottom:8}}>High-36 average is calculated from the 36 months before pay starts (age {payStartAge}), using pay rates at that time.</div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
              <button className={"tb"+((!usePayGrade)?" on":"")} onClick={()=>set("usePayGrade",false)}
                style={{width:"100%",fontSize:14,padding:"12px 8px"}}>Manual Entry</button>
              <button className={"tb"+(usePayGrade?" on":"")} onClick={()=>set("usePayGrade",true)}
                style={{width:"100%",fontSize:14,padding:"12px 8px"}}>By Pay Grade</button>
            </div>
            {usePayGrade?(
              <>
                <div className="field" style={{marginBottom:8}}>
                  <label className="flbl">Pay Grade at Retirement</label>
                  <select value={payGrade} onChange={e=>set("payGrade",e.target.value)}
                    style={{fontSize:16,minHeight:48}}>
                    {GRADE_GROUPS.map(g=>(
                      <optgroup key={g.label} label={`-- ${g.label} --`}>
                        {g.grades.map(gr=>{
                          const pay=lookupPay(gr,yos);
                          return <option key={gr} value={gr} disabled={!pay}>{GRADE_LABELS[gr]}{pay?` — ${fmt(pay)}/mo`:' — N/A at this YOS'}</option>;
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {derivedPay?(
                  <div className="ib ib-nv" style={{fontSize:12}}>
                    <strong>2026 DFAS rate:</strong> {GRADE_LABELS[payGrade]} at {fmtYos(yos)} yrs = <strong>{fmt(derivedPay)}/mo</strong> basic pay.
                  </div>
                ):(
                  <div className="ib ib-gd" style={{fontSize:12}}>{payGrade.endsWith("E")?"O-1E/O-2E/O-3E require 4+ years of prior enlisted service.":"This grade is not available at "+fmtYos(yos)+" years of service."}</div>
                )}
              </>
            ):(
              <NF value={high3} onChange={v=>set("high3",v)} pre="$" min={0} max={20000} step={50}
                hint="Average of your highest 36 consecutive months (High-3 / High-36) of base pay"
                warn={high3>20000?"Double-check \u2014 this seems high for monthly base pay":undefined}/>
            )}
          </div>
        )}

        {separationType!=="veteran"&&<hr/>}
        {separationType!=="veteran"&&<div className="cttl" style={{marginTop:0}}>Survivor Benefit Plan (SBP)</div>}
        {separationType!=="veteran"&&(
          <>
            <TG label="Elect SBP coverage?" value={sbp?"y":"n"} onChange={v=>{set("sbp",v==="y");if(v==="y")track("SBP Calculated",{elected:true,monthly_premium:r100(pensionMo*(sbpCoverage/100)*0.065),survivor_annuity:r100(pensionMo*(sbpCoverage/100)*0.55)});}}
              options={[{v:"n",l:"Not Enrolled"},{v:"y",l:"Enrolled"}]}/>
            {sbp&&(
              <div style={{marginTop:12}}>
                <NF label="Coverage % of Retired Pay" value={sbpCoverage} onChange={v=>set("sbpCoverage",v)} min={0} max={100} step={5} suf="%"
                  hint={`Base amount: ${fmt(pensionMo*(sbpCoverage/100))}/mo of your ${fmt(pensionMo)}/mo pension`}/>
                {pensionMo>0&&(
                  <div style={{background:"var(--sub)",borderRadius:10,padding:14,marginTop:10}}>
                    <DR label="SBP Base Amount" value={fmt(pensionMo*(sbpCoverage/100))+"/mo"} sub={`${sbpCoverage}% of ${fmt(pensionMo)} gross pension`}/>
                    <DR label="Monthly Premium (6.5%)" value={`-${fmt(pensionMo*(sbpCoverage/100)*0.065)}`} color="red" sub="Pre-tax deduction \u2014 reduces your taxable income"/>
                    <DR label="Survivor Annuity (55%)" value={fmt(pensionMo*(sbpCoverage/100)*0.55)+"/mo"} color="green" sub="Paid to your survivor for life"/>
                    <NF label="Retirement Age" value={state.sbpRetireAge||42} onChange={v=>set("sbpRetireAge",Math.round(v))} min={38} max={65} suf="yrs"
                      hint={`Paid-up at age ${Math.max(70,(state.sbpRetireAge||42)+30)} (30 years of payments AND age 70)`}/>
                  </div>
                )}
                <div className="ib ib-gn" style={{marginTop:10,fontSize:12}}>
                  SBP-DIC offset fully eliminated Jan 2023 \u2014 your survivor receives both SBP and VA DIC in full.
                </div>
              </div>
            )}
            {!sbp&&<div className="ib ib-gd" style={{marginTop:10,fontSize:13}}>Without SBP, your pension ends at death \u2014 your surviving spouse receives nothing.</div>}
            {separationType==="reserve"&&(
              <div className="fhint" style={{marginTop:8}}>Reserve Component SBP (RCSBP) elections are made at retirement from the reserve, not when pay starts.</div>
            )}
          </>
        )}
      </div>

      {/* ── LIVE PREVIEW NUDGE ── */}
      {separationType!=="veteran"&&yos>0&&pensionMo>0&&(
        <button onClick={()=>{if(typeof go==="function"){go("dashboard");}}}
          style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",
            padding:"12px 16px",marginBottom:14,
            background:"linear-gradient(135deg,rgba(194,120,42,.12),rgba(194,120,42,.06))",
            border:"1px solid rgba(194,120,42,.25)",borderRadius:10,cursor:"pointer",
            fontFamily:"Barlow,sans-serif",WebkitTapHighlightColor:"transparent"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"var(--nvm)",marginBottom:2}}>Your Est. Pension</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:600,color:"var(--ink)"}}>{fmt(pensionMo)}<span style={{fontSize:13,color:"var(--mut)"}}>/mo gross</span></div>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:"var(--nvm)",whiteSpace:"nowrap"}}>See Dashboard {"\u2192"}</span>
        </button>
      )}

      {/* ── ACTIVE DUTY PAY (BAH / BAS / Special Pays) ── */}
      {separationType!=="veteran"&&(
        <div className="card" id="comp-inputs">
          <div className="cttl">Active Duty Pay</div>
          <div style={{fontSize:13,color:"var(--mut)",marginBottom:14,lineHeight:1.5}}>Enter your current pay to calculate your true retirement income gap</div>

          {/* Base Pay — read-only from pay grade */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--sub)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>Base Pay (Monthly)</div>
              <div style={{fontSize:11,color:"var(--mut)"}}>From {usePayGrade?(GRADE_LABELS[payGrade]||payGrade):"manual entry"} at {fmtYos(yos)} YOS</div>
            </div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:600,color:"var(--nvm)"}}>{fmt(h3Prof)}</div>
          </div>

          <NF label="BAH (Monthly)" value={state.bah||0} onChange={v=>set("bah",v)} pre="$" min={0} max={6000} step={50}
            hint={(()=>{const ac=STATE_DEFAULT_CITY[selectedState];const sb=ac?MHA_CITIES[ac]||0:0;return sb>0?`E-5 w/deps BAH for ${ac}: ${fmt(sb)}. Enter your actual rate.`:"Enter your current monthly BAH";})()}/>
          <NF label="BAS (Monthly)" value={(state.bas||0)>0?state.bas:(payGrade&&payGrade.startsWith("E-")?BAS_2026.enlisted:BAS_2026.officer)} onChange={v=>set("bas",v)} pre="$" min={0} max={1000} step={10}
            hint={`Auto-filled: ${payGrade&&payGrade.startsWith("E-")?"Enlisted":"Officer"} 2026 rate. Adjust if needed.`}/>


          {/* Total active comp summary */}
          {(()=>{
            const isEnl=payGrade&&payGrade.startsWith("E-");
            const effBAS=(state.bas||0)>0?state.bas:(isEnl?BAS_2026.enlisted:BAS_2026.officer);
            const total=h3Prof+(state.bah||0)+effBAS;
            return total>0?(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",marginTop:8,borderTop:"2px solid var(--nvm)"}}>
                <span style={{fontSize:14,fontWeight:700,color:"var(--ink)"}}>Total Active Duty Comp</span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:600,color:"var(--nvm)"}}>{fmt(total)}<span style={{fontSize:12,color:"var(--mut)"}}>/mo</span></span>
              </div>
            ):null;
          })()}
        </div>
      )}

      {/* ── VA DISABILITY ── */}
      <div className="card">
        <div className="cttl">VA Disability</div>
        <SF label="Disability Rating" value={vaRating} onChange={v=>set("vaRating",Number(v))}
          options={[{v:0,l:"None / Not yet rated"},...[10,20,30,40,50,60,70,80,90,100].map(v=>({v,l:`${v}%`}))]}
          hint={vaRating===0&&vaDeps!=="Single"?"0% rating doesn't include dependent compensation":undefined}/>
        <TG label="Dependent Status" value={vaDeps} onChange={v=>{set("vaDeps",v);if(v==="Single"&&nKids>0)set("vaChildren",0);}}
          options={["Single","Spouse","Spouse + Child","Child Only"]}
          hint={vaRating>0&&vaRating<=20?"Dependent compensation not available at this rating":vaRating===0&&vaDeps!=="Single"?"0% rating doesn't include dependent compensation":undefined}/>
        <NF label="Children Under 18" value={nKids} onChange={v=>{
          const intV=Math.round(Math.max(0,Math.min(10,v)));
          set("vaChildren",intV);
          // Auto-adjust dependent status when adding children
          if(intV>0&&vaDeps==="Single")set("vaDeps","Child Only");
          if(intV>0&&vaDeps==="Spouse")set("vaDeps","Spouse + Child");
          if(intV===0&&vaDeps==="Child Only")set("vaDeps","Single");
          if(intV===0&&vaDeps==="Spouse + Child")set("vaDeps","Spouse");
        }} min={0} max={10} step={1}
          hint={vaRating>=30&&nKids>1
            ?`Base rate includes 1 child. ${nKids-1} additional ${nKids-1===1?"child adds":"children add"} ${fmt(VA[vaRating]?.ac||0)}/mo each.`
            :vaRating>=30&&nKids===1
            ?"Included in base rate"
            :undefined}
          warn={vaRating>0&&vaRating<=20&&nKids>0?"Dependent compensation not available at 10-20% rating":undefined}/>
      </div>

      {/* ── LOCATION & INCOME ── */}
      <div className="card">
        <div className="cttl">Location & Income</div>
        <SF label="State of Residence" value={selectedState} onChange={v=>set("selectedState",v)} options={Object.keys(STATES).sort()}/>
        <SF label="Filing Status" value={state.filingStatus||"single"} onChange={v=>set("filingStatus",v)}
          options={[{v:"single",l:"Single"},{v:"mfj",l:"Married Filing Jointly"},{v:"hoh",l:"Head of Household"},{v:"mfs",l:"Married Filing Separately"}]}
          hint={`2026 IRS figures — Standard deduction: $${(STANDARD_DEDUCTION_2026[state.filingStatus||"single"]||16100).toLocaleString()}`}/>
        <TG label="Age 65 or Older?" value={state.age65Plus?"y":"n"} onChange={v=>set("age65Plus",v==="y")}
          options={[{v:"n",l:"Under 65"},{v:"y",l:"65+"}]}
          hint={state.age65Plus?"Additional standard deduction + OBBB senior deduction applied":undefined}/>
        {(state.filingStatus||"single")==="mfj"&&(
          <TG label="Spouse Age 65+?" value={state.spouseAge65Plus?"y":"n"} onChange={v=>set("spouseAge65Plus",v==="y")}
            options={[{v:"n",l:"Under 65"},{v:"y",l:"65+"}]}
            hint={state.spouseAge65Plus?"Additional $1,650 standard deduction for qualifying spouse":undefined}/>
        )}
        <NF label="Other Annual Income" value={income} onChange={v=>set("income",v)} pre="$" min={0} max={600000} step={1000}
          hint="Employment, TSP withdrawals, or other taxable income"/>
        <NF label="Desired Monthly Take-Home" value={desiredIncome} onChange={v=>set("desiredIncome",v)} pre="$" min={0} max={50000} step={100}
          hint="After-tax income target for gap analysis"/>
      </div>

      {/* ── GI BILL ── */}
      <div className="card">
        <div className="cttl">GI Bill</div>
        <TG label="Using the GI Bill?" value={giUsing?"y":"n"} onChange={v=>set("giUsing",v==="y")}
          options={[{v:"n",l:"No / Not yet"},{v:"y",l:"Yes, enrolled"}]}/>
        {giUsing&&(
          <div style={{marginTop:12}}>
            <SF label="GI Bill Type" value={giType}
              onChange={v=>set("giType",v)}
              options={[{v:"post911",l:"Post-9/11 (Ch. 33)"},{v:"ch30",l:"MGIB Active Duty (Ch. 30)"},{v:"ch1606",l:"MGIB Selected Reserve (Ch. 1606)"}]}/>
            {giType==="post911"&&(
              <>
                <SF label="Active Duty Service Time" value={giEligPct}
                  onChange={v=>set("giEligPct",Number(v))}
                  options={ELIG_TIERS.map(t=>({v:t.pct,l:t.label}))}/>
                <TG label="Attendance Mode" value={giOnline?"online":"inperson"}
                  onChange={v=>set("giOnline",v==="online")}
                  options={[{v:"inperson",l:"In-Person / Hybrid"},{v:"online",l:"Online Only"}]}/>
                {!giOnline&&(
                  <SF label="School Location" value={giSchoolCity}
                    onChange={v=>set("giSchoolCity",v)}
                    options={Object.keys(MHA_CITIES).sort()}
                    hint="Select the city closest to your school."/>
                )}
                <SF label="Enrollment Status" value={giEnroll}
                  onChange={v=>set("giEnroll",Number(v))}
                  options={ENROLL_OPTS}/>
              </>
            )}
            {giType==="ch30"&&(
              <>
                <SF label="Active Duty Service" value={mgibServiceYears}
                  onChange={v=>set("mgibServiceYears",v)}
                  options={[{v:"3+",l:"3+ years"},{v:"2-3",l:"2–3 years"}]}/>
                <SF label="Enrollment Status" value={mgibEnroll}
                  onChange={v=>set("mgibEnroll",v)}
                  options={MGIB_ENROLL_OPTS}/>
                <div className="ib ib-gd" style={{marginTop:8,fontSize:12}}>MGIB pays {fmt((MGIB_AD[mgibServiceYears]||MGIB_AD["3+"])[mgibEnroll]||0)}/mo directly to you. This is taxable income.</div>
              </>
            )}
            {giType==="ch1606"&&(
              <>
                <SF label="Enrollment Status" value={mgibEnroll}
                  onChange={v=>set("mgibEnroll",v)}
                  options={MGIB_ENROLL_OPTS}/>
                <div className="ib ib-gd" style={{marginTop:8,fontSize:12}}>MGIB-SR pays {fmt(MGIB_SR[mgibEnroll]||0)}/mo directly to you. This is taxable income.</div>
              </>
            )}
            <NF label={giType==="post911"?"Months of MHA Per Year":"Months Enrolled Per Year"} value={giMonthsPerYear}
              onChange={v=>set("giMonthsPerYear",v)} min={1} max={12} suf="mo"
              hint="Typically 9-10 months (not paid during breaks)"/>
          </div>
        )}
      </div>

      {/* ── CIVILIAN HEALTH INSURANCE ── */}
      <div className="card">
        <div className="cttl">Civilian Health Insurance</div>
        <div style={{fontSize:12,color:"var(--mut)",marginBottom:12}}>
          {separationType==="veteran"?"VA Healthcare covers medical care but not all civilian insurance costs. Estimate your premium below.":"For comparison — retirees typically use TRICARE. Enter $0 if using TRICARE only."}
        </div>
        <div className="field">
          <label className="flbl">Coverage Level</label>
          <div className="tg">
            {[{v:"single",l:"Single"},{v:"family",l:"Family"}].map(o=>(
              <button key={o.v} className={"tb"+((state.civHiDeps||"single")===o.v?" on":"")}
                onClick={()=>{set("civHiDeps",o.v);set("civHiCost",o.v==="family"?1300:450);}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{marginBottom:0}}>
          <label className="flbl">Est. civilian health insurance premium</label>
          <div className="iwrap">
            <span className="ipre">$</span>
            <input className="nf pre" type="number" min={0} value={state.civHiCost!=null?state.civHiCost:0}
              onFocus={e=>e.target.select()}
              onChange={e=>set("civHiCost",Math.max(0,parseInt(e.target.value)||0))}/>
          </div>
          <div className="fhint">Monthly deduction. Default: Single $450/mo · Family $1,300/mo. Enter $0 if covered by TRICARE or employer plan.</div>
        </div>
      </div>

      {/* ── INSURANCE ── */}
      <div className="card">
        <div className="cttl">{separationType==="veteran"?"VA Healthcare":separationType==="reserve"&&currentAge<payStartAge?"Reserve Healthcare":"TRICARE"}</div>
        {separationType==="veteran"?(
          <div>
            <div className="ib ib-nv" style={{fontSize:13,marginBottom:12}}>
              <strong>VA Priority Group {getVAPriorityGroup(vaRating)}</strong>: {VA_PRIORITY_GROUPS[getVAPriorityGroup(vaRating)-1].who}
            </div>
            <DR label="Copays" value={VA_PRIORITY_GROUPS[getVAPriorityGroup(vaRating)-1].free?"$0":"Varies"} color={VA_PRIORITY_GROUPS[getVAPriorityGroup(vaRating)-1].free?"green":"navy"} sub={VA_PRIORITY_GROUPS[getVAPriorityGroup(vaRating)-1].copay}/>
            <div className="fhint" style={{marginTop:8}}>VA Healthcare has no monthly premium. Copays depend on your priority group and whether conditions are service-connected.</div>
          </div>
        ):separationType==="reserve"&&currentAge<payStartAge?(
          <div>
            <TG label="Health Coverage Type" value={reserveHealthType}
              onChange={v=>set("reserveHealthType",v)}
              options={[{v:"trs",l:"TRS ($57.88)"},{v:"trr",l:"TRR ($645.90)"},{v:"civilian",l:"Civilian/ACA"}]}
              hint={reserveHealthType==="trs"?TRICARE_RS.note:reserveHealthType==="trr"?TRICARE_TRR.note:"ACA marketplace or employer plan"}/>
            <SF label="Coverage Level" value={tricareFamSize} onChange={v=>set("tricareFamSize",v)}
              options={FAM_OPTS}/>
            {reserveHealthType==="trs"&&(
              <div className="ib ib-nv" style={{marginTop:8,fontSize:12}}>
                TRS Premium: {fmt(tricareFamSize==="family"?TRICARE_RS.family:TRICARE_RS.individual)}/mo
              </div>
            )}
            {reserveHealthType==="trr"&&(
              <div className="ib ib-gd" style={{marginTop:8,fontSize:12}}>
                TRR Premium: {fmt(tricareFamSize==="family"?TRICARE_TRR.family:TRICARE_TRR.individual)}/mo — compare with healthcare.gov marketplace plans.
              </div>
            )}
          </div>
        ):(
          <div>
            <TG label="Service Entry Group" value={tricareGroup}
              onChange={v=>set("tricareGroup",v)}
              options={[{v:"A",l:"Group A (pre-2018)"},{v:"B",l:"Group B (2018+)"}]}
              hint="Determines your enrollment fee tier."/>
            <SF label="Plan" value={tricareplan} onChange={v=>{
              set("tricareplan",v);
              const p2=TRICARE_PLANS[v]||TRICARE_PLANS.prime;const gr2=p2[`group${tricareGroup||"A"}`]||p2.groupA;
              const cost2=v==="tfl"?0:(gr2[tricareFamSize]||gr2.self);const medB2=v==="tfl"?(tricareFamSize==="family"?370:185):0;
              track("TRICARE Plan Selected",{plan:v,coverage_type:tricareFamSize,monthly_cost:r100(cost2+medB2)});
            }}
              options={PLAN_OPTS}
              hint={plan.note}/>
            {tricareplan==="prime"&&(
              <div className="fhint" style={{marginTop:6,fontSize:11}}>
                * Includes US Family Health Plan (USFHP) — same enrollment fees apply. Available in select regions only.
              </div>
            )}
            {tricareplan!=="tfl"&&(
              <SF label="Coverage Level" value={tricareFamSize} onChange={v=>set("tricareFamSize",v)}
                options={FAM_OPTS}/>
            )}
            {tricareplan==="tfl"&&(
              <div className="ib ib-nv" style={{marginTop:8,fontSize:12}}>
                TRICARE For Life has no premium but requires Medicare Part B ($185/mo per person, 2026).
              </div>
            )}
            {separationType==="medical"&&tricareplan==="prime"&&(
              <div className="ib ib-gn" style={{marginTop:8,fontSize:12}}>
                Your enrollment fee is frozen at the rate when you were classified medically retired in DEERS. Maintain continuous enrollment to preserve this benefit.
              </div>
            )}
            {separationType==="medical"&&tricareplan==="select"&&(
              <div className="ib ib-gn" style={{marginTop:8,fontSize:12}}>
                As a Chapter 61 medical retiree, your TRICARE Select enrollment fee is waived ($0). Per NDAA FY2017 Section 731.
              </div>
            )}
            {(() => {
              const grp=TRICARE_PLANS[tricareplan]||TRICARE_PLANS.prime;
              const gr=grp[`group${tricareGroup||"A"}`]||grp.groupA;
              const cost=tricareplan==="tfl"?0:(gr[tricareFamSize]||gr.self);
              const medB=tricareplan==="tfl"?(tricareFamSize==="family"?370:185):0;
              return cost+medB>0?(
                <div style={{marginTop:8,fontSize:13,color:"var(--mut)"}}>
                  Monthly premium: <strong style={{color:"var(--ink)"}}>{fmt(cost+medB)}/mo</strong> ({fmt((cost+medB)*12)}/yr)
                </div>
              ):null;
            })()}
          </div>
        )}
      </div>

      <div className="card">
        <div className="cttl">Life Insurance</div>
        <TG label="VGLI Enrolled?" value={useVgli?"y":"n"} onChange={v=>set("useVgli",v==="y")}
          options={[{v:"y",l:"Yes"},{v:"n",l:"No"}]}/>
        {useVgli&&(<>
          <SF label="Coverage Amount" value={vgliCoverage} onChange={v=>set("vgliCoverage",Number(v))}
            options={VGLI_OPTS}/>
          <NF label="Your Age" value={vgliAge} onChange={v=>set("vgliAge",v)}
            min={25} max={90} suf="yrs"
            hint="VGLI premiums increase every 5 years."/>
        </>)}
        <hr/>
        <NF label="Other Life Insurance Premium" value={otherLifePremium}
          onChange={v=>set("otherLifePremium",v)}
          pre="$" suf="/mo"
          hint="Any other term or whole life policy premiums"/>
      </div>

      {/* ── RESET ── */}
      <div style={{marginTop:24,textAlign:"center"}}>
        {!confirmReset?(
          <button onClick={()=>setConfirmReset(true)}
            style={{background:"none",border:"none",color:"var(--mut)",fontSize:13,cursor:"pointer",textDecoration:"underline",padding:8}}>
            Reset all data
          </button>
        ):(
          <div className="card" style={{textAlign:"center",padding:20}}>
            <p style={{fontSize:14,color:"var(--rd)",fontWeight:600,marginBottom:12}}>Are you sure? This clears all your numbers.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>{try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(TAB_KEY);}catch{}window.location.reload();}}
                style={{background:"var(--rd)",color:"var(--ink)",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Yes, reset everything
              </button>
              <button onClick={()=>setConfirmReset(false)}
                style={{background:"var(--sub)",color:"var(--ink)",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUPPORT SCREEN ────────────────────────────────────────────────────
const FAQ_ITEMS=[
  {q:"How accurate are MilCalc\u2019s estimates?",a:"MilCalc uses current pay tables, 2026 tax brackets, and published TRICARE premium rates to produce estimates. These are planning estimates, not guarantees. Your actual benefits will be determined by your branch of service, DFAS, the VA, and other government agencies. Always verify final numbers with your finance office or a VSO before making major financial decisions."},
  {q:"Does MilCalc store my personal or financial data?",a:"No. MilCalc stores only your most recent inputs locally on your device so you don\u2019t have to re-enter them each time. This data never leaves your device. We have no servers, no accounts, and no cloud sync."},
  {q:"What retirement systems does MilCalc support?",a:"MilCalc supports Active Duty retirement (Legacy High-3 and BRS), Medical separation, Reserve/Guard retirement (points-based), and Veteran estimates (VA compensation without retirement pay)."},
  {q:"How is CRDP eligibility determined?",a:"CRDP is available to retirees with 20+ qualifying years of service AND a VA disability rating of 50% or higher. If you qualify, CRDP eliminates the VA waiver and lets you receive both your full retirement pay and full VA compensation simultaneously."},
  {q:"My state isn\u2019t showing a tax exemption \u2014 is that correct?",a:"MilCalc includes confirmed state-level exemptions for military retirement pay. If your state recently changed its policy, email us and we\u2019ll get it corrected quickly."},
  {q:"How do I clear my saved data?",a:"Android: Settings \u2192 Apps \u2192 MilCalc \u2192 Clear Data. iOS: Delete and reinstall the app."},
  {q:"I found a calculation error. How do I report it?",a:"Email support@getdebriefed.co with subject \u201CCalculation Error.\u201D Include your inputs (pay grade, YOS, VA rating, filing status, state) and what you believe the correct result should be."},
  {q:"Will MilCalc add TSP projections or savings planning?",a:"TSP and long-term savings projections are on the roadmap for a future version. Let us know at support@getdebriefed.co \u2014 user demand helps us prioritize."},
];

function SupportScreen({onClose}){
  const [open,setOpen]=useState(null);
  const [fbCat,setFbCat]=useState("General Feedback");
  const [fbMsg,setFbMsg]=useState("");
  const [fbName,setFbName]=useState("");
  const [fbEmail,setFbEmail]=useState("");
  const [fbSent,setFbSent]=useState(false);
  const submitFeedback=()=>{
    if(!fbMsg.trim()) return;
    const subject=encodeURIComponent(`MilCalc Feedback \u2014 ${fbCat}`);
    const body=encodeURIComponent(`Category: ${fbCat}\r\nMessage: ${fbMsg}\r\nName: ${fbName||"Not provided"}\r\nEmail: ${fbEmail||"Not provided"}`);
    window.location.href=`mailto:support@getdebriefed.co?subject=${subject}&body=${body}`;
    track("Feedback Submitted",{category:fbCat,has_email:!!fbEmail.trim()});
    setFbSent(true);
  };
  return(
    <div className="modal-screen">
      <div className="modal-hdr">
        <button className="modal-back" onClick={onClose} aria-label="Close">&larr;</button>
        <div className="modal-htxt">Support</div>
      </div>
      <div className="modal-body">
        <div className="sup-hero">
          <h2>Support</h2>
          <p>Questions about your calculations? We&rsquo;ve got you.</p>
        </div>

        {/* ── FEEDBACK FORM ── */}
        <div className="fb-form">
          <div className="sup-contact-lbl">Send Feedback</div>
          {fbSent?(
            <div className="fb-success">Thanks &mdash; we read every submission.</div>
          ):(
            <>
              <label className="fb-label">Category</label>
              <select className="fb-select" value={fbCat} onChange={e=>setFbCat(e.target.value)}>
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Data Correction</option>
                <option>General Feedback</option>
              </select>
              <label className="fb-label">Message</label>
              <textarea className="fb-textarea" value={fbMsg} onChange={e=>setFbMsg(e.target.value)}
                placeholder="Tell us what's on your mind..." required/>
              <label className="fb-label">Name<span className="opt">(optional)</span></label>
              <input className="fb-input" value={fbName} onChange={e=>setFbName(e.target.value)}
                placeholder="Your name"/>
              <label className="fb-label">Email<span className="opt">(optional)</span></label>
              <input className="fb-input" type="email" value={fbEmail} onChange={e=>setFbEmail(e.target.value)}
                placeholder="your@email.com"/>
              <button className="fb-submit" onClick={submitFeedback} disabled={!fbMsg.trim()}>Submit Feedback</button>
            </>
          )}
        </div>

        <div className="sup-contact">
          <div className="sup-contact-lbl">Email Support Directly</div>
          <div className="sup-contact-email">support@getdebriefed.co</div>
          <div className="sup-contact-note">Typically respond within 1&ndash;2 business days</div>
          <a className="sup-contact-btn" href="mailto:support@getdebriefed.co?subject=MilCalc%20Support">Send Email</a>
        </div>
        <div className="faq-title">Frequently Asked Questions</div>
        {FAQ_ITEMS.map((f,i)=>(
          <div className="faq-item" key={i}>
            <button className={"faq-q"+(open===i?" open":"")} onClick={()=>setOpen(open===i?null:i)}>
              <span>{f.q}</span>
              <span>+</span>
            </button>
            {open===i&&<div className="faq-a">{f.a}</div>}
          </div>
        ))}
        <div className="modal-footer">
          <p>MilCalc v{APP_VERSION}</p>
          <p>Not affiliated with the U.S. Department of Defense, DFAS, or the Department of Veterans Affairs.</p>
        </div>
      </div>
    </div>
  );
}

// ── PRIVACY SCREEN ───────────────────────────────────────────────────
const PRIVACY_SECTIONS=[
  {num:"01",title:"Overview",body:"MilCalc is a military pay and retirement calculator. We built it with a privacy-first philosophy. We do not have a server backend that receives your data. There are no accounts, no sign-in, and no cloud sync. Everything stays on your device."},
  {num:"02",title:"Data We Do Not Collect",body:"MilCalc does not collect:",list:["Name, email, phone, or contact info","Military service records or rank","Social Security numbers","Financial data or income figures you enter","Health or VA disability information","Location data or device identifiers","Usage analytics or behavioral tracking data"]},
  {num:"03",title:"Local Storage",body:"MilCalc uses local storage (key: milcalc_state) to save your most recent inputs. This data never leaves your device, is not accessible to us or any third party, and can be cleared by uninstalling the app or clearing app data in device settings."},
  {num:"04",title:"Analytics & Tracking",body:"MilCalc does not use analytics SDKs, crash reporting tools, advertising identifiers, or behavioral tracking. No ads. No network requests for data collection."},
  {num:"05",title:"Third-Party Services",body:"MilCalc does not integrate with third-party data services or advertising networks. The app is distributed through the App Store and Google Play, which have their own privacy policies independent of MilCalc."},
  {num:"06",title:"Children\u2019s Privacy",body:"MilCalc is intended for adults \u2014 current and former members of the U.S. military and their families. Not directed at children under 13."},
  {num:"07",title:"Changes to This Policy",body:"We may update this policy. Continued use after changes constitutes acceptance. Given that MilCalc collects no personal data, future changes are unlikely to materially affect your privacy."},
  {num:"08",title:"Contact",body:"Questions? Email: support@getdebriefed.co"},
];

function PrivacyScreen({onClose}){
  return(
    <div className="modal-screen">
      <div className="modal-hdr">
        <button className="modal-back" onClick={onClose} aria-label="Close">&larr;</button>
        <div className="modal-htxt">Privacy Policy</div>
      </div>
      <div className="modal-body">
        <div className="prv-callout">
          MilCalc does not collect, transmit, or store any personal information. All calculations run entirely on your device.
        </div>
        {PRIVACY_SECTIONS.map(s=>(
          <div className="prv-section" key={s.num}>
            <div className="prv-num">{s.num}</div>
            <div className="prv-h">{s.title}</div>
            <p className="prv-p">{s.body}</p>
            {s.list&&<ul className="prv-ul">{s.list.map((li,i)=><li key={i}>{li}</li>)}</ul>}
          </div>
        ))}
        <div style={{textAlign:"center",marginTop:8}}>
          <p style={{fontSize:12,color:"#8a9ab5"}}>Effective date: March 1, 2026 &middot; Last updated: March 2026</p>
        </div>
        <div className="modal-footer">
          <p>MilCalc v{APP_VERSION}</p>
          <p>Not affiliated with the U.S. Department of Defense, DFAS, or the Department of Veterans Affairs.</p>
        </div>
      </div>
    </div>
  );
}

// ── SHARE PAGE (unified: personal link + org builder + blurb + orgs) ──
const SHARE_ORGS=["VFW","DAV","AMVETS","American Legion","MOAA","Military OneSource","USO","r/MilitaryFinance"];
export function SharePage(){
  const [name,setName]=useState("");
  const [copied,setCopied]=useState(false);
  const [orgOpen,setOrgOpen]=useState(false);
  const [orgName,setOrgName]=useState("");
  const [orgCopied,setOrgCopied]=useState(false);
  const slug=name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const hasName=slug.length>0;
  const url=hasName?`https://milcalc.app?utm_source=${slug}&utm_medium=share&utm_campaign=referral`:"https://milcalc.app";
  const orgSlug=orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"partner";
  const orgUrl=`https://milcalc.app?utm_source=${orgSlug}&utm_medium=website&utm_campaign=member-tools`;
  const emailSubject=encodeURIComponent("Free military retirement calculator");
  const emailBody=encodeURIComponent(`Thought you'd find this useful \u2014 MilCalc calculates your pension, VA disability, state taxes, and income gap all in one place. Free, no account needed: ${url}`);
  const tweetText=encodeURIComponent(`Free military retirement calculator \u2014 pension, VA disability, state taxes, income gap, all in one place. No account needed.\n${url}`);
  const copyUrl=()=>{
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>{});
    track("Share Link Generated",{slug:slug||"direct",medium:"share"});
  };
  const copyOrgUrl=()=>{
    navigator.clipboard.writeText(orgUrl).then(()=>{setOrgCopied(true);setTimeout(()=>setOrgCopied(false),2500);}).catch(()=>{});
    track("Share Link Generated",{slug:orgSlug,medium:"website"});
  };
  return(
    <div className="share-page">
      <style>{FONTS}</style>
      <style>{CSS}</style>
      <button className="share-back" onClick={()=>{window.history.pushState({},"","/");window.location.reload();}}>← Back to MilCalc</button>
      <div className="share-hero">
        <h1>Share MilCalc</h1>
        <p>Help a fellow veteran know exactly what they're worth. Generate your personal link below.</p>
      </div>

      <div className="share-flow">
        <input className="share-input" value={name} onChange={e=>{setName(e.target.value);setCopied(false);}}
          placeholder="Your name or handle (optional)"
          aria-label="Your name or handle"/>

        <div className="share-link-box">
          <div className="share-link-url">{hasName?"Your personal link:":"Your link:"}<br/><strong>{url}</strong></div>
          <button className="share-copy-big" onClick={copyUrl}>{copied?"\u2713 Copied!":"Copy Link"}</button>
        </div>

        <div className="share-qr">
          <QRCodeSVG value={url} size={160} bgColor="#ffffff" fgColor="#151c2e" level="M"/>
        </div>

        <div className="share-btns">
          <a className="share-btn" href={`mailto:?subject=${emailSubject}&body=${emailBody}`}>✉ Email</a>
          <a className="share-btn" href={`https://twitter.com/intent/tweet?text=${tweetText}`} target="_blank" rel="noopener noreferrer">𝕏 Twitter</a>
          <a className="share-btn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">in LinkedIn</a>
          <button className="share-btn" onClick={copyUrl}>{copied?"\u2713":"📋"} Copy</button>
        </div>

        <button className="share-org-toggle" onClick={()=>setOrgOpen(!orgOpen)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{transform:orgOpen?"rotate(90deg)":"rotate(0deg)"}}>
            <path d="M4 2l4 4-4 4"/>
          </svg>
          Sharing with an organization?
        </button>
        {orgOpen&&(
          <div className="share-org-section">
            <p>Running a post, chapter, or online community? Pick one or type your own to create a tracked link.</p>
            <div className="share-orgs">
              {SHARE_ORGS.map(o=>(
                <button key={o} className={"share-org"+(orgName===o?" on":"")}
                  onClick={()=>setOrgName(o)}>{o}</button>
              ))}
            </div>
            <input className="share-input" value={orgName} onChange={e=>setOrgName(e.target.value)}
              placeholder="e.g. VFW Post 1234" style={{marginBottom:12}}/>
            <div className="share-org-url">
              <div className="share-link-url"><strong>{orgUrl}</strong></div>
              <button className="share-copy-big" onClick={copyOrgUrl}>{orgCopied?"\u2713 Copied!":"Copy Organization Link"}</button>
            </div>
            <div className="share-blurb">
              &ldquo;MilCalc is a free military retirement calculator covering pension, VA disability, CRDP/CRSC, state taxes, cost of living, and income gap analysis. No account required. No ads.&rdquo;
            </div>
          </div>
        )}
      </div>

      <div className="share-footer">
        <p>MilCalc v{APP_VERSION}</p>
        <p>Part of the <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer">Debriefed</a> product family.</p>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────
// ── GI BILL MHA DATA ───────────────────────────────────────────────────
// (data constants end here — section components replaced by 4-tab architecture above)


// ── TAB 5: STAY VS GO CALCULATOR ──────────────────────────────────────
export function StayVsGoTab({state,set}){
  const SEL = e => e.target.select();
  // Read inputs from global state with safe defaults
  const payGrade    = state.svg_payGrade  || "E-7";
  const currentYos  = state.svg_cYos      != null ? state.svg_cYos   : 10;
  const currentAge  = state.svg_cAge      != null ? state.svg_cAge   : 28;
  const retType     = state.svg_retType   || "High-3";
  const tspBalance  = state.svg_tspBal    != null ? state.svg_tspBal : 0;
  const tspPct      = state.svg_tspPct    != null ? state.svg_tspPct : 5;
  const sepYos      = state.svg_sepYos    != null ? state.svg_sepYos : Math.min(19, Math.max(currentYos+1, 15));
  const targetYos   = state.svg_tgtYos    != null ? state.svg_tgtYos : Math.max(currentYos+1, 20);
  const vaRating    = state.svg_vaRat     || 0;
  const selState    = state.svg_state     || "Texas";
  const civSalary   = state.svg_civSal    != null ? state.svg_civSal  : 60000;
  const civSalBRaw  = state.svg_civSalB   != null ? state.svg_civSalB : 0;
  const hysaBal     = state.svg_hysaBal   != null ? state.svg_hysaBal : 0;
  const hysaContrib = state.svg_hysaMo    != null ? state.svg_hysaMo  : 0;
  const hysaApy     = state.svg_hysaApy   != null ? state.svg_hysaApy : 4.5;
  const othBal      = state.svg_othBal    != null ? state.svg_othBal  : 0;
  const othContrib  = state.svg_othMo     != null ? state.svg_othMo   : 0;
  const othRate     = state.svg_othRate   != null ? state.svg_othRate  : 7;
  const civRetAge   = state.svg_civRetAge != null ? state.svg_civRetAge : 65;
  const svgVaDep    = state.svg_vaDep    || "alone";
  const svgGiUse    = state.svg_giUse    || false;
  const svgGiMonths = state.svg_giMonths != null ? state.svg_giMonths : 36;
  const svgHiDeps   = state.svg_hiDeps   || "single";
  const svgHiCostDefault = svgHiDeps === "family" ? 1300 : 450;
  const svgHiCost   = state.svg_hiCost   != null ? state.svg_hiCost : svgHiCostDefault;

  const isBRS = retType === "BRS";
  const basePay = lookupPay(payGrade, currentYos) || 5000;

  // VA dependency mapping
  const SVG_DEP_MAP = {
    alone:{key:"s",ch:0},spouse:{key:"sp",ch:0},
    sp_1c:{key:"sp",ch:1},sp_2c:{key:"sp",ch:2},sp_3c:{key:"sp",ch:3},
    s_1c:{key:"s",ch:1},s_2c:{key:"s",ch:2},s_3c:{key:"s",ch:3},
  };
  const {key:vaDepsKey,ch:vaDepChildren} = SVG_DEP_MAP[svgVaDep] || SVG_DEP_MAP.alone;
  const va = calcVAComp(vaRating, vaDepsKey, vaDepChildren);

  // BRS government contribution breakdown at current pay (for display/warning)
  const memberAmt = basePay * (tspPct / 100);
  const autoAmt   = isBRS ? basePay * 0.01 : 0;
  const matchT1   = isBRS ? Math.min(memberAmt, basePay * 0.03) : 0;
  const matchT2   = isBRS ? Math.min(Math.max(0, memberAmt - basePay * 0.03), basePay * 0.02) * 0.5 : 0;
  const totalContrib = memberAmt + autoAmt + matchT1 + matchT2;
  const showBrsWarn  = isBRS && tspPct < 5;

  // Constrained slider values
  const safeSep = Math.max(currentYos+1, Math.min(19, sepYos));
  const safeTgt = Math.max(currentYos+1, Math.min(30, targetYos));

  // Ages at separation / retirement
  const sepAge = currentAge + Math.max(0, safeSep - currentYos);
  const retAge = currentAge + Math.max(0, safeTgt - currentYos);

  // ── TSP Projections (stepped: uses longevity pay increases year-by-year) ──
  const tspAt65A = pTspBalStepped(tspBalance, payGrade, currentYos, safeSep, tspPct, isBRS, Math.max(0, 65-sepAge));
  const tspDrawA = tspAt65A * 0.04 / 12;
  const tspAt65B = pTspBalStepped(tspBalance, payGrade, currentYos, safeTgt, tspPct, isBRS, Math.max(0, 65-retAge));
  const tspDrawB = tspAt65B * 0.04 / 12;

  // ── HYSA Projection — contributions stop at civRetAge, then pure growth to 65 ──
  const hysaAt65 = pTspBal(hysaBal, hysaContrib, Math.max(0, civRetAge-currentAge), Math.max(0, 65-civRetAge), hysaApy/100);
  const hysaDraw = hysaAt65 * 0.04 / 12;

  // ── Other Investments Projection — contributions stop at civRetAge, then pure growth to 65 ──
  const othAt65 = pTspBal(othBal, othContrib, Math.max(0, civRetAge-currentAge), Math.max(0, 65-civRetAge), othRate/100);
  const othDraw = othAt65 * 0.04 / 12;

  // ── GI Bill (Scenario A only) — reuse existing GI Bill state from main app ──
  const giMhaBase = state.giOnline ? GI_BILL_ONLINE_MHA : (MHA_CITIES[state.giSchoolCity] || 0);
  const giMhaMo = svgGiUse ? Math.round(giMhaBase * ((state.giEligPct||100) / 100) * (state.giEnroll ?? 1.0)) : 0;
  const giEndAge = sepAge + Math.ceil(svgGiMonths / 12);

  // ── Pension (Scenario B, High-3 or BRS, needs ≥20 YOS) ──
  const retPay    = lookupPay(payGrade, safeTgt) || basePay;
  const pensMult  = isBRS ? 0.02 : 0.025;
  const pensGross = safeTgt >= 20 ? retPay * pensMult * Math.min(safeTgt, 40) : 0;
  const si = STATES[selState] || {ok:true};
  const pensNet = pensGross - calcStateTax(pensGross * 12, si) / 12;

  // Civilian salary for Scenario B (default 80% of A, user-overrideable)
  const civSalB = civSalBRaw > 0 ? civSalBRaw : civSalary * 0.8;
  const civSalBDisplay = civSalBRaw > 0 ? civSalBRaw : Math.round(civSalary * 0.8);

  // ── Monthly totals ──
  // Scenario A: deduct civilian health insurance; Scenario B: TRICARE ($0 deduction)
  const moA_at65  = civSalary/12 + tspDrawA + va + hysaDraw + othDraw - svgHiCost;
  const moB_at65  = pensNet + tspDrawB + va + civSalB/12 + hysaDraw + othDraw;
  const moB_pre65 = pensNet + va + civSalB/12;

  // ── Break-even: cumulative earnings year-by-year ──
  const milAnn   = basePay * 12;
  const chartEnd = Math.max(85, retAge + 25);
  let cumA=0, cumB=0, breakEvenAge=null;
  const chartData=[];
  for(let age=currentAge; age<=chartEnd; age++){
    const civA  = age < civRetAge ? civSalary : 0;
    const civBa = age < civRetAge ? civSalB   : 0;
    const post65 = age >= 65 ? hysaDraw*12 + othDraw*12 : 0;
    // Scenario A: include GI Bill income during entitlement period, subtract health insurance
    const annA = age<sepAge  ? milAnn
               : (svgGiUse && age<giEndAge) ? civA + va*12 + giMhaMo*12 - svgHiCost*12
               : age<65      ? civA + va*12 - svgHiCost*12
               :               civA + va*12 + tspDrawA*12 + post65 - svgHiCost*12;
    const annB = age<retAge  ? milAnn
               : age<65      ? pensNet*12 + va*12 + civBa
               :               pensNet*12 + va*12 + civBa + tspDrawB*12 + post65;
    cumA+=annA; cumB+=annB;
    chartData.push({age,cumA,cumB});
    if(!breakEvenAge && age>retAge && cumB>=cumA) breakEvenAge=age;
  }

  // ── Share modal ──
  const [showShareModal,setShowShareModal]=useState(false);
  const [shareImgURL,setShareImgURL]=useState(null);
  const shareBlobRef=useRef(null);

  const buildCanvas=()=>{
    const C={bg:"#0a1628",card:"#1e3a5f",gold:"#d4a017",goldL:"#f0c14b",mut:"#8a9bb0",lt:"#cbd5e1",wh:"#ffffff",gn:"#5a9e6f",disc:"#111f35"};
    const W=400,PAD=20,RH=36,RG=6,SG=16,RR=8;
    const fmtD=v=>"$"+Math.round(v).toLocaleString();
    const rrFn=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};
    const rowsA=[[`Civilian Salary`,civSalary/12],[`TSP Draw (65+)`,tspDrawA],[`VA Disability`,va],[`HYSA (65+)`,hysaDraw],[`Other Inv. (65+)`,othDraw]].filter(r=>r[1]>0.5);
    const deductA=svgHiCost>0?[[`Health Insurance`,-svgHiCost]]:[];
    const rowsB=[[`Pension (net)`,pensNet],[`TSP Draw (65+)`,tspDrawB],[`VA Disability`,va],[`Civilian Salary`,civSalB/12],[`HYSA (65+)`,hysaDraw],[`Other Inv. (65+)`,othDraw]].filter(r=>r[1]>0.5);
    let h=PAD+30+SG+16+8+(rowsA.length+deductA.length)*(RH+RG)+SG+16+8+rowsB.length*(RH+RG)+SG+46+SG+46+SG+46+SG+52+SG+20+PAD;
    const canvas=document.createElement("canvas");
    canvas.width=W*2; canvas.height=h*2;
    const ctx=canvas.getContext("2d"); ctx.scale(2,2);
    ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,h);
    let y=PAD;
    // Header
    rrFn(ctx,PAD,y,26,26,6); ctx.fillStyle="#0A0E1A"; ctx.fill(); ctx.strokeStyle=C.gold; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=C.goldL; ctx.font="bold 16px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("M",PAD+13,y+13);
    ctx.fillStyle=C.goldL; ctx.font="500 14px system-ui,sans-serif"; ctx.textAlign="left"; ctx.fillText("MilCalc",PAD+34,y+13);
    ctx.fillStyle=C.mut; ctx.font="11px system-ui,sans-serif"; ctx.textAlign="right"; ctx.fillText("Stay vs Go",W-PAD,y+13);
    y+=30+SG;
    const secLbl=(text,sy,col)=>{ctx.fillStyle=col||C.gold;ctx.font="bold 10px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";try{ctx.letterSpacing="1.5px";}catch{}ctx.fillText(text.toUpperCase(),PAD,sy);try{ctx.letterSpacing="0px";}catch{}return sy+16+8;};
    const cardRow=(lbl,val,ry)=>{const isNeg=val<0;rrFn(ctx,PAD,ry,W-PAD*2,RH,RR);ctx.fillStyle=C.card;ctx.fill();ctx.fillStyle=C.lt;ctx.font="12px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(lbl,PAD+12,ry+RH/2);ctx.fillStyle=isNeg?"#f87171":C.wh;ctx.font="500 13px system-ui,sans-serif";ctx.textAlign="right";ctx.fillText((isNeg?"-$":"")+Math.abs(Math.round(val)).toLocaleString()+"/mo",W-PAD-12,ry+RH/2);return ry+RH+RG;};
    y=secLbl(`Scenario A — Leave at ${safeSep} years`,y);
    for(const[l,v] of rowsA) y=cardRow(l,v,y);
    for(const[l,v] of deductA) y=cardRow(l,v,y);
    y+=SG-RG;
    y=secLbl(`Scenario B — Stay to ${safeTgt} years`,y,C.gn);
    for(const[l,v] of rowsB) y=cardRow(l,v,y);
    y+=SG-RG;
    // Total A
    rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.fillStyle=C.card;ctx.fill();ctx.strokeStyle=C.gold;ctx.lineWidth=1.5;rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.stroke();
    ctx.fillStyle=C.gold;ctx.font="500 12px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(`Leave ${safeSep}yrs — Monthly @ 65`,PAD+12,y+23);
    ctx.fillStyle=C.goldL;ctx.font="500 19px system-ui,sans-serif";ctx.textAlign="right";ctx.fillText(fmtD(moA_at65),W-PAD-12,y+23);
    y+=46+SG;
    // Total B
    rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.fillStyle=C.card;ctx.fill();ctx.strokeStyle=C.gn;ctx.lineWidth=1.5;rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.stroke();
    ctx.fillStyle=C.gn;ctx.font="500 12px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(`Stay ${safeTgt}yrs — Monthly @ 65`,PAD+12,y+23);
    ctx.fillStyle=C.wh;ctx.font="500 19px system-ui,sans-serif";ctx.textAlign="right";ctx.fillText(fmtD(moB_at65),W-PAD-12,y+23);
    y+=46+SG;
    // Break-even panel
    const beCol=breakEvenAge?(breakEvenAge<=65?C.gn:"#e09448"):"#f87171";
    const beTxt=breakEvenAge?`Break-even age: ${breakEvenAge}`:`Break-even: not before age ${chartEnd}`;
    rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.fillStyle=C.disc;ctx.fill();ctx.strokeStyle=beCol;ctx.lineWidth=1.5;rrFn(ctx,PAD,y,W-PAD*2,46,RR);ctx.stroke();
    ctx.fillStyle=beCol;ctx.font="bold 14px system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(beTxt,W/2,y+23);
    y+=46+SG;
    // Disclaimer
    rrFn(ctx,PAD,y,W-PAD*2,52,RR);ctx.fillStyle=C.disc;ctx.fill();
    ctx.fillStyle=C.mut;ctx.font="10px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
    const disc="Estimates only. TSP at 7% w/ pay steps. HYSA at user APY. 4% rule (Bengen, 1994). Not financial advice.";
    const mW=W-PAD*2-24;let ln="",lnY=y+10;
    for(const w of disc.split(" ")){const t=ln?ln+" "+w:w;if(ctx.measureText(t).width>mW&&ln){ctx.fillText(ln,PAD+12,lnY);lnY+=14;ln=w;}else ln=t;}
    if(ln)ctx.fillText(ln,PAD+12,lnY);
    y+=52+SG;
    // Footer
    ctx.fillStyle=C.mut;ctx.font="11px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText("Calculate yours free",PAD,y);
    ctx.fillStyle=C.goldL;ctx.font="500 12px system-ui,sans-serif";ctx.textAlign="right";const fT="milcalc.app";ctx.fillText(fT,W-PAD,y);
    const fW=ctx.measureText(fT).width;ctx.strokeStyle=C.goldL;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W-PAD-fW,y+15);ctx.lineTo(W-PAD,y+15);ctx.stroke();
    return canvas;
  };

  const handleShare=()=>{
    setShowShareModal(true);
    track("SVG Share Modal Opened",{});
    requestAnimationFrame(()=>{
      const canvas=buildCanvas();
      canvas.toBlob(blob=>{
        if(!blob)return;
        shareBlobRef.current=blob;
        setShareImgURL(URL.createObjectURL(blob));
      },"image/png");
    });
  };
  const closeShareModal=()=>{
    setShowShareModal(false);
    if(shareImgURL){URL.revokeObjectURL(shareImgURL);setShareImgURL(null);}
    shareBlobRef.current=null;
  };
  const canNativeShare=(()=>{try{return !!navigator.canShare&&navigator.canShare({files:[new File([],"t.png",{type:"image/png"})]});}catch{return false;}})();
  const doShare=async()=>{
    if(!shareBlobRef.current)return;
    const file=new File([shareBlobRef.current],"milcalc-stayvsgo.png",{type:"image/png"});
    if(canNativeShare){
      try{await navigator.share({files:[file],title:"My Stay vs Go — MilCalc"});track("SVG Infographic Shared",{method:"native"});}catch(e){}
    }else{
      const url=URL.createObjectURL(shareBlobRef.current);
      const a=document.createElement("a");a.href=url;a.download="milcalc-stayvsgo.png";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      track("SVG Infographic Shared",{method:"download"});
    }
  };

  // Break-even display
  const beColor=breakEvenAge?(breakEvenAge<=65?"gn":"am"):"rd";
  const beMsg=breakEvenAge
    ?`Staying to ${safeTgt} yrs breaks even with leaving at ${safeSep} yrs at age ${breakEvenAge}`
    :`Staying to ${safeTgt} yrs does not break even before age ${chartEnd}`;

  // Chart geometry
  const CW=320,CH=160,PL=52,PR=12,PT=10,PB=28;
  const iW=CW-PL-PR,iH=CH-PT-PB;
  const maxCum=Math.max(1,...chartData.map(d=>Math.max(d.cumA,d.cumB)));
  const xS=age=>PL+((age-currentAge)/(chartEnd-currentAge))*iW;
  const yS=val=>PT+iH-(val/maxCum)*iH;
  const pathA=chartData.map((d,i)=>`${i===0?"M":"L"}${xS(d.age).toFixed(1)},${yS(d.cumA).toFixed(1)}`).join(" ");
  const pathB=chartData.map((d,i)=>`${i===0?"M":"L"}${xS(d.age).toFixed(1)},${yS(d.cumB).toFixed(1)}`).join(" ");
  const fmtM=v=>v>=1e6?`$${(v/1e6).toFixed(1)}M`:`$${(v/1000).toFixed(0)}k`;
  const yTicks=[0.25,0.5,0.75,1.0].map(p=>maxCum*p);
  const ageTks=[];for(let a=Math.ceil(currentAge/5)*5;a<=chartEnd;a+=5)ageTks.push(a);

  return(
    <div className="fu">
      <div className="sh2">
        <h2>Stay vs Go</h2>
        <p>Compare leaving early against staying to retirement eligibility.</p>
      </div>

      {/* ── INPUTS: YOUR SITUATION ── */}
      <div className="card">
        <div className="cttl">Your Situation</div>
        <div className="field">
          <label className="flbl">Pay Grade</label>
          <select value={payGrade} onChange={e=>set("svg_payGrade",e.target.value)}>
            {GRADE_GROUPS.map(g=>(
              <optgroup key={g.label} label={g.label}>
                {g.grades.map(gd=><option key={gd} value={gd}>{GRADE_LABELS[gd]}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Current YOS</label>
            <input className="nf" type="number" min={1} max={29} value={currentYos}
              onFocus={SEL}
              onChange={e=>set("svg_cYos",Math.min(29,Math.max(1,parseInt(e.target.value)||1)))}/>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Current Age</label>
            <input className="nf" type="number" min={18} max={65} value={currentAge}
              onFocus={SEL}
              onChange={e=>set("svg_cAge",Math.min(65,Math.max(18,parseInt(e.target.value)||18)))}/>
          </div>
        </div>
        <div className="field" style={{marginTop:16,marginBottom:0}}>
          <label className="flbl">Retirement System</label>
          <div className="tg">
            {["High-3","BRS"].map(rt=>(
              <button key={rt} className={"tb"+(retType===rt?" on":"")} onClick={()=>set("svg_retType",rt)}>{rt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── INPUTS: TSP ── */}
      <div className="card">
        <div className="cttl">TSP &amp; Contributions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:showBrsWarn||isBRS?12:0}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Current Balance</label>
            <div className="iwrap">
              <span className="ipre">$</span>
              <input className="nf pre" type="number" min={0} value={tspBalance}
                onFocus={SEL}
                onChange={e=>set("svg_tspBal",Math.max(0,parseInt(e.target.value)||0))}/>
            </div>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Contribution %</label>
            <div className="iwrap">
              <input className="nf suf" type="number" min={0} max={100} step={0.5} value={tspPct}
                onFocus={SEL}
                onChange={e=>set("svg_tspPct",Math.min(100,Math.max(0,parseFloat(e.target.value)||0)))}/>
              <span className="isuf">%</span>
            </div>
          </div>
        </div>
        {showBrsWarn&&(
          <div className="ib ib-rd" style={{fontSize:13,marginBottom:8}}>
            You're leaving free money on the table. Contributing 5% gets you the full government match (+{fmt(Math.round(basePay*0.04))}/mo automatic).
          </div>
        )}
        {isBRS&&(
          <div style={{fontSize:12,color:"var(--mut)",lineHeight:1.5}}>
            Total monthly TSP: {fmt(Math.round(totalContrib))} — {fmt(Math.round(memberAmt))} yours + {fmt(Math.round(autoAmt))} auto + {fmt(Math.round(matchT1+matchT2))} match
          </div>
        )}
      </div>

      {/* ── INPUTS: SEPARATION SCENARIOS ── */}
      <div className="card">
        <div className="cttl">Separation Scenarios</div>
        <div className="field">
          <label className="flbl">
            Leave Early at YOS {safeSep}
            <span style={{color:"var(--mut)",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11}}> · age {sepAge}</span>
          </label>
          <input type="range" min={currentYos+1} max={19} step={1} value={safeSep}
            onChange={e=>set("svg_sepYos",parseInt(e.target.value))}
            style={{width:"100%",accentColor:"var(--nv)",marginTop:4}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--mut)",marginTop:2}}>
            <span>YOS {currentYos+1}</span><span>YOS 19 (max before pension)</span>
          </div>
        </div>
        <div className="field" style={{marginBottom:0}}>
          <label className="flbl">
            Stay to YOS {safeTgt}
            <span style={{color:"var(--mut)",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11}}> · age {retAge}</span>
            {safeTgt<20&&<span style={{color:"var(--rd)",fontWeight:700,marginLeft:6}}>⚠ No pension</span>}
          </label>
          <input type="range" min={currentYos+1} max={30} step={1} value={safeTgt}
            onChange={e=>set("svg_tgtYos",parseInt(e.target.value))}
            style={{width:"100%",accentColor:"var(--gn)",marginTop:4}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--mut)",marginTop:2}}>
            <span>YOS {currentYos+1}</span><span>YOS 30</span>
          </div>
        </div>
      </div>

      {/* ── INPUTS: INCOME ── */}
      <div className="card">
        <div className="cttl">Income Inputs</div>
        <div className="field">
          <label className="flbl">Scenario A — Civilian Salary (if leaving early)</label>
          <div className="iwrap">
            <span className="ipre">$</span>
            <input className="nf pre" type="number" min={0} value={civSalary}
              onFocus={SEL}
              onChange={e=>set("svg_civSal",Math.max(0,parseInt(e.target.value)||0))}/>
          </div>
          <div className="fhint">Annual gross. Used for Scenario A post-separation income.</div>
        </div>
        <div className="field">
          <label className="flbl">Scenario B — Civilian Salary after Military Retirement</label>
          <div className="iwrap">
            <span className="ipre">$</span>
            <input className="nf pre" type="number" min={0} value={civSalBDisplay}
              onFocus={SEL}
              onChange={e=>set("svg_civSalB",Math.max(0,parseInt(e.target.value)||0))}/>
          </div>
          <div className="fhint">Annual gross. Defaults to 80% of Scenario A ({fmt(Math.round(civSalary*0.8/12))}/mo). Override to set your own estimate.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">VA Rating</label>
            <select value={vaRating} onChange={e=>set("svg_vaRat",parseInt(e.target.value))}>
              {[0,10,20,30,40,50,60,70,80,90,100].map(r=><option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">State</label>
            <select value={selState} onChange={e=>set("svg_state",e.target.value)}>
              {Object.keys(STATES).sort().map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {vaRating >= 30 && (
          <div className="field" style={{marginTop:12,marginBottom:0}}>
            <label className="flbl">VA Dependency Status</label>
            <select value={svgVaDep} onChange={e=>set("svg_vaDep",e.target.value)}>
              <option value="alone">Veteran alone</option>
              <option value="spouse">Veteran + spouse</option>
              <option value="sp_1c">Veteran + spouse + 1 child</option>
              <option value="sp_2c">Veteran + spouse + 2 children</option>
              <option value="sp_3c">Veteran + spouse + 3+ children</option>
              <option value="s_1c">Single veteran + 1 child</option>
              <option value="s_2c">Single veteran + 2 children</option>
              <option value="s_3c">Single veteran + 3+ children</option>
            </select>
            <div className="fhint">VA comp: {fmt(Math.round(va))}/mo · Dependency adjustments apply at 30%+.</div>
          </div>
        )}
      </div>

      {/* ── INPUTS: HYSA ── */}
      <div className="card">
        <div className="cttl">HYSA</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Current Balance</label>
            <div className="iwrap">
              <span className="ipre">$</span>
              <input className="nf pre" type="number" min={0} value={hysaBal}
                onFocus={SEL}
                onChange={e=>set("svg_hysaBal",Math.max(0,parseInt(e.target.value)||0))}/>
            </div>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Monthly Contribution</label>
            <div className="iwrap">
              <span className="ipre">$</span>
              <input className="nf pre" type="number" min={0} value={hysaContrib}
                onFocus={SEL}
                onChange={e=>set("svg_hysaMo",Math.max(0,parseInt(e.target.value)||0))}/>
            </div>
          </div>
        </div>
        <div className="field" style={{marginTop:12,marginBottom:0}}>
          <label className="flbl">Expected APY</label>
          <div className="iwrap">
            <input className="nf suf" type="number" min={0} max={20} step={0.1} value={hysaApy}
              onFocus={SEL}
              onChange={e=>set("svg_hysaApy",Math.min(20,Math.max(0,parseFloat(e.target.value)||0)))}/>
            <span className="isuf">%</span>
          </div>
          <div className="fhint">Projected HYSA @ 65: {fmt(Math.round(hysaAt65))} · {fmt(Math.round(hysaDraw))}/mo income (4% rule)</div>
        </div>
      </div>

      {/* ── INPUTS: OTHER INVESTMENTS ── */}
      <div className="card">
        <div className="cttl">Other Investments</div>
        <div style={{fontSize:12,color:"var(--mut)",marginBottom:12}}>Brokerage, Roth IRA, Traditional IRA, etc.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Combined Balance</label>
            <div className="iwrap">
              <span className="ipre">$</span>
              <input className="nf pre" type="number" min={0} value={othBal}
                onFocus={SEL}
                onChange={e=>set("svg_othBal",Math.max(0,parseInt(e.target.value)||0))}/>
            </div>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Monthly Contribution</label>
            <div className="iwrap">
              <span className="ipre">$</span>
              <input className="nf pre" type="number" min={0} value={othContrib}
                onFocus={SEL}
                onChange={e=>set("svg_othMo",Math.max(0,parseInt(e.target.value)||0))}/>
            </div>
          </div>
        </div>
        <div className="field" style={{marginTop:12,marginBottom:0}}>
          <label className="flbl">Expected Annual Return</label>
          <div className="iwrap">
            <input className="nf suf" type="number" min={0} max={30} step={0.1} value={othRate}
              onFocus={SEL}
              onChange={e=>set("svg_othRate",Math.min(30,Math.max(0,parseFloat(e.target.value)||0)))}/>
            <span className="isuf">%</span>
          </div>
          <div className="fhint">Projected balance @ 65: {fmt(Math.round(othAt65))} · {fmt(Math.round(othDraw))}/mo income (4% rule)</div>
        </div>
      </div>

      {/* ── INPUTS: CIVILIAN RETIREMENT ── */}
      <div className="card">
        <div className="cttl">Civilian Retirement</div>
        <div className="field" style={{marginBottom:0}}>
          <label className="flbl">Civilian Retirement Age</label>
          <input className="nf" type="number" min={55} max={75} value={civRetAge}
            onFocus={SEL}
            onChange={e=>set("svg_civRetAge",Math.min(75,Math.max(55,parseInt(e.target.value)||65)))}/>
          <div className="fhint">Civilian salary and investment contributions stop at this age. Balance grows to 65.</div>
        </div>
      </div>

      {/* ── INPUTS: GI BILL (Scenario A only) ── */}
      <div className="card">
        <div className="cttl">GI Bill After Separation <span style={{fontSize:10,fontWeight:400,color:"var(--mut)",textTransform:"none",letterSpacing:0}}>(Scenario A only)</span></div>
        <div className="field">
          <label className="flbl">Using GI Bill after separation?</label>
          <div className="tg">
            {[{v:true,l:"Yes"},{v:false,l:"No"}].map(o=>(
              <button key={String(o.v)} className={"tb"+(svgGiUse===o.v?" on":"")} onClick={()=>set("svg_giUse",o.v)}>{o.l}</button>
            ))}
          </div>
        </div>
        {svgGiUse&&(
          <div className="field" style={{marginBottom:0}}>
            <label className="flbl">Months of entitlement remaining</label>
            <input className="nf" type="number" min={1} max={36} value={svgGiMonths}
              onFocus={SEL}
              onChange={e=>set("svg_giMonths",Math.min(36,Math.max(1,parseInt(e.target.value)||36)))}/>
            {giMhaMo>0
              ?<div className="fhint">GI Bill MHA: {fmt(giMhaMo)}/mo for {svgGiMonths} months — using your school city from GI Bill settings. Go to <em>My Info → GI Bill</em> to change school location.</div>
              :<div className="fhint" style={{color:"var(--gd)"}}>No MHA calculated. Set your GI Bill school city in My Info → GI Bill tab.</div>
            }
          </div>
        )}
      </div>

      {/* ── INPUTS: CIVILIAN HEALTH INSURANCE ── */}
      <div className="card">
        <div className="cttl">Civilian Health Insurance</div>
        <div className="ib ib-nv" style={{fontSize:12,marginBottom:12}}>
          <strong>Scenario A:</strong> Civilian insurance replaces TRICARE. <strong>Scenario B:</strong> TRICARE eligible at retirement ($0).
        </div>
        <div className="field">
          <label className="flbl">Coverage Level</label>
          <div className="tg">
            {[{v:"single",l:"Single ($450/mo)"},{v:"family",l:"Family ($1,300/mo)"}].map(o=>(
              <button key={o.v} className={"tb"+(svgHiDeps===o.v?" on":"")}
                onClick={()=>{set("svg_hiDeps",o.v);set("svg_hiCost",o.v==="family"?1300:450);}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{marginBottom:0}}>
          <label className="flbl">Est. civilian health insurance premium</label>
          <div className="iwrap">
            <span className="ipre">$</span>
            <input className="nf pre" type="number" min={0} value={svgHiCost}
              onFocus={SEL}
              onChange={e=>set("svg_hiCost",Math.max(0,parseInt(e.target.value)||0))}/>
          </div>
          <div className="fhint">Monthly deduction in Scenario A. Override with your actual premium.</div>
        </div>
      </div>

      {/* ── SCENARIO CARDS ── */}
      <div className="cttl" style={{marginBottom:12,marginTop:4}}>Side-by-Side Comparison</div>
      <div className="svgc-cards">
        <div className="svgc-card svgc-card-a">
          <div className="svgc-ttl svgc-ttl-a">Scenario A<br/>Leave at {safeSep} yrs</div>
          <div className="svgc-row"><span className="svgc-rl">Civ. Salary</span><span className="svgc-rv">{fmt(Math.round(civSalary/12))}/mo</span></div>
          {va>0&&<div className="svgc-row"><span className="svgc-rl">VA ({vaRating}%)</span><span className="svgc-rv">{fmt(Math.round(va))}/mo</span></div>}
          {svgGiUse&&giMhaMo>0&&<div className="svgc-row"><span className="svgc-rl" style={{fontSize:11}}>GI Bill MHA ({svgGiMonths} mo)</span><span className="svgc-rv" style={{fontSize:12}}>{fmt(giMhaMo)}/mo</span></div>}
          {tspDrawA>0&&<div className="svgc-row"><span className="svgc-rl">TSP draw (65+)</span><span className="svgc-rv">{fmt(Math.round(tspDrawA))}/mo</span></div>}
          {hysaDraw>0&&<div className="svgc-row"><span className="svgc-rl">HYSA (65+)</span><span className="svgc-rv">{fmt(Math.round(hysaDraw))}/mo</span></div>}
          {othDraw>0&&<div className="svgc-row"><span className="svgc-rl">Other inv. (65+)</span><span className="svgc-rv">{fmt(Math.round(othDraw))}/mo</span></div>}
          {svgHiCost>0&&<div className="svgc-row"><span className="svgc-rl" style={{color:"var(--rd)"}}>Health Ins.</span><span className="svgc-rv" style={{color:"var(--rd)"}}>-{fmt(Math.round(svgHiCost))}/mo</span></div>}
          <div className="svgc-row" style={{borderBottom:"none"}}><span className="svgc-rl" style={{fontSize:11}}>TSP bal @ 65</span><span className="svgc-rv" style={{fontSize:12,color:"var(--mut)"}}>{fmt(Math.round(tspAt65A))}</span></div>
          <div className="svgc-total svgc-total-a">
            <span className="svgc-total-l">Monthly @ 65</span>
            <span className="svgc-total-v">{fmt(Math.round(moA_at65))}</span>
          </div>
        </div>
        <div className="svgc-card svgc-card-b">
          <div className="svgc-ttl svgc-ttl-b">Scenario B<br/>Stay to {safeTgt} yrs</div>
          {pensNet>0
            ?<div className="svgc-row"><span className="svgc-rl">Pension (net)</span><span className="svgc-rv">{fmt(Math.round(pensNet))}/mo</span></div>
            :<div className="svgc-row"><span className="svgc-rl" style={{color:"var(--rd)",fontSize:11}}>No pension (&lt;20 yrs)</span><span className="svgc-rv" style={{color:"var(--rd)"}}>—</span></div>
          }
          {va>0&&<div className="svgc-row"><span className="svgc-rl">VA ({vaRating}%)</span><span className="svgc-rv">{fmt(Math.round(va))}/mo</span></div>}
          {tspDrawB>0&&<div className="svgc-row"><span className="svgc-rl">TSP draw (65+)</span><span className="svgc-rv">{fmt(Math.round(tspDrawB))}/mo</span></div>}
          {hysaDraw>0&&<div className="svgc-row"><span className="svgc-rl">HYSA (65+)</span><span className="svgc-rv">{fmt(Math.round(hysaDraw))}/mo</span></div>}
          {othDraw>0&&<div className="svgc-row"><span className="svgc-rl">Other inv. (65+)</span><span className="svgc-rv">{fmt(Math.round(othDraw))}/mo</span></div>}
          <div className="svgc-row"><span className="svgc-rl">Civ. Salary</span><span className="svgc-rv">{fmt(Math.round(civSalB/12))}/mo</span></div>
          <div className="svgc-row"><span className="svgc-rl" style={{color:"var(--gn)",fontSize:11}}>Health Ins.</span><span className="svgc-rv" style={{color:"var(--gn)",fontSize:12}}>$0 — TRICARE</span></div>
          {pensNet>0&&<div className="svgc-row"><span className="svgc-rl" style={{fontSize:11}}>Before 65</span><span className="svgc-rv" style={{fontSize:12,color:"var(--mut)"}}>{fmt(Math.round(moB_pre65))}/mo</span></div>}
          <div className="svgc-row" style={{borderBottom:"none"}}><span className="svgc-rl" style={{fontSize:11}}>TSP bal @ 65</span><span className="svgc-rv" style={{fontSize:12,color:"var(--mut)"}}>{fmt(Math.round(tspAt65B))}</span></div>
          <div className="svgc-total svgc-total-b">
            <span className="svgc-total-l">Monthly @ 65</span>
            <span className="svgc-total-v">{fmt(Math.round(moB_at65))}</span>
          </div>
        </div>
      </div>

      {/* ── BREAK-EVEN ── */}
      <div className={"svgc-be "+beColor} style={{marginBottom:20}}>
        {breakEvenAge?(
          <>
            <div className="svgc-be-num" style={{color:beColor==="gn"?"var(--gn)":beColor==="am"?"var(--gd)":"var(--rd)"}}>{breakEvenAge}</div>
            <div className="svgc-be-lbl">{beMsg}</div>
            {beColor==="gn"&&<div style={{fontSize:12,color:"var(--gn)",marginTop:6,fontWeight:600}}>Staying is financially favorable — break-even before 65</div>}
            {beColor==="am"&&<div style={{fontSize:12,color:"var(--gd)",marginTop:6}}>Staying breaks even after 65 — consider the time tradeoff carefully</div>}
          </>
        ):(
          <>
            <div className="svgc-be-num" style={{color:"var(--rd)"}}>—</div>
            <div className="svgc-be-lbl">{beMsg}</div>
          </>
        )}
      </div>

      {/* ── CHART ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="cttl" style={{marginBottom:8}}>Cumulative Lifetime Earnings</div>
        <div style={{display:"flex",gap:16,marginBottom:10,fontSize:11,fontWeight:600,flexWrap:"wrap"}}>
          <span style={{color:"var(--nvm)"}}>&#9632; Leave at {safeSep} yrs (A)</span>
          <span style={{color:"var(--gn)"}}>&#9632; Stay to {safeTgt} yrs (B)</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet">
          {yTicks.map((v,i)=>(
            <line key={i} x1={PL} y1={yS(v).toFixed(1)} x2={CW-PR} y2={yS(v).toFixed(1)} stroke="rgba(138,155,181,0.15)" strokeWidth="1"/>
          ))}
          {yTicks.map((v,i)=>(
            <text key={i} x={PL-4} y={(yS(v)+3).toFixed(1)} textAnchor="end" fontSize="9" fill="#8a9ab5">{fmtM(v)}</text>
          ))}
          {ageTks.map(a=>(
            <text key={a} x={xS(a).toFixed(1)} y={CH-8} textAnchor="middle" fontSize="9" fill="#8a9ab5">{a}</text>
          ))}
          <path d={pathA} fill="none" stroke="#c2782a" strokeWidth="2" strokeLinejoin="round"/>
          <path d={pathB} fill="none" stroke="#5a9e6f" strokeWidth="2" strokeLinejoin="round"/>
          {breakEvenAge&&breakEvenAge>=currentAge&&breakEvenAge<=chartEnd&&(
            <>
              <line x1={xS(breakEvenAge).toFixed(1)} y1={PT} x2={xS(breakEvenAge).toFixed(1)} y2={PT+iH} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="4,3"/>
              <text x={(xS(breakEvenAge)+4).toFixed(1)} y={PT+14} fontSize="9" fill="rgba(255,255,255,0.65)">break-even</text>
            </>
          )}
        </svg>
        <div style={{fontSize:11,color:"var(--mut)",marginTop:6,textAlign:"center"}}>Age &#8594;</div>
      </div>

      {/* ── SHARE BUTTON ── */}
      <button onClick={handleShare}
        style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,var(--nv),var(--nvm))",
          color:"var(--ink)",border:"none",borderRadius:10,fontFamily:"Barlow,sans-serif",
          fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:20,
          WebkitTapHighlightColor:"transparent"}}>
        &#x1F4E4; Share My Numbers
      </button>

      {/* ── DISCLAIMER ── */}
      <div style={{background:"var(--sub)",borderRadius:10,padding:14,fontSize:12,color:"var(--mut)",lineHeight:1.6,marginBottom:24}}>
        <strong style={{color:"var(--ink)"}}>Disclaimer:</strong> These projections use historical averages and publicly available pay data. Results are estimates only and not guaranteed. Not financial advice. Actual TSP returns vary. Consult a fee-only financial advisor before making career decisions.
        <br/><br/>
        <em>Assumptions: TSP contributions stop at separation (Scenario A) or retirement (Scenario B), then compound at 7% to age 65. HYSA and other investment contributions stop at civilian retirement age, then compound to 65. Safe withdrawal rate: 4% rule (Bengen, 1994). HYSA at user APY. VA compensation uses 2026 official rates including dependency adjustments. GI Bill MHA uses 2026 DTMO rates. Civilian health insurance deducted from Scenario A; TRICARE covers Scenario B. Pension from DFAS 2026 pay tables. High-3: 2.5% × YOS. BRS: 2.0% × YOS + government match.</em>
      </div>

      {/* ── SHARE MODAL ── */}
      {showShareModal&&createPortal(
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}
          onClick={closeShareModal}>
          <div style={{position:"relative",background:"var(--card)",borderRadius:16,padding:24,maxWidth:420,width:"90%",
              border:"1px solid var(--br)",maxHeight:"85vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <button onClick={closeShareModal}
              style={{position:"absolute",top:12,right:14,background:"none",border:"none",fontSize:18,color:"var(--mut)",cursor:"pointer",lineHeight:1,zIndex:1}}>&#x2715;</button>
            <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",marginBottom:4}}>Share My Numbers</div>
            <div style={{fontSize:13,color:"var(--mut)",marginBottom:16}}>Preview your Stay vs Go infographic.</div>
            <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",border:"1px solid var(--sub)",background:"#0a1628",minHeight:200}}>
              {shareImgURL
                ?<img src={shareImgURL} alt="Stay vs Go infographic" style={{width:"100%",display:"block"}}/>
                :<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"var(--mut)",fontSize:13}}>Generating...</div>}
            </div>
            <button onClick={doShare} disabled={!shareBlobRef.current}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"14px 0",
                background:shareBlobRef.current?"var(--nv)":"var(--sub)",color:"#fff",border:"none",borderRadius:10,
                cursor:shareBlobRef.current?"pointer":"default",fontFamily:"Barlow,sans-serif",fontSize:15,fontWeight:600,
                opacity:shareBlobRef.current?1:.5,transition:"opacity .2s"}}>
              &#x1F4E4; {canNativeShare?"Share":"Download PNG"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function OnboardingScreen({onSelect}){
  const paths=[
    {id:"serving",icon:"\u{1F4AA}",title:"Still Serving",sub:"TSP projector · Pay calculator · Stay vs Go"},
    {id:"transitioning",icon:"\u{1F4CB}",title:"Transitioning",sub:"Retirement calculator · Benefits · Income planning",badge:"Most popular"},
    {id:"retired",icon:"\u{1F396}",title:"Veteran / Retired",sub:"Retirement income · VA updates · Social Security"},
  ];
  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:36,height:36,borderRadius:8,background:"#0A0E1A",border:"1px solid #d4a017",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#f0c14b",flexShrink:0}}>M</div>
        <span style={{fontSize:22,fontWeight:700,color:"#f0c14b",fontFamily:"Barlow,sans-serif",letterSpacing:"-.01em"}}>MilCalc</span>
      </div>
      <div style={{fontSize:22,fontWeight:700,color:"#f0ece4",marginBottom:8,textAlign:"center",fontFamily:"Barlow,sans-serif",lineHeight:1.3}}>Where are you in your service?</div>
      <div style={{fontSize:14,color:"#8a9bb0",marginBottom:28,textAlign:"center",maxWidth:320,lineHeight:1.5}}>We'll show you the tools most relevant to your situation.</div>
      <div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:12}}>
        {paths.map(p=>(
          <button key={p.id} onClick={()=>onSelect(p.id)}
            style={{position:"relative",background:"#1e3a5f",border:"1px solid #2a3a55",borderRadius:14,padding:"18px 20px",
              textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:16,width:"100%",
              WebkitTapHighlightColor:"transparent"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#d4a017";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a3a55";}}>
            {p.badge&&(
              <span style={{position:"absolute",top:10,right:14,background:"#d4a017",color:"#0a1628",fontSize:10,fontWeight:700,
                padding:"2px 8px",borderRadius:20,letterSpacing:"0.04em",textTransform:"uppercase",fontFamily:"Barlow,sans-serif"}}>{p.badge}</span>
            )}
            <span style={{fontSize:28,lineHeight:1,flexShrink:0}}>{p.icon}</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:16,fontWeight:700,color:"#f0ece4",marginBottom:3,fontFamily:"Barlow,sans-serif"}}>{p.title}</div>
              <div style={{fontSize:12,color:"#8a9bb0",lineHeight:1.4}}>{p.sub}</div>
            </div>
            <span style={{marginLeft:"auto",color:"#d4a017",fontSize:20,flexShrink:0,fontWeight:300}}>›</span>
          </button>
        ))}
      </div>
      <div style={{marginTop:24,fontSize:12,color:"#8a9bb0",textAlign:"center"}}>No account required · Change anytime</div>
    </div>
  );
}

const NAV=[
  {id:"myinfo",label:"My Info",ico:"\u{1F4CB}"},
  {id:"dashboard",label:"Dashboard",ico:"\u2605"},
  {id:"benefits",label:"Benefits",ico:"\u{1FA96}"},
  {id:"planning",label:"Planning",ico:"\u{1F4CA}"},
  {id:"stayvsgo",label:"Stay/Go",ico:"\u2696"},
  {id:"share",label:"Share",ico:"\u{1F517}"},
];

const STORAGE_KEY="milcalc_state";
const TAB_KEY="milcalc_tab";

function loadSaved(){
  try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null;}
  catch{return null;}
}
function loadTab(){
  try{
    const saved=localStorage.getItem(TAB_KEY);
    // Migrate old tab IDs
    if(saved&&["pension","va","crdp","taxes","col","gibill","insurance","gap","summary"].includes(saved)) return "dashboard";
    if(saved==="profile") return "myinfo";
    // First-run: if no saved state, start on My Info
    const hasSaved=localStorage.getItem(STORAGE_KEY);
    if(!hasSaved) return "myinfo";
    return saved||"dashboard";
  }catch{return "dashboard";}
}

const LANDING_KEY="milcalc_entered";
function hasEnteredApp(){return true;}

export default function App(){
  const [entered,setEntered]=useState(hasEnteredApp);
  const [tab,setTab]=useState(loadTab);
  const [infoMenu,setInfoMenu]=useState(false);
  const [screen,setScreen]=useState(null); // "support" | "privacy" | null

  // ── Engagement popup state ──
  const POPUP_DISMISSED_KEY="milcalc_popup_dismissed";
  const POPUP_SESSION_KEY="milcalc_popup_shown";
  const [showPopup,setShowPopup]=useState(false);
  const tabCountRef=useRef(0);
  const popupShownRef=useRef(false);
  const isPopupBlocked=()=>{
    try{return localStorage.getItem(POPUP_DISMISSED_KEY)==="1"||sessionStorage.getItem(POPUP_SESSION_KEY)==="1";}catch{return false;}
  };
  const triggerPopup=(trigger)=>{
    if(isPopupBlocked()||popupShownRef.current||showPwaPrompt) return;
    popupShownRef.current=true;
    try{sessionStorage.setItem(POPUP_SESSION_KEY,"1");}catch{}
    setShowPopup(true);
    track("Engagement Popup Shown",{trigger});
  };
  const popupStartTime=useRef(Date.now());
  const dismissPopup=()=>{
    setShowPopup(false);
    try{localStorage.setItem(POPUP_DISMISSED_KEY,"1");}catch{}
    track("Engagement Popup Dismissed",{});
  };

  const enterApp=()=>{try{localStorage.setItem(LANDING_KEY,"1");}catch{}setEntered(true);};
  const exitApp=()=>{try{localStorage.removeItem(LANDING_KEY);}catch{}setEntered(false);};

  // ── PWA install prompt (app-level) ──
  const PWA_SESSION_KEY="milcalc_pwa_shown";
  const [pwaPromptEvent,setPwaPromptEvent]=useState(null);
  const [showPwaPrompt,setShowPwaPrompt]=useState(false);
  const pwaShownRef=useRef(false);
  const isPwaBlocked=()=>{try{return sessionStorage.getItem(PWA_SESSION_KEY)==="1"||window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;}catch{return false;}};
  // Reveal body after first React render (prevents white flash)
  useEffect(()=>{document.body.style.visibility='visible';},[]);

  useEffect(()=>{
    const handler=e=>{e.preventDefault();setPwaPromptEvent(e);};
    window.addEventListener('beforeinstallprompt',handler);
    return ()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);
  const triggerPwa=()=>{
    if(isPwaBlocked()||pwaShownRef.current||!pwaPromptEvent) return;
    pwaShownRef.current=true;
    try{sessionStorage.setItem(PWA_SESSION_KEY,"1");}catch{}
    // Dismiss engagement popup if showing — PWA takes priority
    if(showPopup){dismissPopup();}
    setShowPwaPrompt(true);
    track("PWA Install Prompt Shown",{});
  };
  const handlePwaInstall=async()=>{
    if(pwaPromptEvent){
      track("PWA Install Prompted",{});
      pwaPromptEvent.prompt();
      const choice=await pwaPromptEvent.userChoice;
      if(choice.outcome==="accepted") track("PWA Installed",{});
      setPwaPromptEvent(null);
    }
    setShowPwaPrompt(false);
  };
  const dismissPwa=()=>{setShowPwaPrompt(false);track("PWA Install Dismissed",{});};
  // PWA trigger: 3+ minutes on page
  useEffect(()=>{
    if(!pwaPromptEvent) return;
    const timer=setTimeout(()=>triggerPwa(),180000); // 3 minutes
    return ()=>clearTimeout(timer);
  },[pwaPromptEvent]);

  const defaults={
    userName:"",
    separationType:"active",
    retType:"High-3",yos:0,high3:0,usePayGrade:true,payGrade:"E-7",sbp:false,sbpCoverage:55,sbpRetireAge:42,
    medDodPct:50,tdrl:false,combatRelated:false,
    reservePoints:3600,currentAge:45,payStartAge:60,reserveHealthType:"trs",
    vaRating:0,vaDeps:"Single",vaChildren:0,
    selectedState:"Texas",income:0,filingStatus:"single",age65Plus:false,spouseAge65Plus:false,
    colFrom:"Fayetteville, NC",colTo:"Austin, TX",monthlyIncome:5000,
    desiredIncome:6000,
    giUsing:false,giType:"post911",giEligPct:100,giSchoolCity:"Austin, TX",giEnroll:1.0,giOnline:false,giMonthsPerYear:9,
    mgibEnroll:"full",mgibServiceYears:"3+",
    tricareplan:"prime",tricareFamSize:"self",tricareGroup:"A",
    useVgli:true,vgliCoverage:500000,vgliAge:45,otherLifePremium:0,
    bah:0,bas:0,
    civHiDeps:"single",civHiCost:null,
    _hasVisitedMyInfo:false,
    _hasVisitedBenefits:false,
    _hasVisitedPlanning:false,
    planSection:"taxes",
    plan_ssaMo:0,
    // Stay vs Go tab
    svg_payGrade:"E-7",svg_cYos:10,svg_cAge:28,svg_retType:"High-3",
    svg_tspBal:0,svg_tspPct:5,svg_sepYos:15,svg_tgtYos:20,
    svg_vaRat:0,svg_vaDep:"alone",svg_state:"Texas",svg_civSal:60000,svg_civSalB:0,
    svg_hysaBal:0,svg_hysaMo:0,svg_hysaApy:4.5,
    svg_othBal:0,svg_othMo:0,svg_othRate:7,
    svg_civRetAge:65,
    svg_giUse:false,svg_giMonths:36,
    svg_hiDeps:"single",svg_hiCost:null,
    userPath:null,
  };
  const [s,setS]=useState(()=>({...defaults,...(loadSaved()||{})}));
  const set=(k,v)=>setS(x=>{const n={...x,[k]:v};try{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));}catch{}return n;});
  // Popup: trigger after 5+ minutes of active use, or after PDF export
  useEffect(()=>{
    if(isPopupBlocked()||popupShownRef.current) return;
    const hasEngaged=s.yos>0&&s.vaRating>0&&s._hasVisitedMyInfo;
    if(!hasEngaged) return;
    const elapsed=Date.now()-popupStartTime.current;
    const delay=Math.max(0,300000-elapsed); // 5 minutes minimum
    const timer=setTimeout(()=>triggerPopup("engagement_5min"),delay);
    return ()=>clearTimeout(timer);
  },[s.yos,s.vaRating,s._hasVisitedMyInfo]);
  const tabRef=useRef(tab);
  const go=id=>{
    const TAB_NAMES={"myinfo":"My Info","dashboard":"Dashboard","benefits":"Benefits","planning":"Planning","stayvsgo":"Stay vs Go"};
    track("Tab Changed",{from:TAB_NAMES[tabRef.current]||tabRef.current,to:TAB_NAMES[id]||id});
    track("Page Viewed",{page:TAB_NAMES[id]||id});
    tabRef.current=id;
    setTab(id);try{localStorage.setItem(TAB_KEY,id);}catch{}window.scrollTo(0,0);
    // Mark tab as visited for indicator dots
    if(id==="benefits"&&!s._hasVisitedBenefits) set("_hasVisitedBenefits",true);
    if(id==="planning"&&!s._hasVisitedPlanning) set("_hasVisitedPlanning",true);
    tabCountRef.current++;
  };

  // Derived values for status bar
  const derivedAppPay=s.usePayGrade?lookupPay(s.payGrade,s.yos):null;
  const h3=(s.usePayGrade&&derivedAppPay)?derivedAppPay:s.high3;
  const isReserveEligibleNowApp=s.separationType==="reserve"&&s.currentAge>=s.payStartAge;
  const g=pensionBySepType(s.separationType,s.retType,s.yos,h3,s.medDodPct,s.tdrl,s.reservePoints,s.currentAge,s.payStartAge);
  const sbpC=s.sbp?g*(s.sbpCoverage/100)*0.065:0;
  const netP=g-sbpC;
  const si=STATES[s.selectedState]||{ok:true};
  const vaM_app=calcVAComp(s.vaRating,dk(s.vaDeps),s.vaChildren||0);
  const medCalcApp=s.separationType==="medical"?medicalPension(s.yos,h3,s.medDodPct,s.tdrl,s.retType):null;
  const isVAOffsetApp=s.separationType==="medical"&&s.yos<20&&vaM_app>0&&g>0&&medCalcApp&&!medCalcApp.isSeverance;
  const offsetNetPApp=isVAOffsetApp?Math.max(0,netP-vaM_app):netP;
  const appTaxableAnn=offsetNetPApp*12+(s.income||0);
  const {monthlyTax:appFedTax}=calcFederalTax(appTaxableAnn,s.filingStatus||"single",s.age65Plus,s.spouseAge65Plus);
  const stTax=calcStateTax(offsetNetPApp*12,si)/12;
  const atP=offsetNetPApp-appFedTax-stTax;
  const vaM=vaM_app;
  const isMGIBapp=s.giType==="ch30"||s.giType==="ch1606";
  const mhaBase=s.giOnline?GI_BILL_ONLINE_MHA:(MHA_CITIES[s.giSchoolCity]||0);
  const mhaMo=s.giUsing?(isMGIBapp?Math.round(mgibMonthly(s.giType,s.mgibEnroll,s.mgibServiceYears)):Math.round(mhaBase*(s.giEligPct/100)*s.giEnroll)):0;
  const otherMo=Math.round((s.income||0)/12);
  const total=Math.max(0,atP+vaM+otherMo+mhaMo);
  const healthPrem2=(()=>{
    if(s.separationType==="veteran") return 0; // VA Healthcare
    if(s.separationType==="reserve"&&!isReserveEligibleNowApp){
      const rr=s.reserveHealthType==="trs"?TRICARE_RS:s.reserveHealthType==="trr"?TRICARE_TRR:null;
      return rr?(s.tricareFamSize==="family"?rr.family:rr.individual):0;
    }
    if(s.separationType==="medical"&&s.tricareplan==="select") return 0;
    const tp2=TRICARE_PLANS[s.tricareplan]||TRICARE_PLANS.prime;
    const gr2=tp2[`group${s.tricareGroup||"A"}`]||tp2.groupA;
    const mp2=s.tricareplan==="tfl"?(s.tricareFamSize==="family"?370:185):0;
    return (gr2[s.tricareFamSize]||gr2.self)+mp2;
  })();
  const civHiCost2=s.civHiCost!=null?s.civHiCost:0;
  const insuranceMo=Math.round(healthPrem2+(s.useVgli?vgliMonthly(s.vgliCoverage,s.vgliAge):0)+(s.otherLifePremium||0)+civHiCost2);
  const gap=s.desiredIncome-(total-insuranceMo);

  // ── /share standalone page (also redirect /partners) ──
  if(window.location.pathname==="/partners"){window.history.replaceState({},"","/share");}
  if(window.location.pathname==="/share") return <SharePage/>;

  return(
    <>
      <style>{FONTS}</style>
      <style>{CSS}</style>
      {/* Landing page kept in DOM for SEO, hidden when calculator is active */}
      <div style={entered?{display:"none"}:undefined}><LandingPage onEnter={enterApp}/></div>
      {entered&&s.userPath===null&&<OnboardingScreen onSelect={path=>{set("userPath",path);if(path==="serving"){try{localStorage.setItem(TAB_KEY,"stayvsgo");}catch{}setTab("stayvsgo");}}}/>}
      <div className="has-badge" style={(entered&&s.userPath!==null)?undefined:{display:"none"}}>

      {/* ── DEBRIEFED BRAND BADGE ── */}
      <div className="db-badge">
        <button className="db-home" onClick={exitApp} aria-label="Back to home">{"\u2190"} MilCalc</button>
        <div className="db-badge-center">
          <div className="db-badge-d">D</div>
          <div className="db-badge-txt">Part of <a href="https://getdebriefed.co" target="_blank" rel="noopener noreferrer">Debriefed</a></div>
        </div>
      </div>

      {/* ── TOP STATUS BAR ── */}
      <div className="sb">
        <div className="sb-left">
          <div className="sb-title">Monthly Total</div>
          <div className="sb-total">{s._hasVisitedMyInfo?fmt(total):"\u2014"}</div>
          <div className="sb-sub">{s._hasVisitedMyInfo?`${s.separationType==="veteran"?"Veteran":s.separationType==="medical"?"Med. Ret.":s.separationType==="reserve"?"Reserve":s.retType} / ${fmtYos(s.yos)} YOS`:"Set up My Info to see your numbers"}</div>
        </div>
        <div className="sb-right">
          <div className="sb-pill">
            <div className="sb-pill-l">VA</div>
            <div className="sb-pill-v pos">{s._hasVisitedMyInfo?fmt(vaM):"\u2014"}</div>
          </div>
          <div className="sb-pill">
            <div className="sb-pill-l">{gap>0?"Gap":"Surplus"}</div>
            <div className={"sb-pill-v "+(gap>0?"warn":"pos")}>{s._hasVisitedMyInfo?(gap>0?fmt(gap):"+"+fmt(Math.abs(gap))):"\u2014"}</div>
          </div>
          <button className="info-btn" onClick={()=>setInfoMenu(true)} aria-label="Info menu">{"\u24D8"}</button>
        </div>
      </div>

      {/* ── INFO MENU BOTTOM SHEET ── */}
      {infoMenu&&(
        <div className="info-overlay" onClick={()=>setInfoMenu(false)}>
          <div className="info-sheet" onClick={e=>e.stopPropagation()}>
            <div className="info-sheet-title">Info</div>
            <button className="info-sheet-btn" onClick={()=>{setInfoMenu(false);setScreen("support");}}>
              <span>{"\u2709"}</span><span>Support / FAQ</span>
            </button>
            <button className="info-sheet-btn" onClick={()=>{setInfoMenu(false);setScreen("privacy");}}>
              <span>{"\u{1F512}"}</span><span>Privacy Policy</span>
            </button>
            <button className="info-sheet-btn" onClick={()=>{setInfoMenu(false);window.location.href="/share";}}>
              <span>{"\u{1F517}"}</span><span>Share MilCalc</span>
            </button>
            <button className="info-sheet-btn" onClick={()=>{setInfoMenu(false);set("userPath",null);}}>
              <span>&#8646;</span><span>Switch View</span>
            </button>
            <button className="info-sheet-cancel" onClick={()=>setInfoMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SUPPORT / PRIVACY / PARTNERS SCREENS ── */}
      {screen==="support"&&<SupportScreen onClose={()=>setScreen(null)}/>}
      {screen==="privacy"&&<PrivacyScreen onClose={()=>setScreen(null)}/>}

      {/* ── MAIN CONTENT ── */}
      <main className="main">
        {tab==="myinfo"    &&<ProfileTab state={s} set={set} isConfigured={s._hasVisitedMyInfo} go={go}/>}
        {tab==="dashboard"&&<DashboardTab state={s} set={set} isConfigured={s._hasVisitedMyInfo} go={go} onPdfExported={()=>{triggerPwa();triggerPopup("pdf_export");}} modalActive={showPopup||showPwaPrompt}/>}
        {tab==="benefits" &&<BenefitsTab state={s} isConfigured={s._hasVisitedMyInfo} go={go}/>}
        {tab==="planning"  &&<PlanningTab state={s} set={set} go={go}/>}
        {tab==="stayvsgo" &&<StayVsGoTab state={s} set={set}/>}
      </main>

      {/* ── ENGAGEMENT POPUP ── */}
      {showPopup&&(
        <div className="ep-overlay" onClick={dismissPopup}>
          <div className="ep-modal" onClick={e=>e.stopPropagation()}>
            <div className="ep-title">Enjoying MilCalc?</div>
            <div className="ep-options">
              <a className="ep-opt" href="mailto:support@getdebriefed.co?subject=MilCalc%20Review&body=I%20wanted%20to%20share%20feedback%20about%20MilCalc%3A"
                onClick={()=>{track("Engagement Popup Review Clicked",{});dismissPopup();}}>
                <span className="ep-opt-ico">{"\u2B50"}</span><span>Leave a review</span>
              </a>
              <button className="ep-opt" onClick={()=>{track("Engagement Popup Share Clicked",{});dismissPopup();window.location.href="/share";}}>
                <span className="ep-opt-ico">{"\u{1F517}"}</span><span>Share with a fellow veteran</span>
              </button>
              <button className="ep-opt" onClick={()=>{track("Engagement Popup Feedback Clicked",{});dismissPopup();setScreen("support");}}>
                <span className="ep-opt-ico">{"\u{1F4AC}"}</span><span>Send feedback</span>
              </button>
            </div>
            <button className="ep-dismiss" onClick={dismissPopup}>Maybe later</button>
          </div>
        </div>
      )}

      {/* ── PWA INSTALL PROMPT ── */}
      {showPwaPrompt&&(
        <div className="ep-overlay" onClick={dismissPwa}>
          <div className="ep-modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:32,textAlign:"center",marginBottom:8}}>{"\u{1F4F1}"}</div>
            <div className="ep-title">Add MilCalc to Home Screen</div>
            <div style={{fontSize:14,color:"#7A8AA0",textAlign:"center",lineHeight:1.5,marginBottom:16}}>
              Install for instant access — works offline, no app store needed.
            </div>
            <button onClick={handlePwaInstall}
              style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#c2782a,#e09448)",
                color:"#0A0E1A",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",
                fontFamily:"Barlow,sans-serif",marginBottom:8}}>
              Install Now
            </button>
            <button className="ep-dismiss" onClick={dismissPwa}>Maybe later</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM TAB BAR ── */}
      <nav className="btabs">
        <div className="btabs-scroll" style={{justifyContent:"space-around"}}>
          {NAV.map(n=>{
            const showDot=s._hasVisitedMyInfo&&s.yos>0&&(
              (n.id==="benefits"&&!s._hasVisitedBenefits)||
              (n.id==="planning"&&!s._hasVisitedPlanning)
            );
            return(
            <button key={n.id} className={"btab"+(tab===n.id?" on":"")}
              style={{flex:"1 1 0",minWidth:0,width:"auto"}}
              onClick={()=>{if(n.id==="share"){window.location.href="/share";return;}go(n.id);}}>
              {showDot&&<span className="btab-dot"/>}
              <span className="btab-ico">{n.ico}</span>
              <span>{n.label}</span>
            </button>
            );
          })}
        </div>
      </nav>
    </div>
    </>
  );
}

