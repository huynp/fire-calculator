import { describe, it, expect } from "vitest";

import { calculateFireProjection, type FireInputs } from "./fire-calc";

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
        currentBalance: 1000000, // not exactly 25x expenses: at 900k, 7% return - 3% inflation keeps the 4% withdrawal exactly equal to expenses and rounding decides the result
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
        // year.balance is rounded, so allow rounding slack
        expect(year.investmentIncome).toBeCloseTo(year.balance * 0.07, -1);

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
        // The FIRE year's own expense is withdrawn at the end of that year
        const expectedBalance = fireYear!.balance * 1.07 - fireYearExpense;
        expect(afterFireYear.balance).toBeCloseTo(expectedBalance, -1);
      }
    });
  });
});

describe("Retirement is permanent", () => {
  it("never resumes contributions once retired, even if the balance dips below the FIRE number", () => {
    // 5% return - 3% inflation: after retiring at exactly-enough, the 4% withdrawal
    // falls behind expenses and the balance drops under the FIRE number.
    const projection = calculateFireProjection({
      currentBalance: 1000000,
      annualReturn: 5,
      monthlyContribution: 1000,
      monthlyExpense: 3000,
      currentAge: 30,
      retirementAge: 65,
      inflationRate: 3,
      safeWithdrawalRate: 4,
      retirementStrategy: "safe_fire",
    });

    expect(projection[0].isFireAchieved).toBe(true);
    expect(projection.some((y) => !y.isFireAchieved)).toBe(true); // it does dip below later
    projection.forEach((y) => expect(y.annualContribution).toBe(0));
  });
});

describe("Assets and other income", () => {
  const base: FireInputs = {
    currentBalance: 500000,
    annualReturn: 7,
    monthlyContribution: 1000,
    monthlyExpense: 3000,
    currentAge: 36,
    retirementAge: 65,
    inflationRate: 3,
    safeWithdrawalRate: 4,
    retirementStrategy: "safe_fire",
  };
  const fiYear = (p: ReturnType<typeof calculateFireProjection>) => p.findIndex((y) => y.isFireAchieved);

  it("gives the same projection with empty lists as without them", () => {
    expect(calculateFireProjection({ ...base, assets: [], otherIncome: [] })).toEqual(calculateFireProjection(base));
  });

  it("extra investment rows join the main pool", () => {
    expect(calculateFireProjection({ ...base, currentBalance: 300000, assets: [{ kind: "investments", amount: 200000 }] }))
      .toEqual(calculateFireProjection(base));
  });

  it("rent lowers the FIRE number and brings FI forward", () => {
    const withRent = calculateFireProjection({ ...base, otherIncome: [{ kind: "rent", monthly: 1200, fromAge: 36 }] });
    expect(withRent[0].fireNumber).toBe(540000); // (36,000 - 14,400) / 4%
    expect(fiYear(withRent)).toBeLessThan(fiYear(calculateFireProjection(base)));
  });

  it("income from a later age counts only from that age", () => {
    const p = calculateFireProjection({ ...base, otherIncome: [{ kind: "pension", monthly: 1500, fromAge: 67 }] });
    expect(p.find((y) => y.age === 66)!.otherIncome).toBe(0);
    expect(p.find((y) => y.age === 67)!.otherIncome).toBeGreaterThan(18000);
  });

  it("income that already started (from age below today) counts from year 0", () => {
    const p = calculateFireProjection({ ...base, otherIncome: [{ kind: "rent", monthly: 1000, fromAge: 20 }] });
    expect(p[0].otherIncome).toBe(12000);
  });

  it("other income above expenses means FI now with a zero FIRE number", () => {
    const p = calculateFireProjection({ ...base, currentBalance: 0, otherIncome: [{ kind: "pension", monthly: 5000, fromAge: 36 }] });
    expect(p[0].fireNumber).toBe(0);
    expect(p[0].isFireAchieved).toBe(true);
    p.forEach((y) => expect(Number.isNaN(y.balance)).toBe(false));
  });

  it("property counts in net worth but not toward FI", () => {
    const p = calculateFireProjection({ ...base, assets: [{ kind: "property", amount: 800000 }] });
    const plain = calculateFireProjection(base);
    expect(fiYear(p)).toBe(fiYear(plain));
    expect(p[0].netWorth).toBe(plain[0].balance + 800000);
  });

  it("a deposit grows at its own rate", () => {
    const p = calculateFireProjection({
      ...base,
      currentBalance: 0,
      monthlyContribution: 0,
      monthlyExpense: 100000, // never retires
      assets: [{ kind: "savings", amount: 10000, rate: 4 }],
    });
    expect(p[1].balance).toBe(10400);
  });

  it("never produces NaN when nothing is investable after retiring", () => {
    const p = calculateFireProjection({ ...base, currentBalance: 0, monthlyContribution: 0, monthlyExpense: 0 });
    p.forEach((y) => expect(Number.isNaN(y.balance)).toBe(false));
  });
});
