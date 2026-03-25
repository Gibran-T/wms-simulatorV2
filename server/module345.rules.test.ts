/**
 * Unit Tests — Modules 3, 4 & 5
 * Covers: ROP/EOQ/variance (M3), calculateKpis/scoreKpiInterpretation (M4), scoreM5Decision (M5)
 */
import { describe, it, expect } from "vitest";
import {
  // M3
  computeVariance,
  validateVarianceEntry,
  validateAdjustment,
  computeReplenishmentSuggestion,
  canExecuteStepM3,
  isModuleUnlocked,
  isModule3Unlocked,
  M3_VARIANCE_THRESHOLD,
  // M4
  calculateKpis,
  scoreKpiInterpretation,
  MODULE4_STEPS,
  // M5
  scoreM5Decision,
  MODULE5_STEPS,
  getNextRequiredStepAllModules,
  calculateProgressPctAllModules,
} from "./rulesEngine";

// ─── Module 3: Variance Tests ─────────────────────────────────────────────────
describe("Module 3 — computeVariance", () => {
  it("returns zero variance when counts match", () => {
    const result = computeVariance(100, 100);
    expect(result.varianceQty).toBe(0);
    expect(result.requiresJustification).toBe(false);
  });

  it("returns positive variance when physical > system", () => {
    const result = computeVariance(80, 90);
    expect(result.varianceQty).toBe(10);
    expect(result.requiresJustification).toBe(true);
  });

  it("returns negative variance when physical < system", () => {
    const result = computeVariance(100, 93);
    expect(result.varianceQty).toBe(-7);
    expect(result.requiresJustification).toBe(true);
  });

  it("does NOT require justification for variance below threshold", () => {
    const result = computeVariance(100, 103); // variance = 3, threshold = 5
    expect(result.varianceQty).toBe(3);
    expect(result.requiresJustification).toBe(false);
  });

  it("requires justification exactly at threshold", () => {
    const result = computeVariance(100, 95); // variance = -5 = threshold
    expect(result.requiresJustification).toBe(true);
  });

  it("threshold constant is 5", () => {
    expect(M3_VARIANCE_THRESHOLD).toBe(5);
  });
});

describe("Module 3 — validateVarianceEntry", () => {
  it("allows entry when variance is below threshold (no justification needed)", () => {
    const result = validateVarianceEntry(100, 102, null);
    expect(result.allowed).toBe(true);
  });

  it("rejects entry when variance >= threshold and no justification given", () => {
    const result = validateVarianceEntry(100, 90, null);
    expect(result.allowed).toBe(false);
    expect(result.reasonFr).toMatch(/justification/i);
  });

  it("rejects entry when justification is too short (< 5 chars)", () => {
    const result = validateVarianceEntry(100, 90, "ok");
    expect(result.allowed).toBe(false);
  });

  it("allows entry when variance >= threshold and valid justification provided", () => {
    const result = validateVarianceEntry(100, 90, "Erreur de comptage lors de la réception");
    expect(result.allowed).toBe(true);
  });

  it("allows entry with exactly 5-char justification", () => {
    const result = validateVarianceEntry(100, 90, "12345");
    expect(result.allowed).toBe(true);
  });
});

describe("Module 3 — validateAdjustment", () => {
  it("allows adjustment that exactly matches variance", () => {
    const result = validateAdjustment(-10, -10);
    expect(result.allowed).toBe(true);
  });

  it("rejects adjustment that does not match variance", () => {
    const result = validateAdjustment(-10, -8);
    expect(result.allowed).toBe(false);
    expect(result.reasonFr).toMatch(/ajustement/i);
  });

  it("allows positive variance adjustment", () => {
    const result = validateAdjustment(5, 5);
    expect(result.allowed).toBe(true);
  });

  it("rejects adjustment with opposite sign", () => {
    const result = validateAdjustment(-10, 10);
    expect(result.allowed).toBe(false);
  });
});

describe("Module 3 — computeReplenishmentSuggestion", () => {
  it("returns no replenishment when stock is above minQty", () => {
    const result = computeReplenishmentSuggestion({
      sku: "SKU-001",
      systemQty: 150,
      minQty: 100,
      maxQty: 500,
      safetyStock: 50,
    });
    expect(result.needsReplenishment).toBe(false);
    expect(result.suggestedQty).toBe(0);
    expect(result.isCritical).toBe(false);
  });

  it("suggests replenishment when stock is below minQty", () => {
    const result = computeReplenishmentSuggestion({
      sku: "SKU-002",
      systemQty: 80,
      minQty: 100,
      maxQty: 500,
      safetyStock: 50,
    });
    expect(result.needsReplenishment).toBe(true);
    expect(result.suggestedQty).toBe(420); // 500 - 80
    expect(result.isCritical).toBe(false);
  });

  it("marks as critical when stock is below safety stock", () => {
    const result = computeReplenishmentSuggestion({
      sku: "SKU-003",
      systemQty: 30,
      minQty: 100,
      maxQty: 500,
      safetyStock: 50,
    });
    expect(result.needsReplenishment).toBe(true);
    expect(result.isCritical).toBe(true);
    expect(result.reason).toContain("Safety Stock");
  });

  it("calculates correct suggested quantity to reach maxQty", () => {
    const result = computeReplenishmentSuggestion({
      sku: "SKU-004",
      systemQty: 200,
      minQty: 300,
      maxQty: 1000,
      safetyStock: 100,
    });
    expect(result.suggestedQty).toBe(800); // 1000 - 200
  });

  it("returns zero suggestion when stock equals minQty exactly", () => {
    const result = computeReplenishmentSuggestion({
      sku: "SKU-005",
      systemQty: 100,
      minQty: 100,
      maxQty: 500,
      safetyStock: 50,
    });
    // systemQty === minQty → needsReplenishment = false (not strictly below)
    expect(result.needsReplenishment).toBe(false);
  });
});

describe("Module 3 — canExecuteStepM3", () => {
  it("allows CC_LIST as first step (no prerequisite)", () => {
    const result = canExecuteStepM3("CC_LIST" as any, []);
    expect(result.allowed).toBe(true);
  });

  it("blocks CC_COUNT if CC_LIST not completed", () => {
    const result = canExecuteStepM3("CC_COUNT" as any, []);
    expect(result.allowed).toBe(false);
  });

  it("allows CC_COUNT after CC_LIST completed", () => {
    const result = canExecuteStepM3("CC_COUNT" as any, ["CC_LIST" as any]);
    expect(result.allowed).toBe(true);
  });

  it("blocks REPLENISH if CC_RECON not completed", () => {
    const result = canExecuteStepM3("REPLENISH" as any, ["CC_LIST" as any, "CC_COUNT" as any]);
    expect(result.allowed).toBe(false);
  });

  it("allows COMPLIANCE_M3 after all prior steps completed", () => {
    const completed = ["CC_LIST", "CC_COUNT", "CC_RECON", "REPLENISH"] as any[];
    const result = canExecuteStepM3("COMPLIANCE_M3" as any, completed);
    expect(result.allowed).toBe(true);
  });
});

describe("Module 3 — isModule3Unlocked (hybrid unlock)", () => {
  it("is locked when module2Progress is null", () => {
    expect(isModule3Unlocked(null)).toBe(false);
  });

  it("is locked when module 2 passed but not teacher-validated", () => {
    expect(isModule3Unlocked({ passed: true, teacherValidated: false })).toBe(false);
  });

  it("is locked when teacher-validated but module 2 not passed", () => {
    expect(isModule3Unlocked({ passed: false, teacherValidated: true })).toBe(false);
  });

  it("is unlocked when module 2 passed AND teacher-validated", () => {
    expect(isModule3Unlocked({ passed: true, teacherValidated: true })).toBe(true);
  });
});

// ─── Module 4: KPI Calculation Tests ─────────────────────────────────────────
describe("Module 4 — calculateKpis", () => {
  const baseData = {
    annualConsumption: 2400,
    averageStock: 400,
    ordersFulfilled: 285,
    totalOrders: 300,
    operationalErrors: 12,
    totalOperations: 300,
    avgLeadTimeDays: 3.5,
    stockValue: 48000,
  };

  it("calculates rotation rate correctly (2400/400 = 6)", () => {
    const result = calculateKpis(baseData);
    expect(result.rotationRate).toBe(6);
  });

  it("calculates service level correctly (285/300 = 0.95)", () => {
    const result = calculateKpis(baseData);
    expect(result.serviceLevel).toBeCloseTo(0.95, 4);
  });

  it("calculates error rate correctly (12/300 = 0.04)", () => {
    const result = calculateKpis(baseData);
    expect(result.errorRate).toBeCloseTo(0.04, 4);
  });

  it("returns correct average lead time", () => {
    const result = calculateKpis(baseData);
    expect(result.averageLeadTime).toBe(3.5);
  });

  it("returns correct stock immobilized value", () => {
    const result = calculateKpis(baseData);
    expect(result.stockImmobilizedValue).toBe(48000);
  });

  it("classifies low rotation rate as surstock", () => {
    const result = calculateKpis({ ...baseData, annualConsumption: 1200, averageStock: 400 }); // 3x
    expect(result.rotationStatus).toBe("surstock");
  });

  it("classifies high rotation rate as normal", () => {
    const result = calculateKpis({ ...baseData, annualConsumption: 4000, averageStock: 400 }); // 10x
    expect(result.rotationStatus).toBe("normal");
  });

  it("classifies very low rotation (1x) as surstock (< 4x threshold)", () => {
    const result = calculateKpis({ ...baseData, annualConsumption: 400, averageStock: 400 }); // 1x
    // Actual threshold: rotationRate < 4 → surstock; > 12 → sous-performance
    expect(result.rotationStatus).toBe("surstock");
  });

  it("classifies very high rotation (> 12x) as sous-performance", () => {
    const result = calculateKpis({ ...baseData, annualConsumption: 6000, averageStock: 400 }); // 15x
    expect(result.rotationStatus).toBe("sous-performance");
  });

  it("classifies service level >= 98% as excellent", () => {
    const result = calculateKpis({ ...baseData, ordersFulfilled: 295, totalOrders: 300 }); // 98.3%
    expect(result.serviceLevelStatus).toBe("excellent");
  });

  it("classifies service level >= 95% as excellent", () => {
    const result = calculateKpis(baseData); // 95% → excellent (threshold: >= 0.95)
    expect(result.serviceLevelStatus).toBe("excellent");
  });

  it("classifies service level 85-94% as acceptable", () => {
    const result = calculateKpis({ ...baseData, ordersFulfilled: 270, totalOrders: 300 }); // 90%
    expect(result.serviceLevelStatus).toBe("acceptable");
  });

  it("classifies service level < 85% as insuffisant", () => {
    const result = calculateKpis({ ...baseData, ordersFulfilled: 240, totalOrders: 300 }); // 80%
    expect(result.serviceLevelStatus).toBe("insuffisant");
  });

  it("classifies error rate < 2% as excellent", () => {
    const result = calculateKpis({ ...baseData, operationalErrors: 3, totalOperations: 300 }); // 1%
    expect(result.errorRateStatus).toBe("excellent");
  });

  it("classifies error rate 2-5% as acceptable", () => {
    const result = calculateKpis(baseData); // 4%
    expect(result.errorRateStatus).toBe("acceptable");
  });

  it("classifies error rate > 5% as critique", () => {
    const result = calculateKpis({ ...baseData, operationalErrors: 20, totalOperations: 300 }); // 6.7%
    expect(result.errorRateStatus).toBe("critique");
  });
});

describe("Module 4 — scoreKpiInterpretation", () => {
  const kpiResult = {
    rotationRate: 6,
    serviceLevel: 0.95,
    errorRate: 0.04,
    averageLeadTime: 3.5,
    stockImmobilizedValue: 48000,
    rotationStatus: "surstock" as const,
    serviceLevelStatus: "acceptable" as const,
    errorRateStatus: "acceptable" as const,
  };

  it("awards +15 for correct rotation rate interpretation (surstock)", () => {
    const result = scoreKpiInterpretation("rotationRate", "Le taux indique un surstock important", kpiResult);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(15);
  });

  it("deducts -5 for incorrect rotation rate interpretation", () => {
    const result = scoreKpiInterpretation("rotationRate", "Le taux de rotation est excellent et optimal", kpiResult);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsDelta).toBe(-5);
  });

  it("awards +15 for correct service level interpretation (acceptable)", () => {
    const result = scoreKpiInterpretation("serviceLevel", "Le taux de service est acceptable mais peut être amélioré", kpiResult);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(15);
  });

  it("awards +15 for correct error rate interpretation (acceptable)", () => {
    const result = scoreKpiInterpretation("errorRate", "Le taux d'erreur est acceptable mais modéré", kpiResult);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(15);
  });

  it("awards +20 for diagnostic with strategic recommendation", () => {
    const longAnswer = "Je recommande d'améliorer les procédures de réception pour réduire les erreurs. Une action corrective sur le processus de picking est nécessaire pour améliorer la stratégie logistique.";
    const result = scoreKpiInterpretation("diagnostic", longAnswer, kpiResult);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(20);
  });

  it("returns 0 for diagnostic without strategic recommendation", () => {
    const result = scoreKpiInterpretation("diagnostic", "Les KPI sont corrects.", kpiResult);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsDelta).toBe(0);
  });
});

describe("Module 4 — MODULE4_STEPS structure", () => {
  it("has 5 steps in correct order", () => {
    expect(MODULE4_STEPS).toHaveLength(5);
    expect(MODULE4_STEPS[0].code).toBe("KPI_DATA");
    expect(MODULE4_STEPS[4].code).toBe("COMPLIANCE_M4");
  });

  it("each step has moduleId 4", () => {
    expect(MODULE4_STEPS.every((s) => s.moduleId === 4)).toBe(true);
  });

  it("steps have sequential order numbers", () => {
    const orders = MODULE4_STEPS.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });
});

// ─── Module 5: Decision Scoring Tests ────────────────────────────────────────
describe("Module 5 — scoreM5Decision", () => {
  const kpiResult = {
    rotationRate: 6,
    serviceLevel: 0.95,
    errorRate: 0.04,
    averageLeadTime: 3.5,
    stockImmobilizedValue: 48000,
    rotationStatus: "surstock" as const,
    serviceLevelStatus: "acceptable" as const,
    errorRateStatus: "acceptable" as const,
  };

  it("awards points for mentioning rotation", () => {
    const result = scoreM5Decision("Le taux de rotation est trop bas, il faut agir.", kpiResult);
    expect(result.score).toBeGreaterThan(0);
    expect(result.feedback).toContain("Rotation");
  });

  it("awards points for mentioning service level", () => {
    const result = scoreM5Decision("Le taux de service doit être amélioré.", kpiResult);
    expect(result.score).toBeGreaterThan(0);
    expect(result.feedback).toContain("service");
  });

  it("awards points for mentioning errors", () => {
    const result = scoreM5Decision("Les erreurs opérationnelles doivent être réduites.", kpiResult);
    expect(result.score).toBeGreaterThan(0);
    expect(result.feedback).toContain("erreur");
  });

  it("awards points for proposing replenishment action", () => {
    const result = scoreM5Decision("Je propose de commander du stock supplémentaire pour réapprovisionnement.", kpiResult);
    expect(result.score).toBeGreaterThan(0);
  });

  it("awards points for proposing corrective action (formation/procédure)", () => {
    const result = scoreM5Decision("Une formation du personnel et une révision des procédures est nécessaire.", kpiResult);
    expect(result.score).toBeGreaterThan(0);
    expect(result.feedback).toContain("corrective");
  });

  it("awards bonus for comprehensive analysis (>150 chars + 4+ criteria)", () => {
    const comprehensive = "Le taux de rotation de 6x indique un surstock. Le taux de service de 95% est acceptable mais doit atteindre 98%. Le taux d'erreur de 4% nécessite une amélioration des procédures et une formation du personnel. Je recommande un réapprovisionnement ciblé et une révision des processus de picking pour améliorer la stratégie logistique globale.";
    const result = scoreM5Decision(comprehensive, kpiResult);
    expect(result.score).toBeGreaterThan(50);
    expect(result.feedback).toContain("complète");
  });

  it("score is capped at 80 maximum", () => {
    const maxAnswer = "rotation taux de service erreur réapprovisionnement commander stock formation procédure améliorer stratégie décision action corrective indicateur performance logistique entrepôt WMS cycle count variance FIFO putaway";
    const result = scoreM5Decision(maxAnswer.repeat(3), kpiResult);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it("returns feedback message on insufficient decision", () => {
    const result = scoreM5Decision("Je ne sais pas.", kpiResult);
    expect(result.feedback).toContain("KPI");
  });

  it("score is never negative", () => {
    const result = scoreM5Decision("", kpiResult);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("Module 5 — MODULE5_STEPS structure", () => {
  it("has 7 steps in correct order", () => {
    expect(MODULE5_STEPS).toHaveLength(7);
    expect(MODULE5_STEPS[0].code).toBe("M5_RECEPTION");
    expect(MODULE5_STEPS[6].code).toBe("COMPLIANCE_M5");
  });

  it("each step has moduleId 5", () => {
    expect(MODULE5_STEPS.every((s) => s.moduleId === 5)).toBe(true);
  });

  it("M5_DECISION prerequisite is M5_KPI", () => {
    const decisionStep = MODULE5_STEPS.find((s) => s.code === "M5_DECISION");
    expect(decisionStep?.prerequisite).toBe("M5_KPI");
  });

  it("COMPLIANCE_M5 prerequisite is M5_DECISION", () => {
    const complianceStep = MODULE5_STEPS.find((s) => s.code === "COMPLIANCE_M5");
    expect(complianceStep?.prerequisite).toBe("M5_DECISION");
  });
});

// ─── Cross-module: Progress Calculation ──────────────────────────────────────
describe("getNextRequiredStepAllModules", () => {
  it("returns first M3 step when no steps completed", () => {
    const next = getNextRequiredStepAllModules([], 3);
    expect(next?.code).toBe("CC_LIST");
  });

  it("returns null when all M4 steps completed", () => {
    const allM4 = ["KPI_DATA", "KPI_ROTATION", "KPI_SERVICE", "KPI_DIAGNOSTIC", "COMPLIANCE_M4"] as any[];
    const next = getNextRequiredStepAllModules(allM4, 4);
    expect(next).toBeNull();
  });

  it("returns correct next step for M5 mid-progress", () => {
    const completed = ["M5_RECEPTION", "M5_PUTAWAY"] as any[];
    const next = getNextRequiredStepAllModules(completed, 5);
    expect(next?.code).toBe("M5_CYCLE_COUNT");
  });
});

describe("calculateProgressPctAllModules", () => {
  it("returns 0% for M3 with no steps completed", () => {
    expect(calculateProgressPctAllModules([], 3)).toBe(0);
  });

  it("returns 100% for M4 with all steps completed", () => {
    const allM4 = ["KPI_DATA", "KPI_ROTATION", "KPI_SERVICE", "KPI_DIAGNOSTIC", "COMPLIANCE_M4"] as any[];
    expect(calculateProgressPctAllModules(allM4, 4)).toBe(100);
  });

  it("returns ~57% for M5 with 4 of 7 steps completed", () => {
    const completed = ["M5_RECEPTION", "M5_PUTAWAY", "M5_CYCLE_COUNT", "M5_REPLENISH"] as any[];
    expect(calculateProgressPctAllModules(completed, 5)).toBe(57);
  });
});
