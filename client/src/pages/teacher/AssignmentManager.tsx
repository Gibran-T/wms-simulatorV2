import FioriShell from "@/components/FioriShell";
import { trpc } from "@/lib/trpc";
import { ClipboardList } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AssignmentManager() {
  const { t, language } = useLanguage();
  const { data: assignments } = trpc.assignments.all.useQuery();
  const { data: scenarios } = trpc.scenarios.list.useQuery();
  const { data: cohorts } = trpc.cohorts.list.useQuery();

  const scenarioMap = Object.fromEntries((scenarios ?? []).map((s: any) => [s.id, s.name]));
  const cohortMap = Object.fromEntries((cohorts ?? []).map((c: any) => [c.id, c.name]));

  return (
    <FioriShell
      title={t("Gestion des Devoirs", "Assignment Management")}
      breadcrumbs={[{ label: t("Tableau de bord", "Dashboard"), href: "/teacher" }, { label: t("Devoirs", "Assignments") }]}
    >
      <div className="bg-white border border-[#d9d9d9] rounded-md">
        <div className="px-5 py-3 border-b border-[#ededed]">
          <p className="text-xs font-semibold text-[#0f2a44] flex items-center gap-2">
            <ClipboardList size={13} /> {t("Devoirs assignés", "Assigned tasks")} ({assignments?.length ?? 0})
          </p>
        </div>
        <div className="divide-y divide-[#ededed]">
          {assignments?.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-xs">
              <ClipboardList size={28} className="mx-auto mb-3 opacity-40" />
              {t("Aucun devoir assigné. Allez dans Scénarios pour assigner.", "No assignments yet. Go to Scenarios to assign one.")}
            </div>
          )}
          {assignments?.map((item: any) => {
            const a = item.assignment ?? item;
            const scenarioName = item.scenario?.name ?? scenarioMap[a.scenarioId] ?? `${t("Scénario", "Scenario")} #${a.scenarioId}`;
            return (
              <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0f2a44]">{scenarioName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {t("Cohorte", "Cohort")} : {cohortMap[a.cohortId] ?? (a.cohortId ? `#${a.cohortId}` : "—")} ·
                    {t("Étudiant", "Student")} : {a.userId ? `#${a.userId}` : t("Tous", "All")} ·
                    {t("Échéance", "Due date")} : {a.dueDate ? new Date(a.dueDate).toLocaleDateString(language === "FR" ? "fr-CA" : "en-CA") : t("Aucune", "None")}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-[#d4edda] text-[#107e3e]" : "bg-[#f0f0f0] text-gray-500"}`}>
                  {a.status === "active" ? t("Actif", "Active") : (a.status ?? t("Actif", "Active"))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </FioriShell>
  );
}
