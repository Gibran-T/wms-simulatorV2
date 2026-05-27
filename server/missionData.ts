export interface MissionData {
  scenarioId: number;
  objective: string;
  context: string;
  role: string;
  module: string;
  controlPoints: string[];
  expectedOutcome: string;
  supervisorNotes: string;
  technicalSpecs: {
    sku: string;
    quantity: number;
    suggestedBin?: string;
  };
}

export const M1_MISSIONS: Record<number, MissionData> = {
  1: {
    scenarioId: 1,
    objective: "Exécution d'un flux logistique nominal complet (End-to-End).",
    context: "Concorde Logistics a reçu une commande standard. Vous devez assurer la réception, le rangement e l'expédition sans aucune anomalie système.",
    role: "Gestionnaire de Stocks",
    module: "WMS / ERP Core",
    controlPoints: [
      "Vérifier la disponibilité du bin de réception (REC-01).",
      "Valider la correspondance entre le Bon de Commande (PO) et la Réception (GR).",
      "Confirmer le rangement (Putaway) dans la zone de stockage."
    ],
    expectedOutcome: "Flux complété avec un inventaire final à zéro (flux tendu).",
    supervisorNotes: "Assurez-vous de respecter la séquence opérationnelle : PO -> GR -> Putaway -> SO -> Picking -> GI.",
    technicalSpecs: {
      sku: "SKU-001",
      quantity: 100,
      suggestedBin: "REC-01"
    }
  },
  2: {
    scenarioId: 2,
    objective: "Détection et résolution d'une anomalie de réception (Ghost GR).",
    context: "Le système affiche un Bon de Commande validé, mas le stock n'est pas apparu dans le bin de réception. Une étape administrative a été omise.",
    role: "Contrôleur Qualité Logistique",
    module: "Gestion des Anomalies ERP",
    controlPoints: [
      "Analyser le moniteur de transactions pour identifier les documents non postés.",
      "Vérifier l'état du bin REC-01 dans le cockpit opérationnel.",
      "Valider la transaction GR manquante pour débloquer le flux."
    ],
    expectedOutcome: "Régularisation du stock en réception et reprise du flux normal.",
    supervisorNotes: "Une 'Réception Fantôme' survient souvent quand le document physique est arrivé mais n'a pas été validé dans le WMS.",
    technicalSpecs: {
      sku: "SKU-001",
      quantity: 100,
      suggestedBin: "REC-01"
    }
  },
  3: {
    scenarioId: 3,
    objective: "Gestion d'une rupture de stock et réapprovisionnement d'urgence.",
    context: "Une commande client (SO) dépasse le stock disponible. Vous devez déclencher un approvisionnement pour satisfaire la demande.",
    role: "Responsable d'Opération",
    module: "Planification des Besoins",
    controlPoints: [
      "Identifier le déficit de stock via les alertes de niveau de service.",
      "Créer un Bon de Commande (PO) correctif.",
      "Réceptionner le stock manquant avant de procéder à l'expédition."
    ],
    expectedOutcome: "Satisfaction totale de la commande client après réapprovisionnement.",
    supervisorNotes: "Le taux de service est la priorité. Ne validez pas l'expédition (GI) tant que le stock n'est pas complet.",
    technicalSpecs: {
      sku: "SKU-001",
      quantity: 150,
      suggestedBin: "REC-01"
    }
  },
  4: {
    scenarioId: 4,
    objective: "Réconciliation d'inventaire suite à un écart physique/système.",
    context: "L'inventaire tournant a révélé une différence entre le stock théorique et le stock réel en bin. Un ajustement est nécessaire.",
    role: "Auditeur d'Inventaire",
    module: "Contrôle d'Intégrité",
    controlPoints: [
      "Comparer les résultats du Cycle Count avec le Cockpit.",
      "Identifier le bin présentant l'écart.",
      "Utiliser la transaction d'ajustement (ADJ) pour corriger le système."
    ],
    expectedOutcome: "Écart d'inventaire résolu et conformidade système rétablie.",
    supervisorNotes: "Tout ajustement (ADJ) doit être justifié par un comptage physique certifié.",
    technicalSpecs: {
      sku: "SKU-001",
      quantity: 15,
      suggestedBin: "STOCK-01"
    }
  },
  5: {
    scenarioId: 5,
    objective: "Résolution de non-conformités multiples en environnement complexe.",
    context: "Plusieurs incidents simultanés bloquent l'entrepôt : une réception non postée e um erro de comptage.",
    role: "Superviseur Logistique",
    module: "Gestion de Crise / Multi-Module",
    controlPoints: [
      "Prioriser les actions via le panneau de conformidade.",
      "Résoudre les anomalies documentaires avant les ajustements de stock.",
      "Rétablir le flux d'expédition pour les commandes prioritaires."
    ],
    expectedOutcome: "Entrepôt 100% conforme et flux d'expédition débloqué.",
    supervisorNotes: "En cas de crises multiples, suivez l'ordre logique : Documents -> Physique -> Expédition.",
    technicalSpecs: {
      sku: "SKU-001",
      quantity: 100
    }
  }
};
