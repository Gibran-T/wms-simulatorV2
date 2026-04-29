import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle, Lock, AlertTriangle, Info, FlaskConical, ChevronDown, ChevronUp, Database, BookOpen } from "lucide-react";
import GlossaryPage from "./GlossaryPage";
import FioriShell from "@/components/FioriShell";

// ─── STEP_CONFIG: All M1–M5 steps ────────────────────────────────────────────
const STEP_CONFIG: Record<string, {
  titleFr: string; titleEn: string; code: string; txCode: string;
  etapeFr: string; etapeEn: string;
  objectiveFr: string; objectiveEn: string;
  fields: string[]; tCode: string;
  binZoneHint?: { bin?: { fr: string; en: string }; fromBin?: { fr: string; en: string }; toBin?: { fr: string; en: string } };
  pedagogicalDeep: { whyFr: string; whyEn: string; realSAPFr: string; realSAPEn: string; dependencyFr: string; dependencyEn: string; realErrorFr: string; realErrorEn: string };
}> = {
  // ── Module 1 ──────────────────────────────────────────────────────────────
  po: {
    titleFr: "Bon de commande", titleEn: "Purchase Order", code: "PO", txCode: "ME21N", tCode: "ME21N",
    etapeFr: "Étape 1 sur 9", etapeEn: "Step 1 of 9",
    objectiveFr: "Créer une commande d'achat auprès d'un fournisseur. Le PO déclenche le processus d'approvisionnement et doit être validé avant toute réception.",
    objectiveEn: "Create a purchase order with a supplier. The PO triggers the procurement process and must be validated before any receipt.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    pedagogicalDeep: {
      whyFr: "Le Purchase Order (PO) est le document contractuel entre l'entreprise et le fournisseur. Sans PO, aucune réception ne peut être légalement enregistrée dans SAP.",
      whyEn: "The Purchase Order (PO) is the contractual document between the company and the supplier. Without a PO, no receipt can be legally recorded in SAP.",
      realSAPFr: "Dans SAP S/4HANA, la transaction ME21N crée un document PO avec numéro unique. Le système vérifie automatiquement les limites de crédit fournisseur, les contrats-cadres et les approbations.",
      realSAPEn: "In SAP S/4HANA, transaction ME21N creates a PO document with a unique number. The system automatically checks supplier credit limits, outline agreements, and approvals.",
      dependencyFr: "Le PO doit précéder le Goods Receipt (GR). Sans PO valide, la transaction MIGO (GR) ne peut pas référencer de document d'achat.",
      dependencyEn: "The PO must precede the Goods Receipt (GR). Without a valid PO, the MIGO (GR) transaction cannot reference a purchasing document.",
      realErrorFr: "Si un GR est créé sans PO, SAP génère une erreur 'No purchase order item found'. En production, cela bloquerait le paiement fournisseur.",
      realErrorEn: "If a GR is created without a PO, SAP generates a 'No purchase order item found' error. In production, this would block supplier payment.",
    }
  },
  gr: {
    titleFr: "Réception marchandises", titleEn: "Goods Receipt", code: "GR", txCode: "MIGO", tCode: "MIGO",
    etapeFr: "Étape 2 sur 9", etapeEn: "Step 2 of 9",
    objectiveFr: "Enregistrer la réception physique des marchandises dans la zone RÉCEPTION (REC-01 ou REC-02). Le stock est impacté uniquement si la transaction est postée.",
    objectiveEn: "Record the physical receipt of goods in the RECEPTION zone (REC-01 or REC-02). Stock is only impacted if the transaction is posted.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    binZoneHint: {
      bin: { fr: "Zone attendue : RÉCEPTION — utilisez REC-01 ou REC-02", en: "Expected zone: RECEPTION — use REC-01 or REC-02" },
    },
    pedagogicalDeep: {
      whyFr: "Le Goods Receipt (GR) est la confirmation physique que les marchandises commandées sont arrivées en entrepôt. C'est à ce moment que le stock augmente dans le système.",
      whyEn: "The Goods Receipt (GR) is the physical confirmation that ordered goods have arrived at the warehouse. This is when stock increases in the system.",
      realSAPFr: "Dans SAP, MIGO avec mouvement 101 crée un document matière et un document comptable. Le stock passe de 'en transit' à 'disponible'.",
      realSAPEn: "In SAP, MIGO with movement 101 creates a material document and an accounting document. Stock moves from 'in transit' to 'available'.",
      dependencyFr: "Le GR dépend d'un PO ouvert et non clôturé. La quantité reçue ne peut pas dépasser la quantité commandée. Le bin doit être en zone RÉCEPTION.",
      dependencyEn: "The GR depends on an open, unclosed PO. The received quantity cannot exceed the ordered quantity. The bin must be in the RECEPTION zone.",
      realErrorFr: "Un GR sans PO correspondant crée une 'réception non planifiée'. En audit, cela génère une exception de contrôle interne.",
      realErrorEn: "A GR without a corresponding PO creates an 'unplanned delivery'. In audit, this generates an internal control exception.",
    }
  },
  putaway_m1: {
    titleFr: "Rangement stock (LT0A)", titleEn: "Putaway to Stock (LT0A)", code: "PUTAWAY_M1", txCode: "LT0A", tCode: "LT0A",
    etapeFr: "Étape 3 sur 9", etapeEn: "Step 3 of 9",
    objectiveFr: "Transférer la marchandise reçue depuis la zone RÉCEPTION (REC-01/REC-02) vers son emplacement de stockage définitif (zone STOCKAGE). Sans cette étape, le stock reste en transit.",
    objectiveEn: "Transfer received goods from the RECEPTION zone (REC-01/REC-02) to their final storage location (STOCKAGE zone). Without this step, stock remains in transit.",
    fields: ["docRef", "sku", "fromBin", "toBin", "qty", "comment"],
    binZoneHint: {
      fromBin: { fr: "Zone source : RÉCEPTION (REC-01 ou REC-02) — marchandises venant d'être reçues", en: "Source zone: RECEPTION (REC-01 or REC-02) — recently received goods" },
      toBin: { fr: "Zone destination : STOCKAGE (B-01-R1-L1, B-01-R1-L2, B-02-R1-L1…) — emplacement définitif", en: "Destination zone: STOCKAGE (B-01-R1-L1, B-01-R1-L2, B-02-R1-L1…) — final storage" },
    },
    pedagogicalDeep: {
      whyFr: "Le putaway (LT0A dans SAP WM) est le transfert physique d'une marchandise depuis la zone de réception vers son emplacement de stockage définitif. Sans cette étape, le stock reste en zone de transit et ne peut pas être prélevé.",
      whyEn: "Putaway (LT0A in SAP WM) is the physical transfer of goods from the receiving zone to their final storage location. Without this step, stock remains in transit and cannot be picked.",
      realSAPFr: "Dans SAP WM, LT0A crée un ordre de transfert (Transfer Order) qui déplace le quant d'un emplacement source vers un emplacement destination. Le mouvement est visible dans LT23.",
      realSAPEn: "In SAP WM, LT0A creates a Transfer Order that moves a quant from a source location to a destination location. The movement is visible in LT23.",
      dependencyFr: "Le putaway ne peut s'effectuer qu'après une GR postée (mouvement 101). Le bin source doit être en zone RÉCEPTION, le bin destination en zone STOCKAGE.",
      dependencyEn: "Putaway can only be performed after a posted GR (movement 101). The source bin must be in the RECEPTION zone, the destination bin in the STOCKAGE zone.",
      realErrorFr: "Un putaway dans un bin plein crée un dépassement de capacité (capacity overflow) qui bloque les mouvements suivants et génère une alerte dans le WM cockpit.",
      realErrorEn: "A putaway into a full bin creates a capacity overflow that blocks subsequent movements and generates an alert in the WM cockpit.",
    }
  },
  stock: {
    titleFr: "Stock disponible (MB52)", titleEn: "Stock Available (MB52)", code: "STOCK", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 4 sur 9", etapeEn: "Step 4 of 9",
    objectiveFr: "Vérifier que le stock est disponible dans la zone STOCKAGE après le rangement. Cette étape est automatiquement validée après un putaway réussi.",
    objectiveEn: "Verify that stock is available in the STOCKAGE zone after putaway. This step is automatically validated after a successful putaway.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "La vérification du stock disponible (MB52) confirme que la marchandise est bien enregistrée dans le bon emplacement et disponible pour les prélèvements.",
      whyEn: "Available stock verification (MB52) confirms that goods are properly recorded in the correct location and available for picking.",
      realSAPFr: "Dans SAP, MB52 affiche le stock par entrepôt et emplacement. C'est la transaction de référence pour confirmer la disponibilité avant de créer un SO.",
      realSAPEn: "In SAP, MB52 displays stock by warehouse and location. It is the reference transaction to confirm availability before creating a SO.",
      dependencyFr: "Le stock disponible résulte directement du putaway réussi. Il est automatiquement mis à jour après LT0A.",
      dependencyEn: "Available stock results directly from a successful putaway. It is automatically updated after LT0A.",
      realErrorFr: "Un stock disponible à zéro après putaway indique une erreur de posting dans la GR ou un putaway dans le mauvais bin.",
      realErrorEn: "Zero available stock after putaway indicates a posting error in the GR or a putaway to the wrong bin.",
    }
  },
  so: {
    titleFr: "Commande client", titleEn: "Sales Order", code: "SO", txCode: "VA01", tCode: "VA01",
    etapeFr: "Étape 5 sur 9", etapeEn: "Step 5 of 9",
    objectiveFr: "Créer une commande client. Le SO ne peut être créé que si le stock disponible est supérieur à zéro dans la zone STOCKAGE.",
    objectiveEn: "Create a sales order. The SO can only be created if available stock is greater than zero in the STOCKAGE zone.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    binZoneHint: {
      bin: { fr: "Zone attendue : STOCKAGE — le stock doit être disponible dans cette zone", en: "Expected zone: STOCKAGE — stock must be available in this zone" },
    },
    pedagogicalDeep: {
      whyFr: "Le Sales Order (SO) est l'engagement de l'entreprise envers un client. Il déclenche la réservation de stock et le processus de livraison.",
      whyEn: "The Sales Order (SO) is the company's commitment to a customer. It triggers stock reservation and the delivery process.",
      realSAPFr: "Dans SAP, VA01 crée un ordre de vente avec vérification automatique de disponibilité (ATP). SAP vérifie le stock disponible, les réservations et les délais.",
      realSAPEn: "In SAP, VA01 creates a sales order with automatic availability check (ATP). SAP checks available stock, reservations, and lead times.",
      dependencyFr: "Le SO dépend d'un stock disponible positif (résultat du GR + putaway). Sans stock en zone STOCKAGE, SAP affiche un message de disponibilité insuffisante.",
      dependencyEn: "The SO depends on positive available stock (result of GR + putaway). Without stock in STOCKAGE zone, SAP displays an insufficient availability message.",
      realErrorFr: "Créer un SO sans stock disponible force une livraison partielle ou un backorder, générant des pénalités de retard client.",
      realErrorEn: "Creating a SO without available stock forces a partial delivery or backorder, generating customer delay penalties.",
    }
  },
  picking_m1: {
    titleFr: "Prélèvement expédition (VL01N)", titleEn: "Picking to Dispatch (VL01N)", code: "PICKING_M1", txCode: "VL01N", tCode: "VL01N",
    etapeFr: "Étape 6 sur 9", etapeEn: "Step 6 of 9",
    objectiveFr: "Prélever la marchandise depuis la zone STOCKAGE et la déplacer vers la zone EXPÉDITION (EXP-01/EXP-02). Cette étape prépare la sortie physique des marchandises.",
    objectiveEn: "Pick goods from the STOCKAGE zone and move them to the EXPÉDITION zone (EXP-01/EXP-02). This step prepares the physical outbound of goods.",
    fields: ["docRef", "sku", "fromBin", "toBin", "qty", "comment"],
    binZoneHint: {
      fromBin: { fr: "Zone source : STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — marchandises en stock", en: "Source zone: STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — goods in storage" },
      toBin: { fr: "Zone destination : EXPÉDITION (EXP-01 ou EXP-02) — zone de départ client", en: "Destination zone: EXPÉDITION (EXP-01 or EXP-02) — outbound dispatch zone" },
    },
    pedagogicalDeep: {
      whyFr: "Le picking (VL01N dans SAP WM) est le prélèvement physique des marchandises depuis leur emplacement de stockage vers la zone d'expédition. Il précède obligatoirement la sortie de marchandises (GI).",
      whyEn: "Picking (VL01N in SAP WM) is the physical retrieval of goods from their storage location to the dispatch zone. It must precede the Goods Issue (GI).",
      realSAPFr: "Dans SAP, VL01N crée un ordre de livraison sortant (Outbound Delivery). Le picking est confirmé via LT0A ou VL02N avant la validation GI.",
      realSAPEn: "In SAP, VL01N creates an Outbound Delivery. Picking is confirmed via LT0A or VL02N before GI validation.",
      dependencyFr: "Le picking dépend d'un SO confirmé et d'un stock disponible dans la zone STOCKAGE. Le bin source doit être STOCKAGE, le bin destination EXPÉDITION.",
      dependencyEn: "Picking depends on a confirmed SO and available stock in the STOCKAGE zone. The source bin must be STOCKAGE, the destination bin EXPÉDITION.",
      realErrorFr: "Prélever depuis la mauvaise zone (ex: RÉCEPTION au lieu de STOCKAGE) crée un écart de localisation qui bloque la GI.",
      realErrorEn: "Picking from the wrong zone (e.g., RECEPTION instead of STOCKAGE) creates a location discrepancy that blocks the GI.",
    }
  },
  gi: {
    titleFr: "Sortie de stock", titleEn: "Goods Issue", code: "GI", txCode: "VL02N", tCode: "VL02N",
    etapeFr: "Étape 7 sur 9", etapeEn: "Step 7 of 9",
    objectiveFr: "Émettre les marchandises pour le client depuis la zone EXPÉDITION. Le GI déduit le stock et génère le mouvement 601.",
    objectiveEn: "Issue goods to the customer from the EXPÉDITION zone. The GI deducts stock and generates movement 601.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    binZoneHint: {
      bin: { fr: "Zone attendue : EXPÉDITION (EXP-01 ou EXP-02) — marchandises prêtes à partir", en: "Expected zone: EXPÉDITION (EXP-01 or EXP-02) — goods ready to ship" },
    },
    pedagogicalDeep: {
      whyFr: "Le Goods Issue (GI) est la sortie physique des marchandises de l'entrepôt vers le client. Il réduit le stock et transfère la propriété légale au client.",
      whyEn: "The Goods Issue (GI) is the physical departure of goods from the warehouse to the customer. It reduces stock and transfers legal ownership to the customer.",
      realSAPFr: "Dans SAP, VL02N avec mouvement 601 crée un document matière de sortie et un document comptable débitant le compte COGS.",
      realSAPEn: "In SAP, VL02N with movement 601 creates an outgoing material document and an accounting document debiting the COGS account.",
      dependencyFr: "Le GI dépend d'un SO confirmé, d'un picking complété, et d'un stock suffisant dans la zone EXPÉDITION.",
      dependencyEn: "The GI depends on a confirmed SO, a completed picking, and sufficient stock in the EXPÉDITION zone.",
      realErrorFr: "Un GI avec stock insuffisant crée un stock négatif dans SAP. En audit, un stock négatif est une anomalie critique.",
      realErrorEn: "A GI with insufficient stock creates negative stock in SAP. In audit, negative stock is a critical anomaly.",
    }
  },
  cc: {
    titleFr: "Comptage inventaire", titleEn: "Cycle Count", code: "CC", txCode: "MI01", tCode: "MI01",
    etapeFr: "Étape 8 sur 9", etapeEn: "Step 8 of 9",
    objectiveFr: "Compter physiquement les marchandises et comparer au stock système. Tout écart doit être résolu par un ajustement (ADJ).",
    objectiveEn: "Physically count goods and compare to system stock. Any variance must be resolved by an adjustment (ADJ).",
    fields: ["sku", "bin", "physicalQty", "comment"],
    pedagogicalDeep: {
      whyFr: "Le Cycle Count est une méthode d'inventaire tournant qui permet de vérifier régulièrement l'exactitude du stock sans arrêter les opérations.",
      whyEn: "Cycle Count is a rotating inventory method that allows regular verification of stock accuracy without stopping operations.",
      realSAPFr: "Dans SAP, MI01 crée un document d'inventaire. MI04 enregistre le comptage physique. MI07 valide les différences et génère les ajustements.",
      realSAPEn: "In SAP, MI01 creates an inventory document. MI04 records the physical count. MI07 validates differences and generates adjustments.",
      dependencyFr: "Le Cycle Count doit être effectué après les transactions GR et GI pour avoir un état de stock stable.",
      dependencyEn: "The Cycle Count must be performed after GR and GI transactions to have a stable stock state.",
      realErrorFr: "Une variance non résolue lors de la clôture mensuelle crée un écart entre le stock WMS et la comptabilité.",
      realErrorEn: "An unresolved variance during monthly closing creates a discrepancy between WMS stock and accounting.",
    }
  },
  adj: {
    titleFr: "Ajustement inventaire", titleEn: "Inventory Adjustment", code: "ADJ", txCode: "MI07", tCode: "MI07",
    etapeFr: "Étape 8b sur 9", etapeEn: "Step 8b of 9",
    objectiveFr: "Corriger les écarts d'inventaire détectés lors du Cycle Count. L'ajustement est obligatoire avant la clôture.",
    objectiveEn: "Correct inventory variances detected during Cycle Count. Adjustment is mandatory before closing.",
    fields: ["sku", "bin", "qty", "comment"],
    pedagogicalDeep: {
      whyFr: "L'ajustement d'inventaire (ADJ) est la correction officielle d'un écart constaté lors du comptage. Il synchronise le stock système avec la réalité physique.",
      whyEn: "The inventory adjustment (ADJ) is the official correction of a variance found during counting. It synchronizes system stock with physical reality.",
      realSAPFr: "Dans SAP, MI07 valide le document d'inventaire et génère automatiquement les mouvements de correction (mouvement 701/702).",
      realSAPEn: "In SAP, MI07 validates the inventory document and automatically generates correction movements (movement 701/702).",
      dependencyFr: "L'ADJ dépend d'un document de Cycle Count (MI01) avec une variance détectée. Il doit être approuvé par un responsable entrepôt.",
      dependencyEn: "The ADJ depends on a Cycle Count document (MI01) with a detected variance. It must be approved by a warehouse manager.",
      realErrorFr: "Un ADJ non effectué après un Cycle Count laisse une variance ouverte dans SAP. Les états financiers seraient incorrects.",
      realErrorEn: "An ADJ not performed after a Cycle Count leaves an open variance in SAP. Financial statements would be incorrect.",
    }
  },
  compliance: {
    titleFr: "Conformité Système", titleEn: "System Compliance", code: "COMPLIANCE", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 9 sur 9", etapeEn: "Step 9 of 9",
    objectiveFr: "Valider la conformité complète du système. Tous les indicateurs doivent être au vert : aucune transaction non postée, aucun stock négatif, aucun écart non résolu.",
    objectiveEn: "Validate complete system compliance. All indicators must be green: no unposted transactions, no negative stock, no unresolved variances.",
    fields: ["comment"],
    pedagogicalDeep: {
      whyFr: "La validation de conformité est la clôture officielle du cycle logistique. Elle confirme que toutes les transactions sont cohérentes et que le système est prêt pour la période suivante.",
      whyEn: "Compliance validation is the official closing of the logistics cycle. It confirms all transactions are consistent and the system is ready for the next period.",
      realSAPFr: "Dans SAP, MB52 permet de consulter l'état du stock par entrepôt. La clôture de période (MMPV) vérifie que tous les documents sont comptabilisés.",
      realSAPEn: "In SAP, MB52 allows viewing stock status by warehouse. Period closing (MMPV) verifies all documents are posted.",
      dependencyFr: "La conformité dépend de la résolution de toutes les variances (ADJ), de la comptabilisation de toutes les transactions, et de l'absence de stock négatif.",
      dependencyEn: "Compliance depends on resolving all variances (ADJ), posting all transactions, and the absence of negative stock.",
      realErrorFr: "Une clôture de période avec des transactions non conformes crée des erreurs de réconciliation entre WMS, MM et FI.",
      realErrorEn: "A period closing with non-compliant transactions creates reconciliation errors between WMS, MM, and FI.",
    }
  },

  // ── Module 2 ──────────────────────────────────────────────────────────────
  fifo_pick: {
    titleFr: "Prélèvement FIFO (LT0A)", titleEn: "FIFO Picking (LT0A)", code: "FIFO_PICK", txCode: "LT0A", tCode: "LT0A",
    etapeFr: "Étape 3 sur 5", etapeEn: "Step 3 of 5",
    objectiveFr: "Prélever le lot le plus ancien en premier (First In, First Out). Saisissez le numéro de lot, le bin source (STOCKAGE) et le bin destination (EXPÉDITION).",
    objectiveEn: "Pick the oldest lot first (First In, First Out). Enter the lot number, source bin (STOCKAGE) and destination bin (EXPÉDITION).",
    fields: ["sku", "fromBin", "toBin", "qty", "lotNumber"],
    binZoneHint: {
      fromBin: { fr: "Zone source : STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — prélevez le lot le plus ancien", en: "Source zone: STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — pick the oldest lot" },
      toBin: { fr: "Zone destination : EXPÉDITION (EXP-01 ou EXP-02) — zone de départ client", en: "Destination zone: EXPÉDITION (EXP-01 or EXP-02) — outbound dispatch zone" },
    },
    pedagogicalDeep: {
      whyFr: "FIFO (First In, First Out) est la méthode de gestion des lots qui garantit que les marchandises les plus anciennes sont expédiées en premier. Cela prévient les péremptions et les pertes.",
      whyEn: "FIFO (First In, First Out) is the lot management method that ensures the oldest goods are shipped first. This prevents expiry and losses.",
      realSAPFr: "Dans SAP WM, la stratégie de prélèvement FIFO est configurée dans le type de stockage. Le système propose automatiquement le lot le plus ancien lors de la création d'un ordre de transfert.",
      realSAPEn: "In SAP WM, the FIFO picking strategy is configured in the storage type. The system automatically proposes the oldest lot when creating a transfer order.",
      dependencyFr: "Le prélèvement FIFO dépend de l'enregistrement correct des lots lors de la réception (GR avec numéro de lot). Sans traçabilité lot, FIFO ne peut pas être appliqué.",
      dependencyEn: "FIFO picking depends on correct lot recording during receipt (GR with lot number). Without lot traceability, FIFO cannot be applied.",
      realErrorFr: "Prélever un lot plus récent avant un lot plus ancien (violation FIFO) peut entraîner des produits périmés en stock et des non-conformités réglementaires.",
      realErrorEn: "Picking a newer lot before an older one (FIFO violation) can lead to expired products in stock and regulatory non-compliance.",
    }
  },
  stock_accuracy: {
    titleFr: "Précision inventaire (MI04)", titleEn: "Stock Accuracy (MI04)", code: "STOCK_ACCURACY", txCode: "MI04", tCode: "MI04",
    etapeFr: "Étape 4 sur 5", etapeEn: "Step 4 of 5",
    objectiveFr: "Comparer le stock système avec le comptage physique pour calculer le taux de précision inventaire (SA%). Saisissez la quantité système et la quantité comptée.",
    objectiveEn: "Compare system stock with physical count to calculate inventory accuracy rate (SA%). Enter the system quantity and counted quantity.",
    fields: ["sku", "systemQty", "countedQty"],
    pedagogicalDeep: {
      whyFr: "La précision inventaire (Stock Accuracy) mesure l'écart entre le stock théorique (système) et le stock réel (physique). Un SA% > 98% est l'objectif standard en entrepôt.",
      whyEn: "Stock Accuracy measures the gap between theoretical (system) stock and actual (physical) stock. An SA% > 98% is the standard warehouse target.",
      realSAPFr: "Dans SAP, MI04 enregistre le comptage physique. Le système calcule automatiquement la variance et génère un rapport d'écart. MI07 valide les ajustements.",
      realSAPEn: "In SAP, MI04 records the physical count. The system automatically calculates the variance and generates a discrepancy report. MI07 validates adjustments.",
      dependencyFr: "La précision inventaire est calculée après chaque cycle de comptage. Elle dépend de la qualité des transactions GR, GI et des putaways précédents.",
      dependencyEn: "Stock accuracy is calculated after each counting cycle. It depends on the quality of previous GR, GI and putaway transactions.",
      realErrorFr: "Un SA% < 95% déclenche une alerte de contrôle interne et peut bloquer les expéditions si le stock disponible est inférieur aux commandes.",
      realErrorEn: "An SA% < 95% triggers an internal control alert and may block shipments if available stock is below orders.",
    }
  },
  compliance_adv: {
    titleFr: "Conformité Avancée M2", titleEn: "Advanced Compliance M2", code: "COMPLIANCE_ADV", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 5 sur 5", etapeEn: "Step 5 of 5",
    objectiveFr: "Valider la conformité du module 2 : FIFO respecté, précision inventaire calculée, traçabilité des lots complète.",
    objectiveEn: "Validate Module 2 compliance: FIFO respected, inventory accuracy calculated, lot traceability complete.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "La conformité avancée M2 vérifie que les principes FIFO/FEFO ont été respectés, que la précision inventaire est documentée et que la traçabilité des lots est complète.",
      whyEn: "Advanced M2 compliance verifies that FIFO/FEFO principles were respected, inventory accuracy is documented, and lot traceability is complete.",
      realSAPFr: "Dans SAP, les rapports de conformité FIFO sont générés via MB51 (liste des mouvements de matières) et LT23 (liste des ordres de transfert).",
      realSAPEn: "In SAP, FIFO compliance reports are generated via MB51 (material movement list) and LT23 (transfer order list).",
      dependencyFr: "La conformité M2 dépend de la réussite des étapes FIFO_PICK et STOCK_ACCURACY. Toutes les variances doivent être documentées.",
      dependencyEn: "M2 compliance depends on successful FIFO_PICK and STOCK_ACCURACY steps. All variances must be documented.",
      realErrorFr: "Une non-conformité FIFO lors d'un audit ISO peut entraîner une suspension de certification et des pénalités contractuelles.",
      realErrorEn: "A FIFO non-compliance during an ISO audit can lead to certification suspension and contractual penalties.",
    }
  },

  // ── Module 3 ──────────────────────────────────────────────────────────────
  cc_list: {
    titleFr: "Liste de comptage (MI01)", titleEn: "Count List (MI01)", code: "CC_LIST", txCode: "MI01", tCode: "MI01",
    etapeFr: "Étape 1 sur 5", etapeEn: "Step 1 of 5",
    objectiveFr: "Générer la liste des SKUs à compter pour l'inventaire tournant. Sélectionnez au moins un SKU à inclure dans le cycle de comptage.",
    objectiveEn: "Generate the list of SKUs to count for cycle counting. Select at least one SKU to include in the counting cycle.",
    fields: ["skuList"],
    pedagogicalDeep: {
      whyFr: "La liste de comptage (MI01) est le document de départ du cycle count. Elle définit quels articles seront comptés, dans quel ordre et par qui.",
      whyEn: "The count list (MI01) is the starting document for cycle counting. It defines which items will be counted, in what order, and by whom.",
      realSAPFr: "Dans SAP, MI01 crée un document d'inventaire avec un numéro unique. Les articles sont bloqués pour les mouvements pendant le comptage.",
      realSAPEn: "In SAP, MI01 creates an inventory document with a unique number. Items are blocked for movements during counting.",
      dependencyFr: "La liste de comptage doit être créée avant tout comptage physique. Elle est le référentiel pour valider les résultats.",
      dependencyEn: "The count list must be created before any physical counting. It is the reference for validating results.",
      realErrorFr: "Compter des articles sans document MI01 crée des ajustements non traçables qui seront rejetés lors de l'audit.",
      realErrorEn: "Counting items without an MI01 document creates untraceable adjustments that will be rejected during audit.",
    }
  },
  cc_count: {
    titleFr: "Comptage physique (MI04)", titleEn: "Physical Count (MI04)", code: "CC_COUNT", txCode: "MI04", tCode: "MI04",
    etapeFr: "Étape 2 sur 5", etapeEn: "Step 2 of 5",
    objectiveFr: "Enregistrer les quantités physiques comptées pour chaque SKU/Bin. Comparez avec le stock système pour identifier les variances.",
    objectiveEn: "Record the physical quantities counted for each SKU/Bin. Compare with system stock to identify variances.",
    fields: ["sku", "bin", "systemQty", "countedQty"],
    pedagogicalDeep: {
      whyFr: "Le comptage physique (MI04) est l'enregistrement des quantités réelles trouvées en entrepôt. C'est la base de la réconciliation stock.",
      whyEn: "Physical counting (MI04) is the recording of actual quantities found in the warehouse. It is the basis for stock reconciliation.",
      realSAPFr: "Dans SAP, MI04 enregistre le résultat du comptage. Le système calcule automatiquement la variance (quantité comptée - quantité système).",
      realSAPEn: "In SAP, MI04 records the counting result. The system automatically calculates the variance (counted quantity - system quantity).",
      dependencyFr: "Le comptage physique dépend d'un document MI01 ouvert. Les articles doivent être bloqués pour les mouvements pendant le comptage.",
      dependencyEn: "Physical counting depends on an open MI01 document. Items must be blocked for movements during counting.",
      realErrorFr: "Un comptage effectué pendant des mouvements actifs (réceptions, expéditions) crée des variances artificielles non représentatives.",
      realErrorEn: "Counting performed during active movements (receipts, shipments) creates artificial variances that are not representative.",
    }
  },
  cc_recon: {
    titleFr: "Réconciliation (MI07)", titleEn: "Reconciliation (MI07)", code: "CC_RECON", txCode: "MI07", tCode: "MI07",
    etapeFr: "Étape 3 sur 5", etapeEn: "Step 3 of 5",
    objectiveFr: "Valider et justifier les ajustements d'inventaire. Pour chaque variance détectée, saisissez la quantité d'ajustement et la justification.",
    objectiveEn: "Validate and justify inventory adjustments. For each detected variance, enter the adjustment quantity and justification.",
    fields: ["sku", "bin", "varianceQty", "justification"],
    pedagogicalDeep: {
      whyFr: "La réconciliation (MI07) est la validation officielle des écarts d'inventaire. Elle génère les mouvements de correction et met à jour le stock système.",
      whyEn: "Reconciliation (MI07) is the official validation of inventory variances. It generates correction movements and updates system stock.",
      realSAPFr: "Dans SAP, MI07 valide le document d'inventaire et génère automatiquement les mouvements 701 (surplus) ou 702 (manquant). Un responsable doit approuver les ajustements importants.",
      realSAPEn: "In SAP, MI07 validates the inventory document and automatically generates movements 701 (surplus) or 702 (shortage). A manager must approve significant adjustments.",
      dependencyFr: "La réconciliation dépend d'un comptage physique (MI04) complété. Les ajustements doivent être justifiés et approuvés.",
      dependencyEn: "Reconciliation depends on a completed physical count (MI04). Adjustments must be justified and approved.",
      realErrorFr: "Des ajustements non justifiés lors d'un audit SOX peuvent entraîner des retraitements financiers et des sanctions réglementaires.",
      realErrorEn: "Unjustified adjustments during a SOX audit can lead to financial restatements and regulatory sanctions.",
    }
  },
  replenish: {
    titleFr: "Réapprovisionnement (ME21N)", titleEn: "Replenishment (ME21N)", code: "REPLENISH", txCode: "ME21N", tCode: "ME21N",
    etapeFr: "Étape 4 sur 5", etapeEn: "Step 4 of 5",
    objectiveFr: "Calculer la quantité de réapprovisionnement optimale. Saisissez le stock actuel, le min/max et le stock de sécurité pour obtenir la suggestion système.",
    objectiveEn: "Calculate the optimal replenishment quantity. Enter current stock, min/max and safety stock to get the system suggestion.",
    fields: ["sku", "systemQty", "minQty", "maxQty", "safetyStock", "studentQty"],
    pedagogicalDeep: {
      whyFr: "Le réapprovisionnement automatique (MRP dans SAP) calcule les besoins en stock basés sur le point de commande (ROP), le stock de sécurité et la quantité économique de commande (EOQ).",
      whyEn: "Automatic replenishment (MRP in SAP) calculates stock needs based on the reorder point (ROP), safety stock, and economic order quantity (EOQ).",
      realSAPFr: "Dans SAP, MD01 (MRP) ou ME21N (PO manuel) génèrent les ordres de réapprovisionnement. Le système calcule automatiquement la quantité basée sur les paramètres MRP.",
      realSAPEn: "In SAP, MD01 (MRP) or ME21N (manual PO) generate replenishment orders. The system automatically calculates the quantity based on MRP parameters.",
      dependencyFr: "Le réapprovisionnement dépend des paramètres MRP configurés (stock min, stock max, stock de sécurité, délai fournisseur). Ces paramètres sont définis dans MM02.",
      dependencyEn: "Replenishment depends on configured MRP parameters (min stock, max stock, safety stock, supplier lead time). These parameters are defined in MM02.",
      realErrorFr: "Un réapprovisionnement trop tardif (stock < stock de sécurité) crée une rupture de stock et des arrêts de production ou des pertes de ventes.",
      realErrorEn: "Late replenishment (stock < safety stock) creates a stockout and production stoppages or lost sales.",
    }
  },
  compliance_m3: {
    titleFr: "Conformité Module 3", titleEn: "Module 3 Compliance", code: "COMPLIANCE_M3", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 5 sur 5", etapeEn: "Step 5 of 5",
    objectiveFr: "Valider la conformité du module 3 : cycle count complété, variances réconciliées, réapprovisionnement planifié.",
    objectiveEn: "Validate Module 3 compliance: cycle count completed, variances reconciled, replenishment planned.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "La conformité M3 valide que le cycle de contrôle des stocks est complet : comptage, réconciliation et réapprovisionnement sont tous documentés et approuvés.",
      whyEn: "M3 compliance validates that the stock control cycle is complete: counting, reconciliation and replenishment are all documented and approved.",
      realSAPFr: "Dans SAP, le rapport de clôture d'inventaire (MI20) liste tous les documents d'inventaire et leur statut. La clôture de période (MMPV) finalise les ajustements.",
      realSAPEn: "In SAP, the inventory closing report (MI20) lists all inventory documents and their status. Period closing (MMPV) finalizes adjustments.",
      dependencyFr: "La conformité M3 dépend de la réussite de CC_LIST, CC_COUNT, CC_RECON et REPLENISH. Toutes les variances doivent être réconciliées.",
      dependencyEn: "M3 compliance depends on successful CC_LIST, CC_COUNT, CC_RECON and REPLENISH steps. All variances must be reconciled.",
      realErrorFr: "Une clôture M3 avec des variances ouvertes bloque la clôture comptable mensuelle et génère des écarts dans les états financiers.",
      realErrorEn: "An M3 closing with open variances blocks the monthly accounting close and generates discrepancies in financial statements.",
    }
  },

  // ── Module 4 ──────────────────────────────────────────────────────────────
  kpi_data: {
    titleFr: "Saisie données KPI", titleEn: "KPI Data Entry", code: "KPI_DATA", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 1 sur 5", etapeEn: "Step 1 of 5",
    objectiveFr: "Reconnaître les données KPI fournies pour le module 4. Les données de référence sont : consommation annuelle 2400 unités, stock moyen 400, commandes livrées 285/300, erreurs 12/300 opérations.",
    objectiveEn: "Acknowledge the KPI data provided for Module 4. Reference data: annual consumption 2400 units, average stock 400, orders delivered 285/300, errors 12/300 operations.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "Les KPI logistiques (Key Performance Indicators) sont les indicateurs clés qui mesurent la performance d'un entrepôt. Ils permettent d'identifier les axes d'amélioration.",
      whyEn: "Logistics KPIs (Key Performance Indicators) are the key indicators that measure warehouse performance. They allow identifying areas for improvement.",
      realSAPFr: "Dans SAP, les KPI sont extraits via des rapports standard (MB52, VL06O, ME2M) ou des tableaux de bord personnalisés dans SAP Analytics Cloud.",
      realSAPEn: "In SAP, KPIs are extracted via standard reports (MB52, VL06O, ME2M) or custom dashboards in SAP Analytics Cloud.",
      dependencyFr: "Les KPI dépendent de la qualité et de l'exhaustivité des transactions enregistrées dans le WMS. Des transactions manquantes faussent les indicateurs.",
      dependencyEn: "KPIs depend on the quality and completeness of transactions recorded in the WMS. Missing transactions distort indicators.",
      realErrorFr: "Des KPI calculés sur des données incomplètes conduisent à de mauvaises décisions managériales et à des investissements mal ciblés.",
      realErrorEn: "KPIs calculated on incomplete data lead to poor management decisions and poorly targeted investments.",
    }
  },
  kpi_rotation: {
    titleFr: "Taux de rotation (DSI)", titleEn: "Rotation Rate (DSI)", code: "KPI_ROTATION", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 2 sur 5", etapeEn: "Step 2 of 5",
    objectiveFr: "Interpréter le taux de rotation des stocks. Données : consommation annuelle 2400, stock moyen 400. Taux = 2400/400 = 6. Analysez si ce résultat indique un surstock, une performance normale ou une sous-performance.",
    objectiveEn: "Interpret the stock rotation rate. Data: annual consumption 2400, average stock 400. Rate = 2400/400 = 6. Analyze whether this result indicates overstock, normal performance, or underperformance.",
    fields: ["studentAnswer"],
    pedagogicalDeep: {
      whyFr: "Le taux de rotation (Inventory Turnover) mesure combien de fois le stock est renouvelé par an. Un taux élevé indique une gestion efficace ; un taux faible indique un surstock coûteux.",
      whyEn: "The rotation rate (Inventory Turnover) measures how many times stock is renewed per year. A high rate indicates efficient management; a low rate indicates costly overstock.",
      realSAPFr: "Dans SAP, le taux de rotation est calculé via MB52 (stock moyen) et MB51 (consommation). Le DSI (Days of Supply) = 365 / taux de rotation.",
      realSAPEn: "In SAP, the rotation rate is calculated via MB52 (average stock) and MB51 (consumption). DSI (Days of Supply) = 365 / rotation rate.",
      dependencyFr: "Le taux de rotation dépend de la précision du stock moyen (MB52) et de la consommation réelle (MB51). Des erreurs d'inventaire faussent ce KPI.",
      dependencyEn: "The rotation rate depends on the accuracy of average stock (MB52) and actual consumption (MB51). Inventory errors distort this KPI.",
      realErrorFr: "Un taux de rotation de 6 avec un objectif de 8-12 indique un surstock. En pratique, cela représente 60 jours de stock (DSI=60) au lieu de 30-45 jours optimal.",
      realErrorEn: "A rotation rate of 6 with a target of 8-12 indicates overstock. In practice, this represents 60 days of stock (DSI=60) instead of the optimal 30-45 days.",
    }
  },
  kpi_service: {
    titleFr: "Taux de service (OTIF)", titleEn: "Service Level (OTIF)", code: "KPI_SERVICE", txCode: "VL06O", tCode: "VL06O",
    etapeFr: "Étape 3 sur 5", etapeEn: "Step 3 of 5",
    objectiveFr: "Interpréter le taux de service. Données : 285 commandes livrées sur 300 = 95%. Analysez si ce résultat est excellent, acceptable ou insuffisant selon les standards industrie.",
    objectiveEn: "Interpret the service level. Data: 285 orders delivered out of 300 = 95%. Analyze whether this result is excellent, acceptable, or insufficient according to industry standards.",
    fields: ["studentAnswer"],
    pedagogicalDeep: {
      whyFr: "Le taux de service (OTIF - On Time In Full) mesure le pourcentage de commandes livrées complètement et à temps. C'est le KPI client le plus important.",
      whyEn: "The service level (OTIF - On Time In Full) measures the percentage of orders delivered completely and on time. It is the most important customer KPI.",
      realSAPFr: "Dans SAP, le taux de service est calculé via VL06O (liste des livraisons) et SD-BIL (facturation). Le Fill Rate mesure la complétude des livraisons.",
      realSAPEn: "In SAP, the service level is calculated via VL06O (delivery list) and SD-BIL (billing). Fill Rate measures delivery completeness.",
      dependencyFr: "Le taux de service dépend de la disponibilité du stock (ATP), de la précision du picking et de la performance logistique des transporteurs.",
      dependencyEn: "The service level depends on stock availability (ATP), picking accuracy, and carrier logistics performance.",
      realErrorFr: "Un taux de service de 95% signifie 15 commandes non livrées sur 300. En B2B, chaque commande manquée peut entraîner des pénalités contractuelles de 1-5% de la valeur.",
      realErrorEn: "A 95% service level means 15 undelivered orders out of 300. In B2B, each missed order can incur contractual penalties of 1-5% of the value.",
    }
  },
  kpi_diagnostic: {
    titleFr: "Diagnostic opérationnel", titleEn: "Operational Diagnostic", code: "KPI_DIAGNOSTIC", txCode: "LT23", tCode: "LT23",
    etapeFr: "Étape 4 sur 5", etapeEn: "Step 4 of 5",
    objectiveFr: "Formuler un diagnostic global basé sur tous les KPIs. Taux de rotation 6 (surstock), service 95% (acceptable), erreurs 4% (à améliorer). Proposez un plan d'action prioritaire.",
    objectiveEn: "Formulate a global diagnostic based on all KPIs. Rotation rate 6 (overstock), service 95% (acceptable), errors 4% (to improve). Propose a priority action plan.",
    fields: ["studentAnswer"],
    pedagogicalDeep: {
      whyFr: "Le diagnostic opérationnel synthétise tous les KPIs pour identifier les priorités d'amélioration. Il doit être structuré (problème → cause → solution → impact).",
      whyEn: "The operational diagnostic synthesizes all KPIs to identify improvement priorities. It must be structured (problem → cause → solution → impact).",
      realSAPFr: "Dans SAP, les tableaux de bord KPI sont disponibles dans SAP Analytics Cloud ou via des requêtes BW/BI personnalisées. Le Balanced Scorecard structure les KPIs en 4 axes.",
      realSAPEn: "In SAP, KPI dashboards are available in SAP Analytics Cloud or via custom BW/BI queries. The Balanced Scorecard structures KPIs across 4 axes.",
      dependencyFr: "Le diagnostic dépend de la compréhension de tous les KPIs précédents (rotation, service, erreurs). Un bon diagnostic identifie les causes racines, pas seulement les symptômes.",
      dependencyEn: "The diagnostic depends on understanding all previous KPIs (rotation, service, errors). A good diagnostic identifies root causes, not just symptoms.",
      realErrorFr: "Un diagnostic superficiel (ex: 'améliorer le service') sans analyse de cause racine conduit à des actions correctives inefficaces et coûteuses.",
      realErrorEn: "A superficial diagnostic (e.g., 'improve service') without root cause analysis leads to ineffective and costly corrective actions.",
    }
  },
  compliance_m4: {
    titleFr: "Conformité Module 4", titleEn: "Module 4 Compliance", code: "COMPLIANCE_M4", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 5 sur 5", etapeEn: "Step 5 of 5",
    objectiveFr: "Valider la conformité du module 4 : KPIs calculés, interprétations documentées, diagnostic et plan d'action formulés.",
    objectiveEn: "Validate Module 4 compliance: KPIs calculated, interpretations documented, diagnostic and action plan formulated.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "La conformité M4 valide que l'analyse KPI est complète : données saisies, taux calculés, interprétations justifiées et diagnostic actionnable.",
      whyEn: "M4 compliance validates that the KPI analysis is complete: data entered, rates calculated, interpretations justified, and actionable diagnostic.",
      realSAPFr: "Dans SAP, le rapport de performance logistique est généré via SAP Analytics Cloud ou des rapports BW personnalisés. Il est présenté lors des revues de direction mensuelles.",
      realSAPEn: "In SAP, the logistics performance report is generated via SAP Analytics Cloud or custom BW reports. It is presented during monthly management reviews.",
      dependencyFr: "La conformité M4 dépend de la réussite de KPI_DATA, KPI_ROTATION, KPI_SERVICE et KPI_DIAGNOSTIC. Toutes les interprétations doivent être documentées.",
      dependencyEn: "M4 compliance depends on successful KPI_DATA, KPI_ROTATION, KPI_SERVICE and KPI_DIAGNOSTIC steps. All interpretations must be documented.",
      realErrorFr: "Des KPIs non interprétés dans un rapport de direction sont une non-conformité de gouvernance qui peut être signalée lors d'un audit ISO 9001.",
      realErrorEn: "Uninterpreted KPIs in a management report are a governance non-compliance that may be flagged during an ISO 9001 audit.",
    }
  },

  // ── Module 5 ──────────────────────────────────────────────────────────────
  m5_reception: {
    titleFr: "Réception M5 (MIGO)", titleEn: "M5 Reception (MIGO)", code: "M5_RECEPTION", txCode: "MIGO", tCode: "MIGO",
    etapeFr: "Étape 1 sur 7", etapeEn: "Step 1 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 1 : Réceptionner les marchandises fournisseur. Saisissez le SKU, la quantité et le numéro de document.",
    objectiveEn: "M5 Integrated Simulation — Step 1: Receive supplier goods. Enter the SKU, quantity and document number.",
    fields: ["docRef", "sku", "qty"],
    pedagogicalDeep: {
      whyFr: "La simulation intégrée M5 reproduit un cycle complet d'opérations entrepôt en conditions réelles. Chaque étape dépend des précédentes, comme dans un vrai WMS.",
      whyEn: "The M5 integrated simulation reproduces a complete warehouse operations cycle under real conditions. Each step depends on the previous ones, as in a real WMS.",
      realSAPFr: "Dans SAP S/4HANA, la réception (MIGO/101) est la première transaction du cycle logistique. Elle crée un document matière et met à jour le stock en temps réel.",
      realSAPEn: "In SAP S/4HANA, receipt (MIGO/101) is the first transaction in the logistics cycle. It creates a material document and updates stock in real time.",
      dependencyFr: "La réception M5 est le point de départ de la simulation. Elle doit être postée correctement pour que les étapes suivantes (putaway, cycle count) puissent s'exécuter.",
      dependencyEn: "M5 reception is the starting point of the simulation. It must be posted correctly for subsequent steps (putaway, cycle count) to execute.",
      realErrorFr: "Une réception avec un SKU incorrect ou une quantité erronée crée une chaîne d'erreurs dans toutes les étapes suivantes de la simulation.",
      realErrorEn: "A receipt with an incorrect SKU or wrong quantity creates a chain of errors in all subsequent simulation steps.",
    }
  },
  m5_putaway: {
    titleFr: "Rangement M5 (LT01)", titleEn: "M5 Putaway (LT01)", code: "M5_PUTAWAY", txCode: "LT01", tCode: "LT01",
    etapeFr: "Étape 2 sur 7", etapeEn: "Step 2 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 2 : Ranger les marchandises reçues avec traçabilité de lot. Saisissez le bin source (RÉCEPTION), le bin destination (STOCKAGE) et le numéro de lot.",
    objectiveEn: "M5 Integrated Simulation — Step 2: Store received goods with lot traceability. Enter source bin (RECEPTION), destination bin (STOCKAGE) and lot number.",
    fields: ["sku", "fromBin", "toBin", "qty", "lotNumber"],
    binZoneHint: {
      fromBin: { fr: "Zone source : RÉCEPTION (REC-01 ou REC-02) — marchandises venant d'être reçues", en: "Source zone: RECEPTION (REC-01 or REC-02) — recently received goods" },
      toBin: { fr: "Zone destination : STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — emplacement définitif", en: "Destination zone: STOCKAGE (B-01-R1-L1, B-01-R1-L2…) — final storage" },
    },
    pedagogicalDeep: {
      whyFr: "Le rangement M5 combine les compétences de M1 (putaway) et M2 (traçabilité lot). Le numéro de lot est essentiel pour le FIFO dans les étapes suivantes.",
      whyEn: "M5 putaway combines skills from M1 (putaway) and M2 (lot traceability). The lot number is essential for FIFO in subsequent steps.",
      realSAPFr: "Dans SAP WM, LT01 crée un ordre de transfert avec numéro de lot. Le système enregistre la date de réception pour le calcul FIFO/FEFO automatique.",
      realSAPEn: "In SAP WM, LT01 creates a transfer order with lot number. The system records the receipt date for automatic FIFO/FEFO calculation.",
      dependencyFr: "Le rangement M5 dépend d'une réception M5 validée. Le bin source doit contenir le stock reçu, le bin destination doit avoir de la capacité disponible.",
      dependencyEn: "M5 putaway depends on a validated M5 reception. The source bin must contain the received stock, the destination bin must have available capacity.",
      realErrorFr: "Un rangement sans numéro de lot dans un entrepôt pharmaceutique ou alimentaire est une violation réglementaire (FDA, HACCP) pouvant entraîner un rappel produit.",
      realErrorEn: "Putaway without a lot number in a pharmaceutical or food warehouse is a regulatory violation (FDA, HACCP) that can lead to a product recall.",
    }
  },
  m5_cycle_count: {
    titleFr: "Inventaire M5 (MI04)", titleEn: "M5 Cycle Count (MI04)", code: "M5_CYCLE_COUNT", txCode: "MI04", tCode: "MI04",
    etapeFr: "Étape 3 sur 7", etapeEn: "Step 3 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 3 : Compter physiquement le stock et comparer avec le système. Saisissez le SKU, le bin, la quantité système et la quantité comptée.",
    objectiveEn: "M5 Integrated Simulation — Step 3: Physically count stock and compare with system. Enter SKU, bin, system quantity and counted quantity.",
    fields: ["sku", "bin", "systemQty", "countedQty"],
    pedagogicalDeep: {
      whyFr: "L'inventaire M5 applique les compétences de M3 (cycle count) dans le contexte de la simulation intégrée. Il vérifie que les transactions précédentes (réception, rangement) sont cohérentes.",
      whyEn: "M5 cycle count applies M3 skills (cycle count) in the integrated simulation context. It verifies that previous transactions (reception, putaway) are consistent.",
      realSAPFr: "Dans SAP, le cycle count M5 utilise MI01 (création document), MI04 (saisie comptage) et MI07 (validation). Le tout est traçable dans MI20 (liste des documents d'inventaire).",
      realSAPEn: "In SAP, M5 cycle count uses MI01 (document creation), MI04 (count entry) and MI07 (validation). Everything is traceable in MI20 (inventory document list).",
      dependencyFr: "L'inventaire M5 dépend des transactions précédentes (réception + rangement). Une variance importante indique une erreur dans les étapes précédentes.",
      dependencyEn: "M5 cycle count depends on previous transactions (reception + putaway). A significant variance indicates an error in previous steps.",
      realErrorFr: "Une variance de 0 après réception et rangement confirme la cohérence du système. Une variance non nulle nécessite une investigation immédiate.",
      realErrorEn: "A variance of 0 after reception and putaway confirms system consistency. A non-zero variance requires immediate investigation.",
    }
  },
  m5_replenish: {
    titleFr: "Réapprovisionnement M5", titleEn: "M5 Replenishment", code: "M5_REPLENISH", txCode: "ME21N", tCode: "ME21N",
    etapeFr: "Étape 4 sur 7", etapeEn: "Step 4 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 4 : Calculer la quantité de réapprovisionnement. Saisissez le stock actuel, les paramètres min/max/sécurité et votre suggestion de commande.",
    objectiveEn: "M5 Integrated Simulation — Step 4: Calculate replenishment quantity. Enter current stock, min/max/safety parameters and your order suggestion.",
    fields: ["sku", "systemQty", "minQty", "maxQty", "safetyStock", "studentQty"],
    pedagogicalDeep: {
      whyFr: "Le réapprovisionnement M5 intègre les compétences de M3 (MRP) dans la simulation complète. Il démontre comment le WMS déclenche automatiquement les commandes fournisseurs.",
      whyEn: "M5 replenishment integrates M3 skills (MRP) into the complete simulation. It demonstrates how the WMS automatically triggers supplier orders.",
      realSAPFr: "Dans SAP, MD01 (MRP run) analyse tous les besoins et génère des propositions d'approvisionnement. ME21N crée le PO final après validation du gestionnaire.",
      realSAPEn: "In SAP, MD01 (MRP run) analyzes all requirements and generates procurement proposals. ME21N creates the final PO after manager validation.",
      dependencyFr: "Le réapprovisionnement M5 dépend du stock actuel (après inventaire M5). Les paramètres min/max doivent être cohérents avec la consommation réelle.",
      dependencyEn: "M5 replenishment depends on current stock (after M5 cycle count). Min/max parameters must be consistent with actual consumption.",
      realErrorFr: "Un réapprovisionnement calculé sur un stock erroné (avant inventaire) peut créer un surstock ou une rupture. L'ordre des étapes est critique.",
      realErrorEn: "Replenishment calculated on incorrect stock (before cycle count) can create overstock or stockout. Step order is critical.",
    }
  },
  m5_kpi: {
    titleFr: "KPI intégrés M5", titleEn: "M5 Integrated KPIs", code: "M5_KPI", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 5 sur 7", etapeEn: "Step 5 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 5 : Calculer les KPIs de la simulation. Saisissez les données de consommation, commandes et opérations pour obtenir les indicateurs de performance.",
    objectiveEn: "M5 Integrated Simulation — Step 5: Calculate simulation KPIs. Enter consumption, orders and operations data to get performance indicators.",
    fields: ["annualConsumption", "averageStock", "ordersFulfilled", "totalOrders", "operationalErrors", "totalOperations", "avgLeadTimeDays", "stockValue"],
    pedagogicalDeep: {
      whyFr: "Les KPI M5 synthétisent toute la simulation en indicateurs de performance. Ils permettent d'évaluer si les opérations de la simulation ont été efficaces.",
      whyEn: "M5 KPIs synthesize the entire simulation into performance indicators. They allow evaluating whether the simulation operations were effective.",
      realSAPFr: "Dans SAP, les KPIs de fin de simulation sont extraits via des rapports analytiques (SAP Analytics Cloud, BW/BI). Ils alimentent le tableau de bord de direction.",
      realSAPEn: "In SAP, end-of-simulation KPIs are extracted via analytical reports (SAP Analytics Cloud, BW/BI). They feed the management dashboard.",
      dependencyFr: "Les KPI M5 dépendent de toutes les transactions précédentes de la simulation. Des transactions incorrectes faussent les indicateurs finaux.",
      dependencyEn: "M5 KPIs depend on all previous simulation transactions. Incorrect transactions distort final indicators.",
      realErrorFr: "Des KPIs calculés en fin de simulation avec des données incohérentes invalident toute l'analyse. La qualité des données est fondamentale.",
      realErrorEn: "KPIs calculated at the end of simulation with inconsistent data invalidate the entire analysis. Data quality is fundamental.",
    }
  },
  m5_decision: {
    titleFr: "Décision stratégique M5", titleEn: "M5 Strategic Decision", code: "M5_DECISION", txCode: "LT23", tCode: "LT23",
    etapeFr: "Étape 6 sur 7", etapeEn: "Step 6 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape 6 : Formuler une décision stratégique basée sur les KPIs calculés. Analysez les résultats et proposez un plan d'action pour améliorer la performance.",
    objectiveEn: "M5 Integrated Simulation — Step 6: Formulate a strategic decision based on calculated KPIs. Analyze results and propose an action plan to improve performance.",
    fields: ["studentAnswer"],
    pedagogicalDeep: {
      whyFr: "La décision stratégique M5 est l'exercice de synthèse final. Elle évalue la capacité de l'étudiant à transformer des données KPI en décisions opérationnelles concrètes.",
      whyEn: "The M5 strategic decision is the final synthesis exercise. It evaluates the student's ability to transform KPI data into concrete operational decisions.",
      realSAPFr: "Dans SAP, les décisions stratégiques sont supportées par SAP S/4HANA Embedded Analytics et SAP Analytics Cloud. Les tableaux de bord temps réel facilitent la prise de décision.",
      realSAPEn: "In SAP, strategic decisions are supported by SAP S/4HANA Embedded Analytics and SAP Analytics Cloud. Real-time dashboards facilitate decision-making.",
      dependencyFr: "La décision M5 dépend de la compréhension de tous les KPIs calculés. Une bonne décision identifie les priorités, les ressources nécessaires et les délais.",
      dependencyEn: "M5 decision depends on understanding all calculated KPIs. A good decision identifies priorities, required resources, and timelines.",
      realErrorFr: "Une décision stratégique sans justification KPI est rejetée par la direction. En entreprise, toute décision d'investissement doit être étayée par des données.",
      realErrorEn: "A strategic decision without KPI justification is rejected by management. In business, every investment decision must be supported by data.",
    }
  },
  compliance_m5: {
    titleFr: "Validation finale M5", titleEn: "M5 Final Validation", code: "COMPLIANCE_M5", txCode: "MB52", tCode: "MB52",
    etapeFr: "Étape 7 sur 7", etapeEn: "Step 7 of 7",
    objectiveFr: "Simulation intégrée M5 — Étape finale : Valider la conformité complète de la simulation intégrée. Toutes les étapes doivent être complétées avec succès.",
    objectiveEn: "M5 Integrated Simulation — Final step: Validate complete compliance of the integrated simulation. All steps must be completed successfully.",
    fields: [],
    pedagogicalDeep: {
      whyFr: "La validation finale M5 est la certification de compétence TEC.LOG. Elle confirme que l'étudiant maîtrise l'ensemble du cycle logistique WMS/ERP.",
      whyEn: "M5 final validation is the TEC.LOG competency certification. It confirms that the student masters the complete WMS/ERP logistics cycle.",
      realSAPFr: "Dans SAP, la validation finale correspond à la clôture de période (MMPV) et au rapport de conformité annuel. Elle déclenche les processus de reporting réglementaire.",
      realSAPEn: "In SAP, final validation corresponds to period closing (MMPV) and the annual compliance report. It triggers regulatory reporting processes.",
      dependencyFr: "La validation M5 dépend de la réussite de toutes les étapes précédentes. C'est la démonstration que l'étudiant peut gérer un cycle logistique complet de façon autonome.",
      dependencyEn: "M5 validation depends on successful completion of all previous steps. It demonstrates that the student can manage a complete logistics cycle autonomously.",
      realErrorFr: "Une validation finale avec des étapes incomplètes est impossible en production réelle. SAP bloque la clôture si des documents sont en suspens.",
      realErrorEn: "A final validation with incomplete steps is impossible in real production. SAP blocks closing if documents are pending.",
    }
  },
};

type FormValues = {
  docRef?: string;
  sku?: string;
  bin?: string;
  fromBin?: string;
  toBin?: string;
  qty?: string;
  physicalQty?: string;
  comment?: string;
  lotNumber?: string;
  systemQty?: string;
  countedQty?: string;
  minQty?: string;
  maxQty?: string;
  safetyStock?: string;
  studentQty?: string;
  studentAnswer?: string;
  varianceQty?: string;
  justification?: string;
  annualConsumption?: string;
  averageStock?: string;
  ordersFulfilled?: string;
  totalOrders?: string;
  operationalErrors?: string;
  totalOperations?: string;
  avgLeadTimeDays?: string;
  stockValue?: string;
};

function PedagogicalPanel({ cfg, isDemo }: { cfg: typeof STEP_CONFIG[string]; isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  if (!isDemo) return null;
  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-md overflow-hidden mt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FlaskConical size={13} />
          {t("Explication pédagogique approfondie", "In-depth pedagogical explanation")}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="bg-card p-4 space-y-3 text-xs">
          <div>
            <p className="font-bold text-purple-600 dark:text-purple-400 mb-1">
              📚 {t("Pourquoi cette transaction existe dans l'ERP ?", "Why does this transaction exist in the ERP?")}
            </p>
            <p className="text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.whyFr, cfg.pedagogicalDeep.whyEn)}</p>
          </div>
          <div>
            <p className="font-bold text-primary mb-1">🔧 {t("Dans SAP S/4HANA réel :", "In real SAP S/4HANA:")}</p>
            <p className="text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.realSAPFr, cfg.pedagogicalDeep.realSAPEn)}</p>
          </div>
          <div>
            <p className="font-bold text-green-600 dark:text-green-400 mb-1">🔗 {t("Dépendance système :", "System dependency:")}</p>
            <p className="text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.dependencyFr, cfg.pedagogicalDeep.dependencyEn)}</p>
          </div>
          <div>
            <p className="font-bold text-destructive mb-1">⚠ {t("Erreur en production réelle :", "Error in real production:")}</p>
            <p className="text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.realErrorFr, cfg.pedagogicalDeep.realErrorEn)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BackendTransparencyPanel({ runData }: { runData: any }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  if (!runData?.isDemo || !runData?.demoBackendState) return null;
  const { inventory, transactions, cycleCounts } = runData.demoBackendState;
  const inventoryEntries = Object.entries(inventory as Record<string, number>).filter(([, qty]) => qty !== 0);
  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-md overflow-hidden mt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Database size={13} />
          {t("Voir logique système (WMS backend)", "View system logic (WMS backend)")}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="bg-card p-4 space-y-4 text-xs">
          <div>
            <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">
              📦 {t("Stock actuel (INVENTORY_BALANCE)", "Current stock (INVENTORY_BALANCE)")}
            </p>
            {inventoryEntries.length === 0 ? (
              <p className="text-muted-foreground italic">{t("Aucun stock enregistré", "No stock recorded")}</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30">
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">SKU :: BIN</th>
                    <th className="text-right px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Quantité", "Quantity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryEntries.map(([key, qty]) => (
                    <tr key={key} className="border-t border-border">
                      <td className="px-2 py-1 font-mono text-muted-foreground">{key}</td>
                      <td className={`px-2 py-1 text-right font-bold ${(qty as number) < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{qty as number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">
              📋 {t("Transactions enregistrées", "Recorded transactions")} ({transactions?.length ?? 0})
            </p>
            {(transactions?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground italic">{t("Aucune transaction", "No transactions")}</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30">
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Type", "Type")}</th>
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">SKU</th>
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">BIN</th>
                    <th className="text-right px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Qté", "Qty")}</th>
                    <th className="text-center px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Posté", "Posted")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1"><span className="font-bold text-primary">{tx.docType}</span></td>
                      <td className="px-2 py-1 font-mono text-muted-foreground">{tx.sku}</td>
                      <td className="px-2 py-1 font-mono text-muted-foreground">{tx.bin}</td>
                      <td className="px-2 py-1 text-right text-foreground">{tx.qty}</td>
                      <td className="px-2 py-1 text-center">{tx.posted ? "✅" : "❌"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {cycleCounts?.length > 0 && (
            <div>
              <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">
                🔍 {t("Comptages inventaire", "Cycle counts")} ({cycleCounts.length})
              </p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30">
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">SKU</th>
                    <th className="text-left px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">BIN</th>
                    <th className="text-right px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Variance", "Variance")}</th>
                    <th className="text-center px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{t("Résolu", "Resolved")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleCounts.map((cc: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 font-mono text-muted-foreground">{cc.sku}</td>
                      <td className="px-2 py-1 font-mono text-muted-foreground">{cc.bin}</td>
                      <td className={`px-2 py-1 text-right font-bold ${cc.variance !== 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                        {cc.variance > 0 ? "+" : ""}{cc.variance}
                      </td>
                      <td className="px-2 py-1 text-center">{cc.resolved ? "✅" : "❌"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StepForm() {
  const { runId, step } = useParams<{ runId: string; step: string }>();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const cfg = STEP_CONFIG[step?.toLowerCase() ?? ""] ?? STEP_CONFIG.po;

  const { data: runData, isLoading, refetch } = trpc.runs.state.useQuery({ runId: parseInt(runId) });
  const { data: masterData } = trpc.master.skus.useQuery();
  const { data: bins } = trpc.master.bins.useQuery();

  // ── M1 mutations ──────────────────────────────────────────────────────────
  const submitPO = trpc.transactions.submitPO.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitGR = trpc.transactions.submitGR.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitPUTAWAY_M1 = trpc.transactions.submitPUTAWAY_M1.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitSO = trpc.transactions.submitSO.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitPICKING_M1 = trpc.transactions.submitPICKING_M1.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitGI = trpc.transactions.submitGI.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCC = trpc.cycleCounts.submit.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitADJ = trpc.transactions.submitADJ.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCompliance = trpc.compliance.finalize.useMutation({ onSuccess: handleSuccess, onError: handleError });

  // ── M2 mutations ──────────────────────────────────────────────────────────
  const submitGR_M2 = trpc.m2.submitGR.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitPUTAWAY_M2 = trpc.m2.submitPUTAWAY.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitFifoPick = trpc.m2.submitFifoPick.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitStockAccuracy = trpc.m2.submitStockAccuracy.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitComplianceAdv = trpc.m2.submitComplianceAdv.useMutation({ onSuccess: handleSuccess, onError: handleError });

  // ── M3 mutations ──────────────────────────────────────────────────────────
  const submitCcList = trpc.m3.submitCcList.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCcCount = trpc.m3.submitCcCount.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCcRecon = trpc.m3.submitCcRecon.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitReplenishM3 = trpc.m3.submitReplenish.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitComplianceM3 = trpc.m3.submitComplianceM3.useMutation({ onSuccess: handleSuccess, onError: handleError });

  // ── M4 mutations ──────────────────────────────────────────────────────────
  const submitKpiData = trpc.m4.submitKpiData.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitKpiRotation = trpc.m4.submitKpiRotation.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitKpiService = trpc.m4.submitKpiService.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitKpiDiagnostic = trpc.m4.submitKpiDiagnostic.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitComplianceM4 = trpc.m4.submitComplianceM4.useMutation({ onSuccess: handleSuccess, onError: handleError });

  // ── M5 mutations ──────────────────────────────────────────────────────────
  const submitM5Reception = trpc.m5.submitReception.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitM5Putaway = trpc.m5.submitPutaway.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitM5CycleCount = trpc.m5.submitCycleCount.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitM5Replenish = trpc.m5.submitReplenish.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitM5Kpi = trpc.m5.submitKpi.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitM5Decision = trpc.m5.submitDecision.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitComplianceM5 = trpc.m5.submitComplianceM5.useMutation({ onSuccess: handleSuccess, onError: handleError });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors: formErrors } } = useForm<FormValues>();
  // Expose setValue for testing/automation
  if (typeof window !== 'undefined') (window as any).__rhfSetValue = setValue;
  const [feedbackPanel, setFeedbackPanel] = useState<{ data: any } | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);

  function handleSuccess(data: any) {
    // Fix 3: Reset all form fields (dropdowns, inputs) after successful submission
    reset({ sku: "", bin: "", fromBin: "", toBin: "", qty: "", docRef: "", comment: "", lotNumber: "", physicalQty: "", systemQty: "", countedQty: "", minQty: "", maxQty: "", safetyStock: "", studentQty: "", varianceQty: "", justification: "", studentAnswer: "" });
    // Show persistent feedback panel
    setFeedbackPanel({ data });
    refetch();
    // Also show a brief toast
    if (data?.demoWarning) {
      toast.warning(`⚠ ${t("Avertissement (mode démo)", "Warning (demo mode)")} : ${data.demoWarning}`, { duration: 4000 });
    } else {
      toast.success(t("Étape validée — consultez le feedback ci-dessous", "Step validated — see feedback below"), { duration: 3000 });
    }
    return; // Don't auto-redirect — wait for user to click Continue
  }

  function handleSuccessLegacy(data: any) {
    if (data?.demoWarning) {
      toast.warning(`⚠ ${t("Avertissement (mode démo)", "Warning (demo mode)")} : ${data.demoWarning}`, { duration: 5000 });
    } else if (data?.feedback) {
      // KPI interpretation feedback (M4/M5)
      const icon = data.isCorrect ? "✅" : "⚠";
      toast[data.isCorrect ? "success" : "warning"](`${icon} ${t(cfg.titleFr, cfg.titleEn)} — ${data.feedback}`, { duration: 6000 });
    } else if (data?.suggestion) {
      // Replenishment suggestion (M3/M5) with accuracy feedback
      const s = data.suggestion;
      const studentQty = data.studentQty;
      if (studentQty !== undefined && s.suggestedQty > 0) {
        const diff = Math.abs(studentQty - s.suggestedQty);
        const accuracy = Math.round((1 - diff / s.suggestedQty) * 100);
        const icon = accuracy >= 80 ? "✅" : accuracy >= 50 ? "⚠" : "❌";
        toast[accuracy >= 80 ? "success" : "warning"](
          `${icon} ${t("Suggestion optimale", "Optimal suggestion")}: ${s.suggestedQty} ${t("unités", "units")} | ${t("Votre réponse", "Your answer")}: ${studentQty} | ${t("Précision", "Accuracy")}: ${Math.max(0, accuracy)}% — ${s.reason}`,
          { duration: 7000 }
        );
      } else {
        toast.success(`✅ ${t("Suggestion système", "System suggestion")}: ${s.suggestedQty} ${t("unités", "units")} — ${s.reason}`, { duration: 5000 });
      }
    } else if (data?.totalVariance !== undefined) {
      // CC_COUNT feedback with variance detail
      const v = data.totalVariance;
      if (v === 0) {
        toast.success(`✅ ${t("Comptage parfait — aucune variance détectée. Excellent travail !", "Perfect count — no variance detected. Excellent work!")}`, { duration: 4000 });
      } else {
        toast.warning(`⚠ ${t("Variance totale détectée", "Total variance detected")}: ${v > 0 ? "+" : ""}${v} ${t("unités. Passez à la réconciliation (CC_RECON) pour ajuster le stock.", "units. Proceed to reconciliation (CC_RECON) to adjust stock.")}`, { duration: 6000 });
      }
    } else if (data?.adjustmentsApplied !== undefined) {
      // CC_RECON feedback
      const n = data.adjustmentsApplied;
      toast.success(`✅ ${t("Réconciliation validée", "Reconciliation validated")} — ${n} ${t("ajustement(s) appliqué(s) au stock", "adjustment(s) applied to stock")}`, { duration: 4000 });
    } else {
      toast.success(`${t(cfg.titleFr, cfg.titleEn)} — ${t("Étape validée avec succès !", "Step validated successfully!")}`);
    }
    refetch();
    setTimeout(() => navigate(`/student/run/${runId}`), 1800);
  }

  function handleError(err: any) {
    toast.error(err.message ?? t("Erreur de validation", "Validation error"));
  }

  function onSubmit(values: FormValues) {
    const base = { runId: parseInt(runId) };
    const qty = values.qty ? Number(values.qty) : 0;
    const physicalQty = values.physicalQty ? Number(values.physicalQty) : 0;
    const stepLower = step?.toLowerCase() ?? "";

    // Standard field validations
    if (cfg.fields.includes("bin") && (!values.bin || values.bin === "")) {
      toast.error(t("Veuillez sélectionner un emplacement (Bin) avant de valider.", "Please select a bin location before validating."));
      return;
    }
    if (cfg.fields.includes("fromBin") && (!values.fromBin || values.fromBin === "")) {
      toast.error(t("Veuillez sélectionner le bin source (De).", "Please select the source bin (From)."));
      return;
    }
    if (cfg.fields.includes("toBin") && (!values.toBin || values.toBin === "")) {
      toast.error(t("Veuillez sélectionner le bin destination (Vers).", "Please select the destination bin (To)."));
      return;
    }
    if (cfg.fields.includes("sku") && (!values.sku || values.sku === "")) {
      toast.error(t("Veuillez sélectionner un SKU avant de valider.", "Please select a SKU before validating."));
      return;
    }
    if (cfg.fields.includes("docRef") && (!values.docRef || values.docRef.trim() === "")) {
      toast.error(t("Veuillez saisir un numéro de document avant de valider.", "Please enter a document number before validating."));
      return;
    }
    if (cfg.fields.includes("qty") && (!values.qty || Number(values.qty) <= 0)) {
      toast.error(t("Veuillez saisir une quantité valide (> 0) avant de valider.", "Please enter a valid quantity (> 0) before validating."));
      return;
    }
    if (cfg.fields.includes("studentAnswer") && (!values.studentAnswer || values.studentAnswer.trim().length < 5)) {
      toast.error(t("Veuillez saisir une réponse d'au moins 5 caractères.", "Please enter an answer of at least 5 characters."));
      return;
    }

    switch (stepLower) {
      // ── M1 ──────────────────────────────────────────────────────────────
      case "po": return submitPO.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "gr":
        // M2 GR does not require a prior PO; M1 GR does
        if (runData?.moduleId === 2) return submitGR_M2.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
        return submitGR.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "putaway_m1":
        // M2 PUTAWAY uses m2.submitPUTAWAY (no PO prerequisite); M1 uses transactions.submitPUTAWAY_M1
        if (runData?.moduleId === 2) return submitPUTAWAY_M2.mutate({ ...base, sku: values.sku!, fromBin: values.fromBin!, toBin: values.toBin!, qty, docRef: values.docRef!, comment: values.comment });
        return submitPUTAWAY_M1.mutate({ ...base, sku: values.sku!, fromBin: values.fromBin!, toBin: values.toBin!, qty, docRef: values.docRef!, comment: values.comment });
      case "so": return submitSO.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "picking_m1": return submitPICKING_M1.mutate({ ...base, sku: values.sku!, fromBin: values.fromBin!, toBin: values.toBin!, qty, docRef: values.docRef!, comment: values.comment });
      case "gi": return submitGI.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "cc": return submitCC.mutate({ ...base, sku: values.sku!, bin: values.bin!, physicalQty });
      case "adj": return submitADJ.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef ?? "ADJ-AUTO", comment: values.comment });
      case "compliance": return submitCompliance.mutate({ ...base });
      case "stock":
        toast.success(t("Stock disponible confirmé — étape auto-validée.", "Available stock confirmed — step auto-validated."));
        setTimeout(() => navigate(`/student/run/${runId}`), 800);
        return;

      // ── M2 ──────────────────────────────────────────────────────────────
      case "fifo_pick":
        if (!values.lotNumber?.trim()) { toast.error(t("Veuillez saisir un numéro de lot.", "Please enter a lot number.")); return; }
        return submitFifoPick.mutate({ ...base, sku: values.sku!, fromBin: values.fromBin!, toBin: values.toBin!, qty, lotNumber: values.lotNumber! });
      case "stock_accuracy":
        return submitStockAccuracy.mutate({ ...base, sku: values.sku!, systemQty: Number(values.systemQty ?? 0), countedQty: Number(values.countedQty ?? 0) });
      case "compliance_adv":
        return submitComplianceAdv.mutate({ ...base });

      // ── M3 ──────────────────────────────────────────────────────────────
      case "cc_list":
        if (!values.sku) { toast.error(t("Veuillez sélectionner au moins un SKU.", "Please select at least one SKU.")); return; }
        return submitCcList.mutate({ ...base, skus: [values.sku!] });
      case "cc_count":
        return submitCcCount.mutate({ ...base, counts: [{ sku: values.sku!, bin: values.bin!, systemQty: Number(values.systemQty ?? 0), countedQty: Number(values.countedQty ?? 0) }] });
      case "cc_recon":
        return submitCcRecon.mutate({ ...base, adjustments: [{ sku: values.sku!, bin: values.bin!, varianceQty: Number(values.varianceQty ?? 0), justification: values.justification ?? "Ajustement manuel" }] });
      case "replenish":
        return submitReplenishM3.mutate({ ...base, sku: values.sku!, systemQty: Number(values.systemQty ?? 0), minQty: Number(values.minQty ?? 0), maxQty: Number(values.maxQty ?? 0), safetyStock: Number(values.safetyStock ?? 0), studentQty: Number(values.studentQty ?? 0) });
      case "compliance_m3":
        return submitComplianceM3.mutate({ ...base });

      // ── M4 ──────────────────────────────────────────────────────────────
      case "kpi_data":
        return submitKpiData.mutate({ ...base });
      case "kpi_rotation":
        return submitKpiRotation.mutate({ ...base, studentAnswer: values.studentAnswer! });
      case "kpi_service":
        return submitKpiService.mutate({ ...base, studentAnswer: values.studentAnswer! });
      case "kpi_diagnostic":
        return submitKpiDiagnostic.mutate({ ...base, studentAnswer: values.studentAnswer! });
      case "compliance_m4":
        return submitComplianceM4.mutate({ ...base });

      // ── M5 ──────────────────────────────────────────────────────────────
      case "m5_reception":
        return submitM5Reception.mutate({ ...base, sku: values.sku!, qty, docRef: values.docRef! });
      case "m5_putaway":
        if (!values.lotNumber?.trim()) { toast.error(t("Veuillez saisir un numéro de lot.", "Please enter a lot number.")); return; }
        return submitM5Putaway.mutate({ ...base, sku: values.sku!, fromBin: values.fromBin!, toBin: values.toBin!, qty, lotNumber: values.lotNumber! });
      case "m5_cycle_count":
        return submitM5CycleCount.mutate({ ...base, sku: values.sku!, bin: values.bin!, systemQty: Number(values.systemQty ?? 0), countedQty: Number(values.countedQty ?? 0) });
      case "m5_replenish":
        return submitM5Replenish.mutate({ ...base, sku: values.sku!, systemQty: Number(values.systemQty ?? 0), minQty: Number(values.minQty ?? 0), maxQty: Number(values.maxQty ?? 0), safetyStock: Number(values.safetyStock ?? 0), studentQty: Number(values.studentQty ?? 0) });
      case "m5_kpi":
        return submitM5Kpi.mutate({ ...base, kpiData: { annualConsumption: Number(values.annualConsumption ?? 2400), averageStock: Number(values.averageStock ?? 400), ordersFulfilled: Number(values.ordersFulfilled ?? 285), totalOrders: Number(values.totalOrders ?? 300), operationalErrors: Number(values.operationalErrors ?? 12), totalOperations: Number(values.totalOperations ?? 300), avgLeadTimeDays: Number(values.avgLeadTimeDays ?? 3.5), stockValue: Number(values.stockValue ?? 48000) } });
      case "m5_decision":
        return submitM5Decision.mutate({ ...base, studentDecision: values.studentAnswer! });
      case "compliance_m5":
        return submitComplianceM5.mutate({ ...base });
    }
  }

  const isAnyPending = [
    submitPO, submitGR, submitPUTAWAY_M1, submitSO, submitPICKING_M1, submitGI, submitCC, submitADJ, submitCompliance,
    submitFifoPick, submitStockAccuracy, submitComplianceAdv,
    submitCcList, submitCcCount, submitCcRecon, submitReplenishM3, submitComplianceM3,
    submitKpiData, submitKpiRotation, submitKpiService, submitKpiDiagnostic, submitComplianceM4,
    submitM5Reception, submitM5Putaway, submitM5CycleCount, submitM5Replenish, submitM5Kpi, submitM5Decision, submitComplianceM5,
  ].some(m => m.isPending);

  if (isLoading) {
    return (
      <FioriShell title={t(cfg.titleFr, cfg.titleEn)} breadcrumbs={[
        { label: t("Scénarios", "Scenarios"), href: "/student/scenarios" },
        { label: "Mission Control", href: `/student/run/${runId}` },
        { label: t(cfg.titleFr, cfg.titleEn) }
      ]}>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </FioriShell>
    );
  }

  const isDemo = runData?.isDemo ?? false;
  const nextStep = (runData?.nextStep as any)?.code;
  const isCurrentStep = nextStep === cfg.code;
  const isCompleted = runData?.completedSteps.includes(cfg.code as any);
  const isLocked = !isDemo && !isCurrentStep && !isCompleted;
  const inventory = runData?.inventory ?? {};
  const selectedSku = watch("sku") ?? "";
  const selectedBin = watch("bin") ?? "";
  const selectedFromBin = watch("fromBin") ?? "";
  const selectedToBin = watch("toBin") ?? "";
  const availableStock = selectedSku && selectedBin ? (inventory[`${selectedSku}::${selectedBin}`] ?? 0) : null;
  const availableStockFromBin = selectedSku && selectedFromBin ? (inventory[`${selectedSku}::${selectedFromBin}`] ?? 0) : null;
  const isOutOfSequence = isDemo && !isCurrentStep && !isCompleted;

  // Determine if this is a compliance/auto step (no real form)
  const isAutoStep = ["stock", "compliance", "compliance_adv", "compliance_m3", "compliance_m4", "compliance_m5", "kpi_data"].includes(step?.toLowerCase() ?? "");

  return (
    <FioriShell
      title={`${t("Transaction", "Transaction")}: ${t(cfg.titleFr, cfg.titleEn)} (${cfg.code}) | ${t(cfg.etapeFr, cfg.etapeEn)}`}
      breadcrumbs={[
        { label: t("Scénarios", "Scenarios"), href: "/student/scenarios" },
        { label: "Mission Control", href: `/student/run/${runId}` },
        { label: t(cfg.titleFr, cfg.titleEn) },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="bg-indigo-950 border border-indigo-700 rounded-md px-4 py-2.5 mb-4 flex items-center gap-2">
            <FlaskConical size={14} className="text-indigo-300 flex-shrink-0" />
            <p className="text-indigo-200 text-xs font-semibold">
              🔵 {t("MODE DÉMONSTRATION — Aucun score enregistré · Progression libre activée", "DEMO MODE — No score recorded · Free progression enabled")}
            </p>
          </div>
        )}

        {/* ── FEEDBACK PANEL (shown after step submission) ──────────────────── */}
        {feedbackPanel && (
          <div className="mb-6 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 overflow-hidden">
            {/* Header */}
            <div className="bg-green-500 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-white" />
                <span className="text-white font-bold text-sm">
                  {t("Étape validée avec succès !", "Step validated successfully!")}
                </span>
              </div>
              <span className="text-green-100 text-xs font-mono">{cfg.code} ✓</span>
            </div>

            {/* Result summary */}
            {feedbackPanel.data?.suggestion && (
              <div className="px-5 py-3 border-b border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                  {t("Résultat réapprovisionnement", "Replenishment result")}
                </p>
                {(() => {
                  const s = feedbackPanel.data.suggestion;
                  const studentQty = feedbackPanel.data.studentQty;
                  const diff = studentQty !== undefined ? Math.abs(studentQty - s.suggestedQty) : null;
                  const accuracy = diff !== null && s.suggestedQty > 0 ? Math.max(0, Math.round((1 - diff / s.suggestedQty) * 100)) : null;
                  return (
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="bg-white dark:bg-green-900/50 rounded-md p-2 text-center">
                        <p className="text-xs text-muted-foreground">{t("Votre réponse", "Your answer")}</p>
                        <p className="font-bold text-lg text-foreground">{studentQty ?? "—"}</p>
                      </div>
                      <div className="bg-white dark:bg-green-900/50 rounded-md p-2 text-center">
                        <p className="text-xs text-muted-foreground">{t("Suggestion système", "System suggestion")}</p>
                        <p className="font-bold text-lg text-green-700 dark:text-green-300">{s.suggestedQty}</p>
                      </div>
                      <div className="bg-white dark:bg-green-900/50 rounded-md p-2 text-center">
                        <p className="text-xs text-muted-foreground">{t("Précision", "Accuracy")}</p>
                        <p className={`font-bold text-lg ${accuracy !== null && accuracy >= 80 ? "text-green-600" : "text-amber-600"}`}>
                          {accuracy !== null ? `${accuracy}%` : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground mt-2 italic">{feedbackPanel.data.suggestion.reason}</p>
              </div>
            )}
            {feedbackPanel.data?.totalVariance !== undefined && (
              <div className="px-5 py-3 border-b border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">{t("Résultat inventaire", "Inventory result")}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`rounded-md px-4 py-2 text-center ${feedbackPanel.data.totalVariance === 0 ? "bg-green-100 dark:bg-green-900/50" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                    <p className="text-xs text-muted-foreground">{t("Variance totale", "Total variance")}</p>
                    <p className={`font-bold text-xl ${feedbackPanel.data.totalVariance === 0 ? "text-green-700" : "text-amber-700"}`}>
                      {feedbackPanel.data.totalVariance === 0 ? "0 ✔" : `${feedbackPanel.data.totalVariance > 0 ? "+" : ""}${feedbackPanel.data.totalVariance}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {feedbackPanel.data.totalVariance === 0
                      ? t("Comptage parfait ! Aucun ajustement nécessaire.", "Perfect count! No adjustment needed.")
                      : t("Des variances ont été détectées. Passez à CC_RECON pour ajuster le stock.", "Variances detected. Proceed to CC_RECON to adjust stock.")}
                  </p>
                </div>
              </div>
            )}
            {feedbackPanel.data?.feedback && (
              <div className="px-5 py-3 border-b border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">{t("Interprétation KPI", "KPI Interpretation")}</p>
                <p className={`text-sm font-medium mt-1 ${feedbackPanel.data.isCorrect ? "text-green-700" : "text-amber-700"}`}>
                  {feedbackPanel.data.isCorrect ? "✅" : "⚠"} {feedbackPanel.data.feedback}
                </p>
              </div>
            )}

            {/* Pedagogical deep dive */}
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wide mb-3">
                📚 {t("Explication pédagogique", "Pedagogical explanation")}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">{t("Pourquoi cette étape ?", "Why this step?")}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.whyFr, cfg.pedagogicalDeep.whyEn)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">{t("Dans SAP réel", "In real SAP")}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(cfg.pedagogicalDeep.realSAPFr, cfg.pedagogicalDeep.realSAPEn)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    ⚠ {t("Erreur fréquente en production", "Common production error")}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{t(cfg.pedagogicalDeep.realErrorFr, cfg.pedagogicalDeep.realErrorEn)}</p>
                </div>
              </div>
            </div>

            {/* Continue button */}
            <div className="px-5 pb-4 flex gap-3">
              <button
                onClick={() => navigate(`/student/run/${runId}`)}
                className="flex-1 py-2.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
              >
                {t("→ Continuer la simulation", "→ Continue simulation")}
              </button>
              <button
                onClick={() => setFeedbackPanel(null)}
                className="px-4 py-2.5 rounded-md border border-green-300 text-green-700 dark:text-green-300 font-medium text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                {t("Rester ici", "Stay here")}
              </button>
            </div>
          </div>
        )}

        {/* Transaction Header */}
        <div className={`rounded-t-md px-5 py-3 flex items-center justify-between ${isDemo ? "bg-indigo-900" : "bg-primary"}`}>
          <div>
            <p className="text-white/60 text-xs">{t("Code Transaction", "Transaction Code")}</p>
            <p className="text-white font-bold text-sm">{cfg.tCode} — {t(cfg.titleFr, cfg.titleEn)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGlossary(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              title={t("Ouvrir le glossaire logistique", "Open logistics glossary")}
            >
              <BookOpen size={12} />
              {t("Aide", "Help")}
            </button>
            <div className="text-right">
              <p className="text-white/60 text-xs">{t("Statut", "Status")}</p>
              {isCompleted ? (
                <span className="badge-valid">✓ {t("VALIDÉ", "DONE")}</span>
              ) : isLocked ? (
                <span className="badge-blocked">🔒 {t("VERROUILLÉ", "LOCKED")}</span>
              ) : isDemo && isOutOfSequence ? (
                <span className="text-[10px] bg-purple-700 text-white px-2 py-0.5 rounded-full font-semibold">⚠ {t("HORS SÉQUENCE", "OUT OF SEQUENCE")}</span>
              ) : (
                <span className="badge-pending">⏳ {t("EN COURS", "IN PROGRESS")}</span>
              )}
            </div>
          </div>
        </div>
        {/* Glossary Modal */}
        {showGlossary && (
          <GlossaryPage modal onClose={() => setShowGlossary(false)} />
        )}

        {/* Locked State */}
        {isLocked && (
          <div className="bg-card border border-border border-t-0 rounded-b-md p-6">
            <div className="alert-blocked flex items-start gap-3 mb-4">
              <Lock size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold mb-0.5">{t("Étape actuellement verrouillée", "Step currently locked")}</p>
                <p className="text-xs">{t("Complétez l'étape précédente avant d'accéder à cette transaction.", "Complete the previous step before accessing this transaction.")}</p>
              </div>
            </div>
            <button onClick={() => navigate(`/student/run/${runId}`)}
              className="flex items-center gap-2 text-xs text-primary hover:underline">
              <ArrowLeft size={13} /> {t("Retour au Mission Control", "Back to Mission Control")}
            </button>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="bg-card border border-border border-t-0 rounded-b-md p-6">
            <div className="alert-compliant flex items-start gap-3 mb-4">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold mb-0.5">{t("Étape validée", "Step validated")}</p>
                <p className="text-xs">{t("Cette transaction a été complétée avec succès. Retournez au tableau de contrôle.", "This transaction was completed successfully. Return to the control panel.")}</p>
              </div>
            </div>
            <BackendTransparencyPanel runData={runData} />
            <PedagogicalPanel cfg={cfg} isDemo={isDemo} />
            <button onClick={() => navigate(`/student/run/${runId}`)}
              className="flex items-center gap-2 text-xs text-primary hover:underline mt-4">
              <ArrowLeft size={13} /> {t("Retour au Mission Control", "Back to Mission Control")}
            </button>
          </div>
        )}

        {/* Active Form */}
        {(isCurrentStep || (isDemo && !isCompleted)) && !isLocked && (
          <div className="bg-card border border-border border-t-0 rounded-b-md">
            {/* Out-of-sequence warning */}
            {isDemo && isOutOfSequence && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>{t("Avertissement pédagogique :", "Pedagogical warning:")}</strong>{" "}
                  {t(
                    "Cette étape est hors séquence recommandée. En mode évaluation, elle serait bloquée et pénalisée.",
                    "This step is out of the recommended sequence. In evaluation mode, it would be blocked and penalized."
                  )}
                </p>
              </div>
            )}

            {/* Objective Panel */}
            <div className="mx-4 mt-4 bg-primary/5 border border-primary/20 rounded-md p-3">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                <Info size={10} className="inline mr-1" />{t("Objectif pédagogique", "Pedagogical objective")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(cfg.objectiveFr, cfg.objectiveEn)}</p>
            </div>

            {/* Context Panel: Stock for evaluation mode */}
            {(["gi","cc","so","putaway_m1","picking_m1","fifo_pick","m5_putaway","m5_cycle_count"].includes(step?.toLowerCase() ?? "")) && !isDemo && (() => {
              const inv = runData?.inventory ?? {};
              const RECEPTION_BINS_UI  = ["REC-01", "REC-02"];
              const STOCKAGE_BINS_UI   = Object.keys(inv).map(k => k.split("::")[1]).filter(b => b && !RECEPTION_BINS_UI.includes(b) && !b.startsWith("EXP") && !b.startsWith("PICK") && !b.startsWith("RES"));
              const EXPEDITION_BINS_UI = ["EXP-01", "EXP-02"];
              const sumZone = (bins: string[]) =>
                Object.entries(inv)
                  .filter(([k, q]) => bins.some(b => k.endsWith(`::${b}`)) && (q as number) > 0)
                  .reduce((s, [, q]) => s + (q as number), 0);
              const sumAll = (filterFn: (bin: string) => boolean) =>
                Object.entries(inv)
                  .filter(([k, q]) => filterFn(k.split("::")[1] ?? "") && (q as number) > 0)
                  .reduce((s, [, q]) => s + (q as number), 0);
              const stockageTotal = sumAll(b => !RECEPTION_BINS_UI.includes(b) && !b.startsWith("EXP") && !b.startsWith("PICK") && !b.startsWith("RES"));
              const expeditionTotal = sumZone(EXPEDITION_BINS_UI);
              const receptionTotal = sumZone(RECEPTION_BINS_UI);
              const grandTotal = Object.entries(inv).filter(([, q]) => (q as number) > 0).reduce((s, [, q]) => s + (q as number), 0);
              const hasStock = grandTotal > 0;
              return (
                <div className="mx-4 mt-4 bg-primary/5 border border-primary/20 rounded-md p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                    📊 {t("Stock actuel par zone", "Current stock by zone")}
                  </p>
                  {!hasStock ? (
                    <p className="text-[10px] text-destructive">
                      ⚠ {t("Aucun stock disponible — vérifiez que la GR a été validée.", "No stock available — verify that GR was validated.")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {/* Zone summary table */}
                      <div className="grid grid-cols-2 gap-x-3 text-[10px] font-mono border border-border rounded overflow-hidden">
                        {receptionTotal > 0 && (
                          <>
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold">{t("RÉCEPTION", "RECEPTION")}</span>
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-right text-blue-700 dark:text-blue-300">{receptionTotal} {t("u.", "u.")}</span>
                          </>
                        )}
                        {stockageTotal > 0 && (
                          <>
                            <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 font-semibold">{t("STOCKAGE", "STORAGE")}</span>
                            <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-right text-green-700 dark:text-green-300">{stockageTotal} {t("u.", "u.")}</span>
                          </>
                        )}
                        {expeditionTotal > 0 && (
                          <>
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-semibold">{t("EXPÉDITION", "DISPATCH")}</span>
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-right text-purple-700 dark:text-purple-300">{expeditionTotal} {t("u.", "u.")}</span>
                          </>
                        )}
                        <span className="px-2 py-0.5 bg-muted font-bold border-t border-border">{t("TOTAL", "TOTAL")}</span>
                        <span className="px-2 py-0.5 bg-muted font-bold border-t border-border text-right">{grandTotal} {t("u.", "u.")}</span>
                      </div>
                      {/* Per-bin detail */}
                      <details className="text-[10px]">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("Détail par emplacement", "Detail by location")}</summary>
                        <div className="mt-1 space-y-0.5 pl-2">
                          {Object.entries(inv).filter(([, qty]) => (qty as number) > 0).map(([key, qty]) => {
                            const [sku, bin] = key.split("::");
                            return (
                              <p key={key} className="font-mono">
                                <span className="text-primary font-semibold">{sku}</span> @ <span className="text-green-600 dark:text-green-400">{bin}</span> — <strong className="text-foreground">{qty as number} {t("u.", "u.")}</strong>
                              </p>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* ── Compliance / Auto steps ─────────────────────────────── */}
              {step?.toLowerCase() === "compliance" && (
                <div>
                  <div className={`rounded-md p-4 mb-4 ${
                    runData?.compliance.compliant
                      ? "bg-green-50 dark:bg-green-950/30"
                      : isDemo ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30"
                  }`}>
                    <p className={`font-bold text-sm mb-2 ${
                      runData?.compliance.compliant
                        ? "text-green-700 dark:text-green-400"
                        : isDemo ? "text-amber-700 dark:text-amber-400" : "text-destructive"
                    }`}>
                      {runData?.compliance.compliant
                        ? t("✅ Système conforme — Prêt pour clôture", "✅ System compliant — Ready for closing")
                        : isDemo
                        ? t("⚠ Non conforme (démo) — Clôture autorisée en mode démonstration", "⚠ Non-compliant (demo) — Closing allowed in demo mode")
                        : t("🔴 Système non conforme — Résoudre les problèmes", "🔴 System non-compliant — Resolve issues")}
                    </p>
                    {runData?.compliance.issuesFr?.map((issue: string, i: number) => (
                      <p key={i} className={`text-xs ${isDemo ? "text-amber-700 dark:text-amber-400" : "text-destructive"}`}>• {issue}</p>
                    ))}
                  </div>
                  {!runData?.compliance.compliant && !isDemo && (
                    <div className="space-y-2 mb-4">
                      <div className="alert-blocked flex items-start gap-2">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <p className="text-xs">{t("Résolvez tous les problèmes de conformité avant de clôturer le module.", "Resolve all compliance issues before closing the module.")}</p>
                      </div>
                      {/* Show actionable resolution hints per issue */}
                      {runData?.compliance.issuesFr?.some((i: string) => i.includes('non postée')) && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs">
                          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">💡 {t("Comment résoudre : transactions non postées", "How to resolve: unposted transactions")}</p>
                          <p className="text-amber-700 dark:text-amber-400">{t("Ce scénario simule une GR fantôme (réception non comptabilisée). Dans un vrai WMS, vous devez localiser et poster la transaction manquante via MB01/MIGO. Ici, retournez au tableau de bord, démarrez un nouveau scénario et veillez à poster chaque GR immédiatement après réception.", "This scenario simulates a ghost GR (unposted receipt). In a real WMS, you must locate and post the missing transaction via MB01/MIGO. Here, return to the dashboard, start a new scenario and make sure to post each GR immediately after receipt.")}</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/student/run/${runId}`)}
                            className="mt-2 text-amber-800 dark:text-amber-300 underline text-xs font-semibold"
                          >
                            ← {t("Retour au Mission Control", "Back to Mission Control")}
                          </button>
                        </div>
                      )}
                      {runData?.compliance.issuesFr?.some((i: string) => i.includes('écart')) && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs">
                          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 {t("Comment résoudre : écarts d'inventaire", "How to resolve: inventory variances")}</p>
                          <p className="text-blue-700 dark:text-blue-400">{t("Des écarts ont été détectés lors du Cycle Count. Retournez exécuter un nouveau CC pour les emplacements concernés et entrez la quantité physique réelle pour générer un ajustement (ADJ).", "Variances were detected during the Cycle Count. Go back and run a new CC for the affected locations, entering the actual physical quantity to generate an adjustment (ADJ).")}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input {...register("comment")} placeholder={t("Ex: Module complété avec succès", "Ex: Module completed successfully")} className="fiori-field-input" />
                </div>
              )}

              {/* Auto-complete steps */}
              {["stock", "compliance_adv", "compliance_m3", "compliance_m4", "compliance_m5", "kpi_data"].includes(step?.toLowerCase() ?? "") && (
                <div className="alert-compliant">
                  <p className="text-xs font-semibold mb-1">
                    {step?.toLowerCase() === "stock"
                      ? t("✅ Stock disponible confirmé", "✅ Available stock confirmed")
                      : step?.toLowerCase() === "kpi_data"
                      ? t("📊 Données KPI de référence", "📊 Reference KPI data")
                      : t("✅ Prêt pour validation de conformité", "✅ Ready for compliance validation")}
                  </p>
                  {step?.toLowerCase() === "stock" && (
                    <p className="text-xs">{t("Cette étape est automatiquement validée après le rangement (PUTAWAY). Le stock est maintenant disponible en zone STOCKAGE.", "This step is automatically validated after putaway. Stock is now available in the STOCKAGE zone.")}</p>
                  )}
                  {step?.toLowerCase() === "kpi_data" && (
                    <div className="mt-2 space-y-1 text-xs font-mono">
                      <p>📦 {t("Consommation annuelle", "Annual consumption")}: <strong>2 400 unités</strong></p>
                      <p>📦 {t("Stock moyen", "Average stock")}: <strong>400 unités</strong></p>
                      <p>✅ {t("Commandes livrées", "Orders delivered")}: <strong>285 / 300</strong></p>
                      <p>⚠ {t("Erreurs opérationnelles", "Operational errors")}: <strong>12 / 300</strong></p>
                      <p>⏱ {t("Délai moyen", "Average lead time")}: <strong>3.5 jours</strong></p>
                      <p>💰 {t("Valeur stock immobilisé", "Immobilized stock value")}: <strong>48 000 $</strong></p>
                    </div>
                  )}
                  {["compliance_adv", "compliance_m3", "compliance_m4", "compliance_m5"].includes(step?.toLowerCase() ?? "") && (
                    <p className="text-xs mt-1">{t("Toutes les étapes précédentes ont été complétées. Cliquez sur Valider pour finaliser ce module.", "All previous steps have been completed. Click Validate to finalize this module.")}</p>
                  )}
                  {step?.toLowerCase() === "stock" && (
                    <div className="mt-3 space-y-0.5">
                      {Object.entries(runData?.inventory ?? {}).filter(([, qty]) => (qty as number) > 0).map(([key, qty]) => {
                        const [sku, bin] = key.split("::");
                        return (
                          <p key={key} className="text-[10px] font-mono">
                            <span className="text-primary font-semibold">{sku}</span> @ <span className="text-green-600 dark:text-green-400">{bin}</span> — <strong>{qty as number} {t("unités", "units")}</strong>
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Standard fields ─────────────────────────────────────── */}
              {cfg.fields.includes("docRef") && (
                <div>
                  <label className="fiori-field-label">
                    {t("N° Document", "Document No.")} <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Requis", "Required")}</span>
                  </label>
                  <input {...register("docRef")} placeholder={`Ex: ${cfg.code}-2025-001`} className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {cfg.fields.includes("sku") && (
                <div>
                  <label className="fiori-field-label">
                    SKU <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Requis", "Required")}</span>
                  </label>
                  <select {...register("sku")} value={selectedSku} onChange={e => setValue("sku", e.target.value)} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner un SKU", "Select a SKU")} —</option>
                    {masterData?.map((s: any) => (
                      <option key={s.sku} value={s.sku}>{s.sku} — {s.descriptionFr}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Standard single bin field */}
              {cfg.fields.includes("bin") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Bin / Emplacement", "Bin / Location")} <span className="text-destructive">*</span>
                  </label>
                  <select {...register("bin")} value={selectedBin} onChange={e => setValue("bin", e.target.value)} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner un emplacement", "Select a location")} —</option>
                    {bins?.map((b: any) => (
                      <option key={b.binCode} value={b.binCode}>{b.binCode} — {b.zone}</option>
                    ))}
                  </select>
                  {cfg.binZoneHint?.bin && (
                    <p className="text-xs mt-1.5 text-blue-600 dark:text-blue-400 flex items-start gap-1 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                      <span className="shrink-0 font-bold">&#x1F4CD;</span>
                      <span>{t(cfg.binZoneHint.bin.fr, cfg.binZoneHint.bin.en)}</span>
                    </p>
                  )}
                  {availableStock !== null && (
                    <p className={`text-xs mt-1 font-medium ${availableStock > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {t("Stock disponible", "Available stock")} : {availableStock} {t("unité(s)", "unit(s)")}
                    </p>
                  )}
                </div>
              )}

              {/* fromBin field */}
              {cfg.fields.includes("fromBin") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Bin Source (De)", "Source Bin (From)")} <span className="text-destructive">*</span>
                  </label>
                  <select {...register("fromBin")} value={selectedFromBin} onChange={e => setValue("fromBin", e.target.value)} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner le bin source", "Select source bin")} —</option>
                    {bins?.map((b: any) => (
                      <option key={b.binCode} value={b.binCode}>{b.binCode} — {b.zone}</option>
                    ))}
                  </select>
                  {cfg.binZoneHint?.fromBin && (
                    <p className="text-xs mt-1.5 text-blue-600 dark:text-blue-400 flex items-start gap-1 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                      <span className="shrink-0 font-bold">&#x1F4CD;</span>
                      <span>{t(cfg.binZoneHint.fromBin.fr, cfg.binZoneHint.fromBin.en)}</span>
                    </p>
                  )}
                  {availableStockFromBin !== null && selectedSku && (
                    <p className={`text-xs mt-1 font-medium ${availableStockFromBin > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {t("Stock dans ce bin", "Stock in this bin")} : {availableStockFromBin} {t("unité(s)", "unit(s)")}
                    </p>
                  )}
                </div>
              )}

              {/* toBin field */}
              {cfg.fields.includes("toBin") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Bin Destination (Vers)", "Destination Bin (To)")} <span className="text-destructive">*</span>
                  </label>
                  <select {...register("toBin")} value={selectedToBin} onChange={e => setValue("toBin", e.target.value)} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner le bin destination", "Select destination bin")} —</option>
                    {bins?.map((b: any) => (
                      <option key={b.binCode} value={b.binCode}>{b.binCode} — {b.zone}</option>
                    ))}
                  </select>
                  {cfg.binZoneHint?.toBin && (
                    <p className="text-xs mt-1.5 text-blue-600 dark:text-blue-400 flex items-start gap-1 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
                      <span className="shrink-0 font-bold">&#x1F4CD;</span>
                      <span>{t(cfg.binZoneHint.toBin.fr, cfg.binZoneHint.toBin.en)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Lot Number field */}
              {cfg.fields.includes("lotNumber") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Numéro de lot", "Lot Number")} <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Ex: LOT-2025-001", "Ex: LOT-2025-001")}</span>
                  </label>
                  <input {...register("lotNumber")} placeholder="LOT-2025-001" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Qty field */}
              {cfg.fields.includes("qty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité", "Quantity")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("qty")} type="number" min={1} placeholder="Ex: 50" className="fiori-field-input fiori-field-active" />
                  {(["gi","so"].includes(step?.toLowerCase() ?? "")) && availableStock !== null && (
                    <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                      {t(`Ne peut pas dépasser le stock disponible (${availableStock})`, `Cannot exceed available stock (${availableStock})`)}
                    </p>
                  )}
                </div>
              )}

              {/* Physical Qty field */}
              {cfg.fields.includes("physicalQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité physique comptée", "Physical quantity counted")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("physicalQty")} type="number" min={0} placeholder="Ex: 48" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* System Qty field */}
              {cfg.fields.includes("systemQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité système (MB52)", "System quantity (MB52)")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("systemQty")} type="number" min={0} placeholder="Ex: 100" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Counted Qty field */}
              {cfg.fields.includes("countedQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité comptée physiquement", "Physically counted quantity")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("countedQty")} type="number" min={0} placeholder="Ex: 98" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Min Qty field */}
              {cfg.fields.includes("minQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Stock minimum (ROP)", "Minimum stock (ROP)")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("minQty")} type="number" min={0} placeholder="Ex: 50" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Max Qty field */}
              {cfg.fields.includes("maxQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Stock maximum", "Maximum stock")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("maxQty")} type="number" min={0} placeholder="Ex: 200" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Safety Stock field */}
              {cfg.fields.includes("safetyStock") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Stock de sécurité", "Safety stock")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("safetyStock")} type="number" min={0} placeholder="Ex: 25" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Student Qty (replenishment suggestion) */}
              {cfg.fields.includes("studentQty") && (
                <div className="space-y-3">
                  {/* ROP/EOQ Pedagogical Reference Panel */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
                      📐 {t("Formules de référence — MRP/ROP/EOQ", "Reference formulas — MRP/ROP/EOQ")}
                    </p>
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="bg-white dark:bg-blue-900/30 rounded p-2 border border-blue-100 dark:border-blue-800">
                        <p className="text-blue-600 dark:text-blue-300 font-bold mb-0.5">{t("Point de commande (ROP)", "Reorder Point (ROP)")}</p>
                        <p className="text-blue-800 dark:text-blue-200">ROP = {t("Stock de sécurité", "Safety Stock")} + (D × LT)</p>
                        <p className="text-blue-500 dark:text-blue-400 text-[9px] mt-0.5">{t("D = demande journalière, LT = délai fournisseur", "D = daily demand, LT = supplier lead time")}</p>
                      </div>
                      <div className="bg-white dark:bg-blue-900/30 rounded p-2 border border-blue-100 dark:border-blue-800">
                        <p className="text-blue-600 dark:text-blue-300 font-bold mb-0.5">{t("Quantité à commander", "Order Quantity")}</p>
                        <p className="text-blue-800 dark:text-blue-200">Q = {t("Stock max", "Max stock")} − {t("Stock actuel", "Current stock")}</p>
                        <p className="text-blue-500 dark:text-blue-400 text-[9px] mt-0.5">{t("Si stock actuel ≤ ROP → déclencher commande", "If current stock ≤ ROP → trigger order")}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2 border border-amber-200 dark:border-amber-800">
                        <p className="text-amber-700 dark:text-amber-300 font-bold mb-0.5">💡 {t("Exemple concret", "Concrete example")}</p>
                        <p className="text-amber-800 dark:text-amber-200">{t("Stock actuel", "Current stock")}: 30 | {t("Stock min (ROP)", "Min stock (ROP)")}: 50 | {t("Stock max", "Max stock")}: 200</p>
                        <p className="text-amber-700 dark:text-amber-400 font-semibold">→ Q = 200 − 30 = <strong>170 unités</strong></p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="fiori-field-label">
                      {t("Votre suggestion de commande (unités)", "Your order suggestion (units)")} <span className="text-destructive">*</span>
                    </label>
                    <input {...register("studentQty")} type="number" min={0} placeholder="Ex: 150" className="fiori-field-input fiori-field-active" />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("Appliquez la formule ci-dessus avec vos valeurs saisies. Le système comparera votre réponse avec la suggestion optimale.", "Apply the formula above with your entered values. The system will compare your answer with the optimal suggestion.")}</p>
                  </div>
                </div>
              )}

              {/* Variance Qty field */}
              {cfg.fields.includes("varianceQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité d'ajustement (variance)", "Adjustment quantity (variance)")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("varianceQty")} type="number" placeholder="Ex: -2 (manquant) ou +3 (surplus)" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* Justification field */}
              {cfg.fields.includes("justification") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Justification de l'ajustement", "Adjustment justification")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("justification")} placeholder={t("Ex: Erreur de comptage lors de la réception", "Ex: Counting error during reception")} className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {/* SKU List field (for CC_LIST) */}
              {cfg.fields.includes("skuList") && (
                <div>
                  <label className="fiori-field-label">
                    {t("SKU à inclure dans le comptage", "SKU to include in count")} <span className="text-destructive">*</span>
                  </label>
                  <select {...register("sku")} value={selectedSku} onChange={e => setValue("sku", e.target.value)} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner un SKU", "Select a SKU")} —</option>
                    {masterData?.map((s: any) => (
                      <option key={s.sku} value={s.sku}>{s.sku} — {s.descriptionFr}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("Sélectionnez le SKU principal à compter.", "Select the main SKU to count.")}</p>
                </div>
              )}

              {/* Student Answer (KPI interpretation, M5 decision) */}
              {cfg.fields.includes("studentAnswer") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Votre analyse / réponse", "Your analysis / answer")} <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Min. 5 caractères", "Min. 5 characters")}</span>
                  </label>
                  <textarea
                    {...register("studentAnswer")}
                    rows={4}
                    placeholder={t(
                      "Rédigez votre analyse ici. Soyez précis et justifiez votre réponse avec des données.",
                      "Write your analysis here. Be precise and justify your answer with data."
                    )}
                    className="fiori-field-input fiori-field-active resize-none"
                  />
                  {step?.toLowerCase() === "kpi_rotation" && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">💡 {t("Données de référence", "Reference data")}</p>
                      <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                        {t("Taux de rotation", "Rotation rate")} = 2400 / 400 = <strong>6 fois/an</strong> | DSI = 365/6 = <strong>60 jours</strong>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("Objectif industrie : 8-12 rotations/an (30-45 jours de stock)", "Industry target: 8-12 rotations/year (30-45 days of stock)")}</p>
                    </div>
                  )}
                  {step?.toLowerCase() === "kpi_service" && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">💡 {t("Données de référence", "Reference data")}</p>
                      <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                        {t("Taux de service", "Service level")} = 285 / 300 = <strong>95%</strong>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("Objectif industrie : ≥ 98% (classe mondiale), 95-97% (acceptable), < 95% (à améliorer)", "Industry target: ≥ 98% (world class), 95-97% (acceptable), < 95% (to improve)")}</p>
                    </div>
                  )}
                  {step?.toLowerCase() === "kpi_diagnostic" && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">💡 {t("Synthèse KPIs", "KPI Summary")}</p>
                      <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                        {t("Rotation", "Rotation")}: 6 ({t("surstock", "overstock")}) | {t("Service", "Service")}: 95% ({t("acceptable", "acceptable")}) | {t("Erreurs", "Errors")}: 4% ({t("à améliorer", "to improve")})
                      </p>
                    </div>
                  )}
                  {step?.toLowerCase() === "m5_decision" && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">💡 {t("Guide décision stratégique", "Strategic decision guide")}</p>
                      <p className="text-[10px] text-muted-foreground">{t("Structure recommandée : Problème identifié → Cause racine → Action corrective → KPI cible → Délai", "Recommended structure: Identified problem → Root cause → Corrective action → Target KPI → Timeline")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* KPI Data fields (M5 only) */}
              {cfg.fields.includes("annualConsumption") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="fiori-field-label">{t("Consommation annuelle", "Annual consumption")}</label>
                    <input {...register("annualConsumption")} type="number" defaultValue={2400} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Stock moyen", "Average stock")}</label>
                    <input {...register("averageStock")} type="number" defaultValue={400} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Commandes livrées", "Orders fulfilled")}</label>
                    <input {...register("ordersFulfilled")} type="number" defaultValue={285} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Total commandes", "Total orders")}</label>
                    <input {...register("totalOrders")} type="number" defaultValue={300} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Erreurs opérationnelles", "Operational errors")}</label>
                    <input {...register("operationalErrors")} type="number" defaultValue={12} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Total opérations", "Total operations")}</label>
                    <input {...register("totalOperations")} type="number" defaultValue={300} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Délai moyen (jours)", "Avg lead time (days)")}</label>
                    <input {...register("avgLeadTimeDays")} type="number" step="0.1" defaultValue={3.5} className="fiori-field-input fiori-field-active" />
                  </div>
                  <div>
                    <label className="fiori-field-label">{t("Valeur stock ($)", "Stock value ($)")}</label>
                    <input {...register("stockValue")} type="number" defaultValue={48000} className="fiori-field-input fiori-field-active" />
                  </div>
                </div>
              )}

              {/* Comment field */}
              {cfg.fields.includes("comment") && (
                <div>
                  <label className="fiori-field-label">{t("Commentaire (optionnel)", "Comment (optional)")}</label>
                  <input {...register("comment")} placeholder={t("Ex: Réception conforme au bon de commande", "Ex: Receipt conforming to purchase order")} className="fiori-field-input" />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate(`/student/run/${runId}`)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={13} />
                  {t("Annuler", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isAnyPending}
                  className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold text-white transition-all ${
                    isAnyPending
                      ? "opacity-60 cursor-not-allowed bg-primary/60"
                      : isDemo
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {isAnyPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("Validation...", "Validating...")}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      {t("Valider la transaction", "Validate transaction")}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Backend Transparency Panel (demo only) */}
            <div className="px-5 pb-5">
              <BackendTransparencyPanel runData={runData} />
              <PedagogicalPanel cfg={cfg} isDemo={isDemo} />
            </div>
          </div>
        )}
      </div>
    </FioriShell>
  );
}
