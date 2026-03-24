/**
 * TEC.LOG — Analytics Dashboard (Power BI Style)
 * Fully bilingual FR/EN — connected to global language toggle
 * All text uses t(fr, en) from useLanguage()
 */
import FioriShell from "@/components/FioriShell";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  Users, TrendingUp, CheckCircle2, ShieldCheck, Award, Activity,
  BarChart2, RefreshCw, BookOpen, AlertTriangle, Clock, Target,
  Loader2, TrendingUp as TrendingUpIcon, ChevronDown, ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  primary:  "#0078d4",
  success:  "#107c10",
  warning:  "#ff8c00",
  danger:   "#d13438",
  purple:   "#8764b8",
  teal:     "#008272",
  navy:     "#1b3a6b",
  amber:    "#f59e0b",
  emerald:  "#10b981",
  rose:     "#f43f5e",
};

const PIE_COLORS = [C.primary, C.success, C.warning, C.danger, C.purple];

const STEP_COLORS: Record<string, string> = {
  PO:          "#0078d4",
  GR:          "#107c10",
  PUTAWAY_M1:  "#ff8c00",
  STOCK:       "#8764b8",
  SO:          "#008272",
  PICKING_M1:  "#f59e0b",
  GI:          "#d13438",
  CC:          "#10b981",
  COMPLIANCE:  "#1b3a6b",
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-medium mb-1 ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground"}`}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h2>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─── Heatmap Cell ──────────────────────────────────────────────────────────────
function HeatCell({ value, step }: { value: number; step: string }) {
  const bg    = value === 1 ? (STEP_COLORS[step] ?? C.success) : "#e5e7eb";
  const color = value === 1 ? "#fff" : "#9ca3af";
  return (
    <div
      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all hover:scale-110 cursor-default"
      style={{ backgroundColor: bg, color }}
      title={value === 1 ? "Complété / Completed" : "Non complété / Not completed"}
    >
      {value === 1 ? "✓" : "·"}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      <div className="text-center">
        <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>{label}</p>
      </div>
    </div>
  );
}

// ─── Multi-line color palette for per-student lines ─────────────────────────
const LINE_COLORS = [
  "#0078d4", "#107c10", "#d13438", "#8764b8", "#ff8c00",
  "#008272", "#f59e0b", "#10b981", "#f43f5e", "#6366f1",
];

// ─── Custom Evolution Tooltip ─────────────────────────────────────────────────
function EvoTooltip({ active, payload, label }: any) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">
        {t("Tentative", "Attempt")} #{label}
      </p>
      {payload.map((p: any, i: number) => {
        const d = p.payload;
        return (
          <div key={i} className="mb-1.5 border-b border-border last:border-0 pb-1.5 last:pb-0">
            <p style={{ color: p.color }} className="font-semibold">{p.name}</p>
            <p className="text-foreground">{t("Score", "Score")}: <strong>{p.value}/100</strong></p>
            {d.penalties !== undefined && (
              <p className="text-rose-500">{t("Erreurs", "Errors")}: {d.penalties}</p>
            )}
            {d.startedAt && (
              <p className="text-muted-foreground">{new Date(d.startedAt).toLocaleDateString()}</p>
            )}
            {d.status && (
              <p className={d.status === "completed" ? "text-emerald-500" : "text-amber-500"}>
                {d.status === "completed" ? t("Complété", "Completed") : t("En cours", "In Progress")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Evolution Section (self-contained with its own data fetching) ───────
function ScoreEvolutionSection() {
  const { t } = useLanguage();
  const [selectedUserId,    setSelectedUserId]    = useState<string>("all");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("all");

  const userId     = selectedUserId     === "all" ? undefined : parseInt(selectedUserId);
  const scenarioId = selectedScenarioId === "all" ? undefined : parseInt(selectedScenarioId);

  const { data, isLoading } = trpc.monitor.studentScoreEvolution.useQuery(
    { userId, scenarioId },
    { placeholderData: (prev: any) => prev }
  );

  const students     = data?.students     ?? [];
  const scenarioList = data?.scenarioList ?? [];
  const lines        = data?.lines        ?? [];

  // Build a flat data array indexed by attempt number for the chart
  // Each row = one attempt number; columns = one per student
  const maxAttempts = lines.reduce((m, l) => Math.max(m, l.attempts.length), 0);
  const chartData = useMemo(() => {
    if (maxAttempts === 0) return [];
    return Array.from({ length: maxAttempts }, (_, i) => {
      const row: Record<string, any> = { attempt: i + 1 };
      for (const line of lines) {
        const a = line.attempts[i];
        if (a) {
          row[line.userName] = a.score;
          row[`__meta_${line.userName}`] = a; // for tooltip
        }
      }
      return row;
    });
  }, [lines, maxAttempts]);

  // Pass line reference (60 pts)
  const PASS_LINE = 60;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${C.primary}20` }}>
            <TrendingUpIcon className="w-4 h-4" style={{ color: C.primary }} />
          </div>
          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("Évolution du score — Tentatives multiples", "Score Evolution — Multiple Attempts")}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Student selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {t("Étudiant :", "Student:")}
            </span>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder={t("Tous les étudiants", "All students")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tous les étudiants", "All students")}</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scenario selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {t("Scénario :", "Scenario:")}
            </span>
            <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue placeholder={t("Tous les scénarios", "All scenarios")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tous les scénarios", "All scenarios")}</SelectItem>
                {scenarioList.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <div className="text-center">
            <TrendingUpIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{t("Aucune tentative enregistrée", "No attempts recorded")}</p>
            <p className="text-xs mt-1">{t("Sélectionnez un étudiant ou un scénario pour voir l'évolution", "Select a student or scenario to view progression")}</p>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="attempt"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                label={{
                  value: t("Tentative #", "Attempt #"),
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                label={{
                  value: t("Score", "Score"),
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }}
              />
              <Tooltip content={<EvoTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {/* Pass line reference */}
              <Line
                type="monotone"
                dataKey={() => PASS_LINE}
                name={t("Seuil de réussite (60)", "Pass threshold (60)")}
                stroke={C.success}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                dot={false}
                legendType="plainline"
              />
              {/* One line per student */}
              {lines.map((line, idx) => (
                <Line
                  key={line.userId}
                  type="monotone"
                  dataKey={line.userName}
                  name={line.userName}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Summary stats below chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            {lines.map((line, idx) => {
              const scores = line.attempts.map(a => a.score);
              const best   = Math.max(...scores);
              const last   = scores[scores.length - 1] ?? 0;
              const trend  = scores.length >= 2 ? last - scores[scores.length - 2] : 0;
              return (
                <div key={line.userId} className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                    <span className="text-xs font-semibold text-foreground truncate">{line.userName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("Tentatives", "Attempts")}: <strong className="text-foreground">{line.attempts.length}</strong></span>
                    <span className="text-muted-foreground">{t("Meilleur", "Best")}: <strong className={best >= 60 ? "text-emerald-500" : "text-rose-500"}>{best}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-0.5">
                    <span className="text-muted-foreground">{t("Dernier", "Last")}: <strong className={last >= 60 ? "text-emerald-500" : "text-rose-500"}>{last}</strong></span>
                    <span className={`font-bold ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                      {trend > 0 ? `▲ +${trend}` : trend < 0 ? `▼ ${trend}` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { t } = useLanguage();

  const [, navigate] = useLocation();
  const { data, isLoading, refetch, isFetching } = trpc.monitor.powerAnalytics.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const kpis               = data?.kpis;
  const studentRanking     = data?.studentRanking     ?? [];
  const stepCompletionRates= data?.stepCompletionRates ?? [];
  const errorFrequency     = data?.errorFrequency     ?? [];
  const scoreBuckets       = data?.scoreBuckets       ?? [];
  const scoreTimeline      = data?.scoreTimeline      ?? [];
  const heatmapData        = data?.heatmapData        ?? [];
  const moduleDistribution = data?.moduleDistribution ?? [];
  const radarData          = data?.radarData          ?? [];

  // ── Translated error labels ─────────────────────────────────────────────────
  const errorLabel = (type: string) => {
    const map: Record<string, [string, string]> = {
      OUT_OF_SEQUENCE:        [t("Hors séquence",       "Out of sequence"),        t("Hors séquence",       "Out of sequence")],
      NEGATIVE_STOCK_ATTEMPT: [t("Stock négatif",       "Negative stock"),         t("Stock négatif",       "Negative stock")],
      UNPOSTED_TX_LEFT:       [t("Tx non postée",       "Unposted transaction"),   t("Tx non postée",       "Unposted transaction")],
      UNRESOLVED_VARIANCE:    [t("Écart non résolu",    "Unresolved variance"),    t("Écart non résolu",    "Unresolved variance")],
      WRONG_ZONE_GR:          [t("Zone GR incorrecte",  "Wrong GR zone"),          t("Zone GR incorrecte",  "Wrong GR zone")],
      WRONG_ZONE_PUTAWAY:     [t("Zone Rangement",      "Wrong Putaway zone"),     t("Zone Rangement",      "Wrong Putaway zone")],
      WRONG_ZONE_PICKING:     [t("Zone Prélèvement",    "Wrong Picking zone"),     t("Zone Prélèvement",    "Wrong Picking zone")],
      WRONG_ZONE_GI:          [t("Zone GI incorrecte",  "Wrong GI zone"),          t("Zone GI incorrecte",  "Wrong GI zone")],
    };
    return map[type]?.[0] ?? type;
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const scoreDistPie = scoreBuckets.map((b, i) => ({
    name: `${b.label} pts`,
    value: b.count,
    color: PIE_COLORS[i],
  }));

  const studentBarData = studentRanking.slice(0, 12).map(s => ({
    name: (s.userName.split(" ")[0] ?? s.userName).substring(0, 10),
    fullName: s.userName,
    [t("Meilleur score", "Best Score")]: s.bestScore,
    [t("Score moyen",   "Avg Score")]:   s.avgScore,
  }));

  const stepBarData = stepCompletionRates.map(s => ({
    name: s.code.replace("_M1", ""),
    [t("Taux (%)", "Rate (%)")]: s.completionRate,
  }));

  const errorBarData = errorFrequency.slice(0, 8).map(e => ({
    name: errorLabel(e.type),
    [t("Occurrences", "Occurrences")]: e.count,
  }));

  const moduleBarData = moduleDistribution.map(m => ({
    name: m.label,
    [t("Évaluation",    "Evaluation")]:    m.evalCount,
    [t("Démonstration", "Demonstration")]: m.demoCount,
  }));

  const radarChartData = radarData.map(r => ({
    step: r.label.replace("_M1", ""),
    [t("Complétion (%)", "Completion (%)")]: r.value,
    fullMark: 100,
  }));

  const stepCodes = stepCompletionRates.map(s => s.code);

  const noData = t("Aucune donnée disponible", "No data available");

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <span className="text-sm">{t("Chargement des données analytiques…", "Loading analytics data…")}</span>
        </div>
      </div>
    );
  }

  return (
    <FioriShell>
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Dashboard Header ──────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-1"
              title={t("Retour au tableau de bord", "Back to dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("Retour", "Back")}</span>
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0078d4, #8764b8)" }}>
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t("Analytics — Tableau de bord pédagogique", "Analytics — Pedagogical Dashboard")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("Mini-WMS Concorde · Données en temps réel · Évaluations uniquement",
                   "Mini-WMS Concorde · Real-time data · Evaluations only")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full font-mono hidden sm:inline">
              {t("Mise à jour auto toutes les 60 s", "Auto-refresh every 60 s")}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("Actualiser", "Refresh")}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
          <div className="col-span-2">
            <KpiCard
              icon={Users}
              label={t("Étudiants actifs", "Active Students")}
              value={kpis?.totalStudents ?? 0}
              sub={t("en évaluation officielle", "in official evaluation")}
              color={C.primary}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={Award}
              label={t("Score moyen", "Average Score")}
              value={`${kpis?.avgScore ?? 0}/100`}
              sub={t("sessions complétées", "completed sessions")}
              color={C.amber}
              trend={kpis?.avgScore != null ? (kpis.avgScore >= 60 ? "up" : "down") : "neutral"}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={CheckCircle2}
              label={t("Taux de réussite", "Pass Rate")}
              value={`${kpis?.passRate ?? 0}%`}
              sub={t("score ≥ 60 points", "score ≥ 60 points")}
              color={C.success}
              trend={kpis?.passRate != null ? (kpis.passRate >= 50 ? "up" : "down") : "neutral"}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={ShieldCheck}
              label={t("Conformité", "Compliance")}
              value={`${kpis?.complianceRate ?? 0}%`}
              sub={t("sessions conformes WMS", "WMS-compliant sessions")}
              color={C.teal}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={Activity}
              label={t("Taux de complétion", "Completion Rate")}
              value={`${kpis?.completionRate ?? 0}%`}
              sub={`${kpis?.completedRuns ?? 0} / ${kpis?.totalRuns ?? 0} ${t("sessions", "sessions")}`}
              color={C.purple}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={TrendingUp}
              label={t("Progression moyenne", "Avg Progress")}
              value={`${kpis?.avgProgress ?? 0}%`}
              sub={t("avancement moyen par session", "avg advancement per session")}
              color={C.navy}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={BookOpen}
              label={t("Sessions évaluation", "Eval Sessions")}
              value={kpis?.totalRuns ?? 0}
              sub={t("sessions officielles totales", "total official sessions")}
              color={C.primary}
            />
          </div>
          <div className="col-span-2">
            <KpiCard
              icon={Clock}
              label={t("Sessions démo", "Demo Sessions")}
              value={kpis?.demoCount ?? 0}
              sub={t("non comptabilisées", "not counted in scores")}
              color={C.warning}
            />
          </div>
        </div>

        {/* ── Row 1: Student Ranking + Score Distribution ────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Student Score Ranking Bar Chart */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={Award}
              title={t("Classement des étudiants — Meilleur score vs Score moyen",
                       "Student Ranking — Best Score vs Average Score")}
              color={C.amber}
            />
            {studentBarData.length === 0
              ? <EmptyState label={noData} />
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={studentBarData} margin={{ top: 5, right: 20, bottom: 45, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey={t("Meilleur score", "Best Score")} fill={C.amber} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={t("Score moyen",   "Avg Score")}   fill={C.primary} radius={[4, 4, 0, 0]} opacity={0.75} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Score Distribution Donut */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={Target}
              title={t("Distribution des scores", "Score Distribution")}
              color={C.purple}
            />
            {scoreDistPie.every(d => d.value === 0)
              ? <EmptyState label={noData} />
              : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={scoreDistPie}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {scoreDistPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} ${t("session(s)", "session(s)")}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {scoreDistPie.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </div>
        </div>

        {/* ── Row 2: Step Completion + Error Frequency ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Step Completion Rate */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={CheckCircle2}
              title={t("Taux de complétion par étape (M1)", "Step Completion Rate (M1)")}
              color={C.success}
            />
            {stepBarData.length === 0
              ? <EmptyState label={noData} />
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stepBarData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={v => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      width={75}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={t("Taux (%)", "Rate (%)")} radius={[0, 4, 4, 0]}>
                      {stepBarData.map((entry, i) => (
                        <Cell key={i} fill={STEP_COLORS[stepCodes[i]] ?? C.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Error Frequency */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={AlertTriangle}
              title={t("Fréquence des erreurs pédagogiques", "Pedagogical Error Frequency")}
              color={C.danger}
            />
            {errorBarData.length === 0
              ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p>{t("Aucune erreur enregistrée — excellent !", "No errors recorded — excellent!")}</p>
                  </div>
                </div>
              )
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={errorBarData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 130 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      width={140}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey={t("Occurrences", "Occurrences")} fill={C.danger} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>

        {/* ── Row 3: Score Timeline + Radar ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Score Timeline */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={TrendingUp}
              title={t("Évolution du score moyen dans le temps", "Average Score Trend Over Time")}
              color={C.primary}
            />
            {scoreTimeline.length === 0
              ? <EmptyState label={t("Données insuffisantes pour la tendance", "Insufficient data for trend")} />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={scoreTimeline} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="avgScore"
                      name={t("Score moyen", "Avg Score")}
                      stroke={C.primary}
                      fill="url(#scoreGrad)"
                      strokeWidth={2}
                      dot={{ r: 4, fill: C.primary }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t("Sessions", "Sessions")}
                      stroke={C.warning}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Radar Chart */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={Activity}
              title={t("Profil de maîtrise par étape", "Step Mastery Profile")}
              color={C.teal}
            />
            {radarChartData.length === 0
              ? <EmptyState label={noData} />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarChartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="step" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                    <Radar
                      name={t("Taux de complétion (%)", "Completion Rate (%)")}
                      dataKey={t("Complétion (%)", "Completion (%)")}
                      stroke={C.teal}
                      fill={C.teal}
                      fillOpacity={0.3}
                    />
                    <Tooltip formatter={(v: any) => [`${v}%`, t("Complétion", "Completion")]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>

        {/* ── Row 4: Module Distribution + Detailed Ranking ─────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Module Distribution */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={BookOpen}
              title={t("Activité par module", "Activity by Module")}
              color={C.navy}
            />
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={moduleBarData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={t("Évaluation",    "Evaluation")}    fill={C.primary} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey={t("Démonstration", "Demonstration")} fill={C.warning} radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Student Ranking Table */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={Users}
              title={t("Tableau de classement détaillé", "Detailed Student Ranking")}
              color={C.primary}
            />
            {studentRanking.length === 0
              ? <EmptyState label={t("Aucun étudiant enregistré", "No students registered")} />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          "#",
                          t("Étudiant", "Student"),
                          t("Meilleur", "Best"),
                          t("Moyen", "Avg"),
                          t("Sessions", "Sessions"),
                          t("Complétées", "Completed"),
                          t("Erreurs", "Errors"),
                          t("Statut", "Status"),
                        ].map(h => (
                          <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentRanking.map((s, i) => {
                        const passed = s.bestScore >= 60;
                        const rank = i + 1;
                        return (
                          <tr
                            key={s.userId}
                            className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/20"} hover:bg-secondary/40 transition-colors`}
                          >
                            <td className="py-2 px-2">
                              <span className={`font-mono font-bold text-xs ${rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-600" : "text-muted-foreground"}`}>
                                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span className="font-medium text-foreground text-xs truncate max-w-[120px] block">{s.userName}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`font-bold text-sm ${s.bestScore >= 80 ? "text-emerald-500" : s.bestScore >= 60 ? "text-amber-500" : "text-rose-500"}`}>
                                {s.bestScore}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-muted-foreground text-xs font-mono">{s.avgScore}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-muted-foreground text-xs">{s.totalRuns}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-muted-foreground text-xs">{s.totalCompleted}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`text-xs font-mono font-bold ${s.totalPenalties > 5 ? "text-rose-500" : s.totalPenalties > 2 ? "text-amber-500" : "text-emerald-500"}`}>
                                {s.totalPenalties}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge
                                variant="secondary"
                                className={`text-xs border ${passed ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" : "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800"}`}
                              >
                                {passed ? t("Réussi ✓", "Passed ✓") : t("En cours", "In Progress")}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>

        {/* ── Row 5: Heatmap ────────────────────────────────────────────────── */}
        {heatmapData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <SectionHeader
              icon={Activity}
              title={t("Heatmap — Complétion des étapes par étudiant (M1)", "Heatmap — Step Completion by Student (M1)")}
              color={C.teal}
            />
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground min-w-[130px]">
                      {t("Étudiant", "Student")}
                    </th>
                    {stepCodes.map(code => (
                      <th key={code} className="text-center py-2 px-1 font-mono font-bold" style={{ color: STEP_COLORS[code] ?? C.primary, fontSize: 9 }}>
                        <div className="w-8 text-center">{code.replace("_M1", "")}</div>
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">
                      {t("Total", "Total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => {
                    const total = stepCodes.filter(c => (row as any)[c] === 1).length;
                    return (
                      <tr key={row.userId} className={`${i % 2 === 0 ? "" : "bg-secondary/20"}`}>
                        <td className="py-1.5 pr-4 font-medium text-foreground truncate max-w-[150px]" title={row.userName}>
                          {row.userName}
                        </td>
                        {stepCodes.map(code => (
                          <td key={code} className="py-1.5 px-1 text-center">
                            <HeatCell value={(row as any)[code] ?? 0} step={code} />
                          </td>
                        ))}
                        <td className="py-1.5 px-3 text-center">
                          <span className={`font-bold font-mono ${total === stepCodes.length ? "text-emerald-500" : total >= Math.ceil(stepCodes.length * 0.6) ? "text-amber-500" : "text-rose-500"}`}>
                            {total}/{stepCodes.length}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground font-semibold">{t("Légende :", "Legend:")}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: C.success }}>✓</div>
                <span className="text-xs text-muted-foreground">{t("Complété", "Completed")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded flex items-center justify-center text-gray-400 text-xs" style={{ backgroundColor: "#e5e7eb" }}>·</div>
                <span className="text-xs text-muted-foreground">{t("Non complété", "Not completed")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 ml-2">
                {stepCodes.map(code => (
                  <div key={code} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STEP_COLORS[code] ?? C.primary }} />
                    <span className="text-xs text-muted-foreground font-mono">{code.replace("_M1", "")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Row 6: Score Evolution Line Chart ─────────────────────────── */}
        <ScoreEvolutionSection />

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="text-center py-4 text-xs text-muted-foreground border-t border-border">
          {t(
            "TEC.LOG Analytics · Collège de la Concorde · Données actualisées toutes les 60 secondes · Évaluations officielles uniquement",
            "TEC.LOG Analytics · Collège de la Concorde · Data refreshed every 60 seconds · Official evaluations only"
          )}
        </div>
      </div>
    </div>
    </FioriShell>
  );
}
