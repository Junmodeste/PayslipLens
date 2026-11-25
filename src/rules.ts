// Deterministic Ivory Coast payroll checks (2024 ITS reform).
// The LLM extracts and explains; the math is done here, exactly.
// Rates are defaults; they can be overridden at runtime (Remote Config).

export interface Rules {
  smig: number;
  cnpsRate: number;
  cnpsCeiling: number;
  cmuPerPerson: number;
  transportExemptCeiling: number;
  // Monthly ITS brackets: [upper bound of the bracket, rate]. Last bound is Infinity.
  itsBrackets: [number, number][];
  // Monthly family-charges reduction (RICF) by number of tax parts.
  ricfByParts: Record<string, number>;
}

export const CI_RULES_2024: Rules = {
  smig: 75_000,
  cnpsRate: 0.063,
  cnpsCeiling: 3_375_000,
  cmuPerPerson: 500,
  transportExemptCeiling: 30_000,
  itsBrackets: [
    [75_000, 0],
    [240_000, 0.16],
    [800_000, 0.21],
    [2_400_000, 0.24],
    [8_000_000, 0.28],
    [Infinity, 0.32],
  ],
  ricfByParts: {
    "1": 0, "1.5": 5_500, "2": 11_000, "2.5": 16_500, "3": 22_000,
    "3.5": 27_500, "4": 33_000, "4.5": 38_500, "5": 44_000,
  },
};

export type Status = "ok" | "warning" | "info";

export interface Check {
  id: "cnps" | "its" | "cmu" | "transport" | "net" | "smig";
  status: Status;
  expected?: number;
  actual?: number;
  message: string;
}

export interface PayslipFigures {
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

export function cnps(taxableGross: number, r: Rules = CI_RULES_2024): number {
  return Math.round(Math.min(taxableGross, r.cnpsCeiling) * r.cnpsRate);
}

export function itsBeforeReduction(taxableGross: number, r: Rules = CI_RULES_2024): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of r.itsBrackets) {
    if (taxableGross <= lower) break;
    tax += (Math.min(taxableGross, upper) - lower) * rate;
    lower = upper;
  }
  return Math.round(tax);
}

export function ricf(parts: number, r: Rules = CI_RULES_2024): number {
  const capped = Math.min(Math.max(Math.round(parts * 2) / 2, 1), 5);
  return r.ricfByParts[String(capped)] ?? 0;
}

export function its(taxableGross: number, parts: number, r: Rules = CI_RULES_2024): number {
  return Math.max(0, itsBeforeReduction(taxableGross, r) - ricf(parts, r));
}

// Payroll software rounds, prorates and annualizes ITS: allow a small gap.
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(100, 0.01 * Math.max(a, b));
const fcfa = (n: number) => `${Math.round(n).toLocaleString("en-US")} FCFA`;

export function checkPayslip(p: PayslipFigures, r: Rules = CI_RULES_2024): Check[] {
  const checks: Check[] = [];
  const base = p.taxable_gross;

  const cnpsExpected = cnps(base, r);
  checks.push(
    close(p.cnps_employee, cnpsExpected)
      ? { id: "cnps", status: "ok", expected: cnpsExpected, actual: p.cnps_employee,
          message: `CNPS retirement is ${r.cnpsRate * 100}% of ${fcfa(Math.min(base, r.cnpsCeiling))}: correct.` }
      : { id: "cnps", status: "warning", expected: cnpsExpected, actual: p.cnps_employee,
          message: `CNPS retirement should be about ${fcfa(cnpsExpected)} (${r.cnpsRate * 100}% of taxable gross, capped at ${fcfa(r.cnpsCeiling)}), payslip shows ${fcfa(p.cnps_employee)}.` },
  );

  const partsKnown = p.tax_parts > 0;
  const parts = partsKnown ? p.tax_parts : 1;
  const itsExpected = its(base, parts, r);
  const assumption = partsKnown ? `${parts} tax part(s)` : "1 tax part (not shown on the payslip)";
  checks.push(
    close(p.its, itsExpected)
      ? { id: "its", status: "ok", expected: itsExpected, actual: p.its,
          message: `ITS matches the 2024 scale with ${assumption}.` }
      : { id: "its", status: partsKnown ? "warning" : "info", expected: itsExpected, actual: p.its,
          message: `ITS should be about ${fcfa(itsExpected)} with ${assumption}; payslip shows ${fcfa(p.its)}.` +
            (partsKnown ? "" : " Your real number of parts (marriage, children) may explain the gap.") },
  );

  if (p.cmu_employee === 0) {
    checks.push({ id: "cmu", status: "info", actual: 0,
      message: `No CMU deduction found. CMU is usually ${fcfa(r.cmuPerPerson)} per covered person per month.` });
  } else {
    const persons = p.cmu_employee / r.cmuPerPerson;
    checks.push(Number.isInteger(persons)
      ? { id: "cmu", status: "ok", actual: p.cmu_employee,
          message: `CMU covers ${persons} person(s) at ${fcfa(r.cmuPerPerson)} each.` }
      : { id: "cmu", status: "warning", actual: p.cmu_employee,
          message: `CMU should be a multiple of ${fcfa(r.cmuPerPerson)} (per covered person); payslip shows ${fcfa(p.cmu_employee)}.` });
  }

  if (p.transport_allowance > r.transportExemptCeiling) {
    checks.push({ id: "transport", status: "info", actual: p.transport_allowance,
      message: `Transport allowance is tax-free up to ${fcfa(r.transportExemptCeiling)}; the extra ${fcfa(p.transport_allowance - r.transportExemptCeiling)} should be taxed.` });
  }

  // Total shown on the payslip, or at least the three legal deductions.
  const deductions = p.total_deductions || p.cnps_employee + p.its + p.cmu_employee;
  if (deductions > 0 && p.net_pay > 0) {
    // Payslips show transport either inside the gross or added after deductions.
    const candidates = [p.gross_salary - deductions, p.taxable_gross + p.transport_allowance - deductions];
    const match = candidates.some((c) => close(c, p.net_pay));
    checks.push(match
      ? { id: "net", status: "ok", actual: p.net_pay, message: "Net pay adds up: gross minus deductions." }
      : { id: "net", status: "warning", expected: Math.round(candidates[0]), actual: p.net_pay,
          message: `Net pay does not add up: gross minus listed deductions gives about ${fcfa(candidates[0])}, payslip shows ${fcfa(p.net_pay)}.` });
  }

  if (base > 0 && base < r.smig) {
    checks.push({ id: "smig", status: "info", actual: base,
      message: `Taxable gross is below the monthly minimum wage (${fcfa(r.smig)}). Fine for part-time or a partial month, worth checking otherwise.` });
  }

  return checks;
}
