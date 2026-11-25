# Lessons

Format: [date] | what went wrong | rule to avoid it

- [2026-11-25] | `npm create vite -- --template react-ts` produced a vanilla TS scaffold | Check the generated package.json after scaffolding; never assume the template name.
- [2026-11-25] | `PREFER_ON_DEVICE` would silently send the payslip to the cloud when Gemini Nano is missing | Payslip data uses `ONLY_ON_DEVICE`; any cloud call on payslip content needs explicit user consent.
- [2026-11-25] | `npm run dev -- --port 5173` in Windows PowerShell 5.1 dropped `--`, so Vite took `5173` as its root (404) | Run `npx vite --port 5173 --strictPort` directly.
- [2026-11-25] | `Set-Content -Encoding utf8` (PowerShell 5.1) wrote a BOM into `.env.local`; Vite read `﻿VITE_FIREBASE_API_KEY`, so apiKey was empty | Edit text files with Edit/Write or bash `sed`, never PowerShell `Set-Content`/`Out-File`.
- [2026-11-25] | `inferenceSource` values are lowercase at runtime (`in_cloud`, `on_device`) | Compare against the SDK `InferenceSource` constants, never hard-coded uppercase strings.
- [2026-11-25] | `AI/api-not-enabled` in Chrome: only the multimodal flag was on, so `LanguageModel` was undefined | Judges' guide must list all 3 flags (`optimization-guide-on-device-model` = BypassPerfRequirement, `prompt-api-for-gemini-nano`, `prompt-api-for-gemini-nano-multimodal-input`) plus a `typeof LanguageModel` check.
- [2026-11-25] | Gemini Nano does not accept PDF input | Extract PDF text locally with pdf.js before calling the on-device model.
