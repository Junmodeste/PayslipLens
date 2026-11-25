// Builds the only text that may leave the device: salary as a band, deductions
// as percentages, check results without amounts, and the user's question with
// numbers, emails and phone numbers masked. The user sees it before sending.
import type { Check, PayslipFigures } from "./rules.ts";

const BANDS: [number, string][] = [
  [75_000, "below 75,000 FCFA"],
  [150_000, "75,000 to 150,000 FCFA"],
  [300_000, "150,000 to 300,000 FCFA"],
  [500_000, "300,000 to 500,000 FCFA"],
  [1_000_000, "500,000 to 1,000,000 FCFA"],
  [2_400_000, "1,000,000 to 2,400,000 FCFA"],
  [Infinity, "above 2,400,000 FCFA"],
];

export function salaryBand(amount: number): string {
  return BANDS.find(([max]) => amount < max)![1];
}

const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "n/a");

export function maskQuestion(question: string): string {
  return question
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s.-]{7,}\d/g, "[number]") // phone, account or ID numbers
    .replace(/\d[\d\s.,]*\d|\d/g, (m) => (m.replace(/\D/g, "").length >= 3 ? "[amount]" : m))
    .trim();
}

export function anonymizedPrompt(p: PayslipFigures, checks: Check[], question: string): string {
  const base = p.taxable_gross || p.gross_salary;
  const context = [
    "Country: Côte d'Ivoire. Rules: 2024 ITS reform.",
    `Monthly taxable gross: ${salaryBand(base)}.`,
    `CNPS employee deduction: ${pct(p.cnps_employee, base)} of taxable gross.`,
    `ITS: ${pct(p.its, base)} of taxable gross.`,
    `Tax parts: ${p.tax_parts || "not shown"}.`,
    `CMU: ${p.cmu_employee > 0 ? "deducted" : "not deducted"}.`,
    `Transport allowance: ${p.transport_allowance > 30_000 ? "above the 30,000 FCFA exemption" : p.transport_allowance > 0 ? "within the exemption" : "none"}.`,
    `Automatic checks: ${checks.map((c) => `${c.id}=${c.status}`).join(", ") || "none"}.`,
  ].join("\n");
  return `${context}\n\nQuestion: ${maskQuestion(question)}`;
}

export const CLOUD_SYSTEM_PROMPT = `You are a payroll assistant for employees in Côte d'Ivoire.
You receive an anonymized payslip summary (no names, no exact amounts) and a question.
Answer in plain language and plain text (no Markdown), in at most 150 words, in the language of the question.
Cite the rule (Code du travail, CNPS, Code général des impôts) when relevant.
If the answer depends on the employee's exact situation, say what to check and who to ask (HR, CNPS, tax office).
Never ask for personal data.`;
