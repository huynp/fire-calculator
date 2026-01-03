export interface FireInputs {
  currentBalance: number;
  annualReturn: number; // Percentage (e.g., 7 for 7%)
  monthlyContribution: number;
  monthlyExpense: number;
  currentAge: number;
  retirementAge: number;
  inflationRate: number; // Percentage
  safeWithdrawalRate: number; // Percentage (usually 4%)
}

export interface YearlyData {
  age: number;
  year: number;
  balance: number;
  annualExpense: number;
  investmentIncome: number;
  fireNumber: number;
  isFireAchieved: boolean;
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
  } = inputs;

  const projection: YearlyData[] = [];
  let balance = currentBalance;
  let annualExpense = monthlyExpense * 12;
  const currentYear = new Date().getFullYear();
  
  const yearsToProject = 50;

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;
    
    // Adjust expenses for inflation
    // Formula: Future Value = Present Value * (1 + rate)^n
    const adjustedAnnualExpense = annualExpense * Math.pow(1 + inflationRate / 100, i);
    
    // FIRE Number = Annual Expenses / Safe Withdrawal Rate
    // This is the amount needed so that 4% withdrawal covers expenses
    const fireNumber = adjustedAnnualExpense / (safeWithdrawalRate / 100);
    
    // Investment Income = Current Balance * Safe Withdrawal Rate
    // This is how much you can safely withdraw annually
    const investmentIncome = balance * (safeWithdrawalRate / 100);
    
    // FIRE is achieved when investment income exceeds expenses
    // (i.e., when you can live off the investment returns)
    const isFireAchieved = investmentIncome >= adjustedAnnualExpense;

    projection.push({
      age,
      year,
      balance: Math.round(balance),
      annualExpense: Math.round(adjustedAnnualExpense),
      investmentIncome: Math.round(investmentIncome),
      fireNumber: Math.round(fireNumber),
      isFireAchieved,
    });

    // Calculate next year's balance
    // 1. Add investment growth
    const growth = balance * (annualReturn / 100);
    
    // 2. Add contributions (only if not retired yet)
    // We assume contributions stop at retirement age
    const annualContribution = age < retirementAge ? monthlyContribution * 12 : 0;
    
    balance = balance + growth + annualContribution;
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
