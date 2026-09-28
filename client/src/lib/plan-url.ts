import type { RetirementStrategy } from "./fire-calc";

// A plan lives in the page URL so it can be bookmarked or shared; no account needed.

export interface Plan {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  annualReturn: number;
  inflationRate: number;
  safeWithdrawalRate: number;
  retirementStrategy: RetirementStrategy;
  futureDollars: boolean;
}

export const DEFAULT_PLAN: Plan = {
  currentAge: 36,
  retirementAge: 65,
  currentBalance: 500000,
  monthlyIncome: 4000,
  monthlyExpense: 3000,
  annualReturn: 7,
  inflationRate: 3,
  safeWithdrawalRate: 4,
  retirementStrategy: "safe_fire",
  futureDollars: false,
};

type NumberKey = Exclude<keyof Plan, "retirementStrategy" | "futureDollars">;

// URL name and accepted range for each number; anything outside falls back to the default.
const NUMBERS: Record<NumberKey, [param: string, min: number, max: number]> = {
  currentAge: ["age", 0, 120],
  retirementAge: ["retire", 0, 120],
  currentBalance: ["invested", 0, 1e10],
  monthlyIncome: ["income", 0, 1e8],
  monthlyExpense: ["spend", 0, 1e8],
  annualReturn: ["return", -20, 30],
  inflationRate: ["inflation", -5, 25],
  safeWithdrawalRate: ["withdraw", 0.1, 20],
};

const STRATEGIES: Record<string, RetirementStrategy> = { safe: "safe_fire", crossover: "income_crossover" };

export function planFromSearch(search: string): Plan {
  const params = new URLSearchParams(search);
  const plan = { ...DEFAULT_PLAN };
  for (const [key, [param, min, max]] of Object.entries(NUMBERS) as [NumberKey, [string, number, number]][]) {
    const raw = params.get(param);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    if (Number.isFinite(value) && value >= min && value <= max) plan[key] = value;
  }
  plan.retirementStrategy = STRATEGIES[params.get("stop") ?? ""] ?? plan.retirementStrategy;
  if (params.get("dollars") === "future") plan.futureDollars = true;
  return plan;
}

export function planToSearch(plan: Plan): string {
  const params = new URLSearchParams();
  for (const [key, [param]] of Object.entries(NUMBERS) as [NumberKey, [string, number, number]][]) {
    if (plan[key] !== DEFAULT_PLAN[key]) params.set(param, String(plan[key]));
  }
  if (plan.retirementStrategy !== DEFAULT_PLAN.retirementStrategy) {
    params.set("stop", plan.retirementStrategy === "income_crossover" ? "crossover" : "safe");
  }
  if (plan.futureDollars) params.set("dollars", "future");
  const query = params.toString();
  return query ? `?${query}` : "";
}
