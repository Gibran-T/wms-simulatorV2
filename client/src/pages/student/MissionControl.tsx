import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { CheckCircle, Lock, ArrowRight, AlertTriangle, Trophy, FlaskConical } from "lucide-react";
import FioriShell from "@/components/FioriShell";

// Pedagogical objectives for all M1-M5 steps
const PEDAGOGICAL_OBJECTIVES: Record<string, { fr: string; en: string }> = {
  // M1
  PO:           { fr: "Comprendre le processus d'approvisionnement : création d'une commande d'achat (PO) avec fournisseur, SKU et quantité.", en: "Understand the procurement process: creating a purchase order (PO) with supplier, SKU, and quantity." },
  GR:           { fr: "Maîtriser l'entrée en stock : la réception physique (GR) impacte l'inventaire uniquement si Posted=Y.", en: "Master stock entry: physical receipt (GR) impacts inventory only when Posted=Y." },
  PUTAWAY_M1:   { fr: "Comprendre le rangement WMS : transférer la marchandise de la zone RÉCEPTION vers la zone STOCKAGE via LT0A.", en: "Understand WMS putaway: transfer goods from RECEPTION zone to STOCKAGE zone via LT0A." },
  STOCK:        { fr: "Vérifier la disponibilité stock : confirmer que le stock est bien en zone STOCKAGE avant de créer un SO.", en: "Verify stock availability: confirm stock is in STOCKAGE zone before creating a SO." },
  SO:           { fr: "Analyser la demande client : un Sales Order (SO) ne peut être créé que si le stock disponible est suffisant.", en: "Analyze customer demand: a Sales Order (SO) can only be created if sufficient stock is available." },
  PICKING_M1:   { fr: "Maîtriser le prélèvement WMS : déplacer la marchandise de STOCKAGE vers EXPÉDITION via VL01N avant la GI.", en: "Master WMS picking: move goods from STOCKAGE to EXPÉDITION via VL01N before GI." },
  GI:           { fr: "Contrôler la sortie de stock : le Goods Issue (GI) déduit le stock et génère le mouvement 601.", en: "Control stock outflow: Goods Issue (GI) deducts stock and generates movement 601." },
  CC:           { fr: "Vérifier l'exactitude de l'inventaire : comparer le stock physique au stock système pour détecter les écarts.", en: "Verify inventory accuracy: compare physical stock to system stock to detect variances." },
  ADJ:          { fr: "Corriger les écarts : tout écart de Cycle Count doit être résolu par un ajustement (ADJ) avant la clôture.", en: "Correct variances: all Cycle Count variances must be resolved by an adjustment (ADJ) before closing." },
  COMPLIANCE:   { fr: "Valider la conformité système : tous les indicateurs doivent être au vert avant de clôturer le module.", en: "Validate system compliance: all indicators must be green before closing the module." },
  // M2
  FIFO_PICK:      { fr: "Appliquer la règle FIFO : prélever en priorité les lots les plus anciens (date d'entrée la plus tôt) pour minimiser les risques d'obsolescence.", en: "Apply FIFO rule: pick oldest batches first (earliest entry date) to minimize obsolescence risk." },
  STOCK_ACCURACY: { fr: "Calculer le taux de précision de l'inventaire (IRA) : comparer le stock physique au stock système et identifier les écarts significatifs.", en: "Calculate Inventory Record Accuracy (IRA): compare physical to system stock and identify significant variances." },
  COMPLIANCE_ADV: { fr: "Valider la conformité avancée : vérifier que tous les mouvements FIFO et les comptages sont conformes aux standards WMS.", en: "Validate advanced compliance: verify all FIFO movements and counts meet WMS standards." },
  // M3
  CC_LIST:        { fr: "Planifier le comptage cyclique : identifier les articles à compter selon la méthode ABC et préparer la liste de comptage.", en: "Plan cycle counting: identify items to count using ABC method and prepare the count list." },
  CC_COUNT:       { fr: "Exécuter le comptage physique : saisir les quantités réelles pour chaque article et calculer les variances par rapport au stock système.", en: "Execute physical count: enter actual quantities for each item and calculate variances against system stock." },
  CC_RECON:       { fr: "Réconcilier les écarts : analyser les variances et appliquer les ajustements nécessaires pour aligner le stock physique et système.", en: "Reconcile variances: analyze discrepancies and apply necessary adjustments to align physical and system stock." },
  REPLENISH:      { fr: "Calculer le point de réapprovisionnement (ROP) et la quantité économique de commande (EOQ) pour optimiser les niveaux de stock.", en: "Calculate the Reorder Point (ROP) and Economic Order Quantity (EOQ) to optimize stock levels." },
  COMPLIANCE_M3:  { fr: "Valider la conformité du contrôle des stocks : IRA ≥ 95%, tous les écarts résolus, niveaux de stock optimisés.", en: "Validate stock control compliance: IRA ≥ 95%, all variances resolved, stock levels optimized." },
  // M4
  KPI_DATA:       { fr: "Collecter les données KPI : saisir les valeurs réelles de livraison, réception et stock pour calculer les indicateurs de performance.", en: "Collect KPI data: enter actual delivery, reception, and stock values to calculate performance indicators." },
  KPI_ROTATION:   { fr: "Analyser la rotation des stocks (DSI/ITO) : comprendre le lien entre la vitesse de rotation et les coûts de possession.", en: "Analyze stock rotation (DSI/ITO): understand the link between turnover speed and carrying costs." },
  KPI_SERVICE:    { fr: "Mesurer le taux de service client (OTIF, Fill Rate) : quantifier l'impact des ruptures de stock sur la satisfaction client.", en: "Measure customer service rate (OTIF, Fill Rate): quantify the impact of stockouts on customer satisfaction." },
  KPI_DIAGNOSTIC: { fr: "Diagnostiquer les causes racines des sous-performances KPI et proposer des actions correctives ciblées (méthode RCA).", en: "Diagnose root causes of KPI underperformance and propose targeted corrective actions (RCA method)." },
  COMPLIANCE_M4:  { fr: "Valider le tableau de bord KPI : tous les indicateurs calculés, diagnostics documentés, plan d'action défini.", en: "Validate KPI dashboard: all indicators calculated, diagnostics documented, action plan defined." },
  // M5
  M5_RECEPTION:   { fr: "Simuler la réception d'urgence : gérer un flux entrant non planifié avec contraintes de temps et de ressources.", en: "Simulate emergency reception: manage an unplanned inbound flow with time and resource constraints." },
  M5_PICKING:     { fr: "Optimiser le prélèvement sous contrainte : appliquer les règles FIFO/FEFO dans un contexte de pression opérationnelle.", en: "Optimize picking under constraint: apply FIFO/FEFO rules in an operational pressure context." },
  M5_SHIPPING:    { fr: "Gérer l'expédition prioritaire : prioriser les commandes selon les critères OTIF et les contraintes de transport.", en: "Manage priority shipping: prioritize orders by OTIF criteria and transport constraints." },
  M5_CRISIS:      { fr: "Gérer une crise opérationnelle : identifier les causes, évaluer l'impact et décider des actions correctives en temps réel.", en: "Manage an operational crisis: identify causes, assess impact, and decide corrective actions in real time." },
  M5_KPI_REVIEW:  { fr: "Analyser les KPI post-simulation : comparer les performances réelles aux objectifs et identifier les axes d'amélioration.", en: "Analyze post-simulation KPIs: compare actual performance to targets and identify improvement areas." },
  M5_DECISION:    { fr: "Prendre une décision stratégique : formuler une recommandation structurée basée sur les données de la simulation.", en: "Make a strategic decision: formulate a structured recommendation based on simulation data." },
  COMPLIANCE_M5:  { fr: "Valider la simulation intégrée : tous les flux complétés, KPI analysés, décision stratégique documentée.", en: "Validate integrated simulation: all flows completed, KPIs analyzed, strategic decision documented." },
};

const MODULE_LABELS: Record<number, { fr: string; en: string }> = {
  1: { fr: "Module 1 — Fondements ERP/WMS", en: "Module 1 — ERP/WMS Foundations" },
  2: { fr: "Module 2 — Exécution avancée", en: "Module 2 — Advanced Execution" },
  3: { fr: "Module 3 — Contrôle des stocks", en: "Module 3 — Stock Control" },
  4: { fr: "Module 4 — KPI logistiques", en: "Module 4 — Logistics KPIs" },
  5: { fr: "Module 5 — Simulation intégrée", en: "Module 5 — Integrated Simulation" },
};

export default function MissionControl() {
  const { runId } = useParams<{ runId: string }>();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { data, isLoading, refetch } = trpc.runs.state.useQuery({ runId: parseInt(runId) });

  if (isLoading) {
    return (
      <FioriShell title="MISSION CONTROL" breadcrumbs={[{ label: t("Scénarios", "Scenarios"), href: "/student/scenarios" }, { label: "Mission Control" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </FioriShell>
    );
  }

  if (!data) return null;

  const { run, scenario, completedSteps, compliance, totalScore: score, nextStep, progressPct, isDemo, moduleId, steps: backendSteps } = data;

  // Use dynamic steps from backend (supports M1-M5)
  const STEPS = (backendSteps ?? []).map((s: any) => ({
    key: s.code,
    label: s.labelEn ?? s.code,
    labelFr: s.labelFr ?? s.code,
    code: s.sapCode ?? s.code,
    descFr: s.descFr ?? "",
    descEn: s.descEn ?? "",
  }));

  const completedCount = completedSteps.length;
  const isCompliant = compliance.compliant;
  const moduleLabel = MODULE_LABELS[moduleId ?? 1];

  const getStepStatus = (stepKey: string) => {
    if (completedSteps.includes(stepKey as any)) return "completed";
    if (stepKey === (nextStep as any)?.code) return "active";
    if (isDemo) return "demo-available";
    return "locked";
  };
  const nextStepCode = (nextStep as any)?.code as string | undefined;

  const nextStepDef = STEPS.find(s => s.key === nextStepCode);

  return (
    <FioriShell
      title={`MISSION CONTROL — ${scenario?.name}`}
      breadcrumbs={[{ label: t("Scénarios", "Scenarios"), href: "/student/scenarios" }, { label: "Mission Control" }]}
    >
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── DEMO MODE BANNER ── */}
        {isDemo && (
          <div className="bg-indigo-950 border border-indigo-700 rounded-md px-5 py-3 flex items-center gap-3">
            <FlaskConical size={18} className="text-indigo-300 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                🔵 {t("MODE DÉMONSTRATION ACTIF — Score pédagogique visible (non officiel)", "DEMO MODE ACTIVE — Pedagogical score visible (unofficial)")}
              </p>
              <p className="text-indigo-300 text-xs mt-0.5">
                {t(
                  "Progression libre activée. Le score affiché est calculé en temps réel pour illustrer le système d'évaluation — il n'est pas comptabilisé dans les statistiques officielles.",
                  "Free progression enabled. The displayed score is calculated in real time to illustrate the evaluation system — it is not counted in official statistics."
                )}
              </p>
            </div>
            {score > 0 && (
              <div className="flex-shrink-0 text-center">
                <p className="text-indigo-300 text-[10px] font-semibold uppercase">{t("Score pédagogique", "Pedagogical Score")}</p>
                <p className="text-white font-bold text-2xl">{score}<span className="text-sm">/100</span></p>
              </div>
            )}
          </div>
        )}

        {/* ── Mission Context ── */}
        <div className="bg-card border border-border rounded-md p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{t("Entreprise", "Company")}</p>
              <p className="font-semibold text-foreground">Distribution Concorde Inc.</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{t("Module", "Module")}</p>
              <p className="font-semibold text-foreground">{t(moduleLabel?.fr ?? "Module 1", moduleLabel?.en ?? "Module 1")}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{t("Scénario", "Scenario")}</p>
              <p className="font-semibold text-foreground">{scenario?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{t("Difficulté", "Difficulty")}</p>
              <p className="font-semibold text-foreground capitalize">{scenario?.difficulty}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{t("Score", "Score")}</p>
              {isDemo ? (
                <div>
                  <p className="font-semibold text-purple-500 text-base">{score} / 100</p>
                  <p className="text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5">
                    <FlaskConical size={8} /> {t("Non officiel", "Unofficial")}
                  </p>
                </div>
              ) : (
                <p className="font-semibold text-primary text-base">{score} / 100</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Next Action Banner ── */}
        <div className={`rounded-md p-4 flex items-center gap-3 ${
          isCompliant && run.status === "completed"
            ? "bg-green-700 dark:bg-green-900"
            : nextStep
            ? isDemo ? "bg-indigo-900" : "bg-primary"
            : "bg-destructive"
        }`}>
          <div className="flex-shrink-0">
            {run.status === "completed" ? <Trophy size={22} className="text-white" /> : <ArrowRight size={22} className="text-white" />}
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
              {isDemo
                ? t("Mode Démonstration — Prochaine étape suggérée", "Demo Mode — Next suggested step")
                : t("Prochaine action requise", "Next required action")}
            </p>
            <p className="text-white font-bold text-base">
              {run.status === "completed"
                ? t("✅ Simulation terminée — Voir le rapport final", "✅ Simulation complete — View final report")
                : nextStepCode && nextStepDef
                ? `→ ${nextStepDef.label} (${nextStepDef.code})`
                : nextStepCode
                ? `→ ${nextStepCode}`
                : isDemo
                ? t("✅ Toutes les étapes complétées", "✅ All steps completed")
                : isCompliant
                ? t("✅ Simulation terminée — Voir le rapport final", "✅ Simulation complete — View final report")
                : t("⚠ Vérifier les blocages système", "⚠ Check system blocks")}
            </p>
          </div>
          {run.status === "completed" ? (
            <button
              onClick={() => navigate(`/student/run/${runId}/report`)}
              className="bg-white text-green-700 text-xs font-bold px-4 py-2 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              {t("Voir Rapport", "View Report")}
            </button>
          ) : nextStepCode && (
            <button
              onClick={() => navigate(`/student/run/${runId}/step/${nextStepCode.toLowerCase()}`)}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors flex-shrink-0"
            >
              {t("Exécuter →", "Execute →")}
            </button>
          )}
        </div>

        {/* ── Pedagogical Objective ── */}
        {nextStepCode && (
          <div className="alert-info">
            <p className="text-xs font-semibold mb-0.5">
              {t("Objectif pédagogique", "Pedagogical Objective")} — {nextStepDef ? t(nextStepDef.labelFr, nextStepDef.label) : nextStepCode}
            </p>
            <p className="text-xs">
              {t(
                PEDAGOGICAL_OBJECTIVES[nextStepCode]?.fr ?? "",
                PEDAGOGICAL_OBJECTIVES[nextStepCode]?.en ?? ""
              )}
            </p>
          </div>
        )}

        {/* ── Process Flow ── */}
        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t(`Flux de processus — ${moduleLabel?.fr ?? "Module 1"}`, `Process Flow — ${moduleLabel?.en ?? "Module 1"}`)}
            </p>
            {isDemo && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <FlaskConical size={9} /> {t("Progression libre", "Free progression")}
              </span>
            )}
          </div>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {STEPS.map((step, i) => {
              const status = getStepStatus(step.key);
              const isActive = step.key === nextStepCode;
              const isClickable = status !== "locked";
              return (
                <div key={step.key} className="flex items-start flex-shrink-0">
                  <div className="flex flex-col items-center gap-2 w-24">
                    <button
                      onClick={() => isClickable && navigate(`/student/run/${runId}/step/${step.key.toLowerCase()}`)}
                      title={isDemo && status === "demo-available" ? t("Mode démonstration — cliquez pour accéder", "Demo mode — click to access") : undefined}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                        status === "completed"       ? "bg-green-600 border-green-600 text-white" :
                        isActive                     ? "bg-primary border-primary text-primary-foreground shadow-lg" :
                        status === "demo-available"  ? "bg-purple-100 dark:bg-purple-950/40 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white cursor-pointer" :
                        "bg-secondary border-border text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {status === "completed"      ? <CheckCircle size={18} /> :
                       status === "locked"         ? <Lock size={14} /> :
                       status === "demo-available" ? <FlaskConical size={14} /> :
                       <span>{i + 1}</span>}
                    </button>
                    <div className="text-center">
                      <p className={`text-xs font-semibold leading-tight ${
                        isActive                    ? "text-primary" :
                        status === "completed"      ? "text-green-600 dark:text-green-400" :
                        status === "demo-available" ? "text-purple-600 dark:text-purple-400" :
                        "text-muted-foreground"
                      }`}>{step.key}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{step.code}</p>
                    </div>
                    {isActive && <span className="badge-pending text-[9px]">{t("ACTIF", "ACTIVE")}</span>}
                    {status === "completed" && <span className="badge-valid text-[9px]">{t("VALIDÉ", "DONE")}</span>}
                    {status === "demo-available" && !isActive && (
                      <span className="text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 px-1.5 py-0.5 rounded-full">
                        {t("LIBRE", "FREE")}
                      </span>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-6 mt-6 flex-shrink-0 ${
                      status === "completed" ? "bg-green-500" :
                      isDemo ? "bg-purple-300 dark:bg-purple-800" :
                      "bg-border"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progress + Compliance Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progression */}
          <div className="bg-card border border-border rounded-md p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("Progression pédagogique", "Pedagogical Progress")}
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-primary">{progressPct}%</span>
              <span className={`text-xs font-semibold ${progressPct === 100 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                {progressPct === 100 ? t("TERMINÉ", "COMPLETE") : t("EN COURS", "IN PROGRESS")}
              </span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedCount} / {STEPS.length} {t("étapes validées", "steps completed")}
            </p>
          </div>

          {/* Conformité */}
          <div className="bg-card border border-border rounded-md p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("Conformité système", "System Compliance")}
            </p>
            <div className={`rounded-md p-3 ${isCompliant ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
              <p className={`text-sm font-bold mb-2 ${isCompliant ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                {isCompliant
                  ? t("✅ CONFORME", "✅ COMPLIANT")
                  : isDemo
                  ? t("⚠ NON CONFORME (démo)", "⚠ NON-COMPLIANT (demo)")
                  : t("🔴 NON CONFORME", "🔴 NON-COMPLIANT")}
              </p>
              <div className="space-y-1">
                {[
                  { labelFr: "Transactions postées", labelEn: "Posted transactions", ok: !compliance.issues.some((i: string) => i.includes("unposted")), valFr: "OK", valEn: "OK", failFr: "Non postée(s)", failEn: "Unposted" },
                  { labelFr: "Stock positif",         labelEn: "Positive stock",       ok: !compliance.issues.some((i: string) => i.includes("Negative")), valFr: "OK", valEn: "OK", failFr: "Stock négatif", failEn: "Negative stock" },
                  { labelFr: "Écarts résolus",        labelEn: "Variances resolved",   ok: !compliance.issues.some((i: string) => i.includes("variance")), valFr: "OK", valEn: "OK", failFr: "ADJ requis",    failEn: "ADJ required" },
                ].map((item) => (
                  <div key={item.labelFr} className="flex items-center justify-between text-xs">
                    <span className={isCompliant ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                      {t(item.labelFr, item.labelEn)}
                    </span>
                    <span className={`font-semibold ${item.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {item.ok ? t(item.valFr, item.valEn) : t(item.failFr, item.failEn)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Odoo Lab Banner (M2, M3, M5 only) ── */}
        {(moduleId === 2 || moduleId === 3 || moduleId === 5) && (
          <div className="bg-emerald-950 border border-emerald-700 rounded-md px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">O</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                  🟢 {t("LABORATOIRE ODOO — Environnement WMS Industriel", "ODOO LAB — Industrial WMS Environment")}
                </p>
                <p className="text-emerald-300 text-xs mb-3">
                  {moduleId === 2 && t(
                    "M2 — Exécution avancée : Ouvrez Odoo pour visualiser la hiérarchie de l'entrepôt (Zones → Racks → Bins) et exécuter les opérations de Putaway dans un environnement WMS réel utilisé par des milliers d'entreprises.",
                    "M2 — Advanced Execution: Open Odoo to visualize the warehouse hierarchy (Zones → Racks → Bins) and execute Putaway operations in a real WMS environment used by thousands of companies."
                  )}
                  {moduleId === 3 && t(
                    "M3 — Contrôle des stocks : Ouvrez Odoo pour effectuer un Inventaire Tournant (Cycle Count) en temps réel, visualiser les écarts et appliquer les ajustements dans un environnement WMS industriel open-source.",
                    "M3 — Stock Control: Open Odoo to perform a live Cycle Count, visualize variances and apply adjustments in an open-source industrial WMS environment."
                  )}
                  {moduleId === 5 && t(
                    "M5 — Simulation intégrée : Ouvrez Odoo pour utiliser la traçabilité par Lot/Numéro de série afin d'identifier l'origine de la crise et documenter les actions correctives.",
                    "M5 — Integrated Simulation: Open Odoo to use Lot/Serial Number traceability to identify the crisis origin and document corrective actions."
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://demo.odoo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors"
                  >
                    {t("Ouvrir le Lab Odoo →", "Open Odoo Lab →")}
                  </a>
                  {moduleId === 2 && (
                    <a
                      href="https://demo.odoo.com/odoo/inventory"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      {t("Inventaire → Opérations → Transferts", "Inventory → Operations → Transfers")}
                    </a>
                  )}
                  {moduleId === 3 && (
                    <a
                      href="https://demo.odoo.com/odoo/inventory/inventory-adjustments"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      {t("Inventaire → Ajustements de stock", "Inventory → Stock Adjustments")}
                    </a>
                  )}
                  {moduleId === 5 && (
                    <a
                      href="https://demo.odoo.com/odoo/inventory/products"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      {t("Inventaire → Produits → Traçabilité Lots", "Inventory → Products → Lot Traceability")}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">{t("Plateforme", "Platform")}</p>
                <p className="text-emerald-200 text-xs font-bold">Odoo 17</p>
                <p className="text-emerald-400 text-[10px]">Open-Source</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Compliance Alert ── */}
        {!isCompliant && (
          <div className={`flex items-start gap-3 ${
            isDemo
              ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3"
              : "alert-blocked"
          }`}>
            <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${isDemo ? "text-amber-600 dark:text-amber-400" : ""}`} />
            <div>
              <p className="text-xs font-semibold mb-0.5">
                {isDemo
                  ? t("⚠ Avertissement pédagogique (mode démonstration)", "⚠ Pedagogical warning (demo mode)")
                  : t("Diagnostic système", "System Diagnostic")}
              </p>
              <p className="text-xs">
                {compliance.issuesFr.join(" — ")}
                {isDemo && t(
                  " — En mode démonstration, vous pouvez continuer malgré ces avertissements.",
                  " — In demo mode, you can continue despite these warnings."
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </FioriShell>
  );
}
