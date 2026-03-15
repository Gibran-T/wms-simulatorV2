import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BookOpen, Users, BarChart2, ClipboardList, Monitor,
  FlaskConical, ShieldCheck, Layers, TrendingUp, FileText,
  MonitorPlay, Presentation, Plus, ArrowRight, Clock,
  TrendingDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

// ── helpers ──────────────────────────────────────────────────────────────────
const SLIDE_COUNT_PER_MODULE = 17;

function fmtTime(dateVal: string | Date | undefined, lang: "FR" | "EN"): string {
  if (!dateVal) return "";
  const d = new Date(dateVal as string);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (lang === "EN") {
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  }
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

function TrendBadge({ current, previous }: { current: number | null; previous?: number | null }) {
  if (current === null || previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta > 0) return <span className="text-[9px] text-[#107e3e] font-semibold flex items-center gap-0.5"><TrendingUp size={9} />+{delta}</span>;
  if (delta < 0) return <span className="text-[9px] text-[#bb0000] font-semibold flex items-center gap-0.5"><TrendingDown size={9} />{delta}</span>;
  return <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Minus size={9} />0</span>;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const { data: cohorts } = trpc.cohorts.list.useQuery();
  const { data: assignments } = trpc.assignments.all.useQuery();
  const { data: monitor } = trpc.monitor.allRuns.useQuery();

  const evalRuns = (monitor ?? []).filter((r: any) => !r.run?.isDemo && r.run?.userId !== user?.id);
  const demoRuns = (monitor ?? []).filter((r: any) => r.run?.isDemo);
  const allEvalForStats = (monitor ?? []).filter((r: any) => !r.run?.isDemo);

  const mScenarios = [1, 2, 3, 4, 5].map((id) =>
    (scenarios ?? []).filter((s) => s.moduleId === id).map((s) => s.id)
  );

  const mRuns = mScenarios.map((ids) =>
    allEvalForStats.filter((r: any) => ids.includes(r.run?.scenarioId))
  );

  const avgScore = (runs: any[]): number | null => {
    const scored = runs.filter((r: any) => r.score !== null && r.score !== undefined);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / scored.length);
  };

  const passedCount = (runs: any[]) =>
    runs.filter((r: any) => r.score !== null && r.score !== undefined && r.score >= 60).length;

  const mAvg = mRuns.map(avgScore);
  const mPassed = mRuns.map(passedCount);

  const assignmentsCount = assignments?.length ?? 0;
  const activeEvalCount = allEvalForStats.filter((r: any) => r.run?.status === "in_progress").length;

  const cards = [
    {
      icon: BookOpen,
      label: t("Scénarios", "Scenarios"),
      value: scenarios?.length ?? 0,
      href: "/teacher/scenarios", color: "text-[#0070f2]", bg: "bg-[#e8f0fe]",
      cta: null,
    },
    {
      icon: Users,
      label: t("Cohortes", "Cohorts"),
      value: cohorts?.length ?? 0,
      href: "/teacher/cohorts", color: "text-[#107e3e]", bg: "bg-[#d4edda]",
      cta: cohorts?.length === 0 ? t("Créer une cohorte →", "Create a cohort →") : null,
    },
    {
      icon: ClipboardList,
      label: t("Devoirs assignés", "Assigned tasks"),
      value: assignmentsCount,
      href: "/teacher/scenarios", color: "text-[#e9730c]", bg: "bg-[#fff3cd]",
      cta: assignmentsCount === 0 ? t("Assigner un scénario →", "Assign a scenario →") : null,
    },
    {
      icon: Monitor,
      label: t("Simulations actives (éval.)", "Active simulations (eval.)"),
      value: activeEvalCount,
      href: "/teacher/monitor", color: "text-[#5b4b8a]", bg: "bg-[#ede7f6]",
      cta: null,
    },
  ];

  const recentRuns = (monitor ?? [])
    .filter((r: any) => r.run?.userId !== user?.id)
    .slice(0, 5);

  const moduleConfig = [
    { id: 1, label: t("Module 1 — Fondements ERP/WMS", "Module 1 — ERP/WMS Foundations"), color: "#0070f2", bg: "bg-[#e8f0fe]", text: "text-[#0070f2]", border: "border-[#0070f2]/20", slidesBg: "bg-[#e8f0fe]", slidesText: "text-[#0070f2]", slidesHover: "hover:bg-[#d0e4fc]", icon: BookOpen, threshold: 60 },
    { id: 2, label: t("Module 2 — Exécution d'entrepôt", "Module 2 — Warehouse Execution"), color: "#2563eb", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", slidesBg: "bg-blue-50", slidesText: "text-blue-600", slidesHover: "hover:bg-blue-100", icon: Layers, threshold: 60 },
    { id: 3, label: t("Module 3 — Contrôle des stocks", "Module 3 — Inventory Control"), color: "#059669", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", slidesBg: "bg-emerald-50", slidesText: "text-emerald-600", slidesHover: "hover:bg-emerald-100", icon: TrendingUp, threshold: 70 },
    { id: 4, label: t("Module 4 — Indicateurs de performance", "Module 4 — Performance Indicators"), color: "#d97706", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", slidesBg: "bg-orange-50", slidesText: "text-orange-600", slidesHover: "hover:bg-orange-100", icon: BarChart2, threshold: 70 },
    { id: 5, label: t("Module 5 — Simulation intégrée", "Module 5 — Integrated Simulation"), color: "#7b1fa2", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", slidesBg: "bg-purple-50", slidesText: "text-purple-600", slidesHover: "hover:bg-purple-100", icon: FileText, threshold: 70 },
  ];

  const moduleQuickAccess = [
    { id: 1, label: t("Module 1 — Fondements ERP/WMS", "Module 1 — ERP/WMS Foundations"), sub: t("Flux logistiques · WMS · ERP · SAP · Intégration", "Logistics flows · WMS · ERP · SAP · Integration"), border: "border-slate-200 dark:border-slate-700", bg: "bg-slate-50 dark:bg-slate-900/30", title: "text-slate-900 dark:text-slate-200", sub_c: "text-slate-600 dark:text-slate-400", btn: "text-slate-600 dark:text-slate-400", icon: BookOpen, iconC: "text-slate-600", route: "/student/scenarios?module=1" },
    { id: 2, label: t("Module 2 — Exécution d'entrepôt", "Module 2 — Warehouse Execution"), sub: t("Rangement · Capacité d'emplacement · FIFO · Précision inventaire", "Put-away · Bin capacity · FIFO · Inventory accuracy"), border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50 dark:bg-blue-950/30", title: "text-blue-900 dark:text-blue-200", sub_c: "text-blue-700 dark:text-blue-400", btn: "text-blue-600", icon: Layers, iconC: "text-blue-600", route: "/student/scenarios?module=2" },
    { id: 3, label: t("Module 3 — Contrôle des stocks et réapprovisionnement", "Module 3 — Inventory Control & Replenishment"), sub: t("Inventaire cyclique · Écarts · Ajustements · Min/Max · Stock de sécurité", "Cycle count · Variances · Adjustments · Min/Max · Safety stock"), border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30", title: "text-emerald-900 dark:text-emerald-200", sub_c: "text-emerald-700 dark:text-emerald-400", btn: "text-emerald-600", icon: TrendingUp, iconC: "text-emerald-600", route: "/student/scenarios?module=3" },
    { id: 4, label: t("Module 4 — Indicateurs de performance logistique", "Module 4 — Logistics Performance Indicators"), sub: t("Rotation · Taux de service · Taux d'erreur · Lead time · Diagnostic KPI", "Turnover · Service rate · Error rate · Lead time · KPI diagnosis"), border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50 dark:bg-orange-950/30", title: "text-orange-900 dark:text-orange-200", sub_c: "text-orange-700 dark:text-orange-400", btn: "text-[#d97706]", icon: BarChart2, iconC: "text-[#d97706]", route: "/student/scenarios?module=4" },
    { id: 5, label: t("Module 5 — Simulation opérationnelle intégrée", "Module 5 — Integrated Operational Simulation"), sub: t("Réception · Rangement FIFO · Inventaire · Réapprovisionnement · KPI · Décision", "Receiving · FIFO put-away · Inventory · Replenishment · KPI · Decision"), border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50 dark:bg-purple-950/30", title: "text-purple-900 dark:text-purple-200", sub_c: "text-purple-700 dark:text-purple-400", btn: "text-[#7b1fa2]", icon: FileText, iconC: "text-[#7b1fa2]", route: "/student/scenarios?module=5" },
  ];

  return (
    <FioriShell title={t("Tableau de Bord — Enseignant", "Teacher Dashboard")} breadcrumbs={[]}>
      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            className="bg-card border border-border rounded-md p-4 text-left hover:border-[#0070f2] hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 ${card.bg} rounded-md flex items-center justify-center mb-3`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            {card.cta && (
              <p className="text-[10px] text-[#0070f2] font-semibold mt-1.5 flex items-center gap-1 group-hover:underline">
                <Plus size={9} />{card.cta}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* ── Module Progress Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {moduleConfig.map((mod, idx) => {
          const runs = mRuns[idx];
          const avg = mAvg[idx];
          const passed = mPassed[idx];
          const Icon = mod.icon;
          return (
            <Card key={mod.id} className="border-border">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Icon size={12} className={mod.text} />
                  <span className="truncate">{mod.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Link
                  href={`/student/slides/${mod.id}`}
                  className={`mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md ${mod.slidesBg} ${mod.slidesText} text-[10px] font-semibold ${mod.slidesHover} transition-colors`}
                >
                  <Presentation size={11} />
                  Slides M{mod.id}
                  <span className="opacity-60 font-normal">({SLIDE_COUNT_PER_MODULE})</span>
                </Link>

                {runs.length === 0 ? (
                  <div className="py-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-2">{t("Aucune simulation enregistrée", "No simulation recorded")}</p>
                    <button
                      onClick={() => navigate("/teacher/scenarios")}
                      className={`text-[9px] font-semibold ${mod.slidesText} flex items-center gap-1 mx-auto hover:underline`}
                    >
                      <ArrowRight size={9} /> {t("Assigner un scénario", "Assign a scenario")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className={`text-lg font-bold ${mod.text}`}>{runs.length}</p>
                        <p className="text-[9px] text-muted-foreground">{t("Simul.", "Simul.")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#107e3e]">
                          {avg !== null ? avg : "0"}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{t("Moy.", "Avg.")}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#e9730c]">
                          {passed}/{runs.length}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{t("Réussis", "Passed")}</p>
                      </div>
                    </div>
                    {avg !== null && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                          <span>{t("Score moyen", "Avg. score")}</span>
                          <span className={avg >= mod.threshold ? "text-[#107e3e] font-semibold" : "text-[#bb0000] font-semibold"}>
                            {avg}/100
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${avg >= mod.threshold ? "bg-[#107e3e]" : "bg-[#e9730c]"}`}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Recent Student Activity ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-md mb-4">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <BarChart2 size={13} />
            {t("Activité récente des étudiants", "Recent student activity")}
            <span className="text-[10px] font-normal text-muted-foreground ml-1">
              ({evalRuns.length} {t("éval.", "eval.")} · {demoRuns.length} {t("démo", "demo")})
            </span>
          </p>
          <Link href="/teacher/monitor" className="text-xs text-[#0070f2] hover:underline flex items-center gap-1">
            {t("Voir tout →", "View all →")} <span className="text-[9px] text-muted-foreground">({t("Monitoring", "Monitoring")})</span>
          </Link>
        </div>

        <div className="divide-y divide-border">
          {recentRuns.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-muted-foreground text-xs mb-2">{t("Aucune activité étudiante enregistrée", "No student activity recorded")}</p>
              <button
                onClick={() => navigate("/teacher/scenarios")}
                className="text-[11px] text-[#0070f2] hover:underline flex items-center gap-1 mx-auto"
              >
                <ArrowRight size={11} /> {t("Assigner un scénario aux étudiants", "Assign a scenario to students")}
              </button>
            </div>
          )}
          {recentRuns.map((run: any) => {
            const isDemo = run.run?.isDemo;
            const scenarioId = run.run?.scenarioId;
            const moduleId = mScenarios.findIndex((ids) => ids.includes(scenarioId)) + 1 || null;
            const modColors: Record<number, string> = {
              1: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              2: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
              3: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
              4: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
              5: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
            };
            return (
              <div
                key={run.run?.id ?? run.runId}
                className={`px-5 py-3 flex items-center justify-between gap-3 ${isDemo ? "bg-muted/30" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {run.user?.name ?? `${t("Étudiant", "Student")} #${run.run?.userId}`}
                    </p>
                    {isDemo ? (
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#5b4b8a] bg-[#ede7f6] dark:bg-purple-900/50 dark:text-purple-300 px-1.5 py-0.5 rounded-full shrink-0">
                        <FlaskConical size={8} /> {t("Démo", "Demo")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#0070f2] bg-[#e8f4fd] dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">
                        <ShieldCheck size={8} /> {t("Éval.", "Eval.")}
                      </span>
                    )}
                    {moduleId && moduleId > 0 && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${modColors[moduleId] ?? modColors[1]}`}>
                        M{moduleId}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {run.scenario?.name} · {run.completedSteps?.length ?? 0} {t("étapes", "steps")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {run.run?.createdAt && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 hidden sm:flex">
                      <Clock size={8} />
                      {fmtTime(run.run.createdAt, language)}
                    </span>
                  )}
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isDemo ? "bg-[#5b4b8a]" : "bg-[#0070f2]"}`}
                      style={{ width: `${run.progressPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold w-8 text-right ${isDemo ? "text-[#5b4b8a]" : "text-[#0070f2]"}`}>
                    {run.progressPct}%
                  </span>
                  {!isDemo && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${run.compliant ? "bg-[#d4edda] text-[#107e3e]" : "bg-[#fde8e8] text-[#bb0000]"}`}>
                      {run.compliant ? t("Conforme", "Compliant") : t("Non conforme", "Non-compliant")}
                    </span>
                  )}
                  {isDemo && (
                    <span
                      className="text-[10px] text-[#5b4b8a] italic cursor-help"
                      title={t("Les simulations en mode Démonstration ne génèrent pas de score officiel", "Demo mode simulations do not generate an official score")}
                    >
                      {t("Non officiel", "Unofficial")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Demo Mode Banner ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-md border-2 border-[#5b4b8a] dark:border-purple-500 bg-gradient-to-r from-[#ede7f6] to-[#f3e5f5] dark:from-purple-950/40 dark:to-purple-900/30 flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#5b4b8a] rounded-md flex items-center justify-center shrink-0">
            <MonitorPlay size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#3d1f6e] dark:text-purple-200">
              {t("Mode Démonstration — Simulateur ERP/WMS", "Demonstration Mode — ERP/WMS Simulator")}
            </p>
            <p className="text-xs text-[#5b4b8a] dark:text-purple-300 mt-0.5">
              {t(
                "Lancez le simulateur directement pour vos démonstrations en classe. Score pédagogique affiché en temps réel (non officiel).",
                "Launch the simulator directly for your classroom demonstrations. Pedagogical score displayed in real time (unofficial)."
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/student/scenarios")}
          className="ml-4 px-4 py-2 bg-[#5b4b8a] text-white text-xs font-semibold rounded-md hover:bg-[#4a3a7a] transition-colors shrink-0"
        >
          {t("Démarrer →", "Start →")}
        </button>
      </div>

      {/* ── Module Quick Access ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {moduleQuickAccess.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={`p-4 rounded-md border ${mod.border} ${mod.bg} flex items-center justify-between`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={16} className={mod.iconC} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${mod.title} truncate`}>{mod.label}</p>
                  <p className={`text-[10px] ${mod.sub_c} truncate`}>{mod.sub}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(mod.route)}
                className={`text-xs ${mod.btn} hover:underline font-medium ml-3 shrink-0`}
              >
                {t("Accéder →", "Access →")}
              </button>
            </div>
          );
        })}
      </div>
    </FioriShell>
  );
}
