# PayslipLens

*[Version française](README.fr.md)*

**Understand your payslip. Privately.**

PayslipLens reads an Ivory Coast payslip with **Gemini Nano inside Chrome**, checks the legal deductions (CNPS, ITS, CMU) with exact math, and explains every line. The payslip never leaves the device. Only an anonymized summary goes to the cloud, and only when the user asks a question and approves the exact text.

Built for **#BuildHybridAI 2026** with **Firebase AI Logic hybrid inference** (Web / Chrome).

- Live demo: https://payslip-lens.web.app
- Sample payslips (fictitious): [correct](public/samples/payslip-ok.pdf), [with errors](public/samples/payslip-errors.pdf)

## The problem

Most salaried workers in Ivory Coast cannot read their payslip. Since the January 2024 tax reform, the income tax (ITS) uses a new progressive scale with a family reduction, and the CNPS retirement contribution has a ceiling. Errors in these deductions often go unnoticed: a wrong base, a family reduction left out, a transport allowance taxed or not taxed.

The obvious fix, "upload your payslip to an AI", asks people to send their salary, employer and family situation to a server. That is exactly the data they should keep private.

## The solution: hybrid by design

PayslipLens splits the work by **sensitivity**:

| Step | Where it runs | Firebase AI Logic mode | Why |
|---|---|---|---|
| Read the PDF or photo | Browser (pdf.js) | none | Nano takes text or images, not PDF. Table cells are tagged with their column (`Retenue`, `Part patronale`). |
| Extract the figures as JSON | **Gemini Nano** | `ONLY_ON_DEVICE` + JSON schema `responseConstraint` | The salary never leaves the device. Names and IDs are never extracted. |
| Check CNPS, ITS, CMU | Plain TypeScript rules engine | none | Legal math must be exact, not generated. |
| Explain a payslip line | **Gemini Nano**, streamed | `ONLY_ON_DEVICE` | The line contains real amounts. |
| Answer a question | **Cloud Gemini** | `PREFER_IN_CLOUD` | Legal depth needs a larger model. It only receives an anonymized summary (salary band, percentages, check results, masked question), shown to the user before sending. |
| No Nano in this browser | Cloud Gemini | `ONLY_IN_CLOUD` | Only after an explicit consent checkbox, labelled "Cloud · with your consent". |

Every result shows where it ran, from `response.inferenceSource`: **On this device** or **Cloud**.

## Where Firebase AI Logic is used in the code

- [`src/firebase.ts`](src/firebase.ts): `initializeApp`, App Check (`ReCaptchaEnterpriseProvider`, debug provider in dev), `getAI` with `GoogleAIBackend`.
- [`src/payslip.ts`](src/payslip.ts): on-device extraction model (`InferenceMode.ONLY_ON_DEVICE`, `onDeviceParams.promptOptions.responseConstraint`), `initializeDeviceModel()` on a user gesture, and the consent-only cloud fallback (`ONLY_IN_CLOUD`, `responseJsonSchema`).
- [`src/assistant.ts`](src/assistant.ts): on-device line explanations (`generateContentStream`) and cloud questions (`PREFER_IN_CLOUD`), returning `inferenceSource`.
- [`src/config.ts`](src/config.ts): **Remote Config**, with `cloud_model` and `ci_rules`. Legal rates (for example a new ITS scale) can change without a release.
- [`src/anonymize.ts`](src/anonymize.ts): what may leave the device.
- [`src/rules.ts`](src/rules.ts): Ivory Coast payroll rules, 2024 reform.

Firebase products used: **AI Logic** (hybrid inference), **App Check** (reCAPTCHA Enterprise / Fraud Defense), **Remote Config**, **Hosting**.

## Payroll rules checked

| Check | Rule (monthly) |
|---|---|
| CNPS retirement, employee | 6.3% of taxable gross, ceiling 3,375,000 FCFA |
| ITS (income tax) | 0% up to 75,000; 16% to 240,000; 21% to 800,000; 24% to 2,400,000; 28% to 8,000,000; 32% above; minus the family reduction (RICF): 5,500 FCFA per extra half part, from 1.5 to 5 parts |
| CMU | 500 FCFA per covered person |
| Transport allowance | Tax-free up to 30,000 FCFA |
| Net pay | Gross minus deductions must match the net shown |
| Minimum wage | Taxable gross below 75,000 FCFA is reported |

The user can change the number of tax parts (family situation) to re-check ITS. Rates are defaults in code, can be overridden by Remote Config, and are covered by unit tests.

## Try it (judges)

### Option A: fully private, on-device (recommended)

1. Use **desktop Chrome 139 or later** (Windows, macOS, Linux), with at least 22 GB free disk space.
2. Open `chrome://flags` and enable these three flags, then relaunch Chrome:
   - `#optimization-guide-on-device-model`: **Enabled BypassPerfRequirement**
   - `#prompt-api-for-gemini-nano`: **Enabled**
   - `#prompt-api-for-gemini-nano-multimodal-input`: **Enabled**
3. Check in DevTools: `typeof LanguageModel` must return `"function"`.
4. Open https://payslip-lens.web.app. The top bar shows the on-device AI status. Select **Turn on** or **Download (one time)**. The first download of Gemini Nano can take several minutes.
5. Select **Try a sample with errors**. Extraction takes about a minute on a laptop CPU (measured: 59 s). The result shows **On this device**, two warnings (CNPS base, missing family reduction on ITS) and one info (taxed transport).
6. Select **Explain** on a line (on-device), then ask a question: review the anonymized text, and send it to the cloud.

### Option B: any browser

Without Gemini Nano, tick the consent box ("Analyze in the cloud instead") and try a sample. The figures are then extracted by cloud Gemini, and the result is labelled **Cloud · with your consent**.

No account and no credentials are needed. Nothing is stored.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase web app config
npm run dev                  # http://localhost:5173
npm test                     # rules, anonymizer and retry unit tests
npm run build
```

In local development, App Check uses the debug provider: the browser console prints a debug token to register in Firebase console > App Check > Apps > Manage debug tokens. Never commit it.

## Built during the submission period

This project was created from scratch during #BuildHybridAI 2026 (started November 25, 2026). The payroll rates were cross-checked against an Odoo payroll module for Ivory Coast that the author maintains. No code from it was reused. Third-party code: [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) and [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0), [Vite](https://vite.dev) (MIT). Icon shapes follow [Lucide](https://lucide.dev) (ISC).

## Disclaimer

PayslipLens gives information, not legal or tax advice. When a check fails, ask your HR department, the CNPS or the tax office (DGI).

## License

[Apache License 2.0](LICENSE)
