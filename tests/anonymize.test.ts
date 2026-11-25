import { test } from "node:test";
import assert from "node:assert/strict";
import { anonymizedPrompt, maskQuestion, salaryBand } from "../src/anonymize.ts";
import { checkPayslip, type PayslipFigures } from "../src/rules.ts";

const payslip: PayslipFigures = {
  gross_salary: 330_000,
  taxable_gross: 300_000,
  transport_allowance: 30_000,
  cnps_employee: 18_900,
  its: 28_000,
  cmu_employee: 1_000,
  total_deductions: 47_900,
  net_pay: 282_100,
  tax_parts: 2,
};

test("salary becomes a band", () => {
  assert.equal(salaryBand(300_000), "300,000 to 500,000 FCFA");
  assert.equal(salaryBand(50_000), "below 75,000 FCFA");
  assert.equal(salaryBand(5_000_000), "above 2,400,000 FCFA");
});

test("question masks amounts, emails and phone numbers but keeps small numbers", () => {
  assert.equal(
    maskQuestion("Why 28 000 ITS for 2 kids? Mail me at a.b@x.ci or +225 07 07 07 07 07"),
    "Why [amount] ITS for 2 kids? Mail me at [email] or [number]",
  );
});

test("prompt contains no exact payslip amount", () => {
  const prompt = anonymizedPrompt(payslip, checkPayslip(payslip), "Is my ITS of 28000 correct?");
  for (const n of [330000, 300000, 18900, 28000, 47900, 282100]) {
    const plain = String(n);
    const spaced = n.toLocaleString("fr-FR").replace(/\s/g, " ");
    const commas = n.toLocaleString("en-US");
    assert.ok(!prompt.includes(plain) && !prompt.includes(spaced), `leaked ${plain}`);
    // Band bounds use commas; the exact amounts must not appear in that form either,
    // except when an amount is itself a band bound.
    if (![300000].includes(n)) assert.ok(!prompt.includes(commas), `leaked ${commas}`);
  }
  assert.match(prompt, /6\.3% of taxable gross/);
  assert.match(prompt, /Question: Is my ITS of \[amount\] correct\?/);
});
