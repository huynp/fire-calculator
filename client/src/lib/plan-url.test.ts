import { describe, it, expect } from "vitest";
import { DEFAULT_PLAN, planFromSearch, planToSearch } from "./plan-url";

describe("plan in the URL", () => {
  it("round-trips a changed plan", () => {
    const plan = { ...DEFAULT_PLAN, currentAge: 41, monthlyIncome: 8200, annualReturn: 5.5, retirementStrategy: "income_crossover" as const, futureDollars: true };
    expect(planFromSearch(planToSearch(plan))).toEqual(plan);
  });

  it("writes only values that differ from the defaults", () => {
    expect(planToSearch(DEFAULT_PLAN)).toBe("");
    expect(planToSearch({ ...DEFAULT_PLAN, currentAge: 41 })).toBe("?age=41");
  });

  it("ignores values that are missing, not numbers, out of range or unknown", () => {
    const plan = planFromSearch("?age=abc&retire=500&income=-5&stop=yolo&return=&dollars=maybe&withdraw=6");
    expect(plan).toEqual({ ...DEFAULT_PLAN, safeWithdrawalRate: 6 });
  });
});
