import "./style.css";
import { icons } from "./icons";
import { readPayslip, type PayslipInput, type PayslipTable } from "./input";
import { extractPayslip, extractPayslipInCloud, prepareExtraction, type Payslip } from "./payslip";
import { checkPayslip, type Check, type Rules } from "./rules";
import { anonymizedPrompt } from "./anonymize";
import { askCloud, configureCloud, explainLine, prepareExplain, type Source } from "./assistant";
import { loadConfig, DEFAULT_CLOUD_MODEL } from "./config";
import { CI_RULES_2024 } from "./rules";

// ---------- state ----------
type NanoState = "checking" | "available" | "downloadable" | "downloading" | "unavailable";
declare const LanguageModel: { availability(): Promise<string> } | undefined;

let rules: Rules = CI_RULES_2024;
let nano: NanoState = "checking";
let prepared = false;
let current: { payslip: Payslip; checks: Check[]; table?: PayslipTable; source: Source } | undefined;

// ---------- tiny DOM helpers (dynamic text always goes through textContent) ----------
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
const fcfa = (n: number) => `${Math.round(n).toLocaleString("en-US")} FCFA`;

// cloudLabel: "anonymized" for questions; "with your consent" when the whole payslip went to the cloud.
function badge(source: Source, cloudLabel = "anonymized"): HTMLElement {
  const b = el("span", `badge badge-${source}`);
  b.innerHTML = source === "on_device" ? icons.lock : icons.cloud; // static SVG only
  b.append(source === "on_device" ? " On this device" : ` Cloud · ${cloudLabel}`);
  return b;
}

// Models sometimes answer in Markdown; we render plain text.
const plain = (t: string) => t.replace(/\*\*|__|^#+\s*/gm, "");

// ---------- layout ----------
$("#app").innerHTML = `
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a class="brand" href="/" aria-label="PayslipLens home">${icons.file}<span>PayslipLens</span></a>
      <div class="nano" id="nano-status" role="status" aria-live="polite"></div>
    </div>
  </header>

  <main class="wrap">
    <section class="hero">
      <h1>Understand your payslip.<br><span>Privately.</span></h1>
      <p class="lead">PayslipLens reads your Côte d'Ivoire payslip with Gemini Nano, the AI built into Chrome,
        checks CNPS, ITS and CMU against the law, and explains every line. Your salary never leaves this device.</p>
      <ol class="steps">
        <li>${icons.lock}<div><strong>Read on your device</strong><span>Gemini Nano extracts the figures inside Chrome.</span></div></li>
        <li>${icons.shield}<div><strong>Checked against the law</strong><span>Exact CNPS, ITS 2024 and CMU math, no guessing.</span></div></li>
        <li>${icons.cloud}<div><strong>Only anonymized questions go online</strong><span>You see exactly what is sent before it is sent.</span></div></li>
      </ol>
    </section>

    <section class="card upload" aria-labelledby="upload-title">
      <h2 id="upload-title">Check a payslip</h2>
      <div class="drop" id="drop">
        ${icons.upload}
        <p><strong>Drop your payslip here</strong> or</p>
        <div class="row">
          <button class="btn btn-primary" id="choose" type="button">Choose a file</button>
          <button class="btn btn-ghost" id="sample" type="button">Try a sample payslip</button>
        </div>
        <p class="hint">PDF, PNG or JPEG, up to 5 MB. Nothing is uploaded or stored.</p>
        <input id="file" type="file" accept="application/pdf,image/png,image/jpeg" hidden />
      </div>
      <div class="fallback" id="fallback" hidden>
        ${icons.info}
        <div>
          <p><strong>On-device AI is not available in this browser.</strong>
            Use desktop Chrome 139+ with Gemini Nano enabled (see the README) for fully private analysis.</p>
          <label class="consent"><input type="checkbox" id="consent" />
            Analyze in the cloud instead: my payslip will be sent to Google Gemini through Firebase.
            PayslipLens itself stores nothing.</label>
        </div>
      </div>
    </section>

    <section class="card progress" id="progress" hidden aria-live="polite">
      <ol class="progress-steps">
        <li id="p-read">Reading the file on this device</li>
        <li id="p-extract">Extracting figures <span id="p-where"></span> <span class="timer" id="p-timer"></span></li>
        <li id="p-check">Checking CNPS, ITS and CMU</li>
      </ol>
      <p class="hint" id="p-hint">On-device extraction takes about a minute on a laptop CPU. Your file stays here.</p>
    </section>

    <p class="error" id="error" role="alert" hidden></p>

    <section id="results" hidden>
      <div class="results-head">
        <h2>Your payslip <span id="period" class="muted"></span></h2>
        <span id="source-badge"></span>
      </div>
      <div class="figures" id="figures"></div>

      <div class="grid">
        <section class="card" aria-labelledby="checks-title">
          <div class="card-head">
            <h3 id="checks-title">Checks</h3>
            <label class="parts">Tax parts
              <input id="parts" type="number" min="1" max="5" step="0.5" inputmode="decimal" />
            </label>
          </div>
          <ul class="checks" id="checks"></ul>
          <p class="hint">Tax parts come from your family situation (1 single, 2 married, +0.5 per child). Change them to re-check ITS.</p>
        </section>

        <section class="card" aria-labelledby="ask-title">
          <h3 id="ask-title">Ask about this payslip</h3>
          <div class="chips" id="chips"></div>
          <label for="question" class="sr-only">Your question</label>
          <textarea id="question" rows="3" maxlength="400" placeholder="e.g. Why is my ITS higher this month?"></textarea>
          <button class="btn btn-primary" id="review" type="button">${icons.eye} Review what will be sent</button>
          <div class="preview" id="preview" hidden>
            <p class="preview-title">${icons.shield} This is the only text that leaves your device:</p>
            <pre id="preview-text"></pre>
            <div class="row">
              <button class="btn btn-primary" id="send" type="button">${icons.cloud} Send to cloud AI</button>
              <button class="btn btn-ghost" id="cancel" type="button">Cancel</button>
            </div>
          </div>
          <div class="answer" id="answer" hidden aria-live="polite"></div>
        </section>
      </div>

      <section class="card" id="table-card" aria-labelledby="table-title">
        <h3 id="table-title">Line by line</h3>
        <p class="hint">Select <strong>Explain</strong> on any line: Gemini Nano explains it on this device.</p>
        <div class="table-wrap"><table id="table"></table></div>
      </section>
    </section>
  </main>

  <footer class="wrap footer">
    <p>${icons.lock} No account, no upload, no storage. Built with Firebase AI Logic hybrid inference.
      <a href="https://github.com/Junmodeste/PayslipLens" rel="noopener">Source code</a></p>
  </footer>
`;

// ---------- on-device model status ----------
function renderNano(): void {
  const box = $("#nano-status");
  box.replaceChildren();
  const labels: Record<NanoState, string> = {
    checking: "Checking on-device AI…",
    available: prepared ? "On-device AI ready" : "On-device AI available",
    downloadable: "On-device AI not downloaded",
    downloading: "Downloading on-device AI…",
    unavailable: "On-device AI unavailable",
  };
  const dot = el("span", `dot dot-${nano === "available" ? "ok" : nano === "unavailable" ? "off" : "wait"}`);
  box.append(dot, el("span", "", labels[nano]));
  if (nano === "downloadable" || (nano === "available" && !prepared)) {
    const btn = el("button", "btn btn-small", nano === "downloadable" ? "Download (one time)" : "Turn on");
    btn.type = "button";
    btn.addEventListener("click", () => void prepareNano());
    box.append(btn);
  }
  $("#fallback").hidden = nano !== "unavailable";
}

async function detectNano(): Promise<void> {
  if (typeof LanguageModel === "undefined") nano = "unavailable";
  else {
    const a = await LanguageModel.availability();
    nano = a === "available" || a === "downloadable" || a === "downloading" ? a : "unavailable";
  }
  renderNano();
}

// Must be called inside a user gesture: Chrome only downloads / starts Nano on
// activation. One shared promise, so later callers just wait for it.
let preparing: Promise<void> | undefined;
function prepareNano(): Promise<void> {
  if (nano === "unavailable" || nano === "checking") return Promise.resolve();
  preparing ??= (async () => {
    nano = "downloading";
    renderNano();
    try {
      await Promise.all([prepareExtraction(), prepareExplain()]);
      prepared = true;
      nano = "available";
      renderNano();
    } catch {
      preparing = undefined;
      await detectNano();
    }
  })();
  return preparing;
}

// ---------- analysis flow ----------
function setStep(id: string, state: "todo" | "doing" | "done"): void {
  $(id).className = `step-${state}`;
}

function showError(message: string): void {
  const box = $("#error");
  box.textContent = message;
  box.hidden = false;
}

async function analyze(file: File): Promise<void> {
  $("#error").hidden = true;
  const useCloud = nano === "unavailable";
  if (useCloud && !$<HTMLInputElement>("#consent").checked) {
    showError("On-device AI is not available here. Tick the cloud consent box above, or open PayslipLens in Chrome with Gemini Nano.");
    return;
  }
  $("#results").hidden = true;
  $("#progress").hidden = false;
  ["#p-read", "#p-extract", "#p-check"].forEach((s) => setStep(s, "todo"));
  $("#p-where").textContent = useCloud ? "in the cloud (you agreed)" : "with Gemini Nano on this device";
  $("#p-hint").hidden = useCloud;

  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    setStep("#p-read", "doing");
    const input: PayslipInput = await readPayslip(file);
    setStep("#p-read", "done");

    setStep("#p-extract", "doing");
    const t0 = performance.now();
    timer = setInterval(() => ($("#p-timer").textContent = `${Math.round((performance.now() - t0) / 1000)} s`), 1000);
    if (!useCloud) await prepareNano();
    const payslip = useCloud ? await extractPayslipInCloud(input, true) : await extractPayslip(input);
    setStep("#p-extract", "done");

    setStep("#p-check", "doing");
    current = {
      payslip,
      checks: checkPayslip(payslip, rules),
      table: input.kind === "text" ? input.table : undefined,
      source: useCloud ? "in_cloud" : "on_device",
    };
    setStep("#p-check", "done");
    renderResults();
  } catch (err) {
    showError(`Could not analyze this payslip: ${(err as Error).message}`);
  } finally {
    clearInterval(timer);
    $("#progress").hidden = true;
  }
}

// ---------- results ----------
function renderResults(): void {
  if (!current) return;
  const { payslip: p, source } = current;
  $("#period").textContent = p.period ? `· ${p.period}` : "";
  const sourceBadge = $("#source-badge");
  sourceBadge.replaceChildren(badge(source, "with your consent"));

  const figures: [string, number][] = [
    ["Net pay", p.net_pay],
    ["Taxable gross", p.taxable_gross],
    ["Total deductions", p.total_deductions || p.cnps_employee + p.its + p.cmu_employee],
    ["Income tax (ITS)", p.its],
  ];
  $("#figures").replaceChildren(
    ...figures.map(([label, value]) => {
      const f = el("div", "figure");
      f.append(el("span", "figure-label", label), el("span", "figure-value", fcfa(value)));
      return f;
    }),
  );

  $<HTMLInputElement>("#parts").value = String(p.tax_parts || 1);
  renderChecks();
  renderTable();
  renderChips();
  $("#preview").hidden = true;
  $("#answer").hidden = true;
  $("#results").hidden = false;
  $("#results").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function renderChecks(): void {
  if (!current) return;
  $("#checks").replaceChildren(
    ...current.checks.map((c) => {
      const li = el("li", `check check-${c.status}`);
      const icon = el("span", "check-icon");
      icon.innerHTML = icons[c.status]; // static SVG only
      li.append(icon, el("span", "", c.message));
      return li;
    }),
  );
}

function renderTable(): void {
  const table = $<HTMLTableElement>("#table");
  table.replaceChildren();
  const rows = current?.table?.rows ?? [];
  $("#table-card").hidden = rows.length === 0;
  if (!current?.table || rows.length === 0) return;

  const cols = current.table.columns;
  const head = el("tr");
  head.append(el("th", "", "Line"), ...cols.map((c) => el("th", "num", c)), el("th", "", ""));
  table.append(el("thead"), el("tbody"));
  table.tHead!.append(head);

  for (const row of rows) {
    const tr = el("tr");
    tr.append(el("td", "", row.label), ...cols.map((c) => el("td", "num", row.values[c] ?? "")));
    const action = el("td", "action");
    const btn = el("button", "btn btn-small btn-ghost", "Explain");
    btn.type = "button";
    btn.disabled = nano === "unavailable";
    btn.title = btn.disabled ? "Needs on-device AI" : "Explained by Gemini Nano on this device";
    action.append(btn);
    tr.append(action);

    const detail = el("tr", "detail");
    detail.hidden = true;
    const cell = el("td");
    cell.colSpan = cols.length + 2;
    detail.append(cell);
    btn.addEventListener("click", () => void explainRow(row, cell, detail, btn));
    table.tBodies[0].append(tr, detail);
  }
}

async function explainRow(row: PayslipTable["rows"][number], cell: HTMLElement, detail: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  detail.hidden = false;
  btn.disabled = true;
  const text = el("p", "explain", "Thinking on this device…");
  cell.replaceChildren(text);
  const line = [row.label, ...Object.entries(row.values).map(([k, v]) => `${k}: ${v}`)].join(" | ");
  try {
    await prepareNano();
    const source = await explainLine(line, (t) => (text.textContent = plain(t)));
    cell.prepend(badge(source));
  } catch (err) {
    text.textContent = `Could not explain this line: ${(err as Error).message}`;
  } finally {
    btn.disabled = false;
  }
}

// ---------- questions (anonymized, cloud) ----------
const SUGGESTIONS = [
  "Is my ITS correct for my family situation?",
  "What does the CNPS deduction pay for later?",
  "Is the transport allowance taxed?",
];

function renderChips(): void {
  $("#chips").replaceChildren(
    ...SUGGESTIONS.map((s) => {
      const chip = el("button", "chip", s);
      chip.type = "button";
      chip.addEventListener("click", () => {
        $<HTMLTextAreaElement>("#question").value = s;
        review();
      });
      return chip;
    }),
  );
}

function review(): void {
  if (!current) return;
  const question = $<HTMLTextAreaElement>("#question").value.trim();
  if (!question) {
    $<HTMLTextAreaElement>("#question").focus();
    return;
  }
  $("#preview-text").textContent = anonymizedPrompt(current.payslip, current.checks, question);
  $("#preview").hidden = false;
  $("#answer").hidden = true;
  $<HTMLButtonElement>("#send").focus();
}

async function send(): Promise<void> {
  const prompt = $("#preview-text").textContent ?? "";
  $("#preview").hidden = true;
  const answer = $("#answer");
  answer.hidden = false;
  const text = el("p", "", "Asking the cloud AI…");
  answer.replaceChildren(text);
  try {
    const source = await askCloud(prompt, (t) => (text.textContent = plain(t)));
    answer.prepend(badge(source));
  } catch (err) {
    text.textContent = `The cloud AI could not answer: ${(err as Error).message}`;
  }
}

// ---------- events ----------
const fileInput = $<HTMLInputElement>("#file");
$("#choose").addEventListener("click", () => {
  void prepareNano();
  fileInput.click();
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file) void analyze(file);
});
$("#sample").addEventListener("click", async () => {
  void prepareNano();
  const blob = await (await fetch("/samples/payslip-ok.pdf")).blob();
  void analyze(new File([blob], "sample-payslip.pdf", { type: "application/pdf" }));
});

const drop = $("#drop");
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drop-active");
});
drop.addEventListener("dragleave", () => drop.classList.remove("drop-active"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drop-active");
  void prepareNano();
  const file = e.dataTransfer?.files[0];
  if (file) void analyze(file);
});

$("#parts").addEventListener("change", () => {
  if (!current) return;
  const parts = Number($<HTMLInputElement>("#parts").value);
  if (!(parts >= 1 && parts <= 5)) return;
  current.payslip = { ...current.payslip, tax_parts: parts };
  current.checks = checkPayslip(current.payslip, rules);
  renderChecks();
});
$("#review").addEventListener("click", review);
$("#send").addEventListener("click", () => void send());
$("#cancel").addEventListener("click", () => ($("#preview").hidden = true));

// ---------- start ----------
configureCloud(DEFAULT_CLOUD_MODEL);
renderNano();
void detectNano();
void loadConfig().then((cfg) => {
  rules = cfg.rules;
  configureCloud(cfg.cloudModel);
});
