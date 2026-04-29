import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  addCycleCount,
  addPutawayRecord,
  addScoringEvent,
  addTransaction,
  completeRun,
  createAssignment,
  createCohort,
  createScenario,
  getAllAssignments,
  getAllBinCapacities,
  getAllModuleProgressForMonitor,
  getAllRunsForMonitor,
  getAllScenarios,
  getAllSkus,
  getAllBins,
  getAssignmentsForStudent,
  getCohortsByTeacher,
  getCycleCountsByRun,
  getModuleProgressByUser,
  getPassedModuleIds,
  getProgressByRun,
  getPutawayByRun,
  getRunById,
  getRunsByUser,
  getScenarioById,
  getScoringEventsByRun,
  getTransactionsByRun,
  markStepComplete,
  postTransaction,
  resolveCycleCount,
  resolveAllCycleCountsByRun,
  startRun,
  updateUserRole,
  upsertModuleProgress,
  getAllUsers,
  getProfileByUserId,
  upsertProfile,
  resetRun,
  getPreAuthorizedEmails,
  addPreAuthorizedEmail,
  removePreAuthorizedEmail,
  getUserByEmail,
  createLocalUser,
  updateUserPassword,
  listStudents,
  setStudentActive,
  updateStudentNotes,
  assignStudentToCohort,
  getStudentStats,
  getQuizByModule,
  getQuizWithQuestions,
  getQuizAttemptsByUser,
  getBestQuizAttempt,
  saveQuizAttempt,
} from "./db";
import {
  calculateBinLoad,
  calculateInventory,
  calculateProgressPct,
  calculateProgressPctAllModules,
  canExecuteStep,
  canIssueStock,
  checkCompliance,
  getNextRequiredStep,
  getNextRequiredStepAllModules,
  isModuleUnlocked,
  MODULE1_STEPS,
  MODULE2_STEPS,
  MODULE3_STEPS,
  MODULE4_STEPS,
  MODULE5_STEPS,
  validatePutaway,
  validateGRZone,
  validatePutawayM1Zone,
  validatePickingM1Zone,
  validateGIZone,
  RECEPTION_BINS,
  STOCKAGE_BINS,
  PICKING_BINS,
  EXPEDITION_BINS,
  RESERVE_BINS,
  calculateKpis,
  scoreKpiInterpretation,
  canExecuteStepM2,
  canExecuteStepM3,
  computeReplenishmentSuggestion,
  scoreM5Decision,
  type KpiData,
} from "./rulesEngine";
import {
  addInventoryCount,
  addInventoryAdjustment,
  addReplenishmentSuggestion,
  addKpiSnapshot,
  addKpiInterpretation,
} from "./db";
import { calculateTotalScore, getScoringRule, getScoreLabel } from "./scoringEngine";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import type { ValidationResult } from "./rulesEngine";
import type { IncomingMessage } from "http";

// ─── Language Helper ────────────────────────────────────────────────────────────────────────────────
/**
 * Returns the EN message when the client sends Accept-Language: en,
 * otherwise falls back to the FR message (default).
 */
function pickReason(result: ValidationResult, req: IncomingMessage): string {
  const lang = (req.headers["accept-language"] ?? "fr").toLowerCase();
  const isEn = lang.startsWith("en");
  return (isEn ? result.reasonEn : result.reasonFr) ?? result.reason ?? "Erreur de validation";
}

// ─── Role Guards ──────────────────────────────────────────────────────────────
const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux enseignants" });
  }
  return next({ ctx });
});

const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux étudiants" });
  }
  return next({ ctx });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function buildRunState(runId: number) {
  const txs = await getTransactionsByRun(runId);
  const ccs = await getCycleCountsByRun(runId);
  const prog = await getProgressByRun(runId);

  const inventory = calculateInventory(
    txs.map((t) => ({
      docType: t.docType,
      sku: t.sku,
      bin: t.bin,
      qty: Number(t.qty),
      posted: t.posted,
    }))
  );

  const completedSteps = prog.filter((p) => p.completed).map((p) => p.stepCode as any);

  return {
    completedSteps,
    transactions: txs.map((t) => ({
      docType: t.docType,
      sku: t.sku,
      bin: t.bin,
      qty: Number(t.qty),
      posted: t.posted,
      docRef: (t as any).docRef ?? null,
    })),
    cycleCounts: ccs.map((c) => ({
      sku: c.sku,
      bin: c.bin,
      variance: Number(c.variance),
      resolved: c.resolved,
    })),
    inventory,
  };
}

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ?? null),
    logout: protectedProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
      return { success: true };
    }),

    // ── Local email/password login ──────────────────────────────────────────
    localLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email.toLowerCase());
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou mot de passe incorrect" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou mot de passe incorrect" });
        }
        if (user.isActive === false) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Compte désactivé. Contactez votre enseignant." });
        }
        const { sdk } = await import("./_core/sdk");
        const { ONE_YEAR_MS } = await import("@shared/const");
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, role: user.role, name: user.name };
      }),

    // ── Local register (student self-registration) ──────────────────────────
    localRegister: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        accessCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cet email" });
        }
        // Validate access code if provided (optional gate)
        const STUDENT_ACCESS_CODE = process.env.STUDENT_ACCESS_CODE || "TECLOG2025";
        if (input.accessCode && input.accessCode.toUpperCase() !== STUDENT_ACCESS_CODE.toUpperCase()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Code d'accès invalide" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await createLocalUser({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
          role: "student",
        });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erreur lors de la création du compte" });
        const { sdk } = await import("./_core/sdk");
        const { ONE_YEAR_MS } = await import("@shared/const");
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, role: user.role, name: user.name };
      }),

    // ── Admin: create teacher/student account ───────────────────────────────
    createAccount: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(["student", "teacher", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cet email" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await createLocalUser({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
          role: input.role,
        });
        return { success: true, userId: user?.id };
      }),

    // ── Reset password (admin only) ─────────────────────────────────────────
    resetPassword: protectedProcedure
      .input(z.object({ userId: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateUserPassword(input.userId, passwordHash);
        return { success: true };
      }),
    // ── Request password reset (public) ────────────────────────────────────
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { getUserByEmail, createPasswordResetToken } = await import("./db");
        const { notifyOwner } = await import("./_core/notification");
        const user = await getUserByEmail(input.email.toLowerCase());
        // Always return success to prevent email enumeration
        if (!user) return { success: true, message: "Si ce compte existe, un lien de réinitialisation a été généré." };
        // Generate a secure random token
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await createPasswordResetToken(user.id, token, expiresAt);
        // Build the reset URL using origin from request headers
        const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/[^/]*$/, "") || "http://localhost:3000";
        const resetUrl = `${origin}/reset-password/${token}`;
        // Notify teacher/admin (since we can't email students directly)
        await notifyOwner({
          title: `🔑 Réinitialisation de mot de passe — ${user.name || user.email}`,
          content: `L'étudiant **${user.name || "Inconnu"}** (${user.email}) a demandé une réinitialisation de mot de passe.\n\nLien de réinitialisation (valide 1h) :\n${resetUrl}\n\nPartagez ce lien avec l'étudiant via le canal de communication habituel.`,
        });
        return { success: true, resetUrl, message: "Lien de réinitialisation généré. Votre enseignant a été notifié." };
      }),
    // ── Reset password with token (public) ─────────────────────────────────
    resetPasswordWithToken: publicProcedure
      .input(z.object({ token: z.string().min(1), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const { getPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword } = await import("./db");
        const tokenRow = await getPasswordResetToken(input.token);
        if (!tokenRow) throw new TRPCError({ code: "NOT_FOUND", message: "Lien de réinitialisation invalide ou expiré." });
        if (tokenRow.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce lien a déjà été utilisé." });
        if (new Date() > tokenRow.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce lien a expiré. Veuillez en demander un nouveau." });
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateUserPassword(tokenRow.userId, passwordHash);
        await markPasswordResetTokenUsed(tokenRow.id);
        return { success: true, message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter." };
      }),
  }),

  // ─── Master Data ───────────────────────────────────────────────────────────
  master: router({
    skus: protectedProcedure.query(() => getAllSkus()),
    bins: protectedProcedure.query(() => getAllBins()),
  }),

  // ─── Student Management (Teacher) ─────────────────────────────────────────
  students: router({
    list: teacherProcedure
      .input(z.object({ cohortId: z.number().optional(), includeAll: z.boolean().optional() }))
      .query(async ({ input }) => listStudents(input)),

    create: teacherProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(6),
        cohortId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cet email" });
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await createLocalUser({ email: input.email.toLowerCase(), name: input.name, passwordHash, role: "student" });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.cohortId) await assignStudentToCohort(user.id, input.cohortId);
        return { success: true, userId: user.id };
      }),

    setActive: teacherProcedure
      .input(z.object({ userId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => { await setStudentActive(input.userId, input.isActive); return { success: true }; }),

    updateNotes: teacherProcedure
      .input(z.object({ userId: z.number(), notes: z.string() }))
      .mutation(async ({ input }) => { await updateStudentNotes(input.userId, input.notes); return { success: true }; }),

    resetPassword: teacherProcedure
      .input(z.object({ userId: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateUserPassword(input.userId, passwordHash);
        return { success: true };
      }),

    assignCohort: teacherProcedure
      .input(z.object({ userId: z.number(), cohortId: z.number().nullable() }))
      .mutation(async ({ input }) => { await assignStudentToCohort(input.userId, input.cohortId); return { success: true }; }),

    stats: teacherProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => getStudentStats(input.userId)),
  }),

  // ─── Scenarios ─────────────────────────────────────────────────────────────
  scenarios: router({
    list: protectedProcedure.query(() => getAllScenarios()),
    listByModule: protectedProcedure
      .input(z.object({ moduleCode: z.string() }))
      .query(async ({ input }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) return [];
        const { modules: modulesTable, scenarios: scenariosTable } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [mod] = await db.select().from(modulesTable).where(eq(modulesTable.code, input.moduleCode));
        if (!mod) return [];
        return db.select().from(scenariosTable).where(and(eq(scenariosTable.moduleId, mod.id), eq(scenariosTable.isActive, true)));
      }),
    create: teacherProcedure
      .input(
        z.object({
          moduleId: z.number().default(1),
          name: z.string().min(1),
          descriptionFr: z.string().default(""),
          difficulty: z.enum(["facile", "moyen", "difficile"]).default("facile"),
          initialStateJson: z.any().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createScenario({ ...input, initialStateJson: input.initialStateJson ?? null, createdBy: ctx.user.id })
      ),
  }),

  // ─── Modules progress ─────────────────────────────────────────────────────
  modules: router({
    progress: protectedProcedure.query(async ({ ctx }) => {
      const db = await import("./db").then((m) => m.getDb());
      if (!db) return [];
      const { modules: modulesTable, moduleProgress: mpTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select({ progress: mpTable, module: modulesTable })
        .from(mpTable)
        .innerJoin(modulesTable, eq(mpTable.moduleId, modulesTable.id))
        .where(eq(mpTable.userId, ctx.user.id));
      return rows.map((r) => ({
        ...r.progress,
        moduleCode: r.module.code,
        moduleTitleFr: r.module.titleFr,
      }));
    }),
  }),

  // ─── KPI (Module 4) ────────────────────────────────────────────────────────
  kpi: router({
    submitInterpretation: protectedProcedure
      .input(z.object({
        runId: z.number(),
        kpiKey: z.enum(["rotationRate", "serviceLevel", "errorRate", "diagnostic"]),
        studentAnswer: z.string().min(1),
        kpiData: z.object({
          annualConsumption: z.number(),
          averageStock: z.number(),
          ordersFulfilled: z.number(),
          totalOrders: z.number(),
          operationalErrors: z.number(),
          totalOperations: z.number(),
          avgLeadTimeDays: z.number(),
          stockValue: z.number(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const kpiData: KpiData = input.kpiData ?? {
          annualConsumption: 2400, averageStock: 400,
          ordersFulfilled: 285, totalOrders: 300,
          operationalErrors: 12, totalOperations: 300,
          avgLeadTimeDays: 3.5, stockValue: 48000,
        };
        const kpiResult = calculateKpis(kpiData);
        const result = scoreKpiInterpretation(input.kpiKey as any, input.studentAnswer, kpiResult);
        // Persist interpretation
        const db = await import("./db").then((m) => m.getDb());
        if (db) {
          const { kpiInterpretations } = await import("../drizzle/schema");
          await db.insert(kpiInterpretations).values({
            runId: input.runId,
            kpiKey: input.kpiKey,
            studentAnswer: input.studentAnswer,
            isCorrect: result.isCorrect,
            pointsDelta: result.pointsDelta,
            feedback: result.feedback,
          });
        }
        return result;
      }),
    getSnapshot: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) return null;
        const { kpiSnapshots } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(kpiSnapshots).where(eq(kpiSnapshots.runId, input.runId)).limit(1);
        return rows[0] ?? null;
      }),
  }),

  // ─── Cohorts ───────────────────────────────────────────────────────────────
  cohorts: router({
    list: teacherProcedure.query(({ ctx }) => getCohortsByTeacher(ctx.user.id)),
    create: teacherProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ ctx, input }) => createCohort(input.name, input.description ?? null, ctx.user.id)),
  }),

  // ─── Assignments ────────────────────────────────────────────────────────────
  assignments: router({
    forStudent: studentProcedure.query(async ({ ctx }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      return getAssignmentsForStudent(ctx.user.id, profile?.cohortId ?? null);
    }),
    all: teacherProcedure.query(() => getAllAssignments()),
    create: teacherProcedure
      .input(
        z.object({
          scenarioId: z.number(),
          cohortId: z.number().nullable(),
          userId: z.number().nullable(),
          dueDate: z.string().nullable(),
        })
      )
      .mutation(({ input }) =>
        createAssignment({
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        })
      ),
  }),

  // ─── Profiles ──────────────────────────────────────────────────────────────
  profiles: router({
    mine: protectedProcedure.query(({ ctx }) => getProfileByUserId(ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        cohortId: z.number().nullable().optional(),
        displayName: z.string().optional(),
        studentNumber: z.string().max(64).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => upsertProfile(ctx.user.id, input.cohortId ?? null, input.studentNumber)),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    users: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllUsers();
    }),
    listStudents: teacherProcedure.query(async () => {
      const all = await getAllUsers();
      const students = all.filter((u) => u.role === "student" || u.role === "admin");
      // Enrich with profile data (studentNumber, cohortId)
      const enriched = await Promise.all(
        students.map(async (u) => {
          const profile = await getProfileByUserId(u.id);
          return { ...u, studentNumber: profile?.studentNumber ?? null, cohortId: profile?.cohortId ?? null };
        })
      );
      return enriched;
    }),
    setRole: protectedProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["student", "teacher", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Pre-authorized emails — auto-assign role on first login
    listPreAuthorized: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getPreAuthorizedEmails();
    }),
    addPreAuthorized: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["student", "teacher", "admin"]).default("teacher"),
        note: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await addPreAuthorizedEmail(input.email, input.role, input.note ?? null, ctx.user.id);
        return { success: true };
      }),
    removePreAuthorized: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await removePreAuthorizedEmail(input.id);
        return { success: true };
      }),
  }),

  // ─── Runs ────────────────────────────────────────────────────────────────────
  runs: router({
    start: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
        isDemo: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only teachers/admins can start demo sessions
        const isDemo = input.isDemo && (ctx.user.role === "teacher" || ctx.user.role === "admin");
        const result = await startRun(ctx.user.id, input.scenarioId, isDemo);
        // Load initial state from scenario
        const scenario = await getScenarioById(input.scenarioId);
        const insertId = (result as any)[0]?.insertId as number;
        if (scenario?.initialStateJson) {
          const state = scenario.initialStateJson as any;
          if (state.preloadedTransactions) {
            for (const tx of state.preloadedTransactions) {
              await addTransaction({
                runId: insertId,
                docType: tx.docType,
                moveType: null,
                sku: tx.sku,
                bin: tx.bin,
                qty: String(tx.qty),
                posted: tx.posted ?? false,
                docRef: tx.docRef ?? null,
                comment: "Initial state",
              });
            }
          }
        }
        return { runId: insertId, isDemo };
      }),

    myRuns: protectedProcedure.query(({ ctx }) => getRunsByUser(ctx.user.id)),

    /** Enriched runs for the student scenario list — includes score and completedSteps */
    myRunsEnriched: protectedProcedure.query(async ({ ctx }) => {
      const runs = await getRunsByUser(ctx.user.id);
      const enriched = await Promise.all(
        runs.map(async (r) => {
          const state = await buildRunState(r.run.id);
          const events = r.run.isDemo ? [] : await getScoringEventsByRun(r.run.id);
          return {
            ...r,
            completedSteps: state.completedSteps as string[],
            progressPct: calculateProgressPctAllModules(state.completedSteps, r.scenario.moduleId),
            score: r.run.isDemo ? null : calculateTotalScore(events),
          };
        })
      );
      return enriched;
    }),

    /** Student's own score evolution across multiple attempts on a scenario */
    myScoreEvolution: protectedProcedure
      .input(z.object({ scenarioId: z.number() }))
      .query(async ({ ctx, input }) => {
        const allRuns = await getRunsByUser(ctx.user.id);
        // Only eval (non-demo) runs for this scenario, sorted by date
        const filtered = allRuns
          .filter(r => r.run.scenarioId === input.scenarioId && !r.run.isDemo)
          .sort((a, b) => new Date(a.run.startedAt).getTime() - new Date(b.run.startedAt).getTime());

        const attempts = await Promise.all(
          filtered.map(async (r, idx) => {
            const events = await getScoringEventsByRun(r.run.id);
            const score = calculateTotalScore(events);
            const penalties = events.filter(e => e.pointsDelta < 0).length;
            const bonuses   = events.filter(e => e.pointsDelta > 0).length;
            const state     = await buildRunState(r.run.id);
            const progress  = calculateProgressPctAllModules(state.completedSteps, r.scenario.moduleId);
            return {
              attempt:     idx + 1,
              runId:       r.run.id,
              score,
              penalties,
              bonuses,
              progressPct: progress,
              status:      r.run.status,
              startedAt:   r.run.startedAt,
              completedAt: r.run.completedAt,
            };
          })
        );

        const scores = attempts.map(a => a.score);
        const bestScore = scores.length ? Math.max(...scores) : 0;
        const lastScore = scores.length ? scores[scores.length - 1] : 0;
        const trend     = scores.length >= 2 ? lastScore - scores[scores.length - 2] : 0;
        const passed    = bestScore >= 60;

        return { attempts, bestScore, lastScore, trend, passed, totalAttempts: attempts.length };
      }),

    /** Detailed report: per-step scores, errors, and recommendations */
    detailedReport: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const events = await getScoringEventsByRun(input.runId);
        const state = await buildRunState(input.runId);
        const compliance = checkCompliance(state);

        // ── Determine module from scenario ──────────────────────────────────
        const scenario = await getScenarioById(run.scenarioId);
        const moduleId = scenario?.moduleId ?? 1;
        // ── Step max points map (all modules) ───────────────────────────────
        const STEP_MAX_ALL: Record<string, number> = {
          // M1
          PO: 10, GR: 10, PUTAWAY_M1: 5, STOCK: 0, SO: 10, PICKING_M1: 5, GI: 15, CC: 10, COMPLIANCE: 5,
          // M2
          FIFO_PICK: 15, STOCK_ACCURACY: 15, COMPLIANCE_ADV: 20,
          // M3
          CC_LIST: 10, CC_COUNT: 20, CC_RECON: 15, REPLENISH: 20, COMPLIANCE_M3: 15,
          // M4
          KPI_DATA: 10, KPI_ROTATION: 20, KPI_SERVICE: 20, KPI_DIAGNOSTIC: 20, COMPLIANCE_M4: 15,
          // M5
          M5_RECEPTION: 10, M5_PUTAWAY: 10, M5_CYCLE_COUNT: 15, M5_REPLENISH: 20, M5_KPI: 10, M5_DECISION: 30, COMPLIANCE_M5: 20,
        };
        const STEP_EVENT_MAP_ALL: Record<string, string> = {
          // M1
          PO: "PO_COMPLETED", GR: "GR_COMPLETED", PUTAWAY_M1: "PUTAWAY_M1_COMPLETED",
          SO: "SO_COMPLETED", PICKING_M1: "PICKING_M1_COMPLETED",
          GI: "GI_COMPLETED", CC: "CC_COMPLETED", COMPLIANCE: "COMPLIANCE_OK",
          // M2
          FIFO_PICK: "FIFO_PICK_COMPLETED", STOCK_ACCURACY: "STOCK_ACCURACY_COMPLETED", COMPLIANCE_ADV: "COMPLIANCE_ADV_COMPLETED",
          // M3
          CC_LIST: "CC_LIST_COMPLETED", CC_COUNT: "CC_COUNT_COMPLETED", CC_RECON: "CC_RECON_COMPLETED",
          REPLENISH: "REPLENISH_COMPLETED", COMPLIANCE_M3: "COMPLIANCE_M3_COMPLETED",
          // M4
          KPI_DATA: "KPI_DATA_COMPLETED", KPI_ROTATION: "KPI_ROTATION_COMPLETED", KPI_SERVICE: "KPI_SERVICE_COMPLETED",
          KPI_DIAGNOSTIC: "KPI_DIAGNOSTIC_COMPLETED", COMPLIANCE_M4: "COMPLIANCE_M4_COMPLETED",
          // M5
          M5_RECEPTION: "M5_RECEPTION_COMPLETED", M5_PUTAWAY: "M5_PUTAWAY_COMPLETED", M5_CYCLE_COUNT: "M5_CYCLE_COUNT_COMPLETED",
          M5_REPLENISH: "M5_REPLENISH_COMPLETED", M5_KPI: "M5_KPI_COMPLETED", M5_DECISION: "M5_DECISION_COMPLETED", COMPLIANCE_M5: "COMPLIANCE_M5_COMPLETED",
        };
        const STEP_ZONES_ALL: Record<string, { from?: string; to?: string; zone?: string }> = {
          PO: { zone: "ACHAT" }, GR: { to: "RÉCEPTION" }, PUTAWAY_M1: { from: "RÉCEPTION", to: "STOCKAGE" },
          STOCK: { zone: "STOCKAGE" }, SO: { zone: "VENTE" }, PICKING_M1: { from: "STOCKAGE", to: "EXPÉDITION" },
          GI: { from: "EXPÉDITION" }, CC: { zone: "STOCKAGE" }, COMPLIANCE: { zone: "SYSTÈME" },
          FIFO_PICK: { from: "STOCKAGE", to: "EXPÉDITION" }, STOCK_ACCURACY: { zone: "STOCKAGE" }, COMPLIANCE_ADV: { zone: "SYSTÈME" },
          CC_LIST: { zone: "STOCKAGE" }, CC_COUNT: { zone: "STOCKAGE" }, CC_RECON: { zone: "STOCKAGE" },
          REPLENISH: { zone: "ACHAT" }, COMPLIANCE_M3: { zone: "SYSTÈME" },
          KPI_DATA: { zone: "ANALYTIQUE" }, KPI_ROTATION: { zone: "ANALYTIQUE" }, KPI_SERVICE: { zone: "ANALYTIQUE" },
          KPI_DIAGNOSTIC: { zone: "ANALYTIQUE" }, COMPLIANCE_M4: { zone: "SYSTÈME" },
          M5_RECEPTION: { to: "RÉCEPTION" }, M5_PUTAWAY: { from: "RÉCEPTION", to: "STOCKAGE" },
          M5_CYCLE_COUNT: { zone: "STOCKAGE" }, M5_REPLENISH: { zone: "ACHAT" },
          M5_KPI: { zone: "ANALYTIQUE" }, M5_DECISION: { zone: "STRATÉGIQUE" }, COMPLIANCE_M5: { zone: "SYSTÈME" },
        };
        // ── Select steps for this module ─────────────────────────────────────
        const moduleSteps = moduleId === 2 ? MODULE2_STEPS
          : moduleId === 3 ? MODULE3_STEPS
          : moduleId === 4 ? MODULE4_STEPS
          : moduleId === 5 ? MODULE5_STEPS
          : MODULE1_STEPS;
        const stepCodesToReport = moduleSteps.map(s => s.code as string);
        // ── Per-step score breakdown ─────────────────────────────────────────
        const stepBreakdown = stepCodesToReport.map(step => {
          const completed = state.completedSteps.includes(step as any);
          const completionEvent = STEP_EVENT_MAP_ALL[step];
          const completionPoints = completionEvent
            ? events.filter(e => e.eventType === completionEvent).reduce((s, e) => s + e.pointsDelta, 0)
            : 0;
          const maxPoints = STEP_MAX_ALL[step] ?? 0;
          const pct = maxPoints > 0 ? Math.round((completionPoints / maxPoints) * 100) : (completed ? 100 : 0);
          // Collect zone errors for this step
          const zoneErrors = events
            .filter(e => e.eventType === "WRONG_ZONE" && (e.message ?? "").includes(step))
            .map(e => e.message ?? "");
          // Use labelFr from moduleSteps if available
          const stepDef = moduleSteps.find(s => (s.code as string) === step);
          const label = stepDef?.labelFr ?? step;
          return {
            step,
            label,
            completed,
            pointsEarned: completionPoints,
            maxPoints,
            pct: Math.max(0, Math.min(100, pct)),
            zones: STEP_ZONES_ALL[step] ?? {},
            zoneErrors,
          };
        });

        // ── Errors (negative events) ─────────────────────────────────────────
        const PENALTY_EXPLANATIONS: Record<string, { title: string; detail: string; recommendation: string }> = {
          OUT_OF_SEQUENCE: {
            title: "Tentative hors séquence",
            detail: "Vous avez tenté d'exécuter une étape avant que ses prérequis soient complétés. Dans SAP S/4HANA, le flux PO→GR→SO→GI est obligatoire car chaque document crée les références nécessaires à l'étape suivante.",
            recommendation: "Respectez toujours la séquence : PO → GR → Vérification stock → SO → GI → Cycle Count → Conformité.",
          },
          NEGATIVE_STOCK_ATTEMPT: {
            title: "Tentative de sortie avec stock insuffisant",
            detail: "Vous avez tenté d'émettre une Goods Issue (GI) pour une quantité supérieure au stock disponible. Cela aurait créé un stock négatif, ce qui est interdit dans un système ERP conforme.",
            recommendation: "Vérifiez toujours le stock disponible (MB52) avant de créer un SO/GI. Si le stock est insuffisant, créez d'abord une PO et postez la GR.",
          },
          UNPOSTED_TX_LEFT: {
            title: "Transaction non postée laissée en suspens",
            detail: "Une ou plusieurs transactions ont été créées mais non postées. Dans SAP, une transaction non postée n'a aucun effet sur l'inventaire et laisse le système dans un état incohérent.",
            recommendation: "Toujours poster (valider) chaque transaction immédiatement après sa création. Utilisez MB52 pour vérifier les transactions en suspens.",
          },
          UNRESOLVED_VARIANCE: {
            title: "Écart d'inventaire non résolu",
            detail: "Un écart entre le stock physique et le stock système a été détecté lors du Cycle Count mais n'a pas été résolu avec une transaction ADJ (ajustement d'inventaire).",
            recommendation: "Après chaque Cycle Count, analysez les écarts et créez une transaction MI07 (ADJ) pour réconcilier le stock physique avec le stock système.",
          },
        };

        const PENALTY_EXPLANATIONS_ZONE: Record<string, { title: string; detail: string; recommendation: string }> = {
          WRONG_ZONE_GR: {
            title: "Zone incorrecte — Réception (GR)",
            detail: "La marchandise reçue (GR/MIGO) doit obligatoirement être déposée dans un emplacement de la zone RÉCEPTION (REC-01 ou REC-02). Elle ne peut pas aller directement en zone STOCKAGE ou EXPÉDITION.",
            recommendation: "Lors du MIGO, sélectionnez toujours un emplacement REC-01 ou REC-02. Ensuite, utilisez LT0A pour ranger la marchandise en zone STOCKAGE.",
          },
          WRONG_ZONE_PUTAWAY: {
            title: "Zone incorrecte — Rangement (PUTAWAY)",
            detail: "Le rangement (LT0A) doit partir d'un emplacement RÉCEPTION (REC-01/REC-02) et aller vers un emplacement STOCKAGE, PICKING ou RÉSERVE. Les marchandises ne peuvent pas rester en zone RÉCEPTION.",
            recommendation: "Source : REC-01 ou REC-02. Destination : B-01-R1-L1, B-01-R1-L2, A-01-R1-L1, etc. Évitez EXP-01/EXP-02 comme destination de rangement.",
          },
          WRONG_ZONE_PICKING: {
            title: "Zone incorrecte — Prélèvement (PICKING)",
            detail: "Le prélèvement (VL01N) doit partir d'un emplacement STOCKAGE/PICKING/RÉSERVE et aller vers un emplacement EXPÉDITION (EXP-01 ou EXP-02). Les marchandises doivent transiter par le quai d'expédition avant la GI.",
            recommendation: "Source : B-01-R1-L1, A-01-R1-L1, etc. Destination : EXP-01 ou EXP-02. La GI ne peut être postée qu'après que les marchandises sont au quai d'expédition.",
          },
          WRONG_ZONE_GI: {
            title: "Zone incorrecte — Sortie marchandises (GI)",
            detail: "La sortie marchandises (GI/VL02N) doit être postée depuis un emplacement EXPÉDITION (EXP-01 ou EXP-02). Les marchandises doivent avoir été prélevées et déposées au quai d'expédition avant la GI.",
            recommendation: "Complétez d'abord l'étape PICKING (VL01N) pour déplacer les marchandises vers EXP-01 ou EXP-02, puis postez la GI depuis cet emplacement.",
          },
        };

        const errors = events
          .filter(e => e.pointsDelta < 0)
          .map(e => ({
            eventType: e.eventType,
            pointsDelta: e.pointsDelta,
            message: e.message ?? "",
            explanation: PENALTY_EXPLANATIONS_ZONE[e.eventType] ?? PENALTY_EXPLANATIONS[e.eventType] ?? {
              title: e.message ?? e.eventType,
              detail: "Une erreur a été détectée lors de cette étape.",
              recommendation: "Revoyez les prérequis de cette étape et recommencez la simulation.",
            },
            createdAt: e.createdAt,
          }));

        // ── Bonus events ─────────────────────────────────────────────────────
        const bonuses = events.filter(e => e.eventType === "PERFECT_RUN_BONUS");

        // ── Personalized recommendations ─────────────────────────────────────
        const errorTypes = new Set(errors.map(e => e.eventType));
        const recommendations: string[] = [];
        if (errorTypes.has("OUT_OF_SEQUENCE"))
          recommendations.push("Mémorisez le flux complet : ME21N → MIGO(→REC) → LT0A(REC→STOCK) → VA01 → VL01N(STOCK→EXP) → VL02N(→EXP) → MI01");
        if (errorTypes.has("NEGATIVE_STOCK_ATTEMPT"))
          recommendations.push("Avant chaque GI, vérifiez le stock disponible en zone STOCKAGE (MB52). Si insuffisant, créez d'abord une PO et postez la GR.");
        if (errorTypes.has("UNPOSTED_TX_LEFT"))
          recommendations.push("Adoptez le réflexe \"créer + poster\" : ne quittez jamais une étape sans poster la transaction");
        if (errorTypes.has("UNRESOLVED_VARIANCE"))
          recommendations.push("Après MI01/MI04, toujours finaliser avec MI07 (validation des écarts) avant la conformité");
        if (errorTypes.has("WRONG_ZONE_GR") || errorTypes.has("WRONG_ZONE_PUTAWAY"))
          recommendations.push("Flux de réception : MIGO → emplacement REC-01/REC-02, puis LT0A pour ranger en zone STOCKAGE (B-01, A-01, etc.)");
        if (errorTypes.has("WRONG_ZONE_PICKING") || errorTypes.has("WRONG_ZONE_GI"))
          recommendations.push("Flux d'expédition : VL01N pour prélever du STOCKAGE vers EXP-01/EXP-02, puis VL02N pour poster la GI depuis le quai d'expédition");
        if (!compliance.compliant)
          recommendations.push("Relancez la simulation en Mode Démonstration pour explorer librement les étapes sans pénalité");
        if (recommendations.length === 0 && errors.length === 0)
          recommendations.push("Excellente maîtrise du flux complet ! Passez au Module 2 pour approfondir FIFO, gestion de lots et traçabilité.");

        const totalScore = calculateTotalScore(events);
        const { label: scoreLabel, color: scoreColor } = getScoreLabel(totalScore);

          // ── Zone flow summary ────────────────────────────────────────────────
        const zoneFlow = [
          { zone: "RÉCEPTION",  bins: RECEPTION_BINS,  color: "#3b82f6", txCount: state.transactions.filter(t => RECEPTION_BINS.includes(t.bin) && t.posted).length },
          { zone: "STOCKAGE",   bins: STOCKAGE_BINS,   color: "#10b981", txCount: state.transactions.filter(t => STOCKAGE_BINS.includes(t.bin) && t.posted).length },
          { zone: "PICKING",    bins: PICKING_BINS,    color: "#f59e0b", txCount: state.transactions.filter(t => PICKING_BINS.includes(t.bin) && t.posted).length },
          { zone: "EXPÉDITION", bins: EXPEDITION_BINS, color: "#8b5cf6", txCount: state.transactions.filter(t => EXPEDITION_BINS.includes(t.bin) && t.posted).length },
          { zone: "RÉSERVE",    bins: RESERVE_BINS,    color: "#6b7280", txCount: state.transactions.filter(t => RESERVE_BINS.includes(t.bin) && t.posted).length },
        ];

        // ── Transaction timeline ─────────────────────────────────────────────
        const transactionTimeline = state.transactions
          .filter(t => t.posted)
          .map(t => ({
            docType: t.docType,
            sku: t.sku,
            bin: t.bin,
            qty: t.qty,
            zone: RECEPTION_BINS.includes(t.bin) ? "RÉCEPTION"
              : STOCKAGE_BINS.includes(t.bin) ? "STOCKAGE"
              : PICKING_BINS.includes(t.bin) ? "PICKING"
              : EXPEDITION_BINS.includes(t.bin) ? "EXPÉDITION"
              : RESERVE_BINS.includes(t.bin) ? "RÉSERVE" : "INCONNU",
            docRef: t.docRef,
          }));

        return {
          runId: input.runId,
          isDemo: run.isDemo,
          totalScore,
          scoreLabel,
          scoreColor,
          stepBreakdown,
          errors,
          bonuses,
          recommendations,
          complianceIssues: compliance.issuesFr,
          completedSteps: state.completedSteps,
          progressPct: calculateProgressPctAllModules(state.completedSteps, moduleId),
          zoneFlow,
          transactionTimeline,
          totalTransactions: state.transactions.filter(t => t.posted).length,
          totalErrors: errors.length,
          stepsCompleted: state.completedSteps.length,
          totalSteps: MODULE1_STEPS.length,
        };
      }),

    /** Admin/teacher: reset a student's run so they can start fresh */
    resetRun: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only teachers and admins can reset runs" });
        }
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        await resetRun(input.runId);
        return { success: true, message: `Run ${input.runId} has been reset successfully.` };
      }),

    state: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const state = await buildRunState(input.runId);
        const scenario = await getScenarioById(run.scenarioId);
        // In demo mode, score is always 0 (not tracked)
        // Score is now calculated for both modes; isDemo flag distinguishes official vs pedagogical
        const totalScore = calculateTotalScore(await getScoringEventsByRun(input.runId));
        const compliance = checkCompliance(state);
         const moduleId = scenario?.moduleId ?? 1;
        const nextStep = getNextRequiredStepAllModules(state.completedSteps, moduleId);
        const progressPct = calculateProgressPctAllModules(state.completedSteps, moduleId);
        return {
          run,
          scenario,
          completedSteps: state.completedSteps,
          inventory: state.inventory,
          compliance,
          nextStep,
          progressPct,
          totalScore,
          moduleId,
          steps: scenario?.moduleId === 2 ? MODULE2_STEPS
            : scenario?.moduleId === 3 ? MODULE3_STEPS
            : scenario?.moduleId === 4 ? MODULE4_STEPS
            : scenario?.moduleId === 5 ? MODULE5_STEPS
            : MODULE1_STEPS,
          isDemo: run.isDemo,
          // Backend transparency data (visible only in demo mode on frontend)
          demoBackendState: run.isDemo ? {
            transactions: state.transactions,
            cycleCounts: state.cycleCounts,
            inventory: state.inventory,
          } : null,
        };
      }),
  }),

  // ─── Transactions ────────────────────────────────────────────────────────────
  transactions: router({
    list: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(({ input }) => getTransactionsByRun(input.runId)),

    // Submit PO
    submitPO: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("PO", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            // Evaluation mode: penalize and block
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
          // Demo mode: warn but allow (return warning in response)
        }
        await addTransaction({ runId: input.runId, docType: "PO", moveType: "ME21N", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "PO");
        // Scoring applies in both eval and demo modes (demo score is non-official)
        const rulePO = getScoringRule("PO_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "PO_COMPLETED", pointsDelta: rulePO!.points, message: rulePO!.descriptionFr });
        return { success: true, demoWarning: run.isDemo && !validation.allowed ? pickReason(validation, ctx.req) : null };
      }),

    // Submit GR
    submitGR: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("GR", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
        }
        // Zone validation: GR must go to RECEPTION bin
        const zoneCheck = validateGRZone(input.bin);
        if (!zoneCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_GR", pointsDelta: -3, message: `GR: ${zoneCheck.reasonFr}` });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheck, ctx.req) });
          }
        }
        await addTransaction({ runId: input.runId, docType: "GR", moveType: "101", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "GR");
        const ruleGR = getScoringRule("GR_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "GR_COMPLETED", pointsDelta: ruleGR!.points, message: ruleGR!.descriptionFr });
        const demoWarnGR = run.isDemo && (!validation.allowed || !zoneCheck.allowed)
          ? [!validation.allowed ? pickReason(validation, ctx.req) : null, !zoneCheck.allowed ? pickReason(zoneCheck, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning: demoWarnGR };
      }),

    // Submit PUTAWAY_M1 (RECEPTION → STOCKAGE)
    submitPUTAWAY_M1: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          fromBin: z.string(),
          toBin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("PUTAWAY_M1", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
        }
        // Zone validation: fromBin must be RECEPTION, toBin must be STOCKAGE/PICKING/RESERVE
        const zoneCheck = validatePutawayM1Zone(input.fromBin, input.toBin);
        if (!zoneCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_PUTAWAY", pointsDelta: -3, message: `PUTAWAY_M1: ${zoneCheck.reasonFr}` });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheck, ctx.req) });
          }
        }
        // Record movement: debit fromBin (REC-01 → 0), credit toBin (STOCKAGE)
        await addTransaction({ runId: input.runId, docType: "PUTAWAY_M1", moveType: "LT0A", sku: input.sku, bin: input.fromBin, qty: String(-input.qty), posted: true, docRef: input.docRef, comment: `Rangement sortie ${input.fromBin}` });
        await addTransaction({ runId: input.runId, docType: "PUTAWAY_M1", moveType: "LT0A", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: `Rangement ${input.fromBin} → ${input.toBin}${input.comment ? " | " + input.comment : ""}` });
        await markStepComplete(input.runId, "PUTAWAY_M1");
        await markStepComplete(input.runId, "STOCK");
        await addScoringEvent({ runId: input.runId, eventType: "PUTAWAY_M1_COMPLETED", pointsDelta: 5, message: `Rangement correct : ${input.fromBin} → ${input.toBin}` });
        const demoWarn = run.isDemo && (!validation.allowed || !zoneCheck.allowed)
          ? [!validation.allowed ? pickReason(validation, ctx.req) : null, !zoneCheck.allowed ? pickReason(zoneCheck, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning: demoWarn };
      }),

    // Submit SO
    submitSO: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("SO", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
        }
        await addTransaction({ runId: input.runId, docType: "SO", moveType: "VA01", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "SO");
        const ruleSO = getScoringRule("SO_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "SO_COMPLETED", pointsDelta: ruleSO!.points, message: ruleSO!.descriptionFr });
        return { success: true, demoWarning: run.isDemo && !validation.allowed ? pickReason(validation, ctx.req) : null };
      }),

    // Submit GI
    submitGI: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("GI", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
        }
        const stockCheck = canIssueStock(input.sku, input.bin, input.qty, state.inventory);
        if (!stockCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "NEGATIVE_STOCK_ATTEMPT", pointsDelta: -5, message: stockCheck.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(stockCheck, ctx.req) });
          }
          // Demo: allow negative stock with warning
        }
        // Zone validation: GI must use EXPEDITION bin
        const zoneCheckGI = validateGIZone(input.bin);
        if (!zoneCheckGI.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_GI", pointsDelta: -3, message: `GI: ${zoneCheckGI.reasonFr}` });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheckGI, ctx.req) });
          }
        }
        await addTransaction({ runId: input.runId, docType: "GI", moveType: "261", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "GI");
        const ruleGI = getScoringRule("GI_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "GI_COMPLETED", pointsDelta: ruleGI!.points, message: ruleGI!.descriptionFr });
        const demoWarning = run.isDemo && (!validation.allowed || !stockCheck.allowed || !zoneCheckGI.allowed)
          ? [!validation.allowed ? pickReason(validation, ctx.req) : null, !stockCheck.allowed ? pickReason(stockCheck, ctx.req) : null, !zoneCheckGI.allowed ? pickReason(zoneCheckGI, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning };
      }),

    // Submit PICKING_M1 (STOCKAGE → EXPEDITION)
    submitPICKING_M1: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          fromBin: z.string(),
          toBin: z.string(),
          qty: z.number().positive(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("PICKING_M1", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
        }
        // Zone validation: fromBin must be STOCKAGE/PICKING/RESERVE, toBin must be EXPEDITION
        const zoneCheck = validatePickingM1Zone(input.fromBin, input.toBin);
        if (!zoneCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_PICKING", pointsDelta: -3, message: `PICKING_M1: ${zoneCheck.reasonFr}` });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheck, ctx.req) });
          }
        }
        // Stock check: verify enough stock in fromBin
        const stockCheck = canIssueStock(input.sku, input.fromBin, input.qty, state.inventory);
        if (!stockCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "NEGATIVE_STOCK_ATTEMPT", pointsDelta: -5, message: stockCheck.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(stockCheck, ctx.req) });
          }
        }
        // Record movement: deduct from fromBin, add to toBin (EXPEDITION)
        await addTransaction({ runId: input.runId, docType: "PICKING", moveType: "VL01N", sku: input.sku, bin: input.fromBin, qty: String(-input.qty), posted: true, docRef: input.docRef, comment: `Prélèvement ${input.fromBin} → ${input.toBin}${input.comment ? " | " + input.comment : ""}` });
        await addTransaction({ runId: input.runId, docType: "PICKING_M1", moveType: "VL01N", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: `Prélèvement arrivée ${input.toBin}` });
        await markStepComplete(input.runId, "PICKING_M1");
        await addScoringEvent({ runId: input.runId, eventType: "PICKING_M1_COMPLETED", pointsDelta: 5, message: `Prélèvement correct : ${input.fromBin} → ${input.toBin}` });
        const demoWarn = run.isDemo && (!validation.allowed || !zoneCheck.allowed || !stockCheck.allowed)
          ? [!validation.allowed ? pickReason(validation, ctx.req) : null, !zoneCheck.allowed ? pickReason(zoneCheck, ctx.req) : null, !stockCheck.allowed ? pickReason(stockCheck, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning: demoWarn };
      }),

    // Submit ADJ
    submitADJ: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          qty: z.number(),
          docRef: z.string(),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await addTransaction({ runId: input.runId, docType: "ADJ", moveType: "701", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        // Fix 4: Auto-resolve all pending cycle count variances for this run after ADJ is posted
        await resolveAllCycleCountsByRun(input.runId);
        return { success: true };
      }),
  }),
  // ─── Cycle Counts ─────────────────────────────────────────────────────────────
  cycleCounts: router({
    list: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(({ input }) => getCycleCountsByRun(input.runId)),

    submit: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          bin: z.string(),
          physicalQty: z.number().min(0),
        })
      )
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const key = `${input.sku}::${input.bin}`;
        const systemQty = state.inventory[key] ?? 0;
        const variance = input.physicalQty - systemQty;
        await addCycleCount({
          runId: input.runId,
          sku: input.sku,
          bin: input.bin,
          systemQty: String(systemQty),
          physicalQty: String(input.physicalQty),
          variance: String(variance),
        });
        await markStepComplete(input.runId, "CC");
        const ruleCC = getScoringRule("CC_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "CC_COMPLETED", pointsDelta: ruleCC!.points, message: ruleCC!.descriptionFr });
        return { success: true, variance };
      }),

    resolve: protectedProcedure
      .input(z.object({ ccId: z.number(), runId: z.number() }))
      .mutation(async ({ input }) => {
        await resolveCycleCount(input.ccId);
        return { success: true };
      }),
  }),

  // ─── Compliance ──────────────────────────────────────────────────────────────
  compliance: router({
    check: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        const state = await buildRunState(input.runId);
        return checkCompliance(state);
      }),

    finalize: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const compliance = checkCompliance(state);

        if (!run.isDemo) {
          // Evaluation mode: hard block on non-compliance
          if (!compliance.compliant) {
            throw new TRPCError({ code: "BAD_REQUEST", message: compliance.issuesFr.join("; ") });
          }
          await markStepComplete(input.runId, "COMPLIANCE");
          const rule = getScoringRule("COMPLIANCE_OK");
          await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_OK", pointsDelta: rule!.points, message: rule!.descriptionFr });

          // Check for perfect run bonus
          const events = await getScoringEventsByRun(input.runId);
          const hasErrors = events.some((e) => e.pointsDelta < 0);
          if (!hasErrors) {
            const bonus = getScoringRule("PERFECT_RUN_BONUS");
            await addScoringEvent({ runId: input.runId, eventType: "PERFECT_RUN_BONUS", pointsDelta: bonus!.points, message: bonus!.descriptionFr });
          }
          await completeRun(input.runId);
        } else {
          // Demo mode: allow finalization with scoring (non-official)
          await markStepComplete(input.runId, "COMPLIANCE");
          const ruleCOMPL = getScoringRule("COMPLIANCE_OK");
          await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_OK", pointsDelta: ruleCOMPL!.points, message: ruleCOMPL!.descriptionFr });
          // Check for perfect run bonus in demo too
          const demoEvents = await getScoringEventsByRun(input.runId);
          const demoHasErrors = demoEvents.some((e) => e.pointsDelta < 0);
          if (!demoHasErrors) {
            const bonus = getScoringRule("PERFECT_RUN_BONUS");
            await addScoringEvent({ runId: input.runId, eventType: "PERFECT_RUN_BONUS", pointsDelta: bonus!.points, message: bonus!.descriptionFr });
          }
          await completeRun(input.runId);
        }
        return { success: true, isDemo: run.isDemo, demoWarning: run.isDemo && !compliance.compliant ? compliance.issuesFr.join("; ") : null };
      }),
  }),

  // ─── Scoring ─────────────────────────────────────────────────────────────────
  scoring: router({
    events: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(({ input }) => getScoringEventsByRun(input.runId)),
    total: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => {
        const run = await getRunById(input.runId);
        // Return score for both modes; caller uses isDemo flag to label it as non-official
        const events = await getScoringEventsByRun(input.runId);
        return { total: calculateTotalScore(events), events };
      }),
  }),

  // ─── Teacher Monitor ─────────────────────────────────────────────────────────
  // ─── Module 2: Warehouse Execution ──────────────────────────────────────────
  warehouse: router({
    /** Check if Module 2 is unlocked for the current user */
    checkAccess: protectedProcedure.query(async ({ ctx }) => {
      const passedIds = await getPassedModuleIds(ctx.user.id);
      const unlocked = isModuleUnlocked(1, passedIds);
      return { unlocked, passedModuleIds: passedIds };
    }),

    /** Get all bin capacities (for UI dropdowns) */
    binCapacities: protectedProcedure.query(() => getAllBinCapacities()),

    /** Get putaway records for a run */
    putawayList: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(({ input }) => getPutawayByRun(input.runId)),

    /** Submit a putaway operation */
    submitPutaway: protectedProcedure
      .input(
        z.object({
          runId: z.number(),
          sku: z.string(),
          fromBin: z.string(),
          toBin: z.string(),
          qty: z.number().positive(),
          lotNumber: z.string(),
          receivedAt: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Check Module 2 unlock for students
        if (ctx.user.role === "student") {
          const passedIds = await getPassedModuleIds(ctx.user.id);
          if (!isModuleUnlocked(1, passedIds)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Module 2 verrouillé — complétez le Module 1 d'abord" });
          }
        }

        const state = await buildRunState(input.runId);
        const allBinCaps = await getAllBinCapacities();
        const allBins = await getAllBins();

        const binCapacities: Record<string, number> = {};
        for (const bc of allBinCaps) binCapacities[bc.binCode] = bc.maxCapacity;
        for (const b of allBins) {
          if (!(b.binCode in binCapacities)) binCapacities[b.binCode] = b.maxCapacity ?? 500;
        }

        const binCurrentLoad = calculateBinLoad(
          state.transactions.map((t) => ({ docType: t.docType, bin: t.bin, qty: t.qty, posted: t.posted }))
        );

        const existingPutaway = await getPutawayByRun(input.runId);
        const existingLots = existingPutaway
          .filter((p) => p.sku === input.sku)
          .map((p) => ({ lotNumber: p.lotNumber ?? "", receivedAt: new Date(p.receivedAt), qty: p.qty }))
          .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

        const receivedAt = new Date(input.receivedAt);
        const validation = validatePutaway({
          sku: input.sku,
          fromBin: input.fromBin,
          toBin: input.toBin,
          qty: input.qty,
          binCapacities,
          binCurrentLoad,
          existingLots,
          lotNumber: input.lotNumber,
          receivedAt,
        });

        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({
              runId: input.runId,
              eventType: validation.penaltyEvent ?? "OUT_OF_SEQUENCE",
              pointsDelta: validation.penaltyPoints ?? -5,
              message: validation.reasonFr ?? "",
            });
            throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(validation, ctx.req) });
          }
          return { success: true, demoWarning: pickReason(validation, ctx.req) };
        }

        await addPutawayRecord({ runId: input.runId, sku: input.sku, fromBin: input.fromBin, toBin: input.toBin, qty: input.qty, lotNumber: input.lotNumber, receivedAt });
        await addTransaction({ runId: input.runId, docType: "PUTAWAY", moveType: "LT01", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: `PUT-${input.lotNumber}`, comment: `Rangement de ${input.fromBin} vers ${input.toBin}` });
        await markStepComplete(input.runId, "PUTAWAY");

        if (!run.isDemo) {
          await addScoringEvent({ runId: input.runId, eventType: "PUTAWAY_COMPLETED", pointsDelta: 15, message: "Rangement structuré validé (bin + capacité + FIFO)" });
        }
        return { success: true, demoWarning: null };
      }),

    /** Get module progress for current user */
    myProgress: protectedProcedure.query(({ ctx }) => getModuleProgressByUser(ctx.user.id)),

    /** Get all module progress (teacher view) */
    allModuleProgress: teacherProcedure.query(() => getAllModuleProgressForMonitor()),

    /** Record module pass/fail after scenario completion */
    recordModulePass: protectedProcedure
      .input(z.object({ moduleId: z.number(), score: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const passed = input.score >= 60;
        await upsertModuleProgress({ userId: ctx.user.id, moduleId: input.moduleId, passed, bestScore: input.score, completedAt: passed ? new Date() : undefined });
        return { passed };
      }),
  }),

  monitor: router({
    // Evaluation-only runs (for analytics, scoring, ranking)
    allRuns: teacherProcedure.query(async () => {
      const runs = await getAllRunsForMonitor();
      const enriched = await Promise.all(
        runs.map(async (r) => {
          const state = await buildRunState(r.run.id);
          const events = r.run.isDemo ? [] : await getScoringEventsByRun(r.run.id);
          const compliance = checkCompliance(state);
          return {
            ...r,
            progressPct: calculateProgressPctAllModules(state.completedSteps, r.scenario.moduleId),
            completedSteps: state.completedSteps,
            score: r.run.isDemo ? null : calculateTotalScore(events),
            compliant: compliance.compliant,
          };
        })
      );
      // Separate evaluation vs demo for teacher view
      return enriched;
    }),

    // ─── Power BI-style analytics aggregation ─────────────────────────────
    powerAnalytics: teacherProcedure.query(async () => {
      const allRuns = await getAllRunsForMonitor();
      const evalRuns = allRuns.filter((r) => !r.run.isDemo);
      const demoRuns = allRuns.filter((r) => r.run.isDemo);

      // ── Per-run enrichment ──────────────────────────────────────────────
      const enriched = await Promise.all(
        allRuns.map(async (r) => {
          const state = await buildRunState(r.run.id);
          const events = await getScoringEventsByRun(r.run.id);
          const compliance = checkCompliance(state);
          const score = r.run.isDemo ? null : calculateTotalScore(events);
          const penalties = events.filter(e => e.pointsDelta < 0);
          const penaltyByType: Record<string, number> = {};
          for (const p of penalties) {
            penaltyByType[p.eventType] = (penaltyByType[p.eventType] ?? 0) + 1;
          }
          // Per-step completion for heatmap
          const stepStatus: Record<string, boolean> = {};
          for (const s of MODULE1_STEPS) {
            stepStatus[s.code] = state.completedSteps.includes(s.code);
          }
          return {
            runId: r.run.id,
            userId: r.run.userId,
            userName: r.user.name ?? `User#${r.run.userId}`,
            scenarioId: r.run.scenarioId,
            scenarioName: r.scenario.name,
            moduleId: r.scenario.moduleId,
            isDemo: r.run.isDemo,
            status: r.run.status,
            score,
            progressPct: calculateProgressPctAllModules(state.completedSteps, r.scenario.moduleId),
            completedSteps: state.completedSteps,
            stepStatus,
            compliant: compliance.compliant,
            penaltyCount: penalties.length,
            penaltyByType,
            startedAt: r.run.startedAt,
            completedAt: r.run.completedAt,
          };
        })
      );

      const evalEnriched = enriched.filter(r => !r.isDemo);

      // ── Global KPIs ─────────────────────────────────────────────────────
      const totalStudents = new Set(evalEnriched.map(r => r.userId)).size;
      const totalRuns = evalEnriched.length;
      const completedRuns = evalEnriched.filter(r => r.status === "completed").length;
      const completionRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;
      const scoresOnly = evalEnriched.filter(r => r.score !== null).map(r => r.score as number);
      const avgScore = scoresOnly.length > 0 ? Math.round(scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length) : 0;
      const passRate = scoresOnly.length > 0 ? Math.round((scoresOnly.filter(s => s >= 60).length / scoresOnly.length) * 100) : 0;
      const complianceRate = evalEnriched.length > 0 ? Math.round((evalEnriched.filter(r => r.compliant).length / evalEnriched.length) * 100) : 0;
      const avgProgress = evalEnriched.length > 0 ? Math.round(evalEnriched.reduce((a, r) => a + r.progressPct, 0) / evalEnriched.length) : 0;

      // ── Student ranking ─────────────────────────────────────────────────
      const byStudent = new Map<number, { userId: number; userName: string; runs: typeof evalEnriched }>();
      for (const r of evalEnriched) {
        if (!byStudent.has(r.userId)) byStudent.set(r.userId, { userId: r.userId, userName: r.userName, runs: [] });
        byStudent.get(r.userId)!.runs.push(r);
      }
      const studentRanking = Array.from(byStudent.values()).map(s => {
        const scores = s.runs.filter(r => r.score !== null).map(r => r.score as number);
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const avgStudentScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const totalCompleted = s.runs.filter(r => r.status === "completed").length;
        const totalPenalties = s.runs.reduce((a, r) => a + r.penaltyCount, 0);
        const avgProgress = s.runs.length > 0 ? Math.round(s.runs.reduce((a, r) => a + r.progressPct, 0) / s.runs.length) : 0;
        return { userId: s.userId, userName: s.userName, bestScore, avgScore: avgStudentScore, totalRuns: s.runs.length, totalCompleted, totalPenalties, avgProgress };
      }).sort((a, b) => b.bestScore - a.bestScore);

      // ── Step completion rates (for heatmap / bar chart) ──────────────────
      const stepCodes = MODULE1_STEPS.map(s => s.code);
      const stepCompletionRates = stepCodes.map(code => {
        const runsForStep = evalEnriched.filter(r => r.progressPct > 0);
        const completedCount = runsForStep.filter(r => r.stepStatus[code]).length;
        const rate = runsForStep.length > 0 ? Math.round((completedCount / runsForStep.length) * 100) : 0;
        const label = MODULE1_STEPS.find(s => s.code === code)?.labelFr ?? code;
        return { code, label, completionRate: rate, completedCount, totalRuns: runsForStep.length };
      });

      // ── Error frequency by type ──────────────────────────────────────────
      const errorFrequency: Record<string, number> = {};
      for (const r of evalEnriched) {
        for (const [type, count] of Object.entries(r.penaltyByType)) {
          errorFrequency[type] = (errorFrequency[type] ?? 0) + count;
        }
      }
      const errorFrequencyArr = Object.entries(errorFrequency)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // ── Score distribution buckets ───────────────────────────────────────
      const scoreBuckets = [
        { label: "0-20", min: 0, max: 20, count: 0 },
        { label: "21-40", min: 21, max: 40, count: 0 },
        { label: "41-60", min: 41, max: 60, count: 0 },
        { label: "61-80", min: 61, max: 80, count: 0 },
        { label: "81-100", min: 81, max: 100, count: 0 },
      ];
      for (const s of scoresOnly) {
        const bucket = scoreBuckets.find(b => s >= b.min && s <= b.max);
        if (bucket) bucket.count++;
      }

      // ── Timeline: avg score per day ──────────────────────────────────────
      const byDay = new Map<string, number[]>();
      for (const r of evalEnriched) {
        if (r.score === null || !r.startedAt) continue;
        const day = new Date(r.startedAt).toISOString().split("T")[0];
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(r.score);
      }
      const scoreTimeline = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, scores]) => ({
          date,
          avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          count: scores.length,
        }));

      // ── Per-student heatmap data ─────────────────────────────────────────
      const heatmapData = studentRanking.map(s => {
        const studentRuns = evalEnriched.filter(r => r.userId === s.userId);
        const stepCompletion: Record<string, number> = {};
        for (const code of stepCodes) {
          const completedInAnyRun = studentRuns.some(r => r.stepStatus[code]);
          stepCompletion[code] = completedInAnyRun ? 1 : 0;
        }
        return { userName: s.userName, userId: s.userId, ...stepCompletion };
      });

      // ── Module distribution ──────────────────────────────────────────────
      const moduleDistribution = [1, 2, 3, 4, 5].map(moduleId => {
        const moduleRuns = enriched.filter(r => r.moduleId === moduleId);
        const evalModuleRuns = moduleRuns.filter(r => !r.isDemo);
        const demoModuleRuns = moduleRuns.filter(r => r.isDemo);
        return { moduleId, label: `M${moduleId}`, evalCount: evalModuleRuns.length, demoCount: demoModuleRuns.length };
      });

      // ── Radar: class average per step ────────────────────────────────────
      const radarData = stepCompletionRates.map(s => ({
        step: s.code,
        label: s.code,
        value: s.completionRate,
      }));

      return {
        kpis: { totalStudents, totalRuns, completedRuns, completionRate, avgScore, passRate, complianceRate, avgProgress, demoCount: demoRuns.length },
        studentRanking,
        stepCompletionRates,
        errorFrequency: errorFrequencyArr,
        scoreBuckets,
        scoreTimeline,
        heatmapData,
        moduleDistribution,
        radarData,
        recentRuns: enriched.slice(-10).reverse(),
      };
    }),

    // Evaluation-only analytics (excludes demo sessions)
    // ─── Student score evolution across multiple attempts ──────────────────
    studentScoreEvolution: teacherProcedure
      .input(z.object({
        userId: z.number().optional(),   // undefined = all students
        scenarioId: z.number().optional(), // undefined = all scenarios
      }))
      .query(async ({ input }) => {
        const allRuns = await getAllRunsForMonitor();
        const evalRuns = allRuns.filter((r) => !r.run.isDemo);

        // Build unique student list
        const studentMap = new Map<number, string>();
        for (const r of evalRuns) {
          studentMap.set(r.run.userId, r.user.name ?? `User#${r.run.userId}`);
        }
        const students = Array.from(studentMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Build unique scenario list
        const scenarioMap = new Map<number, string>();
        for (const r of evalRuns) {
          scenarioMap.set(r.run.scenarioId, r.scenario.name);
        }
        const scenarioList = Array.from(scenarioMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Filter runs by selected student/scenario
        let filtered = evalRuns;
        if (input.userId) filtered = filtered.filter(r => r.run.userId === input.userId);
        if (input.scenarioId) filtered = filtered.filter(r => r.run.scenarioId === input.scenarioId);

        // Sort by startedAt ascending
        filtered = [...filtered].sort((a, b) =>
          new Date(a.run.startedAt).getTime() - new Date(b.run.startedAt).getTime()
        );

        // Enrich each run with score + penalties
        const enriched = await Promise.all(
          filtered.map(async (r, idx) => {
            const events = await getScoringEventsByRun(r.run.id);
            const score = calculateTotalScore(events);
            const penalties = events.filter(e => e.pointsDelta < 0).length;
            const bonuses  = events.filter(e => e.pointsDelta > 0).length;
            return {
              attempt: idx + 1,
              runId: r.run.id,
              userId: r.run.userId,
              userName: r.user.name ?? `User#${r.run.userId}`,
              scenarioId: r.run.scenarioId,
              scenarioName: r.scenario.name,
              score,
              penalties,
              bonuses,
              status: r.run.status,
              startedAt: r.run.startedAt,
              completedAt: r.run.completedAt,
            };
          })
        );

        // If viewing all students on same scenario, group by student for multi-line chart
        const byStudent = new Map<number, typeof enriched>();
        for (const e of enriched) {
          if (!byStudent.has(e.userId)) byStudent.set(e.userId, []);
          byStudent.get(e.userId)!.push(e);
        }
        // Re-number attempts per student
        const lines = Array.from(byStudent.entries()).map(([userId, runs]) => ({
          userId,
          userName: runs[0].userName,
          attempts: runs.map((r, i) => ({ ...r, attempt: i + 1 })),
        }));

        return { students, scenarioList, lines, totalAttempts: enriched.length };
      }),

    analytics: teacherProcedure.query(async () => {
      const runs = await getAllRunsForMonitor();
      const evalRuns = runs.filter((r) => !r.run.isDemo);
      const enriched = await Promise.all(
        evalRuns.map(async (r) => {
          const state = await buildRunState(r.run.id);
          const events = await getScoringEventsByRun(r.run.id);
          const compliance = checkCompliance(state);
          return {
            ...r,
            progressPct: calculateProgressPctAllModules(state.completedSteps, r.scenario.moduleId),
            completedSteps: state.completedSteps,
            score: calculateTotalScore(events),
            compliant: compliance.compliant,
          };
        })
      );
      return enriched;
    }),
  }),

  // ─── Module 2: Advanced Warehouse Operations ───────────────────────────────
  m2: router({
    /** M2 Step 1: GR (no PO prerequisite for M2) */
    submitGR: protectedProcedure
      .input(z.object({
        runId: z.number(),
        sku: z.string(),
        bin: z.string(),
        qty: z.number().positive(),
        docRef: z.string(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM2("GR" as any, state);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          if (!run.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        const zoneCheck = validateGRZone(input.bin);
        if (!zoneCheck.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_GR", pointsDelta: -3, message: `GR M2: ${zoneCheck.reasonFr}` });
          if (!run.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheck, ctx.req) });
        }
        await addTransaction({ runId: input.runId, docType: "GR", moveType: "101", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "GR");
        const rule = getScoringRule("GR_COMPLETED");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "GR_COMPLETED", pointsDelta: rule!.points, message: rule!.descriptionFr });
        const demoWarn = run.isDemo && (!check.allowed || !zoneCheck.allowed)
          ? [!check.allowed ? pickReason(check, ctx.req) : null, !zoneCheck.allowed ? pickReason(zoneCheck, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning: demoWarn };
      }),
    /** M2 Step 2: PUTAWAY (RECEPTION → STOCKAGE, no PO prerequisite) */
    submitPUTAWAY: protectedProcedure
      .input(z.object({
        runId: z.number(),
        sku: z.string(),
        fromBin: z.string(),
        toBin: z.string(),
        qty: z.number().positive(),
        docRef: z.string(),
        lotNumber: z.string().optional(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM2("PUTAWAY" as any, state);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          if (!run.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        const zoneCheck = validatePutawayM1Zone(input.fromBin, input.toBin);
        if (!zoneCheck.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "WRONG_ZONE_PUTAWAY", pointsDelta: -3, message: `PUTAWAY M2: ${zoneCheck.reasonFr}` });
          if (!run.isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(zoneCheck, ctx.req) });
        }
        await addTransaction({ runId: input.runId, docType: "PUTAWAY", moveType: "LT0A", sku: input.sku, bin: input.fromBin, qty: String(-input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await addTransaction({ runId: input.runId, docType: "PUTAWAY", moveType: "LT0A", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        const lotNum = input.lotNumber || `LOT-${Date.now()}`;
        await addPutawayRecord({ runId: input.runId, sku: input.sku, fromBin: input.fromBin, toBin: input.toBin, qty: input.qty, lotNumber: lotNum, receivedAt: new Date() });
        await markStepComplete(input.runId, "PUTAWAY");
        const rule = getScoringRule("PUTAWAY_COMPLETED");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "PUTAWAY_COMPLETED", pointsDelta: rule!.points, message: rule!.descriptionFr });
        const demoWarn = run.isDemo && (!check.allowed || !zoneCheck.allowed)
          ? [!check.allowed ? pickReason(check, ctx.req) : null, !zoneCheck.allowed ? pickReason(zoneCheck, ctx.req) : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning: demoWarn };
      }),
    /** M2 Step 3: FIFO Pick */
    submitFifoPick: protectedProcedure
      .input(z.object({
        runId: z.number(),
        sku: z.string(),
        fromBin: z.string(),
        toBin: z.string(),
        qty: z.number().positive(),
        lotNumber: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM2("FIFO_PICK" as any, state);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        // FIFO validation: lotNumber must be the oldest lot in fromBin
        const putawayList = await getPutawayByRun(input.runId);
        const lotsInBin = putawayList
          .filter((p) => p.sku === input.sku && p.toBin === input.fromBin)
          .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
        const oldestLot = lotsInBin[0]?.lotNumber;
        if (oldestLot && oldestLot !== input.lotNumber) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "FIFO_VIOLATION", pointsDelta: -10, message: `FIFO violation: lot ${input.lotNumber} prélevé avant lot ${oldestLot}` });
            throw new TRPCError({ code: "BAD_REQUEST", message: `Violation FIFO : le lot ${oldestLot} doit être prélevé en premier (plus ancien)` });
          }
        }
        await addTransaction({ runId: input.runId, docType: "PICKING", moveType: "LT0A", sku: input.sku, bin: input.fromBin, qty: String(-input.qty), posted: true, docRef: `FIFO-${input.lotNumber}`, comment: `Prélèvement FIFO de ${input.fromBin} vers ${input.toBin}` });
        await addTransaction({ runId: input.runId, docType: "PICKING_M1", moveType: "LT0A", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: `FIFO-${input.lotNumber}`, comment: `Arrivée FIFO en ${input.toBin}` });
        await markStepComplete(input.runId, "FIFO_PICK");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "FIFO_PICK_COMPLETED", pointsDelta: 15, message: "Prélèvement FIFO validé" });
        return { success: true };
      }),

    /** M2 Step 4: Stock Accuracy */
    submitStockAccuracy: protectedProcedure
      .input(z.object({
        runId: z.number(),
        sku: z.string(),
        systemQty: z.number(),
        countedQty: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM2("STOCK_ACCURACY" as any, state);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        const variance = input.countedQty - input.systemQty;
        await addInventoryCount({ runId: input.runId, sku: input.sku, systemQty: input.systemQty, countedQty: input.countedQty, varianceQty: variance });
        await markStepComplete(input.runId, "STOCK_ACCURACY");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "STOCK_ACCURACY_COMPLETED", pointsDelta: variance === 0 ? 15 : 10, message: `Précision inventaire: variance ${variance >= 0 ? "+" : ""}${variance}` });
        return { success: true, variance };
      }),

    /** M2 Step 5: Compliance Advanced */
    submitComplianceAdv: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM2("COMPLIANCE_ADV" as any, state);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        await markStepComplete(input.runId, "COMPLIANCE_ADV");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_ADV_COMPLETED", pointsDelta: 20, message: "Conformité avancée M2 validée" });
        await completeRun(input.runId);
        return { success: true };
      }),
  }),

  // ─── Module 3: Cycle Count & Replenishment ─────────────────────────────────
  m3: router({
    /** M3 Step 1: CC_LIST — generate count list */
    submitCcList: protectedProcedure
      .input(z.object({ runId: z.number(), skus: z.array(z.string()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM3("CC_LIST" as any, state.completedSteps as any);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        await markStepComplete(input.runId, "CC_LIST");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "CC_LIST_COMPLETED", pointsDelta: 10, message: `Liste de comptage générée pour ${input.skus.length} SKU(s)` });
        return { success: true, skus: input.skus };
      }),

    /** M3 Step 2: CC_COUNT — enter physical counts */
    submitCcCount: protectedProcedure
      .input(z.object({
        runId: z.number(),
        counts: z.array(z.object({
          sku: z.string(),
          bin: z.string(),
          systemQty: z.number(),
          countedQty: z.number(),
        })).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM3("CC_COUNT" as any, state.completedSteps as any);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        for (const c of input.counts) {
          const variance = c.countedQty - c.systemQty;
          await addInventoryCount({ runId: input.runId, sku: c.sku, systemQty: c.systemQty, countedQty: c.countedQty, varianceQty: variance });
        }
        await markStepComplete(input.runId, "CC_COUNT");
        const totalVariance = input.counts.reduce((s, c) => s + Math.abs(c.countedQty - c.systemQty), 0);
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "CC_COUNT_COMPLETED", pointsDelta: totalVariance === 0 ? 20 : 15, message: `Comptage physique: variance totale ${totalVariance}` });
        return { success: true, totalVariance };
      }),

    /** M3 Step 3: CC_RECON — reconcile & adjust */
    submitCcRecon: protectedProcedure
      .input(z.object({
        runId: z.number(),
        adjustments: z.array(z.object({
          sku: z.string(),
          bin: z.string(),
          varianceQty: z.number(),
          justification: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM3("CC_RECON" as any, state.completedSteps as any);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        for (const adj of input.adjustments) {
          if (adj.varianceQty !== 0) {
            await addInventoryAdjustment({ runId: input.runId, sku: adj.sku, varianceQty: adj.varianceQty, adjustmentQty: adj.varianceQty, reason: adj.justification });
            await addTransaction({ runId: input.runId, docType: "ADJ", moveType: "MI07", sku: adj.sku, bin: adj.bin, qty: String(adj.varianceQty), posted: true, docRef: `ADJ-${adj.sku}`, comment: adj.justification });
          }
        }
        await markStepComplete(input.runId, "CC_RECON");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "CC_RECON_COMPLETED", pointsDelta: 15, message: "Réconciliation et ajustements validés" });
        const adjustmentsApplied = input.adjustments.filter((a: any) => a.varianceQty !== 0).length; return { success: true, adjustmentsApplied };
      }),

    /** M3 Step 4: REPLENISH \u2014 replenishment suggestion */
    submitReplenish: protectedProcedure
      .input(z.object({
        runId: z.number(),
        sku: z.string(),
        systemQty: z.number(),
        minQty: z.number(),
        maxQty: z.number(),
        safetyStock: z.number(),
        studentQty: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM3("REPLENISH" as any, state.completedSteps as any);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        const suggestion = computeReplenishmentSuggestion({ sku: input.sku, systemQty: input.systemQty, minQty: input.minQty, maxQty: input.maxQty, safetyStock: input.safetyStock });
        const diff = Math.abs(input.studentQty - suggestion.suggestedQty);
        const points = diff === 0 ? 20 : diff <= 10 ? 15 : diff <= 25 ? 10 : 5;
        await addReplenishmentSuggestion({ runId: input.runId, sku: input.sku, systemQty: input.systemQty, suggestedQty: suggestion.suggestedQty, reason: suggestion.reason });
        await markStepComplete(input.runId, "REPLENISH");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "REPLENISH_COMPLETED", pointsDelta: points, message: `R\u00e9approvisionnement: sugg\u00e9r\u00e9 ${suggestion.suggestedQty}, \u00e9tudiant ${input.studentQty}` });
        return { success: true, suggestion, diff, studentQty: input.studentQty };
      }),

    /** M3 Step 5: COMPLIANCE_M3 */
    submitComplianceM3: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const state = await buildRunState(input.runId);
        const check = canExecuteStepM3("COMPLIANCE_M3" as any, state.completedSteps as any);
        if (!check.allowed) {
          if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: check.reasonFr ?? "" });
          throw new TRPCError({ code: "BAD_REQUEST", message: pickReason(check, ctx.req) });
        }
        await markStepComplete(input.runId, "COMPLIANCE_M3");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_M3_COMPLETED", pointsDelta: 15, message: "Conformité Module 3 validée" });
        await completeRun(input.runId);
        return { success: true };
      }),
  }),

  // ─── Module 4: KPI Step Markers ────────────────────────────────────────────
  m4: router({
    /** M4 Step 1: KPI_DATA — acknowledge data entry */
    submitKpiData: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await markStepComplete(input.runId, "KPI_DATA");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "KPI_DATA_COMPLETED", pointsDelta: 10, message: "Données KPI saisies" });
        return { success: true };
      }),

    /** M4 Step 2: KPI_ROTATION — rotation rate interpretation */
    submitKpiRotation: protectedProcedure
      .input(z.object({ runId: z.number(), studentAnswer: z.string().min(1), kpiData: z.object({ annualConsumption: z.number(), averageStock: z.number(), ordersFulfilled: z.number(), totalOrders: z.number(), operationalErrors: z.number(), totalOperations: z.number(), avgLeadTimeDays: z.number(), stockValue: z.number() }).optional() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const kpiData: KpiData = input.kpiData ?? { annualConsumption: 2400, averageStock: 400, ordersFulfilled: 285, totalOrders: 300, operationalErrors: 12, totalOperations: 300, avgLeadTimeDays: 3.5, stockValue: 48000 };
        const kpiResult = calculateKpis(kpiData);
        const result = scoreKpiInterpretation("rotationRate", input.studentAnswer, kpiResult);
        await addKpiInterpretation({ runId: input.runId, kpiKey: "rotationRate", studentAnswer: input.studentAnswer, isCorrect: result.isCorrect, pointsDelta: result.pointsDelta, feedback: result.feedback });
        await markStepComplete(input.runId, "KPI_ROTATION");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "KPI_ROTATION_COMPLETED", pointsDelta: result.pointsDelta, message: `Taux de rotation: ${result.isCorrect ? "correct" : "incorrect"}` });
        return result;
      }),

    /** M4 Step 3: KPI_SERVICE — service level interpretation */
    submitKpiService: protectedProcedure
      .input(z.object({ runId: z.number(), studentAnswer: z.string().min(1), kpiData: z.object({ annualConsumption: z.number(), averageStock: z.number(), ordersFulfilled: z.number(), totalOrders: z.number(), operationalErrors: z.number(), totalOperations: z.number(), avgLeadTimeDays: z.number(), stockValue: z.number() }).optional() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const kpiData: KpiData = input.kpiData ?? { annualConsumption: 2400, averageStock: 400, ordersFulfilled: 285, totalOrders: 300, operationalErrors: 12, totalOperations: 300, avgLeadTimeDays: 3.5, stockValue: 48000 };
        const kpiResult = calculateKpis(kpiData);
        const result = scoreKpiInterpretation("serviceLevel", input.studentAnswer, kpiResult);
        await addKpiInterpretation({ runId: input.runId, kpiKey: "serviceLevel", studentAnswer: input.studentAnswer, isCorrect: result.isCorrect, pointsDelta: result.pointsDelta, feedback: result.feedback });
        await markStepComplete(input.runId, "KPI_SERVICE");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "KPI_SERVICE_COMPLETED", pointsDelta: result.pointsDelta, message: `Taux de service: ${result.isCorrect ? "correct" : "incorrect"}` });
        return result;
      }),

    /** M4 Step 4: KPI_DIAGNOSTIC — error rate interpretation */
    submitKpiDiagnostic: protectedProcedure
      .input(z.object({ runId: z.number(), studentAnswer: z.string().min(1), kpiData: z.object({ annualConsumption: z.number(), averageStock: z.number(), ordersFulfilled: z.number(), totalOrders: z.number(), operationalErrors: z.number(), totalOperations: z.number(), avgLeadTimeDays: z.number(), stockValue: z.number() }).optional() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const kpiData: KpiData = input.kpiData ?? { annualConsumption: 2400, averageStock: 400, ordersFulfilled: 285, totalOrders: 300, operationalErrors: 12, totalOperations: 300, avgLeadTimeDays: 3.5, stockValue: 48000 };
        const kpiResult = calculateKpis(kpiData);
        const result = scoreKpiInterpretation("diagnostic", input.studentAnswer, kpiResult);
        await addKpiInterpretation({ runId: input.runId, kpiKey: "diagnostic", studentAnswer: input.studentAnswer, isCorrect: result.isCorrect, pointsDelta: result.pointsDelta, feedback: result.feedback });
        await markStepComplete(input.runId, "KPI_DIAGNOSTIC");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "KPI_DIAGNOSTIC_COMPLETED", pointsDelta: result.pointsDelta, message: `Diagnostic: ${result.isCorrect ? "correct" : "incorrect"}` });
        return result;
      }),

    /** M4 Step 5: COMPLIANCE_M4 */
    submitComplianceM4: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await markStepComplete(input.runId, "COMPLIANCE_M4");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_M4_COMPLETED", pointsDelta: 15, message: "Conformité Module 4 validée" });
        await completeRun(input.runId);
        return { success: true };
      }),
  }),

  // ─── Module 5: Integrated Simulation ──────────────────────────────────────
  m5: router({
    /** M5 Step 1: M5_RECEPTION */
    submitReception: protectedProcedure
      .input(z.object({ runId: z.number(), sku: z.string(), qty: z.number().positive(), docRef: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await addTransaction({ runId: input.runId, docType: "GR", moveType: "MIGO", sku: input.sku, bin: "REC-01", qty: String(input.qty), posted: true, docRef: input.docRef, comment: "M5 Réception fournisseur" });
        await markStepComplete(input.runId, "M5_RECEPTION");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_RECEPTION_COMPLETED", pointsDelta: 10, message: "Réception M5 validée" });
        return { success: true };
      }),

    /** M5 Step 2: M5_PUTAWAY */
    submitPutaway: protectedProcedure
      .input(z.object({ runId: z.number(), sku: z.string(), fromBin: z.string(), toBin: z.string(), qty: z.number().positive(), lotNumber: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await addTransaction({ runId: input.runId, docType: "PUTAWAY", moveType: "LT01", sku: input.sku, bin: input.toBin, qty: String(input.qty), posted: true, docRef: `PUT-${input.lotNumber}`, comment: `M5 Rangement ${input.fromBin}→${input.toBin}` });
        await addPutawayRecord({ runId: input.runId, sku: input.sku, fromBin: input.fromBin, toBin: input.toBin, qty: input.qty, lotNumber: input.lotNumber, receivedAt: new Date() });
        await markStepComplete(input.runId, "M5_PUTAWAY");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_PUTAWAY_COMPLETED", pointsDelta: 10, message: "Rangement M5 validé" });
        return { success: true };
      }),

    /** M5 Step 3: M5_CYCLE_COUNT */
    submitCycleCount: protectedProcedure
      .input(z.object({ runId: z.number(), sku: z.string(), bin: z.string(), systemQty: z.number(), countedQty: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const variance = input.countedQty - input.systemQty;
        await addInventoryCount({ runId: input.runId, sku: input.sku, systemQty: input.systemQty, countedQty: input.countedQty, varianceQty: variance });
        await markStepComplete(input.runId, "M5_CYCLE_COUNT");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_CYCLE_COUNT_COMPLETED", pointsDelta: variance === 0 ? 15 : 10, message: `M5 Inventaire: variance ${variance}` });
        return { success: true, variance };
      }),

    /** M5 Step 4: M5_REPLENISH */
    submitReplenish: protectedProcedure
      .input(z.object({ runId: z.number(), sku: z.string(), systemQty: z.number(), minQty: z.number(), maxQty: z.number(), safetyStock: z.number(), studentQty: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const suggestion = computeReplenishmentSuggestion({ sku: input.sku, systemQty: input.systemQty, minQty: input.minQty, maxQty: input.maxQty, safetyStock: input.safetyStock });
        const diff = Math.abs(input.studentQty - suggestion.suggestedQty);
        const points = diff === 0 ? 15 : diff <= 10 ? 10 : 5;
        await addReplenishmentSuggestion({ runId: input.runId, sku: input.sku, systemQty: input.systemQty, suggestedQty: suggestion.suggestedQty, reason: suggestion.reason });
        await markStepComplete(input.runId, "M5_REPLENISH");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_REPLENISH_COMPLETED", pointsDelta: points, message: `M5 Réappro: suggéré ${suggestion.suggestedQty}, étudiant ${input.studentQty}` });
        return { success: true, suggestion, diff, studentQty: input.studentQty };
      }),

    /** M5 Step 5: M5_KPI */
    submitKpi: protectedProcedure
      .input(z.object({ runId: z.number(), kpiData: z.object({ annualConsumption: z.number(), averageStock: z.number(), ordersFulfilled: z.number(), totalOrders: z.number(), operationalErrors: z.number(), totalOperations: z.number(), avgLeadTimeDays: z.number(), stockValue: z.number() }) }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const kpiResult = calculateKpis(input.kpiData);
        await addKpiSnapshot({ runId: input.runId, rotationRate: kpiResult.rotationRate, serviceLevel: kpiResult.serviceLevel, errorRate: kpiResult.errorRate, averageLeadTime: kpiResult.averageLeadTime, stockImmobilizedValue: kpiResult.stockImmobilizedValue });
        await markStepComplete(input.runId, "M5_KPI");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_KPI_COMPLETED", pointsDelta: 10, message: "KPI M5 calculés" });
        return { success: true, kpiResult };
      }),

    /** M5 Step 6: M5_DECISION — strategic decision */
    submitDecision: protectedProcedure
      .input(z.object({ runId: z.number(), studentDecision: z.string().min(10), kpiData: z.object({ annualConsumption: z.number(), averageStock: z.number(), ordersFulfilled: z.number(), totalOrders: z.number(), operationalErrors: z.number(), totalOperations: z.number(), avgLeadTimeDays: z.number(), stockValue: z.number() }).optional() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const kpiData: KpiData = input.kpiData ?? { annualConsumption: 2400, averageStock: 400, ordersFulfilled: 285, totalOrders: 300, operationalErrors: 12, totalOperations: 300, avgLeadTimeDays: 3.5, stockValue: 48000 };
        const kpiResult = calculateKpis(kpiData);
        const result = scoreM5Decision(input.studentDecision, kpiResult);
        await markStepComplete(input.runId, "M5_DECISION");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "M5_DECISION_COMPLETED", pointsDelta: result.score, message: `Décision stratégique: ${result.score}/30 pts` });
        return { success: true, ...result };
      }),

    /** M5 Step 7: COMPLIANCE_M5 */
    submitComplianceM5: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        if (run.userId !== ctx.user.id && ctx.user.role !== "teacher" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await markStepComplete(input.runId, "COMPLIANCE_M5");
        if (!run.isDemo) await addScoringEvent({ runId: input.runId, eventType: "COMPLIANCE_M5_COMPLETED", pointsDelta: 20, message: "Validation finale M5 complétée" });
        await completeRun(input.runId);
        return { success: true };
      }),
  }),

  // ── QUIZ ROUTER ─────────────────────────────────────────────────────────────
  quiz: router({
    /** Get quiz for a module (correctIndex hidden from student) */
    getByModule: protectedProcedure
      .input(z.object({ moduleId: z.number() }))
      .query(async ({ input }) => {
        const quiz = await getQuizByModule(input.moduleId);
        if (!quiz) return null;
        const full = await getQuizWithQuestions(quiz.id);
        if (!full) return null;
        return {
          id: full.id,
          moduleId: full.moduleId,
          titleFr: full.titleFr,
          titleEn: full.titleEn,
          passingScore: full.passingScore,
          questions: full.questions.map(q => ({
            id: q.id,
            questionFr: q.questionFr,
            questionEn: q.questionEn,
            optionsFr: (typeof q.optionsFr === 'string' ? JSON.parse(q.optionsFr) : q.optionsFr) as string[],
            optionsEn: (typeof q.optionsEn === 'string' ? JSON.parse(q.optionsEn) : q.optionsEn) as string[],
            difficulty: q.difficulty,
            orderIndex: q.orderIndex,
          })),
        };
      }),

    /** Get best quiz attempt for current user + module */
    getBestAttempt: protectedProcedure
      .input(z.object({ moduleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const attempt = await getBestQuizAttempt(ctx.user.id, input.moduleId);
        return attempt ?? null;
      }),

    /** Get all attempts for current user + module */
    getAttempts: protectedProcedure
      .input(z.object({ moduleId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getQuizAttemptsByUser(ctx.user.id, input.moduleId);
      }),

    /** Submit quiz answers — returns score, passed, and per-question feedback */
    submit: protectedProcedure
      .input(z.object({
        moduleId: z.number(),
        answers: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const quiz = await getQuizByModule(input.moduleId);
        if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz non trouvé pour ce module" });
        const full = await getQuizWithQuestions(quiz.id);
        if (!full) throw new TRPCError({ code: "NOT_FOUND" });
        const questions = full.questions;
        if (input.answers.length !== questions.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Expected ${questions.length} answers, got ${input.answers.length}` });
        }
        let correct = 0;
        const feedback = questions.map((q, i) => {
          const isCorrect = input.answers[i] === q.correctIndex;
          if (isCorrect) correct++;
          return {
            questionId: q.id,
            chosen: input.answers[i],
            correctIndex: q.correctIndex,
            isCorrect,
            explanationFr: q.explanationFr,
            explanationEn: q.explanationEn,
          };
        });
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= quiz.passingScore;
        await saveQuizAttempt({
          userId: ctx.user.id,
          quizId: quiz.id,
          moduleId: input.moduleId,
          answers: input.answers,
          score,
          passed,
        });
        return { score, passed, correct, total: questions.length, passingScore: quiz.passingScore, feedback };
      }),

    /** Check a single answer for immediate feedback (does NOT save to DB) */
    checkAnswer: protectedProcedure
      .input(z.object({
        moduleId: z.number(),
        questionIndex: z.number(),
        chosenIndex: z.number(),
      }))
      .mutation(async ({ input }) => {
        const quiz = await getQuizByModule(input.moduleId);
        if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz non trouvé" });
        const full = await getQuizWithQuestions(quiz.id);
        if (!full) throw new TRPCError({ code: "NOT_FOUND" });
        const q = full.questions[input.questionIndex];
        if (!q) throw new TRPCError({ code: "BAD_REQUEST", message: "Question introuvable" });
        const isCorrect = input.chosenIndex === q.correctIndex;
        return {
          isCorrect,
          correctIndex: q.correctIndex,
          explanationFr: q.explanationFr,
          explanationEn: q.explanationEn,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
