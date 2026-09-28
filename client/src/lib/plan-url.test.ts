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

  it("round-trips assets and other income", () => {
    const plan = {
      ...DEFAULT_PLAN,
      assets: [
        { kind: "savings" as const, amount: 20000, rate: 4.5 },
        { kind: "property" as const, amount: 800000 },
      ],
      otherIncome: [{ kind: "rent" as const, monthly: 1200, fromAge: 36 }],
    };
    expect(planToSearch(plan)).toBe("?asset=savings%3A20000%3A4.5&asset=property%3A800000&other=rent%3A1200%3A36");
    expect(planFromSearch(planToSearch(plan))).toEqual(plan);
  });

  it("drops unknown or broken rows, defaults a missing deposit rate, and caps at 10", () => {
    const plan = planFromSearch("?asset=boat:5000&asset=savings:abc&asset=savings:20000&other=rent:-5:40&other=pension:1500");
    expect(plan.assets).toEqual([{ kind: "savings", amount: 20000, rate: 4 }]);
    expect(plan.otherIncome).toEqual([]);
    const many = "?" + Array.from({ length: 12 }, () => "asset=property:1").join("&");
    expect(planFromSearch(many).assets).toHaveLength(10);
  });

  it("other-income rows never collide with take-home pay, whatever the parameter order", () => {
    const plan = planFromSearch("?other=rent%3A1200%3A36&income=5000");
    expect(plan.monthlyIncome).toBe(5000);
    expect(plan.otherIncome).toEqual([{ kind: "rent", monthly: 1200, fromAge: 36 }]);
  });

  it("old links without lists open with empty lists", () => {
    const plan = planFromSearch("?invested=100");
    expect(plan.assets).toEqual([]);
    expect(plan.otherIncome).toEqual([]);
  });
});
