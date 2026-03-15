import FioriShell from "@/components/FioriShell";
import { useLocation } from "wouter";
import { BookOpen, Layers, TrendingUp, BarChart2, FileText, Presentation, Clock, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const modules = [
  {
    id: 1,
    icon: BookOpen,
    color: "#0070f2",
    titleFr: "Module 1 — Fondements ERP/WMS",
    titleEn: "Module 1 — ERP/WMS Foundations",
    descFr: "Introduction aux systèmes WMS/ERP, flux logistiques, transactions SAP (ME21N, MIGO, VA01, VL02N) et cycle opérationnel complet.",
    descEn: "Introduction to WMS/ERP systems, logistics flows, SAP transactions (ME21N, MIGO, VA01, VL02N) and complete operational cycle.",
    slides: 16,
    duration: "4h",
    topics: ["WMS · ERP · SAP", "Flux logistiques", "Transactions PO/GR/SO/GI"],
    topicsEn: ["WMS · ERP · SAP", "Logistics flows", "PO/GR/SO/GI transactions"],
    badge: "M1",
  },
  {
    id: 2,
    icon: Layers,
    color: "#1565c0",
    titleFr: "Module 2 — Exécution d'entrepôt",
    titleEn: "Module 2 — Warehouse Execution",
    descFr: "Gestion des emplacements, règles de rangement FIFO/LIFO, capacité des bins, précision d'inventaire et traçabilité des lots.",
    descEn: "Location management, FIFO/LIFO putaway rules, bin capacity, inventory accuracy and lot traceability.",
    slides: 16,
    duration: "5h",
    topics: ["ASN · FIFO/LIFO", "Capacité bins", "Traçabilité lot"],
    topicsEn: ["ASN · FIFO/LIFO", "Bin capacity", "Lot traceability"],
    badge: "M2",
  },
  {
    id: 3,
    icon: TrendingUp,
    color: "#107e3e",
    titleFr: "Module 3 — Contrôle des stocks",
    titleEn: "Module 3 — Inventory Control",
    descFr: "Inventaire cyclique, calcul des écarts, ajustements de stock, point de réapprovisionnement (ROP), stock de sécurité et EOQ.",
    descEn: "Cycle counting, variance calculation, stock adjustments, reorder point (ROP), safety stock and EOQ.",
    slides: 16,
    duration: "5h",
    topics: ["ROP · Safety Stock · EOQ", "MRP · Cycle Count", "Ajustements"],
    topicsEn: ["ROP · Safety Stock · EOQ", "MRP · Cycle Count", "Adjustments"],
    badge: "M3",
  },
  {
    id: 4,
    icon: BarChart2,
    color: "#e9730c",
    titleFr: "Module 4 — Indicateurs de performance",
    titleEn: "Module 4 — Performance Indicators",
    descFr: "KPIs logistiques : OTIF, Fill Rate, DSI, LPH, taux d'erreur. Analyse Lean, Root Cause Analysis et tableaux de bord.",
    descEn: "Logistics KPIs: OTIF, Fill Rate, DSI, LPH, error rate. Lean analysis, Root Cause Analysis and dashboards.",
    slides: 16,
    duration: "5h",
    topics: ["OTIF · Fill Rate · DSI", "LPH · Lean · RCA", "Tableaux de bord"],
    topicsEn: ["OTIF · Fill Rate · DSI", "LPH · Lean · RCA", "Dashboards"],
    badge: "M4",
  },
  {
    id: 5,
    icon: FileText,
    color: "#7b1fa2",
    titleFr: "Module 5 — Simulation intégrée",
    titleEn: "Module 5 — Integrated Simulation",
    descFr: "Simulation opérationnelle complète intégrant tous les modules. Gestion de crise logistique, scénarios réels et certification finale.",
    descEn: "Full operational simulation integrating all modules. Logistics crisis management, real scenarios and final certification.",
    slides: 16,
    duration: "6h",
    topics: ["Simulations · Crise", "Gestion intégrée", "Certification TEC.LOG"],
    topicsEn: ["Simulations · Crisis", "Integrated management", "TEC.LOG Certification"],
    badge: "M5",
  },
];

export default function TeacherSlidesHub() {
  const [, navigate] = useLocation();
  const { language: lang, t } = useLanguage();

  return (
    <FioriShell
      title={t("Bibliothèque de Slides — TEC.LOG", "Slide Library — TEC.LOG")}
      breadcrumbs={[
        { label: t("Tableau de bord", "Dashboard"), href: "/teacher" },
        { label: t("Slides", "Slides") },
      ]}
    >
      {/* Header */}
      <div className="mb-6 p-5 rounded-lg bg-primary text-primary-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <Presentation size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {t("Programme TEC.LOG — Slides Pédagogiques", "TEC.LOG Program — Pedagogical Slides")}
            </h1>
            <p className="text-sm text-primary-foreground/70 mt-0.5">
              {t(
                "5 modules · 80 slides bilingues · Mode Professeur avec notes de cours",
                "5 modules · 80 bilingual slides · Professor Mode with lecture notes"
              )}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-primary-foreground/60">{t("Modules", "Modules")}</p>
          </div>
          <div className="w-px h-10 bg-primary-foreground/20" />
          <div>
            <p className="text-2xl font-bold">80</p>
            <p className="text-xs text-primary-foreground/60">{t("Slides", "Slides")}</p>
          </div>
          <div className="w-px h-10 bg-primary-foreground/20" />
          <div>
            <p className="text-2xl font-bold">25h</p>
            <p className="text-xs text-primary-foreground/60">{t("Formation", "Training")}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-5 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-bold">i</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t(
            "Cliquez sur un module pour ouvrir les slides en mode Professeur. Utilisez la touche P pour afficher/masquer les notes de cours. Les slides sont disponibles en français et en anglais via le bouton FR/EN.",
            "Click a module to open slides in Professor Mode. Use the P key to show/hide lecture notes. Slides are available in French and English via the FR/EN button."
          )}
        </p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const title = lang === "FR" ? mod.titleFr : mod.titleEn;
          const desc = lang === "FR" ? mod.descFr : mod.descEn;
          const topics = lang === "FR" ? mod.topics : mod.topicsEn;

          return (
            <button
              key={mod.id}
              onClick={() => navigate(`/student/slides/${mod.id}`)}
              className="group text-left rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ backgroundColor: mod.color }} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${mod.color}20` }}>
                      <Icon size={20} style={{ color: mod.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: mod.color }}
                        >
                          {mod.badge}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={9} />
                          {mod.duration} · {mod.slides} {t("slides", "slides")}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug">{title}</h3>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                  />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{desc}</p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary border border-border"
                      style={{ color: mod.color }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div
                  className="flex items-center justify-center gap-2 py-2 rounded-md text-white text-xs font-semibold transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: mod.color }}
                >
                  <Presentation size={13} />
                  {t("Ouvrir les slides", "Open slides")}
                </div>
              </div>
            </button>
          );
        })}

        {/* Quick access card — all modules */}
        <div className="rounded-lg border-2 border-dashed border-border bg-secondary/30 p-5 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Presentation size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("Vue d'ensemble", "Overview")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "Accédez directement à un slide spécifique via la liste des slides dans chaque module.",
                "Access a specific slide directly via the slide list in each module."
              )}
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full mt-1">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => navigate(`/student/slides/${mod.id}`)}
                className="py-1.5 rounded text-white text-[10px] font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: mod.color }}
              >
                M{mod.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tip */}
      <div className="mt-6 p-4 rounded-md border border-border bg-card flex items-center gap-4">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Presentation size={16} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">
            {t("Raccourcis clavier dans le SlideViewer", "Keyboard shortcuts in SlideViewer")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t(
              "← → : naviguer entre les slides · P : mode Professeur (notes) · Échap : retour à la liste · FR/EN : changer la langue",
              "← → : navigate slides · P : Professor mode (notes) · Esc : back to list · FR/EN : change language"
            )}
          </p>
        </div>
      </div>
    </FioriShell>
  );
}
