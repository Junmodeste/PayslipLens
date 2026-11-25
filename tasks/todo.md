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
  - [x] `src/input.ts`: PDF to text rows (pdf.js), scanned PDF to PNG, JPEG/PNG passthrough; verified on the sample PDF
  - [x] `src/payslip.ts`: JSON schema as on-device `responseConstraint`, ONLY_ON_DEVICE extraction, no names/IDs extracted
  - [x] `src/rules.ts`: CNPS 6.3% (ceiling 3,375,000), ITS 2024 scale + RICF, CMU 500/person, transport 30,000, net check, SMIG; rates from `GitHub/CPF-CI/l10n_ci_hr_payroll`
  - [x] 13 unit tests pass (`npm test`)
  - [x] Fictitious sample `public/samples/payslip-ok.pdf`
  - [x] Nano extraction verified on the sample in user's Chrome: 10/10 values exact, 4 checks ok, 59 s (was 109 s with a `lines` array)
  - [x] PDF rows tagged with header columns (fixed employer/employee CNPS confusion)
  - [x] D3: lazy-load pdf.js (main bundle 134 kB)
  - [ ] D3: extraction speed (59 s on user's machine): progress UI with timer done; shorter instructions still to try
- [ ] **D3 status, Nov 25**
  - [x] Full UI: hero, Nano status + one-click enable, drop zone + sample, progress steps with timer, figures, checks, editable tax parts, line table with on-device Explain, Q&A with anonymized preview before sending
  - [x] `anonymize.ts` (salary band, percentages, masked question) + tests; `retry.ts` for cloud 429/500/503 + tests (20 tests)
  - [x] Remote Config `cloud_model` + `ci_rules` (code defaults if absent)
  - [x] Consent-based cloud extraction when Nano is unavailable (badge "Cloud · with your consent")
  - [x] Verified in built-in browser: cloud path, Q&A, tax parts re-check
  - [x] Verified in user's Chrome: on-device extraction, Explain line, cloud Q&A (user confirmed)
  - [x] Cloud Q&A switched to non-streaming (stream parse-failed 2/4)
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
