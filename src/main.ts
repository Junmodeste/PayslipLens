import "./style.css";
import { privateModel, anonymizedModel } from "./firebase";

// Day-1 smoke test: proves the hybrid wiring (on-device + cloud) end to end.
// Replaced by the real PayslipLens UI on day 3.

declare const LanguageModel: { availability(): Promise<string> } | undefined;

const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `
  <main class="smoke">
    <h1>PayslipLens — hybrid check</h1>
    <p>Gemini Nano status: <strong id="nano">checking…</strong></p>
    <div class="row">
      <button id="prepare">Prepare on-device model</button>
      <button id="device">Test on-device</button>
      <button id="cloud">Test cloud</button>
    </div>
    <pre id="out" aria-live="polite"></pre>
  </main>
`;

const out = root.querySelector<HTMLPreElement>("#out")!;
const nano = root.querySelector<HTMLElement>("#nano")!;
const log = (msg: string) => (out.textContent = `${msg}\n${out.textContent}`);

nano.textContent =
  typeof LanguageModel === "undefined" ? "unavailable (Prompt API missing)" : await LanguageModel.availability();

root.querySelector("#prepare")!.addEventListener("click", async () => {
  // Must run on a user gesture; starts the Nano download if needed.
  log("on-device model: initializing…");
  try {
    await privateModel.initializeDeviceModel((p) => log(`download: ${Math.round(p * 100)}%`));
    log("on-device model: ready");
  } catch (e) {
    log(`on-device init error: ${(e as Error).message}`);
  }
});

async function run(label: string, model: typeof privateModel, prompt: string) {
  log(`${label}: running…`);
  try {
    const { response } = await model.generateContent(prompt);
    log(`${label} [${response.inferenceSource}]: ${response.text()}`);
  } catch (e) {
    log(`${label} error: ${(e as Error).message}`);
  }
}

root.querySelector("#device")!.addEventListener("click", () =>
  run("on-device", privateModel, "In one sentence, what is a payslip?"),
);
root.querySelector("#cloud")!.addEventListener("click", () =>
  run("cloud", anonymizedModel, "In one sentence, what does CNPS mean in Côte d'Ivoire?"),
);
