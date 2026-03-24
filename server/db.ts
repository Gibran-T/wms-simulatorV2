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
