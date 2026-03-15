import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, CheckCircle, Lock, AlertTriangle, Info, FlaskConical, ChevronDown, ChevronUp, Database } from "lucide-react";

const STEP_CONFIG: Record<string, {
  titleFr: string; titleEn: string; code: string; txCode: string;
  etapeFr: string; etapeEn: string;
  objectiveFr: string; objectiveEn: string;
  fields: string[]; tCode: string;
  pedagogicalDeep: { whyFr: string; whyEn: string; realSAPFr: string; realSAPEn: string; dependencyFr: string; dependencyEn: string; realErrorFr: string; realErrorEn: string };
}> = {
  po: {
    titleFr: "Bon de commande", titleEn: "Purchase Order", code: "PO", txCode: "ME21N", tCode: "ME21N",
    etapeFr: "Étape 1 sur 7", etapeEn: "Step 1 of 7",
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
    etapeFr: "Étape 2 sur 7", etapeEn: "Step 2 of 7",
    objectiveFr: "Enregistrer la réception physique des marchandises. Le stock est impacté uniquement si la transaction est postée (Posted=Y).",
    objectiveEn: "Record the physical receipt of goods. Stock is only impacted if the transaction is posted (Posted=Y).",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    pedagogicalDeep: {
      whyFr: "Le Goods Receipt (GR) est la confirmation physique que les marchandises commandées sont arrivées en entrepôt. C'est à ce moment que le stock augmente dans le système.",
      whyEn: "The Goods Receipt (GR) is the physical confirmation that ordered goods have arrived at the warehouse. This is when stock increases in the system.",
      realSAPFr: "Dans SAP, MIGO avec mouvement 101 crée un document matière et un document comptable. Le stock passe de 'en transit' à 'disponible'.",
      realSAPEn: "In SAP, MIGO with movement 101 creates a material document and an accounting document. Stock moves from 'in transit' to 'available'.",
      dependencyFr: "Le GR dépend d'un PO ouvert et non clôturé. La quantité reçue ne peut pas dépasser la quantité commandée.",
      dependencyEn: "The GR depends on an open, unclosed PO. The received quantity cannot exceed the ordered quantity.",
      realErrorFr: "Un GR sans PO correspondant crée une 'réception non planifiée'. En audit, cela génère une exception de contrôle interne.",
      realErrorEn: "A GR without a corresponding PO creates an 'unplanned delivery'. In audit, this generates an internal control exception.",
    }
  },
  so: {
    titleFr: "Commande client", titleEn: "Sales Order", code: "SO", txCode: "VA01", tCode: "VA01",
    etapeFr: "Étape 3 sur 7", etapeEn: "Step 3 of 7",
    objectiveFr: "Créer une commande client. Le SO ne peut être créé que si le stock disponible est supérieur à zéro.",
    objectiveEn: "Create a sales order. The SO can only be created if available stock is greater than zero.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    pedagogicalDeep: {
      whyFr: "Le Sales Order (SO) est l'engagement de l'entreprise envers un client. Il déclenche la réservation de stock et le processus de livraison.",
      whyEn: "The Sales Order (SO) is the company's commitment to a customer. It triggers stock reservation and the delivery process.",
      realSAPFr: "Dans SAP, VA01 crée un ordre de vente avec vérification automatique de disponibilité (ATP). SAP vérifie le stock disponible, les réservations et les délais.",
      realSAPEn: "In SAP, VA01 creates a sales order with automatic availability check (ATP). SAP checks available stock, reservations, and lead times.",
      dependencyFr: "Le SO dépend d'un stock disponible positif (résultat du GR). Sans stock, SAP affiche un message de disponibilité insuffisante.",
      dependencyEn: "The SO depends on positive available stock (result of GR). Without stock, SAP displays an insufficient availability message.",
      realErrorFr: "Créer un SO sans stock disponible force une livraison partielle ou un backorder, générant des pénalités de retard client.",
      realErrorEn: "Creating a SO without available stock forces a partial delivery or backorder, generating customer delay penalties.",
    }
  },
  gi: {
    titleFr: "Sortie de stock", titleEn: "Goods Issue", code: "GI", txCode: "VL02N", tCode: "VL02N",
    etapeFr: "Étape 4 sur 7", etapeEn: "Step 4 of 7",
    objectiveFr: "Émettre les marchandises pour le client. Le GI déduit le stock et génère le mouvement 601.",
    objectiveEn: "Issue goods to the customer. The GI deducts stock and generates movement 601.",
    fields: ["docRef", "sku", "bin", "qty", "comment"],
    pedagogicalDeep: {
      whyFr: "Le Goods Issue (GI) est la sortie physique des marchandises de l'entrepôt vers le client. Il réduit le stock et transfère la propriété légale au client.",
      whyEn: "The Goods Issue (GI) is the physical departure of goods from the warehouse to the customer. It reduces stock and transfers legal ownership to the customer.",
      realSAPFr: "Dans SAP, VL02N avec mouvement 601 crée un document matière de sortie et un document comptable débitant le compte COGS.",
      realSAPEn: "In SAP, VL02N with movement 601 creates an outgoing material document and an accounting document debiting the COGS account.",
      dependencyFr: "Le GI dépend d'un SO confirmé et d'un stock suffisant dans le bin spécifié.",
      dependencyEn: "The GI depends on a confirmed SO and sufficient stock in the specified bin.",
      realErrorFr: "Un GI avec stock insuffisant crée un stock négatif dans SAP. En audit, un stock négatif est une anomalie critique.",
      realErrorEn: "A GI with insufficient stock creates negative stock in SAP. In audit, negative stock is a critical anomaly.",
    }
  },
  cc: {
    titleFr: "Comptage inventaire", titleEn: "Cycle Count", code: "CC", txCode: "MI01", tCode: "MI01",
    etapeFr: "Étape 5 sur 7", etapeEn: "Step 5 of 7",
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
    etapeFr: "Étape 6 sur 7", etapeEn: "Step 6 of 7",
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
    etapeFr: "Étape 7 sur 7", etapeEn: "Step 7 of 7",
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
};

type FormValues = {
  docRef?: string;
  sku?: string;
  bin?: string;
  qty?: string;
  physicalQty?: string;
  comment?: string;
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
          {/* Current Stock */}
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
          {/* Pending Transactions */}
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
          {/* Cycle Counts */}
          {(cycleCounts?.length ?? 0) > 0 && (
            <div>
              <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">
                🔍 {t("Cycle Counts", "Cycle Counts")} ({cycleCounts.length})
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

  const submitPO = trpc.transactions.submitPO.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitGR = trpc.transactions.submitGR.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitSO = trpc.transactions.submitSO.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitGI = trpc.transactions.submitGI.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCC = trpc.cycleCounts.submit.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitADJ = trpc.transactions.submitADJ.useMutation({ onSuccess: handleSuccess, onError: handleError });
  const submitCompliance = trpc.compliance.finalize.useMutation({ onSuccess: handleSuccess, onError: handleError });

  const { register, handleSubmit, watch, formState: { errors: formErrors } } = useForm<FormValues>();

  function handleSuccess(data: any) {
    if (data?.demoWarning) {
      toast.warning(`⚠ ${t("Avertissement (mode démo)", "Warning (demo mode)")} : ${data.demoWarning}`);
    } else {
      toast.success(`${t(cfg.titleFr, cfg.titleEn)} — ${t("Étape validée avec succès !", "Step validated successfully!")}`);
    }
    refetch();
    setTimeout(() => navigate(`/student/run/${runId}`), 1200);
  }

  function handleError(err: any) {
    toast.error(err.message ?? t("Erreur de validation", "Validation error"));
  }

  function onSubmit(values: FormValues) {
    const base = { runId: parseInt(runId) };
    const qty = values.qty ? Number(values.qty) : 0;
    const physicalQty = values.physicalQty ? Number(values.physicalQty) : 0;
    if (cfg.fields.includes("sku") && (!values.sku || values.sku === "")) {
      toast.error(t("Veuillez sélectionner un SKU avant de valider.", "Please select a SKU before validating."));
      return;
    }
    if (cfg.fields.includes("bin") && (!values.bin || values.bin === "")) {
      toast.error(t("Veuillez sélectionner un emplacement (Bin) avant de valider.", "Please select a bin location before validating."));
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
    switch (step?.toLowerCase()) {
      case "po": return submitPO.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "gr": return submitGR.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "so": return submitSO.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "gi": return submitGI.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef!, comment: values.comment });
      case "cc": return submitCC.mutate({ ...base, sku: values.sku!, bin: values.bin!, physicalQty });
      case "adj": return submitADJ.mutate({ ...base, sku: values.sku!, bin: values.bin!, qty, docRef: values.docRef ?? "ADJ-AUTO", comment: values.comment });
      case "compliance": return submitCompliance.mutate({ ...base });
    }
  }

  const isAnyPending = submitPO.isPending || submitGR.isPending || submitSO.isPending || submitGI.isPending || submitCC.isPending || submitADJ.isPending || submitCompliance.isPending;

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
  const selectedSku = watch("sku");
  const selectedBin = watch("bin");
  const availableStock = selectedSku && selectedBin ? (inventory[`${selectedSku}::${selectedBin}`] ?? 0) : null;
  const isOutOfSequence = isDemo && !isCurrentStep && !isCompleted;

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

        {/* Transaction Header */}
        <div className={`rounded-t-md px-5 py-3 flex items-center justify-between ${isDemo ? "bg-indigo-900" : "bg-primary"}`}>
          <div>
            <p className="text-white/60 text-xs">{t("Code Transaction", "Transaction Code")}</p>
            <p className="text-white font-bold text-sm">{cfg.tCode} — {t(cfg.titleFr, cfg.titleEn)}</p>
          </div>
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

            {/* Objective */}
            <div className="alert-info m-4 mb-0">
              <p className="text-xs font-semibold mb-0.5 flex items-center gap-1.5">
                <Info size={12} /> {t("Objectif pédagogique", "Pedagogical Objective")}
              </p>
              <p className="text-xs">{t(cfg.objectiveFr, cfg.objectiveEn)}</p>
            </div>

            {/* Context Panel: Previous Steps Summary (demo) */}
            {(["gr","so","gi","cc","adj"].includes(step?.toLowerCase() ?? "")) && runData?.demoBackendState?.transactions && runData.demoBackendState.transactions.length > 0 && (
              <div className="mx-4 mt-4 bg-primary/5 border border-primary/20 rounded-md p-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                  {t("Référence — Étapes précédentes", "Reference — Previous Steps")}
                </p>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left pb-1">{t("Transaction", "Transaction")}</th>
                      <th className="text-left pb-1">SKU</th>
                      <th className="text-left pb-1">Bin</th>
                      <th className="text-left pb-1">{t("Qté", "Qty")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runData.demoBackendState.transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-t border-border">
                        <td className="py-1 font-mono font-semibold text-primary">{tx.txType}</td>
                        <td className="py-1 text-foreground">{tx.sku || <span className="text-destructive">{t("non défini", "undefined")}</span>}</td>
                        <td className="py-1 font-mono text-foreground">{tx.bin || "—"}</td>
                        <td className="py-1 text-foreground">{tx.qty ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Context Panel: Stock for evaluation mode */}
            {(["gi","cc"].includes(step?.toLowerCase() ?? "")) && !isDemo && (
              <div className="mx-4 mt-4 bg-primary/5 border border-primary/20 rounded-md p-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                  📊 {t("Stock actuel par emplacement", "Current stock by location")}
                </p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {t("Utilisez le même SKU et Bin que vos étapes précédentes (PO/GR).", "Use the same SKU and Bin as your previous steps (PO/GR).")}
                </p>
                {Object.entries(runData?.inventory ?? {}).filter(([, qty]) => (qty as number) > 0).length === 0 ? (
                  <p className="text-[10px] text-destructive">
                    ⚠ {t("Aucun stock disponible — vérifiez que la GR a été validée avec un SKU sélectionné.", "No stock available — verify that GR was validated with a selected SKU.")}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(runData?.inventory ?? {}).filter(([, qty]) => (qty as number) > 0).map(([key, qty]) => {
                      const [sku, bin] = key.split("::");
                      return (
                        <p key={key} className="text-[10px] font-mono">
                          <span className="text-primary font-semibold">{sku}</span> @ <span className="text-green-600 dark:text-green-400">{bin}</span> — <strong className="text-foreground">{qty as number} {t("unités", "units")}</strong>
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* Compliance step */}
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
                    {runData?.compliance.issuesFr.map((issue: string, i: number) => (
                      <p key={i} className={`text-xs ${isDemo ? "text-amber-700 dark:text-amber-400" : "text-destructive"}`}>• {issue}</p>
                    ))}
                  </div>
                  {!runData?.compliance.compliant && !isDemo && (
                    <div className="alert-blocked flex items-start gap-2 mb-4">
                      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      <p className="text-xs">{t("Résolvez tous les problèmes de conformité avant de clôturer le module.", "Resolve all compliance issues before closing the module.")}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-0.5 mb-3">
                    <label className="text-xs text-muted-foreground">{t("Commentaire de clôture (optionnel)", "Closing comment (optional)")}</label>
                  </div>
                  <input {...register("comment")} placeholder={t("Ex: Module 1 complété avec succès", "Ex: Module 1 completed successfully")} className="fiori-field-input" />
                </div>
              )}

              {/* Standard fields */}
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
                  <select {...register("sku")} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner un SKU", "Select a SKU")} —</option>
                    {masterData?.map((s: any) => (
                      <option key={s.sku} value={s.sku}>{s.sku} — {s.descriptionFr}</option>
                    ))}
                  </select>
                </div>
              )}

              {cfg.fields.includes("bin") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Bin / Emplacement", "Bin / Location")} <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Requis", "Required")}</span>
                  </label>
                  <select {...register("bin")} className="fiori-field-input fiori-field-active">
                    <option value="">— {t("Sélectionner un emplacement", "Select a location")} —</option>
                    {bins?.map((b: any) => (
                      <option key={b.binCode} value={b.binCode}>{b.binCode} — {b.zone}</option>
                    ))}
                  </select>
                  {availableStock !== null && (
                    <p className={`text-xs mt-1 font-medium ${availableStock > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {t("Stock disponible", "Available stock")} : {availableStock} {t("unité(s)", "unit(s)")}
                    </p>
                  )}
                </div>
              )}

              {cfg.fields.includes("qty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité", "Quantity")} <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Requis", "Required")}</span>
                  </label>
                  <input {...register("qty")} type="number" min={1} placeholder="Ex: 50" className="fiori-field-input fiori-field-active" />
                  {(["gi","so"].includes(step?.toLowerCase() ?? "")) && availableStock !== null && (
                    <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                      {isDemo ? "⚠ Démo : " : ""}
                      {t(`Ne peut pas dépasser le stock disponible (${availableStock})`, `Cannot exceed available stock (${availableStock})`)}
                      {isDemo && t(" — En mode démonstration, le dépassement est autorisé avec avertissement.", " — In demo mode, exceeding is allowed with a warning.")}
                    </p>
                  )}
                </div>
              )}

              {cfg.fields.includes("physicalQty") && (
                <div>
                  <label className="fiori-field-label">
                    {t("Quantité physique comptée", "Physical quantity counted")} <span className="text-destructive">*</span>
                  </label>
                  <input {...register("physicalQty")} type="number" min={0} placeholder="Ex: 48" className="fiori-field-input fiori-field-active" />
                </div>
              )}

              {cfg.fields.includes("comment") && step?.toLowerCase() !== "compliance" && (
                <div>
                  <label className="fiori-field-label">
                    {t("Commentaire", "Comment")}{" "}
                    <span className="text-[10px] text-muted-foreground ml-1">{t("Optionnel", "Optional")}</span>
                  </label>
                  <input {...register("comment")} placeholder={t("Remarques...", "Remarks...")} className="fiori-field-input" />
                </div>
              )}

              {/* Status Block */}
              <div className={isDemo ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-md p-3" : "alert-info"}>
                <p className="text-xs font-semibold">
                  {isDemo ? t("MODE DÉMONSTRATION — STATUT", "DEMO MODE — STATUS") : t("STATUT DE L'ÉTAPE", "STEP STATUS")}
                </p>
                <p className="text-xs mt-0.5">
                  {isDemo
                    ? t("Étape accessible en mode démonstration. Aucun score enregistré.", "Step accessible in demo mode. No score recorded.")
                    : t("Étape active — Remplissez les champs requis et soumettez pour valider.", "Active step — Fill in the required fields and submit to validate.")}
                </p>
              </div>

              <PedagogicalPanel cfg={cfg} isDemo={isDemo} />
              <BackendTransparencyPanel runData={runData} />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button type="button" onClick={() => navigate(`/student/run/${runId}`)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft size={13} /> {t("Retour au Mission Control", "Back to Mission Control")}
                </button>
                <button
                  type="submit"
                  disabled={isAnyPending || (!isDemo && step?.toLowerCase() === "compliance" && !runData?.compliance.compliant)}
                  className={`flex items-center gap-2 text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDemo ? "bg-purple-600 hover:bg-purple-700" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {isAnyPending ? (
                    <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> {t("Traitement...", "Processing...")}</>
                  ) : (
                    <><CheckCircle size={13} /> {isDemo ? t("Valider (Démo)", "Validate (Demo)") : `${t("Valider —", "Validate —")} ${t(cfg.titleFr, cfg.titleEn)}`}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </FioriShell>
  );
}
