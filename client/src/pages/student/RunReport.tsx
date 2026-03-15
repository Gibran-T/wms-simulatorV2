import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { CheckCircle, AlertTriangle, Trophy, ArrowLeft, FlaskConical, TrendingUp, BookOpen, Lightbulb, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const STEP_LABELS_FR: Record<string, string> = {
  PO: "Bon de commande (ME21N)", GR: "Réception marchandises (MIGO)", STOCK: "Stock Disponible",
  SO: "Commande client (VA01)", GI: "Sortie de stock (VL02N)", CC: "Cycle Count (MI01)", COMPLIANCE: "Conformité Système"
};
const STEP_LABELS_EN: Record<string, string> = {
  PO: "Purchase Order (ME21N)", GR: "Goods Receipt (MIGO)", STOCK: "Available Stock",
  SO: "Sales Order (VA01)", GI: "Goods Issue (VL02N)", CC: "Cycle Count (MI01)", COMPLIANCE: "System Compliance"
};

export default function RunReport() {
  const { runId } = useParams<{ runId: string }>();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { data, isLoading } = trpc.runs.state.useQuery({ runId: parseInt(runId) });
  const { data: detail, isLoading: detailLoading } = trpc.runs.detailedReport.useQuery({ runId: parseInt(runId) });
  const recordModulePass = trpc.warehouse.recordModulePass.useMutation();

  useEffect(() => {
    if (!data || data.run.isDemo || data.run.status !== "completed") return;
    const moduleId = data.scenario?.moduleId ?? 1;
    recordModulePass.mutate({ moduleId, score: data.totalScore });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.run?.id]);

  if (isLoading || detailLoading) return (
    <FioriShell title={t("Rapport Final", "Final Report")} breadcrumbs={[
      { label: t("Scénarios", "Scenarios"), href: "/student/scenarios" },
      { label: t("Rapport", "Report") }
    ]}>
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </FioriShell>
  );

  if (!data) return null;
  const { run, scenario, completedSteps, compliance, totalScore, progressPct } = data;
  const isDemo = run.isDemo;
  const isPerfect = totalScore >= 100;
  const STEP_LABELS = t("fr", "en") === "fr" ? STEP_LABELS_FR : STEP_LABELS_EN;

  return (
    <FioriShell
      title={t("Rapport Final de Simulation", "Final Simulation Report")}
      breadcrumbs={[
        { label: t("Scénarios", "Scenarios"), href: "/student/scenarios" },
        { label: scenario?.name ?? t("Rapport", "Report") },
        { label: t("Rapport Final", "Final Report") }
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Demo Notice */}
        {isDemo && (
          <div className="bg-indigo-950 border border-indigo-700 rounded-md px-5 py-3 flex items-center gap-3">
            <FlaskConical size={16} className="text-indigo-300 flex-shrink-0" />
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                {t("Mode Démonstration — Score pédagogique", "Demo Mode — Pedagogical Score")}
              </p>
              <p className="text-indigo-300 text-xs mt-0.5">
                {t(
                  "Ce score est calculé pour illustrer le système d'évaluation. Il n'est pas comptabilisé dans vos statistiques officielles.",
                  "This score is calculated to illustrate the evaluation system. It is not counted in your official statistics."
                )}
              </p>
            </div>
          </div>
        )}

        {/* Header Score */}
        <div className={`rounded-md p-6 text-center ${
          isDemo ? "bg-indigo-900" : isPerfect ? "bg-green-700" : compliance.compliant ? "bg-primary" : "bg-slate-800"
        }`}>
          <div className="flex justify-center mb-3">
            {isPerfect && !isDemo
              ? <Trophy size={36} className="text-yellow-300" />
              : <CheckCircle size={36} className="text-white" />}
          </div>
          {isDemo && (
            <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
              <FlaskConical size={10} /> {t("Score pédagogique (non officiel)", "Pedagogical score (unofficial)")}
            </p>
          )}
          {!isDemo && (
            <p className="text-white/70 text-xs uppercase tracking-wider mb-1">{t("Score final", "Final Score")}</p>
          )}
          <p className="text-white font-bold text-5xl mb-1">{totalScore}<span className="text-2xl">/100</span></p>
          <p className="text-white/80 text-sm">
            {isDemo
              ? `${t("Score pédagogique", "Pedagogical score")} — ${detail?.scoreLabel ?? ""} — ${compliance.compliant ? t("Conforme", "Compliant") : t("Non conforme", "Non-compliant")}`
              : isPerfect ? `🏆 ${t("Simulation parfaite — Félicitations !", "Perfect simulation — Congratulations!")}`
              : compliance.compliant ? `✅ ${t("Module complété avec succès", "Module completed successfully")}`
              : `⚠ ${t("Module complété — Non conforme", "Module completed — Non-compliant")}`}
          </p>
        </div>

        {/* Scores détaillés par étape */}
        {detail && (
          <div className="bg-card border border-border rounded-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-primary" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("Scores détaillés par étape", "Detailed scores by step")}
              </p>
            </div>
            <div className="space-y-3">
              {detail.stepBreakdown.filter(s => s.maxPoints > 0).map(step => (
                <div key={step.step}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {step.completed
                        ? <CheckCircle size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                        : <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
                      <span className="text-xs font-medium text-foreground">{step.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${step.completed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {step.pointsEarned} / {step.maxPoints} pts
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${step.pct}%`,
                        backgroundColor: step.completed ? "hsl(var(--primary))" : "hsl(var(--muted))"
                      }}
                    />
                  </div>
                </div>
              ))}
              {detail.bonuses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={12} className="text-yellow-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground">{t("Bonus simulation parfaite", "Perfect simulation bonus")}</span>
                  </div>
                  <span className="text-xs font-bold text-yellow-600">+{detail.bonuses.reduce((s, e) => s + e.pointsDelta, 0)} pts</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{t("Total", "Total")}</span>
                  <span className={`text-sm font-bold ${isDemo ? "text-purple-500" : "text-primary"}`}>{totalScore} / 100</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${totalScore}%`,
                      backgroundColor: isDemo ? "#7c3aed" : totalScore >= 60 ? "#16a34a" : "#dc2626"
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {t("Seuil de réussite : 60 pts", "Pass threshold: 60 pts")} — {totalScore >= 60 ? `✅ ${t("Atteint", "Reached")}` : `❌ ${t("Non atteint", "Not reached")}`}
                  {isDemo && ` (${t("non officiel", "unofficial")})`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Résumé pédagogique */}
        <div className="bg-card border border-border rounded-md p-5">
          <p className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">
            {t("Résumé Pédagogique", "Pedagogical Summary")}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t("Étapes validées", "Steps validated")}</p>
              <p className="text-lg font-bold text-foreground">{completedSteps.length}/7</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t("Progression", "Progression")}</p>
              <p className="text-lg font-bold text-primary">{progressPct}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t("Conformité système", "System compliance")}</p>
              <p className={`text-sm font-bold ${compliance.compliant ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {compliance.compliant ? `✅ ${t("Conforme", "Compliant")}` : `🔴 ${t("Non conforme", "Non-compliant")}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{t("Erreurs commises", "Errors made")}</p>
              <p className={`text-sm font-bold ${(detail?.errors.length ?? 0) === 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {detail?.errors.length ?? 0}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {["PO","GR","STOCK","SO","GI","CC","COMPLIANCE"].map(step => {
              const done = completedSteps.includes(step as any);
              const stepDetail = detail?.stepBreakdown.find(s => s.step === step);
              const label = t(STEP_LABELS_FR[step] ?? step, STEP_LABELS_EN[step] ?? step);
              return (
                <div key={step} className={`flex items-center gap-3 p-2.5 rounded ${done ? "bg-green-50 dark:bg-green-950/30" : "bg-secondary/50"}`}>
                  {done
                    ? <CheckCircle size={13} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    : <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                  <span className={`text-xs flex-1 ${done ? "text-green-700 dark:text-green-300 font-medium" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {stepDetail && stepDetail.maxPoints > 0 && (
                    <span className={`text-[10px] font-semibold ${done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {stepDetail.pointsEarned}/{stepDetail.maxPoints} pts
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold ${done ? "text-green-600 dark:text-green-400" : "text-amber-500"}`}>
                    {done ? t("VALIDÉ", "DONE") : t("NON COMPLÉTÉ", "INCOMPLETE")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Erreurs commises */}
        {detail && detail.errors.length > 0 && (
          <div className="bg-card border border-destructive/30 rounded-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-destructive" />
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">
                {t(`Erreurs commises (${detail.errors.length}) — Analyse pédagogique`, `Errors made (${detail.errors.length}) — Pedagogical analysis`)}
              </p>
            </div>
            <div className="space-y-4">
              {detail.errors.map((err, i) => (
                <div key={i} className="border border-destructive/20 rounded-md p-4 bg-destructive/5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-xs font-bold text-destructive">{err.explanation.title}</p>
                    <span className="text-xs font-bold text-destructive flex-shrink-0">{err.pointsDelta} pts</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{err.explanation.detail}</p>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase mb-0.5">
                      {t("À retenir", "Key takeaway")}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">{err.explanation.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conformité */}
        {compliance.issuesFr.length > 0 && (
          <div className="bg-card border border-destructive/30 rounded-md p-5">
            <p className="text-xs font-semibold text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle size={13} /> {t("Anomalies de conformité", "Compliance anomalies")}
            </p>
            <div className="space-y-1.5">
              {compliance.issuesFr.map((issue, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>{issue}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Recommandations */}
        {detail && detail.recommendations.length > 0 && (
          <div className="bg-card border border-border rounded-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("Recommandations personnalisées", "Personalized recommendations")}
              </p>
            </div>
            <div className="space-y-2">
              {detail.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">→</span>
                  <p className="text-xs text-foreground leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compétences */}
        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-primary" />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("Compétences développées", "Skills developed")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              t("PO/GR (Approvisionnement)", "PO/GR (Procurement)"),
              t("SO/GI (Expédition)", "SO/GI (Shipping)"),
              t("WMS — Gestion des bins", "WMS — Bin management"),
              t("ERP — Flux intégré", "ERP — Integrated flow"),
              t("Cycle Count & ADJ", "Cycle Count & ADJ"),
              t("KPI & Conformité", "KPI & Compliance")
            ].map(c => (
              <span key={c} className="text-[10px] bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pb-4">
          <button onClick={() => navigate("/student/scenarios")}
            className="flex items-center gap-2 text-xs text-primary hover:underline">
            <ArrowLeft size={13} /> {t("Retour aux scénarios", "Back to scenarios")}
          </button>
          {scenario && (
            <button
              onClick={() => navigate("/student/scenarios")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors"
            >
              <RotateCcw size={13} /> {t("Recommencer ce scénario", "Restart this scenario")}
            </button>
          )}
        </div>
      </div>
    </FioriShell>
  );
}
