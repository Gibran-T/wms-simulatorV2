/**
 * Scoring Engine — Module 1 (100 points total)
 * Separate from compliance logic.
 */

export interface ScoringRule {
  eventType: string;
  points: number;
  descriptionFr: string;
}

export const MODULE1_SCORING: ScoringRule[] = [
  // Completion points (60 total)
  { eventType: "PO_COMPLETED", points: 10, descriptionFr: "Bon de commande (PO) complété" },
  { eventType: "GR_COMPLETED", points: 10, descriptionFr: "Réception marchandises (GR) complétée" },
  { eventType: "PUTAWAY_COMPLETED", points: 10, descriptionFr: "Rangement en emplacement (PUTAWAY) complété" },
  { eventType: "SO_COMPLETED", points: 10, descriptionFr: "Commande client (SO) complétée" },
  { eventType: "GI_COMPLETED", points: 15, descriptionFr: "Sortie marchandises (GI) sans stock négatif" },
  { eventType: "CC_COMPLETED", points: 10, descriptionFr: "Comptage cyclique (Cycle Count) complété" },
  { eventType: "COMPLIANCE_OK", points: 5, descriptionFr: "Conformité système validée" },
  // M2 specific
  { eventType: "FIFO_PICK_COMPLETED", points: 15, descriptionFr: "Prélèvement FIFO complété avec lot correct" },
  { eventType: "STOCK_ACCURACY_COMPLETED", points: 10, descriptionFr: "Précision stock validée" },
  { eventType: "COMPLIANCE_ADV_COMPLETED", points: 5, descriptionFr: "Conformité avancée validée" },
  // M3 specific
  { eventType: "ROP_CHECK_COMPLETED", points: 10, descriptionFr: "Vérification point de réapprovisionnement (ROP)" },
  { eventType: "EOQ_CALC_COMPLETED", points: 10, descriptionFr: "Calcul EOQ complété" },
  { eventType: "CC_COUNT_COMPLETED", points: 10, descriptionFr: "Comptage cyclique (CC_COUNT) complété" },
  { eventType: "CC_RECON_COMPLETED", points: 10, descriptionFr: "Réconciliation inventaire complétée" },
  { eventType: "COMPLIANCE_M3_COMPLETED", points: 5, descriptionFr: "Conformité M3 validée" },
  // M4 specific
  { eventType: "KPI_ANALYSIS_COMPLETED", points: 15, descriptionFr: "Analyse KPI complétée" },
  { eventType: "LEAN_ACTION_COMPLETED", points: 10, descriptionFr: "Action Lean complétée" },
  { eventType: "COMPLIANCE_M4_COMPLETED", points: 5, descriptionFr: "Conformité M4 validée" },
  // M5 specific
  { eventType: "M5_RECEPTION_COMPLETED", points: 10, descriptionFr: "Réception M5 complétée" },
  { eventType: "M5_PUTAWAY_COMPLETED", points: 10, descriptionFr: "Rangement M5 complété" },
  { eventType: "M5_CYCLE_COUNT_COMPLETED", points: 10, descriptionFr: "Comptage cyclique M5 complété" },
  { eventType: "M5_COMPLIANCE_COMPLETED", points: 5, descriptionFr: "Conformité M5 validée" },
  // Penalties (deductions)
  { eventType: "OUT_OF_SEQUENCE", points: -5, descriptionFr: "Tentative hors séquence" },
  { eventType: "NEGATIVE_STOCK_ATTEMPT", points: -5, descriptionFr: "Tentative de GI avec stock insuffisant" },
  { eventType: "UNPOSTED_TX_LEFT", points: -3, descriptionFr: "Transaction non postée laissée en suspens" },
  { eventType: "UNRESOLVED_VARIANCE", points: -5, descriptionFr: "Écart d'inventaire non résolu" },
  { eventType: "WRONG_ZONE_GR", points: -3, descriptionFr: "Mauvaise zone pour la réception" },
  { eventType: "WRONG_ZONE_PUTAWAY", points: -3, descriptionFr: "Mauvaise zone pour le rangement" },
  { eventType: "WRONG_ZONE_GI", points: -3, descriptionFr: "Mauvaise zone pour la sortie" },
  { eventType: "WRONG_LOT_FIFO", points: -5, descriptionFr: "Lot FIFO incorrect (pas le plus ancien)" },

  // Bonus
  { eventType: "PERFECT_RUN_BONUS", points: 5, descriptionFr: "Bonus : simulation complétée sans erreur" },
];

export function getScoringRule(eventType: string): ScoringRule | undefined {
  return MODULE1_SCORING.find((r) => r.eventType === eventType);
}

export function calculateTotalScore(events: Array<{ pointsDelta: number }>): number {
  const raw = events.reduce((sum, e) => sum + e.pointsDelta, 0);
  return Math.max(0, Math.min(100, raw)); // Clamp between 0 and 100
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "green" };
  if (score >= 75) return { label: "Bien", color: "blue" };
  if (score >= 60) return { label: "Satisfaisant", color: "orange" };
  return { label: "À améliorer", color: "red" };
}
