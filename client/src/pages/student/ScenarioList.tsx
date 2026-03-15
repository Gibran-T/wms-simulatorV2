import FioriShell from "@/components/FioriShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { BookOpen, Play, ChevronRight, AlertCircle, UserCircle, CheckCircle, Pencil, MonitorPlay, Presentation } from "lucide-react";
import ModeSelectionScreen from "./ModeSelectionScreen";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ScenarioList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";
  const { data: scenarios, isLoading } = trpc.scenarios.list.useQuery();
  const { data: myRuns } = trpc.runs.myRuns.useQuery();
  const { data: myProfile, refetch: refetchProfile } = trpc.profiles.mine.useQuery();
  const upsertProfile = trpc.profiles.upsert.useMutation({ onSuccess: () => refetchProfile() });
  const [pendingScenario, setPendingScenario] = useState<{ id: number; name: string; difficulty?: string } | null>(null);
  const [editingStudentNum, setEditingStudentNum] = useState(false);
  const [studentNumInput, setStudentNumInput] = useState("");

  const difficultyConfig: Record<string, { label: string; color: string }> = {
    facile: { label: t("Facile", "Easy"), color: "badge-valid" },
    moyen: { label: t("Moyen", "Medium"), color: "badge-pending" },
    difficile: { label: t("Difficile", "Hard"), color: "badge-blocked" },
  };

  const getRunForScenario = (scenarioId: number) =>
    myRuns?.find((r) => r.run.scenarioId === scenarioId && r.run.status === "in_progress" && !r.run.isDemo);

  const getCompletedRunForScenario = (scenarioId: number) =>
    myRuns?.find((r) => r.run.scenarioId === scenarioId && r.run.status === "completed" && !r.run.isDemo);

  const handleOpenEdit = () => {
    setStudentNumInput(myProfile?.studentNumber ?? "");
    setEditingStudentNum(true);
  };

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
      title={t("Mes Scénarios — Module 1", "My Scenarios — Module 1")}
      breadcrumbs={[{ label: t("Accueil", "Home"), href: "/" }, { label: t("Scénarios", "Scenarios") }]}
    >
      <div className="max-w-4xl mx-auto">

        {/* ── Mode Enseignant Banner ─────────────────────────────────────── */}
        {isTeacherOrAdmin && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-4 border-2 border-purple-600/40 bg-purple-500/10">
            <div className="w-8 h-8 bg-purple-700 dark:bg-purple-800 rounded-md flex items-center justify-center shrink-0">
              <MonitorPlay size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-300">
                {t("Mode Enseignant — Vue de démonstration", "Teacher Mode — Demonstration View")}
              </p>
              <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-0.5">
                {t(
                  "Vous consultez l'interface étudiant en tant qu'enseignant. Les scores affichés sont à titre pédagogique (non officiels).",
                  "You are viewing the student interface as a teacher. Scores shown are for pedagogical purposes (non-official)."
                )}
              </p>
            </div>
            <button
              onClick={() => navigate("/teacher")}
              className="text-xs text-purple-700 dark:text-purple-300 font-semibold hover:underline shrink-0"
            >
              ← {t("Retour tableau de bord", "Back to dashboard")}
            </button>
          </div>
        )}

        {/* ── Numéro étudiant banner ─────────────────────────────────────── */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-md mb-4 border ${
          myProfile?.studentNumber
            ? "bg-green-500/10 border-green-600/30"
            : "bg-amber-500/10 border-amber-600/30"
        }`}>
          <UserCircle size={18} className={myProfile?.studentNumber ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"} />
          {editingStudentNum ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={studentNumInput}
                onChange={(e) => setStudentNumInput(e.target.value)}
                placeholder={t("Ex: 2024-12345", "e.g. 2024-12345")}
                maxLength={64}
                className="border border-border rounded px-2 py-1 text-xs w-48 focus:outline-none focus:border-primary bg-background text-foreground"
                onKeyDown={(e) => e.key === "Enter" && handleSaveStudentNum()}
                autoFocus
              />
              <button
                onClick={handleSaveStudentNum}
                disabled={upsertProfile.isPending}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded hover:bg-primary/90 transition-colors"
              >
                <CheckCircle size={12} />
                {t("Enregistrer", "Save")}
              </button>
              <button
                onClick={() => setEditingStudentNum(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                {t("Annuler", "Cancel")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-semibold text-muted-foreground">{t("Numéro étudiant :", "Student number:")}</span>
              {myProfile?.studentNumber ? (
                <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">{myProfile.studentNumber}</span>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                  {t("Non défini — requis pour l'identification par l'enseignant", "Not set — required for teacher identification")}
                </span>
              )}
              <button
                onClick={handleOpenEdit}
                className="ml-1 text-muted-foreground hover:text-primary transition-colors"
                title={t("Modifier le numéro étudiant", "Edit student number")}
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Module Header */}
        <div className="bg-card border border-border rounded-md p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
              <BookOpen size={22} className="text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Module 1</p>
                  <h2 className="text-foreground font-semibold text-base">
                    {t("Fondements de la chaîne logistique et intégration ERP/WMS", "Foundations of Supply Chain & ERP/WMS Integration")}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Maîtrisez le cycle complet :", "Master the complete cycle:")}{" "}
                    <span className="font-medium text-primary">PO → GR → Stock → SO → GI → Cycle Count → {t("Conformité", "Compliance")}</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate("/student/slides/1")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground shrink-0 transition-opacity hover:opacity-90"
                  title={t("Accéder aux slides du Module 1", "Access Module 1 slides")}
                >
                  <Presentation size={14} />
                  {t("Slides M1", "Slides M1")}
                </button>
              </div>
            </div>
          </div>

          {/* Process Flow Mini */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {["PO", "GR", "STOCK", "SO", "GI", "CC", "COMPLIANCE"].map((step, i) => (
              <div key={step} className="flex items-center gap-1 flex-shrink-0">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">{step}</span>
                {i < 6 && <ChevronRight size={12} className="text-muted-foreground/40" />}
              </div>
            ))}
          </div>
        </div>

        {/* Scenarios */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Scénarios disponibles", "Available scenarios")} ({scenarios?.length ?? 0})
          </p>
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
        ) : (
          <div className="space-y-3">
            {scenarios?.map((scenario) => {
              const activeRun = getRunForScenario(scenario.id);
              const completedRun = getCompletedRunForScenario(scenario.id);
              const diffCfg = difficultyConfig[scenario.difficulty ?? 'facile'] ?? difficultyConfig.facile;

              return (
                <div key={scenario.id} className="bg-card border border-border rounded-md p-5 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={diffCfg.color}>{diffCfg.label}</span>
                        {completedRun && <span className="badge-valid">✓ {t("Complété", "Completed")}</span>}
                        {activeRun && <span className="badge-pending">{t("En cours", "In progress")}</span>}
                      </div>
                      <h3 className="text-foreground font-semibold text-sm mb-1">{scenario.name}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{scenario.descriptionFr}</p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2">
                      {activeRun ? (
                        <button
                          onClick={() => navigate(`/student/run/${activeRun.run.id}`)}
                          className="flex items-center gap-1.5 bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-amber-700 transition-colors"
                        >
                          <Play size={12} />
                          {t("Continuer", "Continue")}
                        </button>
                      ) : completedRun ? (
                        <button
                          onClick={() => navigate(`/student/run/${completedRun.run.id}/report`)}
                          className="flex items-center gap-1.5 bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-800 transition-colors"
                        >
                          {t("Voir rapport", "View report")}
                        </button>
                      ) : null}
                      {!activeRun && (
                        <button
                          onClick={() => setPendingScenario({ id: scenario.id, name: scenario.name, difficulty: scenario.difficulty ?? undefined })}
                          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          <Play size={12} />
                          {completedRun ? t("Recommencer", "Restart") : t("Démarrer", "Start")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="alert-info mt-5 flex items-start gap-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold mb-0.5">{t("Instructions pédagogiques", "Pedagogical Instructions")}</p>
            <p className="text-xs">
              {t(
                "Chaque scénario simule un contexte d'entrepôt réel. Suivez le flux séquentiel obligatoire. Le système bloque toute action hors séquence. Score maximum :",
                "Each scenario simulates a real warehouse context. Follow the mandatory sequential flow. The system blocks any out-of-sequence action. Maximum score:"
              )}{" "}
              <strong>100 {t("points", "points")}</strong>.{" "}
              {t(
                "Les enseignants peuvent activer le Mode Démonstration pour une exploration libre sans score.",
                "Teachers can activate Demonstration Mode for free exploration without scoring."
              )}
            </p>
          </div>
        </div>
      </div>
    </FioriShell>
  );
}
