import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("fireScenarios", () => {
  it("creates a new FIRE scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const scenario = await caller.fireScenarios.create({
      name: "Test Scenario",
      currentBalance: "50000",
      annualReturn: "7",
      monthlyContribution: "1000",
      monthlyExpense: "3000",
      currentAge: 30,
      retirementAge: 65,
      inflationRate: "3",
      safeWithdrawalRate: "4",
    });

    expect(scenario).toBeDefined();
    expect(scenario.name).toBe("Test Scenario");
    expect(scenario.userId).toBe(ctx.user!.id);
    expect(scenario.currentBalance).toBe("50000.00");
  });

  it("lists user's FIRE scenarios", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a scenario first
    await caller.fireScenarios.create({
      name: "List Test Scenario",
      currentBalance: "100000",
      annualReturn: "8",
      monthlyContribution: "2000",
      monthlyExpense: "4000",
      currentAge: 35,
      retirementAge: 60,
      inflationRate: "2.5",
      safeWithdrawalRate: "4",
    });

    const scenarios = await caller.fireScenarios.list();

    expect(scenarios).toBeDefined();
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThan(0);
    
    // All scenarios should belong to the current user
    scenarios.forEach(s => {
      expect(s.userId).toBe(ctx.user!.id);
    });
  });

  it("gets a specific FIRE scenario by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.fireScenarios.create({
      name: "Get Test Scenario",
      currentBalance: "75000",
      annualReturn: "6.5",
      monthlyContribution: "1500",
      monthlyExpense: "3500",
      currentAge: 28,
      retirementAge: 55,
      inflationRate: "3",
      safeWithdrawalRate: "4",
    });

    const retrieved = await caller.fireScenarios.get({ id: created.id });

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe("Get Test Scenario");
  });

  it("updates an existing FIRE scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.fireScenarios.create({
      name: "Update Test Scenario",
      currentBalance: "60000",
      annualReturn: "7",
      monthlyContribution: "1200",
      monthlyExpense: "3200",
      currentAge: 32,
      retirementAge: 62,
      inflationRate: "3",
      safeWithdrawalRate: "4",
    });

    const updated = await caller.fireScenarios.update({
      id: created.id,
      name: "Updated Scenario Name",
      monthlyContribution: "1500",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Updated Scenario Name");
    expect(updated?.monthlyContribution).toBe("1500.00");
    // Other fields should remain unchanged
    expect(updated?.currentBalance).toBe(created.currentBalance);
  });

  it("deletes a FIRE scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.fireScenarios.create({
      name: "Delete Test Scenario",
      currentBalance: "80000",
      annualReturn: "7.5",
      monthlyContribution: "1800",
      monthlyExpense: "3800",
      currentAge: 33,
      retirementAge: 63,
      inflationRate: "3",
      safeWithdrawalRate: "4",
    });

    const deleteResult = await caller.fireScenarios.delete({ id: created.id });

    expect(deleteResult.success).toBe(true);

    // Verify it's actually deleted
    const retrieved = await caller.fireScenarios.get({ id: created.id });
    expect(retrieved).toBeUndefined();
  });

  it("prevents access to other users' scenarios", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const { ctx: ctx2 } = createAuthContext(2);
    
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    // User 1 creates a scenario
    const scenario = await caller1.fireScenarios.create({
      name: "User 1 Scenario",
      currentBalance: "50000",
      annualReturn: "7",
      monthlyContribution: "1000",
      monthlyExpense: "3000",
      currentAge: 30,
      retirementAge: 65,
      inflationRate: "3",
      safeWithdrawalRate: "4",
    });

    // User 2 tries to access User 1's scenario
    const retrieved = await caller2.fireScenarios.get({ id: scenario.id });
    expect(retrieved).toBeUndefined();

    // User 2 tries to delete User 1's scenario
    const deleteResult = await caller2.fireScenarios.delete({ id: scenario.id });
    expect(deleteResult.success).toBe(false);
  });
});
