export type RetirementStrategy = "income_crossover" | "safe_fire";

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
  } = inputs;

  const projection: YearlyData[] = [];
  let balance = currentBalance;
  let annualExpense = monthlyExpense * 12;
  const currentYear = new Date().getFullYear();
  
  const yearsToProject = 50;
  // Once the trigger is hit you stop working for good, even if a later year dips below it.
  let isRetired = false;

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;
    
    // Adjust expenses for inflation
    // Formula: Future Value = Present Value * (1 + rate)^n
    const adjustedAnnualExpense = annualExpense * Math.pow(1 + inflationRate / 100, i);
    
    // FIRE Number = Annual Expenses / Safe Withdrawal Rate
    // This is the amount needed so that 4% withdrawal covers expenses
    const fireNumber = adjustedAnnualExpense / (safeWithdrawalRate / 100);

    // Investment Income = actual investment return
    const investmentIncome = balance * (annualReturn / 100);

    // Safe withdrawal amount (4% rule)
    const safeWithdrawalAmount = balance * (safeWithdrawalRate / 100);

    // Two milestones:
    // 1. Income Crossover: when investment returns > expenses (aggressive)
    const isIncomeCrossover = investmentIncome >= adjustedAnnualExpense;
    // 2. Safe FIRE: when safe withdrawal (4%) > expenses (conservative)
    const isFireAchieved = safeWithdrawalAmount >= adjustedAnnualExpense;

    // Determine if retirement is triggered based on chosen strategy
    isRetired ||= retirementStrategy === "income_crossover"
      ? isIncomeCrossover
      : isFireAchieved;

    // Calculate contribution for this year
    const annualContribution = age < retirementAge && !isRetired ? monthlyContribution * 12 : 0;

    projection.push({
      age,
      year,
      balance: Math.round(balance),
      annualContribution,
      annualExpense: Math.round(adjustedAnnualExpense),
      investmentIncome: Math.round(investmentIncome),
      safeWithdrawalAmount: Math.round(safeWithdrawalAmount),
      fireNumber: Math.round(fireNumber),
      isFireAchieved,
      isIncomeCrossover,
    });

    // Calculate next year's balance
    // 1. Add investment growth
    const growth = balance * (annualReturn / 100);

    // 2. Subtract withdrawals if retired (living off portfolio)
    const withdrawal = isRetired ? adjustedAnnualExpense : 0;

    balance = balance + growth + annualContribution - withdrawal;
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
