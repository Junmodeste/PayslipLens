# Lessons

Format: [date] | what went wrong | rule to avoid it

- [2026-11-25] | `const env = import.meta.env` inlined every VITE_ variable, so the App Check debug token was in the production bundle (caught before deploy) | Read `import.meta.env.X` directly; grep `dist/` for the debug token before every deploy.
- [2026-11-25] | `.env.local` re-saved with a BOM by the user's editor: production site had no apiKey | `vite.config.ts` fails the build when Firebase vars are missing; tell users "UTF-8 without BOM".
- [2026-11-25] | Hosted App Check failed: classic reCAPTCHA v3 is deprecated, console registers Fraud Defense (Enterprise), and no Enterprise key existed | Use `ReCaptchaEnterpriseProvider` with a Fraud Defense key (domains: web.app + firebaseapp.com); debug the exchange endpoint directly to read the real error.
- [2026-11-25] | After App Check failures the SDK kept throttling in the same browser | Clear IndexedDB / use a fresh profile before re-testing App Check.
- [2026-11-25] | `npm create vite -- --template react-ts` produced a vanilla TS scaffold | Check the generated package.json after scaffolding; never assume the template name.
- [2026-11-25] | `PREFER_ON_DEVICE` would silently send the payslip to the cloud when Gemini Nano is missing | Payslip data uses `ONLY_ON_DEVICE`; any cloud call on payslip content needs explicit user consent.
- [2026-11-25] | `npm run dev -- --port 5173` in Windows PowerShell 5.1 dropped `--`, so Vite took `5173` as its root (404) | Run `npx vite --port 5173 --strictPort` directly.
- [2026-11-25] | `Set-Content -Encoding utf8` (PowerShell 5.1) wrote a BOM into `.env.local`; Vite read `﻿VITE_FIREBASE_API_KEY`, so apiKey was empty | Edit text files with Edit/Write or bash `sed`, never PowerShell `Set-Content`/`Out-File`.
- [2026-11-25] | `inferenceSource` values are lowercase at runtime (`in_cloud`, `on_device`) | Compare against the SDK `InferenceSource` constants, never hard-coded uppercase strings.
- [2026-11-25] | `AI/api-not-enabled` in Chrome: only the multimodal flag was on, so `LanguageModel` was undefined | Judges' guide must list all 3 flags (`optimization-guide-on-device-model` = BypassPerfRequirement, `prompt-api-for-gemini-nano`, `prompt-api-for-gemini-nano-multimodal-input`) plus a `typeof LanguageModel` check.
- [2026-11-25] | Extraction hung: only the smoke-test model had `initializeDeviceModel()`; each GenerativeModel owns its own on-device session | Initialize every on-device model on the user gesture, and wrap on-device calls in a timeout.
- [2026-11-25] | Nano took the employer amount for CNPS: flattened PDF rows lost empty cells, so columns were ambiguous; a `lines` array made output slow (109 s) | Tag each value with its header column before prompting; keep the on-device JSON output minimal and build tables deterministically.
- [2026-11-25] | Cloud Gemini returned `[500] high demand` during a test | Wrap every cloud call in `withRetry` (429/500/503 with backoff).
- [2026-11-25] | Badge said "Cloud · anonymized" for a consented full-payslip cloud extraction | Privacy labels must describe exactly what was sent; check each badge per path.
- [2026-11-25] | Cloud `generateContentStream` failed with `AI/parse-failed` on 2 of 4 calls; `generateContent` passed 4 of 4 | Use non-streaming calls for the cloud (short answers); stream only on-device output.
- [2026-11-25] | Gemini Nano does not accept PDF input | Extract PDF text locally with pdf.js before calling the on-device model.
