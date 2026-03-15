import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { Download, Monitor, RefreshCw, FlaskConical, ShieldCheck, BarChart2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type FilterMode = "evaluation" | "demonstration" | "all";

export default function MonitorDashboard() {
  const { t } = useLanguage();
  const { data: runs, isLoading, refetch } = trpc.monitor.allRuns.useQuery();
  const [filterMode, setFilterMode] = useState<FilterMode>("evaluation");
  const [resettingRunId, setResettingRunId] = useState<number | null>(null);
  const [confirmResetId, setConfirmResetId] = useState<number | null>(null);

  const resetRunMutation = trpc.runs.resetRun.useMutation({
    onSuccess: (_, variables) => {
      toast.success(t(
        `Session #${variables.runId} réinitialisée avec succès. L'étudiant peut recommencer.`,
        `Session #${variables.runId} reset successfully. The student can restart.`
      ));
      setResettingRunId(null);
      setConfirmResetId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(t(`Erreur lors de la réinitialisation : ${err.message}`, `Reset error: ${err.message}`));
      setResettingRunId(null);
      setConfirmResetId(null);
    },
  });

  function handleReset(runId: number) {
    if (confirmResetId === runId) {
      setResettingRunId(runId);
      resetRunMutation.mutate({ runId });
    } else {
      setConfirmResetId(runId);
      setTimeout(() => setConfirmResetId(prev => prev === runId ? null : prev), 5000);
    }
  }

  const evalRuns = runs?.filter((r: any) => !r.run?.isDemo) ?? [];
  const demoRuns = runs?.filter((r: any) => r.run?.isDemo) ?? [];
  const displayedRuns =
    filterMode === "evaluation" ? evalRuns :
    filterMode === "demonstration" ? demoRuns :
    runs ?? [];

  const avgScore = evalRuns.length > 0
    ? Math.round(evalRuns.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) / evalRuns.length)
    : 0;
  const completedEval = evalRuns.filter((r: any) => (r.run?.status ?? r.status) === "completed").length;
  const demoCount = demoRuns.length;

  function exportCSV() {
    if (!displayedRuns || displayedRuns.length === 0) return;
    const headers = [
      t("Run ID", "Run ID"),
      t("Mode", "Mode"),
      t("Étudiant", "Student"),
      t("Scénario", "Scenario"),
      t("Statut", "Status"),
      t("Progression %", "Progress %"),
      t("Score", "Score"),
      t("Conforme", "Compliant"),
      t("Étapes complétées", "Completed steps")
    ];
    const rows = displayedRuns.map((r: any) => [
      r.run?.id ?? r.runId,
      r.run?.isDemo ? t("Démonstration", "Demonstration") : t("Évaluation", "Evaluation"),
      r.user?.name ?? `User#${r.run?.userId}`,
      r.scenario?.name ?? `Scénario#${r.run?.scenarioId}`,
      r.run?.status ?? r.status,
      r.progressPct,
      r.run?.isDemo ? "N/A" : (r.score ?? 0),
      r.compliant ? t("Oui", "Yes") : t("Non", "No"),
      r.completedSteps?.join("|") ?? ""
    ]);
    const csv = [headers, ...rows].map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wms_monitor_${filterMode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FioriShell
      title={t("Tableau de Surveillance", "Monitoring Dashboard")}
      breadcrumbs={[
        { label: t("Tableau de bord", "Dashboard"), href: "/teacher" },
        { label: t("Surveillance", "Monitoring") }
      ]}
    >
      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={13} className="text-primary" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Score moyen (éval.)", "Avg. score (eval.)")}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">{avgScore}<span className="text-sm text-muted-foreground">/100</span></p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t(`Basé sur ${evalRuns.length} session(s) d'évaluation`, `Based on ${evalRuns.length} evaluation session(s)`)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={13} className="text-green-600 dark:text-green-400" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Complétées (éval.)", "Completed (eval.)")}
            </p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedEval}<span className="text-sm text-muted-foreground"> / {evalRuns.length}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("Sessions d'évaluation terminées", "Completed evaluation sessions")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={13} className="text-purple-500" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Sessions démo", "Demo sessions")}
            </p>
          </div>
          <p className="text-2xl font-bold text-purple-500">{demoCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("Non comptabilisées dans les stats", "Not counted in statistics")}
          </p>
        </div>
      </div>

      {/* Filter + Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground font-medium mr-1">{t("Afficher :", "Show:")}</p>
          {([
            { key: "evaluation", label: t("Évaluation", "Evaluation"), icon: <ShieldCheck size={11} />, count: evalRuns.length },
            { key: "demonstration", label: t("Démonstration", "Demonstration"), icon: <FlaskConical size={11} />, count: demoRuns.length },
            { key: "all", label: t("Tout", "All"), icon: null, count: (runs?.length ?? 0) },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key as FilterMode)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${
                filterMode === f.key
                  ? "bg-primary/10 text-primary border-primary"
                  : "text-muted-foreground border-border bg-card hover:border-muted-foreground"
              }`}
            >
              {f.icon}{f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs border border-border bg-card text-foreground px-3 py-2 rounded-md hover:border-primary transition-colors"
          >
            <RefreshCw size={12} /> {t("Actualiser", "Refresh")}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Download size={12} /> {t("Exporter CSV", "Export CSV")}
          </button>
        </div>
      </div>

      {/* Filter notices */}
      {filterMode === "evaluation" && (
        <div className="bg-primary/5 border border-primary/20 rounded-md px-4 py-2.5 mb-4 flex items-center gap-2">
          <ShieldCheck size={13} className="text-primary flex-shrink-0" />
          <p className="text-xs text-primary">
            <strong>{t("Vue Évaluation :", "Evaluation View:")}</strong>{" "}
            {t(
              "Les sessions de démonstration sont exclues. Score moyen, taux de complétion et classement basés uniquement sur les sessions d'évaluation officielles.",
              "Demo sessions are excluded. Average score, completion rate and ranking based only on official evaluation sessions."
            )}
          </p>
        </div>
      )}
      {filterMode === "demonstration" && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-md px-4 py-2.5 mb-4 flex items-center gap-2">
          <FlaskConical size={13} className="text-purple-500 flex-shrink-0" />
          <p className="text-xs text-purple-600 dark:text-purple-400">
            <strong>{t("Vue Démonstration :", "Demonstration View:")}</strong>{" "}
            {t(
              "Ces sessions n'affectent pas les scores, la conformité ni le classement des étudiants. Elles sont à titre informatif uniquement.",
              "These sessions do not affect student scores, compliance or rankings. They are for informational purposes only."
            )}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary border-b border-border">
              {[
                t("Mode", "Mode"),
                t("Étudiant", "Student"),
                t("Scénario", "Scenario"),
                t("Statut", "Status"),
                t("Progression", "Progress"),
                t("Score", "Score"),
                t("Conformité", "Compliance"),
                t("Étapes", "Steps"),
                t("Actions", "Actions")
              ].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-muted-foreground">
                  {t("Chargement...", "Loading...")}
                </td>
              </tr>
            )}
            {!isLoading && displayedRuns.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-muted-foreground">
                  <Monitor size={24} className="mx-auto mb-2 opacity-40" />
                  {t("Aucune simulation enregistrée dans ce mode", "No simulations recorded in this mode")}
                </td>
              </tr>
            )}
            {displayedRuns.map((r: any) => {
              const isDemo = r.run?.isDemo;
              const status = r.run?.status;
              return (
                <tr key={r.run?.id ?? r.runId} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    {isDemo ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full w-fit">
                        <FlaskConical size={9} /> {t("Démo", "Demo")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                        <ShieldCheck size={9} /> {t("Éval.", "Eval.")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-xs">{r.user?.name ?? `User #${r.run?.userId}`}</p>
                    {r.user?.studentNumber && (
                      <p className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 w-fit">{r.user.studentNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.scenario?.name ?? `Scénario #${r.run?.scenarioId}`}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      status === "completed"
                        ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400"
                        : status === "in_progress"
                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {status === "completed" ? t("Terminé", "Completed")
                        : status === "in_progress" ? t("En cours", "In progress")
                        : status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isDemo ? "bg-purple-500" : "bg-primary"}`}
                          style={{ width: `${r.progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{r.progressPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {isDemo ? (
                      <span className="text-[10px] text-purple-500 italic">N/A ({t("démo", "demo")})</span>
                    ) : (
                      `${r.score ?? 0}/100`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold ${
                      r.compliant ? "text-green-600 dark:text-green-400"
                        : isDemo ? "text-amber-500"
                        : "text-destructive"
                    }`}>
                      {r.compliant ? `✅ ${t("Conforme", "Compliant")}` : isDemo ? `⚠ ${t("Non conforme", "Non-compliant")}` : `🔴 ${t("Non conforme", "Non-compliant")}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground">{r.completedSteps?.join(" → ") ?? "—"}</td>
                  <td className="px-4 py-3">
                    {confirmResetId === (r.run?.id ?? r.runId) ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReset(r.run?.id ?? r.runId)}
                          disabled={resettingRunId === (r.run?.id ?? r.runId)}
                          className="text-[10px] font-semibold px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                        >
                          {resettingRunId === (r.run?.id ?? r.runId) ? "..." : t("Confirmer", "Confirm")}
                        </button>
                        <button
                          onClick={() => setConfirmResetId(null)}
                          className="text-[10px] font-semibold px-2 py-1 rounded border border-border text-muted-foreground hover:border-muted-foreground transition-colors"
                        >
                          {t("Annuler", "Cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReset(r.run?.id ?? r.runId)}
                        title={t("Réinitialiser la session de cet étudiant", "Reset this student's session")}
                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-border text-amber-600 dark:text-amber-400 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <RotateCcw size={10} /> {t("Réinitialiser", "Reset")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FioriShell>
  );
}
