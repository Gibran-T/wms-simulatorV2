import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { 
  CheckCircle, 
  Lock, 
  ArrowRight, 
  AlertTriangle, 
  Trophy, 
  FlaskConical, 
  LayoutDashboard, 
  ClipboardList, 
  Database, 
  Package, 
  Activity,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import FioriShell from "@/components/FioriShell";
import MissionSheet from "@/components/MissionSheet";
import { M1_MISSIONS } from "../../../../server/missionData";

import { useAuth } from "@/_core/hooks/useAuth";

export default function MissionControl() {
  const { runId } = useParams<{ runId: string }>();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showMission, setShowMission] = useState(false);
  
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  
  const { data, isLoading } = trpc.runs.state.useQuery({ runId: parseInt(runId) });

  if (isLoading) {
    return (
      <FioriShell title="MISSION CONTROL" breadcrumbs={[{ label: t("Scénarios", "Scenarios"), href: "/student/scenarios" }, { label: "Mission Control" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </FioriShell>
    );
  }

  if (!data) return null;

  const { run, scenario, completedSteps, compliance, totalScore: score, nextStep, progressPct, isDemo, moduleId, steps: backendSteps, inventory, transactions } = data;

  const mission = M1_MISSIONS[scenario?.id || 0] || null;

  const STEPS = (backendSteps ?? []).map((s: any) => ({
    key: s.code,
    label: s.labelEn ?? s.code,
    labelFr: s.labelFr ?? s.code,
    code: s.sapCode ?? s.code,
  }));

  const nextStepCode = (nextStep as any)?.code as string | undefined;
  const nextStepDef = STEPS.find(s => s.key === nextStepCode);

  const getStepStatus = (stepKey: string) => {
    if (completedSteps.includes(stepKey as any)) return "completed";
    if (stepKey === nextStepCode) return "active";
    if (isDemo) return "demo-available";
    return "locked";
  };

  return (
    <FioriShell
      title={`COCKPIT OPÉRATIONNEL — ${scenario?.name}`}
      breadcrumbs={[{ label: t("Scénarios", "Scenarios"), href: "/student/scenarios" }, { label: "Mission Control" }]}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* ── Top Command Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-none border-b-4 border-primary">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-2 border border-primary/40">
              <LayoutDashboard className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase">Concorde Logistics WMS</h1>
              <p className="text-[10px] font-mono text-slate-400">SESSION: {runId.padStart(6, '0')} | USER_ROLE: STUDENT_OPERATOR</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMission(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-bold transition-all"
            >
              <ClipboardList size={16} className="text-primary" />
              {t("FICHE DE MISSION", "MISSION SHEET")}
            </button>
            
            {isDemo && (
              <div className="flex items-center gap-2 bg-indigo-950 border border-indigo-700 px-4 py-2 text-xs font-bold text-indigo-300">
                <FlaskConical size={16} />
                DEMO MODE
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ── LEFT COLUMN: Operational Focus & Inventory (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Next Action Cockpit */}
            <div className={`p-6 border-l-8 ${
              run.status === "completed" ? "bg-green-50 border-green-600 dark:bg-green-950/20" : 
              nextStep ? "bg-slate-50 border-primary dark:bg-slate-800/50" : "bg-red-50 border-red-600"
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("PROCHAINE ACTION REQUISE", "NEXT REQUIRED ACTION")}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {run.status === "completed" 
                      ? t("MISSION TERMINÉE", "MISSION COMPLETE")
                      : nextStepCode ? `${nextStepDef?.label || nextStepCode} (${nextStepDef?.code || ''})` : t("BLOQUAGE SYSTÈME", "SYSTEM BLOCK")}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    {nextStepCode ? t("Consultez la fiche de missão e valide as transações no WMS.", "Check the mission sheet and validate transactions in WMS.") : t("Résolvez les non-conformités pour débloquer le flux.", "Resolve non-conformities to unblock the flow.")}
                  </p>
                </div>
                {nextStepCode && (
                  <button
                    onClick={() => navigate(`/student/run/${runId}/step/${nextStepCode.toLowerCase()}`)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 py-4 rounded-none transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
                  >
                    {t("EXÉCUTER", "EXECUTE")} <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Grid (SAP-like) */}
            <div className="bg-card border border-border rounded-none shadow-sm overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("État des Stocks par Bin", "Stock State by Bin")}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">REF: MMBE_SIMULATOR</span>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border">
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Bin / Emplacement</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">SKU / Produit</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">Quantité</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {Object.entries(inventory || {}).length > 0 ? (
                      Object.entries(inventory as Record<string, number>).map(([key, qty]) => {
                        const [sku, bin] = key.split("::");
                        return (
                          <tr key={key} className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-bold text-primary">{bin}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{sku}</td>
                            <td className={`px-4 py-3 text-right font-bold ${qty < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{qty}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold ${qty > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {qty > 0 ? 'AVAILABLE' : 'EMPTY'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                          {t("Aucun stock détecté dans l'entrepôt.", "No stock detected in the warehouse.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Monitor */}
            <div className="bg-card border border-border rounded-none shadow-sm overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-border flex items-center gap-2">
                <Activity size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("Moniteur de Transactions", "Transaction Monitor")}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border">
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Doc</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Ref</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-mono">
                    {(transactions || []).slice().reverse().map((tx: any, idx: number) => (
                      <tr key={idx} className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2 text-slate-400">#{tx.id}</td>
                        <td className="px-4 py-2 font-bold">{tx.docType}</td>
                        <td className="px-4 py-2 text-slate-500">{tx.docRef || '---'}</td>
                        <td className="px-4 py-2 text-right font-bold">{tx.qty}</td>
                        <td className="px-4 py-2">
                          <span className={`px-1.5 py-0.5 rounded-sm font-bold ${tx.posted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                            {tx.posted ? 'POSTED' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Metrics & Compliance (4 cols) ── */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Compliance Blockers */}
            <div className="bg-card border border-border rounded-none shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-4 py-2 border-b border-primary flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">{t("Contrôle de Conformité", "Compliance Control")}</span>
              </div>
              <div className="p-4 space-y-4">
                <div className={`p-3 border-l-4 flex items-center gap-3 ${compliance.compliant ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  {compliance.compliant ? <CheckCircle className="text-green-600" size={20} /> : <AlertTriangle className="text-red-600" size={20} />}
                  <div>
                    <p className={`text-xs font-black uppercase ${compliance.compliant ? 'text-green-700' : 'text-red-700'}`}>
                      {compliance.compliant ? t("SYSTÈME CONFORME", "SYSTEM COMPLIANT") : t("NON-CONFORMITÉ DÉTECTÉE", "NON-COMPLIANCE DETECTED")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {compliance.issues.length > 0 ? (
                    compliance.issues.map((issue: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">{issue}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">{t("Aucun bloqueur détecté.", "No blockers detected.")}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scoring & Performance */}
            <div className="bg-card border border-border rounded-none shadow-sm overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-border flex items-center gap-2">
                <Trophy size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t("Indicateurs de Performance", "Performance Indicators")}</span>
              </div>
              <div className="p-4 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t("Score Pédagogique", "Pedagogical Score")}</p>
                  <div className="text-4xl font-black text-primary">{score}<span className="text-sm text-slate-400">/100</span></div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-500">{t("Progression", "Progress")}</span>
                    <span className="text-primary">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">{t("Étapes Validées", "Steps Validated")}</span>
                    <span className="font-mono font-bold">{completedSteps.length} / {STEPS.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher Demo Section (Conditional) */}
            {isTeacher && (
              <div className="bg-emerald-950 border border-emerald-700 rounded-none p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">O</div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Prof Demo — Odoo Lab</span>
                </div>
                <p className="text-[10px] text-emerald-300 leading-relaxed italic">
                  {t("Optionnel : Utilisez ce bouton pour illustrer l'impact ERP de cette étape.", "Optional: Use this button to illustrate the ERP impact of this step.")}
                </p>
                <a 
                  href="https://edu-concorde-logistics-lab.odoo.com" 
                  target="_blank" 
                  className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-2 transition-colors"
                >
                  {t("OUVRIR ODOO LAB →", "OPEN ODOO LAB →")}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <MissionSheet 
        mission={mission} 
        open={showMission} 
        onOpenChange={setShowMission} 
      />
    </FioriShell>
  );
}
