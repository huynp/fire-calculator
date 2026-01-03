// Verify post-FIRE withdrawal logic

console.log('POST-FIRE WITHDRAWAL VERIFICATION\n');
console.log('Year 2029 → 2030 Calculation:');
console.log('================================');

const balance2029 = 1019424;
const expenses2030 = 40518;
const returnRate = 0.08;

console.log(`Starting balance (2029): $${balance2029.toLocaleString()}`);
console.log(`Expenses to withdraw (2030): $${expenses2030.toLocaleString()}`);
console.log(`Investment return: 8%\n`);

console.log('CORRECT Calculation (after fix):');
console.log('--------------------------------');
const growth = balance2029 * returnRate;
const balanceAfterGrowth = balance2029 + growth;
const balanceAfterWithdrawal = balanceAfterGrowth - expenses2030;
console.log(`1. Add growth: $${balance2029.toLocaleString()} × 1.08 = $${Math.round(balanceAfterGrowth).toLocaleString()}`);
console.log(`2. Subtract expenses: $${Math.round(balanceAfterGrowth).toLocaleString()} - $${expenses2030.toLocaleString()} = $${Math.round(balanceAfterWithdrawal).toLocaleString()}`);
console.log(`Result: $${Math.round(balanceAfterWithdrawal).toLocaleString()}\n`);

console.log('BUGGY Calculation (old CSV):');
console.log('----------------------------');
const buggyBalance = balance2029 * 1.08;
console.log(`1. Just add growth: $${balance2029.toLocaleString()} × 1.08 = $${Math.round(buggyBalance).toLocaleString()}`);
console.log(`2. Never subtract expenses ❌`);
console.log(`Result: $${Math.round(buggyBalance).toLocaleString()}`);
console.log(`CSV showed: $1,100,978\n`);

console.log('Summary:');
console.log('========');
console.log(`✓ Fixed calculation: $${Math.round(balanceAfterWithdrawal).toLocaleString()}`);
console.log(`✗ Old buggy calc: $${Math.round(buggyBalance).toLocaleString()}`);
console.log(`Difference: $${Math.round(buggyBalance - balanceAfterWithdrawal).toLocaleString()} (overly optimistic!)`);
