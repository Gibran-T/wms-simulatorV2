import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { BookOpen, Users, BarChart2, ClipboardList, Monitor, FlaskConical, ShieldCheck, Layers, TrendingUp, CheckCircle2, FileText, MonitorPlay, Presentation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherDashboard() {
  const [, navigate] = useLocation();
  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const { data: cohorts } = trpc.cohorts.list.useQuery();
  const { data: assignments } = trpc.assignments.all.useQuery();
  const { data: monitor } = trpc.monitor.allRuns.useQuery();
  const { data: moduleProgress } = trpc.warehouse.allModuleProgress.useQuery();

  // Separate eval runs from demo runs
  const evalRuns = (monitor ?? []).filter((r: any) => !r.run?.isDemo);
  const demoRuns = (monitor ?? []).filter((r: any) => r.run?.isDemo);

  // Module 1 stats (from eval runs with module 1 scenarios)
  const m1Scenarios = (scenarios ?? []).filter((s) => s.moduleId === 1).map((s) => s.id);
  const m2Scenarios = (scenarios ?? []).filter((s) => s.moduleId === 2).map((s) => s.id);
  const m3Scenarios = (scenarios ?? []).filter((s) => s.moduleId === 3).map((s) => s.id);
  const m4Scenarios = (scenarios ?? []).filter((s) => s.moduleId === 4).map((s) => s.id);
  const m5Scenarios = (scenarios ?? []).filter((s) => s.moduleId === 5).map((s) => s.id);

  const m1Runs = evalRuns.filter((r: any) => m1Scenarios.includes(r.run?.scenarioId));
  const m2Runs = evalRuns.filter((r: any) => m2Scenarios.includes(r.run?.scenarioId));
  const m3Runs = evalRuns.filter((r: any) => m3Scenarios.includes(r.run?.scenarioId));
  const m4Runs = evalRuns.filter((r: any) => m4Scenarios.includes(r.run?.scenarioId));
  const m5Runs = evalRuns.filter((r: any) => m5Scenarios.includes(r.run?.scenarioId));

  const avgScore = (runs: any[]) => {
    const completed = runs.filter((r: any) => r.run?.status === "completed");
    if (completed.length === 0) return null;
    const avg = completed.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) / completed.length;
    return Math.round(avg);
  };

  const m1Avg = avgScore(m1Runs);
  const m2Avg = avgScore(m2Runs);
  const m3Avg = avgScore(m3Runs);
  const m4Avg = avgScore(m4Runs);
  const m5Avg = avgScore(m5Runs);

  // Module progress from module_progress table
  const m1Passed = (moduleProgress ?? []).filter((p: any) => p.moduleId === 1 && p.passed).length;
  const m2Passed = (moduleProgress ?? []).filter((p: any) => p.moduleId === 2 && p.passed).length;
  const m3Passed = (moduleProgress ?? []).filter((p: any) => p.moduleId === 3 && p.passed).length;
  const m4Passed = (moduleProgress ?? []).filter((p: any) => p.moduleId === 4 && p.passed).length;
  const m5Passed = (moduleProgress ?? []).filter((p: any) => p.moduleId === 5 && p.passed).length;
  const m1Total = (moduleProgress ?? []).filter((p: any) => p.moduleId === 1).length;
  const m2Total = (moduleProgress ?? []).filter((p: any) => p.moduleId === 2).length;
  const m3Total = (moduleProgress ?? []).filter((p: any) => p.moduleId === 3).length;
  const m4Total = (moduleProgress ?? []).filter((p: any) => p.moduleId === 4).length;
  const m5Total = (moduleProgress ?? []).filter((p: any) => p.moduleId === 5).length;

  const cards = [
    { icon: BookOpen, label: "Scénarios", value: scenarios?.length ?? 0, href: "/teacher/scenarios", color: "text-[#0070f2]", bg: "bg-[#e8f0fe]" },
    { icon: Users, label: "Cohortes", value: cohorts?.length ?? 0, href: "/teacher/cohorts", color: "text-[#107e3e]", bg: "bg-[#d4edda]" },
    { icon: ClipboardList, label: "Devoirs assignés", value: assignments?.length ?? 0, href: "/teacher/assignments", color: "text-[#e9730c]", bg: "bg-[#fff3cd]" },
    { icon: Monitor, label: "Simulations actives (éval.)", value: evalRuns.filter((r: any) => r.run?.status === "in_progress").length, href: "/teacher/monitor", color: "text-[#5b4b8a]", bg: "bg-[#ede7f6]" },
  ];

  const recentRuns = (monitor ?? []).slice(0, 5);

  return (
    <FioriShell title="Tableau de Bord — Enseignant" breadcrumbs={[{ label: "Tableau de bord" }]}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <button key={card.label} onClick={() => navigate(card.href)}
            className="bg-card border border-border rounded-md p-4 text-left hover:border-[#0070f2] hover:shadow-sm transition-all group">
            <div className={`w-9 h-9 ${card.bg} rounded-md flex items-center justify-center mb-3`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Module Progress Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Module 1 */}
        <Card className="border-border">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <BookOpen size={13} className="text-[#0070f2]" />
              Module 1 — Fondements ERP/WMS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Link href="/student/slides/1" className="mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-[#e8f0fe] text-[#0070f2] text-[10px] font-semibold hover:bg-[#d0e4fc] transition-colors">
              <Presentation size={11} /> Slides M1
            </Link>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-[#0070f2]">{m1Runs.length}</p>
                <p className="text-[10px] text-muted-foreground">Simulations</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#107e3e]">
                  {m1Avg !== null ? `${m1Avg}` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Score moyen</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#e9730c]">
                  {m1Total > 0 ? `${m1Passed}/${m1Total}` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Réussis</p>
              </div>
            </div>
            {m1Avg !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Score moyen</span>
                  <span className={m1Avg >= 60 ? "text-[#107e3e] font-semibold" : "text-[#bb0000] font-semibold"}>{m1Avg}/100</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m1Avg >= 60 ? "bg-[#107e3e]" : "bg-[#e9730c]"}`} style={{ width: `${m1Avg}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Module 2 */}
        <Card className="border-border">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Layers size={13} className="text-blue-600" />
              Module 2 — Exécution d'entrepôt
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Link href="/student/slides/2" className="mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold hover:bg-blue-100 transition-colors">
              <Presentation size={11} /> Slides M2
            </Link>
            {m2Runs.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-muted-foreground">
                Aucune simulation Module 2 enregistrée
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{m2Runs.length}</p>
                    <p className="text-[10px] text-muted-foreground">Simulations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#107e3e]">
                      {m2Avg !== null ? `${m2Avg}` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Score moyen</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#e9730c]">
                      {m2Total > 0 ? `${m2Passed}/${m2Total}` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Réussis</p>
                  </div>
                </div>
                {m2Avg !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Score moyen</span>
                      <span className={m2Avg >= 60 ? "text-[#107e3e] font-semibold" : "text-[#bb0000] font-semibold"}>{m2Avg}/100</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m2Avg >= 60 ? "bg-[#107e3e]" : "bg-[#e9730c]"}`} style={{ width: `${m2Avg}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Module 3 */}
        <Card className="border-border">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={13} className="text-emerald-600" />
              Module 3 — Contrôle des stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Link href="/student/slides/3" className="mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-semibold hover:bg-emerald-100 transition-colors">
              <Presentation size={11} /> Slides M3
            </Link>
            {m3Runs.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-muted-foreground">
                Aucune simulation Module 3 enregistrée
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">{m3Runs.length}</p>
                    <p className="text-[10px] text-muted-foreground">Simulations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#107e3e]">
                      {m3Avg !== null ? `${m3Avg}` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Score moyen</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#e9730c]">
                      {m3Total > 0 ? `${m3Passed}/${m3Total}` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Réussis</p>
                  </div>
                </div>
                {m3Avg !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Score moyen</span>
                      <span className={m3Avg >= 70 ? "text-[#107e3e] font-semibold" : "text-[#bb0000] font-semibold"}>{m3Avg}/100</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m3Avg >= 70 ? "bg-[#107e3e]" : "bg-[#e9730c]"}`} style={{ width: `${m3Avg}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {/* Module 4 */}
        <Card className="border-border">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <BarChart2 size={13} className="text-[#0070f2]" />
              Module 4 — Indicateurs de performance logistique
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Link href="/student/slides/4" className="mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-orange-50 text-orange-600 text-[10px] font-semibold hover:bg-orange-100 transition-colors">
              <Presentation size={11} /> Slides M4
            </Link>
            {m4Runs.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-muted-foreground">Aucune simulation M4</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#0070f2]">{m4Runs.length}</p>
                    <p className="text-[10px] text-muted-foreground">Simul.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#107e3e]">{m4Avg !== null ? m4Avg : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Moy.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#e9730c]">{m4Total > 0 ? `${m4Passed}/${m4Total}` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Réussis</p>
                  </div>
                </div>
                {m4Avg !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m4Avg >= 70 ? "bg-[#107e3e]" : "bg-[#e9730c]"}`} style={{ width: `${m4Avg}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Module 5 */}
        <Card className="border-border">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
              <FileText size={13} className="text-[#7b1fa2]" />
              Module 5 — Simulation opérationnelle intégrée
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Link href="/student/slides/5" className="mb-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-purple-50 text-purple-600 text-[10px] font-semibold hover:bg-purple-100 transition-colors">
              <Presentation size={11} /> Slides M5
            </Link>
            {m5Runs.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-muted-foreground">Aucune simulation M5</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#7b1fa2]">{m5Runs.length}</p>
                  <p className="text-[10px] text-muted-foreground">Simul.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#107e3e]">{m5Avg !== null ? m5Avg : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Moy.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#e9730c]">{m5Total > 0 ? `${m5Passed}/${m5Total}` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Réussis</p>
                  </div>
                </div>
                {m5Avg !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m5Avg >= 70 ? "bg-[#107e3e]" : "bg-[#e9730c]"}`} style={{ width: `${m5Avg}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-md">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <BarChart2 size={13} /> Activité récente des étudiants
            <span className="text-[10px] font-normal text-gray-400 ml-1">
              ({evalRuns.length} éval. · {demoRuns.length} démo)
            </span>
          </p>
          <button onClick={() => navigate("/teacher/monitor")} className="text-xs text-[#0070f2] hover:underline">Voir tout →</button>
        </div>
        <div className="divide-y divide-border">
          {recentRuns.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-xs">Aucune simulation en cours</div>
          )}
          {recentRuns.map((run: any) => {
            const isDemo = run.run?.isDemo;
            const moduleId = m1Scenarios.includes(run.run?.scenarioId) ? 1 : m2Scenarios.includes(run.run?.scenarioId) ? 2 : m3Scenarios.includes(run.run?.scenarioId) ? 3 : null;
            return (
              <div key={run.run?.id ?? run.runId} className={`px-5 py-3 flex items-center justify-between ${isDemo ? "bg-muted/30" : ""}`}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground">{run.user?.name ?? `Étudiant #${run.run?.userId}`}</p>
                    {isDemo ? (
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#5b4b8a] bg-[#ede7f6] px-1.5 py-0.5 rounded-full">
                        <FlaskConical size={8} /> Démo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#0070f2] bg-[#e8f4fd] px-1.5 py-0.5 rounded-full">
                        <ShieldCheck size={8} /> Éval.
                      </span>
                    )}
                    {moduleId && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${moduleId === 2 ? "bg-blue-100 text-blue-700" : moduleId === 3 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        M{moduleId}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{run.scenario?.name} · {run.completedSteps?.length ?? 0} étapes</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isDemo ? "bg-[#5b4b8a]" : "bg-[#0070f2]"}`} style={{ width: `${run.progressPct}%` }} />
                  </div>
                  <span className={`text-[10px] font-semibold ${isDemo ? "text-[#5b4b8a]" : "text-[#0070f2]"}`}>{run.progressPct}%</span>
                  {!isDemo && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${run.compliant ? "bg-[#d4edda] text-[#107e3e]" : "bg-[#fde8e8] text-[#bb0000]"}`}>
                      {run.compliant ? "Conforme" : "Non conforme"}
                    </span>
                  )}
                  {isDemo && (
                    <span className="text-[10px] text-[#5b4b8a] italic">Score N/A</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulateur Demo Mode — Accès direct */}
      <div className="mt-4 p-4 rounded-md border-2 border-[#5b4b8a] dark:border-purple-500 bg-gradient-to-r from-[#ede7f6] to-[#f3e5f5] dark:from-purple-950/40 dark:to-purple-900/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#5b4b8a] rounded-md flex items-center justify-center shrink-0">
            <MonitorPlay size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#3d1f6e] dark:text-purple-200">Mode Démonstration — Simulateur ERP/WMS</p>
            <p className="text-xs text-[#5b4b8a] dark:text-purple-300 mt-0.5">Lancez le simulateur directement pour vos démonstrations en classe. Le score pédagogique est affiché en temps réel (non officiel).</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/student/scenarios")}
          className="ml-4 px-4 py-2 bg-[#5b4b8a] text-white text-xs font-semibold rounded-md hover:bg-[#4a3a7a] transition-colors shrink-0"
        >
          Démarrer →
        </button>
      </div>

      {/* Module quick access */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers size={16} className="text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Module 2 — Exécution d'entrepôt et gestion des emplacements</p>
              <p className="text-[10px] text-blue-700 dark:text-blue-400">Rangement · Capacité d'emplacement · FIFO · Précision inventaire</p>
            </div>
          </div>
          <button onClick={() => navigate("/student/module2")} className="text-xs text-blue-600 hover:underline font-medium">Accéder →</button>
        </div>
        <div className="p-4 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Module 3 — Contrôle des stocks et réapprovisionnement</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Inventaire cyclique · Écarts · Ajustements · Min/Max · Stock de sécurité</p>
            </div>
          </div>
          <button onClick={() => navigate("/student/module3")} className="text-xs text-emerald-600 hover:underline font-medium">Accéder →</button>
        </div>
        <div className="p-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 size={16} className="text-[#0070f2]" />
            <div>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Module 4 — Indicateurs de performance logistique</p>
              <p className="text-[10px] text-blue-700 dark:text-blue-400">Rotation · Taux de service · Taux d'erreur · Lead time · Diagnostic KPI</p>
            </div>
          </div>
          <button onClick={() => navigate("/student/module4")} className="text-xs text-[#0070f2] hover:underline font-medium">Accéder →</button>
        </div>
        <div className="p-4 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-[#7b1fa2]" />
            <div>
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">Module 5 — Simulation opérationnelle intégrée</p>
              <p className="text-[10px] text-purple-700 dark:text-purple-400">Réception · Rangement FIFO · Inventaire · Réapprovisionnement · KPI · Décision</p>
            </div>
          </div>
          <button onClick={() => navigate("/student/module5")} className="text-xs text-[#7b1fa2] hover:underline font-medium">Accéder →</button>
        </div>
      </div>
    </FioriShell>
  );
}
