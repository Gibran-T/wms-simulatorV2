import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { BookOpen, GraduationCap, FlaskConical, ShieldCheck, Zap, AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ModeSelectionScreenProps {
  scenarioId: number;
  scenarioName: string;
  scenarioDifficulty?: string;
  onCancel: () => void;
}

export default function ModeSelectionScreen({ scenarioId, scenarioName, scenarioDifficulty, onCancel }: ModeSelectionScreenProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (fr: string, en: string) => language === "FR" ? fr : en;
  const [, navigate] = useLocation();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";
  const [selectedMode, setSelectedMode] = useState<"evaluation" | "demonstration">("evaluation");

  const startRun = trpc.runs.start.useMutation({
    onSuccess: (data) => {
      navigate(`/student/run/${data.runId}`);
    },
    onError: (err) => {
      toast.error(err.message ?? t("Erreur lors du démarrage", "Error starting simulation"));
    },
  });

  function handleStart() {
    const isDemo = isTeacherOrAdmin && selectedMode === "demonstration";
    startRun.mutate({ scenarioId, isDemo });
  }

  return (
    <FioriShell
      title={t("Sélection du mode de simulation", "Simulation Mode Selection")}
      breadcrumbs={[
        { label: t("Scénarios", "Scenarios"), href: "/student/scenarios" },
        { label: t("Mode de simulation", "Simulation Mode") },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        {/* Scenario Header */}
        <div className="bg-white border border-[#d9d9d9] rounded-md p-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0f2a44] rounded-md flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                {t("Scénario sélectionné", "Selected Scenario")}
              </p>
              <h2 className="text-[#0f2a44] font-bold text-base">{scenarioName}</h2>
              {scenarioDifficulty && (
                <span className="text-[10px] text-gray-500 capitalize">{scenarioDifficulty}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t("Mode de simulation :", "Simulation Mode:")}
          </p>

          <div className="space-y-3">
            {/* Evaluation Mode */}
            <button
              onClick={() => setSelectedMode("evaluation")}
              className={`w-full text-left border-2 rounded-md p-4 transition-all ${
                selectedMode === "evaluation"
                  ? "border-[#0070f2] bg-[#f0f7ff]"
                  : "border-[#d9d9d9] bg-white hover:border-[#0070f2]/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  selectedMode === "evaluation" ? "border-[#0070f2]" : "border-[#d9d9d9]"
                }`}>
                  {selectedMode === "evaluation" && (
                    <div className="w-2 h-2 rounded-full bg-[#0070f2]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-[#0070f2]" />
                    <span className="text-sm font-bold text-[#0f2a44]">
                      {t("Mode Évaluation", "Evaluation Mode")}
                    </span>
                    <span className="text-[10px] bg-[#0070f2] text-white px-2 py-0.5 rounded-full font-semibold">
                      {t("PAR DÉFAUT", "DEFAULT")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {t(
                      "Mode officiel avec score et blocage séquentiel. Les points sont calculés, les pénalités s'appliquent, et le flux est obligatoire (PO → GR → SO → GI → CC → Conformité).",
                      "Official mode with score and sequential blocking. Points are calculated, penalties apply, and the flow is mandatory (PO → GR → SO → GI → CC → Compliance)."
                    )}
                    <strong className="text-[#0f2a44]"> {t("Score maximum : 100 points.", "Maximum score: 100 points.")}</strong>
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[#107e3e]">
                      <Zap size={10} /> {t("Score activé", "Score enabled")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#107e3e]">
                      <ShieldCheck size={10} /> {t("Blocage séquentiel", "Sequential blocking")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#107e3e]">
                      <GraduationCap size={10} /> {t("Rapport final", "Final report")}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Demonstration Mode — teacher/admin only */}
            <button
              onClick={() => isTeacherOrAdmin && setSelectedMode("demonstration")}
              disabled={!isTeacherOrAdmin}
              className={`w-full text-left border-2 rounded-md p-4 transition-all ${
                !isTeacherOrAdmin
                  ? "border-[#d9d9d9] bg-[#fafafa] opacity-60 cursor-not-allowed"
                  : selectedMode === "demonstration"
                  ? "border-[#0070f2] bg-[#f0f7ff]"
                  : "border-[#d9d9d9] bg-white hover:border-[#0070f2]/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  selectedMode === "demonstration" && isTeacherOrAdmin ? "border-[#0070f2]" : "border-[#d9d9d9]"
                }`}>
                  {selectedMode === "demonstration" && isTeacherOrAdmin && (
                    <div className="w-2 h-2 rounded-full bg-[#0070f2]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical size={14} className="text-[#5b4b8a]" />
                    <span className="text-sm font-bold text-[#0f2a44]">
                      {t("Mode Démonstration", "Demonstration Mode")}
                    </span>
                    <span className="text-[10px] bg-[#5b4b8a] text-white px-2 py-0.5 rounded-full font-semibold">
                      {t("ENSEIGNANTS", "TEACHERS")}
                    </span>
                    {!isTeacherOrAdmin && (
                      <span className="text-[10px] bg-[#f0f0f0] text-gray-500 px-2 py-0.5 rounded-full">
                        🔒 {t("Réservé", "Restricted")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {t(
                      "Mode pédagogique libre. Aucun score enregistré, aucune pénalité, progression libre entre les étapes. Inclut des explications approfondies et la transparence du backend WMS pour chaque transaction.",
                      "Free pedagogical mode. No score recorded, no penalties, free progression between steps. Includes in-depth explanations and WMS backend transparency for each transaction."
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[#5b4b8a]">
                      <FlaskConical size={10} /> {t("Progression libre", "Free progression")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#5b4b8a]">
                      <BookOpen size={10} /> {t("Explications pédagogiques", "Pedagogical explanations")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      {t("Score non enregistré", "Score not recorded")}
                    </span>
                  </div>
                  {!isTeacherOrAdmin && (
                    <p className="text-[10px] text-[#e9730c] mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={10} /> {t("Accès réservé aux enseignants et administrateurs.", "Access restricted to teachers and administrators.")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Box */}
        {selectedMode === "demonstration" && isTeacherOrAdmin && (
          <div className="bg-[#ede7f6] border border-[#5b4b8a]/20 rounded-md p-4 mb-5">
            <p className="text-xs font-semibold text-[#5b4b8a] mb-1 flex items-center gap-1.5">
              <FlaskConical size={12} /> {t("Mode Démonstration — Informations importantes", "Demonstration Mode — Important Information")}
            </p>
            <ul className="text-xs text-[#5b4b8a]/80 space-y-1">
              <li>• {t("Cette session ne sera ", "This session will ")}<strong>{t("pas comptabilisée", "not be counted")}</strong>{t(" dans les statistiques d'évaluation.", " in evaluation statistics.")}</li>
              <li>• {t("Les étapes peuvent être exécutées dans n'importe quel ordre (avertissements affichés).", "Steps can be executed in any order (warnings displayed).")}</li>
              <li>• {t("Chaque formulaire inclut des explications pédagogiques détaillées et la logique WMS.", "Each form includes detailed pedagogical explanations and WMS logic.")}</li>
              <li>• {t("Idéal pour les présentations en classe ou l'exploration libre du système.", "Ideal for classroom presentations or free system exploration.")}</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-[#0070f2] transition-colors"
          >
            ← {t("Retour aux scénarios", "Back to scenarios")}
          </button>
          <button
            onClick={handleStart}
            disabled={startRun.isPending}
            className={`flex items-center gap-2 text-white text-xs font-bold px-6 py-2.5 rounded-md transition-colors disabled:opacity-50 ${
              selectedMode === "demonstration" && isTeacherOrAdmin
                ? "bg-[#5b4b8a] hover:bg-[#4a3a72]"
                : "bg-[#0070f2] hover:bg-[#0058c7]"
            }`}
          >
            {startRun.isPending ? (
              <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> {t("Démarrage...", "Starting...")}</>
            ) : (
              <><Play size={13} /> {t("Démarrer en mode", "Start in")} {selectedMode === "demonstration" ? t("Démonstration", "Demonstration") : t("Évaluation", "Evaluation")}</>
            )}
          </button>
        </div>
      </div>
    </FioriShell>
  );
}
