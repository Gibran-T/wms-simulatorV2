/**
 * QuizPage — Module Quiz Experience
 * Design: Industrial-Academic Precision (TEC.LOG palette)
 * Features: question-by-question flow, immediate feedback, score gate (60%), retry
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";

type QuizState = "loading" | "intro" | "question" | "feedback" | "results";

const MODULE_COLORS: Record<number, string> = {
  1: "#1E3A5F",
  2: "#2563EB",
  3: "#16A34A",
  4: "#D97706",
  5: "#7C3AED",
};

const DIFFICULTY_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  easy:   { fr: "Facile",    en: "Easy",   color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  medium: { fr: "Moyen",     en: "Medium", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  hard:   { fr: "Difficile", en: "Hard",   color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

export default function QuizPage() {
  const { moduleId: moduleIdStr } = useParams<{ moduleId: string }>();
  const moduleId = parseInt(moduleIdStr || "1");
  const [, navigate] = useLocation();
  const { language, t } = useLanguage();
  const lang = language === "FR" ? "fr" : "en";

  const [quizState, setQuizState] = useState<QuizState>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [immediateResult, setImmediateResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanationFr: string;
    explanationEn: string;
  } | null>(null);
  const [results, setResults] = useState<{
    score: number; passed: boolean; correct: number; total: number;
    passingScore: number;
    feedback: Array<{ questionId: number; chosen: number; correctIndex: number; isCorrect: boolean; explanationFr: string; explanationEn: string }>;
  } | null>(null);

  const { data: quiz, isLoading } = trpc.quiz.getByModule.useQuery({ moduleId });
  const { data: bestAttempt } = trpc.quiz.getBestAttempt.useQuery({ moduleId });
  const submitMutation = trpc.quiz.submit.useMutation();
  const checkAnswerMutation = trpc.quiz.checkAnswer.useMutation();

  const color = MODULE_COLORS[moduleId] || "#1E3A5F";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("Chargement du quiz...", "Loading quiz...")}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">{t("Quiz non disponible", "Quiz not available")}</h2>
            <p className="text-muted-foreground mb-4">{t("Le quiz pour ce module n'est pas encore disponible.", "The quiz for this module is not yet available.")}</p>
            <Button onClick={() => navigate("/student")}>{t("Retour au tableau de bord", "Back to dashboard")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper: parse options that may arrive as JSON strings from the API
  const parseOpts = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
    return [];
  };
  const questions = quiz.questions;
  const currentQuestion = questions[currentQ];

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (quizState === "intro") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Back */}
          <button onClick={() => navigate("/student")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("Retour au tableau de bord", "Back to dashboard")}
          </button>

          {/* Header accent */}
          <div className="h-1.5 w-full rounded-full mb-8" style={{ backgroundColor: color }} />

          <Card className="border-border shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: color }}>
                  M{moduleId}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{t("Évaluation formative", "Formative Assessment")}</p>
                  <CardTitle className="text-lg leading-tight">
                    {lang === "fr" ? quiz.titleFr : quiz.titleEn}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t("Questions", "Questions"), value: questions.length },
                  { label: t("Seuil de réussite", "Passing score"), value: `${quiz.passingScore}%` },
                  { label: t("Tentatives", "Attempts"), value: t("Illimitées", "Unlimited") },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 rounded-lg bg-secondary/50">
                    <div className="text-xl font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Best attempt */}
              {bestAttempt && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${bestAttempt.passed ? "border-green-500/30 bg-green-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                  {bestAttempt.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {bestAttempt.passed
                        ? t("Meilleur score : ", "Best score: ")
                        : t("Dernier score : ", "Last score: ")}
                      <span className="font-bold">{bestAttempt.score}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bestAttempt.passed
                        ? t("Quiz réussi — vous pouvez refaire pour améliorer votre score", "Quiz passed — you can retake to improve your score")
                        : t(`Score insuffisant — minimum requis : ${quiz.passingScore}%`, `Insufficient score — minimum required: ${quiz.passingScore}%`)}
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{t("Lisez chaque question attentivement avant de répondre.", "Read each question carefully before answering.")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{t("Une explication pédagogique est fournie après chaque réponse.", "A pedagogical explanation is provided after each answer.")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>{t("Vous pouvez refaire le quiz autant de fois que nécessaire.", "You can retake the quiz as many times as needed.")}</span>
                </div>
              </div>

              <Button
                className="w-full text-white font-semibold py-3"
                style={{ backgroundColor: color }}
                onClick={() => {
                  setAnswers([]);
                  setCurrentQ(0);
                  setSelectedOption(null);
                  setShowFeedback(false);
                  setResults(null);
                  setQuizState("question");
                }}
              >
                {bestAttempt ? t("Recommencer le quiz", "Retake quiz") : t("Commencer le quiz", "Start quiz")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────────────────────────
  if (quizState === "question" && currentQuestion) {
    const options: string[] = lang === "fr"
      ? parseOpts(currentQuestion.optionsFr)
      : parseOpts(currentQuestion.optionsEn);
    const question = lang === "fr" ? currentQuestion.questionFr : currentQuestion.questionEn;
    const difficulty = DIFFICULTY_LABELS[currentQuestion.difficulty] || DIFFICULTY_LABELS.medium;
    const progress = ((currentQ) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{t(`Question ${currentQ + 1} sur ${questions.length}`, `Question ${currentQ + 1} of ${questions.length}`)}</span>
              <Badge className={difficulty.color}>{lang === "fr" ? difficulty.fr : difficulty.en}</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="border-border shadow-md">
            <CardContent className="pt-6 pb-4">
              {/* Question */}
              <h2 className="text-base font-semibold text-foreground mb-6 leading-relaxed">
                {question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {options.map((option, idx) => {
                  let optionClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-150 text-sm ";
                    if (!showFeedback) {
                    optionClass += selectedOption === idx
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border hover:border-primary/50 hover:bg-secondary/50 text-foreground cursor-pointer";
                  } else if (immediateResult) {
                    // Show correct/incorrect with color coding
                    if (idx === immediateResult.correctIndex) {
                      optionClass += "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 font-medium";
                    } else if (idx === selectedOption && !immediateResult.isCorrect) {
                      optionClass += "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 font-medium";
                    } else {
                      optionClass += "border-border text-muted-foreground opacity-60";
                    }
                  } else {
                    if (idx === selectedOption) {
                      optionClass += "border-primary bg-primary/10 text-foreground font-medium";
                    } else {
                      optionClass += "border-border text-muted-foreground";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={optionClass}
                      disabled={showFeedback}
                      onClick={() => setSelectedOption(idx)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: selectedOption === idx && !showFeedback ? color : undefined, color: selectedOption === idx && !showFeedback ? "white" : undefined }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="leading-relaxed">{option}</span>
                        {showFeedback && immediateResult && idx === immediateResult.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto mt-0.5" />
                        )}
                        {showFeedback && immediateResult && idx === selectedOption && !immediateResult.isCorrect && (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Submit / Next */}
              <div className="mt-6">
                {!showFeedback ? (
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: color }}
                    disabled={selectedOption === null || checkAnswerMutation.isPending}
                    onClick={async () => {
                      if (selectedOption === null) return;
                      try {
                        const result = await checkAnswerMutation.mutateAsync({
                          moduleId,
                          questionIndex: currentQ,
                          chosenIndex: selectedOption,
                        });
                        setImmediateResult(result);
                        setShowFeedback(true);
                      } catch (e) {
                        // Fallback: show feedback without server result
                        setShowFeedback(true);
                      }
                    }}
                  >
                    {checkAnswerMutation.isPending
                      ? t("Vérification...", "Checking...")
                      : t("Valider ma réponse", "Submit answer")}
                  </Button>
                ) : (
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: color }}
                    onClick={async () => {
                      const newAnswers = [...answers, selectedOption!];
                      setAnswers(newAnswers);

                      if (currentQ + 1 < questions.length) {
                        setCurrentQ(currentQ + 1);
                        setSelectedOption(null);
                        setShowFeedback(false);
                        setImmediateResult(null);
                      } else {
                        // Submit all answers
                        try {
                          const res = await submitMutation.mutateAsync({ moduleId, answers: newAnswers });
                          setResults(res);
                          setQuizState("results");
                        } catch (e) {
                          console.error("Quiz submit error:", e);
                        }
                      }
                    }}
                  >
                    {currentQ + 1 < questions.length
                      ? t("Question suivante", "Next question")
                      : t("Voir mes résultats", "See my results")}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feedback panel */}
          {showFeedback && (
            <Card className={`mt-4 border-2 ${immediateResult?.isCorrect ? 'border-green-500/50 bg-green-500/5' : immediateResult ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {immediateResult?.isCorrect
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    : immediateResult
                      ? <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      : <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${immediateResult?.isCorrect ? 'text-green-700 dark:text-green-300' : immediateResult ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                      {immediateResult?.isCorrect
                        ? t("✅ Bonne réponse !", "✅ Correct!")
                        : immediateResult
                          ? t("❌ Réponse incorrecte", "❌ Incorrect answer")
                          : t("Voici l'explication pédagogique :", "Here is the pedagogical explanation:")
                      }
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {immediateResult
                        ? (lang === 'fr' ? immediateResult.explanationFr : immediateResult.explanationEn)
                        : t(
                        "L'explication complète sera affichée dans les résultats finaux avec la bonne réponse.",
                        "The complete explanation will be shown in the final results with the correct answer."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  if (quizState === "results" && results) {
    const passed = results.passed;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Result header */}
          <Card className={`border-2 mb-6 ${passed ? "border-green-500/50" : "border-amber-500/50"}`}>
            <CardContent className="pt-6 pb-6 text-center">
              {passed ? (
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              ) : (
                <RotateCcw className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {passed ? t("Quiz réussi !", "Quiz passed!") : t("Continuez vos efforts !", "Keep trying!")}
              </h2>
              <p className="text-4xl font-bold my-3" style={{ color }}>
                {results.score}%
              </p>
              <p className="text-sm text-muted-foreground">
                {t(`${results.correct} bonne(s) réponse(s) sur ${results.total}`, `${results.correct} correct answer(s) out of ${results.total}`)}
                {" · "}
                {t(`Seuil : ${results.passingScore}%`, `Threshold: ${results.passingScore}%`)}
              </p>
              {!passed && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  {t(`Il vous manque ${results.passingScore - results.score}% pour réussir. Révisez les explications ci-dessous et réessayez.`,
                    `You need ${results.passingScore - results.score}% more to pass. Review the explanations below and try again.`)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Per-question review */}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("Révision par question", "Question review")}
          </h3>
          <div className="space-y-3 mb-8">
            {results.feedback.map((fb, i) => {
              const q = questions[i];
              const opts: string[] = lang === "fr" ? parseOpts(q.optionsFr) : parseOpts(q.optionsEn);
              return (
                <Card key={fb.questionId} className={`border ${fb.isCorrect ? "border-green-500/30" : "border-red-500/30"}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-2 mb-2">
                      {fb.isCorrect
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {lang === "fr" ? q.questionFr : q.questionEn}
                      </p>
                    </div>
                    {!fb.isCorrect && (
                      <div className="ml-6 space-y-1 text-xs">
                        <p className="text-red-600 dark:text-red-400">
                          {t("Votre réponse : ", "Your answer: ")}<span className="font-medium">{opts[fb.chosen]}</span>
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          {t("Bonne réponse : ", "Correct answer: ")}<span className="font-medium">{opts[fb.correctIndex]}</span>
                        </p>
                      </div>
                    )}
                    <div className="ml-6 mt-2 flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lang === "fr" ? fb.explanationFr : fb.explanationEn}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setAnswers([]);
                setCurrentQ(0);
                setSelectedOption(null);
                setShowFeedback(false);
                setResults(null);
                setQuizState("intro");
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("Recommencer", "Retake")}
            </Button>
            <Button
              className="flex-1 text-white"
              style={{ backgroundColor: color }}
              onClick={() => navigate("/student")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Tableau de bord", "Dashboard")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
