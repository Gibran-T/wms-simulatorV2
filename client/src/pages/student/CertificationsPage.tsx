import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { Award, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import FioriShell from "@/components/FioriShell";

export function CertificationsPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <FioriShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </FioriShell>
    );
  }

  // Fetch user profile for certification status
  const { data: profile } = trpc.profiles.mine.useQuery();

  const certifications = [
    {
      id: "silver",
      tier: "Silver",
      titleFr: "TEC.LOG Fundamentals",
      titleEn: "TEC.LOG Fundamentals",
      descriptionFr: "Maîtrise des processus fondamentaux de gestion de stock (M1)",
      descriptionEn: "Mastery of fundamental warehouse management processes (M1)",
      unlocked: profile?.silverCertified ?? false,
      icon: "🥈",
      color: "from-slate-400 to-slate-600",
    },
    {
      id: "gold",
      tier: "Gold",
      titleFr: "TEC.LOG Integrated Operations",
      titleEn: "TEC.LOG Integrated Operations",
      descriptionFr: "Expertise complète en gestion intégrée (M1-M5)",
      descriptionEn: "Complete expertise in integrated operations (M1-M5)",
      unlocked: profile?.goldCertified ?? false,
      icon: "🥇",
      color: "from-yellow-400 to-yellow-600",
    },
  ];

  return (
    <FioriShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/student/scenarios")}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("Mes Certifications", "My Certifications")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Collège de la Concordia — TEC.WMS",
                "Collège de la Concordia — TEC.WMS"
              )}
            </p>
          </div>
        </div>

        {/* Certifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className={`relative border rounded-lg overflow-hidden transition-all ${
                cert.unlocked
                  ? `border-primary/50 bg-gradient-to-br ${cert.color} bg-opacity-5`
                  : "border-border bg-card"
              }`}
            >
              {/* Ribbon for unlocked */}
              {cert.unlocked && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  {t("OBTENU", "EARNED")}
                </div>
              )}

              <div className="p-6">
                {/* Icon & Tier */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{cert.icon}</div>
                  {cert.unlocked ? (
                    <CheckCircle size={24} className="text-emerald-500" />
                  ) : (
                    <Lock size={24} className="text-muted-foreground" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {cert.tier}
                </h3>
                <p className="text-sm font-medium text-primary mb-3">
                  {t(cert.titleFr, cert.titleEn)}
                </p>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4">
                  {t(cert.descriptionFr, cert.descriptionEn)}
                </p>

                {/* Status */}
                <div className="pt-4 border-t border-border">
                  {cert.unlocked ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">
                        {t("Certification obtenue", "Certification earned")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {cert.id === "silver"
                          ? t(
                              "Complétez M1 pour débloquer",
                              "Complete M1 to unlock"
                            )
                          : t(
                              "Complétez M1-M5 pour débloquer",
                              "Complete M1-M5 to unlock"
                            )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Award size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {t("À propos des certifications", "About certifications")}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t(
                  "Les certifications TEC.WMS sont délivrées par Collège de la Concordia après validation complète de tous les modules requis. Elles attestent de votre maîtrise des processus de gestion de stock et de la conformité système.",
                  "TEC.WMS certifications are issued by Collège de la Concordia after complete validation of all required modules. They certify your mastery of warehouse management processes and system compliance."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </FioriShell>
  );
}
