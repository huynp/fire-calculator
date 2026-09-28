import { describe, it, expect } from "vitest";
import { DEFAULT_PLAN, defaultsFor, planFromSearch, planToSearch } from "./plan-url";

describe("plan in the URL", () => {
  it("round-trips a changed plan", () => {
    const plan = {
      ...DEFAULT_PLAN,
      currentAge: 41,
      monthlyIncome: 8200,
      annualReturn: 5.5,
      retirementStrategy: "income_crossover" as const,
      futureDollars: true,
      lang: "vi" as const,
      currency: "AUD" as const,
    };
    expect(planFromSearch(planToSearch(plan))).toEqual(plan);
  });

  it("writes only values that differ from the defaults", () => {
    expect(planToSearch(DEFAULT_PLAN)).toBe("");
    expect(planToSearch({ ...DEFAULT_PLAN, currentAge: 41 })).toBe("?age=41");
  });

  it("ignores values that are missing, not numbers, out of range or unknown", () => {
    const plan = planFromSearch("?age=abc&retire=500&income=-5&stop=yolo&return=&dollars=maybe&withdraw=6&cur=XYZ&lang=fr");
    expect(plan).toEqual({ ...DEFAULT_PLAN, safeWithdrawalRate: 6 });
  });

  it("uses đồng-sized amounts for a VND plan without amounts, and keeps given ones", () => {
    expect(planFromSearch("?cur=VND")).toEqual(defaultsFor("VND", "en"));
    expect(planFromSearch("?cur=VND&income=45000000").monthlyIncome).toBe(45_000_000);
  });

  it("falls back to the given base (e.g. a Vietnamese browser) when the link says nothing", () => {
    const base = defaultsFor("VND", "vi");
    expect(planFromSearch("", base)).toEqual(base);
    expect(planFromSearch("?lang=en&cur=USD", base)).toEqual(DEFAULT_PLAN);
  });
});
