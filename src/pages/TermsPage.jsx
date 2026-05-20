import { useNavigate } from "react-router-dom";
import { SUPPORT_EMAIL } from "../config.js";

const SECTIONS = [
  {
    num: "01",
    title: "Acceptance of Terms",
    body: "By accessing or using MilCalc, you agree to be bound by these Terms of Use. If you do not agree, do not use MilCalc. Continued use after any update to these terms constitutes acceptance of the revised terms.",
  },
  {
    num: "02",
    title: "What MilCalc Is",
    body: "MilCalc is a free retirement income estimator for U.S. military service members and veterans. It uses publicly available pay tables and benefit rate schedules to produce estimates of retirement income, VA compensation, tax liability, and related figures. MilCalc is a personal finance tool, not a financial services product.",
  },
  {
    num: "03",
    title: "Personal Use Only",
    body: "MilCalc is licensed for personal, non-commercial use only. You may use MilCalc to estimate your own or an immediate family member's retirement income. Reselling, redistributing, embedding, repackaging, or otherwise making MilCalc available to others as part of a product or service — whether for free or for payment — is prohibited without a commercial license.",
  },
  {
    num: "04",
    title: "Accuracy and No Warranty",
    body: "All outputs are estimates based on publicly available 2026 rate tables and standard actuarial formulas. MilCalc makes no warranty — express or implied — regarding the accuracy, completeness, or fitness for purpose of any calculation. Your actual pension, VA compensation, tax liability, and other benefit amounts will be determined by the relevant government agencies and may differ materially from estimates shown. Always verify figures at dfas.mil, va.gov, tricare.mil, and with your branch's personnel office before making financial or career decisions.",
  },
  {
    num: "05",
    title: "Commercial Licensing",
    body: `Organizations that wish to embed, white-label, or distribute MilCalc as part of a product or service must obtain a commercial license. Unlicensed commercial use is a violation of these terms and may constitute copyright infringement. To inquire about commercial licensing, contact ${SUPPORT_EMAIL}.`,
  },
  {
    num: "06",
    title: "Intellectual Property",
    body: `MilCalc, its design, calculation methodology, and content are owned by its creator. All rights reserved. Underlying government pay tables and rate schedules are in the public domain; MilCalc's selection, arrangement, and presentation of that data, its user interface, and its calculation methodology are proprietary. For licensing inquiries, commercial use requests, or intellectual property concerns, contact ${SUPPORT_EMAIL}.`,
  },
  {
    num: "07",
    title: "Privacy",
    body: "MilCalc does not collect personal identifying information. All inputs are stored locally on your device and are never transmitted to a server. Aggregate analytics (page views, feature usage) are collected anonymously to improve the product. MilCalc does not sell, rent, or share any user data with third parties.",
  },
  {
    num: "08",
    title: "Changes to These Terms",
    body: "These terms may be updated at any time. The \"Last updated\" date at the top of this page reflects the most recent revision. Continued use of MilCalc after an update constitutes acceptance of the revised terms.",
  },
  {
    num: "09",
    title: "Contact",
    body: `Questions about these terms or MilCalc's use policies can be directed to ${SUPPORT_EMAIL}.`,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f14",
      color: "#f9fafb",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,15,20,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "none", color: "#9ca3af", fontSize: 14,
            cursor: "pointer", padding: "6px 0", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#d4a017",
          marginBottom: 6, lineHeight: 1.2,
        }}>Terms of Use</h1>
        <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 36 }}>
          Last updated: March 17, 2026
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SECTIONS.map(s => (
            <div key={s.num} style={{
              background: "#17171f",
              border: "0.5px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "20px 20px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "#d4a017",
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
              }}>
                {s.num} — {s.title}
              </div>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.7, margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#4b5563" }}>
            MilCalc is not affiliated with DoD, DFAS, VA, or any government agency.
          </p>
          <p style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#6b7280", textDecoration: "underline" }}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
