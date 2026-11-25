import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, GoogleAIBackend } from "firebase/ai";

// Always read env vars as `import.meta.env.X`, never via a copied object:
// `const env = import.meta.env` makes Vite inline every VITE_ variable,
// including the App Check debug token, into the production bundle.
export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

// App Check is required by Firebase AI Logic. In local dev the debug provider
// prints a token in the console; register it in Firebase console > App Check.
// This block is removed from production builds (import.meta.env.DEV is false).
if (import.meta.env.DEV) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}
initializeAppCheck(app, {
  // reCAPTCHA Enterprise (Google Cloud Fraud Defense); classic reCAPTCHA v3 is deprecated.
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY || "dev-placeholder"),
  isTokenAutoRefreshEnabled: true,
});

// Models live next to their use: payslip.ts (extraction), assistant.ts (explain, Q&A).
export const ai = getAI(app, { backend: new GoogleAIBackend() });
