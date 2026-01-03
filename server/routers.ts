import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  fireScenarios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFireScenarios(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getFireScenarioById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          currentBalance: z.string(),
          annualReturn: z.string(),
          monthlyContribution: z.string(),
          monthlyExpense: z.string(),
          currentAge: z.number().int().min(0).max(120),
          retirementAge: z.number().int().min(0).max(120),
          inflationRate: z.string(),
          safeWithdrawalRate: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createFireScenario({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          currentBalance: z.string().optional(),
          annualReturn: z.string().optional(),
          monthlyContribution: z.string().optional(),
          monthlyExpense: z.string().optional(),
          currentAge: z.number().int().min(0).max(120).optional(),
          retirementAge: z.number().int().min(0).max(120).optional(),
          inflationRate: z.string().optional(),
          safeWithdrawalRate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return db.updateFireScenario(id, ctx.user.id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteFireScenario(input.id, ctx.user.id);
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
