/**
 * Seed script — Module 1 + Module 2 + Module 3: Master Data + Scenarios
 * Run: npx tsx server/seed.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { binCapacity, masterBins, masterSkus, modules, replenishmentParams, scenarios } from "../drizzle/schema";
import "dotenv/config";

async function seed() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("🌱 Seeding Module 1 + Module 2 + Module 3 data...");

  // ─── Module 1 ───────────────────────────────────────────────────────────────
  await db
    .insert(modules)
    .values({
      code: "M1",
      titleFr: "Fondements de la chaîne logistique et intégration ERP/WMS",
      titleEn: "Supply Chain Fundamentals and ERP/WMS Integration",
      isActive: true,
      order: 1,
      stepsJson: ["PO", "GR", "STOCK", "SO", "GI", "CC", "COMPLIANCE"],
    })
    .onDuplicateKeyUpdate({ set: { titleFr: "Fondements de la chaîne logistique et intégration ERP/WMS", order: 1 } });

  // ─── Module 2 ───────────────────────────────────────────────────────────────
  await db
    .insert(modules)
    .values({
      code: "M2",
      titleFr: "Exécution d'entrepôt et gestion des emplacements",
      titleEn: "Warehouse Execution and Location Management",
      isActive: true,
      order: 2,
      unlockedByModuleId: 1,
      stepsJson: ["PUTAWAY", "BIN_CAPACITY", "FIFO", "INVENTORY_ACCURACY"],
    })
    .onDuplicateKeyUpdate({ set: { titleFr: "Exécution d'entrepôt et gestion des emplacements", order: 2, unlockedByModuleId: 1 } });

  // ─── Module 3 ───────────────────────────────────────────────────────────────
  await db
    .insert(modules)
    .values({
      code: "M3",
      titleFr: "Contrôle des stocks et réapprovisionnement",
      titleEn: "Inventory Control and Replenishment",
      isActive: true,
      order: 3,
      unlockedByModuleId: 2,
      stepsJson: ["CYCLE_COUNT", "VARIANCE", "ADJUSTMENT", "REPLENISHMENT"],
    })
    .onDuplicateKeyUpdate({ set: { titleFr: "Contrôle des stocks et réapprovisionnement", order: 3, unlockedByModuleId: 2 } });

  // ─── Master SKUs ─────────────────────────────────────────────────────────────
  const skuData = [
    { sku: "SKU-001", descriptionFr: "Boîte carton standard (Carton Box)", descriptionEn: "Standard Carton Box", unitOfMeasure: "UN", maxCapacity: 500 },
    { sku: "SKU-002", descriptionFr: "Palette bois (Wooden Pallet)", descriptionEn: "Wooden Pallet", unitOfMeasure: "UN", maxCapacity: 100 },
    { sku: "SKU-003", descriptionFr: "Film étirable (Stretch Film)", descriptionEn: "Stretch Film Roll", unitOfMeasure: "RL", maxCapacity: 200 },
    { sku: "SKU-004", descriptionFr: "Casque de sécurité (Safety Helmet)", descriptionEn: "Safety Helmet", unitOfMeasure: "UN", maxCapacity: 150 },
    { sku: "SKU-005", descriptionFr: "Gants de manutention (Handling Gloves)", descriptionEn: "Handling Gloves", unitOfMeasure: "PR", maxCapacity: 300 },
    { sku: "SKU-006", descriptionFr: "Étiquette code-barres (Barcode Label)", descriptionEn: "Barcode Label Roll", unitOfMeasure: "RL", maxCapacity: 1000 },
    { sku: "SKU-007", descriptionFr: "Ruban adhésif (Adhesive Tape)", descriptionEn: "Adhesive Tape Roll", unitOfMeasure: "RL", maxCapacity: 400 },
    { sku: "SKU-008", descriptionFr: "Scanner code-barres (Barcode Scanner)", descriptionEn: "Barcode Scanner", unitOfMeasure: "UN", maxCapacity: 50 },
    { sku: "SKU-009", descriptionFr: "Chariot de manutention (Hand Truck)", descriptionEn: "Hand Truck", unitOfMeasure: "UN", maxCapacity: 20 },
    { sku: "SKU-010", descriptionFr: "Cutter de sécurité (Safety Cutter)", descriptionEn: "Safety Cutter", unitOfMeasure: "UN", maxCapacity: 200 },
  ];

  for (const sku of skuData) {
    await db.insert(masterSkus).values(sku).onDuplicateKeyUpdate({ set: { descriptionFr: sku.descriptionFr } });
  }

  // ─── Master Bins ─────────────────────────────────────────────────────────────
  const binData = [
    { binCode: "A-01-R1-L1", description: "Zone A, Rangée 1, Niveau 1", zone: "PICKING" as const, maxCapacity: 200 },
    { binCode: "A-01-R1-L2", description: "Zone A, Rangée 1, Niveau 2", zone: "PICKING" as const, maxCapacity: 200 },
    { binCode: "A-02-R1-L1", description: "Zone A, Rangée 2, Niveau 1", zone: "PICKING" as const, maxCapacity: 200 },
    { binCode: "B-01-R1-L1", description: "Zone B, Rangée 1, Niveau 1", zone: "STOCKAGE" as const, maxCapacity: 500 },
    { binCode: "B-01-R1-L2", description: "Zone B, Rangée 1, Niveau 2", zone: "STOCKAGE" as const, maxCapacity: 500 },
    { binCode: "B-02-R1-L1", description: "Zone B, Rangée 2, Niveau 1", zone: "STOCKAGE" as const, maxCapacity: 500 },
    { binCode: "C-01-R1-L1", description: "Zone C, Rangée 1, Niveau 1 — Réserve", zone: "RESERVE" as const, maxCapacity: 1000 },
    { binCode: "C-01-R1-L2", description: "Zone C, Rangée 1, Niveau 2 — Réserve", zone: "RESERVE" as const, maxCapacity: 1000 },
    { binCode: "REC-01", description: "Quai de réception 01", zone: "RECEPTION" as const, maxCapacity: 300 },
    { binCode: "REC-02", description: "Quai de réception 02", zone: "RECEPTION" as const, maxCapacity: 300 },
    { binCode: "EXP-01", description: "Quai d'expédition 01", zone: "EXPEDITION" as const, maxCapacity: 300 },
    { binCode: "EXP-02", description: "Quai d'expédition 02", zone: "EXPEDITION" as const, maxCapacity: 300 },
    { binCode: "TRANSIT-01", description: "Zone de transit", zone: "STOCKAGE" as const, maxCapacity: 400 },
  ];

  for (const bin of binData) {
    await db.insert(masterBins).values(bin).onDuplicateKeyUpdate({ set: { description: bin.description, maxCapacity: bin.maxCapacity } });
  }

  // ─── Bin Capacity Table (Module 2) ───────────────────────────────────────────
  const binCapacityData = [
    { binCode: "A-01-R1-L1", maxCapacity: 200 },
    { binCode: "A-01-R1-L2", maxCapacity: 200 },
    { binCode: "A-02-R1-L1", maxCapacity: 200 },
    { binCode: "B-01-R1-L1", maxCapacity: 500 },
    { binCode: "B-01-R1-L2", maxCapacity: 500 },
    { binCode: "B-02-R1-L1", maxCapacity: 500 },
    { binCode: "C-01-R1-L1", maxCapacity: 1000 },
    { binCode: "C-01-R1-L2", maxCapacity: 1000 },
    { binCode: "REC-01", maxCapacity: 300 },
    { binCode: "REC-02", maxCapacity: 300 },
    { binCode: "EXP-01", maxCapacity: 300 },
    { binCode: "EXP-02", maxCapacity: 300 },
    { binCode: "TRANSIT-01", maxCapacity: 400 },
  ];

  for (const bc of binCapacityData) {
    await db.insert(binCapacity).values(bc).onDuplicateKeyUpdate({ set: { maxCapacity: bc.maxCapacity } });
  }

  // ─── Module 1 Scenarios ──────────────────────────────────────────────────────
  const module1Scenarios = [
    {
      moduleId: 1,
      name: "Scénario 1 — Cycle propre",
      descriptionFr: "Exécutez un cycle complet PO→GR→SO→GI→Cycle Count sans erreur. Objectif : maîtriser le flux standard.",
      descriptionEn: "Execute a complete PO→GR→SO→GI→Cycle Count cycle without errors. Objective: master the standard logistics flow.",
      difficulty: "facile" as const,
      initialStateJson: { preloadedTransactions: [], context: "Entrepôt vide — démarrage à zéro." },
      createdBy: 1,
    },
    {
      moduleId: 1,
      name: "Scénario 2 — Réception fantôme (GR non postée)",
      descriptionFr: "Une GR a été créée mais non postée. Détectez l'anomalie, postez la transaction et continuez le cycle.",
      descriptionEn: "A GR was created but not posted. Detect the anomaly, post the transaction, and continue the cycle.",
      difficulty: "moyen" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-001", bin: "REC-01", qty: 100, posted: true, docRef: "PO-2025-001" },
          { docType: "GR", sku: "SKU-001", bin: "B-01-R1-L1", qty: 100, posted: false, docRef: "GR-2025-001" },
        ],
        context: "GR non postée détectée — transaction fantôme.",
      },
      createdBy: 1,
    },
    {
      moduleId: 1,
      name: "Scénario 3 — Stock insuffisant",
      descriptionFr: "Un SO a été créé pour une quantité supérieure au stock disponible. Gérez le backorder et approvisionnez.",
      descriptionEn: "A SO was created for a quantity exceeding available stock. Manage the backorder and replenish inventory.",
      difficulty: "moyen" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-003", bin: "REC-01", qty: 50, posted: true, docRef: "PO-2025-002" },
          { docType: "GR", sku: "SKU-003", bin: "A-01-R1-L1", qty: 50, posted: true, docRef: "GR-2025-002" },
        ],
        context: "Stock de 50 unités — SO demande 80 unités.",
      },
      createdBy: 1,
    },
    {
      moduleId: 1,
      name: "Scénario 4 — Écart d'inventaire",
      descriptionFr: "Le comptage physique révèle un écart par rapport au stock système. Résolvez avec une transaction ADJ.",
      descriptionEn: "Physical count reveals a discrepancy against system stock. Resolve it with an ADJ transaction.",
      difficulty: "difficile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-006", bin: "REC-01", qty: 200, posted: true, docRef: "PO-2025-003" },
          { docType: "GR", sku: "SKU-006", bin: "B-02-R1-L1", qty: 200, posted: true, docRef: "GR-2025-003" },
        ],
        context: "Stock système : 200 | Stock physique : 185 — écart de -15.",
      },
      createdBy: 1,
    },
    {
      moduleId: 1,
      name: "Scénario 5 — Non-conformités multiples",
      descriptionFr: "Plusieurs anomalies simultanées : GR non postée, stock négatif potentiel, écart inventaire. Résolvez dans l'ordre.",
      descriptionEn: "Multiple simultaneous anomalies: unposted GR, potential negative stock, inventory discrepancy. Resolve them in the correct order.",
      difficulty: "difficile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-004", bin: "REC-01", qty: 30, posted: true, docRef: "PO-2025-004" },
          { docType: "GR", sku: "SKU-004", bin: "A-02-R1-L1", qty: 30, posted: false, docRef: "GR-2025-004" },
          { docType: "PO", sku: "SKU-005", bin: "REC-02", qty: 60, posted: true, docRef: "PO-2025-005" },
          { docType: "GR", sku: "SKU-005", bin: "B-01-R1-L2", qty: 60, posted: true, docRef: "GR-2025-005" },
        ],
        context: "GR non postée + écart inventaire SKU-005 (-8 unités).",
      },
      createdBy: 1,
    },
  ];

  for (const s of module1Scenarios) {
    await db.insert(scenarios).values(s).onDuplicateKeyUpdate({ set: { name: s.name } });
  }

  // ─── Module 2 Scenarios ──────────────────────────────────────────────────────
  const module2Scenarios = [
    {
      moduleId: 2,
      name: "M2 — Scénario 1 : Rangement structuré et affectation d'emplacement",
      descriptionFr: "Recevez une marchandise et rangez-la dans le bon bin selon les règles de capacité et de zone. Objectif : maîtriser le putaway LT01.",
      descriptionEn: "Receive goods and store them in the correct bin according to capacity and zone rules. Objective: master the LT01 putaway process.",
      difficulty: "facile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-001", bin: "REC-01", qty: 150, posted: true, docRef: "PO-M2-001" },
          { docType: "GR", sku: "SKU-001", bin: "REC-01", qty: 150, posted: true, docRef: "GR-M2-001" },
        ],
        context: "150 unités SKU-001 reçues au quai REC-01. Rangez dans la zone STOCKAGE selon la capacité disponible.",
        module: 2,
        lots: [{ lotNumber: "LOT-2025-001", receivedAt: "2025-01-15T08:00:00Z", qty: 150 }],
      },
      createdBy: 1,
    },
    {
      moduleId: 2,
      name: "M2 — Scénario 2 : Validation de la capacité d'emplacement",
      descriptionFr: "Tentez de ranger une quantité dépassant la capacité d'un bin. Le système doit détecter le dépassement et proposer une alternative.",
      descriptionEn: "Attempt to store a quantity exceeding a bin's capacity. The system must detect the overflow and suggest an alternative location.",
      difficulty: "moyen" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-002", bin: "REC-01", qty: 600, posted: true, docRef: "PO-M2-002" },
          { docType: "GR", sku: "SKU-002", bin: "REC-01", qty: 600, posted: true, docRef: "GR-M2-002" },
        ],
        context: "600 unités SKU-002 reçues. Le bin B-01-R1-L1 a une capacité de 500. Gérez le dépassement.",
        module: 2,
        lots: [{ lotNumber: "LOT-2025-002", receivedAt: "2025-02-01T10:00:00Z", qty: 600 }],
      },
      createdBy: 1,
    },
    {
      moduleId: 2,
      name: "M2 — Scénario 3 : Application de la méthode FIFO en gestion multi-lots",
      descriptionFr: "Trois lots du même SKU sont en stock. Respectez l'ordre FIFO lors du rangement et de la préparation de commande.",
      descriptionEn: "Three lots of the same SKU are in stock. Follow FIFO order during putaway and order picking.",
      difficulty: "difficile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-003", bin: "REC-01", qty: 300, posted: true, docRef: "PO-M2-003" },
          { docType: "GR", sku: "SKU-003", bin: "B-01-R1-L1", qty: 100, posted: true, docRef: "GR-M2-003A" },
          { docType: "GR", sku: "SKU-003", bin: "B-01-R1-L2", qty: 100, posted: true, docRef: "GR-M2-003B" },
          { docType: "GR", sku: "SKU-003", bin: "B-02-R1-L1", qty: 100, posted: true, docRef: "GR-M2-003C" },
        ],
        context: "3 lots SKU-003 en stock. Respectez l'ordre FIFO : LOT-A (jan), LOT-B (fév), LOT-C (mars).",
        module: 2,
        lots: [
          { lotNumber: "LOT-A-2025", receivedAt: "2025-01-10T08:00:00Z", qty: 100 },
          { lotNumber: "LOT-B-2025", receivedAt: "2025-02-10T08:00:00Z", qty: 100 },
          { lotNumber: "LOT-C-2025", receivedAt: "2025-03-10T08:00:00Z", qty: 100 },
        ],
      },
      createdBy: 1,
    },
  ];

  for (const s of module2Scenarios) {
    await db.insert(scenarios).values(s).onDuplicateKeyUpdate({ set: { name: s.name } });
  }

  // ─── Module 3 Scenarios ──────────────────────────────────────────────────────
  const module3Scenarios = [
    {
      moduleId: 3,
      name: "M3 — Scénario 1 : Inventaire cyclique simple",
      descriptionFr: "Réaliser un inventaire cyclique et analyser les écarts entre stock système et stock physique.",
      descriptionEn: "Perform a cycle count and analyze discrepancies between system stock and physical stock.",
      difficulty: "facile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-001", bin: "REC-01", qty: 100, posted: true, docRef: "PO-M3-001" },
          { docType: "GR", sku: "SKU-001", bin: "B-01-R1-L1", qty: 100, posted: true, docRef: "GR-M3-001" },
          { docType: "PO", sku: "SKU-003", bin: "REC-01", qty: 80, posted: true, docRef: "PO-M3-002" },
          { docType: "GR", sku: "SKU-003", bin: "B-01-R1-L2", qty: 80, posted: true, docRef: "GR-M3-002" },
        ],
        context: "Stock système : SKU-001 = 100 unités, SKU-003 = 80 unités. Réalisez le comptage cyclique et identifiez les écarts.",
        module: 3,
        cycleCountTargets: [
          { sku: "SKU-001", bin: "B-01-R1-L1", systemQty: 100, physicalQty: 97 },
          { sku: "SKU-003", bin: "B-01-R1-L2", systemQty: 80, physicalQty: 80 },
        ],
      },
      createdBy: 1,
    },
    {
      moduleId: 3,
      name: "M3 — Scénario 2 : Analyse d'écart et ajustement d'inventaire",
      descriptionFr: "Identifier un écart significatif, fournir une justification et procéder à l'ajustement conforme aux règles internes.",
      descriptionEn: "Identify a significant discrepancy, provide a justification, and perform the adjustment in compliance with internal rules.",
      difficulty: "moyen" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-006", bin: "REC-01", qty: 500, posted: true, docRef: "PO-M3-003" },
          { docType: "GR", sku: "SKU-006", bin: "B-02-R1-L1", qty: 500, posted: true, docRef: "GR-M3-003" },
          { docType: "SO", sku: "SKU-006", bin: "B-02-R1-L1", qty: 120, posted: true, docRef: "SO-M3-001" },
          { docType: "GI", sku: "SKU-006", bin: "B-02-R1-L1", qty: 120, posted: true, docRef: "GI-M3-001" },
        ],
        context: "Stock système : SKU-006 = 380 unités. Comptage physique révèle 352 unités. Écart de -28. Justifiez et ajustez.",
        module: 3,
        cycleCountTargets: [
          { sku: "SKU-006", bin: "B-02-R1-L1", systemQty: 380, physicalQty: 352 },
        ],
        adjustmentThreshold: 20,
      },
      createdBy: 1,
    },
    {
      moduleId: 3,
      name: "M3 — Scénario 3 : Réapprovisionnement selon paramètres Min/Max et stock de sécurité",
      descriptionFr: "Analyser les niveaux d'inventaire et générer une recommandation de réapprovisionnement conforme aux paramètres définis.",
      descriptionEn: "Analyze inventory levels and generate a replenishment recommendation aligned with the defined Min/Max and safety stock parameters.",
      difficulty: "difficile" as const,
      initialStateJson: {
        preloadedTransactions: [
          { docType: "PO", sku: "SKU-004", bin: "REC-01", qty: 200, posted: true, docRef: "PO-M3-004" },
          { docType: "GR", sku: "SKU-004", bin: "B-01-R1-L1", qty: 200, posted: true, docRef: "GR-M3-004" },
          { docType: "SO", sku: "SKU-004", bin: "B-01-R1-L1", qty: 170, posted: true, docRef: "SO-M3-002" },
          { docType: "GI", sku: "SKU-004", bin: "B-01-R1-L1", qty: 170, posted: true, docRef: "GI-M3-002" },
          { docType: "PO", sku: "SKU-005", bin: "REC-01", qty: 300, posted: true, docRef: "PO-M3-005" },
          { docType: "GR", sku: "SKU-005", bin: "B-01-R1-L2", qty: 300, posted: true, docRef: "GR-M3-005" },
          { docType: "SO", sku: "SKU-005", bin: "B-01-R1-L2", qty: 260, posted: true, docRef: "SO-M3-003" },
          { docType: "GI", sku: "SKU-005", bin: "B-01-R1-L2", qty: 260, posted: true, docRef: "GI-M3-003" },
        ],
        context: "Analysez les niveaux : SKU-004 = 30 unités (Min=50, Max=200, SS=25) | SKU-005 = 40 unités (Min=80, Max=300, SS=30). Générez les recommandations de réapprovisionnement.",
        module: 3,
        replenishmentParams: [
          { sku: "SKU-004", minQty: 50, maxQty: 200, safetyStock: 25, leadTimeDays: 3 },
          { sku: "SKU-005", minQty: 80, maxQty: 300, safetyStock: 30, leadTimeDays: 5 },
        ],
      },
      createdBy: 1,
    },
  ];

  for (const s of module3Scenarios) {
    await db.insert(scenarios).values(s).onDuplicateKeyUpdate({ set: { name: s.name } });
  }

  // ─── Replenishment Params (Module 3) ─────────────────────────────────────────
  const replenishmentData = [
    { sku: "SKU-001", minQty: "50", maxQty: "500", safetyStock: "30", leadTimeDays: 3 },
    { sku: "SKU-002", minQty: "20", maxQty: "100", safetyStock: "10", leadTimeDays: 7 },
    { sku: "SKU-003", minQty: "40", maxQty: "200", safetyStock: "20", leadTimeDays: 5 },
    { sku: "SKU-004", minQty: "50", maxQty: "200", safetyStock: "25", leadTimeDays: 3 },
    { sku: "SKU-005", minQty: "80", maxQty: "300", safetyStock: "30", leadTimeDays: 5 },
    { sku: "SKU-006", minQty: "100", maxQty: "1000", safetyStock: "50", leadTimeDays: 2 },
    { sku: "SKU-007", minQty: "60", maxQty: "400", safetyStock: "25", leadTimeDays: 4 },
    { sku: "SKU-008", minQty: "5", maxQty: "50", safetyStock: "3", leadTimeDays: 14 },
    { sku: "SKU-009", minQty: "3", maxQty: "20", safetyStock: "2", leadTimeDays: 21 },
    { sku: "SKU-010", minQty: "30", maxQty: "200", safetyStock: "15", leadTimeDays: 5 },
  ];

  for (const rp of replenishmentData) {
    await db.insert(replenishmentParams).values(rp).onDuplicateKeyUpdate({ set: { minQty: rp.minQty, maxQty: rp.maxQty, safetyStock: rp.safetyStock } });
  }

  // ─── Module 4 ───────────────────────────────────────────────────────────────
  await db.insert(modules).values({
    code: "M4",
    titleFr: "Module 4 \u2014 Indicateurs de performance logistique",
    titleEn: "Module 4 \u2014 Logistics Performance Indicators",
    isActive: true,
    order: 4,
    unlockedByModuleId: 3,
  }).onDuplicateKeyUpdate({ set: { titleFr: "Module 4 \u2014 Indicateurs de performance logistique", order: 4, unlockedByModuleId: 3 } });

  const [m4] = await db.select().from(modules).where(eq(modules.code, "M4"));

  const m4Scenarios = [
    {
      moduleId: m4.id,
      name: "M4 \u2014 Sc\u00e9nario 1 : Analyse de la rotation des stocks",
      descriptionFr: "Calculer et interpr\u00e9ter le taux de rotation des stocks afin d'identifier une situation de surstock ou sous-performance.",
      descriptionEn: "Calculate and interpret the inventory turnover rate to identify overstock or underperformance situations.",
      difficulty: "facile" as const,
      isActive: true,
      createdBy: 1,
    },
    {
      moduleId: m4.id,
      name: "M4 \u2014 Sc\u00e9nario 2 : Analyse du taux de service et des erreurs op\u00e9rationnelles",
      descriptionFr: "Identifier les causes d'un faible taux de service et analyser l'impact des erreurs logistiques sur la performance globale.",
      descriptionEn: "Identify the root causes of a low service level and analyze the impact of logistics errors on overall performance.",
      difficulty: "moyen" as const,
      isActive: true,
      createdBy: 1,
    },
    {
      moduleId: m4.id,
      name: "M4 \u2014 Sc\u00e9nario 3 : Diagnostic global de performance logistique",
      descriptionFr: "Analyser plusieurs indicateurs combin\u00e9s et proposer une d\u00e9cision strat\u00e9gique bas\u00e9e sur les donn\u00e9es observ\u00e9es.",
      descriptionEn: "Analyze multiple combined KPIs and propose a strategic decision based on the observed data.",
      difficulty: "difficile" as const,
      isActive: true,
      createdBy: 1,
    },
  ];

  for (const s of m4Scenarios) {
    await db.insert(scenarios).values(s).onDuplicateKeyUpdate({ set: { descriptionFr: s.descriptionFr, descriptionEn: s.descriptionEn, difficulty: s.difficulty } });
  }

  // ─── Module 5 ───────────────────────────────────────────────────────────────
  await db.insert(modules).values({
    code: "M5",
    titleFr: "Module 5 \u2014 Simulation op\u00e9rationnelle int\u00e9gr\u00e9e",
    titleEn: "Module 5 \u2014 Integrated Operational Simulation",
    isActive: true,
    order: 5,
    unlockedByModuleId: 4,
  }).onDuplicateKeyUpdate({ set: { titleFr: "Module 5 \u2014 Simulation op\u00e9rationnelle int\u00e9gr\u00e9e", order: 5, unlockedByModuleId: 4 } });

  const [m5] = await db.select().from(modules).where(eq(modules.code, "M5"));

  const m5Scenarios = [
    {
      moduleId: m5.id,
      name: "M5 \u2014 Sc\u00e9nario 1 : Cycle op\u00e9rationnel complet",
      descriptionFr: "R\u00e9aliser un cycle complet fournisseur \u2192 entrep\u00f4t \u2192 client en respectant les r\u00e8gles op\u00e9rationnelles.",
      descriptionEn: "Complete a full supplier to warehouse to customer cycle following all operational rules.",
      difficulty: "moyen" as const,
      isActive: true,
      createdBy: 1,
    },
    {
      moduleId: m5.id,
      name: "M5 \u2014 Sc\u00e9nario 2 : Gestion d'\u00e9carts et r\u00e9ajustement",
      descriptionFr: "G\u00e9rer une situation incluant des \u00e9carts d'inventaire et proposer des actions correctives.",
      descriptionEn: "Manage a situation involving inventory discrepancies and propose corrective actions.",
      difficulty: "difficile" as const,
      isActive: true,
      createdBy: 1,
    },
    {
      moduleId: m5.id,
      name: "M5 \u2014 Sc\u00e9nario 3 : Analyse d\u00e9cisionnelle strat\u00e9gique",
      descriptionFr: "Analyser les indicateurs de performance globaux et formuler une d\u00e9cision strat\u00e9gique justifi\u00e9e.",
      descriptionEn: "Analyze global performance indicators and formulate a justified strategic decision.",
      difficulty: "difficile" as const,
      isActive: true,
      createdBy: 1,
    },
  ];

  for (const s of m5Scenarios) {
    await db.insert(scenarios).values(s).onDuplicateKeyUpdate({ set: { descriptionFr: s.descriptionFr, descriptionEn: s.descriptionEn, difficulty: s.difficulty } });
  }

  console.log("\u2705 Seed complete: 5 modules, 10 SKUs, 13 bins, 5 M1 scenarios, 3 M2 scenarios, 3 M3 scenarios, 3 M4 scenarios, 3 M5 scenarios");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
