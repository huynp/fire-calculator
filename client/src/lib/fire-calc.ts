export type RetirementStrategy = "income_crossover" | "safe_fire";

export type AssetKind = "investments" | "savings" | "property";
/** An asset besides the main investment balance. `rate` (%) applies to savings only. */
export interface ExtraAsset {
  kind: AssetKind;
  amount: number;
  rate?: number;
}

export type IncomeKind = "rent" | "pension" | "side" | "other";
/** Income that is not a listed asset's growth, in today's money, from `fromAge` on. */
export interface OtherIncome {
  kind: IncomeKind;
  monthly: number;
  fromAge: number;
}

export interface FireInputs {
  currentBalance: number;
  annualReturn: number; // Percentage (e.g., 7 for 7%)
  monthlyContribution: number;
  monthlyExpense: number;
  currentAge: number;
  retirementAge: number;
  inflationRate: number; // Percentage
  safeWithdrawalRate: number; // Percentage (usually 4%)
  retirementStrategy: RetirementStrategy;
  assets?: ExtraAsset[];
  otherIncome?: OtherIncome[];
}

export interface YearlyData {
  age: number;
  year: number;
  balance: number;
  annualContribution: number;
  annualExpense: number;
  investmentIncome: number;
  safeWithdrawalAmount: number;
  fireNumber: number;
  isFireAchieved: boolean; // Safe FIRE (4% rule)
  isIncomeCrossover: boolean; // Income > Expenses
  otherIncome: number; // yearly, inflation-adjusted
  netWorth: number; // investable money plus property
  need: number; // expenses not covered by other income: what the portfolio must pay
}

export const calculateFireProjection = (inputs: FireInputs): YearlyData[] => {
  const {
    currentBalance,
    annualReturn,
    monthlyContribution,
    monthlyExpense,
    currentAge,
    retirementAge,
    inflationRate,
    safeWithdrawalRate,
    retirementStrategy,
    assets = [],
    otherIncome = [],
  } = inputs;

  const projection: YearlyData[] = [];
  const annualExpense = monthlyExpense * 12;
  const currentYear = new Date().getFullYear();
  const yearsToProject = 50;

  // All investment rows share one pool, which also receives the monthly savings.
  let pool = currentBalance + assets.filter((a) => a.kind === "investments").reduce((s, a) => s + a.amount, 0);
  // Each deposit grows at its own interest rate; interest is growth, not income.
  const deposits = assets
    .filter((a) => a.kind === "savings")
    .map((a) => ({ balance: a.amount, rate: (a.rate ?? 4) / 100 }));
  // Property keeps pace with inflation and only counts in net worth.
  const property = assets.filter((a) => a.kind === "property").reduce((s, a) => s + a.amount, 0);

  // Once the trigger is hit you stop working for good, even if a later year dips below it.
  let isRetired = false;

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;
    const inflation = Math.pow(1 + inflationRate / 100, i);

    const adjustedAnnualExpense = annualExpense * inflation;
    const income = otherIncome.filter((o) => o.fromAge <= age).reduce((s, o) => s + o.monthly * 12, 0) * inflation;
    // What the portfolio has to cover once other income is counted.
    const need = Math.max(0, adjustedAnnualExpense - income);

    const depositTotal = deposits.reduce((s, d) => s + d.balance, 0);
    const investable = pool + depositTotal;
    const fireNumber = need / (safeWithdrawalRate / 100);
    const investmentIncome = pool * (annualReturn / 100) + deposits.reduce((s, d) => s + d.balance * d.rate, 0);
    const safeWithdrawalAmount = investable * (safeWithdrawalRate / 100);

    const isIncomeCrossover = investmentIncome >= need;
    const isFireAchieved = safeWithdrawalAmount >= need;

    isRetired ||= retirementStrategy === "income_crossover" ? isIncomeCrossover : isFireAchieved;

    const annualContribution = age < retirementAge && !isRetired ? monthlyContribution * 12 : 0;

    projection.push({
      age,
      year,
      balance: Math.round(investable),
      annualContribution,
      annualExpense: Math.round(adjustedAnnualExpense),
      investmentIncome: Math.round(investmentIncome),
      safeWithdrawalAmount: Math.round(safeWithdrawalAmount),
      fireNumber: Math.round(fireNumber),
      isFireAchieved,
      isIncomeCrossover,
      otherIncome: Math.round(income),
      netWorth: Math.round(investable + property * inflation),
      need: Math.round(need),
    });

    // Next year: growth, then savings in or spending out.
    pool += pool * (annualReturn / 100);
    deposits.forEach((d) => (d.balance += d.balance * d.rate));

    if (isRetired) {
      // Spending comes out of the pool and deposits in proportion to their size.
      const total = pool + deposits.reduce((s, d) => s + d.balance, 0);
      if (total > 0) {
        const share = need / total;
        pool -= pool * share;
        deposits.forEach((d) => (d.balance -= d.balance * share));
      } else {
        pool -= need;
      }
    } else {
      pool += annualContribution + income;
    }
  }

  return projection;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};
