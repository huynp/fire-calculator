import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, fireScenarios, InsertFireScenario, FireScenario } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// FIRE Scenarios queries
export async function createFireScenario(scenario: InsertFireScenario): Promise<FireScenario> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(fireScenarios).values(scenario);
  const insertId = Number(result[0].insertId);
  
  const created = await db.select().from(fireScenarios).where(eq(fireScenarios.id, insertId)).limit(1);
  
  if (created.length === 0) {
    throw new Error("Failed to retrieve created scenario");
  }
  
  return created[0];
}

export async function getUserFireScenarios(userId: number): Promise<FireScenario[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(fireScenarios).where(eq(fireScenarios.userId, userId)).orderBy(desc(fireScenarios.updatedAt));
}

export async function getFireScenarioById(id: number, userId: number): Promise<FireScenario | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(fireScenarios).where(eq(fireScenarios.id, id)).limit(1);
  
  if (result.length === 0 || result[0].userId !== userId) {
    return undefined;
  }
  
  return result[0];
}

export async function updateFireScenario(id: number, userId: number, updates: Partial<InsertFireScenario>): Promise<FireScenario | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify ownership
  const existing = await getFireScenarioById(id, userId);
  if (!existing) {
    return undefined;
  }

  await db.update(fireScenarios).set(updates).where(eq(fireScenarios.id, id));
  
  return getFireScenarioById(id, userId);
}

export async function deleteFireScenario(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verify ownership
  const existing = await getFireScenarioById(id, userId);
  if (!existing) {
    return false;
  }

  await db.delete(fireScenarios).where(eq(fireScenarios.id, id));
  return true;
}
