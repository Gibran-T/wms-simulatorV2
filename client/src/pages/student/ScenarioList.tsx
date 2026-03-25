import FioriShell from "@/components/FioriShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  BookOpen, Play, ChevronRight, AlertCircle, UserCircle, CheckCircle,
  Pencil, MonitorPlay, Presentation, Lock, Clock, Target, Info,
  ChevronDown, ChevronUp, BarChart2, Layers, TrendingUp, FileText,
} from "lucide-react";
import ModeSelectionScreen from "./ModeSelectionScreen";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Module metadata ──────────────────────────────────────────────────────────
const MODULE_CONFIG = [
  {
    id: 1,
    icon: BookOpen,
    color: "#0070f2",
    bg: "bg-[#e8f0fe]",
    text: "text-[#0070f2]",
    border: "border-[#0070f2]/30",
    accentBg: "bg-[#0070f2]",
    titleFr: "Fondements de la chaîne logistique et intégration ERP/WMS",
    titleEn: "Supply Chain Foundations & ERP/WMS Integration",
    descFr: "Maîtrisez le cycle complet PO→GR→Stock→SO→GI→Cycle Count→Conformité",
    descEn: "Master the complete cycle PO→GR→Stock→SO→GI→Cycle Count→Compliance",
    durationH: 4,
    passThreshold: 60,
    route: "/student/scenarios",
    slidesRoute: "/student/slides/1",
    steps: ["PO", "GR", "STOCK", "SO", "GI", "CC", "COMPLIANCE"],
    objectives: [
      { fr: "Comprendre les flux logistiques PO→GR→SO→GI", en: "Understand logistics flows PO→GR→SO→GI" },
      { fr: "Maîtriser la création de commandes dans le WMS", en: "Master order creation in the WMS" },
      { fr: "Valider les réceptions et gérer les stocks", en: "Validate receipts and manage inventory" },
      { fr: "Effectuer un Cycle Count et finaliser la conformité", en: "Perform a Cycle Count and finalize compliance" },
    ],
  },
  {
    id: 2,
    icon: Layers,
    color: "#2563eb",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-300",
    accentBg: "bg-blue-600",
    titleFr: "Exécution d'entrepôt et gestion des emplacements",
    titleEn: "Warehouse Execution & Location Management",
    descFr: "Rangement structuré · Capacité bin · FIFO · Précision inventaire",
    descEn: "Structured putaway · Bin capacity · FIFO · Inventory accuracy",
    durationH: 5,
    passThreshold: 60,
    route: "/student/module2",
    slidesRoute: "/student/slides/2",
    steps: ["RÉCEPTION", "PUTAWAY", "BIN CAPACITY", "FIFO", "INVENTAIRE"],
    objectives: [
      { fr: "Exécuter un rangement structuré depuis le quai", en: "Execute structured putaway from the dock" },
      { fr: "Valider les limites de capacité par emplacement", en: "Validate bin capacity limits" },
      { fr: "Respecter la règle FIFO (premier entré, premier sorti)", en: "Apply FIFO rule (first in, first out)" },
      { fr: "Contrôler la précision de l'inventaire système vs physique", en: "Control system vs physical inventory accuracy" },
    ],
  },
  {
    id: 3,
    icon: TrendingUp,
    color: "#059669",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-300",
    accentBg: "bg-emerald-600",
    titleFr: "Contrôle des stocks et réapprovisionnement",
    titleEn: "Inventory Control & Replenishment",
    descFr: "Inventaire cyclique · Écarts · Ajustements · Min/Max · Stock de sécurité",
    descEn: "Cycle counting · Variances · Adjustments · Min/Max · Safety stock",
    durationH: 5,
    passThreshold: 70,
    route: "/student/module3",
    slidesRoute: "/student/slides/3",
    steps: ["CYCLE COUNT", "VARIANCE", "AJUSTEMENT", "RÉAPPRO", "VALIDATION"],
    objectives: [
      { fr: "Réaliser un inventaire cyclique complet", en: "Perform a complete cycle count" },
      { fr: "Analyser et justifier les écarts de stock", en: "Analyze and justify stock variances" },
      { fr: "Générer des suggestions de réapprovisionnement", en: "Generate replenishment suggestions" },
      { fr: "Valider les ajustements avec l'enseignant", en: "Validate adjustments with the teacher" },
    ],
  },
  {
    id: 4,
    icon: BarChart2,
    color: "#d97706",
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-300",
    accentBg: "bg-orange-600",
    titleFr: "Indicateurs de performance logistique",
    titleEn: "Logistics Performance Indicators",
    descFr: "Rotation · Taux de service · Taux d'erreur · Lead time · Diagnostic KPI",
    descEn: "Turnover · Service rate · Error rate · Lead time · KPI diagnostics",
    durationH: 5,
    passThreshold: 70,
    route: "/student/module4",
    slidesRoute: "/student/slides/4",
    steps: ["KPI CALCUL", "ROTATION", "TAUX SERVICE", "LEAD TIME", "DIAGNOSTIC"],
    objectives: [
      { fr: "Calculer les KPI logistiques clés (OTIF, Fill Rate, DSI)", en: "Calculate key logistics KPIs (OTIF, Fill Rate, DSI)" },
      { fr: "Analyser la rotation des stocks et le lead time", en: "Analyze stock turnover and lead time" },
      { fr: "Identifier les causes racines des écarts de performance", en: "Identify root causes of performance gaps" },
      { fr: "Proposer des actions correctives basées sur les données", en: "Propose data-driven corrective actions" },
    ],
  },
  {
    id: 5,
    icon: FileText,
    color: "#7b1fa2",
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-300",
    accentBg: "bg-purple-600",
    titleFr: "Simulation opérationnelle intégrée",
    titleEn: "Integrated Operational Simulation",
    descFr: "Réception · Rangement FIFO · Inventaire · Réapprovisionnement · KPI · Décision",
    descEn: "Reception · FIFO putaway · Inventory · Replenishment · KPI · Decision",
    durationH: 6,
    passThreshold: 70,
    route: "/student/module5",
    slidesRoute: "/student/slides/5",
    steps: ["RÉCEPTION", "RANGEMENT", "INVENTAIRE", "RÉAPPRO", "KPI", "DÉCISION"],
    objectives: [
      { fr: "Exécuter un cycle complet de bout en bout", en: "Execute a complete end-to-end cycle" },
      { fr: "Gérer des situations de crise (rupture, erreur, retard)", en: "Manage crisis situations (stockout, error, delay)" },
      { fr: "Analyser les KPI en temps réel et prendre des décisions", en: "Analyze real-time KPIs and make decisions" },
      { fr: "Démontrer la maîtrise globale du système WMS", en: "Demonstrate overall WMS system mastery" },
    ],
  },
];

// ── Acronym glossary ─────────────────────────────────────────────────────────
const ACRONYMS = [
  { code: "PO", fr: "Purchase Order — Bon de commande fournisseur", en: "Purchase Order — Supplier order document" },
  { code: "GR", fr: "Goods Receipt — Réception de marchandises", en: "Goods Receipt — Receiving goods into the system" },
  { code: "SO", fr: "Sales Order — Commande client", en: "Sales Order — Customer order document" },
  { code: "GI", fr: "Goods Issue — Sortie de stock", en: "Goods Issue — Issuing goods from stock" },
  { code: "CC", fr: "Cycle Count — Inventaire cyclique", en: "Cycle Count — Periodic physical inventory check" },
  { code: "FIFO", fr: "First In, First Out — Premier entré, premier sorti", en: "First In, First Out — oldest stock leaves first" },
  { code: "KPI", fr: "Key Performance Indicator — Indicateur clé de performance", en: "Key Performance Indicator — performance metric" },
  { code: "WMS", fr: "Warehouse Management System — Système de gestion d'entrepôt", en: "Warehouse Management System — warehouse software" },
  { code: "ERP", fr: "Enterprise Resource Planning — Progiciel de gestion intégré", en: "Enterprise Resource Planning — integrated business software" },
];

// ── Difficulty config ────────────────────────────────────────────────────────
const DIFF_CONFIG: Record<string, { labelFr: string; labelEn: string; bg: string; text: string; border: string }> = {
  facile:    { labelFr: "Facile",    labelEn: "Easy",   bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  moyen:     { labelFr: "Moyen",     labelEn: "Medium", bg: "bg-amber-100 dark:bg-amber-900/40",     text: "text-amber-800 dark:text-amber-300",     border: "border-amber-300 dark:border-amber-700" },
  difficile: { labelFr: "Difficile", labelEn: "Hard",   bg: "bg-red-100 dark:bg-red-900/40",         text: "text-red-800 dark:text-red-300",         border: "border-red-300 dark:border-red-700" },
};

// ── Estimated duration per scenario (minutes) ────────────────────────────────
const SCENARIO_DURATION: Record<number, number> = {
  1: 15, 2: 20, 3: 20, 4: 25, 5: 30,
  6: 20, 7: 25, 8: 25, 9: 30, 10: 35,
  11: 20, 12: 25, 13: 30, 14: 35, 15: 40,
  16: 25, 17: 30,
};

export default function ScenarioList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  const [selectedModule, setSelectedModule] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const m = parseInt(params.get("module") ?? "1", 10);
    return [1, 2, 3, 4, 5].includes(m) ? m : 1;
  });
  const [showGlossary, setShowGlossary] = useState(false);
  const [editingStudentNum, setEditingStudentNum] = useState(false);
  const [studentNumInput, setStudentNumInput] = useState("");
  const [pendingScenario, setPendingScenario] = useState<{ id: number; name: string; difficulty?: string } | null>(null);

  const { data: scenarios, isLoading } = trpc.scenarios.list.useQuery();
  const { data: myRuns } = trpc.runs.myRunsEnriched.useQuery();
  const { data: myProfile, refetch: refetchProfile } = trpc.profiles.mine.useQuery();
  const upsertProfile = trpc.profiles.upsert.useMutation({ onSuccess: () => refetchProfile() });

  const mod = MODULE_CONFIG.find((m) => m.id === selectedModule)!;
  const ModIcon = mod.icon;

  const moduleScenarios = (scenarios ?? []).filter((s) => s.moduleId === selectedModule);

  const getActiveRun = (scenarioId: number) =>
    myRuns?.find((r) => r.run.scenarioId === scenarioId && r.run.status === "in_progress" && !r.run.isDemo);

  const getCompletedRun = (scenarioId: number) =>
    myRuns?.find((r) => r.run.scenarioId === scenarioId && r.run.status === "completed" && !r.run.isDemo);

  const handleSaveStudentNum = () => {
    upsertProfile.mutate({ studentNumber: studentNumInput.trim() || null });
    setEditingStudentNum(false);
  };

  if (pendingScenario) {
    return (
      <ModeSelectionScreen
        scenarioId={pendingScenario.id}
        scenarioName={pendingScenario.name}
        scenarioDifficulty={pendingScenario.difficulty}
        onCancel={() => setPendingScenario(null)}
      />
    );
  }

  return (
    <FioriShell
      title={t("Mes Scénarios", "My Scenarios")}
      breadcrumbs={[{ label: t("Accueil", "Home"), href: "/" }, { label: t("Scénarios", "Scenarios") }]}
    >
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Teacher banner ──────────────────────────────────────────────── */}
        {isTeacherOrAdmin && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-md border-2 border-purple-500/40 bg-purple-500/10 dark:bg-purple-900/20">
            <div className="w-8 h-8 bg-purple-700 rounded-md flex items-center justify-center shrink-0">
              <MonitorPlay size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-300">
                {t("Mode Enseignant — Vue de démonstration", "Teacher Mode — Demonstration View")}
              </p>
              <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-0.5">
                {t("Scores affichés à titre pédagogique (non officiels).", "Scores shown for pedagogical purposes (non-official).")}
              </p>
            </div>
            <button onClick={() => navigate("/teacher")} className="text-xs text-purple-700 dark:text-purple-300 font-semibold hover:underline shrink-0">
              ← {t("Tableau de bord", "Dashboard")}
            </button>
          </div>
        )}

        {/* ── Student number ──────────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-md border ${
          myProfile?.studentNumber ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <UserCircle size={16} className={myProfile?.studentNumber ? "text-green-600 dark:text-green-400 shrink-0" : "text-amber-600 dark:text-amber-400 shrink-0"} />
          {editingStudentNum ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <input
                type="text"
                value={studentNumInput}
                onChange={(e) => setStudentNumInput(e.target.value)}
                placeholder={t("Ex: 2024-12345", "e.g. 2024-12345")}
                maxLength={64}
                className="border border-border rounded px-2 py-1 text-xs w-40 focus:outline-none focus:border-primary bg-background text-foreground"
                onKeyDown={(e) => e.key === "Enter" && handleSaveStudentNum()}
                autoFocus
              />
              <button onClick={handleSaveStudentNum} disabled={upsertProfile.isPending}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded hover:bg-primary/90">
                <CheckCircle size={11} /> {t("Enregistrer", "Save")}
              </button>
              <button onClick={() => setEditingStudentNum(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                {t("Annuler", "Cancel")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-muted-foreground">{t("N° étudiant :", "Student #:")}</span>
              {myProfile?.studentNumber ? (
                <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">{myProfile.studentNumber}</span>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                  {t("Non défini", "Not set")}
                  <span className="hidden sm:inline"> — {t("requis pour l'identification par l'enseignant", "required for teacher identification")}</span>
                </span>
              )}
              <button onClick={() => { setStudentNumInput(myProfile?.studentNumber ?? ""); setEditingStudentNum(true); }}
                className="ml-1 text-muted-foreground hover:text-primary transition-colors" title={t("Modifier", "Edit")}>
                <Pencil size={11} />
              </button>
            </div>
          )}
        </div>

        {/* ── Module selector tabs ─────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-md p-1 flex gap-1 overflow-x-auto">
          {MODULE_CONFIG.map((m) => {
            const Icon = m.icon;
            const active = m.id === selectedModule;
            const modScenarios = (scenarios ?? []).filter((s) => s.moduleId === m.id);
            const completedCount = modScenarios.filter((s) => getCompletedRun(s.id)).length;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-all shrink-0 ${
                  active
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={active ? { backgroundColor: m.color } : {}}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">M{m.id}</span>
                <span className="sm:hidden">M{m.id}</span>
                {completedCount > 0 && (
                  <span className={`text-[9px] px-1 rounded-full font-bold ${active ? "bg-white/30 text-white" : "bg-green-100 text-green-700"}`}>
                    {completedCount}✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Module header card ───────────────────────────────────────────── */}
        <div className={`bg-card border-2 ${mod.border} rounded-md overflow-hidden`}>
          {/* Color accent top bar */}
          <div className="h-1.5 w-full" style={{ backgroundColor: mod.color }} />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: mod.color }}>
                <ModIcon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Module {mod.id} · {mod.durationH}h · {t("Seuil de réussite", "Pass threshold")}: {mod.passThreshold}/100
                    </p>
                    <h2 className="text-foreground font-bold text-base leading-snug">
                      {language === "FR" ? mod.titleFr : mod.titleEn}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === "FR" ? mod.descFr : mod.descEn}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(mod.slidesRoute)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: mod.color }}
                  >
                    <Presentation size={13} />
                    {t("Slides M", "Slides M")}{mod.id}
                  </button>
                </div>

                {/* Process flow steps */}
                <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 flex-wrap">
                  {mod.steps.map((step, i) => (
                    <div key={step} className="flex items-center gap-1 shrink-0">
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded cursor-help"
                        style={{ backgroundColor: `${mod.color}18`, color: mod.color, border: `1px solid ${mod.color}30` }}
                        title={ACRONYMS.find((a) => a.code === step)
                          ? (language === "FR" ? ACRONYMS.find((a) => a.code === step)!.fr : ACRONYMS.find((a) => a.code === step)!.en)
                          : step}
                      >
                        {step}
                      </span>
                      {i < mod.steps.length - 1 && <ChevronRight size={10} className="text-muted-foreground/40" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Learning objectives (collapsible) */}
            <details className="mt-4 group">
              <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground list-none select-none">
                <Target size={12} style={{ color: mod.color }} />
                {t("Objectifs pédagogiques", "Learning objectives")}
                <ChevronDown size={12} className="group-open:hidden ml-auto" />
                <ChevronUp size={12} className="hidden group-open:block ml-auto" />
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mod.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: mod.color }}>
                      {i + 1}
                    </div>
                    <p className="text-[11px] text-foreground leading-snug">
                      {language === "FR" ? obj.fr : obj.en}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>

        {/* ── Scenarios list ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t("Scénarios disponibles", "Available scenarios")} ({moduleScenarios.length})
            </p>
            <span className="text-[10px] text-muted-foreground">
              {t("Score de passage :", "Pass score:")} <strong>{mod.passThreshold}/100</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-md p-5 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
                  <div className="h-3 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : moduleScenarios.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-md py-12 text-center">
              <p className="text-muted-foreground text-sm mb-1">{t("Aucun scénario disponible pour ce module.", "No scenarios available for this module.")}</p>
              <p className="text-xs text-muted-foreground">{t("Contactez votre enseignant.", "Contact your teacher.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {moduleScenarios.map((scenario, idx) => {
                const activeRun = getActiveRun(scenario.id);
                const completedRun = getCompletedRun(scenario.id);
                const diffCfg = DIFF_CONFIG[scenario.difficulty ?? "facile"] ?? DIFF_CONFIG.facile;
                const estimatedMin = SCENARIO_DURATION[idx + 1] ?? 20;
                const progressPct = activeRun ? Math.round(((activeRun.completedSteps?.length ?? 0) / mod.steps.length) * 100) : 0;
                const completedSteps = activeRun?.completedSteps?.length ?? 0;

                return (
                  <div
                    key={scenario.id}
                    className={`bg-card border rounded-md overflow-hidden transition-all hover:shadow-sm ${
                      completedRun ? "border-green-400/50 dark:border-green-700/50" : activeRun ? "border-amber-400/50 dark:border-amber-700/50" : "border-border hover:border-primary/40"
                    }`}
                  >
                    {/* Status accent bar */}
                    <div className="h-1 w-full" style={{
                      backgroundColor: completedRun ? "#107e3e" : activeRun ? "#e9730c" : mod.color,
                      opacity: completedRun || activeRun ? 1 : 0.3,
                    }} />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diffCfg.bg} ${diffCfg.text} ${diffCfg.border}`}
                              title={language === "FR"
                                ? `Difficulté : ${diffCfg.labelFr}`
                                : `Difficulty: ${diffCfg.labelEn}`}>
                              {language === "FR" ? diffCfg.labelFr : diffCfg.labelEn}
                            </span>
                            {completedRun && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700">
                                <CheckCircle size={9} /> {t("Complété", "Completed")}
                                {completedRun.score !== null && completedRun.score !== undefined && (
                                  <span className="ml-1 font-bold">{completedRun.score}/100</span>
                                )}
                              </span>
                            )}
                            {activeRun && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <Play size={9} /> {t("En cours", "In progress")} — {completedSteps}/{mod.steps.length} {t("étapes", "steps")}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock size={9} /> ~{estimatedMin} min
                            </span>
                          </div>

                          {/* Title & description */}
                          <h3 className="text-foreground font-semibold text-sm mb-1 leading-snug">{scenario.name}</h3>
                          <p className="text-muted-foreground text-xs leading-relaxed">{scenario.descriptionFr}</p>

                          {/* Progress bar for in-progress runs */}
                          {activeRun && (
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                                <span>{t("Progression", "Progress")}</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">{progressPct}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Completed score bar */}
                          {completedRun && completedRun.score !== null && completedRun.score !== undefined && (
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                                <span>{t("Score obtenu", "Score achieved")}</span>
                                <span className={`font-bold ${completedRun.score >= mod.passThreshold ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                  {completedRun.score}/100 {completedRun.score >= mod.passThreshold ? `✓ ${t("Réussi", "Passed")}` : `✗ ${t("Échoué", "Failed")}`}
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${completedRun.score >= mod.passThreshold ? "bg-green-500" : "bg-red-500"}`}
                                  style={{ width: `${completedRun.score}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex-shrink-0 flex flex-col gap-2">
                          {activeRun && (
                            <button
                              onClick={() => navigate(`/student/run/${activeRun.run.id}`)}
                              className="flex items-center gap-1.5 bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-amber-700 transition-colors"
                            >
                              <Play size={12} /> {t("Continuer", "Continue")}
                            </button>
                          )}
                          {completedRun && (
                            <button
                              onClick={() => navigate(`/student/run/${completedRun.run.id}/report`)}
                              className="flex items-center gap-1.5 bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-800 transition-colors"
                            >
                              {t("Voir rapport", "View report")}
                            </button>
                          )}
                          {!activeRun && (
                            <button
                              onClick={() => {
                                // All modules (M1-M5) use the unified ModeSelectionScreen → run flow
                                setPendingScenario({ id: scenario.id, name: scenario.name, difficulty: scenario.difficulty ?? undefined });
                              }}
                              className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: mod.color }}
                            >
                              <Play size={12} /> {completedRun ? t("Recommencer", "Restart") : t("Démarrer", "Start")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Glossary (collapsible) ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setShowGlossary((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info size={13} />
              {t("Glossaire des acronymes WMS/ERP", "WMS/ERP Acronym Glossary")}
            </span>
            {showGlossary ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showGlossary && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-border pt-3">
              {ACRONYMS.map((a) => (
                <div key={a.code} className="flex items-start gap-2 p-2 rounded bg-muted/40">
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: mod.color }}>
                    {a.code}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {language === "FR" ? a.fr : a.en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Info box ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <AlertCircle size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
              {t("Instructions pédagogiques", "Pedagogical Instructions")}
            </p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
              {t(
                `Chaque scénario simule un contexte d'entrepôt réel. Suivez le flux séquentiel obligatoire — le système bloque toute action hors séquence. Score maximum : 100 points. Seuil de réussite : ${mod.passThreshold}/100.`,
                `Each scenario simulates a real warehouse context. Follow the mandatory sequential flow — the system blocks any out-of-sequence action. Maximum score: 100 points. Pass threshold: ${mod.passThreshold}/100.`
              )}
            </p>
          </div>
        </div>

      </div>
    </FioriShell>
  );
}
