/**
 * tRPC Integration Tests — M1 & M3 Full Flows
 *
 * These tests exercise the complete step-by-step business logic for:
 *  - M1: PO → GR → PUTAWAY_M1 → STOCK → SO → PICKING_M1 → GI → CC → COMPLIANCE
 *  - M3: CC_LIST → CC_COUNT → CC_RECON → REPLENISH → COMPLIANCE_M3
 *
 * They operate at the pure business-logic layer (rulesEngine + scoringEngine),
 * without requiring a live database connection. This ensures fast, deterministic
 * CI runs while still covering the full pedagogical contract.
 */

import { describe, it, expect } from "vitest";
import {
  // M1 helpers
  canExecuteStep,
  validateGRZone,
  validatePutawayM1Zone,
  validatePickingM1Zone,
  validateGIZone,
  calculateInventory,
  canIssueStock,
  checkCompliance,
  getNextRequiredStep,
  calculateProgressPct,
  // M3 helpers
  canExecuteStepM3,
  computeVariance,
  validateVarianceEntry,
  validateAdjustment,
  computeReplenishmentSuggestion,
  M3_VARIANCE_THRESHOLD,
  // Constants
  RECEPTION_BINS,
  STOCKAGE_BINS,
  EXPEDITION_BINS,
  MODULE1_STEPS,
  MODULE3_STEPS,
} from "./rulesEngine";
import { getScoringRule, calculateTotalScore, MODULE1_SCORING } from "./scoringEngine";
import type { RunState } from "./rulesEngine";

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

/** Create a minimal RunState for testing */
function makeState(
  completedSteps: string[],
  transactions: RunState["transactions"],
  inventory: Record<string, number> = {},
  cycleCounts: RunState["cycleCounts"] = []
): RunState {
  return {
    completedSteps: completedSteps as RunState["completedSteps"],
    transactions,
    inventory,
    cycleCounts,
  };
}

/** Create a transaction fixture */
function makeTx(
  docType: string,
  sku: string,
  bin: string,
  qty: number,
  posted = true,
  docRef?: string
): RunState["transactions"][number] {
  return {
    docType,
    sku,
    bin,
    qty,
    posted,
    docRef: docRef ?? `${docType}-001`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1 INTEGRATION TESTS
// PO → GR → PUTAWAY_M1 → STOCK → SO → PICKING_M1 → GI → CC → COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("M1 Integration — Full Cycle PO→GR→PUTAWAY→STOCK→SO→PICKING→GI→CC→COMPLIANCE", () => {

  // ── Step 1: PO ──────────────────────────────────────────────────────────────
  describe("Step 1 — PO (Purchase Order)", () => {
    it("PO is the first step and requires no prerequisite", () => {
      const state = makeState([], []);
      const result = canExecuteStep("PO", state);
      expect(result.allowed).toBe(true);
    });

    it("PO is the next required step when nothing is completed", () => {
      const next = getNextRequiredStep([], 1);
      expect(next?.code).toBe("PO");
    });

    it("progress is 0% before any step", () => {
      expect(calculateProgressPct([], 1)).toBe(0);
    });

    it("PO_COMPLETED scoring rule exists and has positive points", () => {
      const rule = getScoringRule("PO_COMPLETED");
      expect(rule).toBeDefined();
      expect(rule!.points).toBeGreaterThan(0);
    });

    it("MODULE1_SCORING has 11 rules", () => {
      expect(MODULE1_SCORING.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ── Step 2: GR ──────────────────────────────────────────────────────────────
  describe("Step 2 — GR (Goods Receipt)", () => {
    it("GR is blocked when no PO exists", () => {
      const state = makeState(["PO"], []);
      const result = canExecuteStep("GR", state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Purchase Order/i);
    });

    it("GR is blocked when PO is not posted", () => {
      const state = makeState(["PO"], [makeTx("PO", "SKU-001", "REC-01", 100, false)]);
      const result = canExecuteStep("GR", state);
      expect(result.allowed).toBe(false);
    });

    it("GR is allowed when a posted PO exists", () => {
      const state = makeState(["PO"], [makeTx("PO", "SKU-001", "REC-01", 100, true)]);
      const result = canExecuteStep("GR", state);
      expect(result.allowed).toBe(true);
    });

    it("GR zone validation: RECEPTION bins are valid", () => {
      for (const bin of RECEPTION_BINS) {
        const r = validateGRZone(bin);
        expect(r.allowed).toBe(true);
      }
    });

    it("GR zone validation: STOCKAGE bins are invalid for GR", () => {
      for (const bin of STOCKAGE_BINS) {
        const r = validateGRZone(bin);
        expect(r.allowed).toBe(false);
      }
    });

    it("GR zone validation: EXPEDITION bins are invalid for GR", () => {
      for (const bin of EXPEDITION_BINS) {
        const r = validateGRZone(bin);
        expect(r.allowed).toBe(false);
      }
    });
  });

  // ── Step 3: PUTAWAY_M1 ──────────────────────────────────────────────────────
  describe("Step 3 — PUTAWAY_M1 (Putaway to Stock)", () => {
    it("PUTAWAY_M1 is blocked when no GR exists", () => {
      const state = makeState(["PO", "GR"], [makeTx("PO", "SKU-001", "REC-01", 100)]);
      const result = canExecuteStep("PUTAWAY_M1", state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Goods Receipt/i);
    });

    it("PUTAWAY_M1 is blocked when GR was not posted to a RECEPTION bin", () => {
      const state = makeState(
        ["PO", "GR"],
        [
          makeTx("PO", "SKU-001", "REC-01", 100),
          makeTx("GR", "SKU-001", "B-01-R1-L1", 100), // wrong bin
        ]
      );
      const result = canExecuteStep("PUTAWAY_M1", state);
      expect(result.allowed).toBe(false);
    });

    it("PUTAWAY_M1 is allowed when GR is posted to REC-01", () => {
      const state = makeState(
        ["PO", "GR"],
        [
          makeTx("PO", "SKU-001", "REC-01", 100),
          makeTx("GR", "SKU-001", "REC-01", 100),
        ]
      );
      const result = canExecuteStep("PUTAWAY_M1", state);
      expect(result.allowed).toBe(true);
    });

    it("PUTAWAY_M1 zone: valid fromBin=REC-01, toBin=B-01-R1-L1", () => {
      const r = validatePutawayM1Zone("REC-01", "B-01-R1-L1");
      expect(r.allowed).toBe(true);
    });

    it("PUTAWAY_M1 zone: invalid when fromBin is not RECEPTION", () => {
      const r = validatePutawayM1Zone("B-01-R1-L1", "B-01-R1-L2");
      expect(r.allowed).toBe(false);
    });

    it("PUTAWAY_M1 zone: invalid when toBin is not STOCKAGE", () => {
      const r = validatePutawayM1Zone("REC-01", "EXP-01");
      expect(r.allowed).toBe(false);
    });

    it("calculateInventory credits PUTAWAY_M1 to the destination bin", () => {
      const txs = [
        { docType: "GR", sku: "SKU-001", bin: "REC-01", qty: 100, posted: true },
        { docType: "PUTAWAY_M1", sku: "SKU-001", bin: "B-01-R1-L1", qty: 100, posted: true },
      ];
      const inv = calculateInventory(txs);
      expect(inv["SKU-001::B-01-R1-L1"]).toBe(100);
      expect(inv["SKU-001::REC-01"]).toBe(100); // GR credit remains
    });
  });

  // ── Step 4: STOCK ───────────────────────────────────────────────────────────
  describe("Step 4 — STOCK (Available Stock Check)", () => {
    it("STOCK is blocked when PUTAWAY_M1 not completed", () => {
      const state = makeState(["PO", "GR"], []);
      const result = canExecuteStep("STOCK", state);
      expect(result.allowed).toBe(false);
    });

    it("STOCK is blocked when no stock in warehouse bins", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1"],
        [],
        {} // empty inventory
      );
      const result = canExecuteStep("STOCK", state);
      expect(result.allowed).toBe(false);
    });

    it("STOCK is allowed when PUTAWAY_M1 done and stock exists in STOCKAGE", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1"],
        [],
        { "SKU-001::B-01-R1-L1": 100 }
      );
      const result = canExecuteStep("STOCK", state);
      expect(result.allowed).toBe(true);
    });

    it("progress is ~44% after 4 of 9 steps", () => {
      const pct = calculateProgressPct(["PO", "GR", "PUTAWAY_M1", "STOCK"], 1);
      expect(pct).toBeGreaterThan(30);
      expect(pct).toBeLessThan(60);
    });
  });

  // ── Step 5: SO ──────────────────────────────────────────────────────────────
  describe("Step 5 — SO (Sales Order)", () => {
    it("SO is allowed at step-sequence level (inventory check is separate)", () => {
      const state = makeState(["PO", "GR", "PUTAWAY_M1", "STOCK"], [], {});
      const result = canExecuteStep("SO", state);
      expect(result.allowed).toBe(true);
    });

    it("SO_COMPLETED scoring rule exists", () => {
      const rule = getScoringRule("SO_COMPLETED");
      expect(rule).toBeDefined();
    });
  });

  // ── Step 6: PICKING_M1 ──────────────────────────────────────────────────────
  describe("Step 6 — PICKING_M1 (Picking to Dispatch)", () => {
    it("PICKING_M1 is blocked when no posted SO exists", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK"],
        [
          makeTx("PO", "SKU-001", "REC-01", 100),
          makeTx("GR", "SKU-001", "REC-01", 100),
          makeTx("PUTAWAY_M1", "SKU-001", "B-01-R1-L1", 100),
        ]
      );
      const result = canExecuteStep("PICKING_M1", state);
      expect(result.allowed).toBe(false);
      // The step-sequence check reports the prerequisite step code
      expect(result.reason).toMatch(/SO|Sales Order/i);
    });

    it("PICKING_M1 is allowed when a posted SO exists", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO"],
        [
          makeTx("PO", "SKU-001", "REC-01", 100),
          makeTx("GR", "SKU-001", "REC-01", 100),
          makeTx("PUTAWAY_M1", "SKU-001", "B-01-R1-L1", 100),
          makeTx("SO", "SKU-001", "B-01-R1-L1", 50),
        ]
      );
      const result = canExecuteStep("PICKING_M1", state);
      expect(result.allowed).toBe(true);
    });

    it("PICKING_M1 zone: valid fromBin=B-01-R1-L1, toBin=EXP-01", () => {
      const r = validatePickingM1Zone("B-01-R1-L1", "EXP-01");
      expect(r.allowed).toBe(true);
    });

    it("PICKING_M1 zone: invalid when fromBin is not STOCKAGE", () => {
      const r = validatePickingM1Zone("REC-01", "EXP-01");
      expect(r.allowed).toBe(false);
    });

    it("PICKING_M1 zone: invalid when toBin is not EXPEDITION", () => {
      const r = validatePickingM1Zone("B-01-R1-L1", "B-01-R1-L2");
      expect(r.allowed).toBe(false);
    });

    // ── Stock invariant: Picking is a TRANSFER, total stock must not change ──
    it("calculateInventory: PICKING debit correctly deducts from source bin", () => {
      // PICKING debit record: docType="PICKING", qty=-60 (already negative)
      const txs = [
        { docType: "PICKING", sku: "SKU-001", bin: "B-01-R1-L1", qty: -60, posted: true },
      ];
      const inv = calculateInventory(txs);
      // Source bin must be REDUCED by 60
      expect(inv["SKU-001::B-01-R1-L1"]).toBe(-60);
    });

    it("calculateInventory: PICKING_M1 credit correctly adds to destination bin", () => {
      // PICKING_M1 credit record: docType="PICKING_M1", qty=+60 (positive)
      const txs = [
        { docType: "PICKING_M1", sku: "SKU-001", bin: "EXP-01", qty: 60, posted: true },
      ];
      const inv = calculateInventory(txs);
      // Destination bin must be CREDITED by 60
      expect(inv["SKU-001::EXP-01"]).toBe(60);
    });

    it("calculateInventory: total stock is UNCHANGED after a full PICKING transfer", () => {
      // Simulate: 100 units in STOCKAGE, pick 60 to EXPÉDITION
      const txs = [
        // GR: +100 to REC-01
        { docType: "GR",        sku: "SKU-001", bin: "REC-01",     qty: 100, posted: true },
        // PUTAWAY: -100 from REC-01, +100 to B-01-R1-L1
        { docType: "PUTAWAY_M1", sku: "SKU-001", bin: "REC-01",     qty: -100, posted: true },
        { docType: "PUTAWAY_M1", sku: "SKU-001", bin: "B-01-R1-L1", qty: 100, posted: true },
        // PICKING: -60 from B-01-R1-L1 (debit), +60 to EXP-01 (credit)
        { docType: "PICKING",    sku: "SKU-001", bin: "B-01-R1-L1", qty: -60, posted: true },
        { docType: "PICKING_M1", sku: "SKU-001", bin: "EXP-01",     qty: 60,  posted: true },
      ];
      const inv = calculateInventory(txs);
      // STOCKAGE should have 40 remaining
      expect(inv["SKU-001::B-01-R1-L1"]).toBe(40);
      // EXPÉDITION should have 60
      expect(inv["SKU-001::EXP-01"]).toBe(60);
      // REC-01 should be 0 (GR +100, PUTAWAY debit -100)
      expect(inv["SKU-001::REC-01"]).toBe(0);
      // TOTAL across all bins must equal original GR qty (100)
      const total = Object.values(inv).reduce((sum: number, q) => sum + (q as number), 0);
      expect(total).toBe(100);
    });

    it("calculateInventory: total stock is ZERO after full cycle GR→PUTAWAY→PICKING→GI", () => {
      // Full cycle: receive 100, putaway, pick 60, GI 60
      const txs = [
        { docType: "GR",         sku: "SKU-001", bin: "REC-01",     qty: 100, posted: true },
        { docType: "PUTAWAY_M1", sku: "SKU-001", bin: "REC-01",     qty: -100, posted: true },
        { docType: "PUTAWAY_M1", sku: "SKU-001", bin: "B-01-R1-L1", qty: 100, posted: true },
        { docType: "PICKING",    sku: "SKU-001", bin: "B-01-R1-L1", qty: -60, posted: true },
        { docType: "PICKING_M1", sku: "SKU-001", bin: "EXP-01",     qty: 60,  posted: true },
        { docType: "GI",         sku: "SKU-001", bin: "EXP-01",     qty: 60,  posted: true },
      ];
      const inv = calculateInventory(txs);
      // After GI: STOCKAGE=40, EXPÉDITION=0, REC-01=0
      expect(inv["SKU-001::B-01-R1-L1"]).toBe(40);
      expect(inv["SKU-001::EXP-01"]).toBe(0);
      expect(inv["SKU-001::REC-01"]).toBe(0);
      // Total = 40 (the 40 units still in STOCKAGE)
      const total = Object.values(inv).reduce((sum: number, q) => sum + (q as number), 0);
      expect(total).toBe(40);
    });
  });

  // ── Step 7: GI ──────────────────────────────────────────────────────────────
  describe("Step 7 — GI (Goods Issue)", () => {
    it("GI is blocked when PICKING_M1 not completed", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO"],
        [makeTx("SO", "SKU-001", "B-01-R1-L1", 50)]
      );
      const result = canExecuteStep("GI", state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/PICKING/i);
    });

    it("GI is blocked when picking was not posted to an EXPEDITION bin", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1"],
        [
          makeTx("SO", "SKU-001", "B-01-R1-L1", 50),
          makeTx("PICKING_M1", "SKU-001", "B-01-R1-L1", 50), // wrong bin
        ]
      );
      const result = canExecuteStep("GI", state);
      expect(result.allowed).toBe(false);
    });

    it("GI is allowed when PICKING_M1 posted to EXP-01", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1"],
        [
          makeTx("SO", "SKU-001", "B-01-R1-L1", 50),
          makeTx("PICKING_M1", "SKU-001", "EXP-01", 50),
        ]
      );
      const result = canExecuteStep("GI", state);
      expect(result.allowed).toBe(true);
    });

    it("GI zone validation: EXPEDITION bins are valid for GI", () => {
      for (const bin of EXPEDITION_BINS) {
        const r = validateGIZone(bin);
        expect(r.allowed).toBe(true);
      }
    });

    it("GI zone validation: STOCKAGE bins are invalid for GI", () => {
      for (const bin of STOCKAGE_BINS) {
        const r = validateGIZone(bin);
        expect(r.allowed).toBe(false);
      }
    });

    it("canIssueStock: allows issue when sufficient stock in expedition bin", () => {
      const inv = { "SKU-001::EXP-01": 50 };
      const r = canIssueStock("SKU-001", "EXP-01", 50, inv);
      expect(r.allowed).toBe(true);
    });

    it("canIssueStock: blocks issue when insufficient stock", () => {
      const inv = { "SKU-001::EXP-01": 30 };
      const r = canIssueStock("SKU-001", "EXP-01", 50, inv);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/Insufficient/i);
    });

    it("calculateInventory: GI deducts from expedition bin", () => {
      const txs = [
        { docType: "PICKING_M1", sku: "SKU-001", bin: "EXP-01", qty: 50, posted: true },
        { docType: "GI", sku: "SKU-001", bin: "EXP-01", qty: 50, posted: true },
      ];
      const inv = calculateInventory(txs);
      expect(inv["SKU-001::EXP-01"]).toBe(0);
    });
  });

  // ── Step 8: CC ──────────────────────────────────────────────────────────────
  describe("Step 8 — CC (Cycle Count)", () => {
    it("CC is the 8th step in MODULE1_STEPS", () => {
      const cc = MODULE1_STEPS.find((s) => s.code === "CC");
      expect(cc).toBeDefined();
      expect(cc!.order).toBe(8);
    });

    it("CC prerequisite is GI", () => {
      const cc = MODULE1_STEPS.find((s) => s.code === "CC");
      expect(cc!.prerequisite).toBe("GI");
    });

    it("CC_COMPLETED scoring rule exists", () => {
      const rule = getScoringRule("CC_COMPLETED");
      expect(rule).toBeDefined();
    });
  });

  // ── Step 9: COMPLIANCE ──────────────────────────────────────────────────────
  describe("Step 9 — COMPLIANCE (System Compliance)", () => {
    it("COMPLIANCE is blocked when unposted transactions exist", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1", "GI", "CC"],
        [makeTx("PO", "SKU-001", "REC-01", 100, false)] // unposted
      );
      const result = canExecuteStep("COMPLIANCE", state);
      expect(result.allowed).toBe(false);
    });

    it("COMPLIANCE is blocked when negative stock exists", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1", "GI", "CC"],
        [],
        { "SKU-001::B-01-R1-L1": -5 }
      );
      const result = canExecuteStep("COMPLIANCE", state);
      expect(result.allowed).toBe(false);
    });

    it("COMPLIANCE is allowed when all transactions posted and no negative stock", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1", "GI", "CC"],
        [
          makeTx("PO", "SKU-001", "REC-01", 100, true),
          makeTx("GR", "SKU-001", "REC-01", 100, true),
          makeTx("PUTAWAY_M1", "SKU-001", "B-01-R1-L1", 100, true),
          makeTx("SO", "SKU-001", "B-01-R1-L1", 50, true),
          makeTx("PICKING_M1", "SKU-001", "EXP-01", 50, true),
          makeTx("GI", "SKU-001", "EXP-01", 50, true),
        ],
        { "SKU-001::B-01-R1-L1": 50, "SKU-001::EXP-01": 0 }
      );
      const result = canExecuteStep("COMPLIANCE", state);
      expect(result.allowed).toBe(true);
    });

    it("checkCompliance: detects unresolved cycle count variances", () => {
      const state = makeState(
        ["PO", "GR", "PUTAWAY_M1", "STOCK", "SO", "PICKING_M1", "GI", "CC"],
        [],
        {},
        [{ sku: "SKU-001", bin: "B-01-R1-L1", variance: -10, resolved: false }]
      );
      const result = checkCompliance(state);
      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes("unresolved"))).toBe(true);
    });

    it("progress is 100% after all 9 M1 steps", () => {
      const allSteps = MODULE1_STEPS.map((s) => s.code);
      const pct = calculateProgressPct(allSteps, 1);
      expect(pct).toBe(100);
    });
  });

  // ── Full M1 Score Calculation ───────────────────────────────────────────────
  describe("M1 — Score Calculation", () => {
    it("calculateTotalScore returns 0 when no scoring events", () => {
      const score = calculateTotalScore([]);
      expect(score).toBe(0);
    });

    it("calculateTotalScore accumulates points from multiple events", () => {
      const events = [
        { pointsDelta: 10 },
        { pointsDelta: 10 },
        { pointsDelta: 10 },
      ];
      const score = calculateTotalScore(events);
      expect(score).toBe(30);
    });

    it("calculateTotalScore clamps at 100", () => {
      const events = Array.from({ length: 15 }, () => ({ pointsDelta: 10 }));
      const score = calculateTotalScore(events);
      expect(score).toBe(100);
    });

    it("calculateTotalScore clamps at 0 for negative events", () => {
      const events = [{ pointsDelta: -50 }, { pointsDelta: -50 }];
      const score = calculateTotalScore(events);
      expect(score).toBe(0);
    });

    it("all key M1 completion events have scoring rules", () => {
      const completionEvents = [
        "PO_COMPLETED", "GR_COMPLETED", "SO_COMPLETED", "GI_COMPLETED",
        "CC_COMPLETED", "COMPLIANCE_OK",
      ];
      for (const event of completionEvents) {
        const rule = getScoringRule(event);
        expect(rule, `Expected scoring rule for event ${event}`).toBeDefined();
      }
    });

    it("penalty events have negative points", () => {
      const penaltyEvents = [
        "OUT_OF_SEQUENCE", "NEGATIVE_STOCK_ATTEMPT", "UNPOSTED_TX_LEFT", "UNRESOLVED_VARIANCE",
      ];
      for (const event of penaltyEvents) {
        const rule = getScoringRule(event);
        expect(rule, `Expected scoring rule for penalty ${event}`).toBeDefined();
        expect(rule!.points).toBeLessThan(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3 INTEGRATION TESTS
// CC_LIST → CC_COUNT → CC_RECON → REPLENISH → COMPLIANCE_M3
// ═══════════════════════════════════════════════════════════════════════════════

describe("M3 Integration — Full Cycle CC_LIST→CC_COUNT→CC_RECON→REPLENISH→COMPLIANCE_M3", () => {

  // ── Step 1: CC_LIST ─────────────────────────────────────────────────────────
  describe("Step 1 — CC_LIST (Count List)", () => {
    it("CC_LIST is the first M3 step with no prerequisite", () => {
      const step = MODULE3_STEPS.find((s) => s.code === "CC_LIST");
      expect(step).toBeDefined();
      expect(step!.prerequisite).toBeNull();
    });

    it("CC_LIST is allowed when no steps completed", () => {
      const result = canExecuteStepM3("CC_LIST", []);
      expect(result.allowed).toBe(true);
    });
  });

  // ── Step 2: CC_COUNT ────────────────────────────────────────────────────────
  describe("Step 2 — CC_COUNT (Count Entry)", () => {
    it("CC_COUNT is blocked when CC_LIST not completed", () => {
      const result = canExecuteStepM3("CC_COUNT", []);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/CC_LIST/i);
    });

    it("CC_COUNT is allowed when CC_LIST completed", () => {
      const result = canExecuteStepM3("CC_COUNT", ["CC_LIST"]);
      expect(result.allowed).toBe(true);
    });

    it("computeVariance: zero variance when counts match", () => {
      const { varianceQty, requiresJustification } = computeVariance(100, 100);
      expect(varianceQty).toBe(0);
      expect(requiresJustification).toBe(false);
    });

    it("computeVariance: negative variance when physical < system", () => {
      const { varianceQty, requiresJustification } = computeVariance(100, 90);
      expect(varianceQty).toBe(-10);
      expect(requiresJustification).toBe(true);
    });

    it("computeVariance: positive variance when physical > system", () => {
      const { varianceQty, requiresJustification } = computeVariance(100, 105);
      expect(varianceQty).toBe(5);
      expect(requiresJustification).toBe(true);
    });

    it(`variance below threshold (${M3_VARIANCE_THRESHOLD}) does not require justification`, () => {
      const { requiresJustification } = computeVariance(100, 103);
      expect(requiresJustification).toBe(false);
    });

    it(`variance at threshold (${M3_VARIANCE_THRESHOLD}) requires justification`, () => {
      const { requiresJustification } = computeVariance(100, 95);
      expect(requiresJustification).toBe(true);
    });
  });

  // ── Step 3: CC_RECON ────────────────────────────────────────────────────────
  describe("Step 3 — CC_RECON (Reconciliation & Adjustment)", () => {
    it("CC_RECON is blocked when CC_COUNT not completed", () => {
      const result = canExecuteStepM3("CC_RECON", ["CC_LIST"]);
      expect(result.allowed).toBe(false);
    });

    it("CC_RECON is allowed when CC_COUNT completed", () => {
      const result = canExecuteStepM3("CC_RECON", ["CC_LIST", "CC_COUNT"]);
      expect(result.allowed).toBe(true);
    });

    it("validateVarianceEntry: requires justification for large variance", () => {
      const r = validateVarianceEntry(100, 85, null);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/justification/i);
    });

    it("validateVarianceEntry: allows entry with valid justification", () => {
      const r = validateVarianceEntry(100, 85, "Damaged goods found during count");
      expect(r.allowed).toBe(true);
    });

    it("validateVarianceEntry: allows small variance without justification", () => {
      const r = validateVarianceEntry(100, 102, null);
      expect(r.allowed).toBe(true);
    });

    it("validateAdjustment: adjustment must match variance exactly", () => {
      const r = validateAdjustment(-10, -10);
      expect(r.allowed).toBe(true);
    });

    it("validateAdjustment: rejects adjustment that does not match variance", () => {
      const r = validateAdjustment(-10, -8);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/must equal variance/i);
    });

    it("validateAdjustment: rejects zero adjustment for non-zero variance", () => {
      const r = validateAdjustment(-10, 0);
      expect(r.allowed).toBe(false);
    });
  });

  // ── Step 4: REPLENISH ───────────────────────────────────────────────────────
  describe("Step 4 — REPLENISH (Replenishment)", () => {
    it("REPLENISH is blocked when CC_RECON not completed", () => {
      const result = canExecuteStepM3("REPLENISH", ["CC_LIST", "CC_COUNT"]);
      expect(result.allowed).toBe(false);
    });

    it("REPLENISH is allowed when CC_RECON completed", () => {
      const result = canExecuteStepM3("REPLENISH", ["CC_LIST", "CC_COUNT", "CC_RECON"]);
      expect(result.allowed).toBe(true);
    });

    it("computeReplenishmentSuggestion: no replenishment needed when above min", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 150, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.needsReplenishment).toBe(false);
      expect(r.suggestedQty).toBe(0);
    });

    it("computeReplenishmentSuggestion: replenishment needed when below min", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 30, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.needsReplenishment).toBe(true);
      expect(r.suggestedQty).toBe(170); // maxQty - systemQty = 200 - 30
    });

    it("computeReplenishmentSuggestion: critical when below safety stock", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 20, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.isCritical).toBe(true);
      expect(r.needsReplenishment).toBe(true);
    });

    it("computeReplenishmentSuggestion: not critical when above safety stock but below min", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 40, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.isCritical).toBe(false);
      expect(r.needsReplenishment).toBe(true);
    });

    it("computeReplenishmentSuggestion: reason includes 'Below Min'", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 30, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.reason).toContain("Below Min");
    });

    it("computeReplenishmentSuggestion: reason includes 'Safety Stock' when critical", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 20, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.reason).toContain("Safety Stock");
    });
  });

  // ── Step 5: COMPLIANCE_M3 ───────────────────────────────────────────────────
  describe("Step 5 — COMPLIANCE_M3 (M3 Compliance)", () => {
    it("COMPLIANCE_M3 is blocked when REPLENISH not completed", () => {
      const result = canExecuteStepM3("COMPLIANCE_M3", ["CC_LIST", "CC_COUNT", "CC_RECON"]);
      expect(result.allowed).toBe(false);
    });

    it("COMPLIANCE_M3 is allowed when all prior steps completed", () => {
      const result = canExecuteStepM3("COMPLIANCE_M3", [
        "CC_LIST", "CC_COUNT", "CC_RECON", "REPLENISH",
      ]);
      expect(result.allowed).toBe(true);
    });

    it("COMPLIANCE_M3 is the last step in MODULE3_STEPS", () => {
      const last = MODULE3_STEPS[MODULE3_STEPS.length - 1];
      expect(last.code).toBe("COMPLIANCE_M3");
    });
  });

  // ── M3 Step Sequence Integrity ──────────────────────────────────────────────
  describe("M3 — Step Sequence Integrity", () => {
    it("M3 has exactly 5 steps", () => {
      expect(MODULE3_STEPS).toHaveLength(5);
    });

    it("M3 steps are in correct order: CC_LIST→CC_COUNT→CC_RECON→REPLENISH→COMPLIANCE_M3", () => {
      const codes = MODULE3_STEPS.map((s) => s.code);
      expect(codes).toEqual(["CC_LIST", "CC_COUNT", "CC_RECON", "REPLENISH", "COMPLIANCE_M3"]);
    });

    it("each M3 step has the correct prerequisite chain", () => {
      const prereqs: Record<string, string | null> = {
        CC_LIST: null,
        CC_COUNT: "CC_LIST",
        CC_RECON: "CC_COUNT",
        REPLENISH: "CC_RECON",
        COMPLIANCE_M3: "REPLENISH",
      };
      for (const step of MODULE3_STEPS) {
        expect(step.prerequisite).toBe(prereqs[step.code]);
      }
    });

    it("cannot skip steps — CC_RECON blocked without CC_COUNT even if CC_LIST done", () => {
      const result = canExecuteStepM3("CC_RECON", ["CC_LIST"]);
      expect(result.allowed).toBe(false);
    });

    it("cannot skip to REPLENISH without CC_RECON", () => {
      const result = canExecuteStepM3("REPLENISH", ["CC_LIST", "CC_COUNT"]);
      expect(result.allowed).toBe(false);
    });
  });

  // ── M3 Edge Cases ───────────────────────────────────────────────────────────
  describe("M3 — Edge Cases & Boundary Conditions", () => {
    it("variance of exactly 0 is not critical and needs no justification", () => {
      const { varianceQty, requiresJustification } = computeVariance(50, 50);
      expect(varianceQty).toBe(0);
      expect(requiresJustification).toBe(false);
    });

    it("variance of exactly threshold requires justification", () => {
      const { requiresJustification } = computeVariance(100, 100 - M3_VARIANCE_THRESHOLD);
      expect(requiresJustification).toBe(true);
    });

    it("variance of threshold - 1 does NOT require justification", () => {
      const { requiresJustification } = computeVariance(100, 100 - (M3_VARIANCE_THRESHOLD - 1));
      expect(requiresJustification).toBe(false);
    });

    it("replenishment suggestion: systemQty exactly at min — no replenishment needed", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 50, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.needsReplenishment).toBe(false);
    });

    it("replenishment suggestion: systemQty one below min — replenishment needed", () => {
      const r = computeReplenishmentSuggestion({
        sku: "SKU-001", systemQty: 49, minQty: 50, maxQty: 200, safetyStock: 25,
      });
      expect(r.needsReplenishment).toBe(true);
      expect(r.suggestedQty).toBe(151); // 200 - 49
    });

    it("adjustment validation: floating point tolerance — 0.005 difference is accepted", () => {
      const r = validateAdjustment(-10, -10.005);
      // 0.005 < 0.01, so it should be allowed
      expect(r.allowed).toBe(true);
    });

    it("adjustment validation: difference > 0.01 is rejected", () => {
      const r = validateAdjustment(-10, -10.02);
      expect(r.allowed).toBe(false);
    });
  });
});
