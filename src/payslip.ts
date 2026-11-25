// On-device extraction: payslip (text or image) -> structured JSON, with Gemini Nano.
// Mode ONLY_ON_DEVICE: if Nano is missing this throws; it never falls back to the cloud.
import { getGenerativeModel, InferenceMode, type Part } from "firebase/ai";
import { ai } from "./firebase";
import { DEFAULT_CLOUD_MODEL } from "./config";
import { withRetry } from "./retry";
import type { PayslipInput } from "./input";

// Only the figures the rules engine needs. A short output keeps on-device
// generation fast; the full line-by-line table comes from the PDF itself.
export interface Payslip {
  period: string;
  gross_salary: number;
  taxable_gross: number;
  transport_allowance: number;
  cnps_employee: number;
  its: number;
  cmu_employee: number;
  total_deductions: number;
  net_pay: number;
  tax_parts: number;
}

const NUMBER_FIELDS = [
  "gross_salary", "taxable_gross", "transport_allowance", "cnps_employee", "its",
  "cmu_employee", "total_deductions", "net_pay", "tax_parts",
] as const;

const money = { type: "number", minimum: 0 };

// JSON Schema used as the Prompt API responseConstraint. Names and IDs are
// deliberately absent: we never extract who the employee is.
export const PAYSLIP_SCHEMA = {
  type: "object",
  properties: {
    period: { type: "string" },
    gross_salary: money,
    taxable_gross: money,
    transport_allowance: money,
    cnps_employee: money,
    its: money,
    cmu_employee: money,
    total_deductions: money,
    net_pay: money,
    tax_parts: { type: "number", minimum: 0, maximum: 5 },
  },
  required: ["period", ...NUMBER_FIELDS],
};

const INSTRUCTIONS = `You read payslips from Ivory Coast (amounts in FCFA / XOF).
Return only JSON matching the schema. Rules:
- Amounts are plain numbers without spaces or currency ("150 000 F" -> 150000).
- gross_salary: total gross pay ("Salaire brut", "Total brut").
- taxable_gross: taxable gross ("Brut imposable"); if absent, gross_salary minus transport allowance.
- transport_allowance: "Indemnité de transport" (0 if absent).
- Values may be tagged with their column, e.g. "Retenue: 18 900 | Part patronale: 23 100".
  Employee deductions are in the "Retenue" (or "Part salariale") column; never use "Part patronale".
- cnps_employee: employee CNPS retirement deduction ("CNPS", "Retraite", "CRS").
- its: "ITS" or "Impôt sur salaire", employee deduction.
- cmu_employee: "CMU" employee deduction (0 if absent).
- total_deductions: "Total retenues" (employee deductions only).
- net_pay: "Net à payer".
- tax_parts: "Nombre de parts" (0 if not shown).
- Use 0 when a value is not on the payslip. Never invent values.
- Never output names, addresses, ID or account numbers.`;

const extractModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_ON_DEVICE,
  onDeviceParams: {
    createOptions: {
      expectedInputs: [{ type: "text", languages: ["en"] }, { type: "image" }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [{ role: "system", content: [{ type: "text", value: INSTRUCTIONS }] }],
    },
    promptOptions: { responseConstraint: PAYSLIP_SCHEMA },
  },
});

// Fallback for browsers without Gemini Nano. The UI calls it only after the
// user explicitly agrees to send this payslip to the cloud (ONLY_IN_CLOUD).
const cloudExtractModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: {
    model: DEFAULT_CLOUD_MODEL,
    systemInstruction: INSTRUCTIONS,
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: PAYSLIP_SCHEMA },
  },
});

export async function extractPayslipInCloud(input: PayslipInput, consent: true): Promise<Payslip> {
  if (consent !== true) throw new Error("Cloud extraction needs the user's consent.");
  const { response } = await withRetry(() => cloudExtractModel.generateContent(toParts(input)));
  return parsePayslip(response.text());
}

function toParts(input: PayslipInput): Part[] {
  return input.kind === "text"
    ? [{ type: "text", text: `Payslip text (rows separated by newlines, cells by "|"):\n${input.text}` }]
    : [
        { type: "text", text: "Extract this payslip." },
        { type: "inlineData", inlineData: { mimeType: input.mimeType, data: input.base64 } },
      ];
}

// Each model instance owns its own on-device session: it must be initialized
// on a user gesture (Prompt API rule) before the first generateContent.
export function prepareExtraction(onProgress?: (p: number) => void): Promise<void> {
  return extractModel.initializeDeviceModel(onProgress);
}

const TIMEOUT_MS = 120_000;

export async function extractPayslip(input: PayslipInput): Promise<Payslip> {
  const parts = toParts(input);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("On-device extraction timed out.")), TIMEOUT_MS);
  });
  try {
    const { response } = await Promise.race([extractModel.generateContent(parts), timeout]);
    return parsePayslip(response.text());
  } finally {
    clearTimeout(timer);
  }
}

export function parsePayslip(raw: string): Payslip {
  const data = JSON.parse(raw) as Payslip;
  for (const key of NUMBER_FIELDS) {
    if (typeof data[key] !== "number" || !Number.isFinite(data[key]) || data[key] < 0) {
      throw new Error(`Invalid value for ${key}`);
    }
  }
  return data;
}
