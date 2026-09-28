import type { RetirementStrategy } from "./fire-calc";
import type { Lang } from "./i18n";

// A plan lives in the page URL so it can be bookmarked or shared; no account needed.

export const CURRENCIES = ["USD", "AUD", "EUR", "GBP", "CAD", "SGD", "VND"] as const;
export type Currency = (typeof CURRENCIES)[number];

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
  lang: Lang;
  currency: Currency;
}

export const DEFAULT_PLAN: Plan = {
  currentAge: 36,
  retirementAge: 65,
  currentBalance: 500000,
  monthlyIncome: 4000,
  monthlyExpense: 3000,
  annualReturn: 9,
  inflationRate: 3,
  safeWithdrawalRate: 4,
  retirementStrategy: "safe_fire",
  futureDollars: false,
  lang: "en",
  currency: "USD",
};

type AmountKey = "currentBalance" | "monthlyIncome" | "monthlyExpense";

// Starting amounts sized for the currency. Only đồng needs its own; the others share one scale.
export const DEFAULT_AMOUNTS: Record<"VND" | "other", Pick<Plan, AmountKey>> = {
  VND: { currentBalance: 1_000_000_000, monthlyIncome: 30_000_000, monthlyExpense: 20_000_000 },
  other: {
    currentBalance: DEFAULT_PLAN.currentBalance,
    monthlyIncome: DEFAULT_PLAN.monthlyIncome,
    monthlyExpense: DEFAULT_PLAN.monthlyExpense,
  },
};

export const amountsFor = (currency: Currency) => DEFAULT_AMOUNTS[currency === "VND" ? "VND" : "other"];

export const defaultsFor = (currency: Currency, lang: Lang): Plan => ({
  ...DEFAULT_PLAN,
  ...amountsFor(currency),
  currency,
  lang,
});

type NumberKey = Exclude<keyof Plan, "retirementStrategy" | "futureDollars" | "lang" | "currency">;

// URL name and accepted range for each number; anything outside falls back to the default.
const NUMBERS: Record<NumberKey, [param: string, min: number, max: number]> = {
  currentAge: ["age", 0, 120],
  retirementAge: ["retire", 0, 120],
  currentBalance: ["invested", 0, 1e13],
  monthlyIncome: ["income", 0, 1e11],
  monthlyExpense: ["spend", 0, 1e11],
  annualReturn: ["return", -20, 30],
  inflationRate: ["inflation", -5, 25],
  safeWithdrawalRate: ["withdraw", 0.1, 20],
};

const STRATEGIES: Record<string, RetirementStrategy> = { safe: "safe_fire", crossover: "income_crossover" };
const LANGS: Lang[] = ["en", "vi"];

/** Reads a plan from a query string; anything missing or invalid comes from `base`. */
export function planFromSearch(search: string, base: Plan = DEFAULT_PLAN): Plan {
  const params = new URLSearchParams(search);
  const lang = LANGS.find((l) => l === params.get("lang")) ?? base.lang;
  const currency = CURRENCIES.find((c) => c === params.get("cur")) ?? base.currency;
  // A different currency than the base brings its own starting amounts.
  const plan: Plan = { ...base, ...(currency !== base.currency ? amountsFor(currency) : {}), lang, currency };

  for (const [key, [param, min, max]] of Object.entries(NUMBERS) as [NumberKey, [string, number, number]][]) {
    const raw = params.get(param);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    if (Number.isFinite(value) && value >= min && value <= max) plan[key] = value;
  }
  plan.retirementStrategy = STRATEGIES[params.get("stop") ?? ""] ?? plan.retirementStrategy;
  const dollars = params.get("dollars");
  if (dollars === "future" || dollars === "today") plan.futureDollars = dollars === "future";
  return plan;
}

/** Writes everything that differs from DEFAULT_PLAN, so a link means the same in any browser. */
export function planToSearch(plan: Plan): string {
  const params = new URLSearchParams();
  if (plan.lang !== DEFAULT_PLAN.lang) params.set("lang", plan.lang);
  if (plan.currency !== DEFAULT_PLAN.currency) params.set("cur", plan.currency);
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
