/**
 * TEC.LOG — Home Page
 * Design: Industrial-Academic Precision
 * Navy + Amber palette, Space Grotesk headings, IBM Plex Sans body
 * Asymmetric layout with module cards and global FR/EN + Dark mode toggles
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { allModules } from "@/data/modules";
import { useLocation } from "wouter";
import { Moon, Sun, Globe, BookOpen, Clock, ChevronRight, Award, Layers } from "lucide-react";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [, navigate] = useLocation();

  const totalHours = allModules.reduce((s, m) => s + m.durationH, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                TEC.LOG
              </span>
              <span className="hidden sm:inline text-muted-foreground text-xs ml-2">
                Collège de la Concorde
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-secondary transition-colors"
              title={t("Passer en anglais", "Switch to French")}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-xs tracking-widest">
                {lang === "fr" ? "FR" : "EN"}
              </span>
              <ChevronRight className="w-3 h-3 opacity-40" />
              <span className="font-mono text-xs text-muted-foreground">
                {lang === "fr" ? "EN" : "FR"}
              </span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              title={t("Mode sombre", "Dark mode")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, currentColor 39px, currentColor 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, currentColor 39px, currentColor 40px)`,
          }}
        />
        {/* Amber accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4 tracking-wide">
              <Award className="w-3.5 h-3.5" />
              {t("Programme certifiant · 30 heures", "Certification Program · 30 hours")}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {t(
                "Techniques de logistique et gestion d'entrepôt",
                "Logistics Techniques & Warehouse Management"
              )}
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6 max-w-2xl">
              {t(
                "Maîtrisez les opérations WMS, le contrôle des stocks et les indicateurs de performance logistique à travers 5 modules progressifs et des simulations dans le Mini-WMS Concorde.",
                "Master WMS operations, inventory control and logistics performance indicators through 5 progressive modules and simulations in the Mini-WMS Concorde."
              )}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 text-sm">
              {[
                { icon: BookOpen, label: t("5 Modules", "5 Modules"), sub: t("progressifs", "progressive") },
                { icon: Clock, label: `${totalHours}h`, sub: t("de formation", "of training") },
                { icon: Layers, label: "80", sub: t("slides pédagogiques", "pedagogical slides") },
                { icon: Award, label: t("Certification", "Certification"), sub: t("TEC.LOG", "TEC.LOG") },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{label}</div>
                    <div className="text-muted-foreground text-xs">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {t("Modules du programme", "Program Modules")}
          </h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded font-mono">
            {t("Cliquez sur un module pour accéder aux slides", "Click a module to access slides")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {allModules.map((mod) => {
            const title = lang === "fr" ? mod.titleFr : mod.titleEn;
            const desc = lang === "fr" ? mod.descFr : mod.descEn;
            const prereq = lang === "fr" ? mod.prerequisiteFr : mod.prerequisiteEn;
            const unlocks = lang === "fr" ? mod.unlocksFr : mod.unlocksEn;

            return (
              <button
                key={mod.id}
                onClick={() => navigate(`/module/${mod.id}`)}
                className="group text-left rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-200 overflow-hidden hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Color accent bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: mod.color }} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mod.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: mod.color }}>
                            M{mod.id}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {mod.durationH}h · {mod.slides.length} {t("slides", "slides")}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-foreground mt-1 leading-snug"
                          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                          {title}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                    {desc}
                  </p>

                  {/* Footer info */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("Prérequis :", "Prerequisite:")}</span>{" "}
                      {prereq}
                    </div>
                    <div className="text-xs font-medium" style={{ color: mod.color }}>
                      → {unlocks}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── PROGRAM OVERVIEW TABLE ──────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {t("Vue d'ensemble du programme", "Program Overview")}
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">{t("Module", "Module")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden sm:table-cell">{t("Titre", "Title")}</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">{t("Durée", "Duration")}</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden md:table-cell">{t("Slides", "Slides")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide hidden lg:table-cell">{t("Thèmes clés", "Key Topics")}</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">{t("Accès", "Access")}</th>
                </tr>
              </thead>
              <tbody>
                {allModules.map((mod, i) => {
                  const keyTopics: Record<number, { fr: string; en: string }> = {
                    1: { fr: "WMS · ERP · SAP · Flux logistiques", en: "WMS · ERP · SAP · Logistics flows" },
                    2: { fr: "ASN · FIFO/LIFO · SA · Traçabilité lot", en: "ASN · FIFO/LIFO · SA · Lot traceability" },
                    3: { fr: "ROP · Safety Stock · EOQ · MRP · Cycle Count", en: "ROP · Safety Stock · EOQ · MRP · Cycle Count" },
                    4: { fr: "OTIF · Fill Rate · DSI · LPH · Lean · RCA", en: "OTIF · Fill Rate · DSI · LPH · Lean · RCA" },
                    5: { fr: "Simulations · Gestion de crise · Certification", en: "Simulations · Crisis management · Certification" },
                  };
                  return (
                    <tr key={mod.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/30"} hover:bg-secondary/50 transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mod.icon}</span>
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: mod.color }}>
                            M{mod.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-medium text-foreground text-xs">{lang === "fr" ? mod.titleFr : mod.titleEn}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs font-bold text-foreground">{mod.durationH}h</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">{mod.slides.length}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">
                          {lang === "fr" ? keyTopics[mod.id].fr : keyTopics[mod.id].en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/module/${mod.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-80"
                          style={{ backgroundColor: mod.color }}
                        >
                          <BookOpen className="w-3 h-3" />
                          {t("Ouvrir", "Open")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            © 2025 Collège de la Concorde · {t("Programme TEC.LOG", "TEC.LOG Program")}
          </span>
          <span className="font-mono">
            {t("Mini-WMS Concorde · Système pédagogique", "Mini-WMS Concorde · Pedagogical System")}
          </span>
        </div>
      </footer>
    </div>
  );
}
