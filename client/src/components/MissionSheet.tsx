import React from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, ClipboardCheck, Info, ShieldAlert } from "lucide-react";
import { type MissionData } from "../../../server/missionData";

interface MissionSheetProps {
  mission: MissionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MissionSheet({ mission, open, onOpenChange }: MissionSheetProps) {
  const { t } = useLanguage();

  if (!mission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-0 shadow-2xl rounded-none">
        <DialogHeader className="bg-slate-100 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                  {t("Fiche de Mission Opérationnelle", "Operational Mission Sheet")}
                </DialogTitle>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">
                  Concorde Logistics — Institutional Standard
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-mono">REF: CL-SCN-{mission.scenarioId.toString().padStart(3, '0')}</p>
              <p className="text-[10px] text-slate-500 font-mono">DATE: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 font-sans">
          {/* Section 1: Context & Role */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info size={14} /> {t("Contexte Opérationnel", "Operational Context")}
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-l-4 border-slate-200 dark:border-slate-700 pl-4 italic">
                  "{mission.context}"
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t("Objectif de la Mission", "Mission Objective")}
                </h3>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {mission.objective}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("Rôle Assigné", "Assigned Role")}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{mission.role}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("Module ERP/WMS", "ERP/WMS Module")}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{mission.module}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specs */}
          <div className="bg-slate-900 text-white p-6 rounded-none">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              {t("Spécifications Techniques", "Technical Specifications")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">SKU / Product</p>
                <p className="text-sm font-mono font-bold">{mission.technicalSpecs.sku}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Quantity</p>
                <p className="text-sm font-mono font-bold">{mission.technicalSpecs.quantity} units</p>
              </div>
              {mission.technicalSpecs.suggestedBin && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Target Bin</p>
                  <p className="text-sm font-mono font-bold text-primary-foreground">{mission.technicalSpecs.suggestedBin}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Status</p>
                <p className="text-xs font-bold bg-green-600 px-2 py-0.5 inline-block">ACTIVE</p>
              </div>
            </div>
          </div>

          {/* Section 3: Control Points */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck size={16} className="text-primary" /> {t("Points de Contrôle & Validation", "Control & Validation Points")}
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mission.controlPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Supervisor Notes */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <ShieldAlert size={14} /> {t("Notes du Superviseur", "Supervisor Notes")}
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {mission.supervisorNotes}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 uppercase mb-1">Validation Institutionnelle</p>
              <div className="h-8 w-32 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700"></div>
            </div>
            <p className="text-[9px] text-slate-400 font-mono italic">
              Concorde Logistics — Quality Management System v2.0
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
