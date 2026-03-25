import FioriShell from "@/components/FioriShell";
import { useLocation } from "wouter";
import { BookOpen, Layers, TrendingUp, BarChart2, FileText, Presentation, Clock, ChevronRight, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const modules = [
  {
    id: 1,
    icon: BookOpen,
    color: "#0070f2",
    bg: "bg-blue-50",
    border: "border-blue-200",
    titleFr: "Module 1 — Fondements ERP/WMS",
    titleEn: "Module 1 — ERP/WMS Foundations",
    descFr: "Introduction aux systèmes WMS/ERP, flux logistiques, transactions SAP et cycle opérationnel complet.",
    descEn: "Introduction to WMS/ERP systems, logistics flows, SAP transactions and complete operational cycle.",
    slides: 16,
    duration: "4h",
    topics: ["WMS · ERP · SAP", "PO · GR · SO · GI", "Cycle Count"],
    topicsEn: ["WMS · ERP · SAP", "PO · GR · SO · GI", "Cycle Count"],
    badge: "M1",
    minScore: 0, // always unlocked
  },
  {
    id: 2,
    icon: Layers,
    color: "#1565c0",
    bg: "bg-blue-50",
    border: "border-blue-300",
    titleFr: "Module 2 — Exécution d'entrepôt",
    titleEn: "Module 2 — Warehouse Execution",
    descFr: "Gestion des emplacements, règles FIFO/LIFO, capacité des bins et traçabilité des lots.",
    descEn: "Location management, FIFO/LIFO rules, bin capacity and lot traceability.",
    slides: 16,
    duration: "5h",
    topics: ["ASN · FIFO/LIFO", "Capacité bins", "Traçabilité"],
    topicsEn: ["ASN · FIFO/LIFO", "Bin capacity", "Traceability"],
    badge: "M2",
    minScore: 60,
  },
  {
    id: 3,
    icon: TrendingUp,
    color: "#107e3e",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleFr: "Module 3 — Contrôle des stocks",
    titleEn: "Module 3 — Inventory Control",
    descFr: "Inventaire cyclique, ajustements de stock, ROP, stock de sécurité et EOQ.",
    descEn: "Cycle counting, stock adjustments, ROP, safety stock and EOQ.",
    slides: 16,
    duration: "5h",
    topics: ["ROP · Safety Stock", "EOQ · MRP", "Cycle Count"],
    topicsEn: ["ROP · Safety Stock", "EOQ · MRP", "Cycle Count"],
    badge: "M3",
    minScore: 60,
  },
  {
    id: 4,
    icon: BarChart2,
    color: "#e9730c",
    bg: "bg-orange-50",
    border: "border-orange-200",
    titleFr: "Module 4 — Indicateurs de performance",
    titleEn: "Module 4 — Performance Indicators",
    descFr: "KPIs logistiques : OTIF, Fill Rate, DSI, LPH. Analyse Lean et Root Cause Analysis.",
    descEn: "Logistics KPIs: OTIF, Fill Rate, DSI, LPH. Lean analysis and Root Cause Analysis.",
    slides: 16,
    duration: "5h",
    topics: ["OTIF · Fill Rate", "DSI · LPH", "Lean · RCA"],
    topicsEn: ["OTIF · Fill Rate", "DSI · LPH", "Lean · RCA"],
    badge: "M4",
    minScore: 70,
  },
  {
    id: 5,
    icon: FileText,
    color: "#7b1fa2",
    bg: "bg-purple-50",
    border: "border-purple-200",
    titleFr: "Module 5 — Simulation intégrée",
    titleEn: "Module 5 — Integrated Simulation",
    descFr: "Simulation opérationnelle complète intégrant tous les modules. Certification finale TEC.LOG.",
    descEn: "Full operational simulation integrating all modules. TEC.LOG final certification.",
    slides: 16,
    duration: "6h",
    topics: ["Simulation · Crise", "Gestion intégrée", "Certification"],
    topicsEn: ["Simulation · Crisis", "Integrated mgmt", "Certification"],
    badge: "M5",
    minScore: 70,
  },
];

export default function StudentSlidesHub() {
  const [, navigate] = useLocation();
  const { language: lang, t } = useLanguage();
  const isModuleUnlocked = (moduleId: number) => {
    // All modules accessible for slides (no lock for reading slides)
    return true;
  };

  return (
    <FioriShell
      title={t("Mes Slides — TEC.LOG", "My Slides — TEC.LOG")}
      breadcrumbs={[
        { label: t("Accueil", "Home"), href: "/" },
        { label: t("Slides", "Slides") },
      ]}
    >
      {/* Header */}
      <div className="mb-5 p-5 rounded-lg bg-gradient-to-r from-[#0f2a44] to-[#1a3f6f] text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <Presentation size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {t("Slides pédagogiques — Programme TEC.LOG", "Pedagogical Slides — TEC.LOG Program")}
            </h1>
            <p className="text-sm text-white/70 mt-0.5">
              {t(
                "5 modules · 80 slides · Disponibles en français et en anglais",
                "5 modules · 80 slides · Available in French and English"
              )}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-5 text-center">
          <div>
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-white/60">{t("Modules", "Modules")}</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div>
            <p className="text-2xl font-bold">80</p>
            <p className="text-xs text-white/60">{t("Slides", "Slides")}</p>
          </div>
        </div>
      </div>

      {/* Info tip */}
      <div className="mb-5 p-3 rounded-md bg-blue-50 border border-blue-200 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-[#0070f2] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-bold">i</span>
        </div>
        <p className="text-xs text-blue-800">
          {t(
            "Consultez les slides avant de démarrer une simulation. Utilisez ← → pour naviguer et FR/EN pour changer la langue. Les modules verrouillés nécessitent de réussir le module précédent (score ≥ 60 ou 70).",
            "Review slides before starting a simulation. Use ← → to navigate and FR/EN to change language. Locked modules require passing the previous module (score ≥ 60 or 70)."
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
          const unlocked = isModuleUnlocked(mod.id);

          return (
            <div
              key={mod.id}
              className={`group rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                unlocked
                  ? `${mod.border} ${mod.bg} hover:shadow-md hover:-translate-y-0.5`
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ backgroundColor: unlocked ? mod.color : "#d1d5db" }} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: unlocked ? `${mod.color}20` : "#f3f4f6" }}
                    >
                      {unlocked ? (
                        <Icon size={20} style={{ color: mod.color }} />
                      ) : (
                        <Lock size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: unlocked ? mod.color : "#9ca3af" }}
                        >
                          {mod.badge}
                        </span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock size={9} />
                          {mod.duration} · {mod.slides} {t("slides", "slides")}
                        </span>
                      </div>
                      <h3 className={`text-sm font-bold leading-snug ${unlocked ? "text-[#0f2a44]" : "text-gray-400"}`}>
                        {title}
                      </h3>
                    </div>
                  </div>
                  {unlocked ? (
                    <ChevronRight
                      size={16}
                      className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                    />
                  ) : (
                    <Lock size={14} className="text-gray-300 shrink-0 mt-1" />
                  )}
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${unlocked ? "text-gray-600" : "text-gray-400"}`}>
                  {desc}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border"
                      style={{
                        borderColor: unlocked ? `${mod.color}40` : "#e5e7eb",
                        color: unlocked ? mod.color : "#9ca3af",
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                {unlocked ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(`/student/slides/${mod.id}`)}
                      className="flex items-center justify-center gap-2 py-2 rounded-md text-white text-xs font-semibold transition-opacity hover:opacity-90 w-full"
                      style={{ backgroundColor: mod.color }}
                    >
                      <Presentation size={13} />
                      {t("Ouvrir les slides", "Open slides")}
                    </button>
                    <button
                      onClick={() => navigate(`/student/quiz/${mod.id}`)}
                      className="flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold border-2 transition-colors hover:opacity-80 w-full"
                      style={{ borderColor: mod.color, color: mod.color, backgroundColor: `${mod.color}10` }}
                    >
                      ✓ {t("Faire le quiz", "Take the quiz")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-md bg-gray-100 text-gray-400 text-xs font-semibold">
                    <Lock size={13} />
                    {t(`Score ≥ ${mod.minScore} requis au module précédent`, `Score ≥ ${mod.minScore} required on previous module`)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcuts */}
      <div className="mt-6 p-4 rounded-md border border-[#d9d9d9] bg-white flex items-center gap-4">
        <div className="w-8 h-8 rounded-md bg-[#e8f0fe] flex items-center justify-center shrink-0">
          <Presentation size={16} className="text-[#0070f2]" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#0f2a44]">
            {t("Raccourcis clavier dans le SlideViewer", "Keyboard shortcuts in SlideViewer")}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {t(
              "← → : naviguer entre les slides · Échap : retour à cette page · FR/EN : changer la langue",
              "← → : navigate slides · Esc : back to this page · FR/EN : change language"
            )}
          </p>
        </div>
      </div>
    </FioriShell>
  );
}
