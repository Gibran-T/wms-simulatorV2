import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assignments,
  binCapacity,
  cohorts,
  cycleCounts,
  masterBins,
  masterSkus,
  moduleProgress,
  modules,
  profiles,
  progress,
  putawayRecords,
  scenarioRuns,
  scenarios,
  scoringEvents,
  transactions,
  users,
  preAuthorizedEmails,
  type InsertUser,
  type InsertPreAuthorizedEmail,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "teacher" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const openId = `local:${data.email}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "local",
    role: data.role,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "student" | "teacher" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Pre-authorized Emails ────────────────────────────────────────────────────
export async function getPreAuthorizedEmails() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(preAuthorizedEmails);
}

export async function addPreAuthorizedEmail(
  email: string,
  role: "student" | "teacher" | "admin",
  note: string | null,
  addedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const normalized = email.trim().toLowerCase();
  await db
    .insert(preAuthorizedEmails)
    .values({ email: normalized, role, note, addedBy })
    .onDuplicateKeyUpdate({ set: { role, note, addedBy } });
}

export async function removePreAuthorizedEmail(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(preAuthorizedEmails).where(eq(preAuthorizedEmails.id, id));
}

export async function checkAndApplyPreAuthorization(
  email: string | null | undefined,
  userId: number
): Promise<void> {
  if (!email) return;
  const db = await getDb();
  if (!db) return;
  const normalized = email.trim().toLowerCase();
  const match = await db
    .select()
    .from(preAuthorizedEmails)
    .where(eq(preAuthorizedEmails.email, normalized))
    .limit(1);
  if (match.length === 0) return;
  const preAuth = match[0];
  // Apply the pre-authorized role
  await db.update(users).set({ role: preAuth.role }).where(eq(users.id, userId));
  // Mark as used
  await db
    .update(preAuthorizedEmails)
    .set({ usedAt: new Date() })
    .where(eq(preAuthorizedEmails.id, preAuth.id));
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────
export async function getCohortsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cohorts).where(eq(cohorts.createdBy, teacherId));
}

export async function createCohort(name: string, description: string | null, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cohorts).values({ name, description, createdBy });
  return result;
}

export async function getCohortById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
  return result[0];
}

export async function getStudentsByCohort(cohortId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ user: users, profile: profiles })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.cohortId, cohortId));
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertProfile(userId: number, cohortId: number | null, studentNumber?: string | null) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { cohortId };
  if (studentNumber !== undefined) updateSet.studentNumber = studentNumber;
  await db
    .insert(profiles)
    .values({ userId, cohortId, studentNumber: studentNumber ?? null })
    .onDuplicateKeyUpdate({ set: updateSet as any });
}

// ─── Master Data ──────────────────────────────────────────────────────────────
export async function getAllSkus() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterSkus);
}

export async function getAllBins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterBins);
}

// ─── Modules ──────────────────────────────────────────────────────────────────
export async function getActiveModules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modules).where(eq(modules.isActive, true));
}

// ─── Scenarios ────────────────────────────────────────────────────────────────
export async function getScenariosByModule(moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenarios).where(and(eq(scenarios.moduleId, moduleId), eq(scenarios.isActive, true)));
}

export async function getAllScenarios() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenarios).where(eq(scenarios.isActive, true));
}

export async function getScenarioById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
  return result[0];
}

export async function createScenario(data: {
  moduleId: number;
  name: string;
  descriptionFr: string;
  difficulty: "facile" | "moyen" | "difficile";
  initialStateJson: unknown;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(scenarios).values(data);
}

// ─── Assignments ──────────────────────────────────────────────────────────────
export async function getAssignmentsForStudent(userId: number, cohortId: number | null) {
  const db = await getDb();
  if (!db) return [];
  if (cohortId) {
    return db
      .select({ assignment: assignments, scenario: scenarios })
      .from(assignments)
      .innerJoin(scenarios, eq(assignments.scenarioId, scenarios.id))
      .where(
        and(
          eq(assignments.isActive, true),
          sql`(${assignments.userId} = ${userId} OR ${assignments.cohortId} = ${cohortId})`
        )
      );
  }
  return db
    .select({ assignment: assignments, scenario: scenarios })
    .from(assignments)
    .innerJoin(scenarios, eq(assignments.scenarioId, scenarios.id))
    .where(and(eq(assignments.isActive, true), eq(assignments.userId, userId)));
}

export async function createAssignment(data: {
  scenarioId: number;
  cohortId: number | null;
  userId: number | null;
  dueDate: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(assignments).values({ ...data, isActive: true });
}

export async function getAllAssignments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ assignment: assignments, scenario: scenarios })
    .from(assignments)
    .innerJoin(scenarios, eq(assignments.scenarioId, scenarios.id));
}

// ─── Scenario Runs ────────────────────────────────────────────────────────────
export async function startRun(userId: number, scenarioId: number, isDemo = false) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scenarioRuns).values({ userId, scenarioId, status: "in_progress", isDemo });
  return result;
}

export async function getRunById(runId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scenarioRuns).where(eq(scenarioRuns.id, runId)).limit(1);
  return result[0];
}

export async function getRunsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ run: scenarioRuns, scenario: scenarios })
    .from(scenarioRuns)
    .innerJoin(scenarios, eq(scenarioRuns.scenarioId, scenarios.id))
    .where(eq(scenarioRuns.userId, userId));
}

export async function completeRun(runId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(scenarioRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(scenarioRuns.id, runId));
}

export async function getAllRunsForMonitor() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ run: scenarioRuns, user: users, scenario: scenarios })
    .from(scenarioRuns)
    .innerJoin(users, eq(scenarioRuns.userId, users.id))
    .innerJoin(scenarios, eq(scenarioRuns.scenarioId, scenarios.id));
  // Enrich user with studentNumber from profiles
  return Promise.all(rows.map(async (row) => {
    const profile = await getProfileByUserId(row.user.id);
    return { ...row, user: { ...row.user, studentNumber: profile?.studentNumber ?? null } };
  }));
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactionsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.runId, runId));
}

export async function addTransaction(data: {
  runId: number;
  docType: "PO" | "GR" | "SO" | "GI" | "ADJ" | "PUTAWAY" | "PUTAWAY_M1" | "PICKING" | "PICKING_M1";
  moveType: string | null;
  sku: string;
  bin: string;
  qty: string;
  posted: boolean;
  docRef: string | null;
  comment: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(transactions).values(data);
}

export async function postTransaction(txId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set({ posted: true }).where(eq(transactions.id, txId));
}

// ─── Cycle Counts ─────────────────────────────────────────────────────────────
export async function getCycleCountsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cycleCounts).where(eq(cycleCounts.runId, runId));
}

export async function addCycleCount(data: {
  runId: number;
  sku: string;
  bin: string;
  systemQty: string;
  physicalQty: string;
  variance: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(cycleCounts).values({ ...data, resolved: false });
}

export async function resolveCycleCount(ccId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cycleCounts).set({ resolved: true }).where(eq(cycleCounts.id, ccId));
}

// Fix 4: Resolve all unresolved cycle counts for a run (called after ADJ is posted)
export async function resolveAllCycleCountsByRun(runId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(cycleCounts).set({ resolved: true }).where(and(eq(cycleCounts.runId, runId), eq(cycleCounts.resolved, false)));
}

// ─── Progress ─────────────────────────────────────────────────────────────────
export async function getProgressByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(progress).where(eq(progress.runId, runId));
}

export async function markStepComplete(runId: number, stepCode: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(progress)
    .where(and(eq(progress.runId, runId), eq(progress.stepCode, stepCode)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(progress)
      .set({ completed: true, completedAt: new Date() })
      .where(and(eq(progress.runId, runId), eq(progress.stepCode, stepCode)));
  } else {
    await db.insert(progress).values({ runId, stepCode, completed: true, completedAt: new Date() });
  }
}

// ─── Scoring Events ───────────────────────────────────────────────────────────
export async function getScoringEventsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scoringEvents).where(eq(scoringEvents.runId, runId));
}

export async function addScoringEvent(data: {
  runId: number;
  eventType: string;
  pointsDelta: number;
  message: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(scoringEvents).values(data);
}

// ─── Bin Capacity (Module 2) ──────────────────────────────────────────────────
export async function getAllBinCapacities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(binCapacity);
}

export async function getBinCapacity(binCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(binCapacity).where(eq(binCapacity.binCode, binCode)).limit(1);
  return result[0];
}

export async function upsertBinCapacity(binCode: string, maxCap: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(binCapacity)
    .values({ binCode, maxCapacity: maxCap })
    .onDuplicateKeyUpdate({ set: { maxCapacity: maxCap } });
}

// ─── Putaway Records (Module 2) ──────────────────────────────────────────────
export async function getPutawayByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(putawayRecords).where(eq(putawayRecords.runId, runId));
}

export async function addPutawayRecord(data: {
  runId: number;
  sku: string;
  fromBin: string;
  toBin: string;
  qty: number;
  lotNumber: string;
  receivedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(putawayRecords).values(data);
}

// ─── Module Progress ──────────────────────────────────────────────────────────
export async function getModuleProgressByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(moduleProgress).where(eq(moduleProgress.userId, userId));
}

export async function getPassedModuleIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ moduleId: moduleProgress.moduleId })
    .from(moduleProgress)
    .where(and(eq(moduleProgress.userId, userId), eq(moduleProgress.passed, true)));
  return rows.map((r) => r.moduleId);
}

export async function upsertModuleProgress(data: {
  userId: number;
  moduleId: number;
  passed: boolean;
  bestScore: number;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(moduleProgress)
    .values({ ...data, completedAt: data.completedAt ?? null })
    .onDuplicateKeyUpdate({
      set: {
        passed: data.passed,
        bestScore: data.bestScore,
        completedAt: data.completedAt ?? null,
      },
    });
}

export async function getAllModuleProgressForMonitor() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ progress: moduleProgress, user: users, module: modules })
    .from(moduleProgress)
    .innerJoin(users, eq(moduleProgress.userId, users.id))
    .innerJoin(modules, eq(moduleProgress.moduleId, modules.id));
}

// ─── Admin: Reset Run ─────────────────────────────────────────────────────────
/** Delete all data associated with a run (transactions, cycle counts, scoring events, progress steps)
 *  and mark the run itself as cancelled so the student can start fresh. */
export async function resetRun(runId: number) {
  const db = await getDb();
  if (!db) return;
  // Delete child records first (FK order)
  await db.delete(scoringEvents).where(eq(scoringEvents.runId, runId));
  await db.delete(cycleCounts).where(eq(cycleCounts.runId, runId));
  await db.delete(transactions).where(eq(transactions.runId, runId));
  await db.delete(progress).where(eq(progress.runId, runId));
  // Delete the run itself so the student can start a new one
  await db.delete(scenarioRuns).where(eq(scenarioRuns.id, runId));
}

// ─── Teacher: Student Management ──────────────────────────────────────────────

/** List all students with their profile (cohort) and last activity */
export async function listStudents(opts?: { cohortId?: number; includeAll?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  // Base query: all users with role=student (or all roles if includeAll)
  const conditions: any[] = [];
  if (!opts?.includeAll) {
    conditions.push(eq(users.role, "student"));
  }
  if (opts?.cohortId) {
    conditions.push(eq(profiles.cohortId, opts.cohortId));
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      notes: users.notes,
      loginMethod: users.loginMethod,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
      cohortId: profiles.cohortId,
      studentNumber: profiles.studentNumber,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(users.createdAt);

  return rows;
}

/** Set a student's isActive status (include/exclude from the course) */
export async function setStudentActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

/** Update teacher notes for a student */
export async function updateStudentNotes(userId: number, notes: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ notes }).where(eq(users.id, userId));
}

/** Assign a student to a cohort (upsert profile) */
export async function assignStudentToCohort(userId: number, cohortId: number | null) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(profiles).set({ cohortId }).where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values({ userId, cohortId });
  }
}

/** Get aggregated stats for a student (total runs, best score, avg score) */
export async function getStudentStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalRuns: 0, completedRuns: 0, bestScore: null, avgScore: null };

  const runs = await db
    .select()
    .from(scenarioRuns)
    .where(eq(scenarioRuns.userId, userId));

  const completed = runs.filter((r) => r.completedAt !== null);
  const scores = completed
    .map((r) => (r as any).totalScore)
    .filter((s) => s !== null && s !== undefined) as number[];

  return {
    totalRuns: runs.length,
    completedRuns: completed.length,
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

// ─── M3: Inventory Counts ─────────────────────────────────────────────────────
export async function addInventoryCount(data: {
  runId: number; sku: string; systemQty: number; countedQty: number; varianceQty: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { inventoryCounts } = await import("../drizzle/schema");
  await db.insert(inventoryCounts).values({
    runId: data.runId, sku: data.sku,
    systemQty: String(data.systemQty), countedQty: String(data.countedQty), varianceQty: String(data.varianceQty),
  });
}
export async function getInventoryCountsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  const { inventoryCounts } = await import("../drizzle/schema");
  return db.select().from(inventoryCounts).where(eq(inventoryCounts.runId, runId));
}

// ─── M3: Inventory Adjustments ───────────────────────────────────────────────
export async function addInventoryAdjustment(data: {
  runId: number; sku: string; varianceQty: number; adjustmentQty: number; reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { inventoryAdjustments } = await import("../drizzle/schema");
  await db.insert(inventoryAdjustments).values({
    runId: data.runId, sku: data.sku,
    varianceQty: String(data.varianceQty), adjustmentQty: String(data.adjustmentQty),
    reason: data.reason ?? null, approved: false,
  });
}
export async function getInventoryAdjustmentsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  const { inventoryAdjustments } = await import("../drizzle/schema");
  return db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.runId, runId));
}

// ─── M3: Replenishment ────────────────────────────────────────────────────────
export async function getReplenishmentParams() {
  const db = await getDb();
  if (!db) return [];
  const { replenishmentParams } = await import("../drizzle/schema");
  return db.select().from(replenishmentParams);
}
export async function addReplenishmentSuggestion(data: {
  runId: number; sku: string; systemQty: number; suggestedQty: number; reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { replenishmentSuggestions } = await import("../drizzle/schema");
  await db.insert(replenishmentSuggestions).values({
    runId: data.runId, sku: data.sku,
    systemQty: String(data.systemQty), suggestedQty: String(data.suggestedQty), reason: data.reason,
  });
}
export async function getReplenishmentSuggestionsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  const { replenishmentSuggestions } = await import("../drizzle/schema");
  return db.select().from(replenishmentSuggestions).where(eq(replenishmentSuggestions.runId, runId));
}

// ─── M4: KPI Snapshots ────────────────────────────────────────────────────────
export async function addKpiSnapshot(data: {
  runId: number; rotationRate: number; serviceLevel: number; errorRate: number;
  averageLeadTime: number; stockImmobilizedValue: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { kpiSnapshots } = await import("../drizzle/schema");
  await db.insert(kpiSnapshots).values({
    runId: data.runId,
    rotationRate: String(data.rotationRate), serviceLevel: String(data.serviceLevel),
    errorRate: String(data.errorRate), averageLeadTime: String(data.averageLeadTime),
    stockImmobilizedValue: String(data.stockImmobilizedValue),
  });
}
export async function getKpiSnapshotByRun(runId: number) {
  const db = await getDb();
  if (!db) return null;
  const { kpiSnapshots } = await import("../drizzle/schema");
  const rows = await db.select().from(kpiSnapshots).where(eq(kpiSnapshots.runId, runId));
  return rows[0] ?? null;
}

// ─── M4: KPI Interpretations ─────────────────────────────────────────────────
export async function addKpiInterpretation(data: {
  runId: number; kpiKey: string; studentAnswer: string; isCorrect: boolean; pointsDelta: number; feedback: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { kpiInterpretations } = await import("../drizzle/schema");
  await db.insert(kpiInterpretations).values({
    runId: data.runId, kpiKey: data.kpiKey, studentAnswer: data.studentAnswer,
    isCorrect: data.isCorrect, pointsDelta: data.pointsDelta, feedback: data.feedback,
  });
}
export async function getKpiInterpretationsByRun(runId: number) {
  const db = await getDb();
  if (!db) return [];
  const { kpiInterpretations } = await import("../drizzle/schema");
  return db.select().from(kpiInterpretations).where(eq(kpiInterpretations.runId, runId));
}

// ─── QUIZ SYSTEM ─────────────────────────────────────────────────────────────
export async function getQuizByModule(moduleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { quizzes } = await import("../drizzle/schema");
  const result = await db.select().from(quizzes).where(eq(quizzes.moduleId, moduleId)).limit(1);
  return result[0];
}

export async function getQuizWithQuestions(quizId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { quizzes, quizQuestions } = await import("../drizzle/schema");
  const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz[0]) return undefined;
  const questions = await db.select().from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.orderIndex);
  return { ...quiz[0], questions };
}

export async function getQuizAttemptsByUser(userId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  const { quizAttempts } = await import("../drizzle/schema");
  return db.select().from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.moduleId, moduleId)))
    .orderBy(quizAttempts.completedAt);
}

export async function getBestQuizAttempt(userId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { quizAttempts } = await import("../drizzle/schema");
  const attempts = await db.select().from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.moduleId, moduleId)))
    .orderBy(quizAttempts.score);
  return attempts[attempts.length - 1];
}

export async function saveQuizAttempt(data: {
  userId: number; quizId: number; moduleId: number;
  answers: number[]; score: number; passed: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { quizAttempts } = await import("../drizzle/schema");
  await db.insert(quizAttempts).values({
    userId: data.userId, quizId: data.quizId, moduleId: data.moduleId,
    answers: data.answers, score: data.score, passed: data.passed,
  });
}

export async function seedQuizData() {
  const db = await getDb();
  if (!db) return;
  const { quizzes, quizQuestions } = await import("../drizzle/schema");

  const existing = await db.select().from(quizzes).limit(1);
  if (existing.length > 0) return;

  // ── M1 ─────────────────────────────────────────────────────────────────────
  const [m1] = await db.insert(quizzes).values({ moduleId: 1, titleFr: "Quiz M1 — Fondements de la chaîne logistique et ERP/WMS", titleEn: "Quiz M1 — Logistics Chain Fundamentals and ERP/WMS", passingScore: 60 }).$returningId();
  await db.insert(quizQuestions).values([
    { quizId: m1.id, orderIndex: 1, difficulty: "easy", questionFr: "Qu'est-ce qu'un WMS (Warehouse Management System) ?", questionEn: "What is a WMS (Warehouse Management System)?", optionsFr: JSON.stringify(["Un logiciel de gestion des transports", "Un système de gestion des opérations d'entrepôt (réception, stockage, expédition)", "Un outil de planification de la production", "Un système de gestion des ressources humaines"]), optionsEn: JSON.stringify(["A transportation management software", "A system for managing warehouse operations (receiving, storage, shipping)", "A production planning tool", "A human resources management system"]), correctIndex: 1, explanationFr: "Le WMS gère toutes les opérations d'entrepôt : réception (GR), mise en stock (Putaway), préparation (Picking), expédition (GI) et inventaire (CC). Il s'intègre avec l'ERP pour synchroniser les données.", explanationEn: "The WMS manages all warehouse operations: goods receipt (GR), putaway, picking, goods issue (GI) and cycle counting (CC). It integrates with the ERP to synchronize data." },
    { quizId: m1.id, orderIndex: 2, difficulty: "medium", questionFr: "Dans le flux logistique standard, quelle est la séquence correcte des opérations ?", questionEn: "In the standard logistics flow, what is the correct sequence of operations?", optionsFr: JSON.stringify(["PO → GR → Putaway → SO → Picking → GI", "GR → PO → SO → Picking → GI → Putaway", "SO → PO → GR → GI → Picking → Putaway", "Picking → PO → GR → SO → Putaway → GI"]), optionsEn: JSON.stringify(["PO → GR → Putaway → SO → Picking → GI", "GR → PO → SO → Picking → GI → Putaway", "SO → PO → GR → GI → Picking → Putaway", "Picking → PO → GR → SO → Putaway → GI"]), correctIndex: 0, explanationFr: "Le flux standard : PO (commande d'achat) → GR (réception physique) → Putaway (mise en stock) → SO (commande client) → Picking (préparation) → GI (expédition). Chaque étape dépend de la précédente.", explanationEn: "Standard flow: PO (purchase order) → GR (physical receipt) → Putaway → SO (customer order) → Picking → GI (goods issue). Each step depends on the previous one." },
    { quizId: m1.id, orderIndex: 3, difficulty: "medium", questionFr: "Qu'est-ce qu'un Goods Receipt (GR) dans un WMS ?", questionEn: "What is a Goods Receipt (GR) in a WMS?", optionsFr: JSON.stringify(["L'expédition d'une commande client", "La confirmation de réception physique des marchandises et mise à jour du stock", "La création d'une commande d'achat", "L'inventaire cyclique des stocks"]), optionsEn: JSON.stringify(["Shipping a customer order", "Physical confirmation of goods receipt and stock update", "Creating a purchase order", "Cyclical stock counting"]), correctIndex: 1, explanationFr: "Le GR confirme que les marchandises commandées ont été physiquement reçues. Il met à jour le stock dans le WMS/ERP et déclenche le processus de Putaway. Sans GR, le stock ne peut pas être utilisé.", explanationEn: "The GR confirms that ordered goods have been physically received. It updates stock in the WMS/ERP and triggers the putaway process. Without GR, stock cannot be used." },
    { quizId: m1.id, orderIndex: 4, difficulty: "hard", questionFr: "Quelle est la conséquence d'un Goods Issue (GI) sans Goods Receipt préalable ?", questionEn: "What is the consequence of a Goods Issue (GI) without a prior Goods Receipt?", optionsFr: JSON.stringify(["Le stock devient négatif, créant une anomalie comptable et logistique", "Le GI est automatiquement annulé par le WMS", "Le stock reste inchangé", "Une commande d'achat est automatiquement créée"]), optionsEn: JSON.stringify(["Stock becomes negative, creating an accounting and logistics anomaly", "The GI is automatically cancelled by the WMS", "Stock remains unchanged", "A purchase order is automatically created"]), correctIndex: 0, explanationFr: "Un GI sans GR crée un stock négatif — impossible physiquement mais possible dans le système. Cela génère des anomalies comptables, des problèmes de traçabilité et des pénalités de conformité. Le WMS doit bloquer cette opération.", explanationEn: "A GI without GR creates negative stock — physically impossible but possible in the system. This generates accounting anomalies, traceability issues and compliance penalties. The WMS should block this operation." },
    { quizId: m1.id, orderIndex: 5, difficulty: "hard", questionFr: "Qu'est-ce qu'un inventaire cyclique (Cycle Count) et pourquoi est-il préféré à l'inventaire annuel ?", questionEn: "What is a Cycle Count and why is it preferred over annual inventory?", optionsFr: JSON.stringify(["Un comptage mensuel de tous les articles", "Un comptage rotatif d'un sous-ensemble d'articles, permettant une correction continue sans arrêt d'activité", "Un inventaire automatique par le WMS", "Un comptage trimestriel obligatoire"]), optionsEn: JSON.stringify(["A monthly count of all items", "A rotating count of a subset of items, enabling continuous correction without stopping operations", "An automatic inventory by the WMS", "A mandatory quarterly count"]), correctIndex: 1, explanationFr: "L'inventaire cyclique compte un sous-ensemble d'articles en rotation continue, sans arrêter les opérations. Il détecte les écarts plus rapidement et maintient une haute précision (objectif ≥98%). L'inventaire annuel nécessite un arrêt complet.", explanationEn: "Cycle counting counts a rotating subset of items continuously, without stopping operations. It detects discrepancies faster and maintains high accuracy (target ≥98%). Annual inventory requires a complete shutdown." },
  ]);

  // ── M2 ─────────────────────────────────────────────────────────────────────
  const [m2] = await db.insert(quizzes).values({ moduleId: 2, titleFr: "Quiz M2 — Exécution d'entrepôt avancée", titleEn: "Quiz M2 — Advanced Warehouse Execution", passingScore: 60 }).$returningId();
  await db.insert(quizQuestions).values([
    { quizId: m2.id, orderIndex: 1, difficulty: "medium", questionFr: "Qu'est-ce que la méthode FIFO en gestion d'entrepôt ?", questionEn: "What is the FIFO method in warehouse management?", optionsFr: JSON.stringify(["Les articles les plus récents sont expédiés en premier", "Les articles les plus anciens (reçus en premier) sont expédiés en premier", "Les articles les plus chers sont expédiés en premier", "Les articles les plus légers sont expédiés en premier"]), optionsEn: JSON.stringify(["The most recent items are shipped first", "The oldest items (received first) are shipped first", "The most expensive items are shipped first", "The lightest items are shipped first"]), correctIndex: 1, explanationFr: "FIFO (Premier Entré, Premier Sorti) garantit que les articles les plus anciens sont utilisés en premier. Crucial pour les produits périssables et les articles avec date d'expiration. Le WMS guide le préparateur vers le bon emplacement FIFO.", explanationEn: "FIFO (First In, First Out) ensures the oldest items are used first. Crucial for perishables and items with expiry dates. The WMS guides the picker to the correct FIFO location." },
    { quizId: m2.id, orderIndex: 2, difficulty: "medium", questionFr: "Qu'est-ce qu'un ASN (Advanced Shipping Notice) ?", questionEn: "What is an ASN (Advanced Shipping Notice)?", optionsFr: JSON.stringify(["Une notification d'expédition envoyée au client après livraison", "Un avis d'expédition préalable envoyé par le fournisseur avant la livraison", "Un bon de commande électronique", "Un rapport d'inventaire automatique"]), optionsEn: JSON.stringify(["A shipping notification sent to the customer after delivery", "An advance shipping notice sent by the supplier before delivery", "An electronic purchase order", "An automatic inventory report"]), correctIndex: 1, explanationFr: "L'ASN est envoyé par le fournisseur avant la livraison. Il contient les détails de l'expédition (articles, quantités, numéros de lot) et permet à l'entrepôt de préparer la réception et d'accélérer le GR.", explanationEn: "The ASN is sent by the supplier before delivery. It contains shipment details (items, quantities, lot numbers) and allows the warehouse to prepare receipt and speed up the GR process." },
    { quizId: m2.id, orderIndex: 3, difficulty: "hard", questionFr: "Qu'est-ce que la traçabilité par lot et pourquoi est-elle obligatoire dans certains secteurs ?", questionEn: "What is lot traceability and why is it mandatory in certain sectors?", optionsFr: JSON.stringify(["Un système de suivi GPS des camions", "La capacité de suivre un produit de sa fabrication à sa livraison finale via chaque étape logistique", "Un système de gestion des retours clients", "Un outil de planification des tournées"]), optionsEn: JSON.stringify(["A GPS tracking system for trucks", "The ability to track a product from manufacturing to final delivery through each logistics step", "A customer returns management system", "A route planning tool"]), correctIndex: 1, explanationFr: "La traçabilité par lot suit chaque article de sa fabrication à sa livraison. Obligatoire dans l'alimentaire (rappels), la pharmacie (sécurité patients) et l'aéronautique (certification). En cas de rappel, elle identifie précisément les produits affectés.", explanationEn: "Lot traceability tracks each item from manufacturing to delivery. Mandatory in food (recalls), pharmaceuticals (patient safety) and aerospace (certification). In case of recall, it precisely identifies affected products." },
    { quizId: m2.id, orderIndex: 4, difficulty: "hard", questionFr: "Quelle est la différence entre la précision des stocks et le taux de service ?", questionEn: "What is the difference between stock accuracy and service rate?", optionsFr: JSON.stringify(["Ce sont deux termes pour le même indicateur", "La précision mesure l'écart entre stock physique et système; le taux de service mesure la capacité à satisfaire les commandes à temps", "La précision mesure le taux de service; le taux de service mesure la précision", "La précision concerne les fournisseurs; le taux de service concerne les clients"]), optionsEn: JSON.stringify(["They are two terms for the same indicator", "Accuracy measures the gap between physical and system stock; service rate measures the ability to fulfill orders on time", "Accuracy measures service rate; service rate measures accuracy", "Accuracy concerns suppliers; service rate concerns customers"]), correctIndex: 1, explanationFr: "La précision des stocks compare le stock physique au stock système (objectif ≥98%). Le taux de service mesure le % de commandes livrées complètes et à temps (OTIF). Un stock précis est un prérequis pour un bon taux de service.", explanationEn: "Stock accuracy compares physical to system stock (target ≥98%). Service rate measures % of orders delivered complete and on time (OTIF). Accurate stock is a prerequisite for good service rate." },
  ]);

  // ── M3 ─────────────────────────────────────────────────────────────────────
  const [m3] = await db.insert(quizzes).values({ moduleId: 3, titleFr: "Quiz M3 — Contrôle des stocks et réapprovisionnement", titleEn: "Quiz M3 — Inventory Control and Replenishment", passingScore: 60 }).$returningId();
  await db.insert(quizQuestions).values([
    { quizId: m3.id, orderIndex: 1, difficulty: "medium", questionFr: "Qu'est-ce que le Point de Réapprovisionnement (ROP) ?", questionEn: "What is the Reorder Point (ROP)?", optionsFr: JSON.stringify(["Le stock maximum autorisé", "Le niveau de stock qui déclenche automatiquement une commande de réapprovisionnement", "La quantité commandée lors de chaque réapprovisionnement", "Le délai entre deux commandes fournisseur"]), optionsEn: JSON.stringify(["The maximum stock level allowed", "The stock level that automatically triggers a replenishment order", "The quantity ordered at each replenishment", "The time between two supplier orders"]), correctIndex: 1, explanationFr: "Le ROP est calculé comme : ROP = (Demande quotidienne × Délai fournisseur) + Stock de sécurité. Quand le stock descend sous le ROP, une commande est passée pour éviter la rupture.", explanationEn: "ROP is calculated as: ROP = (Daily demand × Lead time) + Safety stock. When stock falls below ROP, an order is placed to avoid stockout." },
    { quizId: m3.id, orderIndex: 2, difficulty: "hard", questionFr: "La formule EOQ est : EOQ = √(2DS/H). Que représentent D, S et H ?", questionEn: "The EOQ formula is: EOQ = √(2DS/H). What do D, S and H represent?", optionsFr: JSON.stringify(["D=Délai, S=Stock de sécurité, H=Hauteur", "D=Demande annuelle, S=Coût de passation de commande, H=Coût de possession unitaire annuel", "D=Demande quotidienne, S=Surface d'entrepôt, H=Hauteur des rayonnages", "D=Durée de vie, S=Stock minimum, H=Hauteur maximale"]), optionsEn: JSON.stringify(["D=Lead time, S=Safety stock, H=Height", "D=Annual demand, S=Order placement cost, H=Annual unit holding cost", "D=Daily demand, S=Warehouse area, H=Shelf height", "D=Shelf life, S=Minimum stock, H=Maximum height"]), correctIndex: 1, explanationFr: "EOQ : D = Demande annuelle (unités/an), S = Coût de passation ($/commande), H = Coût de possession unitaire annuel ($/unité/an). L'EOQ minimise le coût total en équilibrant coût de passation et coût de possession.", explanationEn: "EOQ: D = Annual demand (units/year), S = Order placement cost ($/order), H = Annual unit holding cost ($/unit/year). EOQ minimizes total cost by balancing ordering and holding costs." },
    { quizId: m3.id, orderIndex: 3, difficulty: "medium", questionFr: "Qu'est-ce que le stock de sécurité (Safety Stock) ?", questionEn: "What is Safety Stock?", optionsFr: JSON.stringify(["Le stock réservé pour les urgences", "Un stock tampon pour absorber les variations de demande et les retards fournisseurs, évitant les ruptures", "Le stock minimum légalement requis", "Le stock endommagé non vendable"]), optionsEn: JSON.stringify(["Stock reserved for emergencies", "A buffer stock to absorb demand variations and supplier delays, preventing stockouts", "The minimum stock legally required", "Damaged unsellable stock"]), correctIndex: 1, explanationFr: "Le stock de sécurité absorbe l'incertitude : variations de demande et retards fournisseurs. Formule de base : SS = Z × σ_d × √(L). Sans stock de sécurité, toute variation entraîne une rupture.", explanationEn: "Safety stock absorbs uncertainty: demand variations and supplier delays. Basic formula: SS = Z × σ_d × √(L). Without safety stock, any variation causes a stockout." },
    { quizId: m3.id, orderIndex: 4, difficulty: "hard", questionFr: "Lors d'un inventaire cyclique, vous comptez 45 unités alors que le système en indique 50. Quelle est la variance et quelle action prendre ?", questionEn: "During a cycle count, you count 45 units while the system shows 50. What is the variance and what action to take?", optionsFr: JSON.stringify(["Variance = +5, commander 5 unités supplémentaires", "Variance = -5, investiguer la cause puis ajuster le stock système à 45", "Variance = -5, ignorer car moins de 10% d'écart", "Variance = +5, retourner 5 unités au fournisseur"]), optionsEn: JSON.stringify(["Variance = +5, order 5 additional units", "Variance = -5, investigate the cause then adjust system stock to 45", "Variance = -5, ignore as less than 10% discrepancy", "Variance = +5, return 5 units to supplier"]), correctIndex: 1, explanationFr: "Variance = -5 (physique - système = 45 - 50). Procédure : (1) investiguer la cause (vol, erreur de saisie, déchets), (2) documenter, (3) ajuster le stock système à 45. Ignorer les écarts dégrade la précision.", explanationEn: "Variance = -5 (physical - system = 45 - 50). Procedure: (1) investigate cause (theft, entry error, waste), (2) document, (3) adjust system stock to 45. Ignoring discrepancies degrades accuracy." },
  ]);

  // ── M4 ─────────────────────────────────────────────────────────────────────
  const [m4] = await db.insert(quizzes).values({ moduleId: 4, titleFr: "Quiz M4 — Indicateurs de performance logistique (KPI)", titleEn: "Quiz M4 — Logistics Performance Indicators (KPI)", passingScore: 60 }).$returningId();
  await db.insert(quizQuestions).values([
    { quizId: m4.id, orderIndex: 1, difficulty: "medium", questionFr: "Qu'est-ce que l'indicateur OTIF (On Time In Full) ?", questionEn: "What is the OTIF (On Time In Full) indicator?", optionsFr: JSON.stringify(["Le taux de commandes livrées à temps ET complètes", "Le taux de commandes livrées à temps uniquement", "Le taux de commandes livrées complètes uniquement", "Le délai moyen de livraison en jours"]), optionsEn: JSON.stringify(["The rate of orders delivered on time AND complete", "The rate of orders delivered on time only", "The rate of orders delivered complete only", "The average delivery time in days"]), correctIndex: 0, explanationFr: "L'OTIF mesure le % de commandes livrées à la fois à temps ET complètes. Un OTIF de 95% signifie que 95% des commandes respectent les deux critères. C'est l'indicateur le plus exigeant car il combine deux contraintes.", explanationEn: "OTIF measures the % of orders delivered both on time AND complete. An OTIF of 95% means 95% of orders meet both criteria. It is the most demanding indicator as it combines two constraints." },
    { quizId: m4.id, orderIndex: 2, difficulty: "hard", questionFr: "Le taux de rotation des stocks est de 12. Qu'est-ce que cela signifie ?", questionEn: "The stock turnover rate is 12. What does this mean?", optionsFr: JSON.stringify(["Le stock est renouvelé 12 fois par an, soit environ tous les 30 jours", "Il y a 12 articles différents en stock", "Le stock a une valeur de 12 000 $", "Le stock a été compté 12 fois cette année"]), optionsEn: JSON.stringify(["Stock is renewed 12 times per year, approximately every 30 days", "There are 12 different items in stock", "Stock has a value of $12,000", "Stock has been counted 12 times this year"]), correctIndex: 0, explanationFr: "Rotation = 12 signifie que le stock complet est renouvelé 12 fois/an (environ tous les 30 jours). Formule : Rotation = Coût des ventes / Stock moyen. Taux élevé = bonne liquidité mais risque de rupture. Taux faible = stock dormant et coûts de possession élevés.", explanationEn: "Turnover = 12 means the entire stock is renewed 12 times/year (approximately every 30 days). Formula: Turnover = Cost of sales / Average stock. High rate = good liquidity but stockout risk. Low rate = dormant stock and high holding costs." },
    { quizId: m4.id, orderIndex: 3, difficulty: "medium", questionFr: "Qu'est-ce que le DSI (Durée de Stock en Jours) ?", questionEn: "What is DSI (Days of Supply on Hand)?", optionsFr: JSON.stringify(["Le nombre de jours depuis la dernière livraison", "Le nombre de jours pendant lesquels le stock actuel peut couvrir la demande sans réapprovisionnement", "Le délai de livraison fournisseur", "Le nombre de jours travaillés dans l'entrepôt"]), optionsEn: JSON.stringify(["The number of days since the last delivery", "The number of days the current stock can cover demand without replenishment", "The supplier delivery lead time", "The number of working days in the warehouse"]), correctIndex: 1, explanationFr: "DSI = Stock actuel / Demande quotidienne moyenne. Un DSI de 30 signifie que le stock durera 30 jours. Il aide à planifier les réapprovisionnements et à identifier le stock excédentaire.", explanationEn: "DSI = Current stock / Average daily demand. A DSI of 30 means stock will last 30 days. It helps plan replenishments and identify excess stock." },
    { quizId: m4.id, orderIndex: 4, difficulty: "hard", questionFr: "Lors d'une RCA d'un OTIF de 78% (objectif 95%), quelles sont les deux premières questions à poser ?", questionEn: "During an RCA of an OTIF of 78% (target 95%), what are the first two questions to ask?", optionsFr: JSON.stringify(["Qui est responsable? et Quand?", "Combien de commandes? et Quel est le coût?", "Les retards sont-ils dus aux livraisons tardives ou aux commandes incomplètes? et Quels articles/clients sont les plus affectés?", "Le WMS fonctionne-t-il? et Les employés sont-ils formés?"]), optionsEn: JSON.stringify(["Who is responsible? and When?", "How many orders? and What is the cost?", "Are delays due to late deliveries or incomplete orders? and Which items/customers are most affected?", "Is the WMS working? and Are employees trained?"]), correctIndex: 2, explanationFr: "Une bonne RCA segmente d'abord : (1) L'OTIF est-il dégradé par les retards (On Time) ou les commandes incomplètes (In Full) ? — deux problèmes différents. (2) Quels articles/clients/fournisseurs sont les plus affectés ? Ensuite seulement on cherche les causes racines.", explanationEn: "A good RCA first segments: (1) Is OTIF degraded by delays (On Time) or incomplete orders (In Full)? — two different problems. (2) Which items/customers/suppliers are most affected? Only then do we look for root causes." },
  ]);

  // ── M5 ─────────────────────────────────────────────────────────────────────
  const [m5] = await db.insert(quizzes).values({ moduleId: 5, titleFr: "Quiz M5 — Simulation intégrée et décision stratégique", titleEn: "Quiz M5 — Integrated Simulation and Strategic Decision", passingScore: 60 }).$returningId();
  await db.insert(quizQuestions).values([
    { quizId: m5.id, orderIndex: 1, difficulty: "medium", questionFr: "Dans une crise logistique (rupture de stock critique), quelle est la première action prioritaire ?", questionEn: "In a logistics crisis (critical stockout), what is the first priority action?", optionsFr: JSON.stringify(["Informer immédiatement la direction", "Évaluer l'impact sur les commandes clients et identifier les alternatives d'approvisionnement d'urgence", "Commander en urgence auprès du fournisseur habituel", "Réduire les expéditions de 50%"]), optionsEn: JSON.stringify(["Immediately inform management", "Assess impact on current orders and identify emergency supply alternatives", "Place an urgent order with the usual supplier", "Reduce shipments by 50%"]), correctIndex: 1, explanationFr: "Face à une rupture critique, la priorité est l'évaluation de l'impact : quelles commandes sont affectées, quels clients sont prioritaires, et quelles alternatives existent. Agir sans évaluer peut aggraver la situation.", explanationEn: "Facing a critical stockout, the priority is impact assessment: which orders are affected, which customers are priority, and what alternatives exist. Acting without assessing can worsen the situation." },
    { quizId: m5.id, orderIndex: 2, difficulty: "hard", questionFr: "Vous devez choisir entre : (A) Commander fréquemment de petites quantités, (B) Commander rarement de grandes quantités. Dans quel contexte choisissez-vous A ?", questionEn: "You must choose between: (A) Order frequently in small quantities, (B) Order rarely in large quantities. In what context do you choose A?", optionsFr: JSON.stringify(["Produits à faible rotation et coût de stockage élevé", "Produits périssables, à forte rotation, ou quand l'espace de stockage est limité", "Produits avec un délai fournisseur très long", "Produits avec une demande très stable"]), optionsEn: JSON.stringify(["Low-turnover products with high storage costs", "Perishable products, high-turnover, or when storage space is limited", "Products with very long supplier lead time", "Products with very stable demand"]), correctIndex: 1, explanationFr: "Stratégie A (petites commandes fréquentes) est optimale pour : produits périssables (réduire les pertes), forte rotation (flux tendu, JIT), et espace limité. Elle réduit le stock moyen mais augmente les coûts de passation.", explanationEn: "Strategy A (small frequent orders) is optimal for: perishable products (reduce waste), high-turnover (lean flow, JIT), and limited space. It reduces average stock but increases ordering costs." },
    { quizId: m5.id, orderIndex: 3, difficulty: "hard", questionFr: "Votre entrepôt a un LPH de 45 (objectif 60). Quels sont les deux leviers d'amélioration les plus efficaces ?", questionEn: "Your warehouse has an LPH of 45 (target 60). What are the two most effective improvement levers?", optionsFr: JSON.stringify(["Augmenter les heures supplémentaires et recruter", "Optimiser les tournées de picking et améliorer le slotting (articles à forte rotation près des zones d'expédition)", "Investir dans un nouveau WMS", "Réduire le nombre de références"]), optionsEn: JSON.stringify(["Increase overtime and hire staff", "Optimize picking routes and improve slotting (high-turnover items near shipping areas)", "Invest in a new WMS", "Reduce the number of references"]), correctIndex: 1, explanationFr: "Les deux leviers les plus efficaces : (1) Optimisation des tournées de picking — réduire les distances (algorithme en S, par zone). (2) Slotting — placer les articles classe A près des zones d'expédition. Ces actions peuvent augmenter le LPH de 20-40% sans investissement majeur.", explanationEn: "The two most effective levers: (1) Picking route optimization — reducing distances (S-curve, zone algorithms). (2) Slotting — placing class A items near shipping areas. These actions can increase LPH by 20-40% without major investment." },
    { quizId: m5.id, orderIndex: 4, difficulty: "hard", questionFr: "Après les 5 modules TEC.LOG, quelle compétence différencie un gestionnaire logistique expert d'un débutant ?", questionEn: "After all 5 TEC.LOG modules, what skill differentiates an expert logistics manager from a beginner?", optionsFr: JSON.stringify(["La capacité à utiliser tous les menus du WMS", "La capacité à interpréter les KPI, identifier les causes racines et proposer des actions correctives mesurables", "La vitesse d'exécution des transactions", "La connaissance de tous les codes d'articles"]), optionsEn: JSON.stringify(["The ability to use all WMS menus", "The ability to interpret KPIs, identify root causes and propose measurable corrective actions", "The speed of executing transactions", "Knowledge of all item codes"]), correctIndex: 1, explanationFr: "L'expertise va au-delà du WMS. Un expert sait : lire les KPI et détecter les anomalies, mener une RCA pour identifier les causes racines, proposer des actions SMART, et prévenir les problèmes. C'est cette capacité d'analyse qui crée de la valeur.", explanationEn: "Expertise goes beyond WMS. An expert knows: how to read KPIs and detect anomalies, conduct RCA to identify root causes, propose SMART actions, and prevent problems. This analytical ability creates value." },
  ]);
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return null;
  const { passwordResetTokens } = await import("../drizzle/schema");
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return token;
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const { passwordResetTokens } = await import("../drizzle/schema");
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return row ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  const db = await getDb();
  if (!db) return;
  const { passwordResetTokens } = await import("../drizzle/schema");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
}
