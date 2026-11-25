# Devpost submission: PayslipLens

Copy each block into the matching Devpost field. All text is in English, as the rules require.

---

## 1. Project overview

### Project name (max 60 characters)

```
PayslipLens: understand your payslip, privately
```

### Elevator pitch (max 200 characters)

```
Gemini Nano reads your Ivory Coast payslip inside Chrome, checks CNPS, ITS and CMU with exact math, and explains every line. Only anonymized questions reach the cloud.
```

### Thumbnail

Upload `submission/images/thumbnail.png` (1500 x 1000, 3:2).

---

## 2. Project details

### About the project (Markdown)

```markdown
## Inspiration

In Ivory Coast, most salaried workers get a payslip every month and cannot read it. Since the January 2024 tax reform, the income tax (ITS) uses a new progressive scale with a family reduction, and the CNPS pension contribution has a ceiling. Mistakes happen: a deduction computed on the wrong base, a family reduction forgotten after a wedding or a birth, a transport allowance taxed or not taxed. Nobody notices, and the money is gone.

The obvious fix, "upload your payslip to an AI", asks people to send their salary, employer and family situation to a server. That is exactly the data they should keep private. Hybrid inference solves this: the sensitive part runs on the device, and the cloud only sees what is safe to share.

## What it does

PayslipLens is a web app for Chrome:

1. **Drop a payslip** (PDF or photo), or try one of two fictitious samples.
2. **Gemini Nano extracts the figures on the device**: gross, taxable gross, CNPS, ITS, CMU, net pay, tax parts. Names and IDs are never extracted.
3. **A rules engine checks the law with exact math**: CNPS 6.3% with its 3,375,000 FCFA ceiling, the 2024 ITS scale minus the family reduction, CMU at 500 FCFA per covered person, the 30,000 FCFA transport exemption, net pay consistency and the minimum wage.
4. **Explain any line** of the payslip: Gemini Nano answers on the device, because the line contains real amounts.
5. **Ask a question** ("Is my ITS correct for my family?"). The app builds an anonymized summary (salary band, percentages, check results, masked question), **shows the exact text to the user**, and only then sends it to cloud Gemini.
6. **Change your number of tax parts** to see how your family situation changes the ITS.

Every answer carries a badge showing where it ran: **On this device** or **Cloud**.

## How we built it

- **Firebase AI Logic hybrid inference** (Web SDK, `firebase/ai`), with the inference mode chosen by data sensitivity:
  - `ONLY_ON_DEVICE` for anything containing the payslip: extraction (with a JSON schema as the on-device `responseConstraint`) and line explanations (streamed). If Nano is missing, these calls fail instead of silently going to the cloud.
  - `PREFER_IN_CLOUD` for questions, which only receive the anonymized summary.
  - `ONLY_IN_CLOUD` as a fallback for browsers without Nano, only after an explicit consent checkbox, and labelled "Cloud · with your consent".
  - `response.inferenceSource` drives the badges in the UI.
- **App Check** with reCAPTCHA Enterprise (Fraud Defense), and the debug provider in development.
- **Remote Config** for the cloud model name and the legal rates (`ci_rules`), so a new tax scale does not need a new release.
- **Firebase Hosting** with a strict Content-Security-Policy.
- **pdf.js** reads PDFs locally and rebuilds the payslip table, tagging each value with its column ("Retenue" vs "Part patronale").
- Vanilla TypeScript and Vite. 21 unit tests cover the rules, the anonymizer and the retry logic.

## Challenges we ran into

- **Gemini Nano does not read PDFs.** We extract the text with pdf.js. The first version flattened table rows, and Nano took the employer CNPS share for the employee's. Tagging every value with its column header fixed it.
- **On-device speed.** Asking Nano for every payslip line took 109 seconds. Reducing the output to ten figures cut it to 59 seconds; the line-by-line table is now built deterministically from the PDF.
- **Every on-device model needs its own initialization** on a user gesture. A missing `initializeDeviceModel()` made extraction hang silently, so every on-device call now has a timeout.
- **Cloud streaming** failed to parse under load on 2 of 4 calls. Questions now use non-streamed calls with retries on 429/500/503.
- **Security.** A first production build contained the App Check debug token, because Vite inlines the whole `import.meta.env` object when it is copied. We caught it before deploying, and every build is now checked.

## Accomplishments that we're proud of

- The salary never leaves the device in the default path, and the user sees exactly what the cloud receives.
- The AI extracts and explains; the law is checked by code. Legal math is never "generated".
- Real local knowledge: the rules match the 2024 ITS reform and were cross-checked against an Ivory Coast payroll module the author maintains.

## What we learned

Hybrid inference is not only a fallback for offline use: it is a way to design privacy. Choosing the inference mode per piece of data (`ONLY_ON_DEVICE` for the payslip, `PREFER_IN_CLOUD` for an anonymized question) gave us a product that is both private and genuinely helpful.

## What's next

- French interface and local languages, starting with the payslip vocabulary.
- More countries of the West African zone (Senegal, Burkina Faso, Mali), whose rules can be shipped through Remote Config.
- An Android version with Gemini Nano through Firebase AI Logic.
- A "letter to HR" generator, drafted on the device, when a check fails.
```

### Built with (tags)

```
firebase-ai-logic, gemini-nano, gemini, chrome-prompt-api, firebase-app-check, recaptcha-enterprise, firebase-remote-config, firebase-hosting, typescript, vite, pdf.js
```

### "Try it out" links

```
https://payslip-lens.web.app
https://github.com/Junmodeste/PayslipLens
```

### Image gallery

Upload the files in `submission/images/` (3:2, PNG), in this order. After uploading, paste each caption into the image's caption field.

1. `thumbnail.png`
   ```
   PayslipLens: Gemini Nano reads your payslip inside Chrome. Your salary never leaves your device.
   ```
2. `01-home.png`
   ```
   Home: drop a payslip or try a fictitious sample. The top bar shows whether on-device AI is ready.
   ```
3. `02-results-errors.png` (captured in a browser without Nano, so the badge honestly reads "Cloud · with your consent")
   ```
   Exact legal checks: CNPS on the wrong base and ITS without the family reduction are flagged.
   ```
4. `03-anonymized-preview.png`
   ```
   Before any question goes to the cloud, you see the exact anonymized text: salary band, percentages, no names.
   ```
5. Optional, `04-explain-on-device.png`: capture it yourself in Chrome with Gemini Nano (Explain on a line, badge "On this device"). It is the only screen that needs Nano.
   ```
   Explain any line: Gemini Nano answers on the device, because the line contains real amounts.
   ```

### Demo video URL

```
https://www.youtube.com/watch?v=VIDEO_ID
```
(Public or unlisted, no password, 3 minutes max. See `submission/video-script.md`.)

---

## 3. Additional info (for judges)

### Submitter type
`Individual`

### Submitter country of residence
`Cote d'Ivoire`

### Organization name (if applicable)
```
N/A
```

### What date did you start this project? (MM-DD-YY)
```
11-25-26
```

### Is your project new, or did it exist before Nov 11, 2026
`New`

### If it existed before, explain...
(Leave empty: the project is new.)

### Which Platform(s) did you use to build your project?
`Web (Chrome)`

### Explain how your project meets the main technology requirement

```
PayslipLens is a Gen AI web app for Chrome built on Firebase AI Logic hybrid inference with Gemini Nano, plus App Check, Remote Config and Hosting.

Firebase AI Logic is imported and called at runtime (firebase/ai, getAI with GoogleAIBackend, getGenerativeModel with InferenceMode):
- src/payslip.ts: Gemini Nano extracts the payslip figures with InferenceMode.ONLY_ON_DEVICE and a JSON schema as the on-device responseConstraint. initializeDeviceModel() runs on a user gesture. A consent-only ONLY_IN_CLOUD fallback (responseJsonSchema) serves browsers without Nano.
- src/assistant.ts: line explanations stream from Gemini Nano (ONLY_ON_DEVICE). Questions use PREFER_IN_CLOUD with gemini-3.5-flash-lite, on an anonymized prompt only (src/anonymize.ts).
- response.inferenceSource is shown to the user as "On this device" or "Cloud".

Other Firebase products: App Check with reCAPTCHA Enterprise (src/firebase.ts; debug provider in development only), Remote Config for the cloud model and the legal rates (src/config.ts), Firebase Hosting (firebase.json, with a strict CSP).

The hybrid split is the core of the product: the payslip never leaves the device by default, and the cloud only receives an anonymized summary that the user reviews before sending.
```

### Provide a URL to a working demo
```
https://payslip-lens.web.app
```

### Testing instructions or credentials

```
No account or credentials needed. Nothing is stored.

Option A (fully private, recommended): desktop Chrome 139+, 22 GB free disk.
1. In chrome://flags enable: #optimization-guide-on-device-model = "Enabled BypassPerfRequirement", #prompt-api-for-gemini-nano = Enabled, #prompt-api-for-gemini-nano-multimodal-input = Enabled. Relaunch Chrome.
2. In DevTools, typeof LanguageModel must return "function".
3. Open https://payslip-lens.web.app and select "Turn on" or "Download (one time)" in the top bar. The first Gemini Nano download can take several minutes.
4. Select "Try a sample with errors". Extraction takes about a minute on a laptop CPU. Expected: badge "On this device", 2 warnings (CNPS on the wrong base, ITS without the family reduction), 1 info (taxable transport), CMU and net pay OK.
5. Select "Explain" on a line (on-device). Then pick a suggested question, review the anonymized text, and send it to the cloud.

Option B (any browser): without Gemini Nano, tick the consent box "Analyze in the cloud instead", then try a sample. The result is labelled "Cloud · with your consent".

Samples are fictitious payslips. Source and full guide: https://github.com/Junmodeste/PayslipLens#try-it-judges
```

### URL to your open-source license
```
https://github.com/Junmodeste/PayslipLens/blob/main/LICENSE
```

### Checkboxes
Tick them yourself if they are true: age of majority, and eligible jurisdiction (Ivory Coast is not on the excluded list).
