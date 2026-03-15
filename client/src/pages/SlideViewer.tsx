/**
 * TEC.LOG — Slide Viewer
 * Design: Industrial-Academic Precision
 * Full-screen slide canvas with professor/student mode toggle
 * FR/EN global toggle, dark mode, keyboard navigation
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { getModuleById } from "@/data/modules";
import type { SlideContent } from "@/data/modules";
import {
  ChevronLeft, ChevronRight, Home, Moon, Sun, Globe,
  BookOpen, GraduationCap, Clock, Tag, Lightbulb,
  List, X
} from "lucide-react";

// ── Slide type badge colors ──────────────────────────────────────────────────
const typeColors: Record<string, string> = {
  cover: "bg-slate-700 text-white",
  objectives: "bg-blue-600 text-white",
  concept: "bg-indigo-600 text-white",
  terminology: "bg-purple-600 text-white",
  process: "bg-green-600 text-white",
  comparison: "bg-teal-600 text-white",
  exercise: "bg-orange-500 text-white",
  summary: "bg-slate-600 text-white",
  kpi: "bg-red-600 text-white",
  simulation: "bg-amber-600 text-white",
};

const typeLabels: Record<string, { fr: string; en: string }> = {
  cover: { fr: "Introduction", en: "Introduction" },
  objectives: { fr: "Objectifs", en: "Objectives" },
  concept: { fr: "Concept", en: "Concept" },
  terminology: { fr: "Terminologie", en: "Terminology" },
  process: { fr: "Processus", en: "Process" },
  comparison: { fr: "Comparaison", en: "Comparison" },
  exercise: { fr: "Exercice", en: "Exercise" },
  summary: { fr: "Synthèse", en: "Summary" },
  kpi: { fr: "KPI", en: "KPI" },
  simulation: { fr: "Simulation", en: "Simulation" },
};

// ── Line renderer: detect emoji/section headers ──────────────────────────────
function SlideLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (!trimmed) return <div className="h-2" />;

  // Section header: starts with emoji + uppercase text
  const isSectionHeader = /^[🔷📊📋🎯✅❌🔑🌟💼🏭📦🚚🔄🔢🔍🏆💰📱🌐🎓📞]/.test(trimmed) && trimmed.length < 80;
  // Sub-item: starts with spaces/bullets
  const isSubItem = /^\s{2,}[•·→]/.test(line) || /^\s{3,}/.test(line);
  // Formula/KPI: contains = or ≥ or ≤ or × or √
  const isFormula = /[=≥≤×√÷%]/.test(trimmed) && trimmed.length < 120;

  if (isSectionHeader) {
    return (
      <div className="font-semibold text-foreground text-sm mt-3 mb-1 leading-snug"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {trimmed}
      </div>
    );
  }

  if (isFormula && !isSubItem) {
    return (
      <div className="font-mono text-xs bg-primary/8 dark:bg-primary/15 border border-primary/20 rounded px-2 py-1 my-1 text-foreground">
        {trimmed}
      </div>
    );
  }

  return (
    <div className={`text-xs leading-relaxed ${isSubItem ? "pl-4 text-muted-foreground" : "text-foreground/90"}`}
      style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      {line}
    </div>
  );
}

/// ── Main SlideViewer component ───────────────────────────────────────────────
export default function SlideViewer() {
  const params = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language: lang, setLanguage: setLang, t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const moduleId = parseInt(params.moduleId || "1", 10);

  // ── ALL hooks must be declared before any conditional returns ──────────────
  const [slideIndex, setSlideIndex] = useState(0);
  const [professorMode, setProfessorMode] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const modData = getModuleById(moduleId);

  const goTo = useCallback((idx: number) => {
    if (!modData) return;
    const clamped = Math.max(0, Math.min(idx, modData.slides.length - 1));
    setSlideIndex(clamped);
    setAnimKey(k => k + 1);
    setShowNav(false);
  }, [modData]);

  const goNext = useCallback(() => goTo(slideIndex + 1), [goTo, slideIndex]);
  const goPrev = useCallback(() => goTo(slideIndex - 1), [goTo, slideIndex]);

  // ── Auth guard: redirect to login if not authenticated ──────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, authLoading]);

  // Keyboard navigation
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        navigate("/student/scenarios");
      } else if (e.key === "p" || e.key === "P") {
        setProfessorMode(m => !m);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, navigate, isAuthenticated, authLoading]);

  // ── Conditional returns AFTER all hooks ────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const mod = modData;
  const slide: SlideContent | undefined = mod?.slides[slideIndex];
  const totalSlides = mod?.slides.length ?? 0;

  if (!mod || !slide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("Module introuvable", "Module not found")}</p>
          <button onClick={() => navigate("/student/scenarios")} className="text-primary hover:underline text-sm">
            {t("Retour à l'accueil", "Back to home")}
          </button>
        </div>
      </div>
    );
  }

  const title = lang === "FR" ? slide.titleFr : slide.titleEn;
  const subtitle = lang === "FR" ? slide.subtitleFr : slide.subtitleEn;
  const body = lang === "FR" ? slide.bodyFr : slide.bodyEn;
  const notes = lang === "FR" ? slide.notesFr : slide.notesEn;
  const modTitle = lang === "FR" ? mod.titleFr : mod.titleEn;
  const typeLabel = typeLabels[slide.type]?.[lang.toLowerCase() as "fr" | "en"] ?? slide.type;
  const progress = ((slideIndex + 1) / totalSlides) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm z-30">
        <div className="flex items-center gap-2 px-3 h-12">
          {/* Back */}
          <button onClick={() => navigate("/student/scenarios")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded hover:bg-secondary">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("Accueil", "Home")}</span>
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Module badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
              style={{ backgroundColor: mod.color }}>
              M{mod.id}
            </span>
            <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-48">{modTitle}</span>
          </div>

          <div className="flex-1" />

          {/* Slide counter */}
          <span className="font-mono text-xs text-muted-foreground hidden sm:block">
            {slideIndex + 1} / {totalSlides}
          </span>

          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          {/* Professor mode toggle */}
          <button
            onClick={() => setProfessorMode(m => !m)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              professorMode
                ? "bg-amber-500 text-white"
                : "border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            title={t("Mode Professeur (P)", "Professor Mode (P)")}
          >
            {professorMode ? <GraduationCap className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {professorMode ? t("Prof", "Prof") : t("Étudiant", "Student")}
            </span>
          </button>

          {/* Slide list toggle */}
          <button
            onClick={() => setShowNav(n => !n)}
            className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-secondary transition-colors"
            title={t("Liste des slides", "Slide list")}
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "FR" ? "EN" : "FR")}
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-border text-xs font-mono font-bold hover:bg-secondary transition-colors"
          >
            <Globe className="w-3 h-3" />
            {lang === "FR" ? "FR" : "EN"}
          </button>

          {/* Dark mode */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-secondary transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: mod.color }} />
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── SLIDE NAV PANEL (overlay) ─────────────────────────────────── */}
        {showNav && (
          <div className="absolute inset-0 z-40 flex">
            <div className="w-72 sm:w-80 bg-card border-r border-border flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <span className="font-semibold text-sm text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  {t("Slides du module", "Module Slides")}
                </span>
                <button onClick={() => setShowNav(false)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {mod.slides.map((s, i) => {
                  const sTitle = lang === "FR" ? s.titleFr : s.titleEn;
                  const sType = typeLabels[s.type]?.[lang.toLowerCase() as "fr" | "en"] ?? s.type;
                  return (
                    <button
                      key={s.id}
                      onClick={() => goTo(i)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-secondary transition-colors ${
                        i === slideIndex ? "bg-secondary border-l-2" : ""
                      }`}
                      style={i === slideIndex ? { borderLeftColor: mod.color } : {}}
                    >
                      <span className="font-mono text-xs text-muted-foreground flex-shrink-0 mt-0.5 w-6 text-right">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground leading-snug truncate">{sTitle}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColors[s.type] || "bg-secondary text-foreground"}`}>
                            {sType}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{s.timingMin}min</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setShowNav(false)} />
          </div>
        )}

        {/* ── SLIDE CANVAS ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div key={animKey} className="slide-enter min-h-full p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">

              {/* Slide header */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${typeColors[slide.type] || "bg-secondary text-foreground"}`}>
                    {typeLabel}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {t("Slide", "Slide")} {slideIndex + 1}/{totalSlides}
                  </span>
                  {slide.timingMin > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {slide.timingMin} min
                    </span>
                  )}
                </div>

                {/* Accent bar */}
                <div className="h-0.5 w-12 rounded mb-3" style={{ backgroundColor: mod.color }} />

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>

              {/* Slide body */}
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-4">
                <div className="space-y-0.5">
                  {body.map((line, i) => (
                    <SlideLine key={i} line={line} />
                  ))}
                </div>
              </div>

              {/* Highlight badge */}
              {slide.highlight && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg border mb-4"
                  style={{ borderColor: mod.color + "40", backgroundColor: mod.color + "10" }}>
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: mod.color }} />
                  <span className="highlight-badge text-foreground text-xs">{slide.highlight}</span>
                </div>
              )}

              {/* Tags */}
              {slide.tags && slide.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {slide.tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Professor Notes Panel */}
              {professorMode && notes && (
                <div className="notes-panel rounded-r-xl p-4 sm:p-5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      {t("Notes du professeur", "Professor Notes")}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">
                      ~{slide.timingMin} min {t("à l'oral", "speaking")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{notes}</p>
                </div>
              )}

              {/* Spacer for nav buttons */}
              <div className="h-16" />
            </div>
          </div>

          {/* ── NAVIGATION BAR ─────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              {/* Prev */}
              <button
                onClick={goPrev}
                disabled={slideIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Précédent", "Previous")}</span>
              </button>

              {/* Dot indicators (max 16 visible) */}
              <div className="flex items-center gap-1 flex-wrap justify-center max-w-xs">
                {mod.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all ${
                      i === slideIndex ? "w-5 h-2" : "w-2 h-2 hover:opacity-70"
                    }`}
                    style={{
                      backgroundColor: i === slideIndex ? mod.color : (i < slideIndex ? mod.color + "60" : "var(--border)"),
                    }}
                  />
                ))}
              </div>

              {/* Next */}
              <button
                onClick={goNext}
                disabled={slideIndex === totalSlides - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white"
                style={{ backgroundColor: slideIndex === totalSlides - 1 ? "var(--muted)" : mod.color }}
              >
                <span className="hidden sm:inline">{t("Suivant", "Next")}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
