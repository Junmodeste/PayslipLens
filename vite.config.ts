import { defineConfig, loadEnv } from "vite";

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    // A BOM at the start of .env.local silently renames the first variable.
    const missing = [...REQUIRED, "VITE_RECAPTCHA_SITE_KEY"].filter((k) => !env[k]);
    if (missing.length) {
      throw new Error(
        `Missing ${missing.join(", ")} in .env.local (check the file is saved as UTF-8 without BOM).`,
      );
    }
  }
  return {};
});
