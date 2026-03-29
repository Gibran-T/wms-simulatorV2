import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import FioriShell from "@/components/FioriShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, FlaskConical, ShieldCheck, Zap, AlertTriangle, Play, Lock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Module3ModeSelectionPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = parseInt(params.scenarioId ?? "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (fr: string, en: string) => language === "FR" ? fr : en;
  const [selectedMode, setSelectedMode] = useState<"evaluation" | "demonstration">("evaluation");

  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const scenario = scenarios?.find((s) => s.id === scenarioId);

  const startRun = trpc.runs.start.useMutation({
    onSuccess: (data) => {
      navigate(`/student/run/${data.runId}`);
    },
    onError: (err) => {
      toast.error(err.message ?? t("Erreur lors du démarrage", "Error starting simulation"));
    },
  });

  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  if (!scenarioId || !scenario) {
    return (
      <FioriShell>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          {t("Scénario introuvable.", "Scenario not found.")}
        </div>
      </FioriShell>
    );
  }

  return (
    <FioriShell>
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="cursor-pointer hover:underline" onClick={() => navigate("/student/module3")}>
            {t("Module 3", "Module 3")}
          </span>
          <span>›</span>
          <span>{t("Mode de simulation", "Simulation Mode")}</span>
        </div>

        {/* Scenario card */}
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                  {t("Scénario sélectionné", "Selected Scenario")}
                </p>
                <CardTitle className="text-base">{scenario.name}</CardTitle>
                <CardDescription className="text-xs">{scenario.difficulty ?? t("facile", "easy")}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Mode selection */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">{t("MODE DE SIMULATION :", "SIMULATION MODE:")}</p>

          {/* Evaluation mode */}
          <div
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              selectedMode === "evaluation" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
            }`}
            onClick={() => setSelectedMode("evaluation")}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMode === "evaluation" ? "border-teal-500" : "border-slate-400"}`}>
                {selectedMode === "evaluation" && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{t("Mode Évaluation", "Evaluation Mode")}</span>
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs" variant="outline">
                    {t("PAR DÉFAUT", "DEFAULT")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t(
                    "Mode officiel avec score et blocage séquentiel. Les points sont calculés, les pénalités s'appliquent.",
                    "Official mode with score and sequential blocking. Points are calculated, penalties apply."
                  )}
                  <strong> {t("Score maximum : 100 points.", "Maximum score: 100 points.")}</strong>
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> {t("Score activé", "Score enabled")}</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {t("Règles Min/Max", "Min/Max rules")}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-teal-500" /> {t("Rapport final", "Final report")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demo mode */}
          <div
            className={`rounded-lg border-2 p-4 transition-colors ${
              !isTeacherOrAdmin
                ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                : selectedMode === "demonstration"
                ? "border-teal-500 bg-teal-50 cursor-pointer"
                : "border-slate-200 hover:border-slate-300 cursor-pointer"
            }`}
            onClick={() => isTeacherOrAdmin && setSelectedMode("demonstration")}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMode === "demonstration" && isTeacherOrAdmin ? "border-teal-500" : "border-slate-400"}`}>
                {selectedMode === "demonstration" && isTeacherOrAdmin && <div className="w-2 h-2 rounded-full bg-teal-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{t("Mode Démonstration", "Demonstration Mode")}</span>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs" variant="outline">
                    {t("ENSEIGNANTS", "TEACHERS")}
                  </Badge>
                  {!isTeacherOrAdmin && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Lock className="w-3 h-3" /> {t("Réservé", "Restricted")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t(
                    "Mode pédagogique libre. Aucun score enregistré, aucune pénalité, progression libre. Inclut les explications approfondies sur le contrôle des stocks.",
                    "Free pedagogical mode. No score recorded, no penalties, free progression. Includes in-depth explanations on inventory control."
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3 text-teal-500" /> {t("Progression libre", "Free progression")}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-purple-500" /> {t("Explications pédagogiques", "Pedagogical explanations")}</span>
                  {!isTeacherOrAdmin && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {t("Accès réservé aux enseignants", "Restricted to teachers")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => navigate("/student/module3")}>
            ← {t("Retour aux scénarios", "Back to scenarios")}
          </Button>
          <Button
            className="gap-2 bg-teal-600 hover:bg-teal-700"
            disabled={startRun.isPending}
            onClick={() => {
              startRun.mutate({
                scenarioId,
                isDemo: selectedMode === "demonstration",
              });
            }}
          >
            <Play className="w-4 h-4" />
            {startRun.isPending
              ? t("Démarrage...", "Starting...")
              : `${t("Démarrer en mode", "Start in")} ${selectedMode === "evaluation" ? t("Évaluation", "Evaluation") : t("Démonstration", "Demonstration")}`}
          </Button>
        </div>
      </div>
    </FioriShell>
  );
}
