# PayslipLens — #BuildHybridAI 2026 (Web/Chrome)

Deadline: Nov 30, 2026, 2:00 PM PT (22:00 Abidjan). Target: Grand Prize + Best Web/Chrome.

## Pitch
Salaried workers in Côte d'Ivoire (and francophone West Africa) cannot read their payslip:
CNPS, ITS, CMU, allowances. Errors and under-declaration go unnoticed. Salary data is
highly sensitive, so it should never leave the device.
PayslipLens explains each payslip line, checks the legal deductions, and flags anomalies.
The payslip is processed on-device. Only anonymized questions go to the cloud.

## Hybrid architecture (the core of the "Technological Implementation" score)
| Step | Where | Firebase AI Logic mode | Why |
|---|---|---|---|
| 1. PDF to text | Browser (pdf.js) | — | Nano does not accept PDF; text extraction is local |
| 2. Extract fields to JSON (schema) | Gemini Nano | `ONLY_ON_DEVICE` | Salary never leaves the device |
| 3. Check CNPS / ITS / CMU | Deterministic JS rules engine | — | Math must be exact, not LLM-guessed |
| 4. Line-by-line explanation (EN/FR) | Gemini Nano | `ONLY_ON_DEVICE` | Private |
| 5. "Ask a question" (legal depth) | Cloud Gemini | `PREFER_IN_CLOUD` on an **anonymized** prompt (amounts replaced by ranges/percentages) | Heavy reasoning; no PII |
| Fallback when Nano is unavailable | Cloud, **only after explicit user consent**, or demo with a fictitious payslip | `ONLY_IN_CLOUD` | Honest privacy |

- Show `response.inferenceSource` in the UI with badges: "🔒 On-device" / "☁️ Cloud (anonymized)".
- Remote Config: cloud model name (default `gemini-3.5-flash-lite`), legal rates (CNPS, CMU, ITS brackets), feature flags.
- App Check: debug provider in dev, reCAPTCHA Enterprise for the hosted demo.
- Anonymous Auth: optional, for per-user cloud quota only. No Firestore for payslips (privacy by design).

## Stack
Vite + vanilla TypeScript (no framework), plain CSS. `firebase` JS SDK ≥ 13 (`firebase/ai`). `pdfjs-dist`.
Firebase Hosting on the Spark plan (free). Apache-2.0 license.

## Plan, day by day
- [ ] **D1, Nov 25**: Firebase project (Spark), web app, App Check debug, public GitHub repo with Apache-2.0, Vite scaffold, first hybrid `generateContent` call printing `inferenceSource`.
  - [x] Firebase project, AI Logic, App Check registered (reCAPTCHA v3) + debug token
  - [x] Vite TS scaffold, Apache-2.0 LICENSE, env files, `src/firebase.ts` (ONLY_ON_DEVICE + PREFER_IN_CLOUD)
  - [x] Cloud call verified: `inferenceSource = in_cloud`
  - [x] On-device call verified in user's Chrome: `inferenceSource = on_device` (needed flags: optimization-guide-on-device-model BypassPerfRequirement, prompt-api-for-gemini-nano, multimodal-input)
  - [ ] First commit + public GitHub repo (needs user OK)
  - [ ] Put reCAPTCHA v3 site key in `.env.local` (needed for the hosted build, D4)
- [ ] **D2, Nov 26**: pdf.js + image input, JSON extraction schema on Nano, CI rules engine (rates checked against `l10n_ci_hr_payroll` + official sources), unit tests for the engine.
- [ ] **D3, Nov 27**: full UI (upload, annotated payslip, anomalies, Q&A), anonymizer, cloud Q&A, Remote Config, EN + FR.
- [ ] **D4, Nov 28**: 3 fictitious sample payslips, reCAPTCHA Enterprise, deploy to Firebase Hosting, README (value proposition, setup, architecture, Chrome flag instructions), secret scan.
- [ ] **D5, Nov 29**: 3-min video script and recording, all Devpost texts in English, thumbnail and gallery images.
- [ ] **Nov 30**: buffer, final check, submit before 18:00 Abidjan (4 h margin).

## Risks
- Judges' Chrome may lack Nano: provide a clear "enable Nano" guide plus a consented cloud demo with a fictitious payslip.
- reCAPTCHA Enterprise may need a Cloud billing account: verify on D4. Debug tokens are accepted by the rules, but never publish one in the repo.
- Nano token limit is 9216: send the extracted text only, not the whole PDF.
- ITS 2024 brackets must be verified, never invented.

## Review
(to fill in at the end)
