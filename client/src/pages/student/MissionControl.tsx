import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { CheckCircle, Lock, ArrowRight, AlertTriangle, Trophy, FlaskConical } from "lucide-react";

const STEPS = [
  { key: "PO",         label: "Purchase Order", labelFr: "Bon de commande",    code: "ME21N", descFr: "Créer la commande d'achat",        descEn: "Create purchase order" },
  { key: "GR",         label: "Goods Receipt",  labelFr: "Réception marchand.", code: "MIGO",  descFr: "Enregistrer la réception",          descEn: "Record goods receipt" },
  { key: "SO",         label: "Sales Order",    labelFr: "Commande client",     code: "VA01",  descFr: "Créer la commande client",          descEn: "Create sales order" },
  { key: "GI",         label: "Goods Issue",    labelFr: "Sortie de stock",     code: "VL02N", descFr: "Émettre les marchandises",          descEn: "Issue goods" },
  { key: "CC",         label: "Cycle Count",    labelFr: "Comptage inventaire", code: "MI01",  descFr: "Compter l'inventaire",              descEn: "Count inventory" },
  { key: "ADJ",        label: "Adjustment",     labelFr: "Ajustement",          code: "MI07",  descFr: "Ajuster les écarts",                descEn: "Adjust variances" },
  { key: "COMPLIANCE", label: "Compliance",     labelFr: "Conformité",          code: "MB52",  descFr: "Valider la conformité",             descEn: "Validate compliance" },
];

const PEDAGOGICAL_OBJECTIVES: Record<string, { fr: string; en: string }> = {
  PO:         { fr: "Comprendre le processus d'approvisionnement : création d'une commande d'achat (PO) avec fournisseur, SKU et quantité.", en: "Understand the procurement process: creating a purchase order (PO) with supplier, SKU, and quantity." },
  GR:         { fr: "Maîtriser l'entrée en stock : la réception physique (GR) impacte l'inventaire uniquement si Posted=Y.", en: "Master stock entry: physical receipt (GR) impacts inventory only when Posted=Y." },
  SO:         { fr: "Analyser la demande client : un Sales Order (SO) ne peut être créé que si le stock disponible est suffisant.", en: "Analyze customer demand: a Sales Order (SO) can only be created if sufficient stock is available." },
  GI:         { fr: "Contrôler la sortie de stock : le Goods Issue (GI) déduit le stock et génère le mouvement 601.", en: "Control stock outflow: Goods Issue (GI) deducts stock and generates movement 601." },
  CC:         { fr: "Vérifier l'exactitude de l'inventaire : comparer le stock physique au stock système pour détecter les écarts.", en: "Verify inventory accuracy: compare physical stock to system stock to detect variances." },
  ADJ:        { fr: "Corriger les écarts : tout écart de Cycle Count doit être résolu par un ajustement (ADJ) avant la clôture.", en: "Correct variances: all Cycle Count variances must be resolved by an adjustment (ADJ) before closing." },
  COMPLIANCE: { fr: "Valider la conformité système : tous les indicateurs doivent être au vert avant de clôturer le module.", en: "Validate system compliance: all indicators must be green before closing the module." },
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

  const { run, scenario, completedSteps, compliance, totalScore: score, nextStep, progressPct, isDemo } = data;
  const completedCount = completedSteps.length;
  const isCompliant = compliance.compliant;

  const getStepStatus = (stepKey: string) => {
    if (completedSteps.includes(stepKey as any)) return "completed";
    if (stepKey === (nextStep as any)?.code) return "active";
    if (isDemo) return "demo-available";
    return "locked";
  };
  const nextStepCode = (nextStep as any)?.code as string | undefined;

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
              <p className="font-semibold text-foreground">{t("Module 1 — Logistique", "Module 1 — Logistics")}</p>
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
                : nextStepCode
                ? `→ ${STEPS.find(s => s.key === nextStepCode)?.label ?? nextStepCode} (${STEPS.find(s => s.key === nextStepCode)?.code})`
                : isDemo
                ? t("✅ Toutes les étapes complétées", "✅ All steps completed")
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
              {t("Objectif pédagogique", "Pedagogical Objective")} — {STEPS.find(s => s.key === nextStepCode)?.label}
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
              {t("Flux de processus — Module 1", "Process Flow — Module 1")}
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
                  { labelFr: "Transactions postées", labelEn: "Posted transactions", ok: !compliance.issues.some(i => i.includes("unposted")), valFr: "OK", valEn: "OK", failFr: "Non postée(s)", failEn: "Unposted" },
                  { labelFr: "Stock positif",         labelEn: "Positive stock",       ok: !compliance.issues.some(i => i.includes("Negative")), valFr: "OK", valEn: "OK", failFr: "Stock négatif", failEn: "Negative stock" },
                  { labelFr: "Écarts résolus",        labelEn: "Variances resolved",   ok: !compliance.issues.some(i => i.includes("variance")), valFr: "OK", valEn: "OK", failFr: "ADJ requis",    failEn: "ADJ required" },
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
