import { test } from "node:test";
import assert from "node:assert/strict";
import { cnps, its, itsBeforeReduction, ricf, checkPayslip, type PayslipFigures } from "../src/rules.ts";

test("CNPS is 6.3% of taxable gross", () => {
  assert.equal(cnps(300_000), 18_900);
});

test("CNPS is capped at 3,375,000", () => {
  assert.equal(cnps(4_000_000), 212_625);
});

test("ITS is zero up to 75,000", () => {
  assert.equal(itsBeforeReduction(75_000), 0);
});

test("ITS progressive scale at 300,000", () => {
  // (240,000 - 75,000) * 16% + (300,000 - 240,000) * 21% = 26,400 + 12,600
  assert.equal(itsBeforeReduction(300_000), 39_000);
});

test("ITS progressive scale at 4,000,000", () => {
  // 26,400 + 117,600 + 384,000 + 448,000
  assert.equal(itsBeforeReduction(4_000_000), 976_000);
});

test("RICF by parts, capped at 5", () => {
  assert.equal(ricf(1), 0);
  assert.equal(ricf(2), 11_000);
  assert.equal(ricf(2.5), 16_500);
  assert.equal(ricf(7), 44_000);
});

test("ITS minus RICF never goes below zero", () => {
  assert.equal(its(300_000, 2), 28_000);
  assert.equal(its(100_000, 5), 0);
});

const ok: PayslipFigures = {
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

test("a correct payslip has no warnings", () => {
  const checks = checkPayslip(ok);
  assert.deepEqual(checks.filter((c) => c.status === "warning"), []);
  assert.deepEqual(checks.map((c) => c.id), ["cnps", "its", "cmu", "net"]);
});

test("wrong CNPS and ITS are flagged", () => {
  const checks = checkPayslip({ ...ok, cnps_employee: 25_000, its: 39_000 });
  assert.equal(checks.find((c) => c.id === "cnps")?.status, "warning");
  assert.equal(checks.find((c) => c.id === "its")?.expected, 28_000);
});

test("unknown parts gives info, not warning", () => {
  const checks = checkPayslip({ ...ok, tax_parts: 0 });
  const itsCheck = checks.find((c) => c.id === "its")!;
  assert.equal(itsCheck.status, "info");
  assert.equal(itsCheck.expected, 39_000);
});

test("CMU must be a multiple of 500", () => {
  assert.equal(checkPayslip({ ...ok, cmu_employee: 700 }).find((c) => c.id === "cmu")?.status, "warning");
});

test("transport above 30,000 and sub-SMIG gross are reported", () => {
  const ids = checkPayslip({ ...ok, transport_allowance: 50_000, taxable_gross: 60_000 }).map((c) => c.id);
  assert.ok(ids.includes("transport"));
  assert.ok(ids.includes("smig"));
});

test("net pay mismatch is flagged", () => {
  assert.equal(checkPayslip({ ...ok, net_pay: 250_000 }).find((c) => c.id === "net")?.status, "warning");
});

test("net check falls back to legal deductions when no total is shown", () => {
  assert.equal(checkPayslip({ ...ok, total_deductions: 0 }).find((c) => c.id === "net")?.status, "ok");
});
