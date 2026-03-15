import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
} from "./db";
import {
  calculateBinLoad,
  calculateInventory,
  calculateProgressPct,
  canExecuteStep,
  canIssueStock,
  checkCompliance,
  getNextRequiredStep,
  isModuleUnlocked,
  MODULE1_STEPS,
  MODULE2_STEPS,
  validatePutaway,
  calculateKpis,
  scoreKpiInterpretation,
  type KpiData,
} from "./rulesEngine";
import { calculateTotalScore, getScoringRule, getScoreLabel } from "./scoringEngine";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

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
  }),

  // ─── Master Data ───────────────────────────────────────────────────────────
  master: router({
    skus: protectedProcedure.query(() => getAllSkus()),
    bins: protectedProcedure.query(() => getAllBins()),
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

        // ── Step max points map ──────────────────────────────────────────────
        const STEP_MAX: Record<string, number> = {
          PO: 10, GR: 10, STOCK: 0, SO: 10, GI: 15, CC: 10, COMPLIANCE: 5,
        };
        const STEP_EVENT_MAP: Record<string, string> = {
          PO: "PO_COMPLETED", GR: "GR_COMPLETED", SO: "SO_COMPLETED",
          GI: "GI_COMPLETED", CC: "CC_COMPLETED", COMPLIANCE: "COMPLIANCE_OK",
        };
        const STEP_LABELS: Record<string, string> = {
          PO: "Purchase Order (ME21N)", GR: "Goods Receipt (MIGO)",
          STOCK: "Stock Disponible", SO: "Sales Order (VA01)",
          GI: "Goods Issue (VL02N)", CC: "Cycle Count (MI01)",
          COMPLIANCE: "Conformité Système",
        };

        // ── Per-step score breakdown ─────────────────────────────────────────
        const stepBreakdown = ["PO","GR","STOCK","SO","GI","CC","COMPLIANCE"].map(step => {
          const completed = state.completedSteps.includes(step as any);
          const completionEvent = STEP_EVENT_MAP[step];
          const completionPoints = completionEvent
            ? events.filter(e => e.eventType === completionEvent).reduce((s, e) => s + e.pointsDelta, 0)
            : 0;
          const maxPoints = STEP_MAX[step];
          const pct = maxPoints > 0 ? Math.round((completionPoints / maxPoints) * 100) : (completed ? 100 : 0);
          return {
            step,
            label: STEP_LABELS[step],
            completed,
            pointsEarned: completionPoints,
            maxPoints,
            pct: Math.max(0, Math.min(100, pct)),
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

        const errors = events
          .filter(e => e.pointsDelta < 0)
          .map(e => ({
            eventType: e.eventType,
            pointsDelta: e.pointsDelta,
            message: e.message ?? "",
            explanation: PENALTY_EXPLANATIONS[e.eventType] ?? {
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
          recommendations.push("Mémorisez le flux SAP S/4HANA : ME21N → MIGO → MB52 → VA01 → VL02N → MI01 → MMPV");
        if (errorTypes.has("NEGATIVE_STOCK_ATTEMPT"))
          recommendations.push("Avant chaque GI, consultez le stock avec MB52 ou la vue Inventaire en temps réel");
        if (errorTypes.has("UNPOSTED_TX_LEFT"))
          recommendations.push("Adoptez le réflexe \"créer + poster\" : ne quittez jamais une étape sans poster la transaction");
        if (errorTypes.has("UNRESOLVED_VARIANCE"))
          recommendations.push("Après MI01/MI04, toujours finaliser avec MI07 (validation des écarts) avant la conformité");
        if (!compliance.compliant)
          recommendations.push("Relancez la simulation en Mode Démonstration pour explorer librement les étapes sans pénalité");
        if (recommendations.length === 0 && errors.length === 0)
          recommendations.push("Excellente maîtrise du flux ! Passez au Module 2 pour approfondir la gestion des emplacements (bins)");

        const totalScore = calculateTotalScore(events);
        const { label: scoreLabel, color: scoreColor } = getScoreLabel(totalScore);

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
          progressPct: calculateProgressPct(state.completedSteps),
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
        const nextStep = getNextRequiredStep(state.completedSteps);
        const progressPct = calculateProgressPct(state.completedSteps);

        return {
          run,
          scenario,
          completedSteps: state.completedSteps,
          inventory: state.inventory,
          compliance,
          nextStep,
          progressPct,
          totalScore,
          steps: MODULE1_STEPS,
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
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("PO", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            // Evaluation mode: penalize and block
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.reasonFr });
          }
          // Demo mode: warn but allow (return warning in response)
        }
        await addTransaction({ runId: input.runId, docType: "PO", moveType: "ME21N", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "PO");
        // Scoring applies in both eval and demo modes (demo score is non-official)
        const rulePO = getScoringRule("PO_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "PO_COMPLETED", pointsDelta: rulePO!.points, message: rulePO!.descriptionFr });
        return { success: true, demoWarning: run.isDemo && !validation.allowed ? validation.reasonFr : null };
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
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("GR", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.reasonFr });
          }
        }
        await addTransaction({ runId: input.runId, docType: "GR", moveType: "101", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "GR");
        await markStepComplete(input.runId, "STOCK");
        const ruleGR = getScoringRule("GR_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "GR_COMPLETED", pointsDelta: ruleGR!.points, message: ruleGR!.descriptionFr });
        return { success: true, demoWarning: run.isDemo && !validation.allowed ? validation.reasonFr : null };
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
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("SO", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.reasonFr });
          }
        }
        await addTransaction({ runId: input.runId, docType: "SO", moveType: "VA01", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "SO");
        const ruleSO = getScoringRule("SO_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "SO_COMPLETED", pointsDelta: ruleSO!.points, message: ruleSO!.descriptionFr });
        return { success: true, demoWarning: run.isDemo && !validation.allowed ? validation.reasonFr : null };
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
      .mutation(async ({ input }) => {
        const run = await getRunById(input.runId);
        if (!run) throw new TRPCError({ code: "NOT_FOUND" });
        const state = await buildRunState(input.runId);
        const validation = canExecuteStep("GI", state);
        if (!validation.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "OUT_OF_SEQUENCE", pointsDelta: -5, message: validation.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.reasonFr });
          }
        }
        const stockCheck = canIssueStock(input.sku, input.bin, input.qty, state.inventory);
        if (!stockCheck.allowed) {
          if (!run.isDemo) {
            await addScoringEvent({ runId: input.runId, eventType: "NEGATIVE_STOCK_ATTEMPT", pointsDelta: -5, message: stockCheck.reasonFr ?? "" });
            throw new TRPCError({ code: "BAD_REQUEST", message: stockCheck.reasonFr });
          }
          // Demo: allow negative stock with warning
        }
        await addTransaction({ runId: input.runId, docType: "GI", moveType: "261", sku: input.sku, bin: input.bin, qty: String(input.qty), posted: true, docRef: input.docRef, comment: input.comment ?? null });
        await markStepComplete(input.runId, "GI");
        const ruleGI = getScoringRule("GI_COMPLETED");
        await addScoringEvent({ runId: input.runId, eventType: "GI_COMPLETED", pointsDelta: ruleGI!.points, message: ruleGI!.descriptionFr });
        const demoWarning = run.isDemo && (!validation.allowed || !stockCheck.allowed)
          ? [!validation.allowed ? validation.reasonFr : null, !stockCheck.allowed ? stockCheck.reasonFr : null].filter(Boolean).join(" | ")
          : null;
        return { success: true, demoWarning };
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
        return { success: true };
      }),
  }),

  // ─── Cycle Counts ────────────────────────────────────────────────────────────
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
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.reasonFr });
          }
          return { success: true, demoWarning: validation.reasonFr };
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
            progressPct: calculateProgressPct(state.completedSteps),
            completedSteps: state.completedSteps,
            score: r.run.isDemo ? null : calculateTotalScore(events),
            compliant: compliance.compliant,
          };
        })
      );
      // Separate evaluation vs demo for teacher view
      return enriched;
    }),

    // Evaluation-only analytics (excludes demo sessions)
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
            progressPct: calculateProgressPct(state.completedSteps),
            completedSteps: state.completedSteps,
            score: calculateTotalScore(events),
            compliant: compliance.compliant,
          };
        })
      );
      return enriched;
    }),
  }),
});

export type AppRouter = typeof appRouter;
