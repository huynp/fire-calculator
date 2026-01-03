import { describe, it, expect } from "vitest";

type RetirementStrategy = "income_crossover" | "safe_fire";

interface FireInputs {
  currentBalance: number;
  annualReturn: number;
  monthlyContribution: number;
  monthlyExpense: number;
  currentAge: number;
  retirementAge: number;
  inflationRate: number;
  safeWithdrawalRate: number;
  retirementStrategy: RetirementStrategy;
}

interface YearlyData {
  age: number;
  year: number;
  balance: number;
  annualContribution: number;
  annualExpense: number;
  investmentIncome: number;
  safeWithdrawalAmount: number;
  fireNumber: number;
  isFireAchieved: boolean;
  isIncomeCrossover: boolean;
}

const calculateFireProjection = (inputs: FireInputs): YearlyData[] => {
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

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;
    
    const adjustedAnnualExpense = annualExpense * Math.pow(1 + inflationRate / 100, i);
    const fireNumber = adjustedAnnualExpense / (safeWithdrawalRate / 100);
    const investmentIncome = balance * (annualReturn / 100);
    const safeWithdrawalAmount = balance * (safeWithdrawalRate / 100);
    const isIncomeCrossover = investmentIncome >= adjustedAnnualExpense;
    const isFireAchieved = safeWithdrawalAmount >= adjustedAnnualExpense;

    const isRetired = retirementStrategy === "income_crossover"
      ? isIncomeCrossover
      : isFireAchieved;
    const shouldContribute = age < retirementAge && !isRetired;
    const annualContribution = shouldContribute ? monthlyContribution * 12 : 0;

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

    const growth = balance * (annualReturn / 100);
    const withdrawal = isRetired ? adjustedAnnualExpense : 0;

    balance = balance + growth + annualContribution - withdrawal;
  }

  return projection;
};

describe("FIRE Calculator - Calculation Verification", () => {
  
  describe("Year 0 (Initial State)", () => {
    it("should correctly calculate year 0 values", () => {
      const inputs: FireInputs = {
        currentBalance: 50000,
        annualReturn: 7,
        monthlyContribution: 1000,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 3,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);
      const year0 = projection[0];

      expect(year0.year).toBe(new Date().getFullYear());
      expect(year0.age).toBe(30);
      expect(year0.balance).toBe(50000);
      expect(year0.annualExpense).toBe(36000);
      expect(year0.investmentIncome).toBe(3500); // 7% of 50000
      expect(year0.fireNumber).toBe(900000);
      expect(year0.isFireAchieved).toBe(false);
    });
  });

  describe("Inflation Calculation", () => {
    it("should correctly inflate expenses over time", () => {
      const inputs: FireInputs = {
        currentBalance: 100000,
        annualReturn: 0,
        monthlyContribution: 0,
        monthlyExpense: 1000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 3,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].annualExpense).toBe(12000);
      expect(projection[1].annualExpense).toBe(Math.round(12000 * 1.03));
      expect(projection[10].annualExpense).toBe(Math.round(12000 * Math.pow(1.03, 10)));

      const year5Expense = projection[5].annualExpense;
      const year6Expense = projection[6].annualExpense;
      const inflationFactor = year6Expense / year5Expense;
      expect(inflationFactor).toBeCloseTo(1.03, 2);
    });
  });

  describe("Investment Growth", () => {
    it("should correctly calculate compound growth", () => {
      const inputs: FireInputs = {
        currentBalance: 100000,
        annualReturn: 7,
        monthlyContribution: 0,
        monthlyExpense: 1000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 0,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].balance).toBe(100000);
      expect(projection[1].balance).toBe(Math.round(100000 * 1.07));
      expect(projection[2].balance).toBe(Math.round(100000 * Math.pow(1.07, 2)));
      expect(projection[10].balance).toBe(Math.round(100000 * Math.pow(1.07, 10)));
    });
  });

  describe("Contributions", () => {
    it("should add contributions and grow balance", () => {
      const inputs: FireInputs = {
        currentBalance: 10000,
        annualReturn: 0,
        monthlyContribution: 1000,
        monthlyExpense: 1000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 0,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].balance).toBe(10000);
      expect(projection[1].balance).toBe(22000);
      expect(projection[2].balance).toBe(34000);
    });

    it("should stop contributions when FIRE is achieved", () => {
      const inputs: FireInputs = {
        currentBalance: 900000,
        annualReturn: 7,
        monthlyContribution: 5000,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 0,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].isFireAchieved).toBe(true);
      // Year 1: 900k + 7% growth - 36k expenses = 900k * 1.07 - 36k = 927k
      expect(projection[1].balance).toBeCloseTo(900000 * 1.07 - 36000, -1);
    });

    it("should stop contributions at retirement age", () => {
      const inputs: FireInputs = {
        currentBalance: 10000,
        annualReturn: 0,
        monthlyContribution: 1000,
        monthlyExpense: 1000,
        currentAge: 60,
        retirementAge: 65,
        inflationRate: 0,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].balance).toBe(10000);
      expect(projection[5].balance).toBe(70000);
      expect(projection[6].balance).toBe(70000);
    });
  });

  describe("FIRE Achievement Logic", () => {
    it("should correctly identify when FIRE is achieved", () => {
      const inputs: FireInputs = {
        currentBalance: 1000000,
        annualReturn: 5,
        monthlyContribution: 0,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 2,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].isFireAchieved).toBe(true);
    });

    it("should correctly calculate investment income vs expenses", () => {
      const inputs: FireInputs = {
        currentBalance: 900000,
        annualReturn: 7,
        monthlyContribution: 1000,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 3,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      projection.forEach((year) => {
        // Investment income should be annualReturn%, not safe withdrawal rate
        const expectedIncome = Math.round(year.balance * 0.07);
        expect(year.investmentIncome).toBe(expectedIncome);

        // FIRE is achieved when safe withdrawal (4%) >= expenses
        const safeWithdrawal = year.balance * 0.04;
        const isAchieved = safeWithdrawal >= year.annualExpense;
        expect(year.isFireAchieved).toBe(isAchieved);
      });
    });
  });

  describe("FIRE Number Calculation", () => {
    it("should correctly calculate FIRE number", () => {
      const inputs: FireInputs = {
        currentBalance: 100000,
        annualReturn: 7,
        monthlyContribution: 1000,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 3,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].fireNumber).toBe(900000);
      expect(projection[1].fireNumber).toBe(Math.round(36000 * 1.03 / 0.04));
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero contributions", () => {
      const inputs: FireInputs = {
        currentBalance: 100000,
        annualReturn: 7,
        monthlyContribution: 0,
        monthlyExpense: 1000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 2,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[1].balance).toBe(Math.round(100000 * 1.07));
      expect(projection[2].balance).toBe(Math.round(100000 * Math.pow(1.07, 2)));
    });

    it("should handle high inflation", () => {
      const inputs: FireInputs = {
        currentBalance: 100000,
        annualReturn: 7,
        monthlyContribution: 1000,
        monthlyExpense: 1000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 10,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].annualExpense).toBe(12000);
      expect(projection[1].annualExpense).toBe(Math.round(12000 * 1.10));
      expect(projection[10].annualExpense).toBe(Math.round(12000 * Math.pow(1.10, 10)));
    });

    it("should handle already achieved FIRE", () => {
      const inputs: FireInputs = {
        currentBalance: 1000000,
        annualReturn: 5,
        monthlyContribution: 1000,
        monthlyExpense: 2000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 2,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection[0].isFireAchieved).toBe(true);
      // Year 1: 1M + 5% growth - 24k expenses = 1M * 1.05 - 24k
      expect(projection[1].balance).toBeCloseTo(projection[0].balance * 1.05 - 24000, -1);
    });
  });

  describe("Real-world Scenario", () => {
    it("should calculate a realistic FIRE scenario correctly", () => {
      const inputs: FireInputs = {
        currentBalance: 50000,
        annualReturn: 7,
        monthlyContribution: 1000,
        monthlyExpense: 3000,
        currentAge: 30,
        retirementAge: 65,
        inflationRate: 3,
        safeWithdrawalRate: 4,
        retirementStrategy: "safe_fire",
      };

      const projection = calculateFireProjection(inputs);

      expect(projection.length).toBe(51);

      const fireAchieved = projection.some((p) => p.isFireAchieved);
      expect(fireAchieved).toBe(true);

      const fireYear = projection.find((p) => p.isFireAchieved);
      expect(fireYear).toBeDefined();
      expect(fireYear!.balance).toBeGreaterThan(0);

      const fireIndex = projection.findIndex((p) => p.isFireAchieved);
      if (fireIndex < projection.length - 1) {
        const afterFireYear = projection[fireIndex + 1];
        // After FIRE: balance grows by 7% but expenses are withdrawn
        const fireYearExpense = projection[fireIndex].annualExpense;
        const inflatedExpense = fireYearExpense * 1.03; // Next year's expense
        const expectedBalance = fireYear!.balance * 1.07 - inflatedExpense;
        expect(afterFireYear.balance).toBeCloseTo(expectedBalance, -1);
      }
    });
  });
});
