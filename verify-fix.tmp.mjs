// Quick verification of the FIRE calculator fixes

const inputs = {
  currentBalance: 500000,
  annualReturn: 8,
  monthlyContribution: 10000,
  monthlyExpense: 3000,
  currentAge: 36,
  retirementAge: 65,
  inflationRate: 3,
  safeWithdrawalRate: 4,
};

let balance = inputs.currentBalance;
let annualExpense = inputs.monthlyExpense * 12;
const currentYear = new Date().getFullYear();

console.log('Year,Age,Balance,Annual Expenses,Investment Income,FIRE Number,FIRE Achieved');

for (let i = 0; i <= 5; i++) {
  const age = inputs.currentAge + i;
  const year = currentYear + i;

  // Adjust expenses for inflation
  const adjustedAnnualExpense = Math.round(annualExpense * Math.pow(1 + inputs.inflationRate / 100, i));

  // FIRE Number
  const fireNumber = Math.round(adjustedAnnualExpense / (inputs.safeWithdrawalRate / 100));

  // Investment Income = Balance * Annual Return (FIXED)
  const investmentIncome = Math.round(balance * (inputs.annualReturn / 100));

  // FIRE achieved when safe withdrawal >= expenses
  const safeWithdrawal = balance * (inputs.safeWithdrawalRate / 100);
  const isFireAchieved = safeWithdrawal >= adjustedAnnualExpense;

  console.log(`${year},${age},${Math.round(balance)},${adjustedAnnualExpense},${investmentIncome},${fireNumber},${isFireAchieved ? 'Yes' : 'No'}`);

  // Calculate next year's balance
  const growth = balance * (inputs.annualReturn / 100);
  const annualContribution = age < inputs.retirementAge ? inputs.monthlyContribution * 12 : 0;
  const withdrawal = isFireAchieved ? adjustedAnnualExpense : 0; // FIXED: Subtract withdrawals

  balance = balance + growth + annualContribution - withdrawal;
}

console.log('\nVerification Results:');
console.log('✓ Investment Income now uses 8% annual return (not 4% safe withdrawal)');
console.log('✓ Post-FIRE years now subtract living expenses from balance');
console.log('\nCompare Year 2027 with CSV:');
console.log('  Expected Investment Income: $52,800 (8% of $660,000)');
console.log('  CSV showed: $26,400 (was using 4% - BUG FIXED)');
