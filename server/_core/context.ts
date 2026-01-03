import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // DEV MODE: Skip auth if OAuth not configured
  const isOAuthConfigured = process.env.OAUTH_SERVER_URL && process.env.VITE_APP_ID;

  if (!isOAuthConfigured) {
    // Mock user for development
    user = {
      id: "dev-user-id",
      openId: "dev-open-id",
      name: "Dev User",
      email: "dev@localhost",
      loginMethod: "dev",
      createdAt: new Date(),
      lastSignedIn: new Date(),
    } as User;
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
